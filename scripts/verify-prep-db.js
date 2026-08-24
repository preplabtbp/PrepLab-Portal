import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const res = await pool.query(`
  SELECT id, title, category, department, notion_id, LENGTH(content) as content_length
  FROM bulletin_posts 
  WHERE pt = 'TBP' AND (
    id IN (632, 633, 634, 635, 636, 637, 638, 639, 640, 641, 642, 643, 644)
    OR title ILIKE '%PREPARASI%'
  )
  ORDER BY id
`);

console.log(`Found ${res.rows.length} PREPARASI-related posts in DB:`);
res.rows.forEach(r => {
  console.log(`ID: ${r.id} | Title: "${r.title}" | Notion: ${r.notion_id || '-'} | Size: ${r.content_length} chars`);
});

pool.end();
