import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const res = await pool.query("SELECT id, title, category, LEFT(content, 600) as content FROM bulletin_posts WHERE id IN (632, 633, 634) ORDER BY id");
res.rows.forEach(row => {
  console.log(`\n=== ID:${row.id} | ${row.title} | ${row.category} ===`);
  console.log(row.content);
});
pool.end();
