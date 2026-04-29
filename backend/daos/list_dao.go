package daos

import (
	"errors"
	"strings"
	"time"

	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// MemberPreview is a lightweight user struct returned in batch list enrichment.
type MemberPreview struct {
	UserID    int64   `json:"user_id"`
	Username  string  `json:"username"`
	AvatarURL *string `json:"avatar_url"`
}

// ActivityItem represents one event in the user's home-page activity feed.
type ActivityItem struct {
	Type            string    `json:"type"`
	Timestamp       time.Time `json:"timestamp"`
	ListID          int64     `json:"list_id"`
	ListName        string    `json:"list_name"`
	MovieID         *int64    `json:"movie_id,omitempty"`
	MovieTitle      *string   `json:"movie_title,omitempty"`
	MoviePosterPath *string   `json:"movie_poster_path,omitempty"`
	UserID          *int64    `json:"user_id,omitempty"`
	Username        *string   `json:"username,omitempty"`
	AvatarURL       *string   `json:"avatar_url,omitempty"`
}

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
	UpdateMovie(listID, movieID int64, status *models.MovieStatus) (*models.ListMovie, error)
	UpsertMovieUserData(listID, movieID, userID int64, rating *int, ratingProvided bool) (*models.ListMovieUserData, error)
	FindMovieUserData(listID, movieID, userID int64) (*models.ListMovieUserData, error)
	GetMovieAverageRating(listID, movieID int64) (*float64, error)
	FindListMoviesWithMovie(listID int64, status *models.MovieStatus) ([]models.ListMovie, error)
	SearchListMoviesWithMovie(listID int64, query string, limit int, offset int) ([]models.ListMovie, int64, error)
	UpdateMovieOrders(listID int64, orderMap map[int64]int) error
	RemoveMember(listID, userID int64) error
	// Comment methods
	CreateComment(listID, movieID, userID int64, content string) (*models.Comment, error)
	FindComments(listID, movieID int64, limit, offset int) ([]models.Comment, int64, error)
	FindCommentByID(commentID int64) (*models.Comment, error)
	UpdateComment(commentID int64, content string) (*models.Comment, error)
	DeleteComment(commentID int64) error
	// Home enrichment methods
	FetchPostersBatch(listIDs []int64) (map[int64][]string, error)
	FetchMembersBatch(listIDs []int64) (map[int64][]MemberPreview, error)
	FetchLastActivityBatch(listIDs []int64) (map[int64]time.Time, error)
	CountWatchedThisMonth(userID int64) (int64, error)
	FetchRecentActivity(userID int64, limit int) ([]ActivityItem, error)
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

		// Soft delete the list (GORM automatically sets deleted_at)
		// Related data (members, movies, comments, ratings) are kept intact
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
		Where("movie_lists.deleted_at IS NULL").
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
	var rec *models.ListMovie
	err := d.db.Transaction(func(tx *gorm.DB) error {
		// Increment display_order of all existing movies in the list
		if err := tx.Model(&models.ListMovie{}).
			Where("list_id = ?", listID).
			Update("display_order", gorm.Expr("COALESCE(display_order, 0) + 1")).Error; err != nil {
			return err
		}

		// Add new movie with display_order = 0 (top of the list)
		displayOrder := 0
		rec = &models.ListMovie{
			ListID:       listID,
			MovieID:      movieID,
			AddedBy:      addedBy,
			DisplayOrder: &displayOrder,
		}
		if err := tx.Create(rec).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
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
	return d.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("list_id = ? AND movie_id = ?", listID, movieID).
			Delete(&models.Comment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("list_id = ? AND movie_id = ?", listID, movieID).
			Delete(&models.ListMovieUserData{}).Error; err != nil {
			return err
		}
		if err := tx.Where("list_id = ? AND movie_id = ?", listID, movieID).
			Delete(&models.ListMovie{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func (d *movieListDAO) UpdateMovie(listID, movieID int64, status *models.MovieStatus) (*models.ListMovie, error) {
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

func (d *movieListDAO) UpsertMovieUserData(listID, movieID, userID int64, rating *int, ratingProvided bool) (*models.ListMovieUserData, error) {
	var existing models.ListMovieUserData
	err := d.db.Where("list_id = ? AND movie_id = ? AND user_id = ?", listID, movieID, userID).
		First(&existing).Error

	var cleanRating *int
	if ratingProvided {
		if rating != nil {
			r := *rating
			if r < 1 || r > 10 {
				return nil, errors.New("rating must be between 1 and 10")
			}
			cleanRating = &r
		} else {
			cleanRating = nil
		}
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		if !ratingProvided || cleanRating == nil {
			return nil, nil
		}
		rec := &models.ListMovieUserData{
			ListID:  listID,
			MovieID: movieID,
			UserID:  userID,
		}
		if ratingProvided {
			rec.Rating = cleanRating
		}
		if err := d.db.Create(rec).Error; err != nil {
			return nil, err
		}
		return rec, nil
	}
	if err != nil {
		return nil, err
	}

	if ratingProvided {
		existing.Rating = cleanRating
	}

	if existing.Rating == nil {
		if err := d.db.Delete(&existing).Error; err != nil {
			return nil, err
		}
		return nil, nil
	}

	existing.UpdatedAt = time.Now()
	if err := d.db.Save(&existing).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

func (d *movieListDAO) FindMovieUserData(listID, movieID, userID int64) (*models.ListMovieUserData, error) {
	var data models.ListMovieUserData
	if err := d.db.Preload("User").
		Where("list_id = ? AND movie_id = ? AND user_id = ?", listID, movieID, userID).
		First(&data).Error; err != nil {
		return nil, err
	}
	return &data, nil
}

func (d *movieListDAO) FindListMoviesWithMovie(listID int64, status *models.MovieStatus) ([]models.ListMovie, error) {
	var listMovies []models.ListMovie
	q := d.db.
		Preload("Movie").
		Preload("Movie.Genres").
		Preload("UserEntries").
		Preload("UserEntries.User").
		Preload("AddedByUser").
		Where("list_id = ?", listID)
	if status != nil {
		q = q.Where("status = ?", string(*status))
	}
	if err := q.Order("display_order ASC, added_at DESC").Find(&listMovies).Error; err != nil {
		return nil, err
	}
	return listMovies, nil
}

func (d *movieListDAO) GetMovieAverageRating(listID, movieID int64) (*float64, error) {
	type result struct {
		Avg *float64
	}
	var res result
	if err := d.db.Table(models.ListMovieUserData{}.TableName()).
		Select("AVG(rating) AS avg").
		Where("list_id = ? AND movie_id = ? AND rating IS NOT NULL", listID, movieID).
		Scan(&res).Error; err != nil {
		return nil, err
	}
	return res.Avg, nil
}

func (d *movieListDAO) SearchListMoviesWithMovie(listID int64, query string, limit int, offset int) ([]models.ListMovie, int64, error) {
	q := strings.TrimSpace(query)
	like := "%" + q + "%"

	var total int64
	countQ := d.db.Model(&models.ListMovie{}).
		Joins("JOIN movies ON movies.id = list_movies.movie_id").
		Where("list_movies.list_id = ?", listID).
		Where("movies.title LIKE ? OR movies.original_title LIKE ?", like, like)
	if err := countQ.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var listMovies []models.ListMovie
	fetchQ := d.db.
		Preload("Movie").
		Preload("Movie.Genres").
		Preload("UserEntries").
		Preload("UserEntries.User").
		Preload("AddedByUser").
		Joins("JOIN movies ON movies.id = list_movies.movie_id").
		Where("list_movies.list_id = ?", listID).
		Where("movies.title LIKE ? OR movies.original_title LIKE ?", like, like).
		Order("list_movies.display_order ASC, list_movies.added_at DESC")
	if limit > 0 {
		fetchQ = fetchQ.Limit(limit)
	}
	if offset > 0 {
		fetchQ = fetchQ.Offset(offset)
	}
	if err := fetchQ.Find(&listMovies).Error; err != nil {
		return nil, 0, err
	}
	return listMovies, total, nil
}

func (d *movieListDAO) UpdateMovieOrders(listID int64, orderMap map[int64]int) error {
	return d.db.Transaction(func(tx *gorm.DB) error {
		for movieID, order := range orderMap {
			if err := tx.Model(&models.ListMovie{}).
				Where("list_id = ? AND movie_id = ?", listID, movieID).
				Update("display_order", order).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (d *movieListDAO) RemoveMember(listID, userID int64) error {
	return d.db.Transaction(func(tx *gorm.DB) error {
		// Delete user's ratings and notes for movies in this list
		if err := tx.Where("list_id = ? AND user_id = ?", listID, userID).
			Delete(&models.ListMovieUserData{}).Error; err != nil {
			return err
		}
		// Delete user's comments for movies in this list
		if err := tx.Where("list_id = ? AND user_id = ?", listID, userID).
			Delete(&models.Comment{}).Error; err != nil {
			return err
		}
		// Delete the membership
		if err := tx.Where("list_id = ? AND user_id = ?", listID, userID).
			Delete(&models.ListMember{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func (d *movieListDAO) CreateComment(listID, movieID, userID int64, content string) (*models.Comment, error) {
	comment := &models.Comment{
		ListID:  listID,
		MovieID: movieID,
		UserID:  userID,
		Content: content,
	}
	if err := d.db.Create(comment).Error; err != nil {
		return nil, err
	}
	// Reload with user
	if err := d.db.Preload("User").First(comment, comment.ID).Error; err != nil {
		return nil, err
	}
	return comment, nil
}

func (d *movieListDAO) FindComments(listID, movieID int64, limit, offset int) ([]models.Comment, int64, error) {
	var total int64
	if err := d.db.Model(&models.Comment{}).
		Where("list_id = ? AND movie_id = ?", listID, movieID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var comments []models.Comment
	q := d.db.Preload("User").
		Where("list_id = ? AND movie_id = ?", listID, movieID).
		Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&comments).Error; err != nil {
		return nil, 0, err
	}
	return comments, total, nil
}

func (d *movieListDAO) FindCommentByID(commentID int64) (*models.Comment, error) {
	var comment models.Comment
	if err := d.db.Preload("User").First(&comment, commentID).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}

func (d *movieListDAO) UpdateComment(commentID int64, content string) (*models.Comment, error) {
	var comment models.Comment
	if err := d.db.First(&comment, commentID).Error; err != nil {
		return nil, err
	}
	comment.Content = content
	if err := d.db.Save(&comment).Error; err != nil {
		return nil, err
	}
	// Reload with user
	if err := d.db.Preload("User").First(&comment, commentID).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}

func (d *movieListDAO) DeleteComment(commentID int64) error {
	return d.db.Delete(&models.Comment{}, commentID).Error
}

func (d *movieListDAO) FetchPostersBatch(listIDs []int64) (map[int64][]string, error) {
	result := make(map[int64][]string)
	if len(listIDs) == 0 {
		return result, nil
	}
	type posterRow struct {
		ListID     int64  `gorm:"column:list_id"`
		PosterPath string `gorm:"column:poster_path"`
	}
	var rows []posterRow
	if err := d.db.Table("list_movies lm").
		Select("lm.list_id AS list_id, m.poster_path AS poster_path").
		Joins("JOIN movies m ON m.id = lm.movie_id").
		Where("lm.list_id IN ? AND m.poster_path IS NOT NULL AND m.poster_path != ''", listIDs).
		Order("lm.list_id, lm.display_order ASC, lm.added_at DESC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, r := range rows {
		if len(result[r.ListID]) < 4 {
			result[r.ListID] = append(result[r.ListID], r.PosterPath)
		}
	}
	return result, nil
}

func (d *movieListDAO) FetchMembersBatch(listIDs []int64) (map[int64][]MemberPreview, error) {
	result := make(map[int64][]MemberPreview)
	if len(listIDs) == 0 {
		return result, nil
	}
	type memberRow struct {
		ListID    int64   `gorm:"column:list_id"`
		UserID    int64   `gorm:"column:user_id"`
		Username  string  `gorm:"column:username"`
		AvatarURL *string `gorm:"column:avatar_url"`
	}
	var rows []memberRow
	if err := d.db.Table("list_members lm").
		Select("lm.list_id AS list_id, u.id AS user_id, u.username AS username, u.avatar_url AS avatar_url").
		Joins("JOIN users u ON u.id = lm.user_id").
		Where("lm.list_id IN ?", listIDs).
		Order("lm.list_id, lm.added_at ASC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, r := range rows {
		if len(result[r.ListID]) < 5 {
			result[r.ListID] = append(result[r.ListID], MemberPreview{
				UserID:    r.UserID,
				Username:  r.Username,
				AvatarURL: r.AvatarURL,
			})
		}
	}
	return result, nil
}

func (d *movieListDAO) FetchLastActivityBatch(listIDs []int64) (map[int64]time.Time, error) {
	result := make(map[int64]time.Time)
	if len(listIDs) == 0 {
		return result, nil
	}
	type activityTimeRow struct {
		ListID      int64      `gorm:"column:list_id"`
		LastAdded   *time.Time `gorm:"column:last_added"`
		LastWatched *time.Time `gorm:"column:last_watched"`
	}
	var rows []activityTimeRow
	if err := d.db.Table("list_movies").
		Select("list_id, MAX(added_at) AS last_added, MAX(watched_at) AS last_watched").
		Where("list_id IN ?", listIDs).
		Group("list_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, r := range rows {
		var t time.Time
		if r.LastAdded != nil && r.LastAdded.After(t) {
			t = *r.LastAdded
		}
		if r.LastWatched != nil && r.LastWatched.After(t) {
			t = *r.LastWatched
		}
		if !t.IsZero() {
			result[r.ListID] = t
		}
	}
	return result, nil
}

func (d *movieListDAO) CountWatchedThisMonth(userID int64) (int64, error) {
	now := time.Now()
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	var count int64
	if err := d.db.Table("list_movies lm").
		Joins("JOIN list_members mem ON mem.list_id = lm.list_id AND mem.user_id = ?", userID).
		Joins("JOIN movie_lists ml ON ml.id = lm.list_id AND ml.deleted_at IS NULL").
		Where("lm.status = ? AND lm.watched_at >= ?", string(models.StatusWatched), firstOfMonth).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (d *movieListDAO) FetchRecentActivity(userID int64, limit int) ([]ActivityItem, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	sql := `
		(SELECT 'movie_added' AS activity_type, lm.added_at AS ts, lm.list_id, ml.name AS list_name,
		        lm.movie_id, m.title AS movie_title, m.poster_path AS movie_poster_path,
		        u.id AS actor_user_id, u.username AS actor_username, u.avatar_url AS actor_avatar_url
		 FROM list_movies lm
		 JOIN movie_lists ml ON ml.id = lm.list_id AND ml.deleted_at IS NULL
		 JOIN movies m ON m.id = lm.movie_id
		 LEFT JOIN users u ON u.id = lm.added_by
		 WHERE EXISTS (SELECT 1 FROM list_members me WHERE me.list_id = lm.list_id AND me.user_id = ?))
		UNION ALL
		(SELECT 'movie_watched' AS activity_type, lm.watched_at AS ts, lm.list_id, ml.name AS list_name,
		        lm.movie_id, m.title AS movie_title, m.poster_path AS movie_poster_path,
		        NULL AS actor_user_id, NULL AS actor_username, NULL AS actor_avatar_url
		 FROM list_movies lm
		 JOIN movie_lists ml ON ml.id = lm.list_id AND ml.deleted_at IS NULL
		 JOIN movies m ON m.id = lm.movie_id
		 WHERE lm.watched_at IS NOT NULL AND lm.status = 'watched'
		   AND EXISTS (SELECT 1 FROM list_members me WHERE me.list_id = lm.list_id AND me.user_id = ?))
		UNION ALL
		(SELECT 'comment' AS activity_type, c.created_at AS ts, c.list_id, ml.name AS list_name,
		        c.movie_id, m.title AS movie_title, m.poster_path AS movie_poster_path,
		        u.id AS actor_user_id, u.username AS actor_username, u.avatar_url AS actor_avatar_url
		 FROM comments c
		 JOIN movie_lists ml ON ml.id = c.list_id AND ml.deleted_at IS NULL
		 JOIN movies m ON m.id = c.movie_id
		 JOIN users u ON u.id = c.user_id
		 WHERE EXISTS (SELECT 1 FROM list_members me WHERE me.list_id = c.list_id AND me.user_id = ?))
		UNION ALL
		(SELECT 'member_joined' AS activity_type, lm.added_at AS ts, lm.list_id, ml.name AS list_name,
		        NULL AS movie_id, NULL AS movie_title, NULL AS movie_poster_path,
		        u.id AS actor_user_id, u.username AS actor_username, u.avatar_url AS actor_avatar_url
		 FROM list_members lm
		 JOIN movie_lists ml ON ml.id = lm.list_id AND ml.deleted_at IS NULL
		 JOIN users u ON u.id = lm.user_id
		 WHERE EXISTS (SELECT 1 FROM list_members me WHERE me.list_id = lm.list_id AND me.user_id = ?))
		ORDER BY ts DESC
		LIMIT ?
	`
	type activityRow struct {
		ActivityType    string    `gorm:"column:activity_type"`
		Ts              time.Time `gorm:"column:ts"`
		ListID          int64     `gorm:"column:list_id"`
		ListName        string    `gorm:"column:list_name"`
		MovieID         *int64    `gorm:"column:movie_id"`
		MovieTitle      *string   `gorm:"column:movie_title"`
		MoviePosterPath *string   `gorm:"column:movie_poster_path"`
		ActorUserID     *int64    `gorm:"column:actor_user_id"`
		ActorUsername   *string   `gorm:"column:actor_username"`
		ActorAvatarURL  *string   `gorm:"column:actor_avatar_url"`
	}
	var rows []activityRow
	if err := d.db.Raw(sql, userID, userID, userID, userID, limit).Scan(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]ActivityItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, ActivityItem{
			Type:            r.ActivityType,
			Timestamp:       r.Ts,
			ListID:          r.ListID,
			ListName:        r.ListName,
			MovieID:         r.MovieID,
			MovieTitle:      r.MovieTitle,
			MoviePosterPath: r.MoviePosterPath,
			UserID:          r.ActorUserID,
			Username:        r.ActorUsername,
			AvatarURL:       r.ActorAvatarURL,
		})
	}
	return items, nil
}
