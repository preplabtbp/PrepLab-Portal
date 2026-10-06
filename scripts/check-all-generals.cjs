const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function main() {
  const res = await pool.query(`SELECT id, judul, kategori, sub_kategori, divisi FROM p5m_materi ORDER BY id ASC;`);
  console.log(`Total rows: ${res.rows.length}`);
  const generals = res.rows.filter(r => r.sub_kategori === 'General' && r.kategori === 'Teknis');
  console.log(`Teknis General rows (${generals.length}):`);
  generals.forEach(g => {
    console.log(`- [${g.id}] [${g.divisi}] ${g.judul}`);
  });
  await pool.end();
}

main().catch(console.error);
