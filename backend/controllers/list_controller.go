package controllers

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/middleware"
	"github.com/8bury/list2gether/models"
	"github.com/8bury/list2gether/services"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type ListController struct {
	service               services.ListService
	recommendationService services.RecommendationService
	watchProviderService  services.WatchProviderService
	watchProviderDAO      daos.WatchProviderDAO
	authMiddleware        *middleware.AuthMiddleware
}

func NewListController(router *gin.Engine, service services.ListService, recommendationService services.RecommendationService, watchProviderService services.WatchProviderService, watchProviderDAO daos.WatchProviderDAO, authMiddleware *middleware.AuthMiddleware) *ListController {
	c := &ListController{service: service, recommendationService: recommendationService, watchProviderService: watchProviderService, watchProviderDAO: watchProviderDAO, authMiddleware: authMiddleware}
	group := router.Group("/api/lists")
	group.POST("", c.authMiddleware.Handler(), c.create)
	group.GET("", c.authMiddleware.Handler(), c.list)
	group.POST("/join", c.authMiddleware.Handler(), c.join)
	group.DELETE("/:id", c.authMiddleware.Handler(), c.delete)
	group.POST("/:id/leave", c.authMiddleware.Handler(), c.leave)
	group.POST("/:id/movies", c.authMiddleware.Handler(), c.addMovie)
	group.GET("/:id/movies", c.authMiddleware.Handler(), c.listMovies)
	group.DELETE("/:id/movies/:movieId", c.authMiddleware.Handler(), c.removeMovie)
	group.PATCH("/:id/movies/:movieId", c.authMiddleware.Handler(), c.updateMovie)
	group.PATCH("/:id/movies/reorder", c.authMiddleware.Handler(), c.reorderMovies)
	group.GET("/:id/movies/search", c.authMiddleware.Handler(), c.searchMovies)
	group.GET("/:id/recommendations", c.authMiddleware.Handler(), c.getRecommendations)
	// Comment routes
	group.GET("/:id/movies/:movieId/comments", c.authMiddleware.Handler(), c.listComments)
	group.POST("/:id/movies/:movieId/comments", c.authMiddleware.Handler(), c.createComment)
	group.PATCH("/:id/movies/:movieId/comments/:commentId", c.authMiddleware.Handler(), c.updateComment)
	group.DELETE("/:id/movies/:movieId/comments/:commentId", c.authMiddleware.Handler(), c.deleteComment)
	return c
}

type createListRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type joinListRequest struct {
	InviteCode string `json:"invite_code"`
}

type addMovieRequest struct {
	ID        string `json:"id"`
	MediaType string `json:"media_type"`
}

type updateMovieRequest struct {
	Status *string `json:"status"`
	Rating *int    `json:"rating"`
}

type createCommentRequest struct {
	Content string `json:"content"`
}

type updateCommentRequest struct {
	Content string `json:"content"`
}

type reorderMoviesRequest struct {
	MovieOrders []struct {
		MovieID      int64 `json:"movie_id"`
		DisplayOrder int   `json:"display_order"`
	} `json:"movie_orders"`
}

func (c *ListController) list(ctx *gin.Context) {
	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	var roleFilter *models.ListMemberRole
	roleParam := ctx.Query("role")
	if roleParam != "" {
		rp := strings.ToLower(strings.TrimSpace(roleParam))
		if rp != string(models.RoleOwner) && rp != string(models.RoleParticipant) {
			respondValidationError(ctx, []string{"role must be 'owner' or 'participant'"})
			return
		}
		r := models.ListMemberRole(rp)
		roleFilter = &r
	}

	limit := 50
	offset := 0
	if v := ctx.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			if n < 1 {
				n = 1
			}
			if n > 100 {
				n = 100
			}
			limit = n
		}
	}
	if v := ctx.Query("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	memberships, memberCounts, movieCounts, total, err := c.service.ListUserLists(userID, roleFilter, limit, offset)
	if err != nil {
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":     "Failed to fetch lists",
			"code":      "INTERNAL_ERROR",
			"details":   []string{err.Error()},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	lists := make([]gin.H, 0, len(memberships))
	for _, m := range memberships {
		l := m.List
		lists = append(lists, gin.H{
			"id":           l.ID,
			"name":         l.Name,
			"description":  l.Description,
			"invite_code":  l.InviteCode,
			"your_role":    m.Role,
			"created_at":   l.CreatedAt,
			"updated_at":   l.UpdatedAt,
			"member_count": memberCounts[l.ID],
			"movie_count":  movieCounts[l.ID],
		})
	}

	hasMore := offset+len(lists) < int(total)
	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"lists": lists,
		"pagination": gin.H{
			"total":    total,
			"limit":    limit,
			"offset":   offset,
			"has_more": hasMore,
		},
	})
}

