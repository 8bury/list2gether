package models

import (
	"time"
)

type MovieList struct {
	ID          int64     `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	Name        string    `gorm:"not null;size:255;column:name" json:"name"`
	Description *string   `gorm:"type:text;column:description" json:"description"`
	CreatedBy   int64     `gorm:"not null;column:created_by" json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime;column:created_at" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime;column:updated_at" json:"updated_at"`

	Creator User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`

	Members    []ListMember `gorm:"foreignKey:ListID" json:"members,omitempty"`
	ListMovies []ListMovie  `gorm:"foreignKey:ListID" json:"list_movies,omitempty"`
}

func (MovieList) TableName() string {
	return "movie_lists"
}
