#!/usr/bin/env node
// ─── Ishimo Database Initializer ─────────────────────────────────────────────
// Creates every table, applies column migrations and seeds default admin
// settings. Safe to run repeatedly (idempotent) — existing data is preserved.
//
// Usage:
//   node init-db.js                 Initialize / upgrade the database
//   node init-db.js --reset --force Drop all tables, then initialize from scratch
//   node init-db.js --help          Show this help
//
// The target file can be overridden with the SQLITE_PATH environment variable.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initializeDatabase, TABLES, all, run, get } = require('./schema');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
Ishimo database initializer

  node init-db.js                  Create missing tables, run migrations, seed defaults
  node init-db.js --reset --force  DROP every table, then recreate the schema
  node init-db.js --help           Show this help

Environment:
  SQLITE_PATH   Path to the SQLite file (default: <server>/database.sqlite)

Notes:
  Existing databases are copied to <file>.bak-<timestamp> before migrating.
`);
  process.exit(0);
}

const RESET = hasFlag('--reset') || hasFlag('-r');
const FORCE = hasFlag('--force') || hasFlag('-f');

const dbPath = path.resolve(__dirname, process.env.SQLITE_PATH || 'database.sqlite');

if (RESET && !FORCE) {
  console.error('Refusing to reset: --reset deletes ALL data.');
  console.error('Re-run with --reset --force if you really mean it.');
  process.exit(1);
}

const relPath = path.relative(process.cwd(), dbPath) || dbPath;

async function dropAllTables(db) {
  await run(db, 'PRAGMA foreign_keys = OFF');
  const rows = await all(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  );
  for (const { name } of rows) {
    await run(db, `DROP TABLE IF EXISTS "${name}"`);
    console.log(`  dropped: ${name}`);
  }
  await run(db, 'PRAGMA foreign_keys = ON');
}

async function summarise(db) {
  console.log('\nSchema summary:');
  const tableNames = (TABLES.map((sql) => sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i))
    .filter(Boolean)
    .map((m) => m[1]));

  for (const name of tableNames) {
    const row = await get(db, `SELECT COUNT(*) as count FROM "${name}"`);
    const pad = name.padEnd(24, ' ');
    console.log(`  ${pad} ${String(row.count).padStart(5, ' ')} rows`);
  }

  const indexes = await all(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'"
  );
  console.log(`  ${'indexes'.padEnd(24, ' ')} ${String(indexes.length).padStart(5, ' ')}`);
}

async function main() {
  const existsBefore = fs.existsSync(dbPath);

  console.log('Ishimo database initializer');
  console.log(`  database : ${relPath}`);
  console.log(`  mode     : ${RESET ? 'reset (all data will be deleted)' : 'init / upgrade'}`);
  console.log(`  file     : ${existsBefore ? 'existing (will be migrated in place)' : 'new (will be created)'}`);

  // Migrating an existing database is not reversible — keep a copy first.
  if (existsBefore && !RESET) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${dbPath}.bak-${stamp}`;
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`  backup   : ${path.basename(backupPath)}`);
    } catch (err) {
      console.warn(`  backup   : skipped (${err.message})`);
    }
  }
  console.log('');

  const db = new sqlite3.Database(dbPath);
  await new Promise((resolve, reject) => {
    db.on('open', resolve);
    db.on('error', reject);
  });

  try {
    if (RESET) {
      console.log('Dropping existing tables...');
      await dropAllTables(db);
      console.log('');
    }

    await run(db, 'PRAGMA foreign_keys = ON');
    await initializeDatabase(db);
    console.log('Schema created and default settings seeded.');
    console.log(`  foreign keys: ${(await get(db, 'PRAGMA foreign_keys')).foreign_keys ? 'ON' : 'OFF'}`);

    await summarise(db);
    console.log('\nDone. Database is ready.');
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('\nInitialization failed:', err.message);
    db.close();
    process.exit(1);
  }
}

main();
