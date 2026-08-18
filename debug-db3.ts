import { db } from './src/db/index.js';
import { roster } from './src/db/schema.js';

async function run() {
  const count = await db.select().from(roster).limit(5);
  console.log("Random roster rows:", count);
}
run();
