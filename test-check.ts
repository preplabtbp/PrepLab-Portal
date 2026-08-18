import { db } from './src/db/index.js';
import { employees, roster } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
async function test() {
  const e = await db.select().from(employees).where(eq(employees.nik, '04D20020842'));
  console.log(e);
  const r = await db.select().from(roster).where(eq(roster.nik, '04D20020842')).limit(5);
  console.log(r);
}
test();
