package controllers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/8bury/list2gether/middleware"
	"github.com/8bury/list2gether/services"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
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
	group.GET("/google/login", c.googleLogin)
	group.GET("/google/callback", c.googleCallback)
	group.POST("/refresh", c.refresh)
	group.POST("/logout", c.logout)

	group.GET("/me", c.authMiddleware.Handler(), c.me)
	group.PUT("/profile", c.authMiddleware.Handler(), c.updateProfile)
	return c
}

type googleUserInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
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
		if errors.Is(err, services.ErrGoogleLoginRequired) {
			c.Header("Cache-Control", "no-store")
			c.JSON(http.StatusConflict, gin.H{
				"error":     err.Error(),
				"code":      "GOOGLE_LOGIN_REQUIRED",
				"details":   []string{},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
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
	user, accessToken, refreshToken, expiresIn, accessExp, err := a.service.Login(req.Email, req.Password)
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
		"message":                 "Login successful",
		"user":                    user,
		"access_token":            accessToken,
		"refresh_token":           refreshToken,
		"expires_in":              expiresIn,
		"access_token_expires_at": accessExp,
	})
}

func (a *AuthController) googleLogin(c *gin.Context) {
	oauthConfig, err := googleOAuthConfig()
	if err != nil {
		respondOAuthError(c, http.StatusServiceUnavailable, "Google login is not configured")
		return
	}
	state, err := generateOAuthState()
	if err != nil {
		respondOAuthError(c, http.StatusInternalServerError, "Failed to start Google login")
		return
	}
	http.SetCookie(c.Writer, oauthStateCookie(c, state, 600))
	c.Redirect(http.StatusFound, oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline))
}

func (a *AuthController) googleCallback(c *gin.Context) {
	frontendOrigin := getFrontendOrigin()
	callbackURL := frontendOrigin + "/oauth/google/callback"
	clearOAuthStateCookie(c)

	expectedState, err := c.Cookie("oauth_state")
	if err != nil || expectedState == "" || c.Query("state") == "" || c.Query("state") != expectedState {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Invalid Google login state"))
		return
	}
	if oauthErr := c.Query("error"); oauthErr != "" {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape(oauthErr))
		return
	}
	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Missing Google authorization code"))
		return
	}

	oauthConfig, err := googleOAuthConfig()
	if err != nil {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Google login is not configured"))
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	token, err := oauthConfig.Exchange(ctx, code)
	if err != nil {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Could not exchange Google authorization code"))
		return
	}

	client := oauthConfig.Client(ctx, token)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://openidconnect.googleapis.com/v1/userinfo", nil)
	if err != nil {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Could not fetch Google profile"))
		return
	}
	res, err := client.Do(req)
	if err != nil || res == nil {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Could not fetch Google profile"))
		return
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Could not fetch Google profile"))
		return
	}
	var profile googleUserInfo
	if err := json.NewDecoder(res.Body).Decode(&profile); err != nil {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Could not read Google profile"))
		return
	}

	user, accessToken, refreshToken, expiresIn, accessExp, err := a.service.LoginWithGoogle(services.GoogleProfile{
		Subject:       profile.Sub,
		Email:         profile.Email,
		EmailVerified: profile.EmailVerified,
		Name:          profile.Name,
		Picture:       profile.Picture,
	})
	if err != nil {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape(err.Error()))
		return
	}

	userJSON, err := json.Marshal(user)
	if err != nil {
		c.Redirect(http.StatusFound, callbackURL+"#error="+url.QueryEscape("Could not complete Google login"))
		return
	}
	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("refresh_token", refreshToken)
	values.Set("expires_in", strconv.FormatInt(expiresIn, 10))
	values.Set("access_token_expires_at", strconv.FormatInt(accessExp, 10))
	values.Set("user", string(userJSON))
	c.Redirect(http.StatusFound, callbackURL+"#"+values.Encode())
}

func (a *AuthController) refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
		respondTokenInvalid(c)
		return
	}
	accessToken, newRefreshToken, expiresIn, accessExp, err := a.service.Refresh(req.RefreshToken)
	if err != nil {
		respondTokenInvalid(c)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{
		"access_token":            accessToken,
		"refresh_token":           newRefreshToken,
		"expires_in":              expiresIn,
		"access_token_expires_at": accessExp,
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

func googleOAuthConfig() (*oauth2.Config, error) {
	clientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
	redirectURL := strings.TrimSpace(os.Getenv("GOOGLE_REDIRECT_URL"))
	if redirectURL == "" {
		redirectURL = "http://localhost:8080/auth/google/callback"
	}
	if clientID == "" || clientSecret == "" {
		return nil, os.ErrInvalid
	}
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}, nil
}

func generateOAuthState() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func oauthStateCookie(c *gin.Context, value string, maxAge int) *http.Cookie {
	secure := false
	if redirectURL := strings.TrimSpace(os.Getenv("GOOGLE_REDIRECT_URL")); strings.HasPrefix(redirectURL, "https://") {
		secure = true
	}
	return &http.Cookie{
		Name:     "oauth_state",
		Value:    value,
		Path:     "/auth/google",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	}
}

func clearOAuthStateCookie(c *gin.Context) {
	http.SetCookie(c.Writer, oauthStateCookie(c, "", -1))
}

func getFrontendOrigin() string {
	origin := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN")), "/")
	if origin == "" {
		return "http://localhost:5173"
	}
	return origin
}

func respondOAuthError(c *gin.Context, status int, message string) {
	c.Header("Cache-Control", "no-store")
	c.JSON(status, gin.H{
		"error":     message,
		"code":      "OAUTH_ERROR",
		"details":   []string{},
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
