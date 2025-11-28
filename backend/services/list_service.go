package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/models"
	"github.com/go-sql-driver/mysql"
	"gorm.io/gorm"
)

type ListService interface {
	CreateList(name string, description *string, createdBy int64) (*models.MovieList, error)
	JoinListByInviteCode(inviteCode string, userID int64) (*models.MovieList, models.ListMemberRole, bool, int64, error)
	DeleteList(listID int64, userID int64) error
	LeaveList(listID int64, userID int64) error
	ListUserLists(userID int64, role *models.ListMemberRole, limit int, offset int) ([]models.ListMember, map[int64]int64, map[int64]int64, int64, error)
	AddMediaToList(ctx context.Context, listID int64, userID int64, mediaID int64, mediaType string) (*models.ListMovie, *models.Movie, error)
	RemoveMovieFromList(listID int64, userID int64, movieID int64) (*models.Movie, error)
	UpdateMovie(listID int64, userID int64, movieID int64, status *models.MovieStatus, rating *int, ratingProvided bool, notes *string, notesProvided bool) (*models.ListMovie, *models.Movie, *models.MovieStatus, *models.ListMovieUserData, *models.ListMovieUserData, *float64, error)
	ListMovies(listID int64, userID int64, status *models.MovieStatus) ([]models.ListMovie, error)
	SearchListMovies(listID int64, userID int64, query string, limit int, offset int) ([]models.ListMovie, int64, error)
}

type listService struct {
	lists      daos.MovieListDAO
	movies     daos.MovieDAO
	httpClient *http.Client
	tmdbToken  string
}

func NewListService(lists daos.MovieListDAO, movies daos.MovieDAO, tmdbToken string) ListService {
	return &listService{lists: lists, movies: movies, httpClient: &http.Client{Timeout: 5 * time.Second}, tmdbToken: tmdbToken}
}

func (s *listService) CreateList(name string, description *string, createdBy int64) (*models.MovieList, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 255 {
		return nil, errors.New("name must be between 1 and 255 characters")
	}
	if description != nil {
		d := strings.TrimSpace(*description)
		if len(d) > 1000 {
			return nil, errors.New("description must be at most 1000 characters")
		}
		description = &d
	}

	for i := 0; i < 10; i++ {
		code, err := s.generateUniqueInviteCode()
		if err != nil {
			return nil, err
		}
		list := &models.MovieList{
			Name:        name,
			Description: description,
			InviteCode:  code,
			CreatedBy:   createdBy,
		}
		if err := s.lists.CreateWithOwner(list, createdBy); err != nil {
			var me *mysql.MySQLError
			if errors.As(err, &me) && me.Number == 1062 {
				continue
			}
			if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
				continue
			}
			return nil, err
		}
		out, err := s.lists.FindByIDWithCreator(list.ID)
		if err != nil {
			return nil, err
		}
		return out, nil
	}
	return nil, errors.New("failed to generate unique invite code")
}

var ErrInvalidInviteCodeFormat = errors.New("invite code must be 10 alphanumeric characters")
var ErrAccessDenied = errors.New("access denied: only the list owner can delete this list")
var ErrOwnerCannotLeave = errors.New("owner cannot leave the list, delete it instead")
var ErrNotAMember = errors.New("you are not a member of this list")

func (s *listService) JoinListByInviteCode(inviteCode string, userID int64) (*models.MovieList, models.ListMemberRole, bool, int64, error) {
	code := strings.ToUpper(strings.TrimSpace(inviteCode))
	if len(code) != 10 {
		return nil, "", false, 0, ErrInvalidInviteCodeFormat
	}
	for i := 0; i < len(code); i++ {
		c := code[i]
		if !((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) {
			return nil, "", false, 0, ErrInvalidInviteCodeFormat
		}
	}

	list, err := s.lists.FindByInviteCodeWithCreator(code)
	if err != nil {
		return nil, "", false, 0, err
	}

	membership, err := s.lists.FindMembership(list.ID, userID)
	alreadyMember := false
	role := models.RoleParticipant
	if err == nil {
		alreadyMember = true
		role = membership.Role
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		inserted, addErr := s.lists.AddParticipantIfNotExists(list.ID, userID)
		if addErr != nil {
			return nil, "", false, 0, addErr
		}
		if inserted {
			alreadyMember = false
			role = models.RoleParticipant
		} else {
			m2, err2 := s.lists.FindMembership(list.ID, userID)
			if err2 != nil {
				return nil, "", false, 0, err2
			}
			alreadyMember = true
			role = m2.Role
		}
	} else {
		return nil, "", false, 0, err
	}

	count, err := s.lists.CountMembers(list.ID)
	if err != nil {
		return nil, "", false, 0, err
	}

	return list, role, alreadyMember, count, nil
}

func (s *listService) DeleteList(listID int64, userID int64) error {
	_, err := s.lists.FindByID(listID)
	if err != nil {
		return err
	}
	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		return err
	}
	if membership.Role != models.RoleOwner {
		return ErrAccessDenied
	}
	if err := s.lists.DeleteListCascadeIfOwner(listID, userID); err != nil {
		if errors.Is(err, gorm.ErrInvalidData) {
			return ErrAccessDenied
		}
		return err
	}
	return nil
}

