import { db } from './src/db/index.js';
import { roster } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  const res = await db.select().from(roster).where(eq(roster.nik, 'M0404220418')).limit(10);
  console.log("Roster size:", res.length);
  console.log(res);
}
run();
