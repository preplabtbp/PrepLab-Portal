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
  const res = await client.query('SELECT nik, name, department, section FROM employees');
  console.log(`Loaded ${res.rows.length} employees.`);
  
  const search = ['Khaufi', 'Tigwa', 'Arthur', 'Rizal', 'Amran', 'Herwin'];
  for (const s of search) {
    const found = res.rows.filter(r => r.name && r.name.toLowerCase().includes(s.toLowerCase()));
    console.log(s, '->', found);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
