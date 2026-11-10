const db = require('./database');
const path = require('path');

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
  LEFT JOIN worker_profiles wp ON w.user_id = wp.worker_id
`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Query results:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
  }
  process.exit(0);
});
