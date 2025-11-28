package models

import "time"

type Comment struct {
	ID        int64     `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	ListID    int64     `gorm:"not null;column:list_id;index:idx_comment_list_movie" json:"list_id"`
	MovieID   int64     `gorm:"not null;column:movie_id;index:idx_comment_list_movie" json:"movie_id"`
	UserID    int64     `gorm:"not null;column:user_id" json:"user_id"`
	Content   string    `gorm:"type:text;not null;column:content" json:"content"`
	CreatedAt time.Time `gorm:"autoCreateTime;column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime;column:updated_at" json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Comment) TableName() string {
	return "comments"
}

