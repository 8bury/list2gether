package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthMiddleware struct {
	secret []byte
}

func NewAuthMiddleware(secret []byte) *AuthMiddleware {
	return &AuthMiddleware{secret: secret}
}

func (m *AuthMiddleware) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":     "Access token required",
				"code":      "TOKEN_INVALID",
				"details":   []string{},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			return m.secret, nil
		}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}))
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":     "Invalid token",
				"code":      "TOKEN_INVALID",
				"details":   []string{},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":     "Invalid token",
				"code":      "TOKEN_INVALID",
				"details":   []string{},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		if typ, ok := claims["type"].(string); !ok || typ != "access" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":     "Invalid token type",
				"code":      "TOKEN_INVALID",
				"details":   []string{},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		c.Set("auth_claims", claims)
		c.Next()
	}
}
