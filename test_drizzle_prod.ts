import * as dotenv from 'dotenv';
dotenv.config();

process.env.SQL_DB_NAME = 'cloud_sql_production_database';

import { db, pool } from './src/db/index.js';
import { employees } from './src/db/schema.js';

async function run() {
  try {
    const res = await db.select().from(employees).limit(1);
    console.log("Employees via Drizzle:", res);
  } catch (err) {
    console.error("Error accessing prod DB via Drizzle:", err);
  } finally {
    pool.end();
  }
}

run();
