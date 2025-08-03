package config

import (
	"github.com/8bury/list2gether/controllers"
	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/services"
	"gorm.io/gorm"
	"github.com/gin-gonic/gin"
)

var (
	MovieController *controllers.MovieController
	MovieService    *services.MovieService
	MovieDAO        *daos.MovieDAO
)

func InitializeDependencies(router *gin.Engine) {
	db := connectDatabase()
	initializeDaos(db)
	initializeServices()
	initializeControllers(router)
}

func initializeDaos(db *gorm.DB) {
	MovieDAO = daos.NewMovieDAO(db)
}

func initializeServices() {
	MovieService = services.NewMovieService(MovieDAO)
}

func initializeControllers(router *gin.Engine) {
	MovieController = controllers.NewMovieController(router, MovieService)
}