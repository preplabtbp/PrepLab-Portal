import { db, pool } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`
      SELECT v.instrument_code, vi.standard_code, count(*) as count
      FROM xrf_verification_items vi
      JOIN xrf_verifications v ON vi.verification_id = v.id
      GROUP BY v.instrument_code, vi.standard_code
      ORDER BY v.instrument_code, count DESC
    `);
    console.log('Verification items by instrument and standard:');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
