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

  console.log('\n--- Post ID 103 (Non Routine Laboratorium) full content ---');
  const p103 = await client.query('SELECT * FROM bulletin_posts WHERE id = 103');
  console.log(p103.rows[0].content);

  console.log('\n--- Check all posts that have "Non Routine" in title ---');
  const nrPosts = await client.query(`SELECT id, universe, title, category, department FROM bulletin_posts WHERE title ILIKE '%non routine%'`);
  console.table(nrPosts.rows);

  console.log('\n--- Check all posts with "GTS" in universe or title or category ---');
  const gtsPosts = await client.query(`SELECT id, universe, title, category, department FROM bulletin_posts WHERE universe ILIKE '%GTS%' OR title ILIKE '%GTS%' OR category ILIKE '%GTS%'`);
  console.table(gtsPosts.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
