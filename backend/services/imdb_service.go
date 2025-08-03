package services

import (
	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/models"
	"log"
)

type ImdbService struct {
	ImdbDAO *daos.ImdbDAO
}

func NewImdbService(imdbDAO *daos.ImdbDAO) *ImdbService {
	return &ImdbService{ImdbDAO: imdbDAO}
}

func (s *ImdbService) GetMovieByIMDBId(imdbId string) (*models.Movie, error) {
	movie, err := s.ImdbDAO.GetMovieByIMDBId(imdbId)
	if err != nil {
		log.Printf("Error retrieving movie from IMDB DAO: %v", err)
		return nil, err
	}

	databaseMovie, err := s.ImdbDAO.RegisterMovieInDatabase(movie)
	if err != nil {
		log.Printf("Error registering movie in database: %v", err)
		return nil, err
	}

	return databaseMovie, nil
}