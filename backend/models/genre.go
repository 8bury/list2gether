package models

type Genre struct {
	ID     int64   `gorm:"primaryKey;column:id" json:"id"` // tmdb genre_id
	Name   string  `gorm:"not null;column:name" json:"name"`
	Movies []Movie `gorm:"many2many:movie_genres;" json:"movies,omitempty"`
}

func (Genre) TableName() string {
	return "genres"
}
