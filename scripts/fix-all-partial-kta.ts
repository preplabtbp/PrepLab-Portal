import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import { getKtaObligation } from '../src/components/GroupReportScreen';

async function fixPartials() {
  console.log('=== MEMULIHKAN LAPORAN PERSONIL YANG HANYA TEREKAP 1 DI W39 ===\n');

  const partialPersons = [
    { nik: '04D24000078', name: 'Imran S', missingType: 'TTA', section: 'Laboratory' },
    { nik: 'M0403190256', name: 'Arsun Lantia', missingType: 'TTA', section: 'Preparation' },
    { nik: '02D22000018', name: 'Subrandi', missingType: 'KTA', section: 'Preparation' }
  ];

  for (const p of partialPersons) {
    // Get existing report
    const existing = await db.execute(sql`
      SELECT * FROM kta_reports 
      WHERE nik = ${p.nik} AND week = 'W39' 
      ORDER BY id DESC LIMIT 1;
    `);

    if (existing.rows.length > 0) {
      const ex = existing.rows[0] as any;
      console.log(`Menambahkan ${p.missingType} untuk ${p.name} (${p.nik}) menggunakan bukti existing #${ex.id}...`);
      
      await db.execute(sql`
        INSERT INTO kta_reports (
          nik, name, section, report_type, date, week, image_url, description, location
        ) VALUES (
          ${p.nik}, ${p.name}, ${p.section}, ${p.missingType},
          ${ex.date || '2026-09-22'}, 'W39',
          ${ex.image_url},
          ${`Bukti Screenshot ${p.missingType} (W39)`},
          ${ex.location || '-'}
        );
      `);
      console.log(`✓ Selesai menambahkan ${p.missingType} untuk ${p.name}`);
    }
  }

  console.log('\n=== STATUS SETELAH PEMULIHAN ===');
  const check = await db.execute(sql`
    SELECT nik, name, report_type, week, created_at 
    FROM kta_reports 
    WHERE week = 'W39' AND nik IN ('04D24000078', 'M0403190256', '02D22000018')
    ORDER BY name, report_type;
  `);
  console.log(check.rows);

  process.exit(0);
}

fixPartials().catch(console.error);
