package mocks

import (
	"github.com/8bury/list2gether/models"
	"github.com/stretchr/testify/mock"
)

// MockUserDAO is a mock implementation of UserDAO interface.
type MockUserDAO struct {
	mock.Mock
}

// Create mocks the Create method.
func (m *MockUserDAO) Create(user *models.User) error {
	args := m.Called(user)
	return args.Error(0)
}

// FindByEmail mocks the FindByEmail method.
func (m *MockUserDAO) FindByEmail(email string) (*models.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

// FindByUsername mocks the FindByUsername method.
func (m *MockUserDAO) FindByUsername(username string) (*models.User, error) {
	args := m.Called(username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

// FindByID mocks the FindByID method.
func (m *MockUserDAO) FindByID(id int64) (*models.User, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

// Update mocks the Update method.
func (m *MockUserDAO) Update(user *models.User) error {
	args := m.Called(user)
	return args.Error(0)
}
