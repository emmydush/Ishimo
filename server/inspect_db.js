const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

function queryAll(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  try {
    // Get all tables
    const tables = await queryAll("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    console.log('=== TABLES ===');
    console.log(tables.map(t => t.name).join(', '));
    console.log('');

    for (const table of tables) {
      const name = table.name;
      // Row count
      const countResult = await queryAll(`SELECT COUNT(*) as count FROM [${name}]`);
      const count = countResult[0].count;
      console.log(`=== TABLE: ${name} (${count} rows) ===`);

      // Table schema
      const schema = await queryAll(`PRAGMA table_info([${name}])`);
      console.log('Columns:', schema.map(c => `${c.name} (${c.type})`).join(', '));

      // Sample data (first 5 rows)
      if (count > 0) {
        const samples = await queryAll(`SELECT * FROM [${name}] LIMIT 5`);
        console.log('Sample data:');
        samples.forEach((row, i) => {
          const display = {...row};
          if (display.password_hash) display.password_hash = '[REDACTED]';
          if (display.token) display.token = '[REDACTED]';
          console.log(`  Row ${i+1}:`, JSON.stringify(display));
        });
      } else {
        console.log('  [EMPTY TABLE]');
      }
      console.log('');
    }
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    db.close();
  }
}

main();
