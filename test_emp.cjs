const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'cloud_sql_development_database'
});
pool.query('SELECT * FROM employees LIMIT 5', (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
