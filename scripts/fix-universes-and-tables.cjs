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

  console.log('--- Step 1: Updating GTS posts universe and pt ---');
  // Any post with notion_id starting with 135d00c5 belongs to GTS
  const gtsUpdate = await client.query(`
    UPDATE bulletin_posts
    SET universe = 'GTS', pt = 'GTS'
    WHERE notion_id ILIKE '135d00c5%'
    RETURNING id, title, notion_id
  `);
  console.log(`Updated ${gtsUpdate.rows.length} posts to GTS universe:`);
  console.table(gtsUpdate.rows.slice(0, 10));

  // Ensure TBP posts have universe = 'TBP_GPS' and pt = 'TBP'
  const tbpUpdate = await client.query(`
    UPDATE bulletin_posts
    SET universe = 'TBP_GPS', pt = 'TBP'
    WHERE NOT (notion_id ILIKE '135d00c5%') OR notion_id IS NULL
    RETURNING id, title, notion_id
  `);
  console.log(`Updated ${tbpUpdate.rows.length} posts to TBP universe.`);

  client.release();
  await pool.end();
}

main().catch(console.error);
