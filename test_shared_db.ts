import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER, // App user
  password: process.env.SQL_PASSWORD,
  database: 'cloud_sql_shared_database', // Test shared DB
});

async function run() {
  try {
    const res = await pool.query('SELECT count(*) FROM employees;');
    console.log("Employees in shared DB:", res.rows[0]);
    const emp = await pool.query("SELECT * FROM employees LIMIT 1;");
    console.log("Sample emp:", emp.rows[0]);
  } catch (err) {
    console.error("Error accessing shared DB:", err);
  } finally {
    pool.end();
  }
}

run();
