# 📽️ list2gether

A collaborative movie list web app for couples (or friends) to track and organize what they want to watch together — with movie info automatically fetched from IMDb.

## 🧠 Project Idea

**list2gether** allows two people to share a movie watchlist using a unique code. Users can add movie titles, and the app fetches details like poster, IMDb rating, and year automatically. They can mark movies as *Not Watched*, *Watching*, or *Watched*.

This project is currently a personal project under development in my spare time.

---

## ✨ Features (MVP)

- Add movies by title (auto-filled with IMDb info)
- View shared list with posters, title, and status
- Mark movies as Watched / Not Watched / Watching
- Access list using a unique code (no login required)
- Responsive layout for mobile and desktop

---

## 🔧 Tech Stack

| Layer       | Technology         |
|-------------|--------------------|
| Frontend    | React, Tailwind CSS |
| Backend     | Golang (Gin) |
| Database    | MySQL              |
| External API| [OMDb API](http://www.omdbapi.com/) for IMDb info |

---

## 📁 Project Structure

list2gether/
├── backend/        # Golang backend (API, DB)
├── frontend/       # React frontend
├── .env            # Environment variables (local setup)
├── README.md       # This file

---

## 📌 To-Do (MVP Checklist)

* [ ] Backend API: create/read/update/delete movies
* [ ] Fetch and cache OMDb info
* [ ] Generate/join shared list via code
* [ ] Frontend interface with list view and status toggles
* [ ] Basic mobile responsiveness
* [ ] Project logo and favicon

---

## 🧠 Future Ideas

* Notes/comments for each movie
* Multiple lists per user
* Authentication
* Search and filter by rating/status
* Movie trailers

---