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
  
  const allPosts = await client.query('SELECT id, universe, pt, title, category, department, notion_id FROM bulletin_posts ORDER BY id ASC');
  console.log('Total posts in bulletin_posts:', allPosts.rows.length);

  // Group by universe and pt
  const groupStats = {};
  for (const p of allPosts.rows) {
    const key = `${p.universe || 'null'} | pt: ${p.pt || 'null'}`;
    groupStats[key] = (groupStats[key] || 0) + 1;
  }
  console.log('Post grouping:');
  console.table(groupStats);

  // Let's find all duplicate titles
  const titleCounts = {};
  for (const p of allPosts.rows) {
    const t = p.title.trim().toLowerCase();
    titleCounts[t] = (titleCounts[t] || []);
    titleCounts[t].push({ id: p.id, universe: p.universe, pt: p.pt, notion_id: p.notion_id });
  }

  const dupes = Object.entries(titleCounts).filter(([t, list]) => list.length > 1);
  console.log(`Found ${dupes.length} duplicate titles across bulletin_posts:`);
  for (const [t, list] of dupes.slice(0, 30)) {
    console.log(`- "${t}": ${list.map(x => `[id:${x.id}, uni:${x.universe}, pt:${x.pt}]`).join(', ')}`);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
