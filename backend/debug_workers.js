const db = require('./database');

console.log('Testing database connection...');

db.all('SELECT * FROM workers', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Workers count:', rows.length);
    console.log('Workers:', JSON.stringify(rows, null, 2));
  }
  
  db.all('SELECT * FROM worker_profiles', [], (err, profiles) => {
    if (err) {
      console.error('Error fetching profiles:', err);
    } else {
      console.log('Profiles count:', profiles.length);
    }
    process.exit(0);
  });
});
