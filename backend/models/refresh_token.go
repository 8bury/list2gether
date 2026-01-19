package models

import (
	"time"
)

type RefreshToken struct {
	ID             int64      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	UserID         int64      `gorm:"not null;index:idx_refresh_tokens_user_id;column:user_id" json:"user_id"`
	TokenHash      string     `gorm:"not null;size:255;index:idx_refresh_tokens_hash;column:token_hash" json:"token_hash"`
	FamilyID       string     `gorm:"not null;default:'';size:255;index:idx_refresh_tokens_family_id;column:family_id" json:"family_id"`
	ReplacedByHash *string    `gorm:"size:255;index:idx_refresh_tokens_replaced_by_hash;column:replaced_by_hash" json:"replaced_by_hash,omitempty"`
	LastUsedAt     *time.Time `gorm:"column:last_used_at" json:"last_used_at,omitempty"`
	ExpiresAt      time.Time  `gorm:"not null;column:expires_at" json:"expires_at"`
	CreatedAt      time.Time  `gorm:"autoCreateTime;column:created_at" json:"created_at"`
	IsRevoked      bool       `gorm:"not null;default:false;column:is_revoked" json:"is_revoked"`

	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (RefreshToken) TableName() string {
	return "refresh_tokens"
}
