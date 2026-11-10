#!/bin/sh
# Single-container entrypoint: Node API on 127.0.0.1:3000 + nginx in front.
set -e

LISTEN_PORT="${PORT:-80}"
sed "s/__LISTEN_PORT__/${LISTEN_PORT}/" /etc/nginx/nginx.single.conf > /etc/nginx/http.d/default.conf
echo "nginx listening on ${LISTEN_PORT}, proxying /api and /uploads to 127.0.0.1:3000"

# SQLite and uploaded files live here; on Render mount a disk at /app/data.
mkdir -p /app/data/uploads

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
