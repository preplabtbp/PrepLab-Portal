import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function drop() {
  await db.execute(sql`DROP TABLE pemantauan CASCADE;`);
}
drop();
