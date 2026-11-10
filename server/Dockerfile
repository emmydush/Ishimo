FROM node:20-alpine AS base

# sqlite3 / bcrypt may need to compile native bindings on musl
RUN apk add --no-cache python3 make g++

WORKDIR /app

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    SQLITE_PATH=/app/data/database.sqlite

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Writable locations for the SQLite database and uploaded files.
# Owned by "node" so the container can run unprivileged.
RUN mkdir -p /app/data /app/uploads \
    && chown -R node:node /app/data /app/uploads

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O - http://127.0.0.1:3000/api/health > /dev/null || exit 1

CMD ["node", "server.js"]
