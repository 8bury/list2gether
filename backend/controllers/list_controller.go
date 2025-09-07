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

type ListController struct {
	service        services.ListService
	authMiddleware *middleware.AuthMiddleware
}

func NewListController(router *gin.Engine, service services.ListService, authMiddleware *middleware.AuthMiddleware) *ListController {
	c := &ListController{service: service, authMiddleware: authMiddleware}
	group := router.Group("/api/lists")
	group.POST("", c.authMiddleware.Handler(), c.create)
	return c
}

type createListRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
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
