#!/usr/bin/env node
// ─── Ishimo SQLite → PostgreSQL data migration ───────────────────────────────
// One-time copy of every row from the legacy SQLite database into PostgreSQL.
// Reads the source with sqlite3 (read-only) and inserts through pg, in
// foreign-key-safe order, preserving ids and re-syncing the SERIAL sequences.
//
// Usage:
//   node migrate-data.js              Copy data (fails if PostgreSQL has rows)
//   node migrate-data.js --truncate   Empty the PostgreSQL tables first
//   node migrate-data.js --help       Show this help
//
// Environment:
//   SQLITE_PATH   Path to the SQLite file (default: <server>/database.sqlite)
//   DATABASE_URL  postgres://user:password@host:5432/ishimo (required)

const sqlite3 = require('sqlite3').verbose();
const pg = require('pg');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./schema');

// Parent tables first so foreign keys exist when children arrive.
const TABLES_ORDER = [
  'users',
  'employers',
  'workers',
  'worker_profiles',
  'jobs',
  'job_requests',
  'job_applications',
  'admin_settings',
  'notifications',
  'password_reset_tokens',
  'worker_ratings',
  'activity_logs',
];

// SQLite stores DATETIME as 'YYYY-MM-DD HH:MM:SS'; normalize to ISO for
// PostgreSQL's TIMESTAMPTZ columns.
const DATE_COLUMNS = new Set(['created_at', 'expires_at']);

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
Ishimo SQLite → PostgreSQL migration

  node migrate-data.js              Copy data (fails if PostgreSQL has rows)
  node migrate-data.js --truncate   Empty the PostgreSQL tables first
  node migrate-data.js --help       Show this help

Environment:
  SQLITE_PATH   Path to the SQLite file (default: <server>/database.sqlite)
  DATABASE_URL  postgres://user:password@host:5432/ishimo (required)
`);
  process.exit(0);
}

const TRUNCATE = hasFlag('--truncate');

// ─── Promise wrappers ─────────────────────────────────────────────────────────
const sqliteAll = (db, sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

const sqliteColumns = (db, table) => sqliteAll(db, `PRAGMA table_info("${table}")`);

const pgColumns = async (pool, table) => {
  const res = await pool.query(
    'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
    [table]
  );
  return res.rows.map((r) => r.column_name);
};

const toPgValue = (column, value) => {
  if (value === null || value === undefined) return null;
  if (
    DATE_COLUMNS.has(column) &&
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
  ) {
    return `${value.replace(' ', 'T')}Z`;
  }
  return value;
};

// ─── Copy one table ───────────────────────────────────────────────────────────
async function copyTable(sqliteDb, pool, table) {
  const srcCols = (await sqliteColumns(sqliteDb, table)).map((c) => c.name);
  const dstCols = new Set(await pgColumns(pool, table));
  const cols = srcCols.filter((c) => dstCols.has(c));

  if (!cols.length) {
    console.log(`  ${table.padEnd(20)} no common columns — skipped`);
    return 0;
  }

  const rows = await sqliteAll(sqliteDb, `SELECT * FROM "${table}"`);
  if (!rows.length) {
    console.log(`  ${table.padEnd(20)} 0 rows`);
    return 0;
  }

  const colList = cols.map((c) => `"${c}"`).join(', ');
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  let inserted = 0;
  for (const row of rows) {
    const values = cols.map((c) => toPgValue(c, row[c]));
    const res = await pool.query(sql, values);
    inserted += res.rowCount || 0;
  }

  console.log(`  ${table.padEnd(20)} ${rows.length} rows read, ${inserted} inserted`);
  return inserted;
}

// Explicit-id inserts do not advance SERIAL sequences — re-sync them so new
// rows get ids after the copied maximum.
async function fixSequence(pool, table) {
  // Tables without an `id` column (e.g. employers.user_id) have no sequence.
  const idCol = await pool.query(
    'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
    [table, 'id']
  );
  if (!idCol.rows.length) return;

  const res = await pool.query(
    'SELECT pg_get_serial_sequence($1, $2) AS seq',
    [table, 'id']
  );
  const seq = res.rows[0] && res.rows[0].seq;
  if (!seq) return; // `id` exists but is not SERIAL

  await pool.query(
    `SELECT setval($1::regclass, COALESCE((SELECT MAX(id) FROM "${table}"), 1), EXISTS (SELECT 1 FROM "${table}"))`,
    [seq]
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const dbPath = path.resolve(
    __dirname,
    process.env.SQLITE_PATH || 'database.sqlite'
  );
  const connectionString = process.env.DATABASE_URL || '';

  if (!require('fs').existsSync(dbPath)) {
    console.error(`Source database not found: ${dbPath}`);
    console.error('Set SQLITE_PATH to the legacy SQLite file.');
    process.exit(1);
  }
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Point it at the PostgreSQL database');
    console.error('(e.g. postgres://user:password@host:5432/ishimo) and retry.');
    process.exit(1);
  }

  console.log('Ishimo SQLite → PostgreSQL migration');
  console.log(`  source : ${path.relative(process.cwd(), dbPath) || dbPath}`);
  console.log(`  target : PostgreSQL via DATABASE_URL`);
  console.log(`  mode   : ${TRUNCATE ? 'truncate target, then copy' : 'copy into empty target'}\n`);

  const sqliteDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
  const pool = new pg.Pool({ connectionString, max: 5 });

  try {
    // Make sure the target schema exists before copying into it.
    await initializeDatabase(pool);

    const countRes = await pool.query('SELECT COUNT(*) AS count FROM users');
    const existingUsers = parseInt(countRes.rows[0].count, 10);

    if (existingUsers > 0 && !TRUNCATE) {
      console.error('The PostgreSQL database already contains rows.');
      console.error('Re-run with --truncate to empty it first (deletes ALL target data).');
      sqliteDb.close();
      await pool.end();
      process.exit(1);
    }

    if (TRUNCATE) {
      console.log('Truncating target tables...');
      const tables = TABLES_ORDER.map((t) => `"${t}"`).join(', ');
      await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
      console.log('');
    }

    console.log('Copying tables (foreign-key-safe order):');
    let total = 0;
    for (const table of TABLES_ORDER) {
      total += await copyTable(sqliteDb, pool, table);
    }

    console.log('\nRe-syncing SERIAL sequences...');
    for (const table of TABLES_ORDER) {
      await fixSequence(pool, table);
    }

    console.log(`\nDone. ${total} rows copied to PostgreSQL.`);
    sqliteDb.close();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    sqliteDb.close();
    await pool.end();
    process.exit(1);
  }
}

main();
