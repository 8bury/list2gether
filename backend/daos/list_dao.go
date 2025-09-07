package daos

import (
	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
)

type MovieListDAO interface {
	InviteCodeExists(code string) (bool, error)
	CreateWithOwner(list *models.MovieList, ownerUserID int64) error
	FindByIDWithCreator(id int64) (*models.MovieList, error)
}

type movieListDAO struct {
	db *gorm.DB
}

func NewMovieListDAO(db *gorm.DB) MovieListDAO {
	return &movieListDAO{db: db}
}

func (d *movieListDAO) InviteCodeExists(code string) (bool, error) {
	var count int64
	if err := d.db.Model(&models.MovieList{}).Where("invite_code = ?", code).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (d *movieListDAO) CreateWithOwner(list *models.MovieList, ownerUserID int64) error {
	return d.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(list).Error; err != nil {
			return err
		}
		member := &models.ListMember{
			ListID: list.ID,
			UserID: ownerUserID,
			Role:   models.RoleOwner,
		}
		if err := tx.Create(member).Error; err != nil {
			return err
		}
		return nil
	})
}

func (d *movieListDAO) FindByIDWithCreator(id int64) (*models.MovieList, error) {
	var list models.MovieList
	if err := d.db.Preload("Creator").First(&list, id).Error; err != nil {
		return nil, err
	}
	return &list, nil
}
