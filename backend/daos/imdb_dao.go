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
	baseURL := "http://www.omdbapi.com/"
	params := url.Values{}
	params.Set("i", imdbId)
	params.Set("apikey", os.Getenv("OMDB_KEY"))
	fullURL := baseURL + "?" + params.Encode()
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		fmt.Printf("Error creating request for IMDB API: %v\n", err)
		return nil, err
	}

	resp, err := dao.client.Do(req)
	if err != nil {
		fmt.Printf("Error making request to IMDB API: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch movie from IMDB: %s", resp.Status)
	}

	var imdbResponse models.ImdbResponse
	if err := json.NewDecoder(resp.Body).Decode(&imdbResponse); err != nil {
		fmt.Printf("Error decoding IMDB API response: %v\n", err)
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
		fmt.Printf("Error registering movie in database: %v\n", err)
		return nil, err
	}

	return databaseMovie, nil
}