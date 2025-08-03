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
	group := router.Group("/movies")

	group.GET("/:imdbid", controller.GetMovieByIMDBId)
	return controller
}

func (c *MovieController) GetMovieByIMDBId(ctx *gin.Context) {
	imdbId := ctx.Param("imdbid")
	movie, err := c.MovieService.GetMovieByIMDBId(imdbId)
	if err != nil {
		ctx.JSON(500, gin.H{"error": "Failed to retrieve movie"})
		return
	}
	if movie == nil {
		ctx.JSON(404, gin.H{"error": "Movie not found"})
		return
	}
	ctx.JSON(http.StatusOK, movie)
}