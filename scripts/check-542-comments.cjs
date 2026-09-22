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
    SELECT topic_title, count(id) as total_comments, count(file_url) as with_attachments
    FROM bulletin_comments
    WHERE post_id = 542
    GROUP BY topic_title
    ORDER BY total_comments DESC
  `);
  console.table(res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
