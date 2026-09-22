import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import { ktaReports } from '../src/db/schema';
import { invalidateRekapKtaCache } from '../server/routes/misc';

async function run() {
  console.log('=== FIXING W39 MISSING KTA / TTA FOR TAUFIKIR & SUHARDI ===');

  // 1. Check Taufikir (M0201220012) - missing TTA in W39
  const taufikirCheck = await db.execute(sql`
    SELECT * FROM kta_reports 
    WHERE nik = 'M0201220012' AND week = 'W39' AND report_type = 'TTA';
  `);

  if (taufikirCheck.rows.length === 0) {
    console.log('Adding missing TTA for Taufikir in W39...');
    await db.execute(sql`
      INSERT INTO kta_reports (
        nik, name, section, report_type, date, week, image_url, description, location
      ) VALUES (
        'M0201220012', 'Taufikir, S.Pi', 'Preparation', 'TTA',
        '2026-09-21', 'W39',
        'https://drive.google.com/uc?export=view&id=1r5Sbk0_kj5mVTZaGPeMUlXN5YdnrUP4l',
        'Bukti Screenshot TTA (W39)', 'Area Preparasi'
      );
    `);
    console.log('✓ Added TTA for Taufikir, S.Pi in W39');
  } else {
    console.log('Taufikir already has TTA in W39');
  }

  // 2. Check Suhardi Hasan (M0403230267) - missing KTA in W39
  const suhardiCheck = await db.execute(sql`
    SELECT * FROM kta_reports 
    WHERE nik = 'M0403230267' AND week = 'W39' AND report_type = 'KTA';
  `);

  if (suhardiCheck.rows.length === 0) {
    console.log('Adding missing KTA for Suhardi Hasan in W39...');
    await db.execute(sql`
      INSERT INTO kta_reports (
        nik, name, section, report_type, date, week, image_url, description, location
      ) VALUES (
        'M0403230267', 'Suhardi Hasan', 'Preparation', 'KTA',
        '2026-09-22', 'W39',
        'https://drive.google.com/uc?export=view&id=1rGGZLgFMrY-gWW4yf5tuNCPPjbVH4lnQ',
        'Bukti Screenshot KTA (W39)', 'Area Preparasi'
      );
    `);
    console.log('✓ Added KTA for Suhardi Hasan in W39');
  } else {
    console.log('Suhardi Hasan already has KTA in W39');
  }

  console.log('\n=== VERIFYING RESULT ===');
  const checkAll = await db.execute(sql`
    SELECT id, nik, name, report_type, week, date, created_at 
    FROM kta_reports 
    WHERE week = 'W39' AND (nik = 'M0201220012' OR nik = 'M0403230267')
    ORDER BY name, report_type;
  `);
  console.log(checkAll.rows);

  process.exit(0);
}

run().catch(console.error);
