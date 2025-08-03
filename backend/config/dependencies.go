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
	ImdbService     *services.ImdbService
	ImdbDAO         *daos.ImdbDAO
)

func InitializeDependencies(router *gin.Engine) {
	db := connectDatabase()
	initializeDaos(db)
	initializeServices()
	initializeControllers(router)
}

func initializeDaos(db *gorm.DB) {
	ImdbDAO = daos.NewImdbDAO(db)
	MovieDAO = daos.NewMovieDAO(db)
}

func initializeServices() {
	ImdbService = services.NewImdbService(ImdbDAO)
	MovieService = services.NewMovieService(MovieDAO, ImdbService)
}

func initializeControllers(router *gin.Engine) {
	MovieController = controllers.NewMovieController(router, MovieService)
}