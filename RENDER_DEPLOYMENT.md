# Render.com Deployment Guide

This guide explains how to deploy the Ishimo application on Render.com.

## Prerequisites

- Render.com account
- GitHub repository with the Ishimo code
- Basic understanding of web services

## Deployment Steps

### 1. Prepare Your Repository

Make sure your repository includes:
- All the code changes
- The `render.yaml` file (created for Render deployment)
- Updated API configuration
- Root Dockerfile (for Docker-based deployment)

### 2. Deploy to Render

#### Option A: Using render.yaml (Recommended)

1. **Push your code to GitHub** (if not already done)
2. **Go to Render.com** and click "New +"
3. **Select "Blueprint"** and connect your GitHub repository
4. **Render will automatically detect** the `render.yaml` file
5. **Click "Apply"** to start the deployment

**Important**: If you get a Dockerfile error, make sure you select "Blueprint" deployment, not "Docker" deployment.

#### Option B: Manual Docker Deployment

If you prefer Docker deployment or Blueprint is not working:

1. **Create PostgreSQL Database:**
   - Go to Render Dashboard → New → PostgreSQL
   - Name: `ishimo-postgres`
   - Database: `ishimo`
   - User: `postgres`
   - Select Free tier
   - Click "Create Database"

2. **Create Backend Service (Docker):**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Name: `ishimo-backend`
   - Environment: Docker
   - Docker Context: `./backend`
   - Dockerfile Path: `./backend/Dockerfile`
   - Add Environment Variables:
     - `NODE_ENV`: `production`
     - `DB_HOST`: (from PostgreSQL service)
     - `DB_PORT`: `5432`
     - `DB_NAME`: `ishimo`
     - `DB_USER`: (from PostgreSQL service)
     - `DB_PASSWORD`: (from PostgreSQL service)
   - Click "Create Web Service"

3. **Create Frontend Service (Docker):**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Name: `ishimo-frontend`
   - Environment: Docker
   - Docker Context: `./frontend`
   - Dockerfile Path: `./frontend/Dockerfile`
   - Add Environment Variable:
     - `VITE_API_URL`: (your backend service URL)
   - Click "Create Web Service"

#### Option C: Manual Setup (Native Services)

1. **Create PostgreSQL Database:**
   - Go to Render Dashboard → New → PostgreSQL
   - Name: `ishimo-postgres`
   - Database: `ishimo`
   - User: `postgres`
   - Select Free tier
   - Click "Create Database"

2. **Create Backend Service:**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Name: `ishimo-backend`
   - Environment: Node
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`
   - Add Environment Variables:
     - `NODE_ENV`: `production`
     - `DB_HOST`: (from PostgreSQL service)
     - `DB_PORT`: `5432`
     - `DB_NAME`: `ishimo`
     - `DB_USER`: (from PostgreSQL service)
     - `DB_PASSWORD`: (from PostgreSQL service)
   - Click "Create Web Service"

3. **Create Frontend Service:**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Name: `ishimo-frontend`
   - Environment: Static Site
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `./frontend/dist`
   - Add Environment Variable:
     - `VITE_API_URL`: (your backend service URL)
   - Click "Create Web Service"

### 3. Important Configuration Notes

#### Backend Configuration

The backend is configured to use PostgreSQL. The `render.yaml` file automatically:

- Creates a PostgreSQL database
- Sets up the backend service with proper environment variables
- Connects backend to the database

#### Frontend Configuration

The frontend needs to know the backend URL. In production:

1. **Set `VITE_API_URL` environment variable** in Render frontend service
2. **Value should be**: `https://your-backend-service.onrender.com`
3. **The frontend uses this** to make API calls instead of localhost

#### API URL Configuration

The frontend now uses a centralized API configuration:

```javascript
import { API_BASE_URL } from '../config/api';

// Use in your components
const response = await fetch(`${API_BASE_URL}/api/login`, {
  method: 'POST',
  // ...
});
```

### 4. Update Hardcoded URLs

If you have hardcoded `http://localhost:3000` URLs in your frontend code, you need to update them:

**Before:**
```javascript
const response = await fetch('http://localhost:3000/api/login', {
  method: 'POST',
  // ...
});
```

**After:**
```javascript
import { API_BASE_URL } from '../config/api';

const response = await fetch(`${API_BASE_URL}/api/login`, {
  method: 'POST',
  // ...
});
```

### 5. Environment Variables

#### Backend Environment Variables (Render auto-configures these):
- `NODE_ENV` - Set to `production`
- `DB_HOST` - PostgreSQL host (auto-connected)
- `DB_PORT` - PostgreSQL port (5432)
- `DB_NAME` - Database name (ishimo)
- `DB_USER` - Database user (auto-connected)
- `DB_PASSWORD` - Database password (auto-connected)

#### Frontend Environment Variables:
- `VITE_API_URL` - Your backend service URL (e.g., `https://ishimo-backend.onrender.com`)

### 6. Troubleshooting

#### Backend Fails to Start

1. **Check Render logs** for error messages
2. **Verify database connection** - ensure PostgreSQL is running
3. **Check environment variables** - all DB_* variables should be set
4. **Verify port** - backend uses port 3000 by default

#### Frontend Can't Connect to Backend

1. **Check `VITE_API_URL`** - should be your backend Render URL
2. **Verify backend is running** - check backend service status
3. **Check CORS configuration** - backend allows frontend origin
4. **Test backend API directly** - use curl or Postman

#### Build Failures

1. **Check build logs** in Render dashboard
2. **Verify dependencies** - all packages should be in package.json
3. **Check Node version** - Render uses latest Node by default
4. **Ensure build command** is correct for your setup

### 7. Database Migration

Since we migrated from SQLite to PostgreSQL:

1. **The database schema** is automatically created by `database.js`
2. **No manual migration needed** - PostgreSQL tables are created on startup
3. **Existing SQLite data** won't be transferred automatically
4. **For data migration**, you'll need to:
   - Export SQLite data
   - Convert to PostgreSQL format
   - Import into Render PostgreSQL

### 8. Monitoring

- **Render Dashboard** - Monitor service status and logs
- **Service Logs** - View real-time logs for debugging
- **Metrics** - Monitor performance and resource usage
- **Deployments** - Track deployment history

### 9. Domain Configuration (Optional)

To use a custom domain:

1. **Go to your service settings** in Render
2. **Add custom domain**
3. **Update DNS records** as instructed by Render
4. **Wait for SSL certificate** to be issued

### 10. Scaling

- **Free tier** has limitations (512MB RAM, sleep after inactivity)
- **Paid tiers** available for better performance
- **Consider upgrading** if you experience:
  - Frequent service timeouts
  - Slow response times
  - Memory issues

## Alternative: Docker Deployment on Render

If you prefer Docker deployment, you can deploy the docker-compose setup:

1. **Create a Render Docker service**
2. **Point to your repository**
3. **Use the existing Dockerfile configuration**
4. **Set environment variables** for database connection

However, the native Render deployment (using render.yaml) is recommended as it's simpler and more cost-effective.

## Support

For Render-specific issues:
- Check [Render documentation](https://render.com/docs)
- Review Render logs in dashboard
- Ensure your repository is properly configured

For application issues:
- Check this deployment guide
- Review the main DEPLOYMENT.md file
- Check DEPLOYMENT_POSTGRESQL.md for database-specific issues
