package models

type Movie struct {
	MovieID  uint   `gorm:"primaryKey"`
	IMDBId   string `gorm:"type:varchar(20);uniqueIndex;not null"`
	Title    string
	Year     string
	Genre    string
	Director string
	Rating   string
}

