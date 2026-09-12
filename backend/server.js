const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
const PORT = 3000;

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_TOKEN = 'admin-secret-token-ishimo';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Sanitization helper ──────────────────────────────────────────────────────
// Strips leading/trailing whitespace, collapses internal whitespace,
// and removes HTML/script tags to prevent XSS / injection noise.
const sanitize = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/\s+/g, ' ');            // collapse internal whitespace
};

// Sanitize a number string – returns '' if not a valid non-negative number
const sanitizeNumber = (value) => {
  const n = Number(sanitize(value));
  return (!isNaN(n) && n >= 0) ? String(n) : '';
};

// Basic email format check
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// ─────────────────────────────────────────────────────────────────────────────

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const makeLimit = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,   // Return RateLimit-* headers
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: message }),
  });

// 1. Auth: login + register — 10 attempts per 15 min per IP
const authLimiter = makeLimit(
  15, 10,
  'Too many attempts. Please wait 15 minutes before trying again.'
);

// 2. Write operations: profile updates, job posting, applications — 30 per 10 min
const writeLimiter = makeLimit(
  10, 30,
  'Too many requests. Please slow down and try again shortly.'
);

// 3. Public reads: job listings, worker listings — 120 per minute
const readLimiter = makeLimit(
  1, 120,
  'Too many requests. Please try again in a moment.'
);

// 4. Admin endpoints — 60 per 5 min (internal usage but still guarded)
const adminLimiter = makeLimit(
  5, 60,
  'Too many admin requests. Please wait before retrying.'
);
// ─────────────────────────────────────────────────────────────────────────────

