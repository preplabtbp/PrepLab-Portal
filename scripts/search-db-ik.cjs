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
  const res = await client.query(`
    SELECT id, title, category, department, notion_id, substring(content from 1 for 300) as preview, length(content) as len, content
    FROM bulletin_posts 
    WHERE notion_id ILIKE '%12bd00c5%8057%' 
       OR title ILIKE '%IK%Prep%'
       OR title ILIKE '%Instruksi Kerja%'
       OR category ILIKE '%IK%'
  `);
  console.log('Found bulletin_posts:', res.rows.length);
  for (const r of res.rows) {
    console.log('ID:', r.id, '| Title:', r.title, '| Notion ID:', r.notion_id, '| Len:', r.len);
    console.log('Content:\n', r.content);
  }

  const resFiles = await client.query(`
    SELECT * FROM uploaded_files WHERE file_name ILIKE '%Oven%' OR file_name ILIKE '%IK%' OR file_name ILIKE '%.pdf%' LIMIT 20
  `);
  console.log('\nFound in uploaded_files:', resFiles.rows.length);
  for (const f of resFiles.rows) {
    console.log(f.id, f.file_name, f.file_url, f.drive_file_id);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
