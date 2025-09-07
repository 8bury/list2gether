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
	if _, statErr := os.Stat(".env"); statErr == nil {
		if loadErr := godotenv.Load(".env"); loadErr != nil {
			fmt.Println("Warning: could not load .env file:", loadErr)
		}
	}
	dsn := os.Getenv("DB_DSN")

	fmt.Print("Connecting to database with DSN: ", dsn, "\n")

	db, err := gorm.Open(mysql.Open(dsn))
	if err != nil {
		panic("failed to connect to database")
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.Movie{},
		&models.Genre{},
		&models.MovieList{},
		&models.ListMember{},
		&models.ListMovie{},
		&models.RefreshToken{},
	)
	if err != nil {
		panic("failed to migrate database: " + err.Error())
	}

	fmt.Println("Database migration completed successfully")

	return db
}
