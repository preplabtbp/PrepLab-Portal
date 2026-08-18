const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'cloud_sql_development_database'
});
pool.query('ALTER TABLE quiz_scores ADD COLUMN IF NOT EXISTS quiz_version text;', (err, res) => {
  if (err) console.error(err);
  else console.log("Added to dev");
  
  const pool2 = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: 'cloud_sql_production_database'
  });
  pool2.query('ALTER TABLE quiz_scores ADD COLUMN IF NOT EXISTS quiz_version text;', (err2, res2) => {
      if (err2) console.error(err2);
      else console.log("Added to prod");
      pool.end();
      pool2.end();
  });
});
