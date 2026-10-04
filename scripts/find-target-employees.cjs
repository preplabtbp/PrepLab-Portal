const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function main() {
  const client = await pool.connect();
  const res = await client.query(
    "SELECT nik, name, jabatan, section, department, pt, gol FROM employees WHERE name ILIKE '%murti%' OR name ILIKE '%atha%' OR name ILIKE '%djody%' OR name ILIKE '%jody%'"
  );
  console.log('Employees found:');
  console.table(res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
