import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res1 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_themes'");
    console.log('user_themes columns:', res1.rows);
    const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'community_quotes'");
    console.log('community_quotes columns:', res2.rows);
  } catch(e) {
    console.error('DB check error:', e);
  } finally {
    await pool.end();
  }
}
check();
