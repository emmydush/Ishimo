// ─── Ishimo Database Schema ───────────────────────────────────────────────────
// Single source of truth for the PostgreSQL schema, column migrations and
// default admin settings. Used by both `database.js` (at server startup) and
// `init-db.js` (standalone CLI initializer).

// Tables are created with their full, current column set so a brand-new
// database needs no follow-up ALTERs.
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('employer', 'worker')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS employers (
    user_id INTEGER PRIMARY KEY,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS workers (
    user_id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    availability TEXT DEFAULT 'available',
    profile_views INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS worker_profiles (
    worker_id INTEGER PRIMARY KEY,
    skills TEXT,
    experience INTEGER,
    national_id TEXT,
    id_photo_path TEXT,
    passport_photo_path TEXT,
    additional_photo_path TEXT,
    recommendation TEXT,
    FOREIGN KEY (worker_id) REFERENCES workers(user_id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS job_requests (
    id SERIAL PRIMARY KEY,
    employer_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    employer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    salary_range TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS job_applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, worker_id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS admin_settings (
    "key" TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS worker_ratings (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL,
    employer_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, employer_id),
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_email TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    detail TEXT,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
];

// Columns added after the original release — applied to pre-existing databases.
// IF NOT EXISTS makes these idempotent on PostgreSQL.
const COLUMN_MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`,
  `ALTER TABLE workers ADD COLUMN IF NOT EXISTS location TEXT DEFAULT ''`,
  `ALTER TABLE workers ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available'`,
  `ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0`,
  `ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS additional_photo_path TEXT`,
];

// Default values seeded into admin_settings (never overwrites existing values).
const DEFAULT_ADMIN_SETTINGS = {
  // Platform Settings
  site_name: 'Ishimo',
  site_description: 'Connecting workers with employers',
  maintenance_mode: 'false',
  maintenance_message: 'Site is under maintenance. Please check back later.',

  // Registration Settings
  allow_registration: 'true',
  max_workers_per_employer: '10',
  require_worker_verification: 'true',
  require_employer_verification: 'false',

  // Email/Notification Settings
  email_notifications_enabled: 'true',
  welcome_email_enabled: 'true',
  job_alert_email_enabled: 'true',
  admin_notification_email: '',

  // SMTP Configuration
  smtp_host: '',
  smtp_port: '587',
  smtp_secure: 'false',
  smtp_user: '',
  smtp_password: '',
  smtp_from_email: 'noreply@ishimo.com',
  smtp_from_name: 'Ishimo',

  // Content Moderation Settings
  auto_moderate_jobs: 'true',
  require_job_approval: 'false',
  profanity_filter_enabled: 'true',
  max_job_description_length: '5000',

  // API/Rate Limit Settings
  api_rate_limit_enabled: 'true',
  api_rate_limit_window: '15',
  api_rate_limit_max_requests: '100',

  // User Management Settings
  user_session_timeout: '30',
  password_min_length: '8',
  password_require_special_char: 'true',
  account_inactivity_days: '90',

  // Job Posting Settings
  max_active_jobs_per_employer: '20',
  job_expiry_days: '30',
  allow_job_editing: 'true',
  allow_job_deletion: 'true',
};

// ─── Promise wrappers around pg queries ───────────────────────────────────────
// `db` here is the pg Pool (or a single client); SQL uses $1-style placeholders.
const run = async (db, sql, params = []) => {
  const res = await db.query(sql, params);
  return { lastID: res.rows.length ? res.rows[0].id : null, changes: res.rowCount || 0 };
};

const get = async (db, sql, params = []) => {
  const res = await db.query(sql, params);
  return res.rows[0];
};

const all = async (db, sql, params = []) => {
  const res = await db.query(sql, params);
  return res.rows;
};

// ─── Steps ────────────────────────────────────────────────────────────────────
async function applySchema(db) {
  for (const sql of TABLES) {
    await run(db, sql);
  }

  for (const sql of COLUMN_MIGRATIONS) {
    await run(db, sql);
  }
}

async function seedDefaults(db) {
  // Seed first, so the rows a migration wants to update already exist.
  for (const [key, value] of Object.entries(DEFAULT_ADMIN_SETTINGS)) {
    await run(db, 'INSERT INTO admin_settings ("key", value) VALUES ($1, $2) ON CONFLICT ("key") DO NOTHING', [key, value]);
  }

  // One-time migration: legacy admin_email -> admin_notification_email
  const legacy = await get(db, "SELECT value FROM admin_settings WHERE \"key\" = 'admin_email'");
  if (legacy && legacy.value) {
    const current = await get(db, "SELECT value FROM admin_settings WHERE \"key\" = 'admin_notification_email'");
    if (!current || !current.value) {
      await run(db, "UPDATE admin_settings SET value = $1 WHERE \"key\" = 'admin_notification_email'", [legacy.value]);
    }
    await run(db, "DELETE FROM admin_settings WHERE \"key\" = 'admin_email'");
  }
}

async function initializeDatabase(db) {
  await applySchema(db);
  await seedDefaults(db);
}

module.exports = {
  TABLES,
  COLUMN_MIGRATIONS,
  DEFAULT_ADMIN_SETTINGS,
  run,
  get,
  all,
  applySchema,
  seedDefaults,
  initializeDatabase,
};
