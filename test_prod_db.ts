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
    const res = await pool.query('SELECT count(*) FROM employees;');
    console.log("Employees in prod DB:", res.rows[0]);
  } catch (err) {
    console.error("Error accessing prod DB:", err);
  } finally {
    pool.end();
  }
}

run();
