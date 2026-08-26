import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log("Running migration for sisa_ct and jatuh_tempo_ct...");
  await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS sisa_ct text;`);
  await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS jatuh_tempo_ct text;`);
  console.log("Migration finished successfully!");
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
