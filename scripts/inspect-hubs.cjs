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
  const hubs = ['ADMINISTRASI', 'LABORATORIUM', 'PREPARASI', 'QUALITY ASSURANCE', 'MAINTENANCE', 'WAREHOUSE', 'GENERAL ISSUE', 'INFORMATION', 'PT. TBP & GPS'];
  for (const h of hubs) {
    const res = await client.query('SELECT id, title, category, content FROM bulletin_posts WHERE trim(lower(title)) = $1', [h.toLowerCase()]);
    if (res.rows.length > 0) {
      console.log(`\n=== HUB: ${h} (ID: ${res.rows[0].id}) ===`);
      console.log(res.rows[0].content ? res.rows[0].content.substring(0, 300) : '<empty>');
    } else {
      console.log(`\n=== HUB: ${h} NOT FOUND ===`);
    }
  }
  client.release();
  await pool.end();
}
run().catch(console.error);
