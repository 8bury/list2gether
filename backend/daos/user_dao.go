package daos

import (
	"errors"

	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
)

type UserDAO interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByUsername(username string) (*models.User, error)
	FindByID(id int64) (*models.User, error)
}

type userDAO struct {
	db *gorm.DB
}

func NewUserDAO(db *gorm.DB) UserDAO {
	return &userDAO{db: db}
}

func (d *userDAO) Create(user *models.User) error {
	return d.db.Create(user).Error
}

func (d *userDAO) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := d.db.Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, gorm.ErrRecordNotFound
	}
	return &user, err
}

func (d *userDAO) FindByUsername(username string) (*models.User, error) {
	var user models.User
	err := d.db.Where("username = ?", username).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, gorm.ErrRecordNotFound
	}
	return &user, err
}

func (d *userDAO) FindByID(id int64) (*models.User, error) {
	var user models.User
	err := d.db.First(&user, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, gorm.ErrRecordNotFound
	}
	return &user, err
}
