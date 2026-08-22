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
    const res = await client.query('SELECT id, universe, title, pt, notion_id, category, content FROM bulletin_posts WHERE id = $1', [id]);
    console.log(`\n============================ POST ID: ${id} | notion_id: ${res.rows[0].notion_id} ============================`);
    console.log('Title:', res.rows[0].title);
    console.log('Category:', res.rows[0].category);
    console.log('Content:\n', res.rows[0].content);
  }
  client.release();
  await pool.end();
}

main().catch(console.error);
