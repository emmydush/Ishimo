const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Create Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK( role IN ('employer','worker') ) NOT NULL,
        status TEXT DEFAULT 'active' CHECK( status IN ('active','suspended','blocked') ),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add status column to existing users if it doesn't exist
    db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK( status IN ('active','suspended','blocked') )", (err) => {
      // Ignore error if column already exists
    });

    // Create Employers table
    db.run(`
      CREATE TABLE IF NOT EXISTS employers (
        user_id INTEGER PRIMARY KEY,
        phone TEXT NOT NULL,
        location TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Workers table
    db.run(`
      CREATE TABLE IF NOT EXISTS workers (
        user_id INTEGER PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        location TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Worker Profiles table
    db.run(`
      CREATE TABLE IF NOT EXISTS worker_profiles (
        worker_id INTEGER PRIMARY KEY,
        skills TEXT,
        experience INTEGER,
        national_id TEXT,
        id_photo_path TEXT,
        passport_photo_path TEXT,
        recommendation TEXT,
        FOREIGN KEY (worker_id) REFERENCES workers(user_id) ON DELETE CASCADE
      )
    `);

    // Create Job Requests table
    db.run(`
      CREATE TABLE IF NOT EXISTS job_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employer_id INTEGER NOT NULL,
        worker_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK( status IN ('pending','accepted','declined') ),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Jobs table (Posted by employers)
    db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employer_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        salary_range TEXT,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Job Applications table (Workers applying to jobs)
    db.run(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        worker_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }
});

module.exports = db;
