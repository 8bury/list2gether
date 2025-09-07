package config

import (
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
	authService     services.AuthService
	authMiddleware  *middleware.AuthMiddleware
)

func InitializeDependencies(router *gin.Engine) {
	db := connectDatabase()
	initializeDaos(db)
	initializeServices()
	initializeControllers(router)
}

func initializeDaos(db *gorm.DB) {
	userDAO = daos.NewUserDAO(db)
	refreshTokenDAO = daos.NewRefreshTokenDAO(db)
}

func initializeServices() {
	authService = services.NewAuthService(userDAO, refreshTokenDAO)
	authMiddleware = middleware.NewAuthMiddleware(authService.JWTSecret())
}

func initializeControllers(router *gin.Engine) {
	controllers.NewAuthController(router, authService, authMiddleware)
}
