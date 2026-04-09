# LocalPulse

LocalPulse is a Bangladesh location-based community reporting platform where users can publish local updates, browse nearby posts on a map, and track area-specific issues.

## Tech stack

- Frontend: React + Vite + React Router + Zustand + Leaflet
- Backend: Node.js + Express + MongoDB (Mongoose)
- Media uploads: Cloudinary
- Authentication: JWT (Bearer token)

## Project structure

```text
LocalPulse/
  backend/     # Express API, Mongo models, controllers, routes
  frontend/    # React client app
```

## Features

- User authentication (register/login/me)
- Create posts with:
  - category + severity
  - Bangladesh location hierarchy (division/district/upazila/union)
  - landmark + GeoJSON coordinates
  - optional image uploads
- Feed and map-based discovery with:
  - nearby radius filtering
  - administrative area filtering
  - category/severity/resolution filtering
- Post interactions:
  - upvote/downvote
  - comments
  - resolve/unresolve (author)
- User profile:
  - editable profile
  - watched areas

## Prerequisites

- Node.js 18+
- npm
- MongoDB (local or Atlas)
- Cloudinary account (for image uploads)

## Environment variables

### Backend (`backend/.env`)

Copy from `backend/.env.example` and set values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/localpulse
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`frontend/.env`)

Copy from `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:5000
```

## Getting started

Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Run backend:

```bash
cd backend
npm run dev
```

Run frontend:

```bash
cd frontend
npm run dev
```

Open the app at the Vite URL (usually `http://localhost:5173`).

## Useful scripts

### Backend

- `npm run dev` — start backend with nodemon
- `npm start` — start backend
- `npm run seed:demo-posts` — create demo posts across districts for presentation

### Frontend

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## API overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (protected)

### Posts

- `GET /api/posts`
- `GET /api/posts/stats`
- `POST /api/posts` (protected)
- `GET /api/posts/:id`
- `PATCH /api/posts/:id` (protected, author only)
- `DELETE /api/posts/:id` (protected, author only)
- `POST /api/posts/:id/vote` (protected)
- `PATCH /api/posts/:id/resolve` (protected, author only)
- `GET /api/posts/:id/comments`
- `POST /api/posts/:id/comments` (protected)

### Users

- `GET /api/users/:id`
- `PATCH /api/users/:id` (protected, own profile)
- `POST /api/users/:id/watched-areas` (protected)
- `DELETE /api/users/:id/watched-areas/:index` (protected)

### Comments

- `DELETE /api/comments/:id` (protected, author only)

## Notes

- Bangladesh location JSON data is stored in `frontend/src/utils/bd/`.
- If map/feed data appears empty after setup, verify backend is running and `VITE_API_URL` is correct.
