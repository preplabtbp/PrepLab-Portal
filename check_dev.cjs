const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'cloud_sql_development_database'
});
pool.query('SELECT count(*) FROM quiz_questions;', (err, res) => {
  if (err) console.error("Error quiz_questions:", err.message);
  else console.log("quiz_questions count:", res.rows[0].count);
  
  pool.query('SELECT count(*) FROM work_orders;', (err, res2) => {
      if (err) console.error("Error work_orders:", err.message);
      else console.log("work_orders count:", res2.rows[0].count);
      pool.end();
  });
});
