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
  const res = await client.query('SELECT id, topic_title, file_name, file_url FROM bulletin_comments WHERE file_url IS NOT NULL LIMIT 8');
  
  console.log('Testing /api/drive/view/:fileId for migrated attachments:');
  for (const row of res.rows) {
    let files = [];
    try { files = JSON.parse(row.file_url); } catch(e) {}
    for (const f of files) {
      if (f.id) {
        const url = 'http://localhost:3000/api/drive/view/' + f.id;
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        console.log(`✓ [${resp.status} ${resp.statusText}] Topic: "${row.topic_title}" | File: ${f.name} | Type: ${resp.headers.get('content-type')} | Bytes: ${buf.byteLength}`);
      }
    }
  }
  client.release();
  await pool.end();
}

main().catch(console.error);
