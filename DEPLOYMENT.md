# Ishimo Deployment Guide

Two supported shapes, same code:

| Shape | Files | Where |
|---|---|---|
| **All-in-one container** — nginx serves the SPA and proxies to the Node API on `127.0.0.1:3000`, PostgreSQL via `DATABASE_URL` | root `Dockerfile`, `nginx.single.conf`, `start.sh` | Render, Railway, any single-service Docker host |
| **Split stack** — separate client and server containers + a PostgreSQL container linked by Docker DNS | `docker-compose.yml`, `client/Dockerfile`, `server/Dockerfile`, `client/nginx.conf` | VPS with Docker Compose |

Use the all-in-one image on Render: compose's embedded DNS (`127.0.0.11`) and the
`server` hostname do not exist there, so the split nginx config cannot resolve
its upstream.

## Deploy on Render (single service)

1. **New → Web Service** from this repository, runtime **Docker**.
2. Settings: **Dockerfile Path** `Dockerfile` (repository root), **Docker Context
   Directory** `.`, **Health Check Path** `/api/health`.
3. **Add a PostgreSQL database** (or use the `render.yaml` Blueprint below, which
   creates the managed `ishimo-db` and injects its connection string as
   `DATABASE_URL` automatically).
4. Environment variables: `ADMIN_TOKEN` (long random value) and, for the first
   admin login, `ADMIN_PASSWORD`.
5. **Add a disk** mounted at `/app/data` (1 GB is plenty). It stores the uploaded
   files (`/app/server/uploads` is a symlink to `/app/data/uploads`) and the
   deploy-time database dumps. Without a disk the app works but uploads and
   dumps are wiped on every redeploy — disks require a paid instance type.
6. Deploy, then check `https://<your-app>.onrender.com/api/health` returns
   `{"status":"ok",...}`.

`render.yaml` contains the same setup if you prefer deploying as a Blueprint:
one web service plus a managed PostgreSQL database (`ishimo-db`) whose
connection string is injected as `DATABASE_URL`. Render injects `PORT`;
`start.sh` makes nginx listen on it while the API stays on `127.0.0.1:3000`,
so nothing else needs configuring.

### Admin login on Render

```bash
# Render Shell (paid plans)
node /app/server/create-admin.js             # prompt for a password (hidden)
node /app/server/create-admin.js --generate  # print a strong random password once
```

The script refuses to overwrite an existing password unless `--force` is added,
and it stores only a bcrypt hash (never the plain password).

On the free plan there is no shell: set a strong `ADMIN_PASSWORD` env var and
sign in with username `admin`. That fallback only applies while no password hash
exists in the database.

### Run the all-in-one image locally

```bash
docker build -t ishimo .
docker run -p 8080:80 -v ishimo_data:/app/data ishimo
```

## Split stack (VPS with Docker Compose)

nginx serves the React SPA and reverse-proxies `/api` and `/uploads` to the Node
API, which stores data in a PostgreSQL container backed by a named volume.

```
ishimo/
├── client/            React + Vite (built to static files, served by nginx)
├── server/            Express + PostgreSQL (pg)
└── docker-compose.yml
```

## Prerequisites

- Docker Engine + Docker Compose v2
- Git

## Deploy (VPS)

```bash
git clone https://github.com/emmydush/Ishimo.git
cd Ishimo

docker compose up -d --build
docker compose ps                      # both containers must report (healthy)
curl -s http://localhost/api/health    # {"status":"ok","uptime":N}
```

The site is then served on **http://<server-ip>/** (port 80). The API is not
published publicly; it is reachable only through nginx or from the host loopback
(`127.0.0.1:3000`).

### Create the admin login

The admin password is stored as a bcrypt hash in the database, not in code:

```bash
docker compose exec server npm run admin:create
```

You are prompted twice for a password (input hidden). To script it:

```bash
docker compose exec server npm run admin:create -- --password "YourStrongPass1!" --force
```

The username is `admin` (override with `ADMIN_USERNAME`). Regular users and
employers create their own accounts through the registration pages.

### Redeploy after pulling changes

`docker compose up -d` reuses existing images, so a new commit is **not** picked
up unless you rebuild:

```bash
git pull
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d
```

Then clear the cached PWA in the browser: DevTools → **Application** →
**Service Workers** → *Unregister*, and hard-reload (`Ctrl+Shift+R`). Otherwise
visitors may keep running the previous JavaScript bundle.

## Configuration

Environment variables (see `server/.env.example`; only `DATABASE_URL` is
required, and compose/render.yaml supply it automatically):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port |
| `DATABASE_URL` | *required* | PostgreSQL connection string (compose and render.yaml set it automatically) |
| `PUBLIC_BASE_URL` | empty | Absolute origin for `/uploads` links. Leave empty for same-origin |
| `ADMIN_USERNAME` | `admin` | Admin login name |
| `ADMIN_TOKEN` | `admin-secret-token-ishimo` | Token for `/api/admin/*`. **Change in production** |
| `VITE_API_URL` | empty | Build-time API origin. Leave empty when nginx proxies the API |

To override, create a `.env` next to `docker-compose.yml`:

```dotenv
ADMIN_TOKEN=some-long-random-value
```

If you change `VITE_API_URL`, it must be set **before** `docker compose build`
because it is compiled into the bundle.

## Database

