package daos

import (
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
			return nil, nil
		}
		return nil, err
	}
	return &movie, nil
}
