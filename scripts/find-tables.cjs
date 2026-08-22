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
  const res = await client.query("SELECT id, title, category, length(content) as len, substring(content from 1 for 250) as preview FROM bulletin_posts WHERE content LIKE '%|%|%' ORDER BY id ASC");
  console.log('Posts containing Markdown Tables:', res.rows.length);
  res.rows.forEach(r => console.log(`[${r.id}] "${r.title}" (${r.category})`));
  client.release();
  await pool.end();
}
run().catch(console.error);