func (s *listService) LeaveList(listID int64, userID int64) error {
	_, err := s.lists.FindByID(listID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrListNotFound
		}
		return err
	}

	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotAMember
		}
		return err
	}

	if membership.Role == models.RoleOwner {
		return ErrOwnerCannotLeave
	}

	if err := s.lists.RemoveMember(listID, userID); err != nil {
		return err
	}

	return nil
}

func (s *listService) ListUserLists(userID int64, role *models.ListMemberRole, limit int, offset int) ([]models.ListMember, map[int64]int64, map[int64]int64, int64, error) {
	memberships, err := s.lists.FindUserMemberships(userID, role, limit, offset)
	if err != nil {
		return nil, nil, nil, 0, err
	}

	listIDs := make([]int64, 0, len(memberships))
	for _, m := range memberships {
		listIDs = append(listIDs, m.ListID)
	}

	memberCounts, err := s.lists.CountMembersBatch(listIDs)
	if err != nil {
		return nil, nil, nil, 0, err
	}
	movieCounts, err := s.lists.CountMoviesBatch(listIDs)
	if err != nil {
		return nil, nil, nil, 0, err
	}

	total, err := s.lists.CountUserMemberships(userID, role)
	if err != nil {
		return nil, nil, nil, 0, err
	}

	return memberships, memberCounts, movieCounts, total, nil
}

var (
	ErrInvalidMediaType        = errors.New("invalid media_type")
	ErrForbiddenMembership     = errors.New("forbidden")
	ErrListMovieAlreadyExists  = errors.New("list_movie_already_exists")
	ErrListNotFound            = errors.New("list_not_found")
	ErrMediaNotFound           = errors.New("media_not_found")
	ErrMovieNotInList          = errors.New("movie_not_in_list")
	ErrCannotRemoveOthersMovie = errors.New("cannot_remove_others_movie")
)

type tmdbMovieResponse struct {
	ID               int64    `json:"id"`
	Title            string   `json:"title"`
	OriginalTitle    string   `json:"original_title"`
	OriginalLanguage string   `json:"original_language"`
	Overview         string   `json:"overview"`
	ReleaseDate      string   `json:"release_date"`
	PosterPath       *string  `json:"poster_path"`
	Popularity       *float64 `json:"popularity"`
	Genres           []struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	} `json:"genres"`
}

type tmdbTVResponse struct {
	ID               int64    `json:"id"`
	Name             string   `json:"name"`
	OriginalName     string   `json:"original_name"`
	OriginalLanguage string   `json:"original_language"`
	Overview         string   `json:"overview"`
	FirstAirDate     string   `json:"first_air_date"`
	PosterPath       *string  `json:"poster_path"`
	Popularity       *float64 `json:"popularity"`
	NumberOfSeasons  *int     `json:"number_of_seasons"`
	NumberOfEpisodes *int     `json:"number_of_episodes"`
	Status           *string  `json:"status"`
	Genres           []struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	} `json:"genres"`
}

func (s *listService) AddMediaToList(ctx context.Context, listID int64, userID int64, mediaID int64, mediaType string) (*models.ListMovie, *models.Movie, error) {
	if mediaType != "movie" && mediaType != "tv" {
		return nil, nil, ErrInvalidMediaType
	}
	if _, err := s.lists.FindByID(listID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrListNotFound
		}
		return nil, nil, err
	}
	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		return nil, nil, err
	}
	if membership.Role != models.RoleOwner && membership.Role != models.RoleParticipant {
		return nil, nil, ErrForbiddenMembership
	}

	existingMovie, err := s.movies.FindByIDAndType(mediaID, mediaType)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, err
	}

	var movie *models.Movie
	if existingMovie != nil {
		movie = existingMovie
	} else {
		var fetchErr error
		movie, fetchErr = s.fetchAndStoreFromTMDB(ctx, mediaID, mediaType)
		if fetchErr != nil {
			if errors.Is(fetchErr, gorm.ErrRecordNotFound) {
				return nil, nil, ErrMediaNotFound
			}
			return nil, nil, fetchErr
		}
	}

	exists, err := s.lists.ListMovieExists(listID, movie.ID)
	if err != nil {
		return nil, nil, err
	}
	if exists {
		return nil, movie, ErrListMovieAlreadyExists
	}
	lm, err := s.lists.AddMovieToList(listID, movie.ID, &userID)
	if err != nil {
		return nil, nil, err
	}
	return lm, movie, nil
}

