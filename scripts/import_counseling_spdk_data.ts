import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/db';
import { employees, employeeCounseling } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import Papa from 'papaparse';

function normalizeName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function run() {
  console.log('🚀 Starting import of Counseling & SPDK CSV data...');

  const csvPath = path.join(process.cwd(), 'scripts', 'counseling_spdk_data.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as Record<string, string>[];
  console.log(`📊 Found ${rows.length} rows in CSV.`);

  // Get all existing employees from DB
  const allEmployees = await db.select().from(employees);
  console.log(`👥 Found ${allEmployees.length} employees in DB.`);

  const nameMap = new Map<string, typeof allEmployees[0]>();
  for (const emp of allEmployees) {
    if (emp.name) {
      nameMap.set(normalizeName(emp.name), emp);
    }
  }

  let updatedCount = 0;
  let createdCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      const cleanK = String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanK) {
        norm[cleanK] = v !== undefined && v !== null ? String(v).trim() : '';
      }
    }

    const rawName = raw['Nama Karyawan'] || raw['Nama'] || norm['namakaryawan'] || norm['nama'] || '';
    if (!rawName) continue;

    // Find employee match
    let matchedEmp = nameMap.get(normalizeName(rawName));
    if (!matchedEmp) {
      // Partial match
      const targetNorm = normalizeName(rawName);
      for (const [kName, emp] of nameMap.entries()) {
        if (kName && targetNorm && (kName.includes(targetNorm) || targetNorm.includes(kName))) {
          matchedEmp = emp;
          break;
        }
      }
    }
    if (!matchedEmp) {
      // Word match
      const words = rawName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      for (const emp of allEmployees) {
        const empWords = (emp.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
        const matches = words.filter(w => empWords.includes(w));
        if (matches.length >= 2 || (words.length === 1 && matches.length === 1)) {
          matchedEmp = emp;
          break;
        }
      }
    }

    const nik = matchedEmp ? matchedEmp.nik : `EMP-${String(i + 1).padStart(3, '0')}`;
    const name = matchedEmp ? matchedEmp.name : rawName;
    const jabatan = matchedEmp?.jabatan || '';
    const pt = matchedEmp?.pt || '';

    // Dates
    const tglK1 = norm['tanggalkonseling1'] || '';
    const tglK2 = norm['tanggalkonseling2'] || '';
    const tglK3 = norm['tanggalkonseling3'] || '';
    const tglSt = norm['tanggalsuratteguran'] || norm['tanggalst'] || '';
    const tglSp1 = norm['tanggalsp1'] || '';
    const tglSp2 = norm['tanggalsp2'] || '';
    const tglSp3 = norm['tanggalsp3'] || '';
    const tglSppt = norm['tanggalsppt'] || '';

    // Flag or date
    const k1Flag = norm['konseling1'] || '0';
    const k2Flag = norm['konseling2'] || '0';
    const k3Flag = norm['konseling3'] || '0';
    const stFlag = norm['st'] || '0';
    const sp1Flag = norm['sp1'] || '0';
    const sp2Flag = norm['sp2'] || '0';
    const sp3Flag = norm['sp3'] || '0';
    const spptFlag = norm['sppt'] || '0';

    // Set value as date if available, or flag
    const konseling1 = tglK1 || (k1Flag !== '0' ? k1Flag : '');
    const konseling2 = tglK2 || (k2Flag !== '0' ? k2Flag : '');
    const konseling3 = tglK3 || (k3Flag !== '0' ? k3Flag : '');
    const st = tglSt || (stFlag !== '0' ? stFlag : '');
    const sp1 = tglSp1 || (sp1Flag !== '0' ? sp1Flag : '');
    const sp2 = tglSp2 || (sp2Flag !== '0' ? sp2Flag : '');
    const sp3 = tglSp3 || (sp3Flag !== '0' ? sp3Flag : '');
    const sppt = tglSppt || (spptFlag !== '0' ? spptFlag : '');

    const tanggalSp = [tglSppt, tglSp3, tglSp2, tglSp1, tglSt].filter(Boolean).join('; ');

    // Reasons
    const rK1 = norm['alasankonseling1'] || '';
    const rK2 = norm['alasankonseling2'] || '';
    const rK3 = norm['alasankonseling3'] || '';
    const alasanKonseling = [rK1, rK2, rK3].filter(Boolean).join('\n');

    const rSt = norm['alasansuratteguran'] || norm['alasanst'] || '';
    const rSp1 = norm['alasansp1'] || '';
    const rSp2 = norm['alasansp2'] || '';
    const rSp3 = norm['alasansp3'] || '';
    const rSppt = norm['alasansppt'] || '';
    const alasanSp = [rSt, rSp1, rSp2, rSp3, rSppt].filter(Boolean).join('\n');

    // Counts
    const spCount = [st, sp1, sp2, sp3, sppt].filter(v => v && v !== '0' && v !== '-').length;
    const totalSp = spCount > 0 ? String(spCount) : '0';

    const hasAnySp = spCount > 0;
    const pernahSpSebelumnya = hasAnySp ? 'Ya' : 'Tidak';
    const pernahTerlibatSpdk = hasAnySp ? 'Ya' : 'Tidak';
    const kronologiSpdk = alasanSp;

    let kategoriSpdk = '';
    let tindakanSpdk = '';
    if (sppt && sppt !== '0' && sppt !== '-') {
      kategoriSpdk = 'Pelanggaran Disiplin Berat (SPPT - Surat Peringatan Pertama & Terakhir)';
      tindakanSpdk = 'Penerbitan SPPT & Evaluasi Kerja';
    } else if (sp3 && sp3 !== '0' && sp3 !== '-') {
      kategoriSpdk = 'Pelanggaran Disiplin Berat (SP III)';
      tindakanSpdk = 'Penerbitan SP III & Evaluasi Status';
    } else if (sp2 && sp2 !== '0' && sp2 !== '-') {
      kategoriSpdk = 'Pelanggaran Disiplin Sedang (SP II)';
      tindakanSpdk = 'Penerbitan SP II & Evaluasi Kedisiplinan';
    } else if (sp1 && sp1 !== '0' && sp1 !== '-') {
      kategoriSpdk = 'Pelanggaran Disiplin Kerja (SP I)';
      tindakanSpdk = 'Penerbitan SP I & Pembinaan Kedisiplinan';
    } else if (st && st !== '0' && st !== '-') {
      kategoriSpdk = 'Pelanggaran Tata Tertib (Surat Teguran / ST)';
      tindakanSpdk = 'Pemberian Surat Teguran (ST) Tertulis';
    }

    let statusSanksi = 'Aman';
    if (sppt && sppt !== '0' && sppt !== '-') statusSanksi = 'SPPT';
    else if (sp3 && sp3 !== '0' && sp3 !== '-') statusSanksi = 'SP III';
    else if (sp2 && sp2 !== '0' && sp2 !== '-') statusSanksi = 'SP II';
    else if (sp1 && sp1 !== '0' && sp1 !== '-') statusSanksi = 'SP I';
    else if (st && st !== '0' && st !== '-') statusSanksi = 'Surat Teguran (ST)';
    else if (konseling3 && konseling3 !== '0' && konseling3 !== '-') statusSanksi = 'Konseling III';
    else if (konseling2 && konseling2 !== '0' && konseling2 !== '-') statusSanksi = 'Konseling II';
    else if (konseling1 && konseling1 !== '0' && konseling1 !== '-') statusSanksi = 'Konseling I';

    const counselRecord = {
      nik,
      name,
      jabatan,
      pt,
      totalSp,
      bulanKonseling: '',
      konseling1,
      konseling2,
      konseling3,
      st,
      sp1,
      sp2,
      sp3,
      sppt,
      tanggalSp,
      phk: '',
      masaBerlakuSanksi: '',
      masaPemulihan1: '',
      masaPemulihan2: '',
      alasanKonseling,
      alasanSp,
      keterangan: '',
      pernahSpSebelumnya,
      pernahTerlibatSpdk,
      kronologiSpdk,
      kategoriSpdk,
      tindakanSpdk,
      statusSanksi,
      updatedAt: new Date()
    };

    try {
      const existing = await db.select({ nik: employeeCounseling.nik }).from(employeeCounseling).where(eq(employeeCounseling.nik, nik)).limit(1);
      if (existing.length > 0) {
        await db.update(employeeCounseling).set(counselRecord).where(eq(employeeCounseling.nik, nik));
        updatedCount++;
      } else {
        await db.insert(employeeCounseling).values(counselRecord);
        createdCount++;
      }
      if ((i + 1) % 25 === 0 || i === rows.length - 1) {
        console.log(`⏳ Processed ${i + 1}/${rows.length} rows... (${updatedCount} updated, ${createdCount} created)`);
      }
    } catch (e: any) {
      console.warn(`⚠️ Error for ${name} (${nik}):`, e.message);
    }
  }

  console.log(`✅ Import finished: ${updatedCount} updated, ${createdCount} created.`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
