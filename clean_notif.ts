import { db } from './src/db/index.js';
import { notifications } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

async function run() {
  console.log("Cleaning duplicate notifications...");
  // Keep the latest id for each title+message combination
  await db.execute(sql`
    DELETE FROM notifications
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM notifications
      GROUP BY title, message, user_id, role
    );
  `);
  console.log("Cleaned.");
  process.exit(0);
}
run();
