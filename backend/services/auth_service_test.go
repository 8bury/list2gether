package services

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/8bury/list2gether/daos/mocks"
	"github.com/8bury/list2gether/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func TestNewAuthService(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO)

	assert.NotNil(t, service)
	assert.NotNil(t, service.JWTSecret())
}

func TestRegister_Success(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	userDAO.On("FindByEmail", "test@example.com").Return(nil, gorm.ErrRecordNotFound)
	userDAO.On("FindByUsername", "testuser").Return(nil, gorm.ErrRecordNotFound)
	userDAO.On("Create", mock.AnythingOfType("*models.User")).Return(nil)

	service := NewAuthService(userDAO, refreshDAO)

	user, err := service.Register("testuser", "test@example.com", "password123")

	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, "testuser", user.Username)
	assert.Equal(t, "test@example.com", user.Email)
	assert.Empty(t, user.Password) // Password should be cleared

	userDAO.AssertExpectations(t)
}

func TestRegister_UsernameValidation(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}
	service := NewAuthService(userDAO, refreshDAO)

	tests := []struct {
		name        string
		username    string
		expectedErr string
	}{
		{"too short", "ab", "Username must be between 3 and 50 characters"},
		{"too long", "a123456789012345678901234567890123456789012345678901", "Username must be between 3 and 50 characters"},
		{"valid", "validuser", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.expectedErr == "" {
				userDAO.On("FindByEmail", mock.Anything).Return(nil, gorm.ErrRecordNotFound).Once()
				userDAO.On("FindByUsername", tt.username).Return(nil, gorm.ErrRecordNotFound).Once()
				userDAO.On("Create", mock.AnythingOfType("*models.User")).Return(nil).Once()
			}

			_, err := service.Register(tt.username, "test@example.com", "password123")

			if tt.expectedErr != "" {
				assert.Error(t, err)
				assert.Equal(t, tt.expectedErr, err.Error())
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRegister_EmailValidation(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}
	service := NewAuthService(userDAO, refreshDAO)

	tests := []struct {
		name        string
		email       string
		expectedErr string
	}{
		{"empty email", "", "Invalid email"},
		{"no @ symbol", "notanemail", "Invalid email"},
		{"too long", "a" + string(make([]byte, 300)) + "@example.com", "Invalid email"},
		{"valid", "test@example.com", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.expectedErr == "" {
				userDAO.On("FindByEmail", mock.Anything).Return(nil, gorm.ErrRecordNotFound).Once()
				userDAO.On("FindByUsername", mock.Anything).Return(nil, gorm.ErrRecordNotFound).Once()
				userDAO.On("Create", mock.AnythingOfType("*models.User")).Return(nil).Once()
			}

			_, err := service.Register("testuser", tt.email, "password123")

			if tt.expectedErr != "" {
				assert.Error(t, err)
				assert.Equal(t, tt.expectedErr, err.Error())
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRegister_PasswordValidation(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}
	service := NewAuthService(userDAO, refreshDAO)

	_, err := service.Register("testuser", "test@example.com", "short")

	assert.Error(t, err)
	assert.Equal(t, "Password must be at least 8 characters", err.Error())
}

func TestRegister_DuplicateEmail(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	existingUser := &models.User{ID: 1, Email: "test@example.com"}
	userDAO.On("FindByEmail", "test@example.com").Return(existingUser, nil)

	service := NewAuthService(userDAO, refreshDAO)

	_, err := service.Register("testuser", "test@example.com", "password123")

	assert.Error(t, err)
	assert.Equal(t, "Email already exists", err.Error())
	userDAO.AssertExpectations(t)
}

func TestRegister_DuplicateUsername(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	userDAO.On("FindByEmail", "test@example.com").Return(nil, gorm.ErrRecordNotFound)
	existingUser := &models.User{ID: 1, Username: "testuser"}
	userDAO.On("FindByUsername", "testuser").Return(existingUser, nil)

	service := NewAuthService(userDAO, refreshDAO)

	_, err := service.Register("testuser", "test@example.com", "password123")

	assert.Error(t, err)
	assert.Equal(t, "Username already exists", err.Error())
	userDAO.AssertExpectations(t)
}

func TestLogin_Success(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte("password123"), 12)
	user := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
		Password: string(hashedPwd),
	}

	userDAO.On("FindByEmail", "test@example.com").Return(user, nil)
	refreshDAO.On("Create", mock.AnythingOfType("*models.RefreshToken")).Return(nil)

	service := NewAuthService(userDAO, refreshDAO)

	resultUser, accessToken, refreshToken, expiresIn, err := service.Login("test@example.com", "password123")

	assert.NoError(t, err)
	assert.NotNil(t, resultUser)
	assert.Equal(t, "testuser", resultUser.Username)
	assert.Empty(t, resultUser.Password)
	assert.NotEmpty(t, accessToken)
	assert.NotEmpty(t, refreshToken)
	assert.Greater(t, expiresIn, int64(0))

	userDAO.AssertExpectations(t)
	refreshDAO.AssertExpectations(t)
}

func TestLogin_InvalidEmail(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	userDAO.On("FindByEmail", "wrong@example.com").Return(nil, gorm.ErrRecordNotFound)

	service := NewAuthService(userDAO, refreshDAO)

	_, _, _, _, err := service.Login("wrong@example.com", "password123")

	assert.Error(t, err)
	assert.Equal(t, "Invalid credentials", err.Error())
	userDAO.AssertExpectations(t)
}

func TestLogin_InvalidPassword(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte("password123"), 12)
	user := &models.User{
		ID:       1,
		Email:    "test@example.com",
		Password: string(hashedPwd),
	}

	userDAO.On("FindByEmail", "test@example.com").Return(user, nil)

	service := NewAuthService(userDAO, refreshDAO)

	_, _, _, _, err := service.Login("test@example.com", "wrongpassword")

	assert.Error(t, err)
	assert.Equal(t, "Invalid credentials", err.Error())
	userDAO.AssertExpectations(t)
}

func TestRefresh_Success(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO)
	secret := service.JWTSecret()

	// Create a valid refresh token.
	exp := time.Now().UTC().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"sub":  "1",
		"type": "refresh",
		"iat":  time.Now().UTC().Unix(),
		"exp":  exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	refreshToken, _ := token.SignedString(secret)

	hashed := sha256.Sum256([]byte(refreshToken))
	tokenHash := hex.EncodeToString(hashed[:])

	refreshTokenModel := &models.RefreshToken{
		ID:        1,
		UserID:    1,
		TokenHash: tokenHash,
		ExpiresAt: exp,
		IsRevoked: false,
	}

	user := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
	}

	refreshDAO.On("FindByHash", tokenHash).Return(refreshTokenModel, nil)
	userDAO.On("FindByID", int64(1)).Return(user, nil)

	accessToken, expiresIn, err := service.Refresh(refreshToken)

	assert.NoError(t, err)
	assert.NotEmpty(t, accessToken)
	assert.Greater(t, expiresIn, int64(0))

	refreshDAO.AssertExpectations(t)
	userDAO.AssertExpectations(t)
}