// Migrations: add columns / tables for existing databases
setTimeout(() => {
  db.run(`ALTER TABLE workers ADD COLUMN location TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error (location):', err.message);
    }
  });

  db.run(`ALTER TABLE workers ADD COLUMN availability TEXT DEFAULT 'available'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error (availability):', err.message);
    }
  });

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
  `, (err) => {
    if (err) console.error('Migration error (notifications):', err.message);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error('Migration error (admin_settings):', err.message);
    else {
      bcrypt.hash('admin123', 10, (err, hash) => {
        if (!err) {
          db.run(`INSERT OR IGNORE INTO admin_settings (key, value) VALUES ('password_hash', ?)`, [hash]);
        }
      });
    }
  });

  // Add admin_notification_email setting if not exists
  db.run(`INSERT OR IGNORE INTO admin_settings (key, value) VALUES ('admin_notification_email', '')`, (err) => {
    if (err) console.error('Migration error (admin_notification_email):', err.message);
  });

  // Migrate old admin_email to admin_notification_email if exists
  db.get("SELECT value FROM admin_settings WHERE key = 'admin_email'", [], (err, row) => {
    if (!err && row && row.value && row.value !== '') {
      db.run("UPDATE admin_settings SET value = ? WHERE key = 'admin_notification_email'", [row.value], (err) => {
        if (err) console.error('Migration error (admin_email migration):', err.message);
        else {
          console.log('Migrated admin_email to admin_notification_email');
          // Remove old admin_email setting after migration
          db.run(`DELETE FROM admin_settings WHERE key = 'admin_email'`, (err) => {
            if (err && !err.message.includes('no such table')) {
              console.error('Migration error (removing admin_email):', err.message);
            }
          });
        }
      });
    }
  });

  // Initialize default admin settings if they don't exist
  const defaultSettings = {
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
    allow_job_deletion: 'true'
  };

  Object.entries(defaultSettings).forEach(([key, value]) => {
    db.run(`INSERT OR IGNORE INTO admin_settings (key, value) VALUES (?, ?)`, [key, value], (err) => {
      if (err) console.error(`Migration error (${key}):`, err.message);
    });
  });

  // Activity logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT,
      action TEXT NOT NULL,
      entity TEXT,
      detail TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Migration error (activity_logs):', err.message);
  });
}, 500);

// Helper: log a user activity
const logActivity = (userId, userEmail, action, entity, detail, ip) => {
  db.run(
    'INSERT INTO activity_logs (user_id, user_email, action, entity, detail, ip) VALUES (?, ?, ?, ?, ?, ?)',
    [userId || null, userEmail || 'anonymous', action, entity || null, detail || null, ip || null],
    (err) => { if (err) console.error('Failed to log activity:', err.message); }
  );
};

// Helper: create a notification for a user
const createNotification = (userId, type, message) => {
  db.run(
    'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
    [userId, type, message],
    (err) => { if (err) console.error('Failed to create notification:', err.message); }
  );
};

// Helper: send email using configured SMTP settings
const sendEmail = (to, subject, html, callback) => {
  console.log(`[EMAIL] Attempting to send email to: ${to}, subject: ${subject}`);
  
  // Get SMTP settings from admin_settings
  db.all("SELECT key, value FROM admin_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'smtp_from_email', 'smtp_from_name', 'email_notifications_enabled')", [], async (err, rows) => {
    if (err) {
      console.error('[EMAIL] Failed to fetch SMTP settings:', err.message);
      return callback && callback(false);
    }

    const settings = {};
    if (Array.isArray(rows)) {
      rows.forEach(row => settings[row.key] = row.value);
    } else if (rows) {
      settings[rows.key] = rows.value;
    }

    console.log('[EMAIL] Settings loaded:', {
      email_notifications_enabled: settings.email_notifications_enabled,
      smtp_host: settings.smtp_host,
      smtp_port: settings.smtp_port,
      smtp_secure: settings.smtp_secure,
      smtp_user: settings.smtp_user ? '***configured***' : 'missing',
      smtp_password: settings.smtp_password ? '***configured***' : 'missing',
      smtp_from_email: settings.smtp_from_email,
      smtp_from_name: settings.smtp_from_name
    });

    // Check if email notifications are enabled
    if (settings.email_notifications_enabled !== 'true') {
      console.log('[EMAIL] Email notifications are disabled');
      return callback && callback(false);
    }

    // Check if SMTP is configured
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      console.log('[EMAIL] SMTP not configured, skipping email send');
      console.log('[EMAIL] Missing:', {
        smtp_host: !settings.smtp_host,
        smtp_user: !settings.smtp_user,
        smtp_password: !settings.smtp_password
      });
      return callback && callback(false);
    }

    try {
      // Create transporter
      console.log('[EMAIL] Creating transporter with:', {
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 587,
        secure: settings.smtp_secure === 'true'
      });
      
      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 587,
        secure: settings.smtp_secure === 'true',
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_password
        }
      });

      // Verify transporter connection
      await transporter.verify();
      console.log('[EMAIL] Transporter verified successfully');

      // Send email
      const info = await transporter.sendMail({
        from: `"${settings.smtp_from_name || 'Ishimo'}" <${settings.smtp_from_email || settings.smtp_user}>`,
        to: to,
        subject: subject,
        html: html
      });

      console.log('[EMAIL] Email sent successfully:', info.messageId);
      return callback && callback(true);
    } catch (error) {
      console.error('[EMAIL] Failed to send email:', error.message);
      console.error('[EMAIL] Full error:', error);
      return callback && callback(false);
    }
  });
};

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// API Endpoints

app.get('/', (req, res) => {
  res.json({
    message: 'Ishimo API is running.',
    app: 'Open the frontend at http://localhost:5173',
  });
});

// 1. Register Employer
app.post('/api/register/employer', authLimiter, async (req, res) => {
  const email    = sanitize(req.body.email).toLowerCase();
  const password = (req.body.password || '').trim();
  const phone    = sanitize(req.body.phone);
  const location = sanitize(req.body.location);

  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });
  if (!location) return res.status(400).json({ error: 'Location is required.' });

  try {
    const hash = await bcrypt.hash(password, 10);
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, hash, 'employer'], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(400).json({ error: 'Email already exists' });
        }
        const userId = this.lastID;
        db.run('INSERT INTO employers (user_id, phone, location) VALUES (?, ?, ?)', [userId, phone, location], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create employer profile' });
          }
          db.run('COMMIT');
          logActivity(userId, email, 'register', 'employer', `Employer registered from ${location}`, req.ip);
          
          // Send welcome email to employer
          db.get("SELECT value FROM admin_settings WHERE key = 'welcome_email_enabled'", [], (err, welcomeRow) => {
            if (!err && welcomeRow && welcomeRow.value === 'true') {
              const emailHtml = `
                <h2>Welcome to Ishimo!</h2>
                <p>Thank you for registering as an employer on the Ishimo platform.</p>
                <p><strong>Your Account Details:</strong></p>
                <ul>
                  <li>Email: ${email}</li>
                  <li>Location: ${location}</li>
                </ul>
                <p>You can now post jobs and connect with skilled workers.</p>
                <p>Please log in to your dashboard to get started.</p>
                <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
              `;
              sendEmail(email, 'Welcome to Ishimo - Employer Registration Complete', emailHtml);
            }
          });

          // Notify admin of new employer registration
          db.get("SELECT value FROM admin_settings WHERE key = 'admin_notification_email'", [], (err, adminRow) => {
            if (!err && adminRow && adminRow.value) {
              const adminEmailHtml = `
                <h2>New Employer Registration</h2>
                <p>A new employer has registered on the Ishimo platform.</p>
                <p><strong>Employer Email:</strong> ${email}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
                <p>Please log in to the admin dashboard for more details.</p>
              `;
              sendEmail(adminRow.value, 'New Employer Registration - Ishimo', adminEmailHtml);
            }
          });

          res.status(201).json({ success: true, userId, role: 'employer' });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Register Worker
app.post('/api/register/worker', authLimiter, async (req, res) => {
  const fullName = sanitize(req.body.fullName);
  const email    = sanitize(req.body.email).toLowerCase();
  const password = (req.body.password || '').trim();
  const phone    = sanitize(req.body.phone);
  const location = sanitize(req.body.location);

  if (!fullName) return res.status(400).json({ error: 'Full name is required.' });
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

  try {
    const hash = await bcrypt.hash(password, 10);
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, hash, 'worker'], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(400).json({ error: 'Email already exists' });
        }
        const userId = this.lastID;
        db.run('INSERT INTO workers (user_id, full_name, phone, location) VALUES (?, ?, ?, ?)', [userId, fullName, phone, location || ''], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create worker profile' });
          }
          db.run('COMMIT');
          logActivity(userId, email, 'register', 'worker', `Worker registered from ${location || 'unknown'}`, req.ip);
          
          // Send welcome email to worker
          db.get("SELECT value FROM admin_settings WHERE key = 'welcome_email_enabled'", [], (err, welcomeRow) => {
            if (!err && welcomeRow && welcomeRow.value === 'true') {
              const emailHtml = `
                <h2>Welcome to Ishimo!</h2>
                <p>Thank you for registering as a worker on the Ishimo platform.</p>
                <p><strong>Your Account Details:</strong></p>
                <ul>
                  <li>Name: ${fullName}</li>
                  <li>Email: ${email}</li>
                  <li>Location: ${location || 'Not specified'}</li>
                </ul>
                <p>Please complete your profile to start receiving job requests from employers.</p>
                <p>Log in to your dashboard to complete your onboarding process.</p>
                <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
              `;
              sendEmail(email, 'Welcome to Ishimo - Worker Registration Complete', emailHtml);
            }
          });

          // Notify admin of new worker registration
          db.get("SELECT value FROM admin_settings WHERE key = 'admin_notification_email'", [], (err, adminRow) => {
            if (!err && adminRow && adminRow.value) {
              const adminEmailHtml = `
                <h2>New Worker Registration</h2>
                <p>A new worker has registered on the Ishimo platform.</p>
                <p><strong>Worker Name:</strong> ${fullName}</p>
                <p><strong>Worker Email:</strong> ${email}</p>
                <p><strong>Location:</strong> ${location || 'Not specified'}</p>
                <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
                <p>Please log in to the admin dashboard for more details.</p>
              `;
              sendEmail(adminRow.value, 'New Worker Registration - Ishimo', adminEmailHtml);
            }
          });

          res.status(201).json({ success: true, userId, role: 'worker' });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Login
app.post('/api/login', authLimiter, async (req, res) => {
  const email    = sanitize(req.body.email).toLowerCase();
  const password = (req.body.password || '').trim();
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (email === ADMIN_USERNAME) {
    db.get("SELECT value FROM admin_settings WHERE key = 'password_hash'", async (err, row) => {
      if (err || !row) {
        // Fallback to hardcoded if not set up
        if (password === ADMIN_PASSWORD) {
          logActivity(null, 'admin', 'login', 'admin', 'Admin logged in (fallback)', req.ip);
          return res.json({ success: true, role: 'admin', token: ADMIN_TOKEN });
        }
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, row.value);
      if (valid) {
        logActivity(null, 'admin', 'login', 'admin', 'Admin logged in', req.ip);
        return res.json({ success: true, role: 'admin', token: ADMIN_TOKEN });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    });
    return;
  }

  db.get('SELECT id, password_hash, role, status FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been blocked by an administrator.' });
    }

    try {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

      if (user.role === 'worker') {
        db.get('SELECT status FROM workers WHERE user_id = ?', [user.id], (err, worker) => {
          if (err) return res.status(500).json({ error: 'Server error' });
          logActivity(user.id, email, 'login', 'worker', 'Worker logged in', req.ip);
          res.json({
            success: true,
            userId: user.id,
            role: user.role,
            profileComplete: worker?.status === 'completed',
          });
        });
      } else {
        logActivity(user.id, email, 'login', user.role, `${user.role} logged in`, req.ip);
        res.json({ success: true, userId: user.id, role: user.role });
      }
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// 4. Worker Onboarding (Profile Completion)
app.post('/api/worker/profile', writeLimiter, upload.fields([
  { name: 'idPhoto', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 },
  { name: 'additionalPhoto', maxCount: 1 }
]), (req, res) => {
  const userId         = parseInt(req.body.userId, 10);
  const skills         = sanitize(req.body.skills);
  const experience     = parseInt(req.body.experience, 10);
  const nationalId     = sanitize(req.body.nationalId);
  const recommendation = sanitize(req.body.recommendation);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: 'userId is required' });
  }
  if (!skills) return res.status(400).json({ error: 'Skills are required.' });
  if (!experience) return res.status(400).json({ error: 'Experience is required.' });
  if (!nationalId) return res.status(400).json({ error: 'National ID is required.' });
  if (!/^\d{15}$/.test(nationalId)) {
    return res.status(400).json({ error: 'National ID must be exactly 15 digits.' });
  }

  const idPhotoPath = req.files && req.files['idPhoto'] ? req.files['idPhoto'][0].path : null;
  const passportPhotoPath = req.files && req.files['passportPhoto'] ? req.files['passportPhoto'][0].path : null;
  const additionalPhotoPath = req.files && req.files['additionalPhoto'] ? req.files['additionalPhoto'][0].path : null;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run(`
      INSERT INTO worker_profiles (worker_id, skills, experience, national_id, id_photo_path, passport_photo_path, additional_photo_path, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, skills, experience, nationalId, idPhotoPath, passportPhotoPath, additionalPhotoPath, recommendation], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to save profile details' });
      }
      
      // Update worker status to completed
      db.run('UPDATE workers SET status = ? WHERE user_id = ?', ['completed', userId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update worker status' });
        }
        db.run('COMMIT');
        logActivity(userId, null, 'profile_complete', 'worker', 'Worker completed onboarding profile', req.ip);
        res.status(200).json({ success: true, message: 'Profile completed successfully' });
      });
    });
  });
});

