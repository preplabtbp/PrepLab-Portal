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
  const ids = [414, 535, 103];
  for (const id of ids) {
    const res = await client.query('SELECT * FROM bulletin_posts WHERE id = $1', [id]);
    console.log(`\n============================ POST ID: ${id} ============================`);
    console.log(JSON.stringify(res.rows[0], null, 2));
  }
  client.release();
  await pool.end();
}

main().catch(console.error);
