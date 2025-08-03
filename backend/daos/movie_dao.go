package daos

import (
	"log"

	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
)

type MovieDAO struct {
	db *gorm.DB
}

func NewMovieDAO(db *gorm.DB) *MovieDAO {
	return &MovieDAO{db: db}
}

func (dao *MovieDAO) GetMovieByIMDBId(imdbId string) (*models.Movie, error) {
	var movie models.Movie
	if err := dao.db.Where("imdb_id = ?", imdbId).First(&movie).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("Movie with IMDB ID %s not found in database", imdbId)
			return nil, nil
		}
		log.Printf("Error retrieving movie with IMDB ID %s: %v", imdbId, err)
		return nil, err
	}
	return &movie, nil
}
