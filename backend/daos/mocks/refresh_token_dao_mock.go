package mocks

import (
	"time"

	"github.com/8bury/list2gether/models"
	"github.com/stretchr/testify/mock"
)

// MockRefreshTokenDAO is a mock implementation of RefreshTokenDAO interface.
type MockRefreshTokenDAO struct {
	mock.Mock
}

// Create mocks the Create method.
func (m *MockRefreshTokenDAO) Create(token *models.RefreshToken) error {
	args := m.Called(token)
	return args.Error(0)
}

// FindByHash mocks the FindByHash method.
func (m *MockRefreshTokenDAO) FindByHash(hash string) (*models.RefreshToken, error) {
	args := m.Called(hash)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.RefreshToken), args.Error(1)
}

// FindByHashForUpdate mocks the FindByHashForUpdate method.
func (m *MockRefreshTokenDAO) FindByHashForUpdate(hash string) (*models.RefreshToken, error) {
	args := m.Called(hash)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.RefreshToken), args.Error(1)
}

// ReplaceToken mocks the ReplaceToken method.
func (m *MockRefreshTokenDAO) ReplaceToken(oldHash string, newHash string, now time.Time) error {
	args := m.Called(oldHash, newHash, now)
	return args.Error(0)
}

// RevokeFamily mocks the RevokeFamily method.
func (m *MockRefreshTokenDAO) RevokeFamily(familyID string) error {
	args := m.Called(familyID)
	return args.Error(0)
}

// RevokeByHash mocks the RevokeByHash method.
func (m *MockRefreshTokenDAO) RevokeByHash(hash string) error {
	args := m.Called(hash)
	return args.Error(0)
}

// RevokeAllByUserID mocks the RevokeAllByUserID method.
func (m *MockRefreshTokenDAO) RevokeAllByUserID(userID int64) error {
	args := m.Called(userID)
	return args.Error(0)
}
