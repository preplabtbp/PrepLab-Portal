import { db } from './src/db/index.js';
import { employees } from './src/db/schema.js';
async function run() {
  const emps = await db.select({ shift: employees.shift, dept: employees.department }).from(employees).limit(20);
  console.log(emps);
}
run();
