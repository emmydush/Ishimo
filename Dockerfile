# ─── All-in-one image: React SPA + nginx + Node API + PostgreSQL ─────────────
# Use this on single-service hosts (Render, Railway, a plain VPS with Docker).
# The API listens on 127.0.0.1:3000 inside the container and nginx proxies to it,
# so no container-to-container DNS is required. The database is PostgreSQL,
# supplied via DATABASE_URL (a managed instance, or a postgres container).
# For a split stack (separate client/server containers) use docker-compose.yml.

# ── Stage 1: build the React client ──
FROM node:20-alpine AS client-build
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Empty = same-origin /api requests, which nginx proxies to the bundled API.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ── Stage 2: install server dependencies (bcrypt/sqlite3 need a native build) ──
FROM node:20-alpine AS server-deps
RUN apk add --no-cache python3 make g++
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 3: runtime ──
FROM node:20-alpine
# postgresql-client provides pg_dump for the deploy-time database dumps.
RUN apk add --no-cache nginx postgresql-client

ENV NODE_ENV=production

WORKDIR /app
COPY --from=server-deps /build/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-build /build/client/dist /usr/share/nginx/html
COPY nginx.single.conf /etc/nginx/nginx.single.conf
COPY start.sh /app/start.sh

# /app/data holds the deploy-time database dumps and (through a symlink) the
# uploaded files, so a single persistent disk mounted at /app/data keeps them.
RUN mkdir -p /app/data/uploads /run/nginx \
    && rm -rf /app/server/uploads \
    && ln -s /app/data/uploads /app/server/uploads \
    && chmod +x /app/start.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD wget -q -O - "http://127.0.0.1:${PORT:-80}/api/health" > /dev/null || exit 1

CMD ["/app/start.sh"]
