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

  const res = await client.query(`
    SELECT id, universe, pt, title, notion_id, category, length(content) as len, content
    FROM bulletin_posts
    WHERE (title ILIKE '%laboratorium%' OR title ILIKE '%non routine%') AND NOT notion_id LIKE '135d00c5%'
    ORDER BY id ASC
  `);

  console.log(`Found ${res.rows.length} TBP posts related to Lab / Non Routine:`);
  for (const r of res.rows) {
    console.log(`\nID: ${r.id} | TITLE: ${r.title} | NOTION_ID: ${r.notion_id} | LEN: ${r.len}`);
    console.log('CONTENT PREVIEW:\n', r.content.substring(0, 500));
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
