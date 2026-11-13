#!/usr/bin/env node
// ─── Ishimo deployment data backup ───────────────────────────────────────────
// Dumps the PostgreSQL database with pg_dump before each deploy's server start
// so a bad release can never take the only copy of production data down with it.
//
// Runs from start.sh BEFORE the API process opens the database, and keeps the
// most recent dumps in BACKUP_DIR (default /app/data/backups in the all-in-one
// image, <server>/backups locally).
//
//   node backup-db.js                 Dump the database at DATABASE_URL
//   BACKUP_KEEP=10 node backup-db.js  Keep 10 dumps instead of the default 5

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.log('[backup] DATABASE_URL is not set — nothing to back up.');
  process.exit(0);
}

const KEEP = Math.max(1, parseInt(process.env.BACKUP_KEEP, 10) || 5);
const backupDir = path.resolve(
  __dirname,
  process.env.BACKUP_DIR || (process.env.NODE_ENV === 'production' ? '/app/data/backups' : 'backups')
);
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(backupDir, `database-${stamp}.sql`);

// pg_dump accepts the connection string directly; credentials are only ever
// passed as arguments, never written into the dump file. --no-owner keeps the
// dump restorable into any database/user.
execFileSync('pg_dump', [connectionString, '--no-owner', '--file', target], { stdio: 'inherit' });
console.log(`[backup] Dump created: ${target}`);

// Prune old dumps, newest first
const dumps = fs
  .readdirSync(backupDir)
  .filter((f) => /^database-.*\.sql$/.test(f))
  .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time);

for (const old of dumps.slice(KEEP)) {
  fs.unlinkSync(path.join(backupDir, old.name));
  console.log(`[backup] Pruned old dump: ${old.name}`);
}

console.log(`[backup] Keeping the ${Math.min(KEEP, dumps.length)} most recent dump(s).`);
