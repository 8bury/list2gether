package models

import (
	"time"
)

type Movie struct {
	ID            int64      `gorm:"primaryKey;column:id" json:"id"` // tmdb_id
	Title         string     `gorm:"not null;column:title" json:"title"`
	OriginalTitle *string    `gorm:"column:original_title" json:"original_title"`
	OriginalLang  *string    `gorm:"size:10;column:original_lang" json:"original_lang"`
	Overview      *string    `gorm:"type:text;column:overview" json:"overview"`
	ReleaseDate   *time.Time `gorm:"type:date;column:release_date" json:"release_date"`
	PosterPath    *string    `gorm:"type:text;column:poster_path" json:"poster_path"`
	Popularity    *float64   `gorm:"type:numeric;column:popularity" json:"popularity"`

	Genres []Genre `gorm:"many2many:movie_genres;" json:"genres"`

	ListMovies []ListMovie `gorm:"foreignKey:MovieID" json:"list_movies,omitempty"`
}

func (Movie) TableName() string {
	return "movies"
}