func (s *listService) fetchAndStoreFromTMDB(ctx context.Context, id int64, mediaType string) (*models.Movie, error) {
	var url string
	if mediaType == "movie" {
		url = fmt.Sprintf("https://api.themoviedb.org/3/movie/%d?language=pt-BR", id)
	} else {
		url = fmt.Sprintf("https://api.themoviedb.org/3/tv/%d?language=pt-BR", id)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if s.tmdbToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.tmdbToken)
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, gorm.ErrRecordNotFound
	}
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden || resp.StatusCode >= 500 {
		return nil, ErrTMDBUnavailable
	}
	if resp.StatusCode != http.StatusOK {
		return nil, ErrTMDBUnavailable
	}

	if mediaType == "movie" {
		var m tmdbMovieResponse
		if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
			return nil, err
		}
		var release *time.Time
		if m.ReleaseDate != "" {
			if t, err := time.Parse("2006-01-02", m.ReleaseDate); err == nil {
				release = &t
			}
		}
		movie := &models.Movie{
			ID:            m.ID,
			Title:         m.Title,
			MediaType:     "movie",
			OriginalTitle: func() *string { v := m.OriginalTitle; return &v }(),
			OriginalLang:  func() *string { v := m.OriginalLanguage; return &v }(),
			Overview:      func() *string { v := m.Overview; return &v }(),
			ReleaseDate:   release,
			PosterPath:    m.PosterPath,
			Popularity:    m.Popularity,
		}
		genres := make([]models.Genre, 0, len(m.Genres))
		for _, g := range m.Genres {
			genres = append(genres, models.Genre{ID: g.ID, Name: g.Name})
		}
		if err := s.movies.CreateMovieWithGenres(movie, genres); err != nil {
			return nil, err
		}
		return movie, nil
	}

	var tv tmdbTVResponse
	if err := json.NewDecoder(resp.Body).Decode(&tv); err != nil {
		return nil, err
	}
	var release *time.Time
	if tv.FirstAirDate != "" {
		if t, err := time.Parse("2006-01-02", tv.FirstAirDate); err == nil {
			release = &t
		}
	}
	movie := &models.Movie{
		ID:            tv.ID,
		Title:         tv.Name,
		MediaType:     "tv",
		OriginalTitle: func() *string { v := tv.OriginalName; return &v }(),
		OriginalLang:  func() *string { v := tv.OriginalLanguage; return &v }(),
		Overview:      func() *string { v := tv.Overview; return &v }(),
		ReleaseDate:   release,
		PosterPath:    tv.PosterPath,
		Popularity:    tv.Popularity,
		SeasonsCount:  tv.NumberOfSeasons,
		EpisodesCount: tv.NumberOfEpisodes,
		SeriesStatus:  tv.Status,
	}
	genres := make([]models.Genre, 0, len(tv.Genres))
	for _, g := range tv.Genres {
		genres = append(genres, models.Genre{ID: g.ID, Name: g.Name})
	}
	if err := s.movies.CreateMovieWithGenres(movie, genres); err != nil {
		return nil, err
	}
	return movie, nil
}

func (s *listService) generateUniqueInviteCode() (string, error) {
	for i := 0; i < 10; i++ {
		code := randomAlphaNum(10)
		exists, err := s.lists.InviteCodeExists(code)
		if err != nil {
			return "", err
		}
		if !exists {
			return code, nil
		}
	}
	return "", errors.New("failed to generate unique invite code")
}

func randomAlphaNum(n int) string {
	b := make([]byte, n)
	tmp := make([]byte, n*2)
	rand.Read(tmp)
	enc := base64.RawURLEncoding.EncodeToString(tmp)
	idx := 0
	for i := 0; i < len(enc) && idx < n; i++ {
		c := enc[i]
		if (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') {
			b[idx] = c
			idx++
		}
	}
	if idx < n {
		for idx < n {
			b[idx] = 'A'
			idx++
		}
	}
	return string(b)
}

