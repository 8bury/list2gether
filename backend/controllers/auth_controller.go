package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/8bury/list2gether/middleware"
	"github.com/8bury/list2gether/services"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthController struct {
	service        services.AuthService
	authMiddleware *middleware.AuthMiddleware
}

func NewAuthController(router *gin.Engine, service services.AuthService, authMiddleware *middleware.AuthMiddleware) *AuthController {
	c := &AuthController{service: service, authMiddleware: authMiddleware}
	group := router.Group("/auth")
	group.POST("/register", c.register)
	group.POST("/login", c.login)
	group.POST("/refresh", c.refresh)
	group.POST("/logout", c.authMiddleware.Handler(), c.logout)
	group.GET("/me", c.authMiddleware.Handler(), c.me)
	group.PUT("/profile", c.authMiddleware.Handler(), c.updateProfile)
	return c
}

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type updateProfileRequest struct {
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
}

func (a *AuthController) register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, []string{"Invalid request body"})
		return
	}
	user, err := a.service.Register(req.Username, req.Email, req.Password)
	if err != nil {
		respondValidationError(c, []string{err.Error()})
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user":    user,
	})
}

func (a *AuthController) login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, []string{"Invalid request body"})
		return
	}
	user, accessToken, refreshToken, expiresIn, err := a.service.Login(req.Email, req.Password)
	if err != nil {
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":     "Invalid credentials",
			"code":      "INVALID_CREDENTIALS",
			"details":   []string{},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{
		"message":       "Login successful",
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"expires_in":    expiresIn,
	})
}

func (a *AuthController) refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
		respondTokenInvalid(c)
		return
	}
	accessToken, expiresIn, err := a.service.Refresh(req.RefreshToken)
	if err != nil {
		respondTokenInvalid(c)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{
		"access_token": accessToken,
		"expires_in":   expiresIn,
	})
}

func (a *AuthController) logout(c *gin.Context) {
	var req logoutRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
		respondTokenInvalid(c)
		return
	}
	if err := a.service.Logout(req.RefreshToken); err != nil {
		respondTokenInvalid(c)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (a *AuthController) me(c *gin.Context) {
	rawClaims, _ := c.Get("auth_claims")
	claims, ok := rawClaims.(jwt.MapClaims)
	if !ok {
		respondTokenInvalid(c)
		return
	}
	sub, ok := claims["sub"].(string)
	if !ok {
		respondTokenInvalid(c)
		return
	}
	id, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(c)
		return
	}
	user, err := a.service.FindUserByID(id)
	if err != nil {
		respondTokenInvalid(c)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (a *AuthController) updateProfile(c *gin.Context) {
	rawClaims, _ := c.Get("auth_claims")
	claims, ok := rawClaims.(jwt.MapClaims)
	if !ok {
		respondTokenInvalid(c)
		return
	}
	sub, ok := claims["sub"].(string)
	if !ok {
		respondTokenInvalid(c)
		return
	}
	id, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(c)
		return
	}

	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, []string{"Invalid request body"})
		return
	}

	user, err := a.service.UpdateProfile(id, req.Username, req.AvatarURL)
	if err != nil {
		respondValidationError(c, []string{err.Error()})
		return
	}

	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

func respondValidationError(c *gin.Context, details []string) {
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusBadRequest, gin.H{
		"error":     "Validation failed",
		"code":      "VALIDATION_ERROR",
		"details":   details,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func respondTokenInvalid(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusUnauthorized, gin.H{
		"error":     "Invalid or expired refresh token",
		"code":      "TOKEN_INVALID",
		"details":   []string{},
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
