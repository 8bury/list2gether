package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type WatchProviderService interface {
	GetWatchProviders(ctx context.Context, mediaID int64, mediaType string, region string) (*WatchProviderResponse, error)
}

type watchProviderService struct {
	client    *http.Client
	tmdbToken string
}

func NewWatchProviderService(tmdbToken string) WatchProviderService {
	return &watchProviderService{
		client:    &http.Client{Timeout: 5 * time.Second},
		tmdbToken: tmdbToken,
	}
}

// WatchProviderResponse representa a resposta completa do TMDB
type WatchProviderResponse struct {
	ID      int64                           `json:"id"`
	Results map[string]WatchProviderRegion `json:"results"`
}

// WatchProviderRegion representa os dados de uma região específica
type WatchProviderRegion struct {
	Link     string                  `json:"link"`
	Flatrate []WatchProviderProvider `json:"flatrate,omitempty"`
	Rent     []WatchProviderProvider `json:"rent,omitempty"`
	Buy      []WatchProviderProvider `json:"buy,omitempty"`
}

// WatchProviderProvider representa um provedor individual
type WatchProviderProvider struct {
	LogoPath        string `json:"logo_path"`
	ProviderID      int    `json:"provider_id"`
	ProviderName    string `json:"provider_name"`
	DisplayPriority int    `json:"display_priority"`
}

func (s *watchProviderService) GetWatchProviders(ctx context.Context, mediaID int64, mediaType string, region string) (*WatchProviderResponse, error) {
	// Use the correct endpoint based on media type (movie or tv)
	var endpoint string
	if mediaType == "tv" {
		endpoint = fmt.Sprintf("https://api.themoviedb.org/3/tv/%d/watch/providers", mediaID)
	} else {
		endpoint = fmt.Sprintf("https://api.themoviedb.org/3/movie/%d/watch/providers", mediaID)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
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

	var tmdbResp WatchProviderResponse
	if err := json.NewDecoder(resp.Body).Decode(&tmdbResp); err != nil {
		return nil, err
	}

	return &tmdbResp, nil
}
