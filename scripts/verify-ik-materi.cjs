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
  const resIK = await client.query("SELECT id, judul, sub_kategori, divisi FROM p5m_materi WHERE judul LIKE 'IK %' ORDER BY id ASC");
  const resSOP = await client.query("SELECT id, judul, sub_kategori, divisi FROM p5m_materi WHERE judul LIKE 'SOP %' ORDER BY id ASC");
  
  console.log(`\n📚 Total IK Documents: ${resIK.rows.length}`);
  console.table(resIK.rows);

  console.log(`\n📑 Total SOP Documents: ${resSOP.rows.length}`);
  console.table(resSOP.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
