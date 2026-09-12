# Ishimo Deployment Guide

This guide explains how to deploy the Ishimo application using Docker and Docker Compose.

## Project Structure

```
ishimo/
├── backend/              # Node.js Express API
│   ├── server.js        # Main server file
│   ├── database.js      # SQLite database configuration
│   ├── package.json     # Backend dependencies
│   ├── Dockerfile       # Backend Docker configuration
│   ├── .dockerignore    # Files to exclude from Docker build
│   ├── uploads/         # User uploaded files
│   └── database.sqlite  # SQLite database file
├── frontend/            # React + Vite application
│   ├── src/             # React source code
│   ├── public/          # Static assets
│   ├── package.json     # Frontend dependencies
│   ├── Dockerfile       # Frontend Docker configuration
│   ├── nginx.conf       # Nginx configuration
│   ├── .dockerignore    # Files to exclude from Docker build
│   └── vite.config.js   # Vite configuration
├── docker-compose.yml   # Docker Compose configuration
└── DEPLOYMENT.md        # This file
```

## Prerequisites

- Docker installed on your system
- Docker Compose installed
- Git (for cloning the repository)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/emmydush/Ishimo.git
   cd Ishimo
   ```

2. **Build and start the containers:**
   ```bash
   docker-compose up --build -d
   ```

3. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:3000

## Docker Compose Services

### Backend Service
- **Port:** 3000
- **Technology:** Node.js 18 Alpine
- **Volumes:**
  - `./backend/uploads:/app/uploads` - User uploaded files
  - `./backend/database.sqlite:/app/database.sqlite` - SQLite database
- **Restart Policy:** unless-stopped

### Frontend Service
- **Port:** 80
- **Technology:** Nginx Alpine
- **Depends on:** backend
- **Restart Policy:** unless-stopped

## Development

### Running Backend Locally (without Docker)

```bash
cd backend
npm install
node server.js
```

### Running Frontend Locally (without Docker)

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server is configured to proxy API requests to the backend at `http://localhost:3000`.

## Production Deployment

### Environment Variables

The backend uses environment variables for configuration. You can add them to the docker-compose.yml file:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
```

### Building for Production

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Database Persistence

The SQLite database is persisted using Docker volumes. The database file is stored at:
- Host: `./backend/database.sqlite`
- Container: `/app/database.sqlite`

### File Uploads

User uploaded files are persisted using Docker volumes:
- Host: `./backend/uploads/`
- Container: `/app/uploads/`

## Troubleshooting

### Backend not starting
```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Frontend not loading
```bash
# Check frontend logs
docker-compose logs frontend

# Check if backend is running
docker-compose ps
```

### Database issues
```bash
# Backup database
cp backend/database.sqlite backend/database.sqlite.backup

# Reset database (WARNING: This deletes all data)
docker-compose down
rm backend/database.sqlite
docker-compose up -d
```

### Port conflicts
If port 80 or 3000 is already in use, modify the ports in docker-compose.yml:

```yaml
services:
  backend:
    ports:
      - "3001:3000"  # Use port 3001 instead
  frontend:
    ports:
      - "8080:80"    # Use port 8080 instead
```

## Security Considerations

1. **Change default admin credentials** in `backend/server.js`:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `ADMIN_TOKEN`

2. **Use environment variables** for sensitive data in production

3. **Enable HTTPS** by adding SSL certificates to Nginx configuration

4. **Regular backups** of the SQLite database

5. **Rate limiting** is already configured in the backend

## Scaling

For horizontal scaling, consider:
- Using a production-grade database (PostgreSQL, MySQL)
- Implementing a load balancer
- Using Docker Swarm or Kubernetes for orchestration

## Monitoring

To monitor container health:

```bash
# Check container status
docker-compose ps

# View resource usage
docker stats

# View logs
docker-compose logs -f
```

## Support

For issues or questions, please open an issue on the GitHub repository.
