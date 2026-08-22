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
  
  const allPosts = await client.query('SELECT id, universe, pt, title, notion_id, category, length(content) as len FROM bulletin_posts ORDER BY id ASC');
  
  console.log('Sample posts with notion_id prefixes:');
  const gtsPrefixed = allPosts.rows.filter(p => (p.notion_id || '').replace(/-/g, '').startsWith('135d00c5'));
  const tbpPrefixed = allPosts.rows.filter(p => !(p.notion_id || '').replace(/-/g, '').startsWith('135d00c5'));

  console.log(`Total Posts: ${allPosts.rows.length}`);
  console.log(`GTS (135d00c5...): ${gtsPrefixed.length}`);
  console.log(`TBP (other / 128d00c5...): ${tbpPrefixed.length}`);

  console.log('\n--- GTS Posts (Sample 15) ---');
  console.table(gtsPrefixed.slice(0, 15).map(p => ({ id: p.id, title: p.title, notion_id: p.notion_id })));

  console.log('\n--- TBP Posts (Sample 15) ---');
  console.table(tbpPrefixed.slice(0, 15).map(p => ({ id: p.id, title: p.title, notion_id: p.notion_id })));

  client.release();
  await pool.end();
}

main().catch(console.error);
