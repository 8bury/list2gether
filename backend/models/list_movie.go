package models

import (
	"time"
)

type MovieStatus string

const (
	StatusNotWatched MovieStatus = "not_watched"
	StatusWatching   MovieStatus = "watching"
	StatusWatched    MovieStatus = "watched"
	StatusDropped    MovieStatus = "dropped"
)

type ListMovie struct {
	ID      int64       `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	ListID  int64       `gorm:"not null;column:list_id;uniqueIndex:idx_list_movie" json:"list_id"`
	MovieID int64       `gorm:"not null;column:movie_id;uniqueIndex:idx_list_movie" json:"movie_id"`
	Status  MovieStatus `gorm:"not null;default:not_watched;size:20;column:status;check:status IN ('not_watched', 'watching', 'watched', 'dropped')" json:"status"`
	AddedBy *int64      `gorm:"column:added_by" json:"added_by"`
	AddedAt time.Time   `gorm:"autoCreateTime;column:added_at" json:"added_at"`
	Rating  *int        `gorm:"column:rating;check:rating BETWEEN 1 AND 10" json:"rating"`
	Notes   *string     `gorm:"type:text;column:notes" json:"notes"`

	List        MovieList `gorm:"foreignKey:ListID" json:"list,omitempty"`
	Movie       Movie     `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
	AddedByUser *User     `gorm:"foreignKey:AddedBy" json:"added_by_user,omitempty"`
}

func (ListMovie) TableName() string {
	return "list_movies"
}
