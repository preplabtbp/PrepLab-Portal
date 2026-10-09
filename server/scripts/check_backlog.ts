import { db } from '../../src/db/index.js';
import { logbookTasks } from '../../src/db/schema.js';

async function test() {
  const tasks = await db.select().from(logbookTasks);
  console.log('Total tasks in DB:', tasks.length);
  const closedInDb = tasks.filter(t => t.status === 'Closed' || t.status === 'Resolved' || t.status === 'Done');
  console.log('Total closed in DB:', closedInDb.length);
  const closedRoutine = closedInDb.filter(t => (t.activityType || '').toLowerCase().includes('routine'));
  console.log('Closed routine in DB:', closedRoutine.length);
  process.exit(0);
}
test();
