import { db } from './src/db/index.js';
import { notifications } from './src/db/schema.js';
import { eq, or, desc, isNull } from 'drizzle-orm';

async function run() {
  const userId = '02D25000055';
  const data = await db.select().from(notifications)
               .where(or(eq(notifications.userId, userId), isNull(notifications.userId)))
               .orderBy(desc(notifications.createdAt))
               .limit(20);
  console.table(data);
  process.exit(0);
}
run();
