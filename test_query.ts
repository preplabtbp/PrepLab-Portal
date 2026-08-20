import { db, pool } from './src/db/index.js'; 
import { easterEggProgress } from './src/db/schema.js'; 
async function run() { 
  try { 
    const res = await db.select().from(easterEggProgress); 
    console.log(res); 
  } catch(e) { 
    console.error(e); 
  } finally { 
    pool.end(); 
  } 
} 
run();
