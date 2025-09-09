# 📽️ list2gether

A collaborative movie list web app for couples and friends to track movies they want to watch together.

## Features

- User registration and authentication
- Create and share movie lists with invite codes
- Search movies and TV shows (TMDB API)
- Track watching status and add personal ratings/notes
- Role-based permissions (owner/participant)

## Tech Stack

- **Frontend**: React + TypeScript, Tailwind CSS
- **Backend**: Go + Gin framework
- **Database**: MySQL + GORM
- **Authentication**: JWT tokens
- **External API**: TMDB

## Setup

### Prerequisites
- Go 1.24+
- Node.js 18+
- MySQL
- TMDB API key

### Backend
```bash
cd backend
go mod tidy
# Create .env with DB_DSN, TMDB_API_TOKEN, JWT_SECRET
go run main.go
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

**Auth**: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`  
**Lists**: `/api/lists` (GET/POST), `/api/lists/join`, `/api/lists/:id` (DELETE)  
**Movies**: `/api/lists/:id/movies` (GET/POST), `/api/lists/:id/movies/:movieId` (PATCH/DELETE)  
**Search**: `/api/search/media`