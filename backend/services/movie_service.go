package services

import (
	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/models"
)

type MovieService struct {
	MovieDAO *daos.MovieDAO
	ImdbService *ImdbService
}

func NewMovieService(movieDAO *daos.MovieDAO, imdbService *ImdbService) *MovieService {
	return &MovieService{
		MovieDAO: movieDAO,
		ImdbService: imdbService,
	}
}

func (s *MovieService) GetMovieByIMDBId(imdbId string) (*models.Movie, error) {
	movie, err := s.MovieDAO.GetMovieByIMDBId(imdbId)
	if err != nil {
		return nil, err
	}

	if movie == nil {
		movie, err = s.ImdbService.GetMovieByIMDBId(imdbId)
		if err != nil {
			return nil, err
		}
	}
	return movie, nil
}