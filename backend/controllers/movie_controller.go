package controllers

import (
	"github.com/8bury/list2gether/services"
	"github.com/gin-gonic/gin"
)

type MovieController struct {
	MovieService *services.MovieService
}

func NewMovieController(router *gin.Engine, movieService *services.MovieService) *MovieController {
	controller := &MovieController{
		MovieService: movieService,
	}
	// group := router.Group("/movies")
	return controller
}