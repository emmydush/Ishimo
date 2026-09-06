const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
}, 500);

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
app.post('/api/register/employer', async (req, res) => {
  const { email, password, phone, location } = req.body;
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
          res.status(201).json({ success: true, userId, role: 'employer' });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Register Worker
app.post('/api/register/worker', async (req, res) => {
  const { fullName, email, password, phone, location } = req.body;
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
          res.status(201).json({ success: true, userId, role: 'worker' });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Check for admin credentials first
  if (email === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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
          res.json({
            success: true,
            userId: user.id,
            role: user.role,
            profileComplete: worker?.status === 'completed',
          });
        });
      } else {
        res.json({ success: true, userId: user.id, role: user.role });
      }
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// 4. Worker Onboarding (Profile Completion)
app.post('/api/worker/profile', upload.fields([
  { name: 'idPhoto', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 }
]), (req, res) => {
  const { userId, skills, experience, nationalId, recommendation } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

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
        res.status(200).json({ success: true, message: 'Profile completed successfully' });
      });
    });
  });
});

// 4. Get Available Workers
app.get('/api/workers', (req, res) => {
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
        image: row.image ? 'http://localhost:3000/' + row.image : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200'
      };
    });
    
    res.json(workers);
  });
});

// 5. Create a Job Request (Employer -> Worker)
app.post('/api/jobs/request', (req, res) => {
  const { employerId, workerId } = req.body;
  
  if (!employerId || !workerId) return res.status(400).json({ error: 'Missing IDs' });

  // Check if a pending request already exists
  db.get('SELECT * FROM job_requests WHERE employer_id = ? AND worker_id = ? AND status = "pending"', [employerId, workerId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (row) return res.status(400).json({ error: 'Request already sent' });

    db.run('INSERT INTO job_requests (employer_id, worker_id) VALUES (?, ?)', [employerId, workerId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to send request' });
      // Notify worker of new job request
      createNotification(workerId, 'job_request', 'An employer has sent you a job request. Check your dashboard to accept or decline.');
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
      workerRow.passport_photo_url = `http://localhost:3000/${workerRow.passport_photo_path}`;
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
app.put('/api/jobs/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  const { status, workerId } = req.body; // workerId to ensure security
  
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
      res.json({ success: true, message: 'Status updated' });
    });
  });
});

// 8. Get Worker Profile details
app.get('/api/worker/:id/profile', (req, res) => {
  const workerId = req.params.id;
  const query = `
    SELECT w.full_name, w.phone, w.location, wp.skills, wp.experience
    FROM workers w
    LEFT JOIN worker_profiles wp ON w.user_id = wp.worker_id
    WHERE w.user_id = ?
  `;
  db.get(query, [workerId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Worker not found' });
    res.json(row);
  });
});

// 9. Update Worker Profile
app.put('/api/worker/:id/profile', (req, res) => {
  const workerId = req.params.id;
  const { full_name, phone, location, skills, experience } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('UPDATE workers SET full_name = ?, phone = ?, location = ? WHERE user_id = ?', [full_name, phone, location || '', workerId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to update basic info' });
      }
      db.run('UPDATE worker_profiles SET skills = ?, experience = ? WHERE worker_id = ?', [skills, experience, workerId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update professional info' });
        }
        db.run('COMMIT');
        res.json({ success: true });
      });
    });
  });
});

// 10. Update Worker Settings (Password)
app.put('/api/worker/:id/settings', (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'User not found' });
    
    const match = await bcrypt.compare(currentPassword, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect current password' });
    
    const newHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update password' });
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
app.put('/api/employer/:id/profile', (req, res) => {
  const userId = req.params.id;
  const { phone, location } = req.body;
  db.run('UPDATE employers SET phone = ?, location = ? WHERE user_id = ?', [phone, location, userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update profile' });
    if (this.changes === 0) return res.status(404).json({ error: 'Employer not found' });
    res.json({ success: true });
  });
});

// 13. Update Employer Settings (Password)
app.put('/api/employer/:id/settings', (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;
  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(currentPassword, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect current password' });
    const newHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update password' });
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
      row.passport_photo_url = `http://localhost:3000/${row.passport_photo_path}`;
    }
    if (row.id_photo_path) {
      row.id_photo_url = `http://localhost:3000/${row.id_photo_path}`;
    }

    // Get completed job count (accepted requests)
    db.get('SELECT COUNT(*) as completed_jobs FROM job_requests WHERE worker_id = ? AND status = "accepted"', [workerId], (err2, countRow) => {
      row.completed_jobs = countRow ? countRow.completed_jobs : 0;
      res.json(row);
    });
  });
});

// 15. Create a new job posting (Employer)
app.post('/api/jobs', (req, res) => {
  const { employerId, title, description, location, salaryRange } = req.body;
  
  const cleanTitle = (title || '').trim();
  const cleanDesc = (description || '').trim();
  const cleanLoc = (location || '').trim();
  const cleanSalary = (salaryRange || '').trim();

  if (!employerId || !cleanTitle || !cleanDesc || !cleanLoc) {
    return res.status(400).json({ error: 'Job title, description, and location are required.' });
  }

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
      res.status(201).json({ success: true, jobId: this.lastID, message: 'Job posted successfully.' });
    });
  });
});

// 16. Get all open job postings (for Workers to browse)
app.get('/api/jobs', (req, res) => {
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
app.post('/api/jobs/:id/apply', (req, res) => {
  const jobId = req.params.id;
  const { workerId } = req.body;
  
  if (!workerId) return res.status(400).json({ error: 'Missing workerId' });

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
app.get('/api/admin/stats', adminAuth, (req, res) => {
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
app.get('/api/admin/users', adminAuth, (req, res) => {
  db.all('SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// A4. Delete User
app.delete('/api/admin/users/:id', adminAuth, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete user' });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  });
});

// A4b. Update User Status
app.put('/api/admin/users/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'suspended', 'blocked'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.run('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update user status' });
    res.json({ success: true });
  });
});

// A5. All Workers (with profile)
app.get('/api/admin/workers', adminAuth, (req, res) => {
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
app.put('/api/admin/workers/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'completed', 'suspended'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.run('UPDATE workers SET status = ? WHERE user_id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update' });
    res.json({ success: true });
  });
});

// A7. All Employers
app.get('/api/admin/employers', adminAuth, (req, res) => {
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
app.get('/api/admin/jobs', adminAuth, (req, res) => {
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
app.delete('/api/admin/jobs/:id', adminAuth, (req, res) => {
  db.run('DELETE FROM jobs WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete job' });
    if (this.changes === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  });
});

// A10. All Applications
app.get('/api/admin/applications', adminAuth, (req, res) => {
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
app.put('/api/admin/applications/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'accepted', 'declined'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.run('UPDATE job_applications SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update' });
    res.json({ success: true });
  });
});

// A12. All Notifications
app.get('/api/admin/notifications', adminAuth, (req, res) => {
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
app.delete('/api/admin/notifications/:id', adminAuth, (req, res) => {
  db.run('DELETE FROM notifications WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete' });
    res.json({ success: true });
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
