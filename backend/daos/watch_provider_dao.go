package daos

import (
	"encoding/json"
	"time"

	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
)

type WatchProviderDAO interface {
	GetCachedProviders(movieID int64, mediaType string, region string) (*models.WatchProvider, error)
	UpsertProviders(movieID int64, mediaType string, region string, data interface{}) error
	IsCacheExpired(provider *models.WatchProvider) bool
}

type watchProviderDAO struct {
	db *gorm.DB
}

func NewWatchProviderDAO(db *gorm.DB) WatchProviderDAO {
	return &watchProviderDAO{db: db}
}

const cacheExpirationDays = 14

func (dao *watchProviderDAO) GetCachedProviders(movieID int64, mediaType string, region string) (*models.WatchProvider, error) {
	var provider models.WatchProvider
	err := dao.db.Where("movie_id = ? AND media_type = ? AND region = ?", movieID, mediaType, region).First(&provider).Error
	if err != nil {
		return nil, err
	}
	return &provider, nil
}

func (dao *watchProviderDAO) UpsertProviders(movieID int64, mediaType string, region string, data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	now := time.Now()
	provider := models.WatchProvider{
		MovieID:   movieID,
		MediaType: mediaType,
		Region:    region,
		Data:      string(jsonData),
		FetchedAt: now,
		UpdatedAt: now,
	}

	// Try to update existing record first
	result := dao.db.Model(&models.WatchProvider{}).
		Where("movie_id = ? AND media_type = ? AND region = ?", movieID, mediaType, region).
		Updates(map[string]interface{}{
			"data":       provider.Data,
			"fetched_at": provider.FetchedAt,
			"updated_at": provider.UpdatedAt,
		})

	if result.Error != nil {
		return result.Error
	}

	// If no rows were affected, create a new record
	if result.RowsAffected == 0 {
		provider.CreatedAt = now
		if err := dao.db.Create(&provider).Error; err != nil {
			return err
		}
	}

	return nil
}

func (dao *watchProviderDAO) IsCacheExpired(provider *models.WatchProvider) bool {
	if provider == nil {
		return true
	}
	expirationDate := provider.FetchedAt.AddDate(0, 0, cacheExpirationDays)
	return time.Now().After(expirationDate)
}
