import { db } from './src/db/index.js';
import { employees } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  const b = await db.select().from(employees).where(eq(employees.nik, 'M0404220418')).limit(1);
  console.log("Burhanudin:", b);
  
  const s = await db.select().from(employees).where(eq(employees.nik, 'M0406220751')).limit(1);
  console.log("Safar:", s);
}
run();
