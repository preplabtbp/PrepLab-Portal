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
  const res = await client.query('SELECT DISTINCT section, department FROM employees WHERE section IS NOT NULL OR department IS NOT NULL');
  console.log('Employees sections and departments:');
  console.table(res.rows);

  const commCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bulletin_comments'");
  console.log('bulletin_comments columns:', commCols.rows.map(r => r.column_name));

  client.release();
  await pool.end();
}
main().catch(console.error);
