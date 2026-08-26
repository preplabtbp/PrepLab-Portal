import { pool } from '../src/db/index.js';
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const sql = `
    CREATE TABLE IF NOT EXISTS app_feedbacks (
      id SERIAL PRIMARY KEY,
      type text NOT NULL DEFAULT 'bug',
      category text,
      module text,
      priority text NOT NULL DEFAULT 'medium',
      title text NOT NULL,
      description text NOT NULL,
      screenshot_url text,
      author_nik text NOT NULL,
      author_name text NOT NULL,
      author_role text,
      author_section text,
      status text NOT NULL DEFAULT 'PENDING',
      developer_notes text,
      resolved_at timestamp,
      created_at timestamp DEFAULT now()
    );
  `;

  // 1. Prod/Local
  await pool.query(sql);
  console.log('✅ app_feedbacks table created in appdb (Prod/Local)');

  // 2. Staging
  const host = process.env.SQL_HOST || '35.232.132.249';
  const user = process.env.SQL_USER || 'postgres';
  const password = process.env.SQL_PASSWORD || 'password123';
  const poolStaging = new Pool({
    host,
    user,
    password,
    database: 'appdb_staging',
    port: 5432,
    ssl: false
  });

  await poolStaging.query(sql);
  console.log('✅ app_feedbacks table created in appdb_staging (Staging)');
  await poolStaging.end();
  process.exit(0);
}

migrate().catch(console.error);
