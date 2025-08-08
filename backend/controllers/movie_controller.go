package controllers

import (
	"net/http"

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
	group := router.Group("/movies")

	group.GET("/:imdbid", controller.GetMovieByIMDBId)
	return controller
}

func (c *MovieController) GetMovieByIMDBId(ctx *gin.Context) {
	imdbId := ctx.Param("imdbid")

	if imdbId == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "IMDB ID is required"})
		return
	}
	
	movie, err := c.MovieService.GetMovieByIMDBId(imdbId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve movie"})
		return
	}
	if movie == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
		return
	}
	ctx.JSON(http.StatusOK, movie)
}