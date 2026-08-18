import { db } from './src/db/index.js';
import { notifications } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

async function run() {
  const all = await db.execute(sql`SELECT title, message, COUNT(*) as c FROM notifications GROUP BY title, message HAVING COUNT(*) > 1 ORDER BY c DESC LIMIT 20;`);
  console.table(all.rows);
  process.exit(0);
}
run();
