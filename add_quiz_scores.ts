import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
  database: process.env.SQL_DB_NAME,
  connectionTimeoutMillis: 15000,
});
const db = drizzle(pool);

async function main() {
  console.log("Creating quiz_scores table using admin credentials...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quiz_scores (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      name TEXT NOT NULL,
      department TEXT,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      percentage INTEGER NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Grant all permissions to the app user
  await db.execute(sql`GRANT ALL PRIVILEGES ON TABLE quiz_scores TO ai_studio_app_user;`);
  await db.execute(sql`GRANT USAGE, SELECT ON SEQUENCE quiz_scores_id_seq TO ai_studio_app_user;`);
  
  console.log("Done");
  process.exit(0);
}
main().catch(console.error);
