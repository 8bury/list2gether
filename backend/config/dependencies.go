package config

import (
	"os"

	"github.com/8bury/list2gether/controllers"
	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/middleware"
	"github.com/8bury/list2gether/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var (
	userDAO         daos.UserDAO
	refreshTokenDAO daos.RefreshTokenDAO
	movieListDAO    daos.MovieListDAO
	movieDAO        daos.MovieDAO
	authService     services.AuthService
	listService     services.ListService
	searchService   services.SearchService
	authMiddleware  *middleware.AuthMiddleware
)

func InitializeDependencies(router *gin.Engine) {
	db := connectDatabase()
	initializeDaos(db)
	initializeServices()
	middleware.SetupCORS(router)
	initializeControllers(router)
}

func initializeDaos(db *gorm.DB) {
	userDAO = daos.NewUserDAO(db)
	refreshTokenDAO = daos.NewRefreshTokenDAO(db)
	movieListDAO = daos.NewMovieListDAO(db)
	movieDAO = daos.NewMovieDAO(db)
}

func initializeServices() {
	authService = services.NewAuthService(userDAO, refreshTokenDAO)
	listService = services.NewListService(movieListDAO, movieDAO, os.Getenv("TMDB_API_TOKEN"))
	searchService = services.NewSearchService(os.Getenv("TMDB_API_TOKEN"))
	authMiddleware = middleware.NewAuthMiddleware(authService.JWTSecret())
}

func initializeControllers(router *gin.Engine) {
	healthHandler := func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	}
	router.GET("/health", healthHandler)
	router.HEAD("/health", healthHandler)

	controllers.NewAuthController(router, authService, authMiddleware)
	controllers.NewListController(router, listService, authMiddleware)
	controllers.NewSearchController(router, searchService, authMiddleware)
}
