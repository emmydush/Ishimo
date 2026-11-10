#!/usr/bin/env node
// ─── Ishimo Admin Credentials ────────────────────────────────────────────────
// Creates or replaces the admin login password stored in admin_settings.
// The admin username is fixed to "admin" (ADMIN_USERNAME in server.js).
//
// Usage:
//   node create-admin.js                      Prompt for a password (hidden input)
//   node create-admin.js --password Secret123 Interactive-free, e.g. in CI
//   node create-admin.js --force              Allow replacing an existing password
//   node create-admin.js --help               Show this help
//
// The target file can be overridden with the SQLITE_PATH environment variable.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config();

const { initializeDatabase, run, get } = require('./schema');

const ADMIN_USERNAME = 'admin';

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
Ishimo admin credentials

  node create-admin.js                       Prompt for a password (input hidden)
  node create-admin.js --password <value>    Set the password non-interactively
  node create-admin.js --force               Allow overwriting an existing password
  node create-admin.js --help                Show this help

Environment:
  SQLITE_PATH     Path to the SQLite file (default: <server>/database.sqlite)
  ADMIN_PASSWORD  Password to use when --password is omitted (optional)

Notes:
  The admin username is always "admin".
  Only a bcrypt hash is stored — the plain password is never written to disk.
`);
  process.exit(0);
}

// ─── Argument / environment parsing ───────────────────────────────────────────
function readPasswordFlag() {
  const idx = args.findIndex((a) => a === '--password' || a === '-p');
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith('-')) {
    console.error('Error: --password requires a value.');
    process.exit(1);
  }
  return value;
}

function promptHidden(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      // Non-interactive: read one line from stdin
      let data = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => { data += chunk; });
      stdin.on('end', () => resolve(data.split(/\r?\n/)[0] || ''));
      return;
    }

    process.stdout.write(query);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          stdin.pause();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') { // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        if (ch === '\u001b') continue; // ignore escape sequences
        value += ch;
      }
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const FORCE = hasFlag('--force') || hasFlag('-f');
  const dbPath = path.resolve(__dirname, process.env.SQLITE_PATH || 'database.sqlite');

  console.log('Ishimo admin credentials');
  console.log(`  database : ${path.relative(process.cwd(), dbPath) || dbPath}`);
  console.log(`  username : ${ADMIN_USERNAME}\n`);

  if (!fs.existsSync(dbPath)) {
    console.log('Database file not found — it will be created and initialized.\n');
  }

  const db = new sqlite3.Database(dbPath);
  await new Promise((resolve, reject) => {
    db.on('open', resolve);
    db.on('error', reject);
  });

  try {
    // Make sure admin_settings exists (works on a brand-new database)
    await run(db, 'PRAGMA foreign_keys = ON');
    await initializeDatabase(db);

    const existing = await get(db, "SELECT value FROM admin_settings WHERE key = 'password_hash'");

    if (existing && existing.value && !FORCE) {
      console.error('An admin password already exists.');
      console.error('Re-run with --force to replace it.');
      db.close();
      process.exit(1);
    }

    // Minimum length comes from the platform setting when available
    const minRow = await get(db, "SELECT value FROM admin_settings WHERE key = 'password_min_length'");
    const minLength = Math.max(8, parseInt(minRow && minRow.value, 10) || 8);

    let password = readPasswordFlag() || process.env.ADMIN_PASSWORD || null;

    if (!password) {
      password = await promptHidden('New admin password: ');
      const confirm = await promptHidden('Confirm password: ');
      if (password !== confirm) {
        console.error('\nError: passwords do not match.');
        db.close();
        process.exit(1);
      }
    }

    if (!password || password.length < minLength) {
      console.error(`\nError: password must be at least ${minLength} characters.`);
      db.close();
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);

    await run(
      db,
      `INSERT INTO admin_settings (key, value) VALUES ('password_hash', ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [hash]
    );

    console.log(`\nAdmin password ${existing && existing.value ? 'updated' : 'created'} successfully.`);
    console.log(`  login: ${ADMIN_USERNAME}`);
    console.log('  hash : stored in admin_settings.password_hash (bcrypt)');
    console.log('\nSign in at the login page using the username "admin".');
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('\nFailed to set admin credentials:', err.message);
    db.close();
    process.exit(1);
  }
}

main();
