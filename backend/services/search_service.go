package services

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"time"
)

type SearchService interface {
	SearchMedia(ctx context.Context, query string, limit int) ([]SearchResultItem, error)
}

type SearchResultItem struct {
	ID           int64   `json:"id"`
	Name         string  `json:"name"`
	OriginalName string  `json:"original_name"`
	PosterURL    *string `json:"poster_url"`
	MediaType    string  `json:"media_type"`
}

type searchService struct {
	client    *http.Client
	tmdbToken string
}

func NewSearchService(tmdbToken string) SearchService {
	return &searchService{
		client:    &http.Client{Timeout: 5 * time.Second},
		tmdbToken: tmdbToken,
	}
}

var (
	ErrTMDBUnavailable = errors.New("tmdb unavailable")
	ErrTMDBRateLimited = errors.New("tmdb rate limited")
	ErrTMDBAuth        = errors.New("tmdb auth failed")
)

type tmdbMultiSearchResponse struct {
	Results []tmdbResult `json:"results"`
}

type tmdbResult struct {
	ID            int64   `json:"id"`
	MediaType     string  `json:"media_type"`
	PosterPath    *string `json:"poster_path"`
	Title         string  `json:"title"`
	OriginalTitle string  `json:"original_title"`
	Name          string  `json:"name"`
	OriginalName  string  `json:"original_name"`
}

func (s *searchService) SearchMedia(ctx context.Context, query string, limit int) ([]SearchResultItem, error) {
	values := url.Values{}
	values.Set("query", query)
	values.Set("include_adult", "false")
	values.Set("language", "pt-BR")
	values.Set("page", "1")

	endpoint := url.URL{
		Scheme:   "https",
		Host:     "api.themoviedb.org",
		Path:     "/3/search/multi",
		RawQuery: values.Encode(),
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if s.tmdbToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.tmdbToken)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		// ok
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, ErrTMDBAuth
	case http.StatusTooManyRequests:
		return nil, ErrTMDBRateLimited
	default:
		if resp.StatusCode >= 500 {
			return nil, ErrTMDBUnavailable
		}
		return nil, ErrTMDBUnavailable
	}

	var tmdbResp tmdbMultiSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&tmdbResp); err != nil {
		return nil, err
	}

	allowed := map[string]bool{"movie": true, "tv": true}
	baseImage := "https://image.tmdb.org/t/p/w500"
	results := make([]SearchResultItem, 0, limit)
	for _, r := range tmdbResp.Results {
		if !allowed[r.MediaType] {
			continue
		}
		item := SearchResultItem{ID: r.ID, MediaType: r.MediaType}
		if r.MediaType == "movie" {
			item.Name = r.Title
			item.OriginalName = r.OriginalTitle
		} else {
			item.Name = r.Name
			item.OriginalName = r.OriginalName
		}
		if r.PosterPath != nil && *r.PosterPath != "" {
			u := baseImage + *r.PosterPath
			item.PosterURL = &u
		} else {
			item.PosterURL = nil
		}
		results = append(results, item)
		if len(results) >= limit {
			break
		}
	}

	return results, nil
}
