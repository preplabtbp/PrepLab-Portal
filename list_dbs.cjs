const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
  database: 'postgres',
});

async function run() {
  try {
    const res = await pool.query('SELECT datname FROM pg_database;');
    console.log(res.rows.map(r => r.datname));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
