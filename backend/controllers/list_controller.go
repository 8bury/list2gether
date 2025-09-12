package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"errors"
	"log"
	"sync"

	"github.com/8bury/list2gether/middleware"
	"github.com/8bury/list2gether/models"
	"github.com/8bury/list2gether/services"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type ListController struct {
	service        services.ListService
	authMiddleware *middleware.AuthMiddleware
}

func NewListController(router *gin.Engine, service services.ListService, authMiddleware *middleware.AuthMiddleware) *ListController {
	c := &ListController{service: service, authMiddleware: authMiddleware}
	group := router.Group("/api/lists")
	group.POST("", c.authMiddleware.Handler(), c.create)
	group.GET("", c.authMiddleware.Handler(), c.list)
	group.POST("/join", c.authMiddleware.Handler(), c.join)
	group.DELETE("/:id", c.authMiddleware.Handler(), c.delete)
	group.POST("/:id/movies", c.authMiddleware.Handler(), c.addMovie)
	group.GET("/:id/movies", c.authMiddleware.Handler(), c.listMovies)
	group.DELETE("/:id/movies/:movieId", c.authMiddleware.Handler(), c.removeMovie)
	group.PATCH("/:id/movies/:movieId", c.authMiddleware.Handler(), c.updateMovie)
	group.GET("/:id/movies/search", c.authMiddleware.Handler(), c.searchMovies)
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
	Notes  *string `json:"notes"`
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
		case services.ErrCannotRemoveOthersMovie:
			ctx.Header("Cache-Control", "no-store")
			ctx.JSON(http.StatusForbidden, gin.H{
				"success":   false,
				"error":     "Você só pode remover filmes que você mesmo adicionou",
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
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondValidationError(ctx, []string{"Invalid request body"})
		return
	}

	// Validate that at least one field is provided
	if req.Status == nil && req.Rating == nil && req.Notes == nil {
		respondValidationError(ctx, []string{"Pelo menos um campo deve ser fornecido: status, rating ou notes"})
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
	if req.Rating != nil {
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

	updatedListMovie, movie, oldStatus, oldRating, oldNotes, err := c.service.UpdateMovie(listID, userID, movieID, status, req.Rating, req.Notes)
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
			"new_rating": updatedListMovie.Rating,
			"old_notes":  oldNotes,
			"new_notes":  updatedListMovie.Notes,
			"watched_at": updatedListMovie.WatchedAt,
			"updated_at": updatedListMovie.UpdatedAt.Format(time.RFC3339),
		},
	})
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

	items, svcErr := c.service.ListMovies(listID, userID)
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

		item := gin.H{
			"id":         lm.ID,
			"list_id":    lm.ListID,
			"movie_id":   lm.MovieID,
			"status":     lm.Status,
			"added_by":   lm.AddedBy,
			"added_at":   lm.AddedAt,
			"watched_at": lm.WatchedAt,
			"updated_at": lm.UpdatedAt,
			"rating":     lm.Rating,
			"notes":      lm.Notes,
			"movie":      m,
		}
		resp = append(resp, item)
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

		item := gin.H{
			"id":         lm.ID,
			"list_id":    lm.ListID,
			"movie_id":   lm.MovieID,
			"status":     lm.Status,
			"added_by":   lm.AddedBy,
			"added_at":   lm.AddedAt,
			"watched_at": lm.WatchedAt,
			"updated_at": lm.UpdatedAt,
			"rating":     lm.Rating,
			"notes":      lm.Notes,
			"movie":      m,
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
