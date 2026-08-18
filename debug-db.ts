import { db } from './src/db/index.js';
import { employees } from './src/db/schema.js';
import { eq, like } from 'drizzle-orm';

async function run() {
  const res = await db.select().from(employees).where(like(employees.name, '%Burhanudin%'));
  console.log(res);
}
run();
