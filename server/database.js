const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const { initializeDatabase, get, all } = require('./schema');

const dbPath = path.resolve(__dirname, process.env.SQLITE_PATH || 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
    process.exit(1);
  }

  console.log('Connected to the SQLite database.');
  db.run('PRAGMA foreign_keys = ON');

  initializeDatabase(db)
    .then(() => {
      console.log('Database schema initialized successfully');
    })
    .catch((initErr) => {
      console.error('Error initializing database schema:', initErr.message);
      db.close();
      process.exit(1);
    });
});

module.exports = db;
