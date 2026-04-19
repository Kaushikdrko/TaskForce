# TaskForce

**TaskForce** is an AI-powered calendar and task management web application. It provides multi-factor authentication, a rich interactive calendar dashboard, and a natural language AI chatbot that can create, edit, and delete tasks and events on your behalf.

> Built for **Dr. Smith's CS 3354 Software Engineering** course, this project followed a rigorous, industry-aligned SDLC from inception through delivery. Our team of four conducted stakeholder interviews to elicit requirements, produced a 50+ page Software Engineering Document (SED), and authored comprehensive artifacts including context diagrams, site maps, user flows, functional and non-functional requirements, use case models, and user stories. We evaluated architectural patterns — weighing MVC against monolithic and microservices designs — before committing to a distributed microservices architecture. Requirements were formally traced end-to-end using RTX/RTM matrices, with dedicated test cases mapped to every functional requirement, non-functional requirement, and user story to ensure full coverage and verifiable acceptance criteria.
>
> **Team:** Kaushik Shivakumar, Ansh Patel, Nathaniel Mateo Garcia, Akshitha Jakka

---

## Features

- **Multi-Factor Authentication** — Email/password login with TOTP-based MFA and Google OAuth via Supabase Auth
- **Interactive Calendar** — Month, week, and day views powered by FullCalendar; click any day to create an event, click an event to edit or delete it
- **Task Management** — Create, edit, and filter tasks by status, priority, due date, and folder; live right-panel shows today's events, current tasks, and upcoming 7-day view
- **AI Chatbot Agent** — Powered by Google Gemini 2.0 Flash; understands natural language to create tasks, schedule events, query your calendar, and suggest optimal time slots
- **Streaming Responses** — AI replies stream token-by-token over WebSocket with inline tool-call confirmation cards
- **Folders** — Organize events and tasks into color-coded folders
- **Settings** — Manage display name, timezone, work hours, focus time blocks, AI preferences, and submit support tickets
- **Real-time Updates** — Supabase Realtime subscriptions keep the calendar and task panel in sync across tabs
- **Rate Limiting & Security** — Per-user WebSocket rate limiting, JWT validation at three independent boundaries, RLS on all database tables

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + TailwindCSS + shadcn/ui |
| Calendar UI | FullCalendar.js |
| Core Backend | Spring Boot 3.x (Java 21) |
| AI Backend | FastAPI (Python 3.11+) |
| Database | Supabase (PostgreSQL + Realtime + Auth) |
| Vector Store | pgvector (inside Supabase) |
| AI Model | Google Gemini 2.0 Flash |
| Auth | Supabase Auth (MFA/TOTP + Google OAuth) |
| Notifications | Twilio (SMS + email reminders) |
| Containerization | Docker + Docker Compose |

---

## Project Structure

TaskForce uses a **microservices architecture** with three independently running services.

```
taskforce/
├── frontend/               # React + Vite app (port 5173)
│   └── src/
│       ├── components/     # auth/, dashboard/, chatbot/, settings/
│       ├── hooks/          # useCalendar, useChat (WebSocket), useRealtime
│       ├── lib/            # supabaseClient.ts, springApi.ts (axios + JWT)
│       ├── pages/          # LandingPage, Dashboard, ChatPage, SettingsPage
│       └── store/          # Zustand stores: authStore, calendarStore, chatStore
│
├── backend-spring/         # Spring Boot REST API (port 8080)
│   └── src/main/java/com/taskforce/
│       ├── auth/           # JwtFilter — ES256 + HS256 verification
│       ├── config/         # SecurityConfig, CorsConfig
│       ├── users/          # /api/users/me, schedule preferences
│       ├── calendar/       # /api/events CRUD
│       ├── tasks/          # /api/tasks CRUD
│       ├── folders/        # /api/folders CRUD
│       └── tickets/        # /api/tickets (support)
│
├── backend-ai/             # FastAPI AI service (port 8000)
│   ├── routers/chat.py     # WS /ai/ws/chat/{user_id} — streaming agent loop
│   ├── services/
│   │   ├── gemini_service.py   # Gemini Flash client, tool declarations, backoff
│   │   └── spring_client.py    # Forwards tool calls to Spring Boot with user JWT
│   └── db/supabase_client.py   # Loads and persists chat history
│
└── supabase/migrations/    # 001 schema, 002 pgvector, 003 RLS policies
```

---

## Prerequisites

- Node.js 18+
- Java 21 + Maven
- Python 3.11+
- A [Supabase](https://supabase.com) project with all 3 migrations applied
- A Google AI Studio API key (Gemini)
- A Google Cloud project (OAuth + Calendar API)

---

## Environment Setup

Copy `.env.example` to `.env` at the project root and fill in all values:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=
SPRING_BOOT_URL=http://localhost:8080
FASTAPI_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env` with Vite-prefixed vars:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SPRING_URL=http://localhost:8080
VITE_FASTAPI_WS_URL=ws://localhost:8000
```

Create `backend-spring/.env`:

```env
SUPABASE_JWT_SECRET=
SUPABASE_DB_PASSWORD=
SUPABASE_SERVICE_ROLE_KEY=
```

Create `backend-ai/.env`:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_JWKS_URL=https://<your-project>.supabase.co/auth/v1/.well-known/jwks.json
GEMINI_API_KEY=
SPRING_BOOT_URL=http://localhost:8080
FRONTEND_URL=http://localhost:5173
```

---

## Running Locally

Open three terminals:

```bash
# Terminal 1 — Spring Boot (from backend-spring/)
./mvnw spring-boot:run

# Terminal 2 — FastAPI (from backend-ai/)
.venv/bin/uvicorn main:app --reload --port 8000

# Terminal 3 — Frontend (from frontend/)
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

---

## Database Migrations

Run all three migrations in order from the Supabase SQL editor:

1. `supabase/migrations/001_initial_schema.sql` — core tables
2. `supabase/migrations/002_enable_pgvector.sql` — vector extension + embeddings table
3. `supabase/migrations/003_rls_policies.sql` — row-level security policies

Also enable the **pgvector** extension in your Supabase dashboard under Database → Extensions.
