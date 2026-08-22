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
  
  console.log('=== Checking Pengecekan Loker Lab Comment Attachments ===');
  const lockerRes = await client.query(`
    SELECT id, post_id, topic_title, author_name, content, file_name, file_url
    FROM bulletin_comments
    WHERE topic_title ILIKE '%loker%'
  `);
  console.log(JSON.stringify(lockerRes.rows, null, 2));

  console.log('\n=== Checking Summary of All Attachments ===');
  const countRes = await client.query(`
    SELECT COUNT(*) as total_comments_with_files
    FROM bulletin_comments
    WHERE file_url IS NOT NULL
  `);
  console.log('Total comments with attachments in DB:', countRes.rows[0].total_comments_with_files);

  const sampleRows = await client.query(`
    SELECT topic_title, author_name, content, file_name, file_url
    FROM bulletin_comments
    WHERE file_url IS NOT NULL
    LIMIT 6
  `);
  console.log('\n=== Sample Topics with Attachments ===');
  sampleRows.rows.forEach(r => {
    let files = [];
    try { files = JSON.parse(r.file_url); } catch(e) { files = [r.file_url]; }
    console.log(`- Topic: "${r.topic_title}" | Author: ${r.author_name} | Files: ${files.length} (${r.file_name})`);
  });

  client.release();
  await pool.end();
}

main().catch(console.error);
