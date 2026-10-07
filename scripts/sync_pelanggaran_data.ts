import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/db';
import { pelanggaran } from '../src/db/schema';
import Papa from 'papaparse';

function parseIndoDate(str: string): Date | null {
  if (!str) return null;
  const monthMap: Record<string, number> = {
    jan: 0, januari: 0,
    feb: 1, februari: 1,
    mar: 2, maret: 2,
    apr: 3, april: 3,
    mei: 4, may: 4,
    jun: 5, juni: 5,
    jul: 6, juli: 6,
    agu: 7, agt: 7, agustus: 7, aug: 7,
    sep: 8, september: 8,
    okt: 9, oktober: 9, oct: 9,
    nov: 10, november: 10,
    des: 11, desember: 11, dec: 11
  };
  const clean = str.trim().toLowerCase();
  const parts = clean.split(/[\/\-\s]+/).filter(Boolean);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let monthName = parts[1];
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const month = monthMap[monthName] ?? (parseInt(monthName, 10) - 1);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(Date.UTC(year, month, day));
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

async function run() {
  console.log('🚀 Syncing Pelanggaran table from CSV...');
  const csvPath = path.join(process.cwd(), 'scripts', 'counseling_spdk_data.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  const cols = [
    { tglKey: ' Tanggal Konseling \n1', rKey: 'Alasan Konseling 1', status: 'Konseling 1' },
    { tglKey: ' Tanggal Konseling \n2', rKey: 'Alasan Konseling 2', status: 'Konseling 2' },
    { tglKey: ' Tanggal Konseling \n3', rKey: 'Alasan Konseling 3', status: 'Konseling 3' },
    { tglKey: ' Tanggal Surat Teguran', rKey: 'Alasan Surat Teguran', status: 'Surat Teguran' },
    { tglKey: ' Tanggal SP 1', rKey: 'Alasan SP 1', status: 'SP 1' },
    { tglKey: ' Tanggal SP 2', rKey: 'Alasan SP 2', status: 'SP 2' },
    { tglKey: ' Tanggal SP 3', rKey: 'Alasan SP 3', status: 'SP 3' },
    { tglKey: 'Tanggal SPPT', rKey: 'Alasan SPPT', status: 'SPPT' },
  ];

  const insertData: any[] = [];

  for (const r of rows) {
    const nama = r['Nama Karyawan'] || r['Nama'] || '';
    if (!nama || nama.trim() === '-') continue;

    for (const c of cols) {
      let rawDates = r[c.tglKey] || '';
      let rawReasons = r[c.rKey] || '';

      // Fallback matching without spaces
      if (!rawDates) {
        for (const [k, v] of Object.entries(r)) {
          const cleanK = k.replace(/[\r\n\s]/g, '').toLowerCase();
          const targetK = c.tglKey.replace(/[\r\n\s]/g, '').toLowerCase();
          if (cleanK === targetK) {
            rawDates = v || '';
            break;
          }
        }
      }

      if (!rawReasons) {
        for (const [k, v] of Object.entries(r)) {
          const cleanK = k.replace(/[\r\n\s]/g, '').toLowerCase();
          const targetK = c.rKey.replace(/[\r\n\s]/g, '').toLowerCase();
          if (cleanK === targetK) {
            rawReasons = v || '';
            break;
          }
        }
      }

      if (!rawDates || !rawDates.trim()) continue;

      const dateLines = rawDates.split('\n').map(s => s.trim()).filter(Boolean);
      const reasonLines = rawReasons.split('\n').map(s => s.trim()).filter(Boolean);

      for (let i = 0; i < dateLines.length; i++) {
        const d = parseIndoDate(dateLines[i]);
        if (d) {
          const reason = reasonLines[i] || reasonLines.join('; ') || rawReasons.trim() || null;
          insertData.push({
            nama: nama.trim(),
            status: c.status,
            tanggal: d.toISOString(),
            penjelasan: reason
          });
        }
      }
    }
  }

  console.log(`📊 Found ${insertData.length} violation records to insert.`);
  await db.delete(pelanggaran);

  if (insertData.length > 0) {
    // Insert in batches of 50
    for (let i = 0; i < insertData.length; i += 50) {
      const batch = insertData.slice(i, i + 50);
      await db.insert(pelanggaran).values(batch);
    }
  }

  console.log(`✅ Successfully synced ${insertData.length} records to pelanggaran table!`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error syncing:', err);
  process.exit(1);
});
