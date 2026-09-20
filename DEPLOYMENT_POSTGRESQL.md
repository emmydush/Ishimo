# PostgreSQL Migration Guide

## Migration Summary

The Ishimo application has been successfully migrated from SQLite to PostgreSQL for production deployment.

## Changes Made

### 1. Database Configuration
- **Added**: `pg` package for PostgreSQL connectivity
- **Added**: `dotenv` package for environment variable management
- **Created**: `backend/.env` for local development configuration
- **Created**: `backend/.env.example` as template for environment variables

### 2. Database Schema
- **Updated**: `backend/database.js` to use PostgreSQL instead of SQLite
- **Converted**: SQLite syntax to PostgreSQL (AUTOINCREMENT → SERIAL, DATETIME → TIMESTAMP, etc.)
- **Added**: PostgreSQL connection pooling with the `pg` package
- **Maintained**: SQLite-compatible API wrapper for existing code

### 3. Application Code
- **Updated**: `backend/server.js` for PostgreSQL compatibility
- **Changed**: `INSERT OR IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`
- **Simplified**: Migration logic (schema creation moved to database.js)

### 4. Docker Configuration
- **Added**: PostgreSQL service to `docker-compose.yml`
- **Updated**: Backend service to depend on PostgreSQL
- **Added**: Health checks for PostgreSQL service
- **Added**: Volume for PostgreSQL data persistence
- **Updated**: Environment variables for database connection

## Local Development Setup

### Option 1: Using Docker (Recommended)

1. **Start PostgreSQL and backend with Docker:**
   ```bash
   docker-compose up postgres backend
   ```

2. **The backend will automatically:**
   - Connect to PostgreSQL
   - Create all required tables
   - Set up proper indexes and constraints

### Option 2: Local PostgreSQL Installation

1. **Install PostgreSQL** on your system if not already installed

2. **Create the database:**
   ```bash
   createdb ishimo
   ```

3. **Configure environment variables** in `backend/.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ishimo
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

4. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

### Option 3: Cloud PostgreSQL Service

For production, consider using a managed PostgreSQL service:
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- Heroku Postgres
- Supabase
- Neon

Update the `.env` file with your cloud database credentials.

## Testing the Migration

### Quick Test Script

Run the test script to verify database connectivity:
```bash
cd backend
node test-db.js
```

### Manual Testing

1. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Check the console output** for:
   - "Connected to the PostgreSQL database."
   - "Database schema initialized successfully"

3. **Test API endpoints:**
   - Visit `http://localhost:3000/api/test` to check database connectivity
   - Try registering a user to verify all tables work correctly

## Data Migration (If you have existing SQLite data)

If you have existing data in `database.sqlite` that you want to migrate:

1. **Export SQLite data:**
   ```bash
   sqlite3 backend/database.sqlite .dump > backup.sql
   ```

2. **Convert the dump to PostgreSQL format** (you may need to adjust syntax manually)

3. **Import into PostgreSQL:**
   ```bash
   psql -h localhost -U postgres -d ishimo < backup.sql
   ```

## Production Deployment

### Using Docker Compose

1. **Build and start all services:**
   ```bash
   docker-compose up -d
   ```

2. **This will start:**
   - PostgreSQL on port 5432
   - Backend on port 3000
   - Frontend on port 80

### Environment Variables for Production

Update these in your production environment:
- `DB_PASSWORD` - Use a strong, unique password
- `DB_HOST` - Use your PostgreSQL service endpoint
- `NODE_ENV=production`

### Security Considerations

1. **Change default PostgreSQL password** in production
2. **Use environment variables** for sensitive data (never commit to git)
3. **Enable SSL** for database connections in production
4. **Regular backups** - Set up automated PostgreSQL backups
5. **Network security** - Restrict database access to application servers only

## Troubleshooting

### Connection Issues
- **Error**: "Connection refused" - Ensure PostgreSQL is running
- **Error**: "Authentication failed" - Check DB_USER and DB_PASSWORD
- **Error**: "Database does not exist" - Create the database first

### Docker Issues
- **Error**: "Port already in use" - Change port mappings in docker-compose.yml
- **Error**: "Container fails to start" - Check logs: `docker-compose logs backend`

### Schema Issues
- **Error**: "Table already exists" - The schema creation handles this with IF NOT EXISTS
- **Error**: "Column already exists" - Migration scripts handle this gracefully

## Rollback Plan

If you need to rollback to SQLite:

1. **Stop PostgreSQL services**
2. **Restore SQLite database.js** from git history
3. **Remove pg and dotenv packages**: `npm uninstall pg dotenv`
4. **Restore docker-compose.yml** from git history
5. **Restart with SQLite**

## Performance Benefits of PostgreSQL

- **Better concurrency** - Handles multiple simultaneous connections
- **Advanced features** - Full-text search, JSON support, advanced indexing
- **Scalability** - Better suited for growing applications
- **Reliability** - ACID compliance, crash recovery
- **Community support** - Extensive documentation and tools

## Next Steps

1. Test the migration thoroughly in development
2. Set up monitoring for database performance
3. Configure automated backups
4. Plan for database scaling if needed
5. Update any deployment scripts or CI/CD pipelines
