import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const hubs = ['ADMINISTRASI', 'LABORATORIUM', 'PREPARASI', 'QUALITY ASSURANCE', 'MAINTENANCE', 'WAREHOUSE', 'MANAJEMEN MUTU'];
for (const hub of hubs) {
  const res = await pool.query(
    "SELECT id, title, category, department, notion_id FROM bulletin_posts WHERE pt = 'TBP' AND UPPER(title) = $1",
    [hub]
  );
  console.log(`Hub "${hub}": ${res.rows.length} rows ->`, res.rows);
}

pool.end();