// 4. Get Available Workers
app.get('/api/workers', readLimiter, (req, res) => {
  const query = `
    SELECT 
      w.user_id as id, 
      w.full_name as name, 
      w.phone,
      w.location,
      w.profile_views,
      wp.skills, 
      wp.experience, 
      w.status,
      w.availability,
      wp.passport_photo_path as image
    FROM workers w
    JOIN worker_profiles wp ON w.user_id = wp.worker_id
    WHERE w.status IN ('completed', 'available', 'hired', 'unavailable')
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch workers' });
    }
    
    // Format the data for the frontend
    const workers = rows.map(row => {
      const filename = row.image ? path.basename(row.image) : null;
      return {
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        role: 'Verified Professional',
        exp: row.experience + ' yrs',
        rating: 0, // Will be calculated below
        location: row.location || 'Not specified',
        skills: row.skills ? row.skills.split(',').map(s => s.trim()) : [],
        verified: true,
        profile_views: row.profile_views || 0,
        status: row.status || 'unknown',
        availability: row.availability || 'unknown',
        image: filename ? `http://localhost:3000/uploads/${filename}` : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200'
      };
    });
    
    // Calculate ratings for each worker
    const workersWithRatings = workers.map(worker => {
      return new Promise((resolve) => {
        db.get(
          'SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count FROM worker_ratings WHERE worker_id = ?',
          [worker.id],
          (err, ratingRow) => {
            if (err || !ratingRow || ratingRow.rating_count === 0) {
              worker.rating = 0;
            } else {
              worker.rating = Math.round(ratingRow.avg_rating * 10) / 10; // Round to 1 decimal
            }
            resolve(worker);
          }
        );
      });
    });
    
    Promise.all(workersWithRatings).then(results => {
      res.json(results);
    });
  });
});

// 5. Create a Job Request (Employer -> Worker)
app.post('/api/jobs/request', writeLimiter, (req, res) => {
  const employerId = parseInt(req.body.employerId, 10);
  const workerId   = parseInt(req.body.workerId, 10);

  if (!employerId || isNaN(employerId) || !workerId || isNaN(workerId)) return res.status(400).json({ error: 'Missing or invalid IDs.' });

  // Check if a pending request already exists
  db.get('SELECT * FROM job_requests WHERE employer_id = ? AND worker_id = ? AND status = "pending"', [employerId, workerId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (row) return res.status(400).json({ error: 'Request already sent' });

    // Get employer and worker details for email notification
    db.get(`
      SELECT 
        e.user_id as employer_id,
        u.email as employer_email,
        e.location as employer_location,
        w.full_name as worker_name
      FROM employers e
      JOIN users u ON e.user_id = u.id
      JOIN workers w ON w.user_id = ?
      WHERE e.user_id = ?
    `, [workerId, employerId], (err, details) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      db.run('INSERT INTO job_requests (employer_id, worker_id) VALUES (?, ?)', [employerId, workerId], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to send request' });
        
        // Notify worker of new job request
        createNotification(workerId, 'job_request', 'An employer has sent you a job request. Check your dashboard to accept or decline.');
        logActivity(employerId, null, 'job_request', 'job', `Employer requested worker ${workerId}`, req.ip);

        // Send email notification to admin
        db.get("SELECT value FROM admin_settings WHERE key = 'admin_notification_email'", [], (err, adminRow) => {
          if (!err && adminRow && adminRow.value) {
            const emailHtml = `
              <h2>New Worker Request</h2>
              <p>An employer has requested a worker on the Ishimo platform.</p>
              <p><strong>Employer Email:</strong> ${details?.employer_email || 'N/A'}</p>
              <p><strong>Employer Location:</strong> ${details?.employer_location || 'N/A'}</p>
              <p><strong>Worker Name:</strong> ${details?.worker_name || 'N/A'}</p>
              <p><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
              <p>Please log in to the admin dashboard for more details.</p>
            `;
            sendEmail(adminRow.value, 'New Worker Request - Ishimo', emailHtml);
          }
        });

        res.status(201).json({ success: true, message: 'Request sent successfully' });
      });
    });
  });
});

