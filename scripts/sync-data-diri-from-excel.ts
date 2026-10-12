import fs from 'fs';
import * as XLSX from 'xlsx';
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/index';
import { employees } from '../src/db/schema';
const APPLY = process.argv.includes('--apply');
const serialToIso = (v: any) => {
  const n = Number(v);
  if (!isNaN(n) && n > 20000 && n < 70000) { const d = new Date(Math.round((n - 25569) * 86400000)); return d.toISOString().slice(0, 10); }
  const s = String(v ?? '').trim(); return s || null;
};
(async () => {
  const wb = XLSX.read(fs.readFileSync(process.argv[2]));
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true, defval: '' });
  const dbRows: any[] = await db.select().from(employees);
  const byNik = new Map(dbRows.map(e => [String(e.nik || '').toUpperCase().trim(), e]));
  const nn = (s: any) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const F: Record<string, string> = {
    'No.KTP': 'ktp', 'Tempat Lahir': 'tempatLahir', 'Nomor Telp. Pribadi': 'phone',
    'Keluarga Kandung yang Bisa Dihubungi': 'keluargaKandung', 'No.Telephone Keluarga Kandung': 'phoneKeluarga',
    'Orang terdekat yang bisa dihubungi': 'orangTerdekat', 'No.Telephone darurat Orang Terdekat': 'phoneDarurat',
    'Alamat Sesuai KTP': 'alamatKtp', 'Alamat Domisili': 'alamatDomisili',
  };
  const norm = (v: any) => String(v ?? '').replace(/\s+/g, ' ').trim();
  let changedEmps = 0;
  for (const r of rows) {
    const nik = String(r['NIK'] || '').toUpperCase().trim(); if (!nik) continue;
    let e = byNik.get(nik);
    if (!e) e = dbRows.find(d => nn(d.name) === nn(r['Nama']) && !rows.some(x => String(x['NIK']).toUpperCase().trim() === String(d.nik).toUpperCase().trim()));
    if (!e) continue;
    const set: Record<string, any> = {};
    for (const [col, f] of Object.entries(F)) {
      const x = norm(r[col]); if (!x || x === '-' || x === '#N/A') continue;
      if (x.toLowerCase() !== norm(e[f]).toLowerCase()) set[f] = x;
    }
    const tl = serialToIso(r['Tanggal Lahir']);
    if (tl && tl !== '-' && tl !== String(e.tanggalLahir || '').trim()) set.tanggalLahir = tl;
    const xs = norm(r['Status Karyawan']);
    if (xs && String(e.statusKaryawan || '').trim().toLowerCase() === 'active' && xs.toLowerCase() !== 'active') set.statusKaryawan = xs;
    if (Object.keys(set).length) {
      changedEmps++;
      console.log(`${APPLY ? 'UPDATE' : 'DRY'} db:${e.nik}${e.nik !== nik ? ` (excel:${nik})` : ''} -> ${Object.keys(set).join(', ')}`);
      if (APPLY) await db.update(employees).set(set).where(eq(employees.id, e.id));
    }
  }
  console.log('employees affected:', changedEmps);
  await pool.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
