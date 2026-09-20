const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ishimo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database', err.message);
  } else {
    console.log('Connected to the PostgreSQL database.');
    release();
    initializeDatabase();
  }
});

async function initializeDatabase() {
  try {
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('employer', 'worker')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add status column to existing users if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
        CHECK (status IN ('active', 'suspended', 'blocked'))
      `);
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Create Employers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employers (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        phone TEXT NOT NULL,
        location TEXT NOT NULL
      )
    `);

    // Create Workers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workers (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        location TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        availability TEXT DEFAULT 'available',
        profile_views INTEGER DEFAULT 0
      )
    `);

    // Add profile_views column to existing workers if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE workers 
        ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0
      `);
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Add location column to existing workers if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE workers 
        ADD COLUMN IF NOT EXISTS location TEXT DEFAULT ''
      `);
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Add availability column to existing workers if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE workers 
        ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available'
      `);
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Create Worker Profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_profiles (
        worker_id INTEGER PRIMARY KEY REFERENCES workers(user_id) ON DELETE CASCADE,
        skills TEXT,
        experience INTEGER,
        national_id TEXT,
        id_photo_path TEXT,
        passport_photo_path TEXT,
        additional_photo_path TEXT,
        recommendation TEXT
      )
    `);

    // Add additional_photo_path column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE worker_profiles 
        ADD COLUMN IF NOT EXISTS additional_photo_path TEXT
      `);
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Create Job Requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_requests (
        id SERIAL PRIMARY KEY,
        employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Jobs table (Posted by employers)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        salary_range TEXT,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Job Applications table (Workers applying to jobs)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        application_id SERIAL PRIMARY KEY,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, worker_id)
      )
    `);

    // Create Admin Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Password Reset Tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used INTEGER DEFAULT 0
      )
    `);

    // Create Worker Ratings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_ratings (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(worker_id, employer_id)
      )
    `);

    // Create Activity Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_email TEXT,
        action TEXT NOT NULL,
        entity TEXT,
        detail TEXT,
        ip TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Error initializing database schema:', err.message);
  }
}

// Helper function to run queries (mimicking SQLite interface)
const db = {
  run: (sql, params = [], callback) => {
    pool.query(sql, params, (err, result) => {
      if (callback) {
        if (err) {
          callback(err);
        } else {
          // For INSERT queries, add lastID property
          const mockResult = {
            lastID: result.rows[0]?.id || result.rowCount,
            changes: result.rowCount
          };
          callback(null, mockResult);
        }
      }
    });
  },

  get: (sql, params = [], callback) => {
    pool.query(sql, params, (err, result) => {
      if (callback) {
        if (err) {
          callback(err);
        } else {
          callback(null, result.rows[0] || null);
        }
      }
    });
  },

  all: (sql, params = [], callback) => {
    pool.query(sql, params, (err, result) => {
      if (callback) {
        if (err) {
          callback(err);
        } else {
          callback(null, result.rows);
        }
      }
    });
  },

  serialize: (callback) => {
    // PostgreSQL doesn't need serialization like SQLite
    if (callback) callback();
  },

  // Transaction methods for compatibility
  beginTransaction: (callback) => {
    pool.query('BEGIN', (err) => {
      if (callback) callback(err);
    });
  },

  commit: (callback) => {
    pool.query('COMMIT', (err) => {
      if (callback) callback(err);
    });
  },

  rollback: (callback) => {
    pool.query('ROLLBACK', (err) => {
      if (callback) callback(err);
    });
  }
};

module.exports = db;
