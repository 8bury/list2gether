package controllers

import (
	"net/http"
	"strconv"
	"time"

	"errors"

	"github.com/8bury/list2gether/middleware"
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
	group.POST("/join", c.authMiddleware.Handler(), c.join)
	return c
}

type createListRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type joinListRequest struct {
	InviteCode string `json:"invite_code"`
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
