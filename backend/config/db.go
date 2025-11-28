package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/8bury/list2gether/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func connectDatabase() *gorm.DB {
	if _, statErr := os.Stat(".env"); statErr == nil {
		if loadErr := godotenv.Load(".env"); loadErr != nil {
			fmt.Println("Warning: could not load .env file:", loadErr)
		}
	}
	dsn := strings.TrimSpace(os.Getenv("DB_DSN"))
	if dsn == "" {
		panic("DB_DSN is not set")
	}
	dsn = ensureDSNParam(dsn, "parseTime", "true")
	dsn = ensureDSNParam(dsn, "loc", "UTC")

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
		&models.ListMovieUserData{},
		&models.RefreshToken{},
		&models.Comment{},
	)
	if err != nil {
		panic("failed to migrate database: " + err.Error())
	}

	if err := backfillLegacyListMovieUserData(db); err != nil {
		fmt.Println("Warning: failed to backfill legacy list movie user data:", err)
	}

	fmt.Println("Database migration completed successfully")

	return db
}

func backfillLegacyListMovieUserData(db *gorm.DB) error {
	type legacyRow struct {
		ListID  int64
		MovieID int64
		Rating  *int
		Notes   *string
	}

	var rows []legacyRow
	if err := db.Table("list_movies").
		Select("list_id, movie_id, rating, notes").
		Where("rating IS NOT NULL OR (notes IS NOT NULL AND notes <> '')").
		Find(&rows).Error; err != nil {
		return err
	}
	if len(rows) == 0 {
		return nil
	}

	listIDs := make([]int64, 0, len(rows))
	seen := make(map[int64]struct{})
	for _, row := range rows {
		if _, exists := seen[row.ListID]; !exists {
			seen[row.ListID] = struct{}{}
			listIDs = append(listIDs, row.ListID)
		}
	}

	type listOwner struct {
		ID        int64
		CreatedBy int64
	}
	var owners []listOwner
	if err := db.Table("movie_lists").
		Select("id, created_by").
		Where("id IN ?", listIDs).
		Find(&owners).Error; err != nil {
		return err
	}
	ownerMap := make(map[int64]int64, len(owners))
	for _, o := range owners {
		ownerMap[o.ID] = o.CreatedBy
	}

	now := time.Now()

	for _, row := range rows {
		ownerID, ok := ownerMap[row.ListID]
		if !ok || ownerID == 0 {
			continue
		}

		var rating *int
		if row.Rating != nil {
			r := *row.Rating
			if r >= 1 && r <= 10 {
				rating = &r
			}
		}

		var notes *string
		if row.Notes != nil {
			if trimmed := strings.TrimSpace(*row.Notes); trimmed != "" {
				copy := trimmed
				notes = &copy
			}
		}

		if rating == nil && notes == nil {
			continue
		}

		entry := models.ListMovieUserData{
			ListID:    row.ListID,
			MovieID:   row.MovieID,
			UserID:    ownerID,
			Rating:    rating,
			Notes:     notes,
			CreatedAt: now,
			UpdatedAt: now,
		}

		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "list_id"}, {Name: "movie_id"}, {Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]interface{}{"rating": rating, "notes": notes, "updated_at": now}),
		}).Create(&entry).Error; err != nil {
			return err
		}
	}

	return nil
}

func ensureDSNParam(dsn, key, value string) string {
	if strings.Contains(dsn, key+"=") {
		return dsn
	}
	separator := "?"
	if strings.Contains(dsn, "?") {
		if strings.HasSuffix(dsn, "?") || strings.HasSuffix(dsn, "&") {
			separator = ""
		} else {
			separator = "&"
		}
	}
	return dsn + separator + key + "=" + value
}
