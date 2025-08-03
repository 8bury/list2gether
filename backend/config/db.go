package config

import (
	"os"
	"github.com/8bury/list2gether/model"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"github.com/joho/godotenv"
)

func ConnectDatabase() *gorm.DB {
	godotenv.Load("../.env")
	dsn := os.Getenv("DB_DSN")
	db, err := gorm.Open(mysql.Open(dsn))
	if err != nil {
		panic("failed to connect to database")
	}
	db.AutoMigrate(&model.Movie{})
	db.AutoMigrate(&model.MovieListEntry{})
	db.AutoMigrate(&model.List{})

	return db
}
