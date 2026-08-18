const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
  database: 'cloud_sql_production_database',
});

async function run() {
  try {
    const res = await pool.query('SELECT count(*) FROM employees WHERE pt = \'GTS\';');
    console.log("Total GTS di PROD:", res.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