// 6. Get Worker Dashboard Data (including Job Requests)
app.get('/api/worker/:id/dashboard', (req, res) => {
  const workerId = req.params.id;
  
  // Get worker details
  db.get(`
    SELECT w.full_name, w.status, wp.passport_photo_path
    FROM workers w
    LEFT JOIN worker_profiles wp ON w.user_id = wp.worker_id
    WHERE w.user_id = ?
  `, [workerId], (err, workerRow) => {
    if (err || !workerRow) return res.status(404).json({ error: 'Worker not found' });

    if (workerRow.passport_photo_path) {
      const filename = path.basename(workerRow.passport_photo_path);
      workerRow.passport_photo_url = `http://localhost:3000/uploads/${filename}`;
    }
    delete workerRow.passport_photo_path;
    
    // Get job requests for this worker
    const query = `
      SELECT 
        jr.id as job_id, 
        jr.status, 
        jr.created_at, 
        u.email as employer_email,
        e.location as employer_location
      FROM job_requests jr
      JOIN employers e ON jr.employer_id = e.user_id
      JOIN users u ON e.user_id = u.id
      WHERE jr.worker_id = ?
      ORDER BY jr.created_at DESC
    `;
    
    db.all(query, [workerId], (err, jobRows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch job requests' });
      
      res.json({
        worker: workerRow,
        jobs: jobRows || []
      });
    });
  });
});

// 7. Update Job Request Status (Accept/Decline)
app.put('/api/jobs/:jobId/status', writeLimiter, (req, res) => {
  const jobId    = parseInt(req.params.jobId, 10);
  const status   = sanitize(req.body.status);
  const workerId = parseInt(req.body.workerId, 10);
  
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Fetch request to get employer_id for notification
  db.get('SELECT employer_id FROM job_requests WHERE id = ? AND worker_id = ?', [jobId, workerId], (err, reqRow) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!reqRow) return res.status(404).json({ error: 'Job not found or unauthorized' });

    db.run('UPDATE job_requests SET status = ? WHERE id = ?', [status, jobId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update status' });
      
      // Notify employer of worker response
      const action = status === 'accepted' ? 'accepted' : 'declined';
      createNotification(reqRow.employer_id, 'request_response', `A worker has ${action} your job request.`);
      logActivity(workerId, null, 'request_response', 'job_request', `Worker ${action} job request ${jobId}`, req.ip);

      // Send email notification to admin when worker is hired (accepted)
      if (status === 'accepted') {
        db.get(`
          SELECT 
            u.email as employer_email,
            e.location as employer_location,
            w.full_name as worker_name
          FROM employers e
          JOIN users u ON e.user_id = u.id
          JOIN workers w ON w.user_id = ?
          WHERE e.user_id = ?
        `, [workerId, reqRow.employer_id], (err, details) => {
          if (!err && details) {
            db.get("SELECT value FROM admin_settings WHERE key = 'admin_notification_email'", [], (err, adminRow) => {
              if (!err && adminRow && adminRow.value) {
                const emailHtml = `
                  <h2>Worker Hired</h2>
                  <p>A worker has accepted a job request on the Ishimo platform.</p>
                  <p><strong>Employer Email:</strong> ${details.employer_email || 'N/A'}</p>
                  <p><strong>Employer Location:</strong> ${details.employer_location || 'N/A'}</p>
                  <p><strong>Worker Name:</strong> ${details.worker_name || 'N/A'}</p>
                  <p><strong>Hire Time:</strong> ${new Date().toLocaleString()}</p>
                  <p>Please log in to the admin dashboard for more details.</p>
                `;
                sendEmail(adminRow.value, 'Worker Hired - Ishimo', emailHtml);
              }
            });
          }
        });
      }

      res.json({ success: true, message: 'Status updated' });
    });
  });
});

// 8. Get Worker Profile details
app.get('/api/worker/:id/profile', (req, res) => {
  const workerId = req.params.id;
  const query = `
    SELECT w.full_name, w.phone, w.location, wp.skills, wp.experience, wp.national_id, wp.id_photo_path, wp.passport_photo_path
    FROM workers w
    LEFT JOIN worker_profiles wp ON w.user_id = wp.worker_id
    WHERE w.user_id = ?
  `;
  db.get(query, [workerId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Worker not found' });
    
    if (row.id_photo_path) {
      const filename = path.basename(row.id_photo_path);
      row.id_photo_url = `http://localhost:3000/uploads/${filename}`;
    }
    if (row.passport_photo_path) {
      const filename = path.basename(row.passport_photo_path);
      row.passport_photo_url = `http://localhost:3000/uploads/${filename}`;
    }
    if (row.additional_photo_path) {
      const filename = path.basename(row.additional_photo_path);
      row.additional_photo_url = `http://localhost:3000/uploads/${filename}`;
    }

    res.json(row);
  });
});

// 9. Update Worker Profile
app.put('/api/worker/:id/profile', writeLimiter, upload.fields([
  { name: 'idPhoto', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 },
  { name: 'additionalPhoto', maxCount: 1 }
]), (req, res) => {
  const workerId   = parseInt(req.params.id, 10);
  const full_name  = sanitize(req.body.full_name);
  const phone      = sanitize(req.body.phone);
  const location   = sanitize(req.body.location);
  const skills     = sanitize(req.body.skills);
  const experience = parseInt(req.body.experience, 10);
  const nationalId = sanitize(req.body.nationalId);

  if (!phone)     return res.status(400).json({ error: 'Phone number is required.' });
  if (nationalId && !/^\d{15}$/.test(nationalId)) {
    return res.status(400).json({ error: 'National ID must be exactly 15 digits.' });
  }

  const idPhotoPath = req.files && req.files['idPhoto'] ? req.files['idPhoto'][0].path.replace(/\\/g, '/') : null;
  const passportPhotoPath = req.files && req.files['passportPhoto'] ? req.files['passportPhoto'][0].path.replace(/\\/g, '/') : null;
  const additionalPhotoPath = req.files && req.files['additionalPhoto'] ? req.files['additionalPhoto'][0].path.replace(/\\/g, '/') : null;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('UPDATE workers SET full_name = ?, phone = ?, location = ? WHERE user_id = ?', [full_name, phone, location || '', workerId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to update basic info' });
      }

      // Update worker_profiles. Build the query dynamically based on whether files were uploaded.
      let updateProfileQuery = 'UPDATE worker_profiles SET skills = ?, experience = ?, national_id = ?';
      const updateProfileParams = [skills, experience, nationalId];

      if (idPhotoPath) {
        updateProfileQuery += ', id_photo_path = ?';
        updateProfileParams.push(idPhotoPath);
      }
      if (passportPhotoPath) {
        updateProfileQuery += ', passport_photo_path = ?';
        updateProfileParams.push(passportPhotoPath);
      }
      if (additionalPhotoPath) {
        updateProfileQuery += ', additional_photo_path = ?';
        updateProfileParams.push(additionalPhotoPath);
      }

      updateProfileQuery += ' WHERE worker_id = ?';
      updateProfileParams.push(workerId);

      db.run(updateProfileQuery, updateProfileParams, function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update professional info' });
        }
        db.run('COMMIT');
        logActivity(workerId, null, 'update_profile', 'worker', 'Worker updated their full profile', req.ip);
        res.json({ success: true });
      });
    });
  });
});