The schema (12 tables), column migrations and default admin settings live in
`server/schema.js`. The API applies them automatically at startup against the
PostgreSQL database from `DATABASE_URL`, so a fresh database works with no
manual step.

### Manual init / upgrade

```bash
docker compose exec server npm run db:init     # create missing tables, add columns, seed defaults
```

- Idempotent: safe to run repeatedly, existing rows are preserved
- Prints a per-table row count summary

### Reset (destroys data)

```bash
docker compose exec server npm run db:reset    # drops all tables and recreates them
```

### Migrating the legacy SQLite data

If you still have the old `database.sqlite`, copy its rows into PostgreSQL with:

```bash
cd server
node migrate-data.js --truncate   # source: SQLITE_PATH, target: DATABASE_URL
```

### Backup / restore

```bash
# backup (pg_dump; the server image ships postgresql-client)
docker compose exec server sh -c 'pg_dump "$DATABASE_URL" --no-owner' > ishimo-backup.sql

# restore (empty first, then load)
docker compose exec server npm run db:reset
cat ishimo-backup.sql | docker compose exec -T server sh -c 'psql "$DATABASE_URL"'
```

The managed Render database also keeps its own daily automatic backups.

### Automatic backups on every deploy (no-data-loss guarantee)

Every deploy of the all-in-one image runs these safeguards before the API
accepts traffic:

1. `start.sh` verifies `/app/data` exists and is writable and prints a loud
   warning if it is not (that is the symptom of a missing disk, which would
   wipe uploads and dumps on the next redeploy).
2. `start.sh` refuses to start without `DATABASE_URL` so the API can never
   silently fall back to a different database.
3. `server/backup-db.js` runs `pg_dump` into `/app/data/backups/` (keeps the 5
   most recent) — so a bad release can never destroy the only copy of
   production data. On Render the managed database also keeps its own
   automatic backups.

To restore a dump: `psql "$DATABASE_URL" < /app/data/backups/database-*.sql`.

## Volumes

| Volume | Container path | Contents |
|---|---|---|
| `postgres_data` | `/var/lib/postgresql/data` | PostgreSQL database files |
| `uploads_data` | `/app/uploads` | Worker photos, ID scans, passports |

Both survive `docker compose down`. Only `docker compose down -v` deletes them.

## Architecture notes

- **Client**: nginx serves `/usr/share/nginx/html`; `/api` and `/uploads` are
  proxied to the `server` container at request time (Docker DNS `127.0.0.11`),
  so the image also starts on hosts where no `server` container exists.
- **Client caching**: hashed `/assets/*` are immutable for a year, `index.html`
  is `no-cache`, `sw.js` is `no-store`.
- **Uploads**: nginx accepts request bodies up to 15 MB.
- **Server**: runs as the unprivileged `node` user (uid 1000) and handles
  `SIGTERM` by closing the HTTP server and the PostgreSQL pool before exiting.
- **Health**: `/api/health` on the server, `/` on the client. `client` waits for
  `server` to be healthy before starting.

## Adding HTTPS

The containers speak plain HTTP on port 80. For TLS, put a reverse proxy in
front (Caddy, Traefik, or nginx with certbot), or mount certificates into the
client nginx container and add a `listen 443 ssl;` server block. When the public
origin differs from the API origin, set `PUBLIC_BASE_URL` and rebuild the client
with `VITE_API_URL`.

## Troubleshooting

**`recv() failed (111: Connection refused) while resolving, resolver: 127.0.0.11:53`**
You are running the compose nginx config on a host without Docker's embedded DNS
(Render, or the client image started standalone). There is no `server` container
to resolve, so `/api` calls fail. Deploy the root all-in-one `Dockerfile`
instead, which proxies to `127.0.0.1:3000` and needs no DNS.

**Login/registration fails with "Failed to fetch"**
The bundle is stale or points at the wrong API. Check which origin the running
image uses:

```bash
docker exec ishimo-client grep -c localhost:3000 /usr/share/nginx/html/assets/index-*.js
```

`0` is correct; `1` or more means the image predates the fix — rebuild
(`docker compose build --no-cache`). The login/register toasts now print the
API origin they are calling, which makes this immediate.

**502 from nginx / API unreachable**

```bash
docker compose ps
docker compose logs --tail=50 server
curl -s http://127.0.0.1:3000/api/health
```

**Port 80 or 3000 already in use**
Old containers from a previous layout can hold the ports:

```bash
docker compose down --remove-orphans
docker ps -a
```

**"Invalid email or password" for admin**
The stored hash does not match. Reset it:

```bash
docker compose exec server npm run admin:create -- --force
```

**Database connection refused / relation does not exist**
The API cannot reach PostgreSQL. Check `DATABASE_URL` and that the database is
up:

```bash
docker compose ps postgres
docker compose logs --tail=50 postgres
docker compose exec server sh -c 'pg_isready -h postgres -U ishimo -d ishimo'
```

## Production checklist

- [ ] `ADMIN_TOKEN` overridden with a long random value
- [ ] Admin password created with `npm run admin:create`
- [ ] `docker compose ps` shows all containers `(healthy)`
- [ ] `curl -s http://<server>/api/health` returns `{"status":"ok",...}`
- [ ] HTTPS terminated in front of nginx
- [ ] `DATABASE_URL` points at a backed-up PostgreSQL database (Render managed
      DB, or a host with pg_dump cron)
- [ ] `docker compose down -v` never run accidentally
