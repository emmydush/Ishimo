const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('Database path:', dbPath);
console.log('File exists:', require('fs').existsSync(dbPath));
