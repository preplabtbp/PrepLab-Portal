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
  
  const ids = [535, 538, 541, 542, 543, 545, 549, 564, 576, 478, 477];
  const res = await client.query('SELECT id, universe, pt, title, notion_id, length(content) as len FROM bulletin_posts WHERE id = ANY($1)', [ids]);
  console.table(res.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
