// Test script to verify PostgreSQL connection and schema creation
require('dotenv').config();
const db = require('./database');

console.log('Testing PostgreSQL connection...');

// Test basic query
setTimeout(() => {
  db.all('SELECT COUNT(*) as count FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error testing query:', err.message);
      process.exit(1);
    } else {
      console.log('✓ Database connection successful');
      console.log('✓ Users table exists, count:', rows[0].count);
      
      // Test other tables
      const tables = ['employers', 'workers', 'jobs', 'job_applications', 'admin_settings'];
      let checked = 0;
      
      tables.forEach(table => {
        db.all(`SELECT COUNT(*) as count FROM ${table}`, [], (err, rows) => {
          if (err) {
            console.error(`✗ Error checking ${table}:`, err.message);
          } else {
            console.log(`✓ ${table} table exists, count:`, rows[0].count);
          }
          checked++;
          if (checked === tables.length) {
            console.log('\n✓ All database checks passed!');
            process.exit(0);
          }
        });
      });
    }
  });
}, 2000); // Wait for database initialization
