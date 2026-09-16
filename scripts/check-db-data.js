import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function inspectData() {
  try {
    const t = await pool.query("SELECT id, nik, theme_name, is_published, likes_count, liked_by FROM user_themes LIMIT 10");
    console.log('user_themes sample rows:', t.rows);
    const q = await pool.query("SELECT id, author_nik, quote, likes_count, liked_by FROM community_quotes LIMIT 10");
    console.log('community_quotes sample rows:', q.rows);
  } catch(e) {
    console.error('Data check error:', e);
  } finally {
    await pool.end();
  }
}
inspectData();
