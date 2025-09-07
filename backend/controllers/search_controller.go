package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/8bury/list2gether/middleware"
	"github.com/8bury/list2gether/services"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type SearchController struct {
	service        services.SearchService
	authMiddleware *middleware.AuthMiddleware
}

func NewSearchController(router *gin.Engine, service services.SearchService, authMiddleware *middleware.AuthMiddleware) *SearchController {
	c := &SearchController{service: service, authMiddleware: authMiddleware}
	group := router.Group("/api/search")
	group.GET("/media", c.authMiddleware.Handler(), c.searchMedia)
	return c
}

var searchLimiter = struct {
	mu   sync.Mutex
	data map[int64][]time.Time
}{data: make(map[int64][]time.Time)}

func allowSearch(userID int64) bool {
	window := time.Minute
	limit := 100
	searchLimiter.mu.Lock()
	defer searchLimiter.mu.Unlock()
	now := time.Now()
	arr := searchLimiter.data[userID]
	filtered := make([]time.Time, 0, len(arr))
	for _, t := range arr {
		if now.Sub(t) <= window {
			filtered = append(filtered, t)
		}
	}
	if len(filtered) >= limit {
		searchLimiter.data[userID] = filtered
		return false
	}
	filtered = append(filtered, now)
	searchLimiter.data[userID] = filtered
	return true
}

func (c *SearchController) searchMedia(ctx *gin.Context) {
	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	q := strings.TrimSpace(ctx.Query("q"))
	if len(q) < 2 || len(q) > 100 {
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error":     "Invalid query parameter",
			"code":      "VALIDATION_ERROR",
			"details":   []string{"Query must be between 2 and 100 characters"},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	if !allowSearch(userID) {
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusTooManyRequests, gin.H{
			"error":     "Rate limited",
			"code":      "RATE_LIMITED",
			"details":   []string{"Too many search requests"},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	ctx.Header("Cache-Control", "no-store")
	results, svcErr := c.service.SearchMedia(ctx, q, 5)
	if svcErr != nil {
		status := http.StatusInternalServerError
		errMsg := "Search service unavailable"
		if svcErr == services.ErrTMDBRateLimited || svcErr == services.ErrTMDBUnavailable {
			status = http.StatusServiceUnavailable
		}
		ctx.JSON(status, gin.H{
			"error":     errMsg,
			"code":      "SEARCH_UNAVAILABLE",
			"details":   []string{svcErr.Error()},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	payload := make([]gin.H, 0, len(results))
	for _, r := range results {
		payload = append(payload, gin.H{
			"id":            r.ID,
			"name":          r.Name,
			"original_name": r.OriginalName,
			"poster_url":    r.PosterURL,
			"media_type":    r.MediaType,
		})
	}
	ctx.JSON(http.StatusOK, gin.H{
		"results":       payload,
		"total_results": len(payload),
		"query":         q,
	})
}
