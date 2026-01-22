package models

import (
	"time"
)

type WatchProvider struct {
	ID        int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	MovieID   int64     `gorm:"not null;index:idx_movie_region_type" json:"movie_id"`
	MediaType string    `gorm:"type:enum('movie','tv');not null;default:'movie';index:idx_movie_region_type" json:"media_type"`
	Region    string    `gorm:"type:char(2);not null;index:idx_movie_region_type" json:"region"`
	Data      string    `gorm:"type:json;not null" json:"data"`
	FetchedAt time.Time `gorm:"not null" json:"fetched_at"`
	CreatedAt time.Time `gorm:"not null" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null" json:"updated_at"`
}

func (WatchProvider) TableName() string {
	return "watch_providers"
}

// WatchProviderData representa a estrutura dos dados de provedores para uma região
type WatchProviderData struct {
	Link     string               `json:"link"`
	Flatrate []WatchProviderEntry `json:"flatrate,omitempty"`
	Rent     []WatchProviderEntry `json:"rent,omitempty"`
	Buy      []WatchProviderEntry `json:"buy,omitempty"`
}

// WatchProviderEntry representa um provedor individual
type WatchProviderEntry struct {
	LogoPath        string `json:"logo_path"`
	ProviderID      int    `json:"provider_id"`
	ProviderName    string `json:"provider_name"`
	DisplayPriority int    `json:"display_priority"`
}
