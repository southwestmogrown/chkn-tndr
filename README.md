# 🍗 Chikn Tndr

> _Swipe right on dinner. Left on regret._

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socketdotio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Chikn Tndr is a real-time, multiplayer "where should we eat?" game that brings Tinder-style swiping to the age-old group dinner dilemma.

Users form a group, each member swipes through local restaurant cards fetched from Google Places, and the restaurant with the most "Yum!" votes wins.

---

## ✨ Features

| Feature      | Details                                                        |
| ------------ | -------------------------------------------------------------- |
| 🔐 Auth      | JWT-based register / login                                     |
| 👥 Groups    | Create or join via 8-char invite codes                         |
| 📍 Location  | Browser geolocation or manual lat/lng                          |
| 🍽️ Discovery | Google Places Nearby Search — up to 20 restaurants per session |
| 📸 Photos    | Rich cards with Google Places Photos                           |
| ⭐ Ratings   | Star ratings, review count, price level                        |
| 👆 Swipe     | Drag-to-swipe with Framer Motion (or tap ✗ / ♥ buttons)        |
| ⚡ Real-time | Socket.io — live "ready" tracking & vote counter               |
| 🏆 Results   | Animated winner reveal + full tally with approval % bars       |
| 🐳 Docker    | One-command Postgres + optional full-stack containers          |

---

## 🗂 Project Structure

```
chikn-tndr/
├── server/                  # Node.js + Express + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma    # Postgres schema (Users, Groups, Sessions, Votes…)
│   │   └── seed.ts          # Demo data
│   └── src/
│       ├── config/          # env.ts, logger.ts
│       ├── db/              # Prisma client singleton
│       ├── middleware/       # JWT auth guard
│       ├── routes/          # auth / groups / sessions REST endpoints
│       ├── services/        # places.service.ts, session.service.ts
│       ├── socket/          # Socket.io real-time handlers
│       └── index.ts         # Express + Socket.io server boot
│
└── client/                  # React 18 + Vite + TypeScript
    └── src/
        ├── components/
        │   ├── SwipeCard.tsx    # Animated drag card
        │   ├── CardStack.tsx    # Stacked card deck + action buttons
        │   ├── GroupLobby.tsx   # Pre-game waiting room
        │   └── ResultsScreen.tsx # Winner reveal + full tally
        ├── hooks/
        │   ├── useSocket.ts     # Socket.io connection + event dispatch
        │   └── useSwipe.ts      # Framer Motion drag-to-swipe logic
        ├── pages/
        │   ├── Auth.tsx         # Login / Register
        │   ├── Home.tsx         # Group management + session launcher
        │   └── Session.tsx      # Lobby → Swiping → Results orchestrator
        ├── services/api.ts      # Axios API client
        └── store/               # Zustand: auth.store, session.store
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- Docker (for PostgreSQL)
- A [Google Maps Platform](https://console.cloud.google.com/apis) API key  
  Enable: **Places API**, **Maps JavaScript API**, **Place Photos**

### 1 — Clone & install

```bash
git clone <repo-url> chikn-tndr
cd chikn-tndr
npm install          # installs root dev tools (concurrently, etc.)
npm run install:all  # installs server + client dependencies
```

### 2 — Configure the backend

```bash
cp server/.env.example server/.env
# Edit server/.env and fill in:
#   GOOGLE_PLACES_API_KEY=...
#   JWT_SECRET=...          (generate a long random string)
```

### 3 — Start Postgres

```bash
npm run db:up          # spins up postgres container
npm run db:migrate     # runs Prisma migrations
npm run db:seed        # seeds demo users (optional)
```

### 4 — Run in development

```bash
npm run dev
# API  → http://localhost:4000
# App  → http://localhost:5173
```

---

## 🗃 Database Schema

```
users ──┐
        ├─< group_members >─── groups ─< sessions ─< session_restaurants >── restaurants
        │                                    │
        └─────────────────────────────────< votes >──────────────────────────┘
