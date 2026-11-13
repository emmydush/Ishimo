// ─── Ishimo Database Initializer ─────────────────────────────────────────────
// Creates every table, applies column migrations and seeds default admin
// settings. Safe to run repeatedly (idempotent) — existing data is preserved.
//
// Usage:
//   node init-db.js                 Initialize / upgrade the database
//   node init-db.js --reset --force Drop all tables, then initialize from scratch
//   node init-db.js --help          Show this help
//
// Connects via DATABASE_URL (PostgreSQL).

const pg = require('pg');
require('dotenv').config();

const { initializeDatabase, TABLES, all, get } = require('./schema');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
Ishimo database initializer

  node init-db.js                  Create missing tables, run migrations, seed defaults
  node init-db.js --reset --force  DROP every table, then recreate the schema
  node init-db.js --help           Show this help

Environment:
  DATABASE_URL   postgres://user:password@host:5432/ishimo (required)

Notes:
  Resetting deletes ALL data — take a pg_dump backup (backup-db.js) first.
`);
  process.exit(0);
}

const RESET = hasFlag('--reset') || hasFlag('-r');
const FORCE = hasFlag('--force') || hasFlag('-f');

if (RESET && !FORCE) {
  console.error('Refusing to reset: --reset deletes ALL data.');
  console.error('Re-run with --reset --force if you really mean it.');
  process.exit(1);
}

async function dropAllTables(db) {
  const rows = await all(
    db,
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
  );
  for (const { tablename } of rows) {
    await db.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
    console.log(`  dropped: ${tablename}`);
  }
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
    "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
  );
  console.log(`  ${'indexes'.padEnd(24, ' ')} ${String(indexes.length).padStart(5, ' ')}`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL || '';

  if (!connectionString) {
    console.error('DATABASE_URL is not set. Point it at the PostgreSQL database');
    console.error('(e.g. postgres://user:password@host:5432/ishimo) and retry.');
    process.exit(1);
  }

  console.log('Ishimo database initializer');
  console.log('  database : PostgreSQL via DATABASE_URL');
  console.log(`  mode     : ${RESET ? 'reset (all data will be deleted)' : 'init / upgrade'}`);

  const pool = new pg.Pool({ connectionString, max: 1 });

  try {
    if (RESET) {
      console.log('\nDropping existing tables...');
      await dropAllTables(pool);
      console.log('');
    }

    await initializeDatabase(pool);
    console.log('Schema created and default settings seeded.');

    await summarise(pool);
    console.log('\nDone. Database is ready.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\nInitialization failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
