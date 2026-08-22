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
  const sections = ['Administrasi', 'Laboratorium', 'Preparasi', 'Quality Assurance', 'Maintenance', 'Warehouse', 'General Issue', 'Mutu'];
  for (const s of sections) {
    const res = await client.query('SELECT id, title, category FROM bulletin_posts WHERE lower(title) LIKE lower($1) OR lower(content) LIKE lower($1) ORDER BY id ASC', ['%' + s + '%']);
    console.log(`\n=== SECTION: ${s} (${res.rows.length} posts) ===`);
    res.rows.slice(0, 15).forEach(r => console.log(`[${r.id}] ${r.title} (${r.category})`));
  }
  client.release();
  await pool.end();
}
run().catch(console.error);