```

| Table                 | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `users`               | Accounts with hashed passwords                         |
| `groups`              | Named groups with unique invite codes                  |
| `group_members`       | M:M between users and groups                           |
| `sessions`            | One swiping round per group, tied to a location        |
| `restaurants`         | Google Places data cached locally                      |
| `session_restaurants` | Which restaurants are in a session                     |
| `votes`               | Each user's LEFT/RIGHT vote per restaurant per session |

**Session lifecycle:** `LOBBY` → `SWIPING` → `TALLYING` → `COMPLETE`

---

## 🔌 API Reference

### Auth

| Method | Path                 | Body                             | Description                  |
| ------ | -------------------- | -------------------------------- | ---------------------------- |
| POST   | `/api/auth/register` | `{email, password, displayName}` | Create account               |
| POST   | `/api/auth/login`    | `{email, password}`              | Get JWT token                |
| GET    | `/api/auth/me`       | —                                | Current user (auth required) |

### Groups

| Method | Path                    | Body           | Description    |
| ------ | ----------------------- | -------------- | -------------- |
| GET    | `/api/groups`           | —              | List my groups |
| POST   | `/api/groups`           | `{name}`       | Create group   |
| POST   | `/api/groups/join`      | `{inviteCode}` | Join by code   |
| GET    | `/api/groups/:id`       | —              | Group detail   |
| DELETE | `/api/groups/:id/leave` | —              | Leave group    |

### Sessions

| Method | Path                      | Body                                            | Description               |
| ------ | ------------------------- | ----------------------------------------------- | ------------------------- |
| POST   | `/api/sessions`           | `{groupId, latitude, longitude, radiusMeters?}` | Create + populate session |
| GET    | `/api/sessions/:id`       | —                                               | Session + card stack      |
| POST   | `/api/sessions/:id/vote`  | `{restaurantId, direction}`                     | Cast vote                 |
| GET    | `/api/sessions/:id/tally` | —                                               | Current vote tally        |

### Socket.io Events

| Direction | Event                  | Payload                                |
| --------- | ---------------------- | -------------------------------------- |
| C→S       | `session:join`         | `{sessionId, token}`                   |
| C→S       | `session:ready`        | `{sessionId}`                          |
| C→S       | `session:vote`         | `{sessionId, restaurantId, direction}` |
| C→S       | `session:leave`        | `{sessionId}`                          |
| S→C       | `session:memberJoined` | `{userId, displayName}`                |
| S→C       | `session:memberLeft`   | `{userId}`                             |
| S→C       | `session:memberReady`  | `{userId, readyCount, totalCount}`     |
| S→C       | `session:started`      | `{sessionId}`                          |
| S→C       | `session:voteReceived` | `{restaurantId, yesCount}`             |
| S→C       | `session:complete`     | `{winner, tally}`                      |
| S→C       | `session:error`        | `{message}`                            |

---

## 🛻 How A Round Works

```
1. Owner creates a session (group + location)
2. All members open the session link / share inviteCode
3. Everyone taps "I'm Ready!" in the lobby
4. When all ready → session auto-starts (SWIPING)
5. Each member swipes through all cards independently
6. After every member has voted on every restaurant → tallying runs
7. Winner = most RIGHT (❤️) votes, ties broken by % approval
8. Results screen reveals winner + full podium with vote bars
```

---

## 🎨 Tech Stack

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Frontend         | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion |
| State            | Zustand, TanStack Query                                 |
| Real-time        | Socket.io (client + server)                             |
| Backend          | Node.js, Express, TypeScript                            |
| Database         | PostgreSQL via Prisma ORM                               |
| Auth             | JWT (jsonwebtoken + bcryptjs)                           |
| External API     | Google Places API (Nearby Search + Photos)              |
| Containerisation | Docker Compose                                          |

---

## 🔑 Google Places API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → **APIs & Services** → **Enable APIs**
3. Enable:
   - **Places API** (legacy — for `nearbysearch` and `place/photo`)
   - or **Places API (New)** if using v1 endpoints
4. Create an API key under **Credentials**
5. Restrict the key to:
   - `Places API`, `Maps JavaScript API`
   - IP restriction for server key
   - HTTP referrer restriction for client key
6. Paste into `server/.env` as `GOOGLE_PLACES_API_KEY`

> **Billing note:** Nearby Search costs ~$0.032/request, Place Photos ~$0.007/photo.  
> For development, the free tier ($200/month credit) covers thousands of requests.

---

## 🐳 Docker (full stack)

```bash
# Start everything (Postgres + API + Client)
docker compose --profile full up --build

