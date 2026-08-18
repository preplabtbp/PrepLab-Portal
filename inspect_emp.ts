import * as fs from 'fs';
import { db } from './src/db/index.js';
import { employees } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
  // 1. Check in backup_employees_1.json
  const raw = fs.readFileSync('db_backups/backup_employees_1.json', 'utf8');
  const backup = JSON.parse(raw);
  const foundInBackup = backup.data.find((e: any) => e.nik === '02D25000055');
  console.log('--- FOUND IN BACKUP FILE ---');
  console.log(foundInBackup);

  // 2. Check in DB
  const foundInDb = await db.select().from(employees).where(eq(employees.nik, '02D25000055'));
  console.log('\n--- FOUND IN DATABASE ---');
  console.log(foundInDb);

  process.exit(0);
}

check();
