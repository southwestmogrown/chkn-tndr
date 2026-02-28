# Tech Stack

This page explains every major technology choice in Chikn Tndr and why it was selected over the alternatives.

---

## Frontend

### React 18

**Why:** React's component model and ecosystem maturity make it the most defensible choice for a real-time, interactive UI with complex shared state. The concurrent features in React 18 (automatic batching, `useTransition`) are available even if not yet used, giving headroom for future optimisations.

**Alternatives considered:** Vue 3 (excellent DX, smaller bundle), SolidJS (finer-grained reactivity). React was chosen because the target audience (recruiters, collaborators) are most likely to be familiar with it.

---

### Vite

**Why:** Sub-second HMR and near-instant cold starts vs. Create React App's multi-second rebuilds. Native TypeScript support without extra config. Straightforward Docker build (`npm run build` → static files served by Nginx).

**Alternatives considered:** Next.js — rejected because server-side rendering adds no value for a real-time app that is entirely behind authentication; the added complexity is not justified.

---

### TypeScript (strict mode)

**Why:** Both the client and server are TypeScript with strict mode enabled. This catches the class of bugs (undefined properties, bad API response shapes, wrong event payloads) that are most likely in a real-time app where data flows across three layers (DB → REST → WebSocket → UI).

**Shared type discipline:** `ClientToServerEvents`, `ServerToClientEvents`, and `VoteTally` are defined in both `server/src/types/index.ts` and `client/src/types/index.ts`. A future improvement is extracting these into a shared package so a single source of truth is enforced at build time.

---

### Tailwind CSS

**Why:** Utility-first CSS removes the naming overhead of BEM/CSS Modules and keeps styles co-located with markup. The dark design theme (custom brand palette, glass morphism utilities) is expressed cleanly in `tailwind.config.ts` without a separate design-token layer.

**Alternatives considered:** CSS Modules (fine, but verbose for a single-developer project), styled-components (great DX, but runtime overhead and harder to tree-shake).

---

### Framer Motion

**Why:** The drag-to-swipe interaction is the core UX of the app. Framer Motion's `useMotionValue` + `useTransform` composition makes it possible to drive the NOPE/YUM badge opacity and card rotation directly from the drag offset with zero extra `useState` calls — the animation layer IS the state. Implementing this with raw CSS transitions or React Spring would require more imperative code.

---

### Zustand

**Why:** The session store (`session.store.ts`) needs to be updated from multiple sources simultaneously — the initial REST fetch, Socket.io events arriving in any order, and user interactions. Zustand's flat store with explicit action functions handles this cleanly without the boilerplate of Redux or the render-cascade risk of large Context values.

**Alternatives considered:** Redux Toolkit (overkill for the scope), Jotai (atom-per-field is better suited to fine-grained form state than to a session state machine).

---

### TanStack Query

**Why:** Handles the initial session fetch with a single hook (`useQuery`), giving automatic loading/error states, background refetch control (`staleTime: Infinity` to suppress re-fetching a session that is being managed by sockets), and request deduplication. Eliminates the need for manual loading/error state in each component.

---

## Backend

### Node.js + Express

**Why:** TypeScript on both sides of the wire means the team (or future contributors) only needs to context-switch between client and server code, not between languages. Express is minimal and well-understood; the small surface area is an advantage for a project of this scope.

**Alternatives considered:** Fastify (marginally faster, but the Socket.io integration story is slightly more involved), NestJS (full-featured but introduces heavy abstractions that add learning curve without proportional benefit here).

---

### Socket.io

**Why:** Socket.io handles the parts of WebSockets that are painful to implement from scratch: automatic reconnection, room-based broadcasting, and graceful fallback to HTTP long-polling in restrictive network environments. The typed generic parameters (`Server<ClientToServerEvents, ServerToClientEvents, ...>`) make the event bus as type-safe as the REST layer.

**Alternatives considered:** Raw `ws` library (lighter, but no rooms or reconnection logic), Server-Sent Events (one-directional; not suitable for the client-to-server vote events).

---

### PostgreSQL + Prisma

**Why (PostgreSQL):** A relational database is the right fit for a schema with strong referential integrity requirements: votes must reference both a valid session *and* a valid user and restaurant; the unique constraint on `(sessionId, restaurantId, userId)` prevents double-votes at the DB layer, not just the application layer.

**Why (Prisma):** Prisma generates a fully-typed query client from the schema, giving autocomplete on every DB query and catching missing fields at compile time. The migration workflow (`prisma migrate dev`) is clean and the visual Studio tool (`npx prisma studio`) accelerates debugging.

**Alternatives considered:** Drizzle ORM (equally type-safe, lighter, excellent if starting fresh today), TypeORM (decorator-heavy, slower query build times), raw `pg` (full control but no type generation).

---

### JWT Authentication

**Why:** JWTs are stateless — the server doesn't need to maintain a session store to validate a user. This is particularly useful for Socket.io authentication, where the token can be passed in the first `session:join` event payload rather than requiring cookie-based sessions.

**Security notes:**
- Passwords are hashed with `bcryptjs` (default 10 salt rounds)
- `helmet()` sets `Content-Security-Policy`, `X-Frame-Options`, and other security headers
- Rate limiting (200 req / 15 min) is applied to the `/api` prefix

---

## Infrastructure

### Docker Compose

**Why:** Docker Compose makes the development environment reproducible — any contributor can run `npm run db:up` and have a local PostgreSQL instance in seconds without installing the database server natively. The `full` profile builds production-grade images for the API and client using multi-stage Dockerfiles, enabling single-command full-stack deployments to any Docker host.

---

## External API

### Google Places API (Nearby Search + Place Photos)

**Why:** Google Places provides the richest combination of restaurant data (name, address, rating, price level, opening hours) and photos available via a single API. The data quality and global coverage are unmatched for this use case.

**Cost mitigation:** Restaurant records are cached in the `restaurants` table via Prisma `upsert`. A second session near the same area reuses the cached rows, avoiding redundant Nearby Search requests. The $200/month free credit covers thousands of searches during development.

**Alternatives considered:** Foursquare Places API (good coverage, lower cost), Yelp Fusion (strong US coverage, strict ToS around caching), OpenStreetMap/Overpass (free, but data quality is inconsistent for restaurant discovery).
