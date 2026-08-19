import { db } from './server/db';
import { appSettings } from './server/db/schema';

async function run() {
  const settings = await db.select().from(appSettings);
  console.log(settings);
  process.exit(0);
}
run();