func (s *listService) RemoveMovieFromList(listID int64, userID int64, movieID int64) (*models.Movie, error) {
	_, err := s.lists.FindByID(listID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrListNotFound
		}
		return nil, err
	}

	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrForbiddenMembership
		}
		return nil, err
	}

	if membership.Role != models.RoleOwner && membership.Role != models.RoleParticipant {
		return nil, ErrForbiddenMembership
	}

	listMovie, err := s.lists.FindListMovieByListAndMovie(listID, movieID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMovieNotInList
		}
		return nil, err
	}

	if membership.Role == models.RoleParticipant {
		if listMovie.AddedBy == nil || *listMovie.AddedBy != userID {
			return nil, ErrCannotRemoveOthersMovie
		}
	}

	movie, err := s.movies.FindByID(movieID)
	if err != nil {
		return nil, err
	}

	if err := s.lists.RemoveMovieFromList(listID, movieID); err != nil {
		return nil, err
	}

	return movie, nil
}

func (s *listService) UpdateMovie(listID int64, userID int64, movieID int64, status *models.MovieStatus, rating *int, ratingProvided bool, notes *string, notesProvided bool) (*models.ListMovie, *models.Movie, *models.MovieStatus, *models.ListMovieUserData, *models.ListMovieUserData, *float64, error) {
	_, err := s.lists.FindByID(listID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, nil, nil, nil, nil, ErrListNotFound
		}
		return nil, nil, nil, nil, nil, nil, err
	}

	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, nil, nil, nil, nil, ErrForbiddenMembership
		}
		return nil, nil, nil, nil, nil, nil, err
	}

	if membership.Role != models.RoleOwner && membership.Role != models.RoleParticipant {
		return nil, nil, nil, nil, nil, nil, ErrForbiddenMembership
	}

	existingListMovie, err := s.lists.FindListMovieByListAndMovie(listID, movieID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, nil, nil, nil, nil, ErrMovieNotInList
		}
		return nil, nil, nil, nil, nil, nil, err
	}

	oldStatus := &existingListMovie.Status

	var oldEntry *models.ListMovieUserData
	if ratingProvided || notesProvided {
		if data, findErr := s.lists.FindMovieUserData(listID, movieID, userID); findErr == nil {
			oldEntry = data
		} else if !errors.Is(findErr, gorm.ErrRecordNotFound) {
			return nil, nil, nil, nil, nil, nil, findErr
		}
	}

	var updatedListMovie *models.ListMovie
	if status != nil {
		updatedListMovie, err = s.lists.UpdateMovie(listID, movieID, status)
		if err != nil {
			return nil, nil, nil, nil, nil, nil, err
		}
	} else {
		updatedListMovie = existingListMovie
	}

	var newEntry *models.ListMovieUserData
	if ratingProvided || notesProvided {
		upserted, upsertErr := s.lists.UpsertMovieUserData(listID, movieID, userID, rating, ratingProvided, notes, notesProvided)
		if upsertErr != nil {
			return nil, nil, nil, nil, nil, nil, upsertErr
		}
		if upserted != nil {
			if data, findErr := s.lists.FindMovieUserData(listID, movieID, userID); findErr == nil {
				newEntry = data
			} else if !errors.Is(findErr, gorm.ErrRecordNotFound) {
				return nil, nil, nil, nil, nil, nil, findErr
			}
		}
	}

	var averageRating *float64
	if ratingProvided {
		averageRating, err = s.lists.GetMovieAverageRating(listID, movieID)
		if err != nil {
			return nil, nil, nil, nil, nil, nil, err
		}
	}

	movie, err := s.movies.FindByID(movieID)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, err
	}

	return updatedListMovie, movie, oldStatus, oldEntry, newEntry, averageRating, nil
}

func (s *listService) ListMovies(listID int64, userID int64, status *models.MovieStatus) ([]models.ListMovie, error) {
	if _, err := s.lists.FindByID(listID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrListNotFound
		}
		return nil, err
	}

	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrForbiddenMembership
		}
		return nil, err
	}
	if membership.Role != models.RoleOwner && membership.Role != models.RoleParticipant {
		return nil, ErrForbiddenMembership
	}

	items, err := s.lists.FindListMoviesWithMovie(listID, status)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (s *listService) SearchListMovies(listID int64, userID int64, query string, limit int, offset int) ([]models.ListMovie, int64, error) {
	if _, err := s.lists.FindByID(listID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, ErrListNotFound
		}
		return nil, 0, err
	}

	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, ErrForbiddenMembership
		}
		return nil, 0, err
	}
	if membership.Role != models.RoleOwner && membership.Role != models.RoleParticipant {
		return nil, 0, ErrForbiddenMembership
	}

	// Sanitize pagination params
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	items, total, findErr := s.lists.SearchListMoviesWithMovie(listID, query, limit, offset)
	if findErr != nil {
		return nil, 0, findErr
	}
	return items, total, nil
}
