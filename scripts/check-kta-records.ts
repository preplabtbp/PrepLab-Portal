import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('=== KTA_REPORTS FOR TAUFIKIR & SUHARDI ===');
  const res = await db.execute(sql`
    SELECT id, nik, name, report_type, week, date, created_at, image_url, description 
    FROM kta_reports 
    WHERE LOWER(name) LIKE '%taufikir%' OR LOWER(name) LIKE '%suhardi%'
    ORDER BY id DESC LIMIT 20;
  `);
  console.log('Found reports:', res.rows);

  console.log('\n=== ALL RECENT KTA_REPORTS IN W39 / 2026 ===');
  const resW = await db.execute(sql`
    SELECT id, nik, name, report_type, week, date, created_at 
    FROM kta_reports 
    ORDER BY id DESC LIMIT 20;
  `);
  console.log('Recent 20 reports:', resW.rows);

  console.log('\n=== CHECK EMPLOYEES TABLE FOR TAUFIKIR & SUHARDI ===');
  const empRes = await db.execute(sql`
    SELECT nik, name, position, jabatan, section, pt, gol 
    FROM employees 
    WHERE LOWER(name) LIKE '%taufikir%' OR LOWER(name) LIKE '%suhardi%';
  `);
  console.log('Employees:', empRes.rows);

  process.exit(0);
}

run().catch(console.error);
