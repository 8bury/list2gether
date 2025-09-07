package services

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"

	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/models"
	"github.com/go-sql-driver/mysql"
	"gorm.io/gorm"
)

type ListService interface {
	CreateList(name string, description *string, createdBy int64) (*models.MovieList, error)
	JoinListByInviteCode(inviteCode string, userID int64) (*models.MovieList, models.ListMemberRole, bool, int64, error)
	DeleteList(listID int64, userID int64) error
}

type listService struct {
	lists daos.MovieListDAO
}

func NewListService(lists daos.MovieListDAO) ListService {
	return &listService{lists: lists}
}

func (s *listService) CreateList(name string, description *string, createdBy int64) (*models.MovieList, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 255 {
		return nil, errors.New("name must be between 1 and 255 characters")
	}
	if description != nil {
		d := strings.TrimSpace(*description)
		if len(d) > 1000 {
			return nil, errors.New("description must be at most 1000 characters")
		}
		description = &d
	}

	for i := 0; i < 10; i++ {
		code, err := s.generateUniqueInviteCode()
		if err != nil {
			return nil, err
		}
		list := &models.MovieList{
			Name:        name,
			Description: description,
			InviteCode:  code,
			CreatedBy:   createdBy,
		}
		if err := s.lists.CreateWithOwner(list, createdBy); err != nil {
			var me *mysql.MySQLError
			if errors.As(err, &me) && me.Number == 1062 {
				continue
			}
			if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
				continue
			}
			return nil, err
		}
		out, err := s.lists.FindByIDWithCreator(list.ID)
		if err != nil {
			return nil, err
		}
		return out, nil
	}
	return nil, errors.New("failed to generate unique invite code")
}

var ErrInvalidInviteCodeFormat = errors.New("invite code must be 10 alphanumeric characters")
var ErrAccessDenied = errors.New("access denied: only the list owner can delete this list")

func (s *listService) JoinListByInviteCode(inviteCode string, userID int64) (*models.MovieList, models.ListMemberRole, bool, int64, error) {
	code := strings.ToUpper(strings.TrimSpace(inviteCode))
	if len(code) != 10 {
		return nil, "", false, 0, ErrInvalidInviteCodeFormat
	}
	for i := 0; i < len(code); i++ {
		c := code[i]
		if !((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) {
			return nil, "", false, 0, ErrInvalidInviteCodeFormat
		}
	}

	list, err := s.lists.FindByInviteCodeWithCreator(code)
	if err != nil {
		return nil, "", false, 0, err
	}

	membership, err := s.lists.FindMembership(list.ID, userID)
	alreadyMember := false
	role := models.RoleParticipant
	if err == nil {
		alreadyMember = true
		role = membership.Role
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		inserted, addErr := s.lists.AddParticipantIfNotExists(list.ID, userID)
		if addErr != nil {
			return nil, "", false, 0, addErr
		}
		if inserted {
			alreadyMember = false
			role = models.RoleParticipant
		} else {
			m2, err2 := s.lists.FindMembership(list.ID, userID)
			if err2 != nil {
				return nil, "", false, 0, err2
			}
			alreadyMember = true
			role = m2.Role
		}
	} else {
		return nil, "", false, 0, err
	}

	count, err := s.lists.CountMembers(list.ID)
	if err != nil {
		return nil, "", false, 0, err
	}

	return list, role, alreadyMember, count, nil
}

func (s *listService) DeleteList(listID int64, userID int64) error {
	_, err := s.lists.FindByID(listID)
	if err != nil {
		return err
	}
	membership, err := s.lists.FindMembership(listID, userID)
	if err != nil {
		return err
	}
	if membership.Role != models.RoleOwner {
		return ErrAccessDenied
	}
	if err := s.lists.DeleteListCascadeIfOwner(listID, userID); err != nil {
		if errors.Is(err, gorm.ErrInvalidData) {
			return ErrAccessDenied
		}
		return err
	}
	return nil
}

func (s *listService) generateUniqueInviteCode() (string, error) {
	for i := 0; i < 10; i++ {
		code := randomAlphaNum(10)
		exists, err := s.lists.InviteCodeExists(code)
		if err != nil {
			return "", err
		}
		if !exists {
			return code, nil
		}
	}
	return "", errors.New("failed to generate unique invite code")
}

func randomAlphaNum(n int) string {
	b := make([]byte, n)
	tmp := make([]byte, n*2)
	rand.Read(tmp)
	enc := base64.RawURLEncoding.EncodeToString(tmp)
	idx := 0
	for i := 0; i < len(enc) && idx < n; i++ {
		c := enc[i]
		if (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') {
			b[idx] = c
			idx++
		}
	}
	if idx < n {
		for idx < n {
			b[idx] = 'A'
			idx++
		}
	}
	return string(b)
}
