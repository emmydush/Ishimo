#!/bin/sh
# Single-container entrypoint: Node API on 127.0.0.1:3000 + nginx in front.
set -e

LISTEN_PORT="${PORT:-80}"
sed "s/__LISTEN_PORT__/${LISTEN_PORT}/" /etc/nginx/nginx.single.conf > /etc/nginx/http.d/default.conf
echo "nginx listening on ${LISTEN_PORT}, proxying /api and /uploads to 127.0.0.1:3000"

# Uploaded files and deploy-time database dumps live here; on Render mount a
# disk at /app/data. The database itself is PostgreSQL (DATABASE_URL).
mkdir -p /app/data/uploads

# The API refuses to boot without a database — fail fast with a clear message.
if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL is not set — point it at the PostgreSQL database." >&2
  exit 1
fi

# No-data-loss guard: refuse to silently run on an ephemeral filesystem, and
# dump the database before the new code touches it (keeps the last 5 dumps in
# /app/data/backups).
if [ ! -d /app/data ] || [ ! -w /app/data ]; then
  echo "WARNING: /app/data is missing or not writable — uploads and backups will NOT survive redeploys." >&2
else
  node /app/server/backup-db.js || echo "WARNING: database dump failed before startup" >&2
fi

cd /app/server
PORT=3000 node server.js &
API_PID=$!

shutdown() {
  echo "Shutting down..."
  kill -TERM "$API_PID" 2>/dev/null || true
  nginx -s quit 2>/dev/null || true
}
trap shutdown TERM INT

# Do not accept traffic before the API is up, otherwise the first requests 502.
i=0
until wget -q -O - http://127.0.0.1:3000/api/health > /dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "API did not become healthy in time" >&2
    exit 1
  fi
  sleep 1
done
echo "API is healthy"

nginx -g 'daemon off;' &
NGINX_PID=$!
wait "$NGINX_PID"
