const db = require('./database');

db.all('SELECT * FROM worker_profiles', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Worker profiles in database:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
  }
  process.exit(0);
});
