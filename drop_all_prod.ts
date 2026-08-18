import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
  database: 'cloud_sql_production_database',
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    for (const row of res.rows) {
      console.log(`Dropping table ${row.table_name}...`);
      await pool.query(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE;`);
    }
    console.log("All tables dropped in production database!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
