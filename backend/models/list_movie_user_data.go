package models

import "time"

type ListMovieUserData struct {
	ID        int64     `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	ListID    int64     `gorm:"not null;column:list_id;index:idx_list_movie_user,unique" json:"list_id"`
	MovieID   int64     `gorm:"not null;column:movie_id;index:idx_list_movie_user,unique" json:"movie_id"`
	UserID    int64     `gorm:"not null;column:user_id;index:idx_list_movie_user,unique" json:"user_id"`
	Rating    *int      `gorm:"column:rating;check:rating BETWEEN 0 AND 10" json:"rating"`
	Notes     *string   `gorm:"type:text;column:notes" json:"notes"`
	CreatedAt time.Time `gorm:"autoCreateTime;column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime;column:updated_at" json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ListMovieUserData) TableName() string {
	return "list_movie_user_data"
}
