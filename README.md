# ProjectFlow

Production-grade multi-tenant project management SaaS application.

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Lucide React, Recharts

**Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose, Redis, JWT auth with RBAC

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (optional — app runs with mock data on frontend)
- Redis (optional — server degrades gracefully without it)

### Frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

### Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

API runs on http://localhost:3001

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user + organization |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh tokens |
| GET | `/api/auth/me` | Current user |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Project details |
| GET | `/api/tasks` | List tasks |
| GET | `/api/dashboard/stats` | Dashboard KPIs |

## Project Structure

```
client/          React frontend
  src/
    components/  Reusable UI + layout
    pages/       Route pages
    types/       TypeScript interfaces
    data/        Mock data (swap for API)
server/          Express API
  src/
    models/      Mongoose schemas
    routes/      API routes
    controllers/ Business logic
    middleware/  Auth + RBAC
```

## Routes

- `/dashboard` — Overview with KPIs, charts, activity
- `/projects` — Project list with filters
- `/projects/:id` — Project details
- `/tasks` — Kanban board
- `/team` — Team members
- `/notifications` — Notifications
- `/settings` — Organization settings
