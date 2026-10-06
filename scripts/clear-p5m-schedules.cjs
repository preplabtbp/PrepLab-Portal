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
  
  const before = await client.query('SELECT id, date_start, date_end, created_by, created_at FROM p5m_schedules');
  console.log(`Found ${before.rows.length} schedule records in p5m_schedules:`);
  before.rows.forEach(r => {
    console.log(`  - ID: ${r.id} | Range: ${r.date_start} to ${r.date_end} | Created By: ${r.created_by} | Date: ${r.created_at}`);
  });

  const del = await client.query('DELETE FROM p5m_schedules RETURNING id');
  console.log(`\nSuccessfully deleted ${del.rows.length} schedule record(s) from p5m_schedules.`);

  const after = await client.query('SELECT COUNT(*) FROM p5m_schedules');
  console.log(`Remaining records in p5m_schedules: ${after.rows[0].count}`);

  client.release();
  await pool.end();
}

main().catch(console.error);
