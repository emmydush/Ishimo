const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();
const PORT = 3000;

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

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
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

  // Check for admin credentials first
  if (email === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    logActivity(null, 'admin', 'login', 'admin', 'Admin logged in', req.ip);
    return res.json({ success: true, role: 'admin', token: ADMIN_TOKEN });
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
  { name: 'passportPhoto', maxCount: 1 }
]), (req, res) => {
  const userId         = parseInt(req.body.userId, 10);
  const skills         = sanitize(req.body.skills);
  const experience     = sanitizeNumber(req.body.experience);
  const nationalId     = sanitize(req.body.nationalId);
  const recommendation = sanitize(req.body.recommendation);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: 'userId is required' });
  }
  if (!skills) return res.status(400).json({ error: 'Skills are required.' });
  if (!experience) return res.status(400).json({ error: 'Experience is required.' });
  if (!nationalId) return res.status(400).json({ error: 'National ID is required.' });

  const idPhotoPath = req.files && req.files['idPhoto'] ? req.files['idPhoto'][0].path : null;
  const passportPhotoPath = req.files && req.files['passportPhoto'] ? req.files['passportPhoto'][0].path : null;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run(`
      INSERT INTO worker_profiles (worker_id, skills, experience, national_id, id_photo_path, passport_photo_path, recommendation) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, skills, experience, nationalId, idPhotoPath, passportPhotoPath, recommendation], function(err) {
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
      w.location,
      wp.skills, 
      wp.experience, 
      w.status,
      wp.passport_photo_path as image
    FROM workers w
    JOIN worker_profiles wp ON w.user_id = wp.worker_id
    WHERE w.status = 'completed'
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch workers' });
    }
    
    // Format the data for the frontend
    const workers = rows.map(row => {
      return {
        id: row.id,
        name: row.name,
        role: 'Verified Professional', 
        exp: row.experience + ' yrs',
        rating: 4.9, // Mocked for now
        location: row.location || 'Not specified',
        skills: row.skills ? row.skills.split(',').map(s => s.trim()) : [],
        verified: true,
        image: row.image ? 'http://localhost:3000/' + row.image.replace(/\\/g, '/') : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200'
      };
    });
    
    res.json(workers);
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

    db.run('INSERT INTO job_requests (employer_id, worker_id) VALUES (?, ?)', [employerId, workerId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to send request' });
      // Notify worker of new job request
      createNotification(workerId, 'job_request', 'An employer has sent you a job request. Check your dashboard to accept or decline.');
      logActivity(employerId, null, 'job_request', 'job', `Employer requested worker ${workerId}`, req.ip);
      res.status(201).json({ success: true, message: 'Request sent successfully' });
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
      workerRow.passport_photo_url = `http://localhost:3000/${workerRow.passport_photo_path.replace(/\\/g, '/')}`;
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
    
    if (row.id_photo_path) row.id_photo_url = `http://localhost:3000/${row.id_photo_path.replace(/\\/g, '/')}`;
    if (row.passport_photo_path) row.passport_photo_url = `http://localhost:3000/${row.passport_photo_path.replace(/\\/g, '/')}`;
    
    res.json(row);
  });
});

// 9. Update Worker Profile
app.put('/api/worker/:id/profile', writeLimiter, upload.fields([
  { name: 'idPhoto', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 }
]), (req, res) => {
  const workerId   = parseInt(req.params.id, 10);
  const full_name  = sanitize(req.body.full_name);
  const phone      = sanitize(req.body.phone);
  const location   = sanitize(req.body.location);
  const skills     = sanitize(req.body.skills);
  const experience = sanitizeNumber(req.body.experience);
  const nationalId = sanitize(req.body.national_id);

  if (!full_name) return res.status(400).json({ error: 'Full name is required.' });
  if (!phone)     return res.status(400).json({ error: 'Phone number is required.' });

  const idPhotoPath = req.files && req.files['idPhoto'] ? req.files['idPhoto'][0].path.replace(/\\/g, '/') : null;
  const passportPhotoPath = req.files && req.files['passportPhoto'] ? req.files['passportPhoto'][0].path.replace(/\\/g, '/') : null;

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

    // Format passport photo for display
    if (row.passport_photo_path) {
      row.passport_photo_url = `http://localhost:3000/${row.passport_photo_path.replace(/\\/g, '/')}`;
    }
    if (row.id_photo_path) {
      row.id_photo_url = `http://localhost:3000/${row.id_photo_path.replace(/\\/g, '/')}`;
    }

    // Get completed job count (accepted requests)
    db.get('SELECT COUNT(*) as completed_jobs FROM job_requests WHERE worker_id = ? AND status = "accepted"', [workerId], (err2, countRow) => {
      row.completed_jobs = countRow ? countRow.completed_jobs : 0;
      res.json(row);
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

// ─── ADMIN PANEL ROUTES ──────────────────────────────────────────────────────

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_TOKEN    = 'admin-secret-token-ishimo';

// Admin auth middleware
const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  next();
};

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

// A4b. Update User Status
app.put('/api/admin/users/:id/status', adminLimiter, adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'suspended', 'blocked'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.run('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update user status' });
    res.json({ success: true });
  });
});

// A5. All Workers (with profile)
app.get('/api/admin/workers', adminLimiter, adminAuth, (req, res) => {
  const q = `
    SELECT w.user_id as id, w.full_name, w.phone, w.location, w.status,
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
  const allowed = ['pending', 'completed', 'suspended'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.run('UPDATE workers SET status = ? WHERE user_id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update' });
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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
