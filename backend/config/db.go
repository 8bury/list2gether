package config

import (
	"os"
	"github.com/8bury/list2gether/models"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"github.com/joho/godotenv"
)

func connectDatabase() *gorm.DB {
	godotenv.Load("../.env")
	dsn := os.Getenv("DB_DSN")
	db, err := gorm.Open(mysql.Open(dsn))
	if err != nil {
		panic("failed to connect to database")
	}
	db.AutoMigrate(&models.Movie{})
	db.AutoMigrate(&models.MovieListEntry{})
	db.AutoMigrate(&models.List{})

	return db
}