// 10. Update Worker Settings (Password)
app.put('/api/worker/:id/settings', writeLimiter, (req, res) => {
  const userId          = parseInt(req.params.id, 10);
  const currentPassword = (req.body.currentPassword || '').trim();
  const newPassword     = (req.body.newPassword || '').trim();

  if (!currentPassword) return res.status(400).json({ error: 'Current password is required.' });
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'User not found' });
    
    const match = await bcrypt.compare(currentPassword, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect current password' });
    
    const newHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update password' });
      logActivity(userId, null, 'change_password', 'user', 'Worker changed password', req.ip);
      res.json({ success: true });
    });
  });
});

// 11. Get Employer Profile
app.get('/api/employer/:id/profile', (req, res) => {
  const userId = req.params.id;
  db.get('SELECT phone, location FROM employers WHERE user_id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Employer not found' });
    res.json(row);
  });
});

// 12. Update Employer Profile
app.put('/api/employer/:id/profile', writeLimiter, (req, res) => {
  const userId   = parseInt(req.params.id, 10);
  const phone    = sanitize(req.body.phone);
  const location = sanitize(req.body.location);

  if (!phone)    return res.status(400).json({ error: 'Phone number is required.' });
  if (!location) return res.status(400).json({ error: 'Location is required.' });

  db.run('UPDATE employers SET phone = ?, location = ? WHERE user_id = ?', [phone, location, userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update profile' });
    if (this.changes === 0) return res.status(404).json({ error: 'Employer not found' });
    logActivity(userId, null, 'update_profile', 'employer', 'Employer updated their profile', req.ip);
    res.json({ success: true });
  });
});

// 13. Update Employer Settings (Password)
app.put('/api/employer/:id/settings', writeLimiter, (req, res) => {
  const userId          = parseInt(req.params.id, 10);
  const currentPassword = (req.body.currentPassword || '').trim();
  const newPassword     = (req.body.newPassword || '').trim();

  if (!currentPassword) return res.status(400).json({ error: 'Current password is required.' });
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(currentPassword, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect current password' });
    const newHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update password' });
      logActivity(userId, null, 'change_password', 'user', 'Employer changed password', req.ip);
      res.json({ success: true });
    });
  });
});

// 14. Get Full Worker Public Profile (for Employers)
app.get('/api/worker/:id/full-profile', (req, res) => {
  const workerId = req.params.id;
  const query = `
    SELECT 
      w.user_id as id,
      w.full_name,
      w.phone,
      w.location,
      w.status,
      w.profile_views,
      u.email,
      wp.skills,
      wp.experience,
      wp.national_id,
      wp.id_photo_path,
      wp.passport_photo_path,
      wp.recommendation
    FROM workers w
    JOIN users u ON w.user_id = u.id
    LEFT JOIN worker_profiles wp ON w.user_id = wp.worker_id
    WHERE w.user_id = ?
  `;
  db.get(query, [workerId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Worker not found' });

    // Increment profile views
    db.run('UPDATE workers SET profile_views = profile_views + 1 WHERE user_id = ?', [workerId], (incrementErr) => {
      if (incrementErr) console.error('Failed to increment profile views:', incrementErr.message);
    });

    // Format passport photo for display
    if (row.passport_photo_path) {
      const filename = path.basename(row.passport_photo_path);
      row.passport_photo_url = `http://localhost:3000/uploads/${filename}`;
    }
    if (row.id_photo_path) {
      const filename = path.basename(row.id_photo_path);
      row.id_photo_url = `http://localhost:3000/uploads/${filename}`;
    }
    if (row.additional_photo_path) {
      const filename = path.basename(row.additional_photo_path);
      row.additional_photo_url = `http://localhost:3000/uploads/${filename}`;
    }

    // Get completed job count (accepted requests)
    db.get('SELECT COUNT(*) as completed_jobs FROM job_requests WHERE worker_id = ? AND status = "accepted"', [workerId], (err2, countRow) => {
      row.completed_jobs = countRow ? countRow.completed_jobs : 0;
      
      // Get rating average
      db.get('SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count FROM worker_ratings WHERE worker_id = ?', [workerId], (err3, ratingRow) => {
        if (err3 || !ratingRow || ratingRow.rating_count === 0) {
          row.rating = 0;
          row.rating_count = 0;
        } else {
          row.rating = Math.round(ratingRow.avg_rating * 10) / 10;
          row.rating_count = ratingRow.rating_count;
        }
        row.profile_views = row.profile_views || 0;
        res.json(row);
      });
    });
  });
});

// 15. Create a new job posting (Employer)
app.post('/api/jobs', writeLimiter, (req, res) => {
  const employerId  = parseInt(req.body.employerId, 10);
  const cleanTitle  = sanitize(req.body.title);
  const cleanDesc   = sanitize(req.body.description);
  const cleanLoc    = sanitize(req.body.location);
  const cleanSalary = sanitize(req.body.salaryRange);

  if (!employerId || isNaN(employerId)) return res.status(400).json({ error: 'A valid employer ID is required.' });
  if (!cleanTitle)  return res.status(400).json({ error: 'Job title is required.' });
  if (!cleanDesc)   return res.status(400).json({ error: 'Job description is required.' });
  if (!cleanLoc)    return res.status(400).json({ error: 'Location is required.' });

  // Verify that the user exists and is an employer
  db.get('SELECT role FROM users WHERE id = ?', [employerId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error during authorization check.' });
    }
    if (!user || user.role !== 'employer') {
      return res.status(403).json({ error: 'Only registered employers can post jobs.' });
    }

    db.run(`
      INSERT INTO jobs (employer_id, title, description, location, salary_range) 
      VALUES (?, ?, ?, ?, ?)
    `, [employerId, cleanTitle, cleanDesc, cleanLoc, cleanSalary], function(err) {
      if (err) {
        console.error('Job insertion error:', err);
        return res.status(500).json({ error: 'Failed to create job posting.' });
      }
      logActivity(employerId, null, 'create_job', 'job', `Employer posted job: ${cleanTitle}`, req.ip);
      res.status(201).json({ success: true, jobId: this.lastID, message: 'Job posted successfully.' });
    });
  });
});

