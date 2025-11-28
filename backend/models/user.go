package models

import (
	"time"
)

type User struct {
	ID        int64     `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	Username  string    `gorm:"uniqueIndex;not null;size:50;column:username" json:"username"`
	Email     string    `gorm:"uniqueIndex;not null;size:255;column:email" json:"email"`
	Password  string    `gorm:"not null;type:text;column:password" json:"-"`
	AvatarURL *string   `gorm:"size:500;column:avatar_url" json:"avatar_url,omitempty"`
	CreatedAt time.Time `gorm:"autoCreateTime;column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime;column:updated_at" json:"updated_at"`

	CreatedLists []MovieList  `gorm:"foreignKey:CreatedBy" json:"created_lists,omitempty"`
	ListMembers  []ListMember `gorm:"foreignKey:UserID" json:"list_members,omitempty"`
	AddedMovies  []ListMovie  `gorm:"foreignKey:AddedBy" json:"added_movies,omitempty"`
}

func (User) TableName() string {
	return "users"
}
