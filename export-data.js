import fs from 'fs';
import { db, pool } from './src/db/index.js';
import * as schema from './src/db/schema.js';

async function exportData() {
  console.log("Starting database export...");
  const backup = {};
  
  for (const [key, table] of Object.entries(schema)) {
    // Drizzle tables usually have a Symbol or specific property, or we can just try to select from it
    try {
      const rows = await db.select().from(table);
      backup[key] = rows;
      console.log(`  -> ${key}: ${rows.length} rows exported.`);
    } catch (err) {
      // It's not a table or failed
    }
  }
  
  fs.writeFileSync('database_backup.json', JSON.stringify(backup, null, 2));
  console.log("Export complete! File saved as database_backup.json");
  pool.end();
}

exportData();
