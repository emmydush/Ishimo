# Frontend-only Dockerfile for static site deployment
# For full stack deployment, use the separate backend/frontend Dockerfiles

FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
# Copy frontend build
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