func (c *ListController) create(ctx *gin.Context) {
	var req createListRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}
	if req.Name == "" || len(req.Name) > 255 {
		respondValidationError(ctx, []string{"name is required and must be 1-255 characters"})
		return
	}
	if req.Description != nil && len(*req.Description) > 1000 {
		respondValidationError(ctx, []string{"description must be at most 1000 characters"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	id, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	list, err := c.service.CreateList(req.Name, req.Description, id)
	if err != nil {
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":     "Failed to create list",
			"code":      "INTERNAL_ERROR",
			"details":   []string{err.Error()},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusCreated, list)
}

func (c *ListController) join(ctx *gin.Context) {
	var req joinListRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}
	if req.InviteCode == "" {
		respondValidationError(ctx, []string{"invite_code is required and must be 10 alphanumeric characters"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	id, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	list, role, alreadyMember, memberCount, err := c.service.JoinListByInviteCode(req.InviteCode, id)
	if err != nil {
		if errors.Is(err, services.ErrInvalidInviteCodeFormat) {
			respondValidationError(ctx, []string{"invite_code must be 10 alphanumeric characters"})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "List not found",
				"code":      "NOT_FOUND",
				"details":   []string{"No active list found with provided invite code"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":     "Failed to join list",
			"code":      "INTERNAL_ERROR",
			"details":   []string{err.Error()},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	payloadList := gin.H{
		"id":          list.ID,
		"name":        list.Name,
		"description": list.Description,
		"created_by":  list.CreatedBy,
		"created_at":  list.CreatedAt,
		"creator": gin.H{
			"id":       list.Creator.ID,
			"username": list.Creator.Username,
			"email":    list.Creator.Email,
		},
		"member_count": memberCount,
	}

	ctx.Header("Cache-Control", "no-store")
	if alreadyMember {
		ctx.JSON(http.StatusOK, gin.H{
			"message":   "You are already a member of this list",
			"list":      payloadList,
			"your_role": role,
		})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"message":   "Successfully joined the list",
		"list":      payloadList,
		"your_role": role,
	})
}

var deleteLimiter = struct {
	mu   sync.Mutex
	data map[int64][]time.Time
}{data: make(map[int64][]time.Time)}

func allowDelete(userID int64) bool {
	window := time.Minute
	limit := 3
	deleteLimiter.mu.Lock()
	defer deleteLimiter.mu.Unlock()
	now := time.Now()
	arr := deleteLimiter.data[userID]
	filtered := make([]time.Time, 0, len(arr))
	for _, t := range arr {
		if now.Sub(t) <= window {
			filtered = append(filtered, t)
		}
	}
	if len(filtered) >= limit {
		deleteLimiter.data[userID] = filtered
		return false
	}
	filtered = append(filtered, now)
	deleteLimiter.data[userID] = filtered
	return true
}

func (c *ListController) delete(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	if !allowDelete(userID) {
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusTooManyRequests, gin.H{
			"error":     "Rate limited",
			"code":      "RATE_LIMITED",
			"details":   []string{"Too many delete attempts"},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	log.Printf("delete_list attempt user_id=%d list_id=%d", userID, listID)
	if err := c.service.DeleteList(listID, userID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "List not found",
				"code":      "NOT_FOUND",
				"details":   []string{"The specified list does not exist"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Access denied",
				"code":      "FORBIDDEN",
				"details":   []string{"Only the list owner can delete this list"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":     "Failed to delete list",
			"code":      "INTERNAL_ERROR",
			"details":   []string{err.Error()},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}
	log.Printf("delete_list success user_id=%d list_id=%d", userID, listID)
	ctx.Status(http.StatusNoContent)
}

func (c *ListController) leave(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	log.Printf("leave_list attempt user_id=%d list_id=%d", userID, listID)
	if err := c.service.LeaveList(listID, userID); err != nil {
		if errors.Is(err, services.ErrListNotFound) {
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "List not found",
				"code":      "NOT_FOUND",
				"details":   []string{"The specified list does not exist"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		if errors.Is(err, services.ErrNotAMember) {
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Not a member",
				"code":      "FORBIDDEN",
				"details":   []string{"You are not a member of this list"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		if errors.Is(err, services.ErrOwnerCannotLeave) {
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Owner cannot leave",
				"code":      "FORBIDDEN",
				"details":   []string{"The owner cannot leave the list. Delete the list instead."},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":     "Failed to leave list",
			"code":      "INTERNAL_ERROR",
			"details":   []string{err.Error()},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}
	log.Printf("leave_list success user_id=%d list_id=%d", userID, listID)
	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Successfully left the list",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (c *ListController) addMovie(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}
	var req addMovieRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}
	req.MediaType = strings.ToLower(strings.TrimSpace(req.MediaType))
	if req.ID == "" || (req.MediaType != "movie" && req.MediaType != "tv") {
		respondValidationError(ctx, []string{"ID and media_type are required; media_type must be 'movie' or 'tv'"})
		return
	}
	mediaID, err := strconv.ParseInt(strings.TrimSpace(req.ID), 10, 64)
	if err != nil || mediaID <= 0 {
		respondValidationError(ctx, []string{"Invalid TMDB id"})
		return
	}
	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}
	lm, movie, svcErr := c.service.AddMediaToList(ctx, listID, userID, mediaID, req.MediaType)
	if svcErr != nil {
		switch svcErr {
		case services.ErrInvalidMediaType:
			respondValidationError(ctx, []string{"media_type must be 'movie' or 'tv'"})
			return
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{"error": "List not found", "code": "NOT_FOUND", "details": []string{"The specified list does not exist"}, "timestamp": time.Now().UTC().Format(time.RFC3339)})
			return
		case services.ErrListMovieAlreadyExists:
			ctx.Header("Cache-Control", "no-store")
			msg := "Este título já está presente nesta lista"
			if req.MediaType == "movie" {
				msg = "Este filme já está presente nesta lista"
			} else if req.MediaType == "tv" {
				msg = "Esta série já está presente nesta lista"
			}
			ctx.JSON(http.StatusConflict, gin.H{"error": msg, "code": "CONFLICT", "details": []string{}, "timestamp": time.Now().UTC().Format(time.RFC3339)})
			return
		case services.ErrMediaNotFound:
			ctx.Header("Cache-Control", "no-store")
			msg := "Mídia não encontrada na base do TMDB"
			if req.MediaType == "movie" {
				msg = "Filme não encontrado na base do TMDB"
			} else if req.MediaType == "tv" {
				msg = "Série não encontrada na base do TMDB"
			}
			ctx.JSON(http.StatusNotFound, gin.H{"error": msg, "code": "NOT_FOUND", "details": []string{}, "timestamp": time.Now().UTC().Format(time.RFC3339)})
			return
		default:
			if svcErr == services.ErrTMDBUnavailable {
				ctx.Header("Cache-Control", "no-store")
				ctx.JSON(http.StatusBadGateway, gin.H{"error": "Erro na consulta externa", "code": "BAD_GATEWAY", "details": []string{svcErr.Error()}, "timestamp": time.Now().UTC().Format(time.RFC3339)})
				return
			}
			if errors.Is(svcErr, gorm.ErrRecordNotFound) {
				ctx.Header("Cache-Control", "no-store")
				ctx.JSON(http.StatusNotFound, gin.H{"error": "List not found", "code": "NOT_FOUND", "details": []string{"The specified list does not exist"}, "timestamp": time.Now().UTC().Format(time.RFC3339)})
				return
			}
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add media", "code": "INTERNAL_ERROR", "details": []string{svcErr.Error()}, "timestamp": time.Now().UTC().Format(time.RFC3339)})
			return
		}
	}
	posterURL := (*string)(nil)
	if movie.PosterPath != nil && *movie.PosterPath != "" {
		u := "https://image.tmdb.org/t/p/w500" + *movie.PosterPath
		posterURL = &u
	}
	addedBy := gin.H{"id": userID}
	ctx.Header("Cache-Control", "no-store")
	payload := gin.H{
		"id":             movie.ID,
		"title":          movie.Title,
		"original_title": movie.OriginalTitle,
		"media_type":     movie.MediaType,
		"poster_url":     posterURL,
		"release_date":   movie.ReleaseDate,
		"status":         lm.Status,
		"added_at":       lm.AddedAt,
		"added_by":       addedBy,
	}
	msg := "Filme adicionado à lista com sucesso"
	if movie.MediaType == "tv" {
		payload["seasons_count"] = movie.SeasonsCount
		payload["episodes_count"] = movie.EpisodesCount
		payload["series_status"] = movie.SeriesStatus
		msg = "Série adicionada à lista com sucesso"
	}
	ctx.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": msg,
		"data":    payload,
	})
}

func (c *ListController) removeMovie(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	movieIdParam := ctx.Param("movieId")
	movieID, err := strconv.ParseInt(movieIdParam, 10, 64)
	if err != nil || movieID <= 0 {
		respondValidationError(ctx, []string{"Invalid movie id"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	movie, err := c.service.RemoveMovieFromList(listID, userID, movieID)
	if err != nil {
		switch err {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"success":   false,
				"error":     "Lista não encontrada",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"success":   false,
				"error":     "Você não tem permissão para remover filmes desta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrMovieNotInList:
			ctx.Header("Cache-Control", "no-store")
			errorMsg := "Filme não encontrado nesta lista"
			ctx.JSON(http.StatusNotFound, gin.H{
				"success":   false,
				"error":     errorMsg,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"success":   false,
				"error":     "Failed to remove movie",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	message := "Filme removido da lista com sucesso"
	if movie.MediaType == "tv" {
		message = "Série removida da lista com sucesso"
	}

	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"list_id":    listID,
			"movie_id":   movieID,
			"removed_at": time.Now().UTC().Format(time.RFC3339),
		},
	})
}

func (c *ListController) updateMovie(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	movieIdParam := ctx.Param("movieId")
	movieID, err := strconv.ParseInt(movieIdParam, 10, 64)
	if err != nil || movieID <= 0 {
		respondValidationError(ctx, []string{"Invalid movie id"})
		return
	}

	var req updateMovieRequest
	body, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}
	if len(body) == 0 {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}
	if err := json.Unmarshal(body, &req); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}
	ratingProvided := false
	if _, ok := raw["rating"]; ok {
		ratingProvided = true
	}

	if req.Status == nil && !ratingProvided {
		respondValidationError(ctx, []string{"Pelo menos um campo deve ser fornecido: status ou rating"})
		return
	}

	// Validate status if provided
	var status *models.MovieStatus
	if req.Status != nil {
		if *req.Status == "" {
			respondValidationError(ctx, []string{"Status não pode ser vazio"})
			return
		}
		statusValue := models.MovieStatus(*req.Status)
		if statusValue != models.StatusNotWatched && statusValue != models.StatusWatching &&
			statusValue != models.StatusWatched && statusValue != models.StatusDropped {
			respondValidationError(ctx, []string{"Status deve ser: not_watched, watching, watched ou dropped"})
			return
		}
		status = &statusValue
	}

	// Validate rating if provided
	if ratingProvided && req.Rating != nil {
		if *req.Rating < 1 || *req.Rating > 10 {
			respondValidationError(ctx, []string{"Rating deve estar entre 1 e 10"})
			return
		}
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	updatedListMovie, movie, oldStatus, oldEntry, newEntry, averageRating, err := c.service.UpdateMovie(listID, userID, movieID, status, req.Rating, ratingProvided)
	if err != nil {
		switch err {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"success":   false,
				"error":     "Lista não encontrada",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"success":   false,
				"error":     "Você não tem permissão para modificar filmes desta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrMovieNotInList:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"success":   false,
				"error":     "Filme não encontrado nesta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"success":   false,
				"error":     "Failed to update movie status",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	message := "Filme atualizado com sucesso"
	if movie.MediaType == "tv" {
		message = "Série atualizada com sucesso"
	}

	buildEntryPayload := func(entry *models.ListMovieUserData) gin.H {
		if entry == nil {
			return nil
		}
		payload := gin.H{
			"user_id":    entry.UserID,
			"rating":     entry.Rating,
			"created_at": entry.CreatedAt,
			"updated_at": entry.UpdatedAt,
		}
		if entry.User.ID != 0 {
			payload["user"] = gin.H{
				"id":       entry.User.ID,
				"username": entry.User.Username,
				"email":    entry.User.Email,
			}
		}
		return payload
	}

	var oldRating *int
	if oldEntry != nil {
		oldRating = oldEntry.Rating
	}

	var newRating *int
	if newEntry != nil {
		newRating = newEntry.Rating
	}

	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"list_id":    listID,
			"movie_id":   movieID,
			"title":      movie.Title,
			"media_type": movie.MediaType,
			"old_status": oldStatus,
			"new_status": updatedListMovie.Status,
			"old_rating": oldRating,
			"new_rating": newRating,
			"old_entry":  buildEntryPayload(oldEntry),
			"new_entry":  buildEntryPayload(newEntry),
			"average_rating": func() *float64 {
				if averageRating == nil {
					return nil
				}
				return averageRating
			}(),
			"your_entry": buildEntryPayload(newEntry),
			"watched_at": updatedListMovie.WatchedAt,
			"updated_at": updatedListMovie.UpdatedAt.Format(time.RFC3339),
		},
	})
}

func (c *ListController) reorderMovies(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	var req reorderMoviesRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}

	if len(req.MovieOrders) == 0 {
		respondValidationError(ctx, []string{"movie_orders array cannot be empty"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	// Convert to map for service layer
	orderMap := make(map[int64]int, len(req.MovieOrders))
	for _, item := range req.MovieOrders {
		orderMap[item.MovieID] = item.DisplayOrder
	}

	if err := c.service.ReorderMovies(listID, userID, orderMap); err != nil {
		switch err {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"success":   false,
				"error":     "Lista não encontrada",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"success":   false,
				"error":     "Você não tem permissão para reordenar filmes desta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"success":   false,
				"error":     "Failed to reorder movies",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Ordem dos filmes atualizada com sucesso",
	})
}

// getWatchProvidersForMovie busca watch providers do cache ou da API do TMDB
func (c *ListController) getWatchProvidersForMovie(ctx *gin.Context, movieID int64, mediaType string, region string) map[string]interface{} {
	// Tentar buscar do cache primeiro
	cached, err := c.watchProviderDAO.GetCachedProviders(movieID, mediaType, region)

	// Se encontrou no cache e não expirou, retornar os dados do cache
	if err == nil && !c.watchProviderDAO.IsCacheExpired(cached) {
		var data map[string]interface{}
		if jsonErr := json.Unmarshal([]byte(cached.Data), &data); jsonErr == nil {
			return data
		}
	}

	// Cache não existe ou expirou, buscar da API do TMDB
	response, apiErr := c.watchProviderService.GetWatchProviders(ctx, movieID, mediaType, region)
	if apiErr != nil {
		// Se houver erro na API mas temos cache (mesmo expirado), usar o cache
		if cached != nil {
			var data map[string]interface{}
			if jsonErr := json.Unmarshal([]byte(cached.Data), &data); jsonErr == nil {
				return data
			}
		}
		return nil
	}

	// Extrair dados da região específica
	regionData, exists := response.Results[region]
	if !exists {
		return nil
	}

	// Converter para map para salvar e retornar
	data := map[string]interface{}{
		"link": regionData.Link,
	}

	if len(regionData.Flatrate) > 0 {
		flatrate := make([]map[string]interface{}, len(regionData.Flatrate))
		for i, p := range regionData.Flatrate {
			flatrate[i] = map[string]interface{}{
				"logo_path":        p.LogoPath,
				"provider_id":      p.ProviderID,
				"provider_name":    p.ProviderName,
				"display_priority": p.DisplayPriority,
			}
		}
		data["flatrate"] = flatrate
	}

	if len(regionData.Rent) > 0 {
		rent := make([]map[string]interface{}, len(regionData.Rent))
		for i, p := range regionData.Rent {
			rent[i] = map[string]interface{}{
				"logo_path":        p.LogoPath,
				"provider_id":      p.ProviderID,
				"provider_name":    p.ProviderName,
				"display_priority": p.DisplayPriority,
			}
		}
		data["rent"] = rent
	}

	if len(regionData.Buy) > 0 {
		buy := make([]map[string]interface{}, len(regionData.Buy))
		for i, p := range regionData.Buy {
			buy[i] = map[string]interface{}{
				"logo_path":        p.LogoPath,
				"provider_id":      p.ProviderID,
				"provider_name":    p.ProviderName,
				"display_priority": p.DisplayPriority,
			}
		}
		data["buy"] = buy
	}

	// Salvar no cache (não bloqueia se falhar)
	go func() {
		_ = c.watchProviderDAO.UpsertProviders(movieID, mediaType, region, data)
	}()

	return data
}

func (c *ListController) listMovies(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	// Optional status filter
	var statusFilter *models.MovieStatus
	if v := strings.TrimSpace(ctx.Query("status")); v != "" {
		status := models.MovieStatus(v)
		if status != models.StatusNotWatched && status != models.StatusWatching && status != models.StatusWatched && status != models.StatusDropped {
			respondValidationError(ctx, []string{"status must be one of: not_watched, watching, watched, dropped"})
			return
		}
		statusFilter = &status
	}

	items, svcErr := c.service.ListMovies(listID, userID, statusFilter)
	if svcErr != nil {
		switch svcErr {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "List not found",
				"code":      "NOT_FOUND",
				"details":   []string{"The specified list does not exist"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Access denied",
				"code":      "FORBIDDEN",
				"details":   []string{"You are not a member of this list"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error":     "Failed to fetch list movies",
				"code":      "INTERNAL_ERROR",
				"details":   []string{svcErr.Error()},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	resp := make([]gin.H, 0, len(items))
	for _, lm := range items {
		movie := lm.Movie
		posterURL := (*string)(nil)
		if movie.PosterPath != nil && *movie.PosterPath != "" {
			u := "https://image.tmdb.org/t/p/w500" + *movie.PosterPath
			posterURL = &u
		}
		m := gin.H{
			"id":             movie.ID,
			"title":          movie.Title,
			"original_title": movie.OriginalTitle,
			"original_lang":  movie.OriginalLang,
			"overview":       movie.Overview,
			"release_date":   movie.ReleaseDate,
			"poster_url":     posterURL,
			"media_type":     movie.MediaType,
			"seasons_count":  movie.SeasonsCount,
			"episodes_count": movie.EpisodesCount,
			"series_status":  movie.SeriesStatus,
		}
		if len(movie.Genres) > 0 {
			genres := make([]gin.H, 0, len(movie.Genres))
			for _, g := range movie.Genres {
				genres = append(genres, gin.H{"id": g.ID, "name": g.Name})
			}
			m["genres"] = genres
		}

		var (
			sumRatings   int
			countRatings int
			yourEntry    *models.ListMovieUserData
			userEntries  = make([]gin.H, 0, len(lm.UserEntries))
		)

		for _, entry := range lm.UserEntries {
			if entry.Rating != nil {
				sumRatings += *entry.Rating
				countRatings++
			}

			entryPayload := gin.H{
				"user_id":    entry.UserID,
				"rating":     entry.Rating,
				"notes":      entry.Notes,
				"created_at": entry.CreatedAt,
				"updated_at": entry.UpdatedAt,
			}
			if entry.User.ID != 0 {
				entryPayload["user"] = gin.H{
					"id":         entry.User.ID,
					"username":   entry.User.Username,
					"email":      entry.User.Email,
					"avatar_url": entry.User.AvatarURL,
				}
			}
			userEntries = append(userEntries, entryPayload)

			if entry.UserID == userID {
				copyEntry := entry
				yourEntry = &copyEntry
			}
		}

		var averageRating *float64
		if countRatings > 0 {
			avg := float64(sumRatings) / float64(countRatings)
			averageRating = &avg
		}

		var yourEntryPayload gin.H
		if yourEntry != nil {
			yourEntryPayload = gin.H{
				"user_id":    yourEntry.UserID,
				"rating":     yourEntry.Rating,
				"notes":      yourEntry.Notes,
				"created_at": yourEntry.CreatedAt,
				"updated_at": yourEntry.UpdatedAt,
			}
			if yourEntry.User.ID != 0 {
				yourEntryPayload["user"] = gin.H{
					"id":         yourEntry.User.ID,
					"username":   yourEntry.User.Username,
					"email":      yourEntry.User.Email,
					"avatar_url": yourEntry.User.AvatarURL,
				}
			}
		}

		var ratingCompat *int
		var notesCompat *string
		if yourEntry != nil {
			ratingCompat = yourEntry.Rating
			notesCompat = yourEntry.Notes
		}

		var addedByUserPayload gin.H
		if lm.AddedByUser != nil && lm.AddedByUser.ID != 0 {
			addedByUserPayload = gin.H{
				"id":         lm.AddedByUser.ID,
				"username":   lm.AddedByUser.Username,
				"email":      lm.AddedByUser.Email,
				"avatar_url": lm.AddedByUser.AvatarURL,
			}
		}

		item := gin.H{
			"id":             lm.ID,
			"list_id":        lm.ListID,
			"movie_id":       lm.MovieID,
			"status":         lm.Status,
			"added_by":       lm.AddedBy,
			"added_by_user":  addedByUserPayload,
			"added_at":       lm.AddedAt,
			"watched_at":     lm.WatchedAt,
			"updated_at":     lm.UpdatedAt,
			"display_order":  lm.DisplayOrder,
			"rating":         ratingCompat,
			"notes":          notesCompat,
			"average_rating": averageRating,
			"your_entry":     yourEntryPayload,
			"user_entries":   userEntries,
			"movie":          m,
		}
		resp = append(resp, item)
	}

	// Buscar watch providers para todos os filmes em paralelo
	var wg sync.WaitGroup
	type watchProviderResult struct {
		index int
		data  map[string]interface{}
	}
	results := make(chan watchProviderResult, len(resp))

	for i, item := range resp {
		wg.Add(1)
		go func(idx int, movieItem gin.H) {
			defer wg.Done()
			movieData := movieItem["movie"].(gin.H)
			movieID := movieData["id"].(int64)
			mediaType, _ := movieData["media_type"].(string)
			if mediaType == "" {
				mediaType = "movie" // default to movie if not specified
			}
			providers := c.getWatchProvidersForMovie(ctx, movieID, mediaType, "BR")
			results <- watchProviderResult{index: idx, data: providers}
		}(i, item)
	}

	// Fechar canal quando todas as goroutines terminarem
	go func() {
		wg.Wait()
		close(results)
	}()

	// Coletar resultados e adicionar aos filmes
	for result := range results {
		if result.data != nil {
			movieData := resp[result.index]["movie"].(gin.H)
			movieData["watch_providers"] = result.data
		}
	}

	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"movies": resp,
		"count":  len(resp),
	})
}

func (c *ListController) searchMovies(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	q := strings.TrimSpace(ctx.Query("q"))
	if len(q) < 2 {
		ctx.Header("Cache-Control", "no-store")
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error":     "Invalid query parameter",
			"code":      "VALIDATION_ERROR",
			"details":   []string{"Query must be at least 2 characters"},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	limit := 50
	offset := 0
	if v := ctx.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			if n < 1 {
				n = 1
			}
			if n > 100 {
				n = 100
			}
			limit = n
		}
	}
	if v := ctx.Query("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	items, total, svcErr := c.service.SearchListMovies(listID, userID, q, limit, offset)
	if svcErr != nil {
		switch svcErr {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "List not found",
				"code":      "NOT_FOUND",
				"details":   []string{"The specified list does not exist"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Access denied",
				"code":      "FORBIDDEN",
				"details":   []string{"You are not a member of this list"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error":     "Failed to search list movies",
				"code":      "INTERNAL_ERROR",
				"details":   []string{svcErr.Error()},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	resp := make([]gin.H, 0, len(items))
	for _, lm := range items {
		movie := lm.Movie
		posterURL := (*string)(nil)
		if movie.PosterPath != nil && *movie.PosterPath != "" {
			u := "https://image.tmdb.org/t/p/w500" + *movie.PosterPath
			posterURL = &u
		}
		m := gin.H{
			"id":             movie.ID,
			"title":          movie.Title,
			"original_title": movie.OriginalTitle,
			"original_lang":  movie.OriginalLang,
			"overview":       movie.Overview,
			"release_date":   movie.ReleaseDate,
			"poster_url":     posterURL,
			"media_type":     movie.MediaType,
			"seasons_count":  movie.SeasonsCount,
			"episodes_count": movie.EpisodesCount,
			"series_status":  movie.SeriesStatus,
		}
		if len(movie.Genres) > 0 {
			genres := make([]gin.H, 0, len(movie.Genres))
			for _, g := range movie.Genres {
				genres = append(genres, gin.H{"id": g.ID, "name": g.Name})
			}
			m["genres"] = genres
		}

		var (
			sumRatings   int
			countRatings int
			yourEntry    *models.ListMovieUserData
			userEntries  = make([]gin.H, 0, len(lm.UserEntries))
		)

		for _, entry := range lm.UserEntries {
			if entry.Rating != nil {
				sumRatings += *entry.Rating
				countRatings++
			}
			entryPayload := gin.H{
				"user_id":    entry.UserID,
				"rating":     entry.Rating,
				"created_at": entry.CreatedAt,
				"updated_at": entry.UpdatedAt,
			}
			if entry.User.ID != 0 {
				entryPayload["user"] = gin.H{
					"id":         entry.User.ID,
					"username":   entry.User.Username,
					"email":      entry.User.Email,
					"avatar_url": entry.User.AvatarURL,
				}
			}
			userEntries = append(userEntries, entryPayload)
			if entry.UserID == userID {
				copyEntry := entry
				yourEntry = &copyEntry
			}
		}

		var averageRating *float64
		if countRatings > 0 {
			avg := float64(sumRatings) / float64(countRatings)
			averageRating = &avg
		}

		var yourEntryPayload gin.H
		if yourEntry != nil {
			yourEntryPayload = gin.H{
				"user_id":    yourEntry.UserID,
				"rating":     yourEntry.Rating,
				"created_at": yourEntry.CreatedAt,
				"updated_at": yourEntry.UpdatedAt,
			}
			if yourEntry.User.ID != 0 {
				yourEntryPayload["user"] = gin.H{
					"id":         yourEntry.User.ID,
					"username":   yourEntry.User.Username,
					"email":      yourEntry.User.Email,
					"avatar_url": yourEntry.User.AvatarURL,
				}
			}
		}

		var ratingCompat *int
		if yourEntry != nil {
			ratingCompat = yourEntry.Rating
		}

		var addedByUserPayload gin.H
		if lm.AddedByUser != nil && lm.AddedByUser.ID != 0 {
			addedByUserPayload = gin.H{
				"id":         lm.AddedByUser.ID,
				"username":   lm.AddedByUser.Username,
				"email":      lm.AddedByUser.Email,
				"avatar_url": lm.AddedByUser.AvatarURL,
			}
		}

		item := gin.H{
			"id":             lm.ID,
			"list_id":        lm.ListID,
			"movie_id":       lm.MovieID,
			"status":         lm.Status,
			"added_by":       lm.AddedBy,
			"added_by_user":  addedByUserPayload,
			"added_at":       lm.AddedAt,
			"watched_at":     lm.WatchedAt,
			"updated_at":     lm.UpdatedAt,
			"display_order":  lm.DisplayOrder,
			"rating":         ratingCompat,
			"average_rating": averageRating,
			"your_entry":     yourEntryPayload,
			"user_entries":   userEntries,
			"movie":          m,
		}
		resp = append(resp, item)
	}

	hasMore := offset+len(resp) < int(total)
	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"movies": resp,
		"count":  len(resp),
		"pagination": gin.H{
			"total":    total,
			"limit":    limit,
			"offset":   offset,
			"has_more": hasMore,
		},
	})
}

func (c *ListController) listComments(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	movieIdParam := ctx.Param("movieId")
	movieID, err := strconv.ParseInt(movieIdParam, 10, 64)
	if err != nil || movieID <= 0 {
		respondValidationError(ctx, []string{"Invalid movie id"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	limit := 50
	offset := 0
	if v := ctx.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			if n > 100 {
				n = 100
			}
			limit = n
		}
	}
	if v := ctx.Query("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	comments, total, err := c.service.GetComments(listID, userID, movieID, limit, offset)
	if err != nil {
		switch err {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Lista não encontrada",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Você não tem permissão para acessar esta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrMovieNotInList:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Filme não encontrado nesta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error":     "Falha ao buscar comentários",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	commentsPayload := make([]gin.H, 0, len(comments))
	for _, comment := range comments {
		payload := gin.H{
			"id":         comment.ID,
			"user_id":    comment.UserID,
			"content":    comment.Content,
			"created_at": comment.CreatedAt,
			"updated_at": comment.UpdatedAt,
		}
		if comment.User.ID != 0 {
			payload["user"] = gin.H{
				"id":         comment.User.ID,
				"username":   comment.User.Username,
				"email":      comment.User.Email,
				"avatar_url": comment.User.AvatarURL,
			}
		}
		commentsPayload = append(commentsPayload, payload)
	}

	hasMore := offset+len(comments) < int(total)
	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"comments": commentsPayload,
		"pagination": gin.H{
			"total":    total,
			"limit":    limit,
			"offset":   offset,
			"has_more": hasMore,
		},
	})
}

func (c *ListController) createComment(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	movieIdParam := ctx.Param("movieId")
	movieID, err := strconv.ParseInt(movieIdParam, 10, 64)
	if err != nil || movieID <= 0 {
		respondValidationError(ctx, []string{"Invalid movie id"})
		return
	}

	var req createCommentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	comment, err := c.service.CreateComment(listID, userID, movieID, req.Content)
	if err != nil {
		switch err {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Lista não encontrada",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Você não tem permissão para comentar nesta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrMovieNotInList:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Filme não encontrado nesta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrCommentEmpty:
			respondValidationError(ctx, []string{"O comentário não pode ser vazio"})
			return
		case services.ErrCommentTooLong:
			respondValidationError(ctx, []string{"O comentário não pode ter mais de 2000 caracteres"})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error":     "Falha ao criar comentário",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	payload := gin.H{
		"id":         comment.ID,
		"user_id":    comment.UserID,
		"content":    comment.Content,
		"created_at": comment.CreatedAt,
		"updated_at": comment.UpdatedAt,
	}
	if comment.User.ID != 0 {
		payload["user"] = gin.H{
			"id":         comment.User.ID,
			"username":   comment.User.Username,
			"email":      comment.User.Email,
			"avatar_url": comment.User.AvatarURL,
		}
	}

	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Comentário criado com sucesso",
		"comment": payload,
	})
}

func (c *ListController) updateComment(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	commentIdParam := ctx.Param("commentId")
	commentID, err := strconv.ParseInt(commentIdParam, 10, 64)
	if err != nil || commentID <= 0 {
		respondValidationError(ctx, []string{"Invalid comment id"})
		return
	}

	var req updateCommentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	comment, err := c.service.UpdateComment(listID, userID, commentID, req.Content)
	if err != nil {
		switch err {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Lista não encontrada",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Você não tem permissão para editar comentários nesta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrCommentNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Comentário não encontrado",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrCommentNotOwned:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Você só pode editar seus próprios comentários",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrCommentEmpty:
			respondValidationError(ctx, []string{"O comentário não pode ser vazio"})
			return
		case services.ErrCommentTooLong:
			respondValidationError(ctx, []string{"O comentário não pode ter mais de 2000 caracteres"})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error":     "Falha ao atualizar comentário",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	payload := gin.H{
		"id":         comment.ID,
		"user_id":    comment.UserID,
		"content":    comment.Content,
		"created_at": comment.CreatedAt,
		"updated_at": comment.UpdatedAt,
	}
	if comment.User.ID != 0 {
		payload["user"] = gin.H{
			"id":         comment.User.ID,
			"username":   comment.User.Username,
			"email":      comment.User.Email,
			"avatar_url": comment.User.AvatarURL,
		}
	}

	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Comentário atualizado com sucesso",
		"comment": payload,
	})
}

func (c *ListController) deleteComment(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	commentIdParam := ctx.Param("commentId")
	commentID, err := strconv.ParseInt(commentIdParam, 10, 64)
	if err != nil || commentID <= 0 {
		respondValidationError(ctx, []string{"Invalid comment id"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	err = c.service.DeleteComment(listID, userID, commentID)
	if err != nil {
		switch err {
		case services.ErrListNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Lista não encontrada",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembership:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Você não tem permissão para excluir comentários nesta lista",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrCommentNotFound:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Comentário não encontrado",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrCommentNotOwned:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Você só pode excluir seus próprios comentários",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error":     "Falha ao excluir comentário",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	ctx.Header("Cache-Control", "no-store")
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Comentário excluído com sucesso",
	})
}

func (c *ListController) getRecommendations(ctx *gin.Context) {
	idParam := ctx.Param("id")
	listID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || listID <= 0 {
		respondValidationError(ctx, []string{"Invalid list id"})
		return
	}

	rawClaims, _ := ctx.Get("auth_claims")
	claims := rawClaims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		respondTokenInvalid(ctx)
		return
	}

	// Get limit from query params
	limit := 15
	if v := ctx.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			if n > 50 {
				n = 50
			}
			limit = n
		}
	}

	recommendations, err := c.recommendationService.GetListRecommendations(ctx, listID, userID, limit)
	if err != nil {
		switch err {
		case services.ErrListNotFoundRec:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusNotFound, gin.H{
				"error":     "Lista não encontrada",
				"code":      "NOT_FOUND",
				"details":   []string{"A lista especificada não existe"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrForbiddenMembershipRec:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":     "Acesso negado",
				"code":      "FORBIDDEN",
				"details":   []string{"Você não é membro desta lista"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		case services.ErrInsufficientMovies:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusBadRequest, gin.H{
				"error":     "Filmes insuficientes",
				"code":      "INSUFFICIENT_MOVIES",
				"details":   []string{"A lista deve ter pelo menos 2 filmes para gerar recomendações"},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		default:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error":     "Falha ao buscar recomendações",
				"code":      "INTERNAL_ERROR",
				"details":   []string{err.Error()},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}
	}

	// Build response
	resp := make([]gin.H, 0, len(recommendations))
	for _, rec := range recommendations {
		item := gin.H{
			"id":         rec.ID,
			"title":      rec.Title,
			"media_type": rec.MediaType,
			"poster_url": rec.PosterURL,
			"overview":   rec.Overview,
			"score":      rec.Score,
			"popularity": rec.Popularity,
		}

		if len(rec.Genres) > 0 {
			genres := make([]gin.H, 0, len(rec.Genres))
			for _, g := range rec.Genres {
				genres = append(genres, gin.H{"id": g.ID})
			}
			item["genres"] = genres
		}

		resp = append(resp, item)
	}

	ctx.Header("Cache-Control", "private, max-age=86400") // Cache for 24 hours
	ctx.JSON(http.StatusOK, gin.H{
		"recommendations": resp,
		"count":           len(resp),
		"generated_at":    time.Now().UTC().Format(time.RFC3339),
	})
}
