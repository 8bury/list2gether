package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/models"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService interface {
	Register(username string, email string, password string) (*models.User, error)
	Login(email string, password string) (*models.User, string, string, int64, int64, error)
	Refresh(refreshToken string) (string, string, int64, int64, error)
	Logout(refreshToken string) error
	FindUserByID(id int64) (*models.User, error)
	UpdateProfile(userID int64, username string, avatarURL string) (*models.User, error)
	JWTSecret() []byte
}

type authService struct {
	users            daos.UserDAO
	refreshTokens    daos.RefreshTokenDAO
	jwtSecret        []byte
	accessExpiresIn  time.Duration
	refreshExpiresIn time.Duration
	bcryptCost       int
}

func NewAuthService(users daos.UserDAO, refreshTokens daos.RefreshTokenDAO) AuthService {
	secret := []byte(getEnv("JWT_SECRET", "changeme_insecure_secret"))
	accessDur := parseDurationWithDays(getEnv("JWT_ACCESS_EXPIRE", "1h"))
	refreshDur := parseDurationWithDays(getEnv("JWT_REFRESH_EXPIRE", "720h"))
	bcryptCost := parseInt(getEnv("BCRYPT_ROUNDS", "12"), 12)
	return &authService{
		users:            users,
		refreshTokens:    refreshTokens,
		jwtSecret:        secret,
		accessExpiresIn:  accessDur,
		refreshExpiresIn: refreshDur,
		bcryptCost:       bcryptCost,
	}
}

func (s *authService) JWTSecret() []byte {
	return s.jwtSecret
}

func (s *authService) Register(username string, email string, password string) (*models.User, error) {
	if err := validateUsername(username); err != nil {
		return nil, err
	}
	if err := validateEmail(email); err != nil {
		return nil, err
	}
	if len(password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}

	if existing, _ := s.users.FindByEmail(strings.ToLower(email)); existing != nil {
		return nil, errors.New("email already exists")
	}
	if existing, _ := s.users.FindByUsername(username); existing != nil {
		return nil, errors.New("username already exists")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), s.bcryptCost)
	if err != nil {
		return nil, err
	}
	user := &models.User{
		Username: username,
		Email:    strings.ToLower(email),
		Password: string(hashed),
	}
	if err := s.users.Create(user); err != nil {
		return nil, err
	}
	user.Password = ""
	return user, nil
}

func (s *authService) Login(email string, password string) (*models.User, string, string, int64, int64, error) {
	user, err := s.users.FindByEmail(strings.ToLower(email))
	if err != nil {
		return nil, "", "", 0, 0, errors.New("invalid credentials")
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) != nil {
		return nil, "", "", 0, 0, errors.New("invalid credentials")
	}

	accessToken, accessExp, err := s.generateAccessToken(user)
	if err != nil {
		return nil, "", "", 0, 0, err
	}
	refreshToken, refreshExp, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, "", "", 0, 0, err
	}
	familyID, err := generateTokenID(32)
	if err != nil {
		return nil, "", "", 0, 0, err
	}

	hashed := sha256.Sum256([]byte(refreshToken))
	tokenHash := hex.EncodeToString(hashed[:])
	rec := &models.RefreshToken{
		UserID:    user.ID,
		TokenHash: tokenHash,
		FamilyID:  familyID,
		ExpiresAt: time.Unix(refreshExp, 0).UTC(),
	}
	if err := s.refreshTokens.Create(rec); err != nil {
		return nil, "", "", 0, 0, err
	}

	user.Password = ""
	return user, accessToken, refreshToken, accessExp - time.Now().UTC().Unix(), accessExp, nil
}

