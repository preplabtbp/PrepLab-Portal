import { db } from './src/db/index.js';
import { employees } from './src/db/schema.js';

async function check() {
  const emps = await db.select().from(employees);
  console.log('Total karyawan di database:', emps.length);
  console.log('\n--- Daftar Contoh NIK Karyawan ---');
  emps.slice(0, 15).forEach((e, idx) => {
    console.log(`${idx + 1}. NIK: "${e.nik}" | Nama: "${e.name}" | Jabatan: "${e.jabatan}"`);
  });
  process.exit(0);
}

check();
