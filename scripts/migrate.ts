// Polyfill localStorage untuk Node.js
(global as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

import { db } from "../src/db/index.js";
import { employees, equipments, workOrders } from "../src/db/schema.js";
import { getEmployees, getEquipments, getWOData } from "../src/sheets-api.js";

async function migrateData() {
  console.log("🚀 Memulai Migrasi Data dari Google Sheets ke Cloud SQL...");

  try {
    // 1. Migrasi Karyawan (Employees)
    console.log("🔄 Mengambil data Karyawan dari Google Sheets...");
    const employeesData = await getEmployees();
    if (employeesData && employeesData.length > 0) {
      console.log(`✅ Mendapatkan ${employeesData.length} data karyawan. Menyimpan ke database...`);
      for (const emp of employeesData) {
        try {
          await db.insert(employees).values({
            nik: emp.nik,
            name: emp.nama || 'Unknown', // Changed from emp.name
            department: emp.divisi || 'Unknown', // Changed from emp.department
            position: emp.jabatan || 'Unknown' // Changed from emp.position
          }).onConflictDoNothing(); // Abaikan jika NIK sudah ada
        } catch (e) {
          console.error(`Gagal menyimpan karyawan ${emp.name}:`, e);
        }
      }
      console.log("✅ Migrasi data Karyawan selesai!");
    } else {
      console.log("⚠️ Tidak ada data Karyawan yang ditemukan.");
    }

    // 2. Migrasi Alat / Unit (Equipments)
    console.log("🔄 Mengambil data Alat/Unit dari Google Sheets...");
    const equipmentsData = await getEquipments();
    if (equipmentsData && equipmentsData.length > 0) {
      console.log(`✅ Mendapatkan ${equipmentsData.length} kategori alat.`);
      for (const category of equipmentsData) {
        for (const tool of category.tools) {
          try {
            await db.insert(equipments).values({
              category: category.category,
              name: tool.name,
              code: (tool as any).code || tool.assetNumber || tool.name, // Gunakan nama sebagai kode jika kosong
              status: (tool as any).status || 'active'
            }).onConflictDoNothing(); // Abaikan jika Kode sudah ada
          } catch (e) {
             console.error(`Gagal menyimpan alat ${tool.name}:`, e);
          }
        }
      }
      console.log("✅ Migrasi data Alat/Unit selesai!");
    } else {
      console.log("⚠️ Tidak ada data Alat/Unit yang ditemukan.");
    }

    // 3. Migrasi Work Orders (WO)
    console.log("🔄 Mengambil data Work Orders dari Google Sheets...");
    const woData = await getWOData();
    if (woData && woData.length > 0) {
       console.log(`✅ Mendapatkan ${woData.length} data Work Orders. Menyimpan ke database...`);
       for (const wo of woData) {
         try {
           if (!wo.WO_ID) continue; // Skip if no ID
           await db.insert(workOrders).values({
             woId: wo.WO_ID,
             date: wo.Timestamp ? new Date(wo.Timestamp) : new Date(),
             requestorNik: wo.Pelapor_NIK || 'Unknown',
             requestorName: wo.Pelapor_Nama,
             equipmentCode: wo.Alat_ID,
             equipmentName: wo.Nama_Alat,
             location: wo.Lokasi_Ruangan,
             category: wo.Kategori_Kerusakan,
             priority: wo.Priority || 'Medium',
             issueDescription: wo.Deskripsi_Masalah || 'No description',
             status: wo.Status || 'Open',
             photoUrl: wo.Bukti_Foto_URL,
             technicianPic: wo.Teknisi_PIC,
             repairStart: wo.Mulai_Perbaikan ? new Date(wo.Mulai_Perbaikan) : null,
             repairEnd: wo.Selesai_Perbaikan ? new Date(wo.Selesai_Perbaikan) : null,
             actionTaken: wo.Hasil_Tindakan,
             downtimeDuration: wo.Durasi_Downtime,
             shift: wo.Shift
           }).onConflictDoNothing();
         } catch(e) {
           console.error(`Gagal menyimpan WO ${wo.WO_ID}:`, e);
         }
       }
       console.log("✅ Migrasi data Work Orders selesai!");
    } else {
       console.log("⚠️ Tidak ada data Work Orders yang ditemukan.");
    }

    console.log("🎉 SEMUA PROSES MIGRASI SELESAI!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Terjadi kesalahan saat migrasi:", error);
    process.exit(1);
  }
}

migrateData();
