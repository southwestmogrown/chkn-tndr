# Development Guide

Step-by-step instructions for getting Chikn Tndr running locally and contributing code.

---

## Prerequisites

| Tool | Minimum version | Install |
|---|---|---|
| Node.js | 20 | [nodejs.org](https://nodejs.org) |
| npm | 10 | bundled with Node.js 20 |
| Docker + Docker Compose | v2 | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Google Maps API key | — | [console.cloud.google.com](https://console.cloud.google.com) |

---

## 1 — Clone and install

```bash
git clone https://github.com/southwestmogrown/chkn-tndr.git
cd chkn-tndr

npm install           # root dev tools (concurrently)
npm run install:all   # installs server/ + client/ dependencies
```

---

## 2 — Configure the backend

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in the required values:

```env
# ─── Server ───────────────────────────────────────────
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

# ─── Database ─────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chkn_tndr

# ─── Auth ─────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=replace_me_with_a_long_random_string
JWT_EXPIRES_IN=7d

# ─── Google Places ────────────────────────────────────
GOOGLE_PLACES_API_KEY=your_key_here
```

### Getting a Google Places API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Navigate to **APIs & Services → Library**
4. Enable **Places API** (legacy — for `nearbysearch` and `place/photo` endpoints)
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. Optionally restrict the key to the Places API and to your server IP
7. Copy the key into `server/.env`

> **Cost note:** The $200/month free tier comfortably covers development usage. Nearby Search costs ~$0.032/request; Place Photos ~$0.007/photo.

---

## 3 — Start PostgreSQL

```bash
npm run db:up        # docker compose up postgres -d
npm run db:migrate   # prisma migrate dev
npm run db:seed      # optional: load demo users
```

To open Prisma Studio (visual DB browser):

```bash
npm run db:studio
```

---

## 4 — Run in development

```bash
npm run dev
```

This starts both processes with colour-coded output via `concurrently`:

| Process | URL |
|---|---|
| API (Express + Socket.io) | http://localhost:4000 |
| Client (Vite) | http://localhost:5173 |

---

## Environment Variables Reference

### Server (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `4000` | HTTP port |
| `CLIENT_ORIGIN` | Yes | — | CORS allowed origin |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | HMAC-SHA256 signing secret (≥32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry (e.g. `1h`, `7d`) |
| `GOOGLE_PLACES_API_KEY` | Yes | — | Google Places API key |

---

## Project Structure

```
chkn-tndr/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema
│   │   ├── seed.ts              # Demo data loader
│   │   └── migrations/          # Prisma migration history
│   └── src/
│       ├── config/
│       │   ├── env.ts           # Typed env-var access
│       │   └── logger.ts        # Pino logger setup
│       ├── db/
│       │   └── prisma.ts        # Prisma client singleton
│       ├── middleware/
│       │   └── auth.middleware.ts  # JWT verify guard
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── group.routes.ts
│       │   └── session.routes.ts
│       ├── services/
│       │   ├── places.service.ts   # Google Places wrapper
│       │   └── session.service.ts  # Core session business logic
│       ├── socket/
│       │   └── session.socket.ts   # Socket.io event handlers
│       ├── types/
│       │   └── index.ts            # Shared TypeScript types
│       └── index.ts               # Server entry point
│
└── client/
    └── src/
        ├── components/
        │   ├── CardStack.tsx        # Card deck + Yum/Nope buttons
        │   ├── GroupLobby.tsx       # Pre-game lobby
        │   ├── Header.tsx           # Top nav bar
        │   ├── ResultsScreen.tsx    # Winner reveal + tally
        │   └── SwipeCard.tsx        # Animated drag card
        ├── hooks/
        │   ├── useSocket.ts         # Socket.io connection + dispatch
        │   └── useSwipe.ts          # Framer Motion drag-to-swipe
        ├── pages/
        │   ├── Auth.tsx             # Login / Register
        │   ├── Home.tsx             # Group management
        │   └── Session.tsx          # Session orchestrator
        ├── services/
        │   └── api.ts               # Axios API client
        ├── store/
        │   ├── auth.store.ts        # Zustand: user + JWT
        │   └── session.store.ts     # Zustand: active session state
        └── types/
            └── index.ts             # Shared frontend types
```

---

## Common Development Commands

```bash
# Server only
npm run dev --prefix server

# Client only
npm run dev --prefix client

# Full build (CI)
npm run build

# Prisma migrate (after schema changes)
npm run db:migrate

# Prisma generate (after schema changes, without migration)
cd server && npx prisma generate

# Prisma Studio
npm run db:studio

# Lint (server)
cd server && npx tsc --noEmit

# Lint (client)
cd client && npx tsc --noEmit
```

---

## Adding a New API Route

1. Create `server/src/routes/my-feature.routes.ts`
2. Define Express routes using `authMiddleware` where needed
3. Import and register in `server/src/index.ts`:
   ```ts
   import myFeatureRoutes from './routes/my-feature.routes';
   app.use('/api/my-feature', myFeatureRoutes);
   ```
4. Add business logic to a new or existing service in `server/src/services/`

---

## Adding a New Socket.io Event

1. Add the event name and payload type to `server/src/types/index.ts` under `ClientToServerEvents` or `ServerToClientEvents`
2. Add the handler in `server/src/socket/session.socket.ts`
3. Mirror the types in `client/src/types/index.ts` (or share via a monorepo package)
4. Call `socket.emit(...)` or listen with `socket.on(...)` in `client/src/hooks/useSocket.ts`
