import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const res = await pool.query("SELECT id, title, content FROM bulletin_posts WHERE id IN (518, 541, 542) ORDER BY id");
res.rows.forEach(r => {
  console.log(`\n=== ID ${r.id}: ${r.title} ===`);
  console.log(r.content.substring(0, 500));
});

pool.end();
