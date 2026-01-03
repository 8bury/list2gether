package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
)

type RecommendationService interface {
	GetListRecommendations(ctx context.Context, listID int64, userID int64, limit int) ([]RecommendationItem, error)
}

type RecommendationItem struct {
	ID         int64          `json:"id"`
	Title      string         `json:"title"`
	MediaType  string         `json:"media_type"`
	PosterURL  *string        `json:"poster_url"`
	Overview   *string        `json:"overview"`
	Score      float64        `json:"score"`
	Popularity float64        `json:"popularity"`
	Genres     []models.Genre `json:"genres"`
}

type recommendationService struct {
	lists      daos.MovieListDAO
	httpClient *http.Client
	tmdbToken  string
	cache      sync.Map // Simple in-memory cache: listID -> cached recommendations
}

type cachedRecommendations struct {
	items     []RecommendationItem
	timestamp time.Time
}

func NewRecommendationService(lists daos.MovieListDAO, tmdbToken string) RecommendationService {
	return &recommendationService{
		lists:      lists,
		httpClient: &http.Client{Timeout: 10 * time.Second},
		tmdbToken:  tmdbToken,
	}
}

var (
	ErrListNotFoundRec        = errors.New("list not found")
	ErrForbiddenMembershipRec = errors.New("forbidden: not a member of this list")
	ErrInsufficientMovies     = errors.New("list must have at least 2 movies for recommendations")
)

// GetListRecommendations generates movie recommendations based on the list's content
func (s *recommendationService) GetListRecommendations(ctx context.Context, listID int64, userID int64, limit int) ([]RecommendationItem, error) {
	// Check cache first (24-hour TTL)
	if cached, ok := s.cache.Load(listID); ok {
		cachedData := cached.(cachedRecommendations)
		if time.Since(cachedData.timestamp) < 24*time.Hour {
			if limit > 0 && len(cachedData.items) > limit {
				return cachedData.items[:limit], nil
			}
			return cachedData.items, nil
		}
		// Expired, remove from cache
		s.cache.Delete(listID)
	}

	// Verify list exists
	if _, err := s.lists.FindByID(listID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrListNotFoundRec
		}
		return nil, err
	}

	// Verify user is a member
	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrForbiddenMembershipRec
		}
		return nil, err
	}
	if membership.Role != models.RoleOwner && membership.Role != models.RoleParticipant {
		return nil, ErrForbiddenMembershipRec
	}

	// Get all movies from the list with their ratings
	listMovies, err := s.lists.FindListMoviesWithMovie(listID, nil)
	if err != nil {
		return nil, err
	}

	if len(listMovies) < 2 {
		return nil, ErrInsufficientMovies
	}

	// Calculate average ratings and select top movies as seeds
	seedMovies := s.selectSeedMovies(listMovies, 5)

	// Fetch recommendations from TMDB for each seed movie concurrently
	recommendations := s.fetchRecommendationsFromTMDB(ctx, seedMovies)

	// Aggregate, score, and rank recommendations
	scored := s.scoreAndRankRecommendations(recommendations, listMovies, seedMovies)

	// Filter out movies already in the list
	filtered := s.filterExistingMovies(scored, listMovies)

	// Cache the results
	s.cache.Store(listID, cachedRecommendations{
		items:     filtered,
		timestamp: time.Now(),
	})

	// Return top N results
	if limit > 0 && len(filtered) > limit {
		return filtered[:limit], nil
	}
	return filtered, nil
}

// selectSeedMovies chooses the top-rated movies to use as recommendation seeds
func (s *recommendationService) selectSeedMovies(listMovies []models.ListMovie, maxSeeds int) []models.ListMovie {
	type scoredMovie struct {
		movie models.ListMovie
		score float64
	}

	scored := make([]scoredMovie, 0, len(listMovies))
	for _, lm := range listMovies {
		// Calculate average rating for this movie
		var totalRating float64
		var ratingCount int
		for _, entry := range lm.UserEntries {
			if entry.Rating != nil {
				totalRating += float64(*entry.Rating)
				ratingCount++
			}
		}

		// Score based on average rating and recency
		var avgRating float64
		if ratingCount > 0 {
			avgRating = totalRating / float64(ratingCount)
		}

		// Boost recently added movies slightly
		recencyBonus := 0.0
		if time.Since(lm.AddedAt) < 30*24*time.Hour {
			recencyBonus = 0.5
		}

		score := avgRating + recencyBonus
		scored = append(scored, scoredMovie{movie: lm, score: score})
	}

	// Sort by score descending
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	// Select top N
	count := maxSeeds
	if len(scored) < count {
		count = len(scored)
	}

	result := make([]models.ListMovie, count)
	for i := 0; i < count; i++ {
		result[i] = scored[i].movie
	}

	return result
}

// tmdbRecommendationsResponse represents TMDB API response
type tmdbRecommendationsResponse struct {
	Results []tmdbRecommendationResult `json:"results"`
}