func (s *authService) Refresh(refreshToken string) (string, string, int64, int64, error) {
	now := time.Now().UTC()
	token, err := jwt.Parse(refreshToken, func(t *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}))
	if err != nil || !token.Valid {
		return "", "", 0, 0, errors.New("invalid or expired refresh token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", 0, 0, errors.New("invalid or expired refresh token")
	}
	if typ, ok := claims["type"].(string); !ok || typ != "refresh" {
		return "", "", 0, 0, errors.New("invalid or expired refresh token")
	}
	sub, ok := claims["sub"].(string)
	if !ok {
		return "", "", 0, 0, errors.New("invalid or expired refresh token")
	}
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		return "", "", 0, 0, errors.New("invalid or expired refresh token")
	}

	hashed := sha256.Sum256([]byte(refreshToken))
	tokenHash := hex.EncodeToString(hashed[:])
	rec, err := s.refreshTokens.FindByHashForUpdate(tokenHash)
	if err != nil || rec.UserID != userID || rec.ExpiresAt.Before(now) || rec.FamilyID == "" {
		return "", "", 0, 0, errors.New("invalid or expired refresh token")
	}
	if rec.IsRevoked || rec.ReplacedByHash != nil {
		if revokeErr := s.refreshTokens.RevokeFamily(rec.FamilyID); revokeErr != nil {
			return "", "", 0, 0, revokeErr
		}
		return "", "", 0, 0, errors.New("invalid or expired refresh token")
	}

	user, err := s.users.FindByID(userID)
	if err != nil {
		return "", "", 0, 0, errors.New("invalid or expired refresh token")
	}

	accessToken, accessExp, err := s.generateAccessToken(user)
	if err != nil {
		return "", "", 0, 0, err
	}
	newRefreshToken, refreshExp, err := s.generateRefreshToken(user)
	if err != nil {
		return "", "", 0, 0, err
	}

	newHashRaw := sha256.Sum256([]byte(newRefreshToken))
	newTokenHash := hex.EncodeToString(newHashRaw[:])
	if err := s.refreshTokens.ReplaceToken(tokenHash, newTokenHash, now); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if revokeErr := s.refreshTokens.RevokeFamily(rec.FamilyID); revokeErr != nil {
				return "", "", 0, 0, revokeErr
			}
			return "", "", 0, 0, errors.New("invalid or expired refresh token")
		}
		return "", "", 0, 0, err
	}

	newRec := &models.RefreshToken{
		UserID:    user.ID,
		TokenHash: newTokenHash,
		FamilyID:  rec.FamilyID,
		ExpiresAt: time.Unix(refreshExp, 0).UTC(),
	}
	if err := s.refreshTokens.Create(newRec); err != nil {
		return "", "", 0, 0, err
	}

	return accessToken, newRefreshToken, accessExp - now.Unix(), accessExp, nil
}

func (s *authService) Logout(refreshToken string) error {
	hashed := sha256.Sum256([]byte(refreshToken))
	tokenHash := hex.EncodeToString(hashed[:])
	return s.refreshTokens.RevokeByHash(tokenHash)
}

func (s *authService) FindUserByID(id int64) (*models.User, error) {
	user, err := s.users.FindByID(id)
	if err != nil {
		return nil, err
	}
	user.Password = ""
	return user, nil
}

func (s *authService) UpdateProfile(userID int64, username string, avatarURL string) (*models.User, error) {
	user, err := s.users.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Validate username
	if err := validateUsername(username); err != nil {
		return nil, err
	}

	// Check if new username is taken by another user
	if username != user.Username {
		existing, _ := s.users.FindByUsername(username)
		if existing != nil && existing.ID != userID {
			return nil, errors.New("username already exists")
		}
	}

	// Validate avatar URL
	if err := validateAvatarURL(avatarURL); err != nil {
		return nil, err
	}

	user.Username = username
	if avatarURL == "" {
		user.AvatarURL = nil
	} else {
		user.AvatarURL = &avatarURL
	}

	if err := s.users.Update(user); err != nil {
		return nil, err
	}

	user.Password = ""
	return user, nil
}

func (s *authService) generateAccessToken(user *models.User) (string, int64, error) {
	now := time.Now().UTC()
	exp := now.Add(s.accessExpiresIn)
	claims := jwt.MapClaims{
		"sub":      strconv.FormatInt(user.ID, 10),
		"username": user.Username,
		"email":    user.Email,
		"type":     "access",
		"iat":      now.Unix(),
		"exp":      exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", 0, err
	}
	return signed, exp.Unix(), nil
}

func (s *authService) generateRefreshToken(user *models.User) (string, int64, error) {
	now := time.Now().UTC()
	exp := now.Add(s.refreshExpiresIn)
	claims := jwt.MapClaims{
		"sub":  strconv.FormatInt(user.ID, 10),
		"type": "refresh",
		"iat":  now.Unix(),
		"exp":  exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", 0, err
	}
	return signed, exp.Unix(), nil
}

func generateTokenID(length int) (string, error) {
	if length <= 0 {
		return "", errors.New("invalid token length")
	}
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func getEnv(key string, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func parseDurationWithDays(s string) time.Duration {
	s = strings.TrimSpace(strings.ToLower(s))
	if strings.HasSuffix(s, "d") {
		num := strings.TrimSuffix(s, "d")
		n, err := strconv.Atoi(num)
		if err != nil {
			return time.Hour
		}
		return time.Duration(n) * 24 * time.Hour
	}
	d, err := time.ParseDuration(s)
	if err != nil {
		return time.Hour
	}
	return d
}

func parseInt(s string, def int) int {
	i, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return i
}

func validateUsername(u string) error {
	if len(u) < 3 || len(u) > 50 {
		return errors.New("username must be between 3 and 50 characters")
	}
	return nil
}

func validateEmail(e string) error {
	e = strings.TrimSpace(e)
	if e == "" || !strings.Contains(e, "@") || len(e) > 255 {
		return errors.New("invalid email")
	}
	return nil
}

func validateAvatarURL(url string) error {
	if url == "" {
		return nil
	}
	if len(url) > 500 {
		return errors.New("avatar URL must be at most 500 characters")
	}
	if !strings.HasPrefix(url, "https://") {
		return errors.New("avatar URL must start with https://")
	}
	return nil
}
