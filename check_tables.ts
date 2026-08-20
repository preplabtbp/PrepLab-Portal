import { db, pool } from './src/db/index.js'; 
import { sql } from 'drizzle-orm'; 
async function run() { 
  try { 
    const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`); 
    console.log(res.rows); 
  } catch(e) { 
    console.error(e); 
  } finally { 
    pool.end(); 
  } 
} 
run();