type tmdbRecommendationResult struct {
	ID         int64   `json:"id"`
	Title      string  `json:"title"`
	Name       string  `json:"name"`
	Overview   string  `json:"overview"`
	PosterPath *string `json:"poster_path"`
	Popularity float64 `json:"popularity"`
	GenreIDs   []int64 `json:"genre_ids"`
	MediaType  string  `json:"media_type"`
}

// fetchRecommendationsFromTMDB calls TMDB API concurrently for seed movies
func (s *recommendationService) fetchRecommendationsFromTMDB(ctx context.Context, seedMovies []models.ListMovie) []tmdbRecommendationResult {
	var wg sync.WaitGroup
	var mu sync.Mutex
	allRecommendations := make([]tmdbRecommendationResult, 0)

	for _, seedMovie := range seedMovies {
		wg.Add(1)
		go func(movie models.ListMovie) {
			defer wg.Done()

			var endpoint string
			if movie.Movie.MediaType == "movie" {
				endpoint = fmt.Sprintf("https://api.themoviedb.org/3/movie/%d/recommendations?language=pt-BR&page=1", movie.MovieID)
			} else {
				endpoint = fmt.Sprintf("https://api.themoviedb.org/3/tv/%d/recommendations?language=pt-BR&page=1", movie.MovieID)
			}

			req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
			if err != nil {
				return
			}
			req.Header.Set("Accept", "application/json")
			if s.tmdbToken != "" {
				req.Header.Set("Authorization", "Bearer "+s.tmdbToken)
			}

			resp, err := s.httpClient.Do(req)
			if err != nil {
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return
			}

			var tmdbResp tmdbRecommendationsResponse
			if err := json.NewDecoder(resp.Body).Decode(&tmdbResp); err != nil {
				return
			}

			// Set media type for all results
			for i := range tmdbResp.Results {
				if tmdbResp.Results[i].MediaType == "" {
					tmdbResp.Results[i].MediaType = movie.Movie.MediaType
				}
			}

			mu.Lock()
			allRecommendations = append(allRecommendations, tmdbResp.Results...)
			mu.Unlock()
		}(seedMovie)
	}

	wg.Wait()
	return allRecommendations
}

// scoreAndRankRecommendations aggregates recommendations and calculates scores
func (s *recommendationService) scoreAndRankRecommendations(recommendations []tmdbRecommendationResult, listMovies []models.ListMovie, seedMovies []models.ListMovie) []RecommendationItem {
	// Count frequency and aggregate data
	type aggData struct {
		result    tmdbRecommendationResult
		frequency int
	}

	aggregated := make(map[int64]*aggData)
	for _, rec := range recommendations {
		if existing, ok := aggregated[rec.ID]; ok {
			existing.frequency++
		} else {
			aggregated[rec.ID] = &aggData{
				result:    rec,
				frequency: 1,
			}
		}
	}

	// Calculate genre frequencies in the list
	genreFreq := make(map[int64]int)
	for _, lm := range listMovies {
		for _, genre := range lm.Movie.Genres {
			genreFreq[genre.ID]++
		}
	}

	// Score each recommendation
	scored := make([]RecommendationItem, 0, len(aggregated))
	for _, agg := range aggregated {
		// Base score from TMDB popularity (normalized)
		score := agg.result.Popularity / 100.0

		// Frequency bonus: appears in multiple seed recommendations
		score += float64(agg.frequency-1) * 0.5

		// Genre match bonus
		genreMatches := 0
		for _, genreID := range agg.result.GenreIDs {
			if genreFreq[genreID] > 0 {
				genreMatches++
			}
		}
		score += float64(genreMatches) * 0.3

		// Create poster URL
		var posterURL *string
		if agg.result.PosterPath != nil && *agg.result.PosterPath != "" {
			url := "https://image.tmdb.org/t/p/w342" + *agg.result.PosterPath
			posterURL = &url
		}

		// Get title
		title := agg.result.Title
		if title == "" {
			title = agg.result.Name
		}

		// Create overview pointer
		var overview *string
		if agg.result.Overview != "" {
			overview = &agg.result.Overview
		}

		// Convert genre IDs to Genre objects (simplified, just IDs for now)
		genres := make([]models.Genre, len(agg.result.GenreIDs))
		for i, gid := range agg.result.GenreIDs {
			genres[i] = models.Genre{ID: gid}
		}

		scored = append(scored, RecommendationItem{
			ID:         agg.result.ID,
			Title:      title,
			MediaType:  agg.result.MediaType,
			PosterURL:  posterURL,
			Overview:   overview,
			Score:      score,
			Popularity: agg.result.Popularity,
			Genres:     genres,
		})
	}

	// Sort by score descending
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].Score > scored[j].Score
	})

	return scored
}

// filterExistingMovies removes movies that are already in the list
func (s *recommendationService) filterExistingMovies(recommendations []RecommendationItem, listMovies []models.ListMovie) []RecommendationItem {
	existingIDs := make(map[int64]bool)
	for _, lm := range listMovies {
		existingIDs[lm.MovieID] = true
	}

	filtered := make([]RecommendationItem, 0)
	for _, rec := range recommendations {
		if !existingIDs[rec.ID] {
			filtered = append(filtered, rec)
		}
	}

	return filtered
}
