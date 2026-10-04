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
  const schedules = (await client.query('SELECT id, date_start, date_end, created_at FROM p5m_schedules ORDER BY id DESC LIMIT 5')).rows;
  console.log('Recent p5m_schedules:', schedules);

  if (schedules.length > 0) {
    const latest = (await client.query('SELECT * FROM p5m_schedules WHERE id = $1', [schedules[0].id])).rows[0];
    console.log('\nLatest schedule id:', latest.id, 'range:', latest.date_start, 'to', latest.date_end);
    const data = typeof latest.schedule_data === 'string' ? JSON.parse(latest.schedule_data) : latest.schedule_data;
    console.log('Days in schedule:', Object.keys(data));
    console.log('\nDetail Hari Rabu:');
    console.dir(data['Rabu'], { depth: null });
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
