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
    SELECT id, universe, pt, title, category, department, notion_id
    FROM bulletin_posts
    WHERE universe = 'TBP_GPS'
    ORDER BY id ASC
  `);

  console.log(`Total TBP Posts: ${res.rows.length}`);
  
  const sections = ['ADMINISTRASI', 'LABORATORIUM', 'PREPARASI', 'QUALITY ASSURANCE', 'MAINTENANCE', 'WAREHOUSE', 'GENERAL ISSUE'];
  for (const s of sections) {
    console.log(`\n=== TBP Posts for Section: ${s} ===`);
    const matches = res.rows.filter(r => 
      (r.title || '').toUpperCase().includes(s) || 
      (r.category || '').toUpperCase().includes(s) ||
      (r.department || '').toUpperCase().includes(s)
    );
    console.table(matches.map(m => ({ id: m.id, title: m.title, notion_id: m.notion_id })));
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
