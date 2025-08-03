package config

import (
	"fmt"
	"os"

	"github.com/8bury/list2gether/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func connectDatabase() *gorm.DB {
	err := godotenv.Load(".env")
	if err != nil {
		fmt.Println("Erro ao carregar o arquivo .env:", err)
	}
	dsn := os.Getenv("DB_DSN")

	fmt.Print("Connecting to database with DSN: ", dsn, "\n")

	db, err := gorm.Open(mysql.Open(dsn))
	if err != nil {
		panic("failed to connect to database")
	}
	db.AutoMigrate(&models.Movie{})
	db.AutoMigrate(&models.MovieListEntry{})
	db.AutoMigrate(&models.List{})

	return db
}
