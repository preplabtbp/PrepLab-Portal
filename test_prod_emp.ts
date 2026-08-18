import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER, 
  password: process.env.SQL_PASSWORD,
  database: 'cloud_sql_production_database', 
});

async function run() {
  try {
    const res = await pool.query('SELECT nik, name, "passwordHash", "firstLoginComplete" FROM employees LIMIT 5;');
    console.log("Employees in prod DB:", res.rows);
  } catch (err) {
    console.error("Error accessing prod DB:", err);
  } finally {
    pool.end();
  }
}

run();
