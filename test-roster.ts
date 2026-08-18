import { db } from './src/db/index.js';
import { employees, roster } from './src/db/schema.js';

async function test() {
  const allEmps = await db.select().from(employees);
  const allRoster = await db.select().from(roster);
  console.log("Emps:", allEmps.length, "Roster:", allRoster.length);
}
test();
