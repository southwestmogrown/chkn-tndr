# Deployment

Instructions for running Chikn Tndr in a production-like environment using Docker Compose, and notes on cloud deployment options.

---

## Docker Compose Profiles

The `docker-compose.yml` supports two profiles:

| Profile | Services | Use case |
|---|---|---|
| _(default)_ | `postgres` only | Local development with hot-reload |
| `full` | `postgres` + `api` + `client` | Full containerised stack |

---

## Local Database Only (recommended for development)

```bash
# Start only Postgres
npm run db:up          # ≡ docker compose up postgres -d

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Then run backend + frontend natively (hot-reload)
npm run dev
```

---

## Full Stack with Docker

```bash
# Build and start all services
docker compose --profile full up --build

# Rebuild after code changes
docker compose --profile full up --build api client

# Tear down (keeps volumes)
docker compose --profile full down

# Tear down and remove DB data
docker compose --profile full down -v
```

Access the app at `http://localhost:5173` (Nginx serves the Vite build).

---

## Environment Variables for Production

Create a production `.env` file (do **not** commit it):

```env
NODE_ENV=production
PORT=4000
CLIENT_ORIGIN=https://your-domain.com

DATABASE_URL=postgresql://user:password@db:5432/chkn_tndr

JWT_SECRET=<64-char random hex string>
JWT_EXPIRES_IN=7d

GOOGLE_PLACES_API_KEY=<your production key>
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Google Places API Key Security (Production)

For a public deployment, protect your API key:

1. **Server key** — restrict to `Places API` + your server's IP address range
2. **No client-side key** — the client never calls Google directly; all Places calls go through the backend
3. Set **billing alerts** in Google Cloud Console to avoid surprise charges

---

## Cloud Deployment Options

The project is Docker-first and deploys cleanly to any container host.

### Fly.io (recommended — free tier available)

```bash
fly auth login
fly launch          # detects docker-compose.yml, creates fly.toml
fly postgres create # managed Postgres
fly secrets set JWT_SECRET=... GOOGLE_PLACES_API_KEY=...
fly deploy
```

### Railway

1. Connect the GitHub repository in the Railway dashboard
2. Add a PostgreSQL plugin
3. Set environment variables in the Railway UI
4. Deploy — Railway detects and builds Docker images automatically

### Render

1. Create a new **Web Service** pointing to the repo
2. Set **Docker** as the environment
3. Add a **PostgreSQL** database instance
4. Set environment variables
5. Deploy

---

## Production Checklist

Before going live, verify:

- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is a cryptographically random string (≥64 chars)
- [ ] `GOOGLE_PLACES_API_KEY` is restricted to the server IP
- [ ] `CLIENT_ORIGIN` matches the exact frontend URL (no trailing slash)
- [ ] Database URL uses a strong password and is not publicly accessible
- [ ] HTTPS is terminating in front of the Node.js server (Fly.io / Render / Nginx do this automatically)
- [ ] Prisma migrations have been run: `npx prisma migrate deploy`
- [ ] Rate limits are appropriate for expected traffic (default: 200 req / 15 min)

---

## Nginx Configuration (Client Container)

The client container uses Nginx to serve the Vite production build.  
The configuration (`client/nginx.conf`) routes all requests to `index.html` for client-side routing:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

In a full Docker Compose deployment, the client Nginx container proxies `/api` and `/socket.io` requests to the `api` service.

---

## Horizontal Scaling Note

The current architecture stores the lobby ready-set in an in-process `Map`. This means:

- A single server instance works perfectly
- Multiple API instances (load-balanced) would each have their own ready-set, causing ready-count drift

**To scale horizontally:** replace the `readySets` Map with Redis `SADD` / `SCARD` operations and use the Socket.io Redis adapter (`@socket.io/redis-adapter`) to broadcast events across instances.