func TestRefresh_InvalidToken(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO)

	_, _, err := service.Refresh("invalid.token.here")

	assert.Error(t, err)
	assert.Equal(t, "Invalid or expired refresh token", err.Error())
}

func TestRefresh_RevokedToken(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO)
	secret := service.JWTSecret()

	exp := time.Now().UTC().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"sub":  "1",
		"type": "refresh",
		"iat":  time.Now().UTC().Unix(),
		"exp":  exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	refreshToken, _ := token.SignedString(secret)

	hashed := sha256.Sum256([]byte(refreshToken))
	tokenHash := hex.EncodeToString(hashed[:])

	refreshTokenModel := &models.RefreshToken{
		ID:        1,
		UserID:    1,
		TokenHash: tokenHash,
		ExpiresAt: exp,
		IsRevoked: true,
	}

	refreshDAO.On("FindByHash", tokenHash).Return(refreshTokenModel, nil)

	_, _, err := service.Refresh(refreshToken)

	assert.Error(t, err)
	assert.Equal(t, "Invalid or expired refresh token", err.Error())
	refreshDAO.AssertExpectations(t)
}

func TestLogout_Success(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	refreshDAO.On("RevokeByHash", mock.Anything).Return(nil)

	service := NewAuthService(userDAO, refreshDAO)

	err := service.Logout("some.refresh.token")

	assert.NoError(t, err)
	refreshDAO.AssertExpectations(t)
}

func TestFindUserByID_Success(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	user := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
		Password: "hashedpassword",
	}

	userDAO.On("FindByID", int64(1)).Return(user, nil)

	service := NewAuthService(userDAO, refreshDAO)

	resultUser, err := service.FindUserByID(1)

	assert.NoError(t, err)
	assert.NotNil(t, resultUser)
	assert.Equal(t, "testuser", resultUser.Username)
	assert.Empty(t, resultUser.Password)

	userDAO.AssertExpectations(t)
}

func TestFindUserByID_NotFound(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	userDAO.On("FindByID", int64(999)).Return(nil, gorm.ErrRecordNotFound)

	service := NewAuthService(userDAO, refreshDAO)

	_, err := service.FindUserByID(999)

	assert.Error(t, err)
	userDAO.AssertExpectations(t)
}

