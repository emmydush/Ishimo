# Multi-stage build for Ishimo application
# This Dockerfile is for root-level deployment on platforms that require it

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend
FROM node:20-alpine AS backend
WORKDIR /app
# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./
EXPOSE 3000
CMD ["node", "server.js"]

# Stage 3: Final production image with Nginx
FROM nginx:alpine AS production
# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
