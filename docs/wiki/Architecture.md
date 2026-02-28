# Architecture

This page describes the high-level system design of Chikn Tndr, the data flow for a typical session, and the major components at each layer.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React 18)                       │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Auth.tsx │  │ Home.tsx │  │Session.tsx │  │ ResultsScr. │  │
│  └────┬─────┘  └────┬─────┘  └──────┬─────┘  └──────┬──────┘  │
│       │             │               │                │          │
│  ┌────▼─────────────▼───────────────▼────────────────▼──────┐  │
│  │                     Zustand Stores                        │  │
│  │               auth.store · session.store                  │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────────┐  │
│  │          TanStack Query (HTTP) + useSocket (WS)           │  │
│  │               services/api.ts  │  hooks/useSocket.ts      │  │
│  └────────────────┬───────────────┴──────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────────┘
                    │  HTTP (Axios)          WebSocket (Socket.io)
                    │
┌───────────────────▼──────────────────────────────────────────────┐
│                     Node.js / Express Server                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  REST API layer                                            │  │
│  │  /api/auth  ·  /api/groups  ·  /api/sessions              │  │
│  │  + JWT middleware  +  rate limiter (200 req/15 min)        │  │
│  └──────────────────────────────┬─────────────────────────────┘  │
│                                 │                                 │
│  ┌──────────────────────────────▼─────────────────────────────┐  │
│  │  Service layer                                              │  │
│  │  sessionService  ·  placesService                          │  │
│  └──────────────────────────────┬─────────────────────────────┘  │
│                                 │                                 │
│  ┌──────────────────────────────▼─────────────────────────────┐  │
│  │  Socket.io server                                          │  │
│  │  registerSessionSocket(io)                                 │  │
│  │  rooms: session:{sessionId}                                │  │
│  │  in-memory: readySets Map<sessionId, Set<userId>>          │  │
│  └──────────────────────────────┬─────────────────────────────┘  │
│                                 │                                 │
│  ┌──────────────────────────────▼─────────────────────────────┐  │
│  │  Prisma ORM  →  PostgreSQL                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                    │  HTTPS
                    ▼
        Google Places API
        (Nearby Search + Place Photos)
```

---

## Data Flow: Complete Session Lifecycle

```
User A (owner)                Server                    User B
─────────────────────────────────────────────────────────────────

POST /api/sessions  ───────►  placesService.getNearby()
                              └─► Google Places API
                              └─► upsert restaurants
                   ◄───────── { sessionId, restaurants[] }

WS: session:join   ───────►  verify JWT
                              join room session:{id}
                   ◄───────── (session:memberJoined) ──────────► User B

WS: session:ready  ───────►  readySets.get(id).add(userId)
                              check readyCount >= totalCount
                   ◄───────── (session:memberReady) ───────────► User B

                              [all ready]
                              sessionService.startSession()
                   ◄───────── (session:started) ───────────────► User B

WS: session:vote   ───────►  sessionService.castVote()
POST /api/.../vote ───────►  (parallel HTTP persist)
                              check all members voted on all cards
                              if done → sessionService.completeSession()
                   ◄───────── (session:complete { winner, tally }) ► User B
```

---

## Frontend Architecture

### Component Hierarchy

```
App (React Router)
├── Auth.tsx               — Login / Register form
├── Home.tsx               — Group management + session launcher
└── Session.tsx            — Orchestrates lobby → swipe → results
    ├── GroupLobby.tsx     — Pre-game waiting room, ready tracking
    ├── CardStack.tsx      — Stacked deck + Yum/Nope action buttons
    │   └── SwipeCard.tsx  — Individual animated restaurant card
    └── ResultsScreen.tsx  — Winner hero + full vote tally
```

### State Management

Two Zustand stores handle all client-side state:

**`auth.store`** — user identity  
- `user: { id, email, displayName }` persisted in `localStorage`
- `token: string` — JWT token sent with every API call

**`session.store`** — active session  
- `session` — full session object including restaurant array
- `currentCardIndex` — which card in the stack is on top
- `readyState` — latest `session:memberReady` payload for lobby countdown
- `isStarted / isComplete / winner / tally` — phase flags set by socket events
- `yesCountMap` — live yes-vote counts keyed by `restaurantId`

### Data Fetching

[TanStack Query](https://tanstack.com/query) handles the initial session fetch with `staleTime: Infinity` — the session data is treated as immutable once loaded, with all subsequent updates arriving via Socket.io.

---

## Backend Architecture

### Service Layer

All business logic is encapsulated in two services:

**`sessionService`** (`server/src/services/session.service.ts`)  
- `startSession(sessionId)` — transitions status `LOBBY → SWIPING`
- `castVote(sessionId, restaurantId, userId, direction)` — upserts vote, throws on duplicate
- `hasUserVotedOnAll(sessionId, userId)` — checks whether a member has voted on every restaurant
- `completeSession(sessionId)` — tallies votes, picks winner, transitions to `COMPLETE`
- `getYesCount(sessionId, restaurantId)` — aggregate for live vote counter

**`placesService`** (`server/src/services/places.service.ts`)  
- `getNearbyRestaurants(lat, lng, radius, limit)` — calls Google Places, shuffles, upserts into DB
- `resolvePhotoUrl(photoReference)` — constructs a signed Google Place Photos URL

### Socket.io Room Strategy

Each session gets one Socket.io room: `session:{sessionId}`.

The in-memory `readySets` map (`Map<sessionId, Set<userId>>`) tracks who has clicked "I'm Ready!" per session. This map is local to the server process — a known limitation that would require Redis in a horizontally scaled deployment.

---

## Database Schema

```
users ──┐
        ├─< group_members >─── groups ─< sessions ─< session_restaurants >── restaurants
        │                                    │
        └─────────────────────────────────< votes >──────────────────────────┘
```

Key constraints:
- `votes.@@unique([sessionId, restaurantId, userId])` — one vote per user per restaurant per session
- `session_restaurants.@@unique([sessionId, restaurantId])` — no duplicate cards in a deck
- All foreign keys with `onDelete: Cascade` for clean session/group teardown

See the [full schema](../../server/prisma/schema.prisma) for field-level details.

---

## Security Model

| Layer | Mechanism |
|---|---|
| HTTP endpoints | JWT Bearer token validated by `authMiddleware` |
| Socket.io events | JWT verified inline on `session:join`; `socket.data.userId` set for subsequent events |
| Passwords | bcryptjs with default salt rounds (10) |
| HTTP headers | `helmet()` sets standard security headers |
| Rate limiting | `express-rate-limit` — 200 requests per 15-minute window per IP on `/api` |
| CORS | Restricted to `CLIENT_ORIGIN` env var |

---

## Known Architectural Trade-offs

| Trade-off | Current State | Upgrade Path |
|---|---|---|
| Ready-sets in memory | Lost on server restart; not horizontally scalable | Replace `Map` with Redis `SADD`/`SCARD` |
| Photo URLs in DB | Google-signed URLs expire; `photoUrl` column stores the full signed URL | Store only `photoReference`; resolve URL at request time or use a CDN proxy |
| No WebSocket auth refresh | Token expiry during a long session disconnects the user silently | Add socket reconnect logic with token refresh |
