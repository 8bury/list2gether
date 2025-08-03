package daos

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/8bury/list2gether/models"
	"gorm.io/gorm"
)

type ImdbDAO struct {
	db *gorm.DB
	client *http.Client
}

func NewImdbDAO(db *gorm.DB) *ImdbDAO {
	return &ImdbDAO{
		db: db,
		client: http.DefaultClient,
	}
}



func (dao *ImdbDAO) GetMovieByIMDBId(imdbId string) (*models.ImdbResponse, error) {
	req, err := http.NewRequest("GET", "http://www.omdbapi.com/" + imdbId + "?apikey=" + os.Getenv("OMDB_KEY"), nil)
	if err != nil {
		return nil, err
	}

	resp, err := dao.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch movie from IMDB: %s", resp.Status)
	}

	var imdbResponse models.ImdbResponse
	if err := json.NewDecoder(resp.Body).Decode(&imdbResponse); err != nil {
		return nil, err
	}

	return &imdbResponse, nil
}

func (dao *ImdbDAO) RegisterMovieInDatabase(movie *models.ImdbResponse) (*models.Movie, error) {
	databaseMovie := &models.Movie{
		Title: movie.Title,
		Year: movie.Year,
		IMDBId: movie.ImdbID,
		Director: movie.Director,
		Genre: movie.Genre,
		Rating: movie.ImdbRating,
	}

	if err := dao.db.Create(databaseMovie).Error; err != nil {
		return nil, err
	}

	return databaseMovie, nil
}