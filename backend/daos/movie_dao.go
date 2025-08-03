package daos

import (
	"gorm.io/gorm"
)

type MovieDAO struct {
	db *gorm.DB
}

func NewMovieDAO(db *gorm.DB) *MovieDAO {
	return &MovieDAO{db: db}
}