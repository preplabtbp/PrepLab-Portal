const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function main() {
  console.time('DB queries');
  const client = await pool.connect();
  const materiDb = (await client.query('SELECT * FROM p5m_materi')).rows;
  const allEmps = (await client.query('SELECT * FROM employees')).rows;
  const allRoster = (await client.query('SELECT * FROM roster LIMIT 5000')).rows;
  console.timeEnd('DB queries');
  console.log(`Materi: ${materiDb.length}, Emps: ${allEmps.length}, Roster: ${allRoster.length}`);
  client.release();
  await pool.end();
}

main().catch(console.error);
