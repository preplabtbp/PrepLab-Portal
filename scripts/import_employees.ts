import fs from 'fs';
import path from 'path';
import { db } from '../src/db';
import { employees } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSVLine(line: string): string[] {
  const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  return line.split(re).map(x => x.replace(/^"|"$/g, '').trim());
}

async function run() {
  console.log('Starting employee data import...');
  const csvPath = path.resolve(__dirname, '../data.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('File data.csv not found at', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length < 2) {
    console.error('CSV is empty or only has headers');
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  console.log('Headers parsed:', headers.length, 'columns');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = parseCSVLine(line);
    
    if (row.length < 28) {
      console.warn(`Line ${i+1} has fewer columns than expected (${row.length}), skipping...`);
      continue;
    }

    const rowObj = {
      // 0: No.
      name: row[1],
      nik: row[2],
      ktp: row[3],
      pt: row[4],
      poh: row[5],
      sponsor: row[6],
      statusKaryawan: row[7],
      tanggalAwalBergabung: row[8],
      tanggalJabatanBaru: row[9],
      masaKerja: row[10],
      masaKerjaJabatanTerakhir: row[11],
      department: row[12],
      section: row[13],
      jobGrade: row[14],
      gol: row[15],
      jabatan: row[16],
      statusKontrak: row[17],
      tanggalPermanent: row[18],
      tempatLahir: row[19],
      tanggalLahir: row[20],
      phone: row[21],
      keluargaKandung: row[22],
      phoneKeluarga: row[23],
      orangTerdekat: row[24],
      phoneDarurat: row[25],
      alamatKtp: row[26],
      alamatDomisili: row[27],
    };

    if (!rowObj.nik || rowObj.nik === '#N/A') {
      console.warn(`Line ${i+1} has invalid NIK (${rowObj.nik}), skipping...`);
      errorCount++;
      continue;
    }

    try {
      // Check if exists
      const existing = await db.select().from(employees).where(eq(employees.nik, rowObj.nik)).limit(1);

      if (existing.length > 0) {
        await db.update(employees).set(rowObj).where(eq(employees.nik, rowObj.nik));
        console.log(`Updated NIK: ${rowObj.nik}`);
      } else {
        await db.insert(employees).values(rowObj);
        console.log(`Inserted NIK: ${rowObj.nik}`);
      }
      successCount++;
    } catch (err: any) {
      console.error(`Error processing NIK ${rowObj.nik}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\nImport complete. Success: ${successCount}, Errors: ${errorCount}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