// 16. Get all open job postings (for Workers to browse)
app.get('/api/jobs', readLimiter, (req, res) => {
  const query = `
    SELECT j.id, j.title, j.description, j.location, j.salary_range, j.created_at,
           e.phone as employer_phone,
           u.email as employer_email
    FROM jobs j
    JOIN employers e ON j.employer_id = e.user_id
    JOIN users u ON j.employer_id = u.id
    WHERE j.status = 'open'
    ORDER BY j.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch jobs' });
    res.json(rows);
  });
});

// 17. Get jobs posted by a specific employer
app.get('/api/employer/:id/jobs', (req, res) => {
  const employerId = req.params.id;
  const query = `
    SELECT * FROM jobs 
    WHERE employer_id = ? 
    ORDER BY created_at DESC
  `;
  db.all(query, [employerId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch jobs' });
    res.json(rows);
  });
});

// 18. Worker applies for a job
app.post('/api/jobs/:id/apply', writeLimiter, (req, res) => {
  const jobId    = parseInt(req.params.id, 10);
  const workerId = parseInt(req.body.workerId, 10);

  if (!jobId || isNaN(jobId))       return res.status(400).json({ error: 'Invalid job ID.' });
  if (!workerId || isNaN(workerId)) return res.status(400).json({ error: 'Missing or invalid workerId.' });

  // Check if application already exists
  db.get('SELECT * FROM job_applications WHERE job_id = ? AND worker_id = ?', [jobId, workerId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (row) return res.status(400).json({ error: 'You have already applied for this job' });

    // Get job info to notify employer
    db.get('SELECT employer_id, title FROM jobs WHERE id = ?', [jobId], (err, job) => {
      if (err || !job) return res.status(404).json({ error: 'Job not found' });

      db.run('INSERT INTO job_applications (job_id, worker_id) VALUES (?, ?)', [jobId, workerId], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to submit application' });
        // Notify employer of new application
        createNotification(job.employer_id, 'new_application', `A worker has applied to your job posting: "${job.title}".`);
        logActivity(workerId, null, 'apply_job', 'job_application', `Worker applied for job ${jobId}`, req.ip);
        res.status(201).json({ success: true, message: 'Application submitted successfully' });
      });
    });
  });
});

// 19. Employer views applications for their jobs
app.get('/api/employer/:id/applications', (req, res) => {
  const employerId = req.params.id;
  const query = `
    SELECT
      ja.id as application_id,
      ja.status,
      ja.created_at,
      j.id as job_id,
      j.title as job_title,
      w.full_name as worker_name,
      w.user_id as worker_id,
      wp.skills
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    JOIN workers w ON ja.worker_id = w.user_id
    LEFT JOIN worker_profiles wp ON w.user_id = wp.worker_id
    WHERE j.employer_id = ?
    ORDER BY ja.created_at DESC
  `;
  db.all(query, [employerId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch applications' });
    res.json(rows);
  });
});

// 19.5. Update job application status (Employer accepts/rejects worker)
app.put('/api/applications/:id/status', writeLimiter, (req, res) => {
  const applicationId = parseInt(req.params.id, 10);
  const status = sanitize(req.body.status);

  if (!['accepted', 'rejected', 'hired', 'fired', 'left'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Get application details to verify ownership and notify worker
  db.get(`
    SELECT ja.worker_id, j.employer_id, j.title
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    WHERE ja.id = ?
  `, [applicationId], (err, app) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    db.run('UPDATE job_applications SET status = ? WHERE id = ?', [status, applicationId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update status' });
      // Notify worker of employer decision
      const action = status === 'accepted' ? 'accepted' : status === 'hired' ? 'hired you for' : status === 'fired' ? 'fired you from' : status === 'left' ? 'marked you as left on' : 'rejected';
      createNotification(app.worker_id, 'application_response', `An employer has ${action} your application for "${app.title}".`);
      logActivity(app.employer_id, null, 'update_application_status', 'job_application', `Employer updated application ${applicationId} to ${status}`, req.ip);
      res.json({ success: true, message: 'Status updated' });
    });
  });
});

// 20. Worker views their applications
app.get('/api/worker/:id/applications', (req, res) => {
  const workerId = req.params.id;
  const query = `
    SELECT 
      ja.id as application_id, 
      ja.status, 
      ja.created_at, 
      j.title as job_title, 
      j.location as job_location
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    WHERE ja.worker_id = ?
    ORDER BY ja.created_at DESC
  `;
  db.all(query, [workerId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch your applications' });
    res.json(rows);
  });
});

// 21. Employer rates a worker
app.post('/api/worker/:id/rating', writeLimiter, (req, res) => {
  const workerId = parseInt(req.params.id, 10);
  const employerId = parseInt(req.body.employerId, 10);
  const rating = parseInt(req.body.rating, 10);
  const comment = sanitize(req.body.comment);

  if (!workerId || isNaN(workerId)) return res.status(400).json({ error: 'Invalid worker ID.' });
  if (!employerId || isNaN(employerId)) return res.status(400).json({ error: 'Invalid employer ID.' });
  if (!rating || isNaN(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5.' });

  // Check if employer has already rated this worker
  db.get('SELECT * FROM worker_ratings WHERE worker_id = ? AND employer_id = ?', [workerId, employerId], (err, existingRating) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    if (existingRating) {
      // Update existing rating
      db.run(
        'UPDATE worker_ratings SET rating = ?, comment = ? WHERE worker_id = ? AND employer_id = ?',
        [rating, comment, workerId, employerId],
        function(err) {
          if (err) return res.status(500).json({ error: 'Failed to update rating' });
          logActivity(employerId, null, 'rate_worker', 'rating', `Employer updated rating for worker ${workerId} to ${rating}`, req.ip);
          res.json({ success: true, message: 'Rating updated successfully' });
        }
      );
    } else {
      // Insert new rating
      db.run(
        'INSERT INTO worker_ratings (worker_id, employer_id, rating, comment) VALUES (?, ?, ?, ?)',
        [workerId, employerId, rating, comment],
        function(err) {
          if (err) return res.status(500).json({ error: 'Failed to submit rating' });
          logActivity(employerId, null, 'rate_worker', 'rating', `Employer rated worker ${workerId} with ${rating} stars`, req.ip);
          res.status(201).json({ success: true, message: 'Rating submitted successfully' });
        }
      );
    }
  });
});

// 22. Get worker ratings
app.get('/api/worker/:id/ratings', (req, res) => {
  const workerId = req.params.id;
  const query = `
    SELECT 
      wr.rating,
      wr.comment,
      wr.created_at,
      e.user_id as employer_id,
      u.email as employer_email
    FROM worker_ratings wr
    JOIN employers e ON wr.employer_id = e.user_id
    JOIN users u ON e.user_id = u.id
    WHERE wr.worker_id = ?
    ORDER BY wr.created_at DESC
  `;
  db.all(query, [workerId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch ratings' });
    res.json(rows);
  });
});

// ─── ADMIN PANEL ROUTES ──────────────────────────────────────────────────────

// Admin auth middleware
const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// A1. Get All Admin Settings
app.get('/api/admin/settings', adminLimiter, adminAuth, (req, res) => {
  db.all('SELECT key, value FROM admin_settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch settings' });
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  });
});

// A2. Update Admin Setting
app.put('/api/admin/settings/:key', adminLimiter, adminAuth, (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined || value === null) return res.status(400).json({ error: 'Value is required' });

  console.log(`Updating setting: ${key} = ${value}`);

  db.run('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)', [key, value], function(err) {
    if (err) {
      console.error('Failed to update setting:', err.message);
      return res.status(500).json({ error: 'Failed to update setting: ' + err.message });
    }
    console.log(`Setting ${key} updated successfully`);
    res.json({ success: true });
  });
});

// A3. Change Admin Password
app.put('/api/admin/settings/password', adminLimiter, adminAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    db.run("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('password_hash', ?)", [hash], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update admin password' });
      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// A1b. Reset User Password
app.put('/api/admin/users/:id/password', adminLimiter, adminAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update user password' });
      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// A2. Platform Stats
app.get('/api/admin/stats', adminLimiter, adminAuth, (req, res) => {
  const queries = {
    total_users:         'SELECT COUNT(*) as count FROM users',
    total_workers:       'SELECT COUNT(*) as count FROM workers',
    total_employers:     'SELECT COUNT(*) as count FROM employers',
    total_jobs:          'SELECT COUNT(*) as count FROM jobs',
    total_applications:  'SELECT COUNT(*) as count FROM job_applications',
    total_notifications: 'SELECT COUNT(*) as count FROM notifications',
    pending_workers:     'SELECT COUNT(*) as count FROM workers WHERE status = "pending"',
    open_jobs:           'SELECT COUNT(*) as count FROM jobs WHERE status = "open"',
  };
  const keys = Object.keys(queries);
  const stats = {};
  let done = 0;
  keys.forEach((key) => {
    db.get(queries[key], [], (err, row) => {
      stats[key] = row ? row.count : 0;
      done++;
      if (done === keys.length) res.json(stats);
    });
  });
});

// A3. All Users
app.get('/api/admin/users', adminLimiter, adminAuth, (req, res) => {
  db.all('SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// A4. Delete User
app.delete('/api/admin/users/:id', adminLimiter, adminAuth, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete user' });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  });
});

// Test Email Endpoint
app.post('/api/admin/test-email', adminLimiter, adminAuth, (req, res) => {
  const { to } = req.body;
  if (!to || !isValidEmail(to)) return res.status(400).json({ error: 'Valid email is required' });

  const emailHtml = `
    <h2>Test Email from Ishimo</h2>
    <p>This is a test email to verify your SMTP configuration is working correctly.</p>
    <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
    <p>If you received this email, your email settings are configured properly!</p>
  `;

  sendEmail(to, 'Test Email - Ishimo', emailHtml, (success) => {
    if (success) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send test email. Check server logs for details.' });
    }
  });
});

// A4b. Update User Status
app.put('/api/admin/users/:id/status', adminLimiter, adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'suspended', 'blocked'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  
  // Get user email before updating status
  db.get('SELECT email, role FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch user' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.run('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update user status' });
      
      // Send email notification to user when blocked
      if (status === 'blocked' && user.email) {
        const emailHtml = `
          <h2>Account Blocked</h2>
          <p>Your account on the Ishimo platform has been blocked by an administrator.</p>
          <p><strong>Reason:</strong> Violation of platform policies</p>
          <p><strong>Blocked Time:</strong> ${new Date().toLocaleString()}</p>
          <p>If you believe this is an error, please contact the administrator.</p>
        `;
        sendEmail(user.email, 'Your Account Has Been Blocked - Ishimo', emailHtml);
      }

      // Notify admin when user is blocked
      if (status === 'blocked') {
        db.get("SELECT value FROM admin_settings WHERE key = 'admin_notification_email'", [], (err, adminRow) => {
          if (!err && adminRow && adminRow.value) {
            const adminEmailHtml = `
              <h2>User Blocked</h2>
              <p>A user has been blocked on the Ishimo platform.</p>
              <p><strong>User Email:</strong> ${user.email}</p>
              <p><strong>User Role:</strong> ${user.role}</p>
              <p><strong>Blocked Time:</strong> ${new Date().toLocaleString()}</p>
              <p>Please log in to the admin dashboard for more details.</p>
            `;
            sendEmail(adminRow.value, 'User Blocked - Ishimo', adminEmailHtml);
          }
        });
      }

      res.json({ success: true });
    });
  });
});

// A5. All Workers (with profile)
app.get('/api/admin/workers', adminLimiter, adminAuth, (req, res) => {
  const q = `
    SELECT w.user_id as id, w.full_name, w.phone, w.location, w.status, w.availability,
           u.email, wp.skills, wp.experience
    FROM workers w
    JOIN users u ON w.user_id = u.id
    LEFT JOIN worker_profiles wp ON w.user_id = wp.worker_id
    ORDER BY w.user_id DESC
  `;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// A6. Update Worker Status
app.put('/api/admin/workers/:id/status', adminLimiter, adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['available', 'unavailable', 'hired', 'fired', 'pending', 'completed', 'suspended'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  
  // Get worker email and name before updating status
  db.get(`
    SELECT u.email, u.role, w.full_name 
    FROM users u 
    JOIN workers w ON u.id = w.user_id 
    WHERE w.user_id = ?
  `, [req.params.id], (err, worker) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch worker' });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    db.run('UPDATE workers SET status = ? WHERE user_id = ?', [status, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update' });
      
      // Send email notification to worker when suspended
      if (status === 'suspended' && worker.email) {
        const emailHtml = `
          <h2>Worker Account Suspended</h2>
          <p>Your worker account on the Ishimo platform has been suspended by an administrator.</p>
          <p><strong>Reason:</strong> Violation of platform policies</p>
          <p><strong>Suspended Time:</strong> ${new Date().toLocaleString()}</p>
          <p>If you believe this is an error, please contact the administrator.</p>
        `;
        sendEmail(worker.email, 'Your Worker Account Has Been Suspended - Ishimo', emailHtml);
      }

      // Notify admin when worker is suspended
      if (status === 'suspended') {
        db.get("SELECT value FROM admin_settings WHERE key = 'admin_notification_email'", [], (err, adminRow) => {
          if (!err && adminRow && adminRow.value) {
            const adminEmailHtml = `
              <h2>Worker Suspended</h2>
              <p>A worker has been suspended on the Ishimo platform.</p>
              <p><strong>Worker Name:</strong> ${worker.full_name}</p>
              <p><strong>Worker Email:</strong> ${worker.email}</p>
              <p><strong>Suspended Time:</strong> ${new Date().toLocaleString()}</p>
              <p>Please log in to the admin dashboard for more details.</p>
            `;
            sendEmail(adminRow.value, 'Worker Suspended - Ishimo', adminEmailHtml);
          }
        });
      }

      res.json({ success: true });
    });
  });
});

// A6b. Update Worker Availability
app.put('/api/admin/workers/:id/availability', adminLimiter, adminAuth, (req, res) => {
  const { availability } = req.body;
  const allowed = ['available', 'busy', 'unavailable'];
  if (!allowed.includes(availability)) return res.status(400).json({ error: 'Invalid availability status' });
  db.run('UPDATE workers SET availability = ? WHERE user_id = ?', [availability, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update availability' });
    res.json({ success: true });
  });
});

// A7. All Employers
app.get('/api/admin/employers', adminLimiter, adminAuth, (req, res) => {
  const q = `
    SELECT e.user_id as id, u.email, e.phone, e.location, u.created_at
    FROM employers e
    JOIN users u ON e.user_id = u.id
    ORDER BY u.created_at DESC
  `;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// A8. All Jobs
app.get('/api/admin/jobs', adminLimiter, adminAuth, (req, res) => {
  const q = `
    SELECT j.id, j.title, j.location, j.salary_range, j.status, j.created_at,
           u.email as employer_email,
           COUNT(ja.id) as applicant_count
    FROM jobs j
    JOIN users u ON j.employer_id = u.id
    LEFT JOIN job_applications ja ON j.id = ja.job_id
    GROUP BY j.id
    ORDER BY j.created_at DESC
  `;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// A9. Delete Job
app.delete('/api/admin/jobs/:id', adminLimiter, adminAuth, (req, res) => {
  db.run('DELETE FROM jobs WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete job' });
    if (this.changes === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  });
});

// A10. All Applications
app.get('/api/admin/applications', adminLimiter, adminAuth, (req, res) => {
  const q = `
    SELECT ja.id, ja.status, ja.created_at,
           j.title as job_title,
           w.full_name as worker_name,
           u.email as worker_email
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    JOIN workers w ON ja.worker_id = w.user_id
    JOIN users u ON ja.worker_id = u.id
    ORDER BY ja.created_at DESC
  `;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// A11. Update Application Status
app.put('/api/admin/applications/:id/status', adminLimiter, adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'accepted', 'declined'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.run('UPDATE job_applications SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update' });
    res.json({ success: true });
  });
});

// A12. All Notifications
app.get('/api/admin/notifications', adminLimiter, adminAuth, (req, res) => {
  const q = `
    SELECT n.id, n.type, n.message, n.is_read, n.created_at, u.email as user_email
    FROM notifications n
    JOIN users u ON n.user_id = u.id
    ORDER BY n.created_at DESC
    LIMIT 200
  `;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// A13. Delete Notification
app.delete('/api/admin/notifications/:id', adminLimiter, adminAuth, (req, res) => {
  db.run('DELETE FROM notifications WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete' });
    res.json({ success: true });
  });
});

// A14. Get Activity Logs
app.get('/api/admin/logs', adminLimiter, adminAuth, (req, res) => {
  const q = `
    SELECT * FROM activity_logs 
    ORDER BY created_at DESC 
    LIMIT 500
  `;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// ─────────────────────────────────────────────────────────────────────────────


app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch notifications' });
      res.json(rows);
    }
  );
});

// 22. Mark a single notification as read
app.put('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to mark as read' });
    res.json({ success: true });
  });
});

// 23. Mark all notifications as read for a user
app.put('/api/notifications/:userId/read-all', (req, res) => {
  const { userId } = req.params;
  db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to mark all as read' });
    res.json({ success: true });
  });
});

// 24. Forgot Password - Request reset token
app.post('/api/forgot-password', authLimiter, (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    // Delete any existing tokens for this user
    db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to process request' });
      }

      // Insert new token
      db.run(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expiresAt],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to generate reset token' });
          }

          // Send email with reset link
          const resetLink = `http://localhost:5173/reset-password?token=${token}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p style="color: #666;">You requested a password reset for your Ishimo account.</p>
              <p style="color: #666;">Click the link below to reset your password:</p>
              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #000; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
              <p style="color: #666; margin-top: 20px;">Or copy and paste this link into your browser:</p>
              <p style="color: #666; word-break: break-all;">${resetLink}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
            </div>
          `;

          sendEmail(email, 'Password Reset Request', emailHtml);

          // For development, also log the token
          console.log(`Password reset token for ${email}: ${token}`);
          console.log(`Reset link: ${resetLink}`);

          res.json({
            success: true,
            message: 'If the email exists, a reset link has been sent'
          });
        }
      );
    });
  });
});

// 25. Reset Password with token
app.post('/api/reset-password', authLimiter, async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Find valid token
  db.get(
    'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?',
    [token],
    async (err, tokenRow) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!tokenRow) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      if (tokenRow.used === 1) {
        return res.status(400).json({ error: 'Reset token has already been used' });
      }

      if (new Date(tokenRow.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      // Hash new password
      const hash = await bcrypt.hash(newPassword, 10);

      // Update user password
      db.run(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hash, tokenRow.user_id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to update password' });
          }

          // Mark token as used
          db.run(
            'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
            [token],
            (err) => {
              if (err) {
                console.error('Failed to mark token as used:', err);
              }
            }
          );

          res.json({ success: true, message: 'Password has been reset successfully' });
        }
      );
    }
  );
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

// Keep the process alive
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Prevent the process from exiting
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep server running
});
