import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
  database: 'cloud_sql_production_database',
});

async function run() {
  try {
    const files = fs.readdirSync('drizzle').filter(f => f.endsWith('.sql'));
    for (const f of files) {
      const sql = fs.readFileSync(path.join('drizzle', f), 'utf-8');
      console.log(`Executing ${f}...`);
      await pool.query(sql);
    }
    console.log("Migration executed!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
