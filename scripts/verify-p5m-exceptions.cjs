const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

function tentukanDivisi(section, jabatan, name, nik) {
  const n = (name || '').toLowerCase();
  const k = (nik || '').toLowerCase();

  // ── ATURAN PENGECUALIAN PENEMPATAN JADWAL P5M ──
  if (n.includes('murti') || k === 'm0403190701') return 'Laboratory';
  if (n.includes('atha') || k === '04d25000053') return 'Laboratory';
  if (n.includes('djody') || n.includes('jody') || k === '02d24000045') return 'Preparation';

  const s = (section || '').toLowerCase();
  const j = (jabatan || '').toLowerCase();

  if (s.includes('ic') || s.includes('inventory')) return 'IC';
  if (s.includes('qa') || s.includes('quality')) return 'Quality Assurance';
  if (s.includes('prep')) return 'Preparation';
  if (s.includes('maintenance') || s.includes('mekanik')) return 'Maintenance';
  if (s.includes('lab')) return 'Laboratory';
  if (s.includes('admin') || s.includes('administrator')) return 'Administration';

  if (j.includes('ic') || j.includes('inventory')) return 'IC';
  if (j.includes('quality') || j.includes('qa') || j.includes('qc')) return 'Quality Assurance';
  if (j.includes('prep')) return 'Preparation';
  if (j.includes('maintenance') || j.includes('mekanik')) return 'Maintenance';
  if (j.includes('lab')) return 'Laboratory';
  if (j.includes('admin') || j.includes('administrator')) return 'Administration';

  return 'All';
}

async function main() {
  const client = await pool.connect();
  const res = await client.query(
    "SELECT nik, name, jabatan, section, department, pt, gol FROM employees WHERE name ILIKE '%murti%' OR name ILIKE '%atha%' OR name ILIKE '%djody%'"
  );

  console.log('\n--- VERIFIKASI PENGECUALIAN PENEMPATAN P5M ---');
  res.rows.forEach(emp => {
    const divisiP5M = tentukanDivisi(emp.section || emp.department || '', emp.jabatan, emp.name, emp.nik);
    console.log(`Nama: ${emp.name}`);
    console.log(`  - NIK: ${emp.nik}`);
    console.log(`  - Jabatan Asli (DB): ${emp.jabatan}`);
    console.log(`  - Section Asli (DB): ${emp.section}`);
    console.log(`  - Penempatan Divisi di P5M: 👉 [${divisiP5M}] 👈\n`);
  });

  client.release();
  await pool.end();
}

main().catch(console.error);
