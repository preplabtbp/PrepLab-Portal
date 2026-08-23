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
  const res = await client.query("SELECT id, judul, kategori, sub_kategori, divisi, file_url, notion_id FROM p5m_materi WHERE judul LIKE 'IK %' ORDER BY id ASC");
  console.log('✓ Total IK records in p5m_materi:', res.rows.length);
  console.table(res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
