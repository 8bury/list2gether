# 📽️ list2gether

> **Note**: This project is being built with the help of AI agents.

A collaborative movie list web app for couples and friends to track movies they want to watch together.

## Features

- **Authentication**: User registration and login with JWT tokens and automatic refresh token rotation
- **Collaborative Lists**: Create and share movie/TV lists using invite codes
- **Movie Search**: Search movies and TV series via TMDB API integration
- **Watch Status Tracking**: Track movies as not watched, watching, watched, or dropped
- **Personal Data**: Add ratings (1-10) and personal notes for each movie
- **Drag & Drop**: Reorder movies in your lists
- **Comments**: Discuss movies with list members
- **Watch Providers**: See where movies/shows are available to stream, rent, or buy
- **Recommendations**: Get personalized movie suggestions based on your lists
- **Multi-language**: Support for English and Portuguese
- **Role-Based Permissions**: Owner and participant roles with different access levels

## Tech Stack

- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS, Radix UI, React Router, i18next
- **Backend**: Go 1.24 + Gin framework
- **Database**: MySQL + GORM ORM
- **Authentication**: JWT with refresh token rotation
- **Drag & Drop**: @dnd-kit library
- **External APIs**: TMDB (movies, TV shows, watch providers)

## Setup

### Prerequisites
- Go 1.24+
- Node.js 18+
- MySQL
- TMDB API key

### Backend

1. Navigate to the backend directory:
```bash
cd backend
go mod tidy
```

2. Create a `.env` file with the following variables:
```env
DB_DSN=user:password@tcp(localhost:3306)/database_name
JWT_SECRET=your_secret_key
TMDB_API_TOKEN=your_tmdb_api_key
FRONTEND_ORIGIN=http://localhost:5173
PORT=8080
```

3. Run the server:
```bash
go run main.go
```

The backend will run on `http://localhost:8080` and automatically handle database migrations.

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
npm install
```

2. Create a `.env` file (optional, uses defaults if not provided):
```env
VITE_API_BASE_URL=http://localhost:8080
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`.

## Local Scripts (Windows)

To simplify local setup and tests, use:

```powershell
.\scripts\local.cmd help
```

Main commands:

```powershell
.\scripts\local.cmd setup
.\scripts\local.cmd backend-ci
.\scripts\local.cmd frontend-ci
.\scripts\local.cmd ci
.\scripts\local.cmd dev
```

Notes:
- `setup` installs backend and frontend dependencies.
- `backend-ci` runs backend tests with race detector and coverage.
- `frontend-ci` runs frontend lint and production build.
- `ci` runs both backend and frontend checks.
- `dev` opens backend and frontend in separate PowerShell windows.
