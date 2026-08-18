import fs from 'fs';
import { db, pool } from './src/db/index.js';
import * as schema from './src/db/schema.js';

async function importData() {
  console.log("Reading backup file...");
  const isoDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)?(?:[-+]\d{2}:?\d{2}|Z)?$/;
  const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'), (key, value) => {
    if (typeof value === 'string' && isoDateFormat.test(value)) {
      return new Date(value);
    }
    return value;
  });
  
  for (const [tableName, rows] of Object.entries(data)) {
    if (rows.length === 0) continue;
    
    // Find the corresponding schema table
    const table = schema[tableName];
    if (!table) {
      console.warn(`Table schema for ${tableName} not found, skipping...`);
      continue;
    }

    console.log(`Importing ${rows.length} rows into ${tableName}...`);
    
    try {
      // Chunking for large tables (like roster which has 98k+ rows)
      const chunkSize = 1000;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await db.insert(table).values(chunk);
        console.log(`  -> Inserted ${i + chunk.length} / ${rows.length}`);
      }
    } catch (err) {
      console.error(`Failed to import table ${tableName}:`, err.message);
    }
  }
  
  console.log("Import complete!");
  pool.end();
}

importData();
