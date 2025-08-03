package models

type List struct {
	ID     uint             `gorm:"primaryKey"`
	Movies []MovieListEntry `gorm:"foreignKey:ListID"`
}

type MovieListEntry struct {
	ID      uint   `gorm:"primaryKey;autoIncrement"`
	ListID  uint   `gorm:"index;not null"`
	MovieID uint   `gorm:"index;not null"`
	Status  Status `gorm:"default:0"`
	Movie   Movie  `gorm:"foreignKey:MovieID"`
}

type Status int

const (
	ToWatch Status = iota
	Watched
	Watching
)
