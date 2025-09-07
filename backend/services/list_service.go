package services

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"

	"github.com/8bury/list2gether/daos"
	"github.com/8bury/list2gether/models"
	"github.com/go-sql-driver/mysql"
)

type ListService interface {
	CreateList(name string, description *string, createdBy int64) (*models.MovieList, error)
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
		return nil, errors.New("Name must be between 1 and 255 characters")
	}
	if description != nil {
		d := strings.TrimSpace(*description)
		if len(d) > 1000 {
			return nil, errors.New("Description must be at most 1000 characters")
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
	return nil, errors.New("Failed to generate unique invite code")
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
	return "", errors.New("Failed to generate unique invite code")
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
