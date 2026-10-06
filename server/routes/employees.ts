import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { employees, developerUsers } from "../../src/db/schema.js";
import { toPublicEmployee } from "../middleware/auth.js";
import { drive } from "../../google-services.js";
import { Readable } from "stream";

export const employeesRouter = Router();

export async function isAuthorizedDatabaseEditor(editorNik?: string): Promise<boolean> {
  if (!editorNik) return false;
  const nik = String(editorNik).trim().toUpperCase();
  if (!nik) return false;

  // Superadmins / Default Developer accounts
  if (['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'].includes(nik)) return true;

  // Check Developer Users table
  try {
    const dev = await db.select().from(developerUsers).where(eq(developerUsers.nik, nik)).limit(1);
    if (dev.length > 0) return true;
  } catch (e) {}

  // Check Employees table for Administration section/role
  try {
    const emp = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    if (emp.length > 0) {
      const e = emp[0];
      const sec = (e.section || '').toLowerCase();
      const dep = (e.department || '').toLowerCase();
      const jab = (e.jabatan || '').toLowerCase();
      if (
        sec.includes('admin') ||
        sec.includes('administrasi') ||
        dep.includes('admin') ||
        dep.includes('administrasi') ||
        jab.includes('admin') ||
        jab.includes('administrasi')
      ) {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

async function uploadEmployeePhotoToDrive(nik: string, name: string, base64OrUrl: string): Promise<string> {
  if (!base64OrUrl) return '';
  const str = String(base64OrUrl).trim();
  if (!str) return '';

  // If already a Google Drive URL, normalize it to direct internal proxy URL
  if (str.includes('drive.google.com')) {
    const idMatch = str.match(/\/d\/([a-zA-Z0-9_-]+)/) || str.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `/api/employees/photo/${idMatch[1]}`;
    }
    return str;
  }

  // If regular http/https image URL
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  // If Base64 data (e.g. data:image/jpeg;base64,... or raw base64)
  if (str.startsWith('data:image') || (str.length > 100 && !str.includes(' '))) {
    try {
      const mimeMatch = str.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const cleanBase64 = str.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      // Folder Dokumentasi / Foto Karyawan
      const parentFolderId = process.env.GDRIVE_EMPLOYEES_FOLDER_ID || '1V_qxWLDAwcdV6O8Eg723fqMcZSeRIzoe';
      const safeName = (name || nik).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Foto_${nik}_${safeName}.jpg`;

      const response = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [parentFolderId]
        },
        media: {
          mimeType: mimeType,
          body: stream
        },
        fields: 'id, webViewLink',
        supportsAllDrives: true
      });

      const fileId = response.data.id;
      if (fileId) {
        try {
          await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' },
            supportsAllDrives: true
          });
        } catch (permErr) {}

        return `/api/employees/photo/${fileId}`;
      }
    } catch (driveErr: any) {
      console.warn(`Drive upload failed for employee photo ${nik}:`, driveErr.message);
      return str;
    }
  }

  return str;
}

// Proxy Google Drive photos to prevent Google Drive 403 hotlinking restrictions
employeesRouter.get("/photo/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId || fileId.length < 5) {
      return res.status(400).send("Invalid file ID");
    }

    let mimeType = 'image/jpeg';
    try {
      const meta = await drive.files.get({ fileId, fields: 'mimeType, name, size', supportsAllDrives: true });
      if (meta?.data?.mimeType) mimeType = meta.data.mimeType;
    } catch {}

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    try {
      const streamRes = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );
      return streamRes.data.pipe(res);
    } catch (sdkErr) {
      const fetchRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
      if (fetchRes.ok) {
        const arrayBuf = await fetchRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuf));
      }
      return res.status(404).send("Foto tidak ditemukan di Google Drive");
    }
  } catch (err: any) {
    console.error("Error serving employee photo proxy:", err.message);
    res.status(500).send("Gagal memuat foto karyawan");
  }
});


employeesRouter.get("/", async (req, res) => {
  try {
    const { pt, all } = req.query;
    let data = await db.select().from(employees);

    // Strictly exclude demo, staging, admin and broken spreadsheet accounts
    data = data.filter(e => {
      const nik = (e.nik || '').toString().toUpperCase();
      const name = (e.name || '').toString().toLowerCase();
      const username = (e.username || '').toString().toLowerCase();
      if (
        nik === 'DEMO123' || nik === 'DEMO' || nik.includes('DEMO') ||
        name.includes('user demo') || name.includes('demo staging') || name.includes('staging') ||
        username.includes('demo') || username.includes('staging') ||
        nik === 'PREPLABADMIN' || nik.includes('#N/A') || name.includes('#N/A')
      ) {
        return false;
      }
      return true;
    });

    if (all !== 'true') {
      const isGtsReq = (pt || '').toString().trim().toUpperCase() === 'GTS';
      if (isGtsReq) {
        data = data.filter(e => {
          const ptStr = (e.pt || '').toString().trim().toUpperCase();
          const nikStr = (e.nik || '').toString().trim().toUpperCase();
          return ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03');
        });
      } else {
        // TBP & GPS -> Strictly exclude GTS employees (check pt AND NIK prefix 03/M03) and resigned personnel
        data = data.filter(e => {
          const ptStr = (e.pt || '').toString().trim().toUpperCase();
          const nikStr = (e.nik || '').toString().trim().toUpperCase();
          const isGts = ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03');
          const stStr = (e.statusKaryawan || '').toString().trim().toUpperCase();
          const secStr = (e.section || '').toString().trim().toUpperCase();
          const isResigned = stStr.includes('RESIGN') || stStr.includes('PHK') || secStr.includes('#N/A') || [
            '04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719', 'M0506260356',
            'M0206250825', 'M0203220107', 'M0402240107', 'M0402230177', 'M0205250595', 'M0201250027', 'M0206250798', 'M0403240137', 'M0404220419'
          ].includes(nikStr);
          return !isGts && !isResigned;
        });
      }
    }

    res.json(data.map(e => toPublicEmployee(e)));
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

employeesRouter.get("/hierarchy/:nik", async (req, res) => {
  try {
    const { nik } = req.params;
    const userResult = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    
    if (userResult.length === 0) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }
    
    const user = userResult[0];
    const sectionLower = (user.section || "").toLowerCase();
    const deptLower = (user.department || "").toLowerCase();
    const jabatanLower = (user.jabatan || "").toLowerCase();
    
    // Check if user is Admin, Administrasi or QA (Admin can see all)
    if (sectionLower.includes("administrasi") || deptLower.includes("administrasi") || 
        sectionLower.includes("qa") || deptLower.includes("qa") || sectionLower.includes("quality assurance") || deptLower.includes("quality assurance") ||
        jabatanLower.includes("admin")) {
      const allData = await db.select().from(employees);
      return res.json({ status: "success", data: allData.map(e => toPublicEmployee(e)) });
    }
    
    // Determine subordinates based on Jabatan
    let allowedJabatans: string[] = [];
    if (jabatanLower.includes("manager") || jabatanLower.includes("superintendent")) {
      allowedJabatans = ["supervisor", "foreman", "crew", "operator", "staff", "analyst", "technician", "admin"];
    } else if (jabatanLower.includes("supervisor")) {
      allowedJabatans = ["foreman", "crew", "operator", "staff", "analyst", "technician", "admin"];
    } else if (jabatanLower.includes("foreman")) {
      allowedJabatans = ["crew", "operator", "staff", "analyst", "technician", "admin"];
    }
    
    if (allowedJabatans.length === 0) {
      // Crew or someone with no subordinates
      return res.json({ status: "success", data: [toPublicEmployee(user)] });
    }
    
    // Fetch all employees
    const allEmployees = await db.select().from(employees);
    const subordinates = allEmployees.filter(e => {
      const eSection = (e.section || "").toLowerCase();
      const eDept = (e.department || "").toLowerCase();
      const isSameDept = (deptLower && eDept === deptLower) || (sectionLower && eSection === sectionLower);
      if (!isSameDept) return false;
      
      const eJabatan = (e.jabatan || "").toLowerCase();
      return allowedJabatans.some(allowed => eJabatan.includes(allowed));
    });
    
    // Always include themselves
    if (!subordinates.find(s => s.nik === user.nik)) {
      subordinates.unshift(user);
    }
    
    res.json({ status: "success", data: subordinates.map(e => toPublicEmployee(e)) });
  } catch (error) {
    console.error("Error fetching hierarchy:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch hierarchy" });
  }
});

employeesRouter.get("/:nik", async (req, res) => {
  try {
    const { nik } = req.params;
    const data = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    if (data.length > 0) {
      res.json({ status: "success", employee: toPublicEmployee(data[0]) });
    } else {
      res.status(404).json({ status: "error", message: "Karyawan tidak ditemukan" });
    }
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch employee" });
  }
});

employeesRouter.post("/", async (req, res) => {
  try {
    const result = await db.insert(employees).values(req.body).returning();
    res.status(201).json(toPublicEmployee(result[0]));
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

function cleanDateVal(v: any): string | null {
  if (v === undefined || v === null) return null;
  const str = String(v).trim();
  if (!str || str === '-' || str === '#N/A' || str.toLowerCase() === 'null') return null;
  const num = Number(str);
  if (!isNaN(num) && num > 20000 && num < 70000 && Number.isInteger(num)) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return str;
}

employeesRouter.post("/import", async (req, res) => {
  try {
    const { rows, editorNik } = req.body;
    const requesterNik = editorNik || req.headers['x-user-nik'] || req.body?.requesterNik;
    const isAuth = await isAuthorizedDatabaseEditor(String(requesterNik || ''));
    if (!isAuth) {
      return res.status(403).json({ 
        status: "error", 
        message: "Akses ditolak: Pengupdate-an database karyawan hanya bisa dilakukan oleh section Administration atau Developer." 
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ status: "error", message: "Tidak ada data baris yang dikirim untuk diimport." });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      if (!raw || typeof raw !== 'object') continue;

      // Normalize row keys
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

      const rawFoto = raw['Foto'] || raw['foto'] || normalized['foto'] || normalized['photo'] || normalized['avatar'] || normalized['fotoprofil'] || normalized['kolomfoto'] || normalized['gambar'] || normalized['image'] || '';
      let driveAvatarUrl: string | null = null;
      if (rawFoto && rawFoto !== '-' && rawFoto !== '#N/A') {
        driveAvatarUrl = await uploadEmployeePhotoToDrive(nik, name, rawFoto);
      }

      const empData: Record<string, any> = {
        name,
        nik,
        ktp: normalized['noktp'] || normalized['ktp'] || normalized['nikktp'] || null,
        pt: normalized['pt'] || normalized['perusahaan'] || null,
        poh: normalized['poh'] || null,
        sponsor: normalized['sponsor'] || null,
        statusKaryawan: normalized['statuskaryawan'] || normalized['status'] || null,
        tanggalEfektifTidakBekerja: cleanDateVal(normalized['tanggalefektiftidakbekerja'] || normalized['tgleftidakbekerja'] || normalized['tanggaltidakbekerja'] || normalized['efektiftidakbekerja']),
        tanggalAwalBergabung: cleanDateVal(normalized['dohawal'] || normalized['doh'] || normalized['tanggalawalbergabung']),
        tanggalJabatanBaru: cleanDateVal(normalized['tanggaljabatanbaru'] || normalized['tgljabatanbaru']),
        masaKerja: normalized['masakerja'] || null,
        masaKerjaJabatanTerakhir: normalized['masakerjajabatanterakhir'] || normalized['masakerjajabatan'] || null,
        department: normalized['departemen'] || normalized['department'] || null,
        section: normalized['bagian'] || normalized['section'] || null,
        jobGrade: normalized['jobgrade'] || null,
        gol: normalized['gol'] || normalized['golongan'] || null,
        jabatan: normalized['jabatanbaru'] || normalized['jabatan'] || null,
        statusKontrak: normalized['statuskontrak'] || null,
        tanggalPermanent: cleanDateVal(normalized['tanggalpermanent'] || normalized['tanggalpermanen']),
        tempatLahir: normalized['tempatlahir'] || null,
        tanggalLahir: cleanDateVal(normalized['tanggallahir']),
        phone: normalized['nomortelppribadi'] || normalized['notelp'] || normalized['nomortelp'] || normalized['phone'] || null,
        keluargaKandung: normalized['keluargakandungyangbisadihubungi'] || normalized['keluargakandung'] || normalized['kelkandung'] || null,
        phoneKeluarga: normalized['notelephonekeluargakandung'] || normalized['notelpkeluarga'] || normalized['telpkel'] || normalized['telpkeluarga'] || null,
        orangTerdekat: normalized['orangterdekatyangbisadihubungi'] || normalized['orangterdekat'] || normalized['orgterdekat'] || null,
        phoneDarurat: normalized['notelephonedaruratorangterdekat'] || normalized['notelpdarurat'] || normalized['telpdarurat'] || null,
        alamatKtp: normalized['alamatsesuaiktp'] || normalized['alamatktp'] || null,
        alamatDomisili: normalized['alamatdomisili'] || normalized['domisili'] || null,
        ...(driveAvatarUrl ? { photo: driveAvatarUrl } : {})
      };

      // Filter out null/empty from update payload if not present in imported file to prevent overwriting existing data
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
        errors.push(`Row ${i + 1} (${nik} - ${name}): ${err.message}`);
      }
    }

    res.json({
      status: "success",
      message: `Import berhasil: ${updatedCount} diperbarui, ${insertedCount} ditambahkan.`,
      stats: {
        total: rows.length,
        updated: updatedCount,
        inserted: insertedCount,
        errors: errorCount,
        errorList: errors.slice(0, 10)
      }
    });
  } catch (error: any) {
    console.error("Error importing employees:", error);
    res.status(500).json({ status: "error", message: error.message || "Gagal mengimport data karyawan." });
  }
});

employeesRouter.post("/avatar", async (req, res) => {
  try {
    const { nik, avatar, forceClear } = req.body;
    if (!nik) {
      return res.status(400).json({ status: "error", message: "NIK required" });
    }

    // Lindungi foto sebelumnya: jangan pernah hapus foto jika payload avatar kosong kecuali forceClear: true
    if (!forceClear && (!avatar || typeof avatar !== 'string' || !avatar.trim() || avatar === 'null')) {
      return res.status(400).json({ 
        status: "error", 
        message: "Data avatar tidak boleh kosong. Foto sebelumnya dipertahankan." 
      });
    }

    const finalAvatar = forceClear ? null : avatar.trim();
    const result = await db.update(employees)
      .set({ avatar: finalAvatar })
      .where(eq(employees.nik, nik))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ status: "error", message: "Karyawan tidak ditemukan" });
    }

    return res.json({ status: "success", employee: toPublicEmployee(result[0]) || null });
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ status: "error", message: "Failed to update avatar" });
  }
});

employeesRouter.post("/photo", async (req, res) => {
  try {
    const { nik, photo, forceClear, editorNik } = req.body;
    const requesterNik = editorNik || req.headers['x-user-nik'] || req.body?.requesterNik;
    const isAuth = await isAuthorizedDatabaseEditor(String(requesterNik || ''));
    if (!isAuth) {
      return res.status(403).json({ 
        status: "error", 
        message: "Akses ditolak: Fitur ganti foto database karyawan hanya bisa dilakukan oleh section Administration atau Developer." 
      });
    }

    if (!nik) {
      return res.status(400).json({ status: "error", message: "NIK required" });
    }

    // Lindungi foto sebelumnya: jangan pernah hapus foto jika payload kosong kecuali forceClear: true
    if (!forceClear && (!photo || typeof photo !== 'string' || !photo.trim() || photo === 'null')) {
      return res.status(400).json({ 
        status: "error", 
        message: "Data foto tidak boleh kosong. Foto sebelumnya dipertahankan." 
      });
    }

    const finalPhoto = forceClear ? null : photo.trim();
    const result = await db.update(employees)
      .set({ photo: finalPhoto })
      .where(eq(employees.nik, nik))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ status: "error", message: "Karyawan tidak ditemukan" });
    }

    return res.json({ status: "success", employee: toPublicEmployee(result[0]) || null });
  } catch (error) {
    console.error("Error updating photo:", error);
    res.status(500).json({ status: "error", message: "Failed to update photo" });
  }
});

employeesRouter.post("/cover", async (req, res) => {
  try {
    const { nik, cover } = req.body;
    if (!nik) {
      return res.status(400).json({ status: "error", message: "NIK required" });
    }
    const result = await db.update(employees)
      .set({ cover: cover || null })
      .where(eq(employees.nik, nik))
      .returning();
    return res.json({ status: "success", employee: toPublicEmployee(result[0]) || null });
  } catch (error) {
    console.error("Error updating cover:", error);
    res.status(500).json({ status: "error", message: "Failed to update cover" });
  }
});


