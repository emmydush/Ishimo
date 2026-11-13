// ─── Ishimo Database Connection (PostgreSQL) ─────────────────────────────────
// Connects to the PostgreSQL database via the pg Pool and exposes a small
// sqlite3-compatible facade (run/get/all/serialize) so route handlers keep
// their callback style while the underlying engine is PostgreSQL.
//
// Requirements:
//   DATABASE_URL   postgres://user:password@host:5432/database  (required)
//
// Data persists in the managed database — no file to back up. Deploy-time
// snapshots are handled by backup-db.js (pg_dump) in the all-in-one image.

const pg = require('pg');
require('dotenv').config();

// Count/avg aggregates are bigint/numeric in PostgreSQL; parse them as plain
// JS numbers to match what the SQLite driver used to return.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));  // int8    -> number
pg.types.setTypeParser(1700, (v) => parseFloat(v));  // numeric -> float

const { initializeDatabase } = require('./schema');

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.error('[DB] DATABASE_URL is not set. Point it at the PostgreSQL database');
  console.error('[DB] (e.g. postgres://user:password@host:5432/ishimo) and restart.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  max: 10,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// Initialize the schema on every boot (idempotent CREATE IF NOT EXISTS).
// Exposed as `ready` so scripts can await the first connection before use.
const ready = initializeDatabase(pool)
  .then(() => console.log('Database schema initialized successfully'))
  .catch((initErr) => {
    console.error('Error initializing database schema:', initErr.message);
    process.exit(1);
  });

// ─── sqlite3-compatible facade ────────────────────────────────────────────────
// `serialize` pins one pool client so statements issued inside the block run
// in order on a single connection — required for BEGIN/COMMIT transactions.
// Statements are not executed eagerly: each run/get/all inside a serialize
// block is queued and executed FIFO, one at a time, because a single pg
// client cannot run concurrent queries (sqlite3's serialize behaves the same
// way).
// `run` callbacks receive sqlite3-style context: `this.lastID` (the `id`
// column of the first returned row, used with INSERT ... RETURNING id) and
// `this.changes` (the affected row count).
const db = {
  _queue: Promise.resolve(),
  _client: null,
  _pending: null,

  serialize(fn) {
    const prev = this._queue;
    const task = prev.then(async () => {
      const client = await pool.connect();
      const pending = [];
      this._client = client;
      this._pending = pending;
      try {
        fn();
        // Statements issued by fn() and by callbacks are queued in order;
        // execute them strictly one at a time on the pinned client.
        while (pending.length) {
          await pending.shift()();
        }
      } catch (err) {
        console.error('[DB] serialize error:', err.message);
      } finally {
        this._client = null;
        this._pending = null;
        client.release();
      }
    });
    this._queue = task.catch(() => {});
  },

  _enqueue(executor) {
    if (this._client) {
      // Inside serialize: defer to keep statements sequential on one client.
      this._pending.push(() => executor(this._client));
      return;
    }
    // Outside serialize: run on the pool immediately.
    return executor(pool);
  },

  run(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    return this._enqueue((target) =>
      target.query(sql, params || [])
        .then((res) => {
          if (cb) {
            const ctx = {
              lastID: res.rows.length && res.rows[0].id !== undefined ? res.rows[0].id : null,
              changes: res.rowCount || 0,
            };
            cb.call(ctx, null);
          }
        })
        .catch((err) => {
          if (cb) cb(err);
          else console.error('[DB] query error:', err.message);
        })
    );
  },

  get(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    return this._enqueue((target) =>
      target.query(sql, params || [])
        .then((res) => { if (cb) cb(null, res.rows[0]); })
        .catch((err) => {
          if (cb) cb(err);
          else console.error('[DB] query error:', err.message);
        })
    );
  },

  all(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    return this._enqueue((target) =>
      target.query(sql, params || [])
        .then((res) => { if (cb) cb(null, res.rows); })
        .catch((err) => {
          if (cb) cb(err);
          else console.error('[DB] query error:', err.message);
        })
    );
  },

  close(cb) {
    pool.end()
      .then(() => { if (cb) cb(); })
      .catch((err) => { if (cb) cb(err); });
  },
};

module.exports = db;
module.exports.pool = pool;
module.exports.ready = ready;
