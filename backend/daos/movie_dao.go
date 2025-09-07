package daos

import (
	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MovieDAO interface {
	FindByIDAndType(id int64, mediaType string) (*models.Movie, error)
	CreateMovieWithGenres(movie *models.Movie, genres []models.Genre) error
}

type movieDAO struct {
	db *gorm.DB
}

func NewMovieDAO(db *gorm.DB) MovieDAO {
	return &movieDAO{db: db}
}

func (d *movieDAO) FindByIDAndType(id int64, mediaType string) (*models.Movie, error) {
	var m models.Movie
	if err := d.db.Where("id = ? AND media_type = ?", id, mediaType).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (d *movieDAO) CreateMovieWithGenres(movie *models.Movie, genres []models.Genre) error {
	return d.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(movie).Error; err != nil {
			return err
		}
		if len(genres) == 0 {
			return nil
		}
		for i := range genres {
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&genres[i]).Error; err != nil {
				return err
			}
			if err := tx.Model(movie).Association("Genres").Append(&genres[i]); err != nil {
				return err
			}
		}
		return nil
	})
}
