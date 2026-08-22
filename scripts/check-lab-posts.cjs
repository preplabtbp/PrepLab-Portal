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
  
  // Check universe distribution in bulletin_posts
  const uniRes = await client.query('SELECT universe, count(*) as count FROM bulletin_posts GROUP BY universe');
  console.log('Universe distribution in bulletin_posts:');
  console.table(uniRes.rows);

  // Check all posts containing 'laboratorium' or 'non routine'
  const res = await client.query(`
    SELECT id, universe, title, category, department, length(content) as len
    FROM bulletin_posts
    WHERE title ILIKE '%laboratorium%' OR title ILIKE '%non routine%' OR category ILIKE '%laboratorium%'
    ORDER BY id ASC
  `);
  console.log('Laboratorium / Non Routine posts found:');
  console.table(res.rows);

  // Inspect the exact content of Non Routine Laboratorium posts
  const nonRoutinePosts = await client.query(`
    SELECT id, universe, title, category, substring(content from 1 for 600) as preview, content
    FROM bulletin_posts
    WHERE title ILIKE '%non routine%lab%' OR title ILIKE '%non routine laboratorium%' OR title ILIKE '%laboratorium%'
  `);
  
  for (const p of nonRoutinePosts.rows) {
    console.log(`\n================ ID: ${p.id} | UNIVERSE: ${p.universe} | TITLE: ${p.title} ================`);
    console.log('Content preview:\n', p.preview);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
