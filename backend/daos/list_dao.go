package daos

import (
	"time"

	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MovieListDAO interface {
	InviteCodeExists(code string) (bool, error)
	CreateWithOwner(list *models.MovieList, ownerUserID int64) error
	FindByIDWithCreator(id int64) (*models.MovieList, error)
	FindByInviteCodeWithCreator(code string) (*models.MovieList, error)
	FindMembership(listID, userID int64) (*models.ListMember, error)
	AddParticipantIfNotExists(listID, userID int64) (bool, error)
	CountMembers(listID int64) (int64, error)
	FindByID(id int64) (*models.MovieList, error)
	DeleteListCascadeIfOwner(listID, userID int64) error
	FindUserMemberships(userID int64, role *models.ListMemberRole, limit int, offset int) ([]models.ListMember, error)
	CountUserMemberships(userID int64, role *models.ListMemberRole) (int64, error)
	CountMembersBatch(listIDs []int64) (map[int64]int64, error)
	CountMoviesBatch(listIDs []int64) (map[int64]int64, error)
	ListMovieExists(listID, movieID int64) (bool, error)
	AddMovieToList(listID, movieID int64, addedBy *int64) (*models.ListMovie, error)
	FindListMovieByListAndMovie(listID, movieID int64) (*models.ListMovie, error)
	RemoveMovieFromList(listID, movieID int64) error
	UpdateMovie(listID, movieID int64, status *models.MovieStatus, rating *int, notes *string) (*models.ListMovie, error)
}

type movieListDAO struct {
	db *gorm.DB
}

func NewMovieListDAO(db *gorm.DB) MovieListDAO {
	return &movieListDAO{db: db}
}

func (d *movieListDAO) InviteCodeExists(code string) (bool, error) {
	var count int64
	if err := d.db.Model(&models.MovieList{}).Where("invite_code = ?", code).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (d *movieListDAO) CreateWithOwner(list *models.MovieList, ownerUserID int64) error {
	return d.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(list).Error; err != nil {
			return err
		}
		member := &models.ListMember{
			ListID: list.ID,
			UserID: ownerUserID,
			Role:   models.RoleOwner,
		}
		if err := tx.Create(member).Error; err != nil {
			return err
		}
		return nil
	})
}

func (d *movieListDAO) FindByIDWithCreator(id int64) (*models.MovieList, error) {
	var list models.MovieList
	if err := d.db.Preload("Creator").First(&list, id).Error; err != nil {
		return nil, err
	}
	return &list, nil
}

func (d *movieListDAO) FindByInviteCodeWithCreator(code string) (*models.MovieList, error) {
	var list models.MovieList
	if err := d.db.Preload("Creator").Where("invite_code = ?", code).First(&list).Error; err != nil {
		return nil, err
	}
	return &list, nil
}

func (d *movieListDAO) FindMembership(listID, userID int64) (*models.ListMember, error) {
	var m models.ListMember
	if err := d.db.Where("list_id = ? AND user_id = ?", listID, userID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (d *movieListDAO) AddParticipantIfNotExists(listID, userID int64) (bool, error) {
	m := &models.ListMember{ListID: listID, UserID: userID, Role: models.RoleParticipant}
	tx := d.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "list_id"}, {Name: "user_id"}},
		DoNothing: true,
	}).Create(m)
	if tx.Error != nil {
		return false, tx.Error
	}
	return tx.RowsAffected > 0, nil
}

