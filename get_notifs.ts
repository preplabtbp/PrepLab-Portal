import { db } from './src/db/index.js';
import { notifications } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

async function run() {
  const all = await db.execute(sql`SELECT id, title, message, user_id, role, created_at FROM notifications ORDER BY created_at DESC LIMIT 20;`);
  console.table(all.rows);
  process.exit(0);
}
run();