# Postgres only (for local dev)
docker compose up postgres -d
```

---

## 🗺 Roadmap

- [ ] Push notifications (native mobile via PWA)
- [ ] Session timer — auto-start after N seconds in lobby
- [ ] Filter by cuisine, price, rating before swiping
- [ ] Party mode — live emoji reactions as votes come in
- [ ] History — past session results per group
- [ ] OAuth (Google Sign-In)
- [ ] Share winner card to Instagram Stories

---

## 🏅 Portfolio Highlights

Key engineering decisions worth calling out in interviews and portfolio write-ups:

| Topic | Detail |
|---|---|
| **Real-time architecture** | Socket.io rooms scoped per session; in-memory ready-sets track per-session lobby state without polling |
| **Consistent vote tallying** | `@@unique([sessionId, restaurantId, userId])` constraint at the DB layer prevents double-votes even if a socket event is replayed |
| **Optimistic UX** | Vote is emitted via socket *and* persisted via REST in parallel; the card advances immediately so latency is invisible to the user |
| **Google Places caching** | Restaurant rows are upserted on every session so subsequent sessions near the same area reuse cached records, cutting API spend |
| **Type-safe event bus** | Socket.io is instantiated with four explicit generic type parameters (`ClientToServerEvents`, `ServerToClientEvents`, …), giving full IDE autocomplete on both ends |
| **Drag physics** | Framer Motion `useMotionValue` + `useTransform` drive the NOPE/YUM badge opacity in sync with the drag offset — zero extra state |
| **Atomic session lifecycle** | Session progresses through `LOBBY → SWIPING → TALLYING → COMPLETE` as an enum; all transitions happen in a single `sessionService` so business logic is never spread across routes and sockets |

---

## 💡 Portfolio Improvement Suggestions

The following improvements would significantly strengthen this project for recruiters and technical interviewers:

### High Impact
1. **Add a CI/CD pipeline** — A GitHub Actions workflow that runs lint + build on every PR immediately signals professional habits. Add a badge to the README.
2. **Add a screenshot / demo GIF** — Recruiters spend ≤10 seconds per project. A single animated GIF showing the swipe UX at the top of the README captures attention instantly.
3. **Add a live demo** — Deploy the stack to Fly.io, Railway, or Render (they all support Docker Compose). A "Try it live" button in the README dramatically increases engagement.
4. **Add automated tests** — Even a small Vitest/Jest suite for `sessionService`, `placesService`, and the swipe hook demonstrates quality awareness. Target ≥60% coverage of the business-logic layer.

### Medium Impact
5. **Add an architecture diagram** — An excalidraw or draw.io SVG committed to `docs/` and embedded in the README replaces 500 words of explanation.
6. **Add env-var validation** — Validate `server/.env` at startup with Zod so the app fails fast with a clear error instead of a cryptic runtime crash.
7. **Replace in-memory ready-sets with Redis** — The current `Map<string, Set<string>>` in `session.socket.ts` is lost on server restart and cannot scale horizontally. Mentioning this limitation *and* the Redis upgrade path in the README shows architectural maturity.
8. **Add an error boundary** — A React `ErrorBoundary` around the session page keeps a single failed component from crashing the whole app.

### Nice to Have
9. **Seed realistic demo data** — Extend `prisma/seed.ts` with ≥3 demo users, a group, and a completed session so reviewers can explore the app without needing a Google API key.
10. **Add OpenAPI / Swagger docs** — A `swagger.yaml` or `@swagger-jsdoc` annotations make the API instantly explorable and signal backend thoroughness.

---

## 📚 Wiki

Detailed documentation lives in [`docs/wiki/`](docs/wiki/):

| Page | Description |
|---|---|
| [Home](docs/wiki/Home.md) | Project overview and quick navigation |
| [Architecture](docs/wiki/Architecture.md) | System design, data flow, component map |
| [API Reference](docs/wiki/API-Reference.md) | Full REST + Socket.io reference with examples |
| [Development Guide](docs/wiki/Development-Guide.md) | Local setup, environment variables, workflow |
| [Deployment](docs/wiki/Deployment.md) | Docker Compose and production deployment |
| [Tech Stack](docs/wiki/Tech-Stack.md) | Technology choices and rationale |
| [Real-Time Events](docs/wiki/Real-Time-Events.md) | Socket.io event catalogue |

---

## 📄 License

MIT — go eat something good.
