package daos

import (
	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MovieListDAO interface {
	InviteCodeExists(code string) (bool, error)
	CreateWithOwner(list *models.MovieList, ownerUserID int64) error
	FindByIDWithCreator(id int64) (*models.MovieList, error)
	FindByInviteCodeWithCreator(code string) (*models.MovieList, error)
	FindMembership(listID, userID int64) (*models.ListMember, error)
	AddParticipantIfNotExists(listID, userID int64) (bool, error)
	CountMembers(listID int64) (int64, error)
	FindByID(id int64) (*models.MovieList, error)
	DeleteListCascadeIfOwner(listID, userID int64) error
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

func (d *movieListDAO) FindByInviteCodeWithCreator(code string) (*models.MovieList, error) {
	var list models.MovieList
	if err := d.db.Preload("Creator").Where("invite_code = ?", code).First(&list).Error; err != nil {
		return nil, err
	}
	return &list, nil
}

func (d *movieListDAO) FindMembership(listID, userID int64) (*models.ListMember, error) {
	var m models.ListMember
	if err := d.db.Where("list_id = ? AND user_id = ?", listID, userID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (d *movieListDAO) AddParticipantIfNotExists(listID, userID int64) (bool, error) {
	m := &models.ListMember{ListID: listID, UserID: userID, Role: models.RoleParticipant}
	tx := d.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "list_id"}, {Name: "user_id"}},
		DoNothing: true,
	}).Create(m)
	if tx.Error != nil {
		return false, tx.Error
	}
	return tx.RowsAffected > 0, nil
}

func (d *movieListDAO) CountMembers(listID int64) (int64, error) {
	var count int64
	if err := d.db.Model(&models.ListMember{}).Where("list_id = ?", listID).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (d *movieListDAO) FindByID(id int64) (*models.MovieList, error) {
	var list models.MovieList
	if err := d.db.First(&list, id).Error; err != nil {
		return nil, err
	}
	return &list, nil
}

func (d *movieListDAO) DeleteListCascadeIfOwner(listID, userID int64) error {
	return d.db.Transaction(func(tx *gorm.DB) error {
		var membership models.ListMember
		if err := tx.Where("list_id = ? AND user_id = ?", listID, userID).First(&membership).Error; err != nil {
			return err
		}
		if membership.Role != models.RoleOwner {
			return gorm.ErrInvalidData
		}

		if err := tx.Where("list_id = ?", listID).Delete(&models.ListMovie{}).Error; err != nil {
			return err
		}
		if err := tx.Where("list_id = ?", listID).Delete(&models.ListMember{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", listID).Delete(&models.MovieList{}).Error; err != nil {
			return err
		}
		return nil
	})
}
