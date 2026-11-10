# Client-only image for static hosting (Render, Fly, any nginx host).
# For the full stack (API + client), use docker-compose.yml instead.

FROM node:20-alpine AS builder

WORKDIR /app

COPY client/package*.json ./
RUN npm ci && npm cache clean --force

COPY client/ ./

# Optional: absolute API origin baked into the bundle, e.g.
#   docker build --build-arg VITE_API_URL=https://api.example.com .
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
