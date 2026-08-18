import { db } from './src/db/index.js';
import { employees } from './src/db/schema.js';
import { sql } from 'drizzle-orm';
async function run() {
  const all = await db.execute(sql`SELECT nik, COUNT(*) as c FROM employees GROUP BY nik HAVING COUNT(*) > 1;`);
  console.table(all.rows);
  process.exit(0);
}
run();