func TestUpdateProfile_Success(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	user := &models.User{
		ID:       1,
		Username: "olduser",
		Email:    "test@example.com",
	}

	userDAO.On("FindByID", int64(1)).Return(user, nil)
	userDAO.On("FindByUsername", "newuser").Return(nil, gorm.ErrRecordNotFound)
	userDAO.On("Update", mock.AnythingOfType("*models.User")).Return(nil)

	service := NewAuthService(userDAO, refreshDAO)

	avatarURL := "https://example.com/avatar.png"
	resultUser, err := service.UpdateProfile(1, "newuser", avatarURL)

	assert.NoError(t, err)
	assert.NotNil(t, resultUser)
	assert.Equal(t, "newuser", resultUser.Username)
	assert.NotNil(t, resultUser.AvatarURL)
	assert.Equal(t, avatarURL, *resultUser.AvatarURL)
	assert.Empty(t, resultUser.Password)

	userDAO.AssertExpectations(t)
}

func TestUpdateProfile_InvalidUsername(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	user := &models.User{
		ID:       1,
		Username: "olduser",
		Email:    "test@example.com",
	}

	userDAO.On("FindByID", int64(1)).Return(user, nil)

	service := NewAuthService(userDAO, refreshDAO)

	_, err := service.UpdateProfile(1, "ab", "")

	assert.Error(t, err)
	assert.Equal(t, "Username must be between 3 and 50 characters", err.Error())
	userDAO.AssertExpectations(t)
}

func TestUpdateProfile_DuplicateUsername(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	user := &models.User{
		ID:       1,
		Username: "olduser",
		Email:    "test@example.com",
	}

	existingUser := &models.User{
		ID:       2,
		Username: "takenuser",
	}

	userDAO.On("FindByID", int64(1)).Return(user, nil)
	userDAO.On("FindByUsername", "takenuser").Return(existingUser, nil)

	service := NewAuthService(userDAO, refreshDAO)

	_, err := service.UpdateProfile(1, "takenuser", "")

	assert.Error(t, err)
	assert.Equal(t, "Username already exists", err.Error())
	userDAO.AssertExpectations(t)
}

