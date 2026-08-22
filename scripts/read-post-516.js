const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function run() {
  const client = await pool.connect();
  const res = await client.query('SELECT * FROM bulletin_posts WHERE id = 516');
  console.log('Post 516:', res.rows[0]);
  client.release();
  await pool.end();
}
run().catch(console.error);
