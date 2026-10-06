const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function main() {
  const res = await pool.query(`
    SELECT id, judul, kategori, sub_kategori, divisi 
    FROM p5m_materi 
    WHERE judul ILIKE '%las%' OR judul ILIKE '%inventory%' OR judul ILIKE '%jsa%' OR judul ILIKE '%gudang%' OR judul ILIKE '%welding%'
    ORDER BY id ASC;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch(console.error);
