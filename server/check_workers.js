const db = require('./database');

db.all('SELECT * FROM workers', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Workers in database:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
  }
  process.exit(0);
});
