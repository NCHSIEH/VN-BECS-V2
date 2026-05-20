import * as db from '../src/server/db.js';
await db.resetDb();
console.log('Database reset and re-seeded.');
process.exit(0);
