package config

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var ()

func InitializeDependencies(router *gin.Engine) {
	db := connectDatabase()
	initializeDaos(db)
	initializeServices()
	initializeControllers(router)
}

func initializeDaos(db *gorm.DB) {
	//ImdbDAO = daos.NewImdbDAO(db)
	//MovieDAO = daos.NewMovieDAO(db)
}

func initializeServices() {
	//ImdbService = services.NewImdbService(ImdbDAO)
	//MovieService = services.NewMovieService(MovieDAO, ImdbService)
}

func initializeControllers(router *gin.Engine) {
	//MovieController = controllers.NewMovieController(router, MovieService)
}
