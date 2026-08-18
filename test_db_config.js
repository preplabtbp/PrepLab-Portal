import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { appSettings } from './src/db/schema.js';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const db = drizzle(pool);

async function main() {
  const settings = await db.select().from(appSettings);
  const quizConfig = settings.find(s => s.settingKey === 'QUIZ_CONFIG');
  console.log("Quiz Config:", quizConfig);
  process.exit(0);
}
main().catch(console.error);