func TestUpdateProfile_InvalidAvatarURL(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	user := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
	}

	userDAO.On("FindByID", int64(1)).Return(user, nil)

	service := NewAuthService(userDAO, refreshDAO)

	// Test non-HTTPS URL.
	_, err := service.UpdateProfile(1, "testuser", "http://example.com/avatar.png")
	assert.Error(t, err)
	assert.Equal(t, "Avatar URL must start with https://", err.Error())

	// Test URL too long.
	longURL := "https://" + string(make([]byte, 500)) + ".com"
	_, err = service.UpdateProfile(1, "testuser", longURL)
	assert.Error(t, err)
	assert.Equal(t, "Avatar URL must be at most 500 characters", err.Error())

	userDAO.AssertExpectations(t)
}

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		name        string
		username    string
		expectError bool
	}{
		{"valid username", "validuser", false},
		{"too short", "ab", true},
		{"too long", string(make([]byte, 51)), true},
		{"min length", "abc", false},
		{"max length", string(make([]byte, 50)), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateUsername(tt.username)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		expectError bool
	}{
		{"valid email", "test@example.com", false},
		{"empty email", "", true},
		{"no @ symbol", "notanemail", true},
		{"too long", string(make([]byte, 256)) + "@example.com", true},
		{"whitespace", "  test@example.com  ", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateEmail(tt.email)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateAvatarURL(t *testing.T) {
	tests := []struct {
		name        string
		url         string
		expectError bool
	}{
		{"valid HTTPS URL", "https://example.com/avatar.png", false},
		{"empty URL", "", false},
		{"HTTP URL", "http://example.com/avatar.png", true},
		{"too long", "https://" + string(make([]byte, 500)), true},
		{"no protocol", "example.com/avatar.png", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAvatarURL(tt.url)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestParseDurationWithDays(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected time.Duration
	}{
		{"1 day", "1d", 24 * time.Hour},
		{"30 days", "30d", 30 * 24 * time.Hour},
		{"1 hour", "1h", time.Hour},
		{"30 minutes", "30m", 30 * time.Minute},
		{"invalid", "invalid", time.Hour},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseDurationWithDays(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParseInt(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		def      int
		expected int
	}{
		{"valid int", "10", 5, 10},
		{"invalid int", "abc", 5, 5},
		{"empty string", "", 5, 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseInt(tt.input, tt.def)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetEnv(t *testing.T) {
	key := "TEST_ENV_VAR"
	def := "default_value"

	// Test with unset env var.
	result := getEnv(key, def)
	assert.Equal(t, def, result)

	// Test with set env var.
	os.Setenv(key, "custom_value")
	defer os.Unsetenv(key)

	result = getEnv(key, def)
	assert.Equal(t, "custom_value", result)
}

func TestGenerateAccessToken(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO).(*authService)

	user := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
	}

	tokenString, exp, err := service.generateAccessToken(user)

	assert.NoError(t, err)
	assert.NotEmpty(t, tokenString)
	assert.Greater(t, exp, time.Now().UTC().Unix())

	// Verify token claims.
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		return service.jwtSecret, nil
	})

	assert.NoError(t, err)
	assert.True(t, token.Valid)

	claims, ok := token.Claims.(jwt.MapClaims)
	assert.True(t, ok)
	assert.Equal(t, "1", claims["sub"])
	assert.Equal(t, "testuser", claims["username"])
	assert.Equal(t, "test@example.com", claims["email"])
	assert.Equal(t, "access", claims["type"])
}

func TestGenerateRefreshToken(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO).(*authService)

	user := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
	}

	tokenString, exp, err := service.generateRefreshToken(user)

	assert.NoError(t, err)
	assert.NotEmpty(t, tokenString)
	assert.Greater(t, exp, time.Now().UTC().Unix())

	// Verify token claims.
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		return service.jwtSecret, nil
	})

	assert.NoError(t, err)
	assert.True(t, token.Valid)

	claims, ok := token.Claims.(jwt.MapClaims)
	assert.True(t, ok)
	assert.Equal(t, "1", claims["sub"])
	assert.Equal(t, "refresh", claims["type"])
}

func TestRefresh_WrongTokenType(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO)
	secret := service.JWTSecret()

	// Create an access token instead of refresh token.
	exp := time.Now().UTC().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"sub":  "1",
		"type": "access",
		"iat":  time.Now().UTC().Unix(),
		"exp":  exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, _ := token.SignedString(secret)

	_, _, err := service.Refresh(accessToken)

	assert.Error(t, err)
	assert.Equal(t, "Invalid or expired refresh token", err.Error())
}

func TestRefresh_ExpiredToken(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO)
	secret := service.JWTSecret()

	// Create an expired refresh token.
	exp := time.Now().UTC().Add(-24 * time.Hour)
	claims := jwt.MapClaims{
		"sub":  "1",
		"type": "refresh",
		"iat":  time.Now().UTC().Add(-48 * time.Hour).Unix(),
		"exp":  exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	refreshToken, _ := token.SignedString(secret)

	_, _, err := service.Refresh(refreshToken)

	assert.Error(t, err)
	assert.Equal(t, "Invalid or expired refresh token", err.Error())
}

func TestRefresh_UserIDMismatch(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO)
	secret := service.JWTSecret()

	exp := time.Now().UTC().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"sub":  "1",
		"type": "refresh",
		"iat":  time.Now().UTC().Unix(),
		"exp":  exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	refreshToken, _ := token.SignedString(secret)

	hashed := sha256.Sum256([]byte(refreshToken))
	tokenHash := hex.EncodeToString(hashed[:])

	// Return a token with different user ID.
	refreshTokenModel := &models.RefreshToken{
		ID:        1,
		UserID:    999,
		TokenHash: tokenHash,
		ExpiresAt: exp,
		IsRevoked: false,
	}

	refreshDAO.On("FindByHash", tokenHash).Return(refreshTokenModel, nil)

	_, _, err := service.Refresh(refreshToken)

	assert.Error(t, err)
	assert.Equal(t, "Invalid or expired refresh token", err.Error())
	refreshDAO.AssertExpectations(t)
}

func TestRefresh_TokenNotInDatabase(t *testing.T) {
	userDAO := &mocks.MockUserDAO{}
	refreshDAO := &mocks.MockRefreshTokenDAO{}

	service := NewAuthService(userDAO, refreshDAO)
	secret := service.JWTSecret()

	exp := time.Now().UTC().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"sub":  "1",
		"type": "refresh",
		"iat":  time.Now().UTC().Unix(),
		"exp":  exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	refreshToken, _ := token.SignedString(secret)

	hashed := sha256.Sum256([]byte(refreshToken))
	tokenHash := hex.EncodeToString(hashed[:])

	refreshDAO.On("FindByHash", tokenHash).Return(nil, errors.New("not found"))

	_, _, err := service.Refresh(refreshToken)

	assert.Error(t, err)
	assert.Equal(t, "Invalid or expired refresh token", err.Error())
	refreshDAO.AssertExpectations(t)
}
