package models

import (
	"time"
)

type ListMemberRole string

const (
	RoleOwner       ListMemberRole = "owner"
	RoleParticipant ListMemberRole = "participant"
)

type ListMember struct {
	ListID  int64          `gorm:"primaryKey;column:list_id" json:"list_id"`
	UserID  int64          `gorm:"primaryKey;column:user_id" json:"user_id"`
	Role    ListMemberRole `gorm:"not null;size:20;column:role;check:role IN ('owner', 'participant')" json:"role"`
	AddedAt time.Time      `gorm:"autoCreateTime;column:added_at" json:"added_at"`
	List    MovieList      `gorm:"foreignKey:ListID" json:"list,omitempty"`
	User    User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ListMember) TableName() string {
	return "list_members"
}
