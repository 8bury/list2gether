package services

import (
	"github.com/8bury/list2gether/daos"
)

type MovieService struct {
	MovieDAO *daos.MovieDAO
}

func NewMovieService(movieDAO *daos.MovieDAO) *MovieService {
	return &MovieService{MovieDAO: movieDAO}
}