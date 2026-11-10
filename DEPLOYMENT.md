# Ishimo Deployment Guide

Two supported shapes, same code:

| Shape | Files | Where |
|---|---|---|
| **All-in-one container** — nginx serves the SPA and proxies to the Node API on `127.0.0.1:3000`, SQLite on a disk | root `Dockerfile`, `nginx.single.conf`, `start.sh` | Render, Railway, any single-service Docker host |
| **Split stack** — separate client and server containers linked by Docker DNS | `docker-compose.yml`, `client/Dockerfile`, `server/Dockerfile`, `client/nginx.conf` | VPS with Docker Compose |

Use the all-in-one image on Render: compose's embedded DNS (`127.0.0.11`) and the
`server` hostname do not exist there, so the split nginx config cannot resolve
its upstream.

## Deploy on Render (single service)

1. **New → Web Service** from this repository, runtime **Docker**.
2. Settings: **Dockerfile Path** `Dockerfile` (repository root), **Docker Context
   Directory** `.`, **Health Check Path** `/api/health`.
3. Environment variables: `ADMIN_TOKEN` (long random value) and, for the first
   admin login, `ADMIN_PASSWORD`.
4. **Add a disk** mounted at `/app/data` (1 GB is plenty). It stores both the
   SQLite database and the uploaded files (`/app/server/uploads` is a symlink to
   `/app/data/uploads`). Without a disk the app works but data is wiped on every
   redeploy — disks require a paid instance type.
5. Deploy, then check `https://<your-app>.onrender.com/api/health` returns
   `{"status":"ok",...}`.

`render.yaml` contains the same setup if you prefer deploying as a Blueprint.
Render injects `PORT`; `start.sh` makes nginx listen on it while the API stays on
`127.0.0.1:3000`, so nothing else needs configuring.

### Admin login on Render

```bash
# Render Shell (paid plans)
node /app/server/create-admin.js
```

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
API, which stores data in SQLite on a named volume.

```
ishimo/
├── client/            React + Vite (built to static files, served by nginx)
├── server/            Express + SQLite
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

Environment variables (see `server/.env.example`; all are optional):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port |
| `SQLITE_PATH` | `/app/data/database.sqlite` in Docker | Database file |
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
`server/schema.js`. The API applies them automatically at startup, so a fresh
volume works with no manual step.

### Manual init / upgrade

```bash
docker compose exec server npm run db:init     # create missing tables, add columns, seed defaults
```

- Idempotent: safe to run repeatedly, existing rows are preserved
- Copies the database to `database.sqlite.bak-<timestamp>` inside the volume
  before migrating
- Prints a per-table row count summary

### Reset (destroys data)

```bash
docker compose exec server npm run db:reset    # drops all tables and recreates them
```

### Backup / restore

```bash
# backup
docker compose exec server sh -c 'cat /app/data/database.sqlite' > ishimo-backup.sqlite

# restore (stop the stack first)
docker compose down
docker compose run --rm -v $PWD:/backup server sh -c 'cat /backup/ishimo-backup.sqlite > /app/data/database.sqlite'
docker compose up -d
```

## Volumes

| Volume | Container path | Contents |
|---|---|---|
| `sqlite_data` | `/app/data` | SQLite database (+ automatic `.bak-*` copies) |
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
  `SIGTERM` by closing the HTTP server and the SQLite connection before exiting.
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

**Database locked**
`db:init` sets a 5 s busy timeout, so it can run while the API is up. If you
still hit lock errors, stop the server container first.

## Production checklist

- [ ] `ADMIN_TOKEN` overridden with a long random value
- [ ] Admin password created with `npm run admin:create`
- [ ] `docker compose ps` shows both containers `(healthy)`
- [ ] `curl -s http://<server>/api/health` returns `{"status":"ok",...}`
- [ ] HTTPS terminated in front of nginx
- [ ] Database backup cron in place
- [ ] `docker compose down -v` never run accidentally
