import fs from 'fs';
import path from 'path';
import { db, pool } from '../src/db/index.js';
import { employees } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('Starting employee data import...');
  const targetArg = process.argv[2];
  const csvPath = targetArg ? path.resolve(process.cwd(), targetArg) : path.resolve(__dirname, '../data.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('File not found at:', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data;
  console.log(`Parsed ${rows.length} rows from ${csvPath}`);

  let updatedCount = 0;
  let insertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw) continue;

    // Normalize keys
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      const cleanK = String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanK) {
        normalized[cleanK] = v !== undefined && v !== null ? String(v).trim() : '';
      }
    }

    const nik = normalized['nik'] || '';
    if (!nik || nik === '#N/A' || nik.toUpperCase().includes('DEMO')) {
      continue;
    }

    const name = normalized['nama'] || normalized['name'] || '';
    if (!name || name === '#N/A') {
      continue;
    }

    const foto = normalized['foto'] || normalized['photo'] || normalized['avatar'] || null;

    const empData: Record<string, any> = {
      name,
      nik,
      ktp: normalized['noktp'] || normalized['ktp'] || normalized['nikktp'] || null,
      pt: normalized['pt'] || normalized['perusahaan'] || null,
      poh: normalized['poh'] || null,
      sponsor: normalized['sponsor'] || null,
      statusKaryawan: normalized['statuskaryawan'] || normalized['status'] || null,
      tanggalEfektifTidakBekerja: normalized['tanggalefektiftidakbekerja'] || normalized['tgleftidakbekerja'] || normalized['tanggaltidakbekerja'] || normalized['efektiftidakbekerja'] || null,
      tanggalAwalBergabung: normalized['dohawal'] || normalized['doh'] || normalized['tanggalawalbergabung'] || null,
      tanggalJabatanBaru: normalized['tanggaljabatanbaru'] || normalized['tgljabatanbaru'] || null,
      masaKerja: normalized['masakerja'] || null,
      masaKerjaJabatanTerakhir: normalized['masakerjajabatanterakhir'] || normalized['masakerjajabatan'] || null,
      department: normalized['departemen'] || normalized['department'] || null,
      section: normalized['bagian'] || normalized['section'] || null,
      jobGrade: normalized['jobgrade'] || null,
      gol: normalized['gol'] || normalized['golongan'] || null,
      jabatan: normalized['jabatanbaru'] || normalized['jabatan'] || null,
      statusKontrak: normalized['statuskontrak'] || null,
      tanggalPermanent: normalized['tanggalpermanent'] || normalized['tanggalpermanen'] || null,
      tempatLahir: normalized['tempatlahir'] || null,
      tanggalLahir: normalized['tanggallahir'] || null,
      phone: normalized['nomortelppribadi'] || normalized['notelp'] || normalized['nomortelp'] || normalized['phone'] || null,
      keluargaKandung: normalized['keluargakandungyangbisadihubungi'] || normalized['keluargakandung'] || normalized['kelkandung'] || null,
      phoneKeluarga: normalized['notelephonekeluargakandung'] || normalized['notelpkeluarga'] || normalized['telpkel'] || normalized['telpkeluarga'] || null,
      orangTerdekat: normalized['orangterdekatyangbisadihubungi'] || normalized['orangterdekat'] || normalized['orgterdekat'] || null,
      phoneDarurat: normalized['notelephonedaruratorangterdekat'] || normalized['notelpdarurat'] || normalized['telpdarurat'] || null,
      alamatKtp: normalized['alamatsesuaiktp'] || normalized['alamatktp'] || null,
      alamatDomisili: normalized['alamatdomisili'] || normalized['domisili'] || null,
      ...(foto ? { avatar: foto } : {})
    };

    const cleanEmpData: Record<string, any> = {};
    for (const [k, v] of Object.entries(empData)) {
      if (v !== null && v !== undefined && v !== '') {
        cleanEmpData[k] = v;
      }
    }

    try {
      const existing = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
      if (existing.length > 0) {
        await db.update(employees).set(cleanEmpData).where(eq(employees.nik, nik));
        updatedCount++;
      } else {
        await db.insert(employees).values(empData as any);
        insertedCount++;
      }
    } catch (err: any) {
      errorCount++;
      console.error(`Error processing NIK ${nik}:`, err.message);
    }
  }

  console.log(`\nImport complete! Updated: ${updatedCount}, Inserted: ${insertedCount}, Errors: ${errorCount}`);
  await pool.end();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Fatal error:', err);
  await pool.end();
  process.exit(1);
});


