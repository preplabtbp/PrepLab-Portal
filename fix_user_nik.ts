import { db } from './src/db/index.js';
import { employees } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

async function fixUser() {
  console.log('Mencari data asli NIK 02D25000055 di backup_employees_1.json...');
  const raw = fs.readFileSync('db_backups/backup_employees_1.json', 'utf8');
  const backup = JSON.parse(raw);
  const realData = backup.data.find((e: any) => e.nik === '02D25000055');

  if (!realData) {
    console.error('Data NIK 02D25000055 tidak ditemukan di backup!');
    process.exit(1);
  }

  console.log('Data asli ditemukan:', realData.name, '|', realData.jabatan, '|', realData.email);

  // Update or re-insert employee record in DB
  const existing = await db.select().from(employees).where(eq(employees.nik, '02D25000055'));
  
  if (existing.length > 0) {
    console.log('Memperbarui data di database...');
    await db.update(employees).set({
      name: realData.name,
      jabatan: realData.jabatan,
      jobGrade: realData.jobGrade,
      section: realData.section,
      gol: realData.gol,
      shift: realData.shift,
      poh: realData.poh,
      pt: realData.pt,
      statusMess: realData.statusMess,
      rotation: realData.rotation,
      tanggalAwalBergabung: realData.tanggalAwalBergabung,
      tanggalBergabungTerbaru: realData.tanggalBergabungTerbaru,
      statusKontrak: realData.statusKontrak,
      department: realData.department,
      position: realData.position,
      email: realData.email,
      passwordHash: realData.passwordHash,
      avatar: realData.avatar,
      firstLoginComplete: realData.firstLoginComplete,
    }).where(eq(employees.nik, '02D25000055'));
  } else {
    console.log('Memasukkan data baru ke database...');
    await db.insert(employees).values({
      nik: realData.nik,
      name: realData.name,
      jabatan: realData.jabatan,
      jobGrade: realData.jobGrade,
      section: realData.section,
      gol: realData.gol,
      shift: realData.shift,
      poh: realData.poh,
      pt: realData.pt,
      statusMess: realData.statusMess,
      rotation: realData.rotation,
      tanggalAwalBergabung: realData.tanggalAwalBergabung,
      tanggalBergabungTerbaru: realData.tanggalBergabungTerbaru,
      statusKontrak: realData.statusKontrak,
      department: realData.department,
      position: realData.position,
      email: realData.email,
      passwordHash: realData.passwordHash,
      avatar: realData.avatar,
      firstLoginComplete: realData.firstLoginComplete,
    });
  }

  console.log('✅ SUKSES! Data karyawan NIK 02D25000055 berhasil dipulihkan ke nama asli: Muhamad Anugrah Ramadhan');
  process.exit(0);
}

fixUser();