func (d *movieListDAO) CountMembers(listID int64) (int64, error) {
	var count int64
	if err := d.db.Model(&models.ListMember{}).Where("list_id = ?", listID).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (d *movieListDAO) FindByID(id int64) (*models.MovieList, error) {
	var list models.MovieList
	if err := d.db.First(&list, id).Error; err != nil {
		return nil, err
	}
	return &list, nil
}

func (d *movieListDAO) DeleteListCascadeIfOwner(listID, userID int64) error {
	return d.db.Transaction(func(tx *gorm.DB) error {
		var membership models.ListMember
		if err := tx.Where("list_id = ? AND user_id = ?", listID, userID).First(&membership).Error; err != nil {
			return err
		}
		if membership.Role != models.RoleOwner {
			return gorm.ErrInvalidData
		}

		if err := tx.Where("list_id = ?", listID).Delete(&models.ListMovie{}).Error; err != nil {
			return err
		}
		if err := tx.Where("list_id = ?", listID).Delete(&models.ListMember{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", listID).Delete(&models.MovieList{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func (d *movieListDAO) FindUserMemberships(userID int64, role *models.ListMemberRole, limit int, offset int) ([]models.ListMember, error) {
	var memberships []models.ListMember
	q := d.db.Model(&models.ListMember{}).
		Joins("JOIN movie_lists ON movie_lists.id = list_members.list_id").
		Where("list_members.user_id = ?", userID).
		Order("movie_lists.created_at DESC").
		Preload("List")
	if role != nil {
		q = q.Where("list_members.role = ?", string(*role))
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&memberships).Error; err != nil {
		return nil, err
	}
	return memberships, nil
}

func (d *movieListDAO) CountUserMemberships(userID int64, role *models.ListMemberRole) (int64, error) {
	var total int64
	q := d.db.Model(&models.ListMember{}).Where("user_id = ?", userID)
	if role != nil {
		q = q.Where("role = ?", string(*role))
	}
	if err := q.Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func (d *movieListDAO) CountMembersBatch(listIDs []int64) (map[int64]int64, error) {
	result := make(map[int64]int64)
	if len(listIDs) == 0 {
		return result, nil
	}
	type row struct {
		ListID int64
		Cnt    int64
	}
	var rows []row
	if err := d.db.Model(&models.ListMember{}).
		Select("list_id AS list_id, COUNT(*) AS cnt").
		Where("list_id IN ?", listIDs).
		Group("list_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, r := range rows {
		result[r.ListID] = r.Cnt
	}
	return result, nil
}

func (d *movieListDAO) CountMoviesBatch(listIDs []int64) (map[int64]int64, error) {
	result := make(map[int64]int64)
	if len(listIDs) == 0 {
		return result, nil
	}
	type row struct {
		ListID int64
		Cnt    int64
	}
	var rows []row
	if err := d.db.Model(&models.ListMovie{}).
		Select("list_id AS list_id, COUNT(*) AS cnt").
		Where("list_id IN ?", listIDs).
		Group("list_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, r := range rows {
		result[r.ListID] = r.Cnt
	}
	return result, nil
}

func (d *movieListDAO) ListMovieExists(listID, movieID int64) (bool, error) {
	var count int64
	if err := d.db.Model(&models.ListMovie{}).
		Where("list_id = ? AND movie_id = ?", listID, movieID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (d *movieListDAO) AddMovieToList(listID, movieID int64, addedBy *int64) (*models.ListMovie, error) {
	rec := &models.ListMovie{ListID: listID, MovieID: movieID, AddedBy: addedBy}
	if err := d.db.Create(rec).Error; err != nil {
		return nil, err
	}
	return rec, nil
}

func (d *movieListDAO) FindListMovieByListAndMovie(listID, movieID int64) (*models.ListMovie, error) {
	var listMovie models.ListMovie
	if err := d.db.Where("list_id = ? AND movie_id = ?", listID, movieID).First(&listMovie).Error; err != nil {
		return nil, err
	}
	return &listMovie, nil
}

func (d *movieListDAO) RemoveMovieFromList(listID, movieID int64) error {
	return d.db.Where("list_id = ? AND movie_id = ?", listID, movieID).Delete(&models.ListMovie{}).Error
}

func (d *movieListDAO) UpdateMovie(listID, movieID int64, status *models.MovieStatus, rating *int, notes *string) (*models.ListMovie, error) {
	var listMovie models.ListMovie

	updates := map[string]interface{}{}

	// Update status if provided
	if status != nil {
		updates["status"] = *status
		if *status == models.StatusWatched {
			now := time.Now()
			updates["watched_at"] = &now
		} else {
			updates["watched_at"] = nil
		}
	}

	// Update rating if provided
	if rating != nil {
		updates["rating"] = *rating
	}

	// Update notes if provided
	if notes != nil {
		updates["notes"] = *notes
	}

	if err := d.db.Model(&listMovie).
		Where("list_id = ? AND movie_id = ?", listID, movieID).
		Updates(updates).Error; err != nil {
		return nil, err
	}

	if err := d.db.Where("list_id = ? AND movie_id = ?", listID, movieID).First(&listMovie).Error; err != nil {
		return nil, err
	}

	return &listMovie, nil
}
