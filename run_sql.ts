import { db, pool } from './src/db/index.js'; 
import { sql } from 'drizzle-orm'; 
async function run() { 
  try { 
    await db.execute(sql`CREATE TABLE IF NOT EXISTS easter_egg_progress (nik text PRIMARY KEY NOT NULL, node integer DEFAULT 0 NOT NULL, last_updated timestamp DEFAULT now());`); 
    console.log('Table created!'); 
  } catch(e) { 
    console.error(e); 
  } finally { 
    pool.end(); 
  } 
} 
run();
