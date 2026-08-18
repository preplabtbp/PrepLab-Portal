import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function drop() {
  try {
    await db.execute(sql`DROP TABLE roster CASCADE;`);
    console.log("Roster table dropped");
  } catch(e) {
    console.error(e);
  }
}
drop();
