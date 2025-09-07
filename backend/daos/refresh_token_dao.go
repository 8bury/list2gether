package daos

import (
	"time"

	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
)

type RefreshTokenDAO interface {
	Create(token *models.RefreshToken) error
	FindByHash(hash string) (*models.RefreshToken, error)
	RevokeByHash(hash string) error
	RevokeAllByUserID(userID int64) error
}

type refreshTokenDAO struct {
	db *gorm.DB
}

func NewRefreshTokenDAO(db *gorm.DB) RefreshTokenDAO {
	return &refreshTokenDAO{db: db}
}

func (d *refreshTokenDAO) Create(token *models.RefreshToken) error {
	return d.db.Create(token).Error
}

func (d *refreshTokenDAO) FindByHash(hash string) (*models.RefreshToken, error) {
	var rt models.RefreshToken
	err := d.db.Where("token_hash = ?", hash).First(&rt).Error
	if err != nil {
		return nil, err
	}
	return &rt, nil
}

func (d *refreshTokenDAO) RevokeByHash(hash string) error {
	return d.db.Model(&models.RefreshToken{}).Where("token_hash = ? AND is_revoked = ?", hash, false).Update("is_revoked", true).Error
}

func (d *refreshTokenDAO) RevokeAllByUserID(userID int64) error {
	return d.db.Model(&models.RefreshToken{}).
		Where("user_id = ? AND is_revoked = ? AND expires_at > ?", userID, false, time.Now()).
		Update("is_revoked", true).Error
}
