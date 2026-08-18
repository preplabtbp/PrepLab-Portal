import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function run() {
  await db.execute(sql`DROP TABLE IF EXISTS questions;`);
  console.log("Dropped questions table");
}
run();
