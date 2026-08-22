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
  console.log('Migrating bulletin_comments table...');
  
  await client.query(`
    ALTER TABLE bulletin_comments 
    ADD COLUMN IF NOT EXISTS topic_title text,
    ADD COLUMN IF NOT EXISTS topic_id text,
    ADD COLUMN IF NOT EXISTS section text,
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS status_update text;
  `);

  console.log('Migration completed successfully.');
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bulletin_comments'");
  console.log('Updated columns:', res.rows.map(r => r.column_name));

  client.release();
  await pool.end();
}
main().catch(console.error);
