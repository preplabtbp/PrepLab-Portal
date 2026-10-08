import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { employees, developerUsers, employeeAttendance, employeeCounseling } from "../../src/db/schema.js";
import { toPublicEmployee } from "../middleware/auth.js";
import { drive } from "../../google-services.js";
import { Readable } from "stream";

export const employeesRouter = Router();

export function normalizeNameKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(st|s\.t|s\.sos|s\.pi|s\.e|a\.md|s\.kom|s\.pd|dr|drs|ir|m\.t|m\.si)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// In-memory cache for ultra-fast employee, attendance & counseling data serving
let cachedAttendanceMap: { data: Record<string, any>; timestamp: number } | null = null;
let cachedCounselingMap: { data: Record<string, any>; timestamp: number } | null = null;
let cachedHierarchy: Map<string, { data: any[]; timestamp: number }> = new Map();
let cachedAllEmployees: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function clearEmployeeCache() {
  cachedAttendanceMap = null;
  cachedCounselingMap = null;
  cachedHierarchy.clear();
  cachedAllEmployees = null;
}

async function getAttendanceMap(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cachedAttendanceMap && (now - cachedAttendanceMap.timestamp < CACHE_TTL_MS)) {
    return cachedAttendanceMap.data;
  }
  try {
    const allAtt = await db.select().from(employeeAttendance);
    const map: Record<string, any> = {};
    for (const item of allAtt) {
      const nik = item.nik;
      if (!map[nik]) map[nik] = {};
      const yr = item.year || 2026;
      map[nik][yr] = {
        izin: item.izin || 0,
        izinKhusus: item.izinKhusus || 0,
        sakit: item.sakit || 0,
        sakitSite: item.sakitSiteCount || 0,
        sakitLuar: item.sakitLuarCount || 0,
        alpa: item.alpa || 0,
        tanggalIzin: item.tanggalIzin || '',
        tanggalIzinKhusus: item.tanggalIzinKhusus || '',
        tanggalSakitSite: item.tanggalSakitSite || '',
        tanggalSakitLuar: item.tanggalSakitLuar || '',
        tanggalAlpa: item.tanggalAlpa || '',
        alasanIzin: item.alasanIzin || '',
        alasanIzinKhusus: item.alasanIzinKhusus || '',
        alasanSakitSite: item.alasanSakitSite || '',
        alasanSakitLuar: item.alasanSakitLuar || '',
        alasanSakit: item.alasanSakit || '',
        details: item.details || []
      };
    }
    cachedAttendanceMap = { data: map, timestamp: now };
    return map;
  } catch (e) {
    return {};
  }
}

async function getCounselingMap(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cachedCounselingMap && (now - cachedCounselingMap.timestamp < CACHE_TTL_MS)) {
    return cachedCounselingMap.data;
  }
  try {
    // Ensure table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS employee_counseling (
        id SERIAL PRIMARY KEY,
        nik TEXT NOT NULL,
        name TEXT,
        jabatan TEXT,
        pt TEXT,
        total_sp TEXT,
        bulan_konseling TEXT,
        konseling_1 TEXT,
        konseling_2 TEXT,
        konseling_3 TEXT,
        st TEXT,
        sp_1 TEXT,
        sp_2 TEXT,
        sp_3 TEXT,
        phk TEXT,
        masa_berlaku_sanksi TEXT,
        masa_pemulihan_1 TEXT,
        masa_pemulihan_2 TEXT,
        alasan_konseling TEXT,
        alasan_sp TEXT,
        keterangan TEXT,
        pernah_sp_sebelumnya TEXT,
        pernah_terlibat_spdk TEXT,
        kronologi_spdk TEXT,
        kategori_spdk TEXT,
        tindakan_spdk TEXT,
        status_sanksi TEXT DEFAULT 'Aman',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_counseling_nik ON employee_counseling(nik);
      ALTER TABLE employee_counseling ADD COLUMN IF NOT EXISTS alasan_konseling TEXT;
      ALTER TABLE employee_counseling ADD COLUMN IF NOT EXISTS sppt TEXT;
      ALTER TABLE employee_counseling ADD COLUMN IF NOT EXISTS tanggal_sp TEXT;
    `);

    const allC = await db.select().from(employeeCounseling);
    const map: Record<string, any> = {};
    for (const item of allC) {
      if (item.nik) {
        map[item.nik] = item;
        map[item.nik.toUpperCase().trim()] = item;
      }
      if (item.name) {
        map[normalizeNameKey(item.name)] = item;
      }
    }
    cachedCounselingMap = { data: map, timestamp: now };
    return map;
  } catch (e) {
    return {};
  }
}

function attachAttendanceToEmployee(e: any, attMap: Record<string, any>, counselMap?: Record<string, any>) {
  const publicEmp = toPublicEmployee(e);
  const attForEmp = attMap[e.nik] || e.attendanceData || {};
  const counsel = (counselMap && (
    counselMap[e.nik] || 
    counselMap[e.nik.toUpperCase().trim()] || 
    counselMap[normalizeNameKey(e.name)]
  )) || (e.counselingSpdk || null);

  const emptyAttendance = {
    izin: 0,
    izinKhusus: 0,
    sakit: 0,
    sakitSite: 0,
    sakitLuar: 0,
    alpa: 0,
    tanggalIzin: '',
    tanggalIzinKhusus: '',
    tanggalSakitSite: '',
    tanggalSakitLuar: '',
    tanggalAlpa: '',
    alasanIzin: '',
    alasanIzinKhusus: '',
    alasanSakitSite: '',
    alasanSakitLuar: '',
    alasanSakit: '',
    details: []
  };

  const rawAtt26 = attForEmp[2026] || attForEmp['2026'] || {};
  const rawAtt25 = attForEmp[2025] || attForEmp['2025'] || {};

  const formatAtt = (raw: any) => ({
    ...emptyAttendance,
    ...raw,
    alpa: raw.alpa !== undefined ? raw.alpa : (raw.alpha !== undefined ? raw.alpha : 0),
    tanggalAlpa: raw.tanggalAlpa || raw.tanggalAlpha || raw.tanggal_alpa || raw.tanggal_alpha || raw.alpaTanggal || raw.alphaTanggal || (typeof raw.alpa === 'string' && (raw.alpa.includes('-') || raw.alpa.includes('/')) ? raw.alpa : '') || ''
  });

  return {
    ...publicEmp,
    attendance: attForEmp,
    attendance2026: formatAtt(rawAtt26),
    attendance2025: formatAtt(rawAtt25),
    counselingSpdk: counsel
  };
}

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

    const attMap = await getAttendanceMap();
    const counselMap = await getCounselingMap();
    res.json(data.map(e => attachAttendanceToEmployee(e, attMap, counselMap)));
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

export function isSectionManagerOrAdmin(emp: any): boolean {
  if (!emp) return false;
  const jab = (emp.jabatan || '').toLowerCase();
  const sec = (emp.section || '').toLowerCase();
  const dept = (emp.department || '').toLowerCase();
  const nik = (emp.nik || '').toUpperCase();
  const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
  if (HARDCODED_DEVS.includes(nik) || emp.isAdmin || emp.isDeveloper) return true;
  if (jab.includes('section manager') || jab.includes('manager') || jab.includes('superintendent') || jab.includes('head') || jab.includes('spt')) return true;
  if (sec.includes('administrasi') || dept.includes('administrasi') || sec.includes('qa') || dept.includes('qa') || sec.includes('quality assurance') || dept.includes('quality assurance') || jab.includes('admin')) return true;
  return false;
}

export function isGtsEmployee(emp: any): boolean {
  if (!emp) return false;
  const ptStr = (emp.pt || '').toString().trim().toUpperCase();
  const nikStr = (emp.nik || '').toString().trim().toUpperCase();
  const secStr = (emp.section || '').toString().trim().toUpperCase();
  return ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03') || secStr.includes('GTS');
}

employeesRouter.get("/hierarchy/:nik", async (req, res) => {
  try {
    const { nik } = req.params;
    const cleanNik = (nik || "").trim().toUpperCase();

    // Meeting Room, Admin, Super Admin virtual account checks (full access to search all employees)
    if (
      cleanNik === 'MEETINGROOM' || 
      cleanNik === 'MEETING' || 
      cleanNik === 'RUANGMEETING' || 
      cleanNik === 'RUANG_MEETING' ||
      cleanNik.includes('MEETING') ||
      cleanNik === 'PREPLABADMIN'
    ) {
      let allData = await db.select().from(employees);
      // Strictly exclude demo, staging, admin accounts
      allData = allData.filter(e => {
        const eNik = (e.nik || '').toString().toUpperCase();
        const eName = (e.name || '').toString().toLowerCase();
        return !eNik.includes('DEMO') && !eName.includes('demo') && eNik !== 'PREPLABADMIN';
      });
      return res.json({ status: "success", data: allData.map(e => toPublicEmployee(e)) });
    }

    const now = Date.now();
    const cached = cachedHierarchy.get(nik);
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return res.json({ status: "success", data: cached.data });
    }

    const userResult = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    
    if (userResult.length === 0) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }
    
    const user = userResult[0];
    const sectionLower = (user.section || "").toLowerCase();
    const deptLower = (user.department || "").toLowerCase();
    const jabatanLower = (user.jabatan || "").toLowerCase();
    const attMap = await getAttendanceMap();
    const counselMap = await getCounselingMap();
    
    const isUserMgr = isSectionManagerOrAdmin(user);
    const isUserGts = isGtsEmployee(user);

    // Section Manager / Admin / QA dapat mengakses seluruh karyawan (TBP & GTS)
    if (isUserMgr) {
      const allData = await db.select().from(employees);
      const formatted = allData.map(e => attachAttendanceToEmployee(e, attMap, counselMap));
      cachedHierarchy.set(nik, { data: formatted, timestamp: now });
      return res.json({ status: "success", data: formatted });
    }
    
    // Determine subordinates based on Jabatan
    let allowedJabatans: string[] = [];
    if (jabatanLower.includes("supervisor")) {
      allowedJabatans = ["foreman", "crew", "operator", "staff", "analyst", "technician", "admin"];
    } else if (jabatanLower.includes("foreman")) {
      allowedJabatans = ["crew", "operator", "staff", "analyst", "technician", "admin"];
    }
    
    if (allowedJabatans.length === 0) {
      // Crew or someone with no subordinates (only see own profile)
      const formatted = [attachAttendanceToEmployee(user, attMap, counselMap)];
      cachedHierarchy.set(nik, { data: formatted, timestamp: now });
      return res.json({ status: "success", data: formatted });
    }
    
    // Fetch all employees and strictly enforce company universe (GTS only for GTS, TBP only for TBP)
    const allEmployees = await db.select().from(employees);
    const subordinates = allEmployees.filter(e => {
      const eIsGts = isGtsEmployee(e);
      if (isUserGts && !eIsGts) return false; // Karyawan GTS hanya bisa akses data GTS
      if (!isUserGts && eIsGts) return false; // Karyawan TBP hanya bisa akses data TBP

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
    
    const formatted = subordinates.map(e => attachAttendanceToEmployee(e, attMap, counselMap));
    cachedHierarchy.set(nik, { data: formatted, timestamp: now });
    res.json({ status: "success", data: formatted });
  } catch (error) {
    console.error("Error fetching hierarchy:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch hierarchy" });
  }
});

employeesRouter.get("/:nik", async (req, res) => {
  try {
    const { nik } = req.params;
    const viewerNik = (req.headers['x-user-nik'] || req.query.viewerNik || '').toString().trim().toUpperCase();

    const data = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    if (data.length === 0) {
      return res.status(404).json({ status: "error", message: "Karyawan tidak ditemukan" });
    }

    const targetEmp = data[0];
    const targetIsGts = isGtsEmployee(targetEmp);

    // Cross-company access validation:
    // Akun GTS hanya bisa diakses karyawan GTS dan Section Manager TBP.
    // Akun TBP hanya bisa diakses karyawan TBP dan Section Manager GTS.
    if (viewerNik && viewerNik !== nik.toUpperCase()) {
      const viewerResult = await db.select().from(employees).where(eq(employees.nik, viewerNik)).limit(1);
      if (viewerResult.length > 0) {
        const viewer = viewerResult[0];
        const viewerIsMgr = isSectionManagerOrAdmin(viewer);
        const viewerIsGts = isGtsEmployee(viewer);

        if (!viewerIsMgr) {
          if (targetIsGts && !viewerIsGts) {
            return res.status(403).json({ 
              status: "error", 
              message: "Akses ditolak: Akun GTS hanya dapat diakses oleh karyawan GTS atau Section Manager TBP." 
            });
          }
          if (!targetIsGts && viewerIsGts) {
            return res.status(403).json({ 
              status: "error", 
              message: "Akses ditolak: Akun TBP hanya dapat diakses oleh karyawan TBP atau Section Manager GTS." 
            });
          }
        }
      }
    }

    const attMap = await getAttendanceMap();
    const counselMap = await getCounselingMap();
    res.json({ status: "success", employee: attachAttendanceToEmployee(targetEmp, attMap, counselMap) });
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

function parseCount(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = parseInt(String(val).trim(), 10);
  if (!isNaN(num)) return num;
  // If multiline date list, count non-empty lines
  const lines = String(val).split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  return lines.length;
}

employeesRouter.post("/import", async (req, res) => {
  try {
    const { rows, attendanceRows, counselingRows, editorNik } = req.body;
    const requesterNik = editorNik || req.headers['x-user-nik'] || req.body?.requesterNik;
    const isAuth = await isAuthorizedDatabaseEditor(String(requesterNik || ''));
    if (!isAuth) {
      return res.status(403).json({ 
        status: "error", 
        message: "Akses ditolak: Pengupdate-an database karyawan hanya bisa dilakukan oleh section Administration atau Developer." 
      });
    }

    const hasRows = Array.isArray(rows) && rows.length > 0;
    const hasAttRows = Array.isArray(attendanceRows) && attendanceRows.length > 0;
    const hasCounselRows = Array.isArray(counselingRows) && counselingRows.length > 0;

    if (!hasRows && !hasAttRows && !hasCounselRows) {
      return res.status(400).json({ status: "error", message: "Tidak ada data baris yang dikirim untuk diimport." });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let attUpdatedCount = 0;
    let counselUpdatedCount = 0;
    const errors: string[] = [];

    // 1. Process Master Employee Rows (Sheet 1)
    if (hasRows) {
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
    }

    // 2. Process Attendance Rows (Sheet 2: "Absensi karyawan")
    if (hasAttRows) {
      // Fetch all employees to build normalized name-to-NIK index
      const allCurrentEmployees = await db.select().from(employees);
      const nameToEmpMap = new Map<string, any>();
      const nikToEmpMap = new Map<string, any>();

      for (const emp of allCurrentEmployees) {
        if (emp.nik) nikToEmpMap.set(emp.nik.toUpperCase().trim(), emp);
        if (emp.name) {
          const normKey = normalizeNameKey(emp.name);
          if (normKey) nameToEmpMap.set(normKey, emp);
        }
      }

      for (let j = 0; j < attendanceRows.length; j++) {
        const attRaw = attendanceRows[j];
        if (!attRaw || typeof attRaw !== 'object') continue;

        // Clean & normalize attendance row keys
        const attNorm: Record<string, string> = {};
        for (const [k, v] of Object.entries(attRaw)) {
          const cleanK = String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanK) {
            attNorm[cleanK] = v !== undefined && v !== null ? String(v).trim() : '';
          }
        }

        const rawName = attRaw['Employee Name'] || attRaw['Nama'] || attNorm['employeename'] || attNorm['nama'] || attNorm['name'] || attNorm['namakaryawan'] || '';
        const rawNik = attRaw['NIK'] || attNorm['nik'] || '';

        // Match with employee
        let matchedEmp = rawNik ? nikToEmpMap.get(rawNik.toUpperCase().trim()) : null;
        if (!matchedEmp && rawName) {
          const normN = normalizeNameKey(rawName);
          matchedEmp = nameToEmpMap.get(normN);
          if (!matchedEmp) {
            // Partial inclusion search
            for (const [key, emp] of nameToEmpMap.entries()) {
              if (key && normN && (key.includes(normN) || normN.includes(key))) {
                matchedEmp = emp;
                break;
              }
            }
          }
          if (!matchedEmp) {
            // Word token match: if at least 2 words match
            const wordsN = rawName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
            for (const emp of allCurrentEmployees) {
              const empWords = (emp.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
              const matches = wordsN.filter(w => empWords.includes(w));
              if (matches.length >= 2 || (wordsN.length === 1 && matches.length === 1)) {
                matchedEmp = emp;
                break;
              }
            }
          }
        }

        if (!matchedEmp) {
          continue;
        }

        const targetNik = matchedEmp.nik;
        const targetName = matchedEmp.name || rawName;

        const izin = parseCount(attRaw['Izin'] ?? attNorm['izin']);
        const izinKhusus = parseCount(attRaw['Izin Khusus'] ?? attNorm['izinkhusus']);
        const sakit = parseCount(attRaw['Sakit'] ?? attNorm['sakit']);
        const alpa = parseCount(attRaw['Alpa'] ?? attNorm['alpa']);

        const tanggalIzin = String(
          attRaw['Tanggal Izin'] ?? 
          attRaw['TanggalIzin'] ?? 
          attNorm['tanggalizin'] ?? 
          attNorm['tglizin'] ?? 
          ''
        ).trim();

        const tanggalIzinKhusus = String(
          attRaw['Izin Khusus (Tanggal)'] ?? 
          attRaw['Tanggal Izin Khusus'] ?? 
          attNorm['izinkhusustanggal'] ?? 
          attNorm['tanggalizinkhusus'] ?? 
          attNorm['izinkhususdates'] ?? 
          ''
        ).trim();

        const tanggalSakitSite = String(
          attRaw['Sakit Site (SS)'] ?? 
          attRaw['Tanggal Sakit Site'] ?? 
          attRaw['Sakit Site'] ?? 
          attNorm['sakitsitess'] ?? 
          attNorm['sakitsite'] ?? 
          attNorm['tanggalsakitsite'] ?? 
          ''
        ).trim();

        const tanggalSakitLuar = String(
          attRaw['Sakit Luar (SL)'] ?? 
          attRaw['Tanggal Sakit Luar'] ?? 
          attRaw['Sakit Luar'] ?? 
          attNorm['sakitluarsl'] ?? 
          attNorm['sakitluar'] ?? 
          attNorm['tanggalsakitluar'] ?? 
          ''
        ).trim();

        const rawTanggalAlpa = String(
          attRaw['Alpa (Tanggal)'] ?? 
          attRaw['Tanggal Alpa'] ?? 
          attRaw['Tanggal Alpha'] ?? 
          attRaw['Alpha (Tanggal)'] ?? 
          attRaw['Tgl Alpa'] ?? 
          attRaw['Tgl Alpha'] ?? 
          attNorm['alpatanggal'] ?? 
          attNorm['tanggalalpa'] ?? 
          attNorm['alphatanggal'] ?? 
          attNorm['tanggalalpha'] ?? 
          attNorm['tglalpa'] ?? 
          attNorm['tglalpha'] ?? 
          ''
        ).trim();

        const rawAlpaVal = String(attRaw['Alpa'] ?? attRaw['Alpha'] ?? attNorm['alpa'] ?? attNorm['alpha'] ?? '').trim();
        const tanggalAlpa = rawTanggalAlpa || (rawAlpaVal && (rawAlpaVal.includes('-') || rawAlpaVal.includes('/') || rawAlpaVal.includes('\n') || /[a-z]/i.test(rawAlpaVal)) ? rawAlpaVal : '');

        const alasanIzin = String(
          attRaw['Alasan Izin'] ?? 
          attRaw['Alasan'] ?? 
          attNorm['alasanizin'] ?? 
          attNorm['alasan'] ?? 
          ''
        ).trim();

        const alasanIzinKhusus = String(
          attRaw['Alasan Izin Khusus'] ?? 
          attRaw['AlasanIzinKhusus'] ?? 
          attNorm['alasanizinkhusus'] ?? 
          ''
        ).trim();

        const alasanSakitSite = String(
          attRaw['Alasan Sakit Site (SS)'] ?? 
          attRaw['Alasan Sakit Site'] ?? 
          attRaw['AlasanSakitSite'] ?? 
          attNorm['alasansakitsitess'] ?? 
          attNorm['alasansakitsite'] ?? 
          ''
        ).trim();

        const alasanSakitLuar = String(
          attRaw['Alasan Sakit Luar (SL)'] ?? 
          attRaw['Alasan Sakit Luar'] ?? 
          attRaw['AlasanSakitLuar'] ?? 
          attNorm['alasansakitluarsl'] ?? 
          attNorm['alasansakitluar'] ?? 
          ''
        ).trim();

        const alasanSakit = String(
          attRaw['Alasan Sakit'] ?? 
          attNorm['alasansakit'] ?? 
          ''
        ).trim() || alasanSakitSite || alasanSakitLuar || (alasanIzin ? alasanIzin : '');

        const sakitSiteCount = parseCount(tanggalSakitSite);
        const sakitLuarCount = parseCount(tanggalSakitLuar);

        const year = 2026;

        const attRecord = {
          nik: targetNik,
          name: targetName,
          year,
          izin,
          izinKhusus,
          sakit: sakit || (sakitSiteCount + sakitLuarCount),
          sakitSiteCount,
          sakitLuarCount,
          alpa,
          tanggalIzin,
          tanggalIzinKhusus,
          tanggalSakitSite,
          tanggalSakitLuar,
          tanggalAlpa,
          alasanIzin,
          alasanIzinKhusus,
          alasanSakitSite,
          alasanSakitLuar,
          alasanSakit,
          updatedAt: new Date()
        };

        try {
          // Upsert into employee_attendance table
          const existingAtt = await db.select().from(employeeAttendance)
            .where(sql`${employeeAttendance.nik} = ${targetNik} AND ${employeeAttendance.year} = ${year}`)
            .limit(1);

          if (existingAtt.length > 0) {
            await db.update(employeeAttendance).set(attRecord)
              .where(sql`${employeeAttendance.nik} = ${targetNik} AND ${employeeAttendance.year} = ${year}`);
          } else {
            await db.insert(employeeAttendance).values(attRecord);
          }

          // Cache onto employees.attendance_data
          const currentAttData = matchedEmp.attendanceData || {};
          const updatedAttData = {
            ...currentAttData,
            [year]: {
              izin,
              izinKhusus,
              sakit: attRecord.sakit,
              sakitSite: sakitSiteCount,
              sakitLuar: sakitLuarCount,
              alpa,
              tanggalIzin,
              tanggalIzinKhusus,
              tanggalSakitSite,
              tanggalSakitLuar,
              tanggalAlpa,
              alasanIzin,
              alasanIzinKhusus,
              alasanSakitSite,
              alasanSakitLuar,
              alasanSakit
            }
          };

          await db.update(employees)
            .set({ attendanceData: updatedAttData })
            .where(eq(employees.nik, targetNik));

          attUpdatedCount++;
        } catch (attErr: any) {
          console.warn(`Error updating attendance for ${targetNik}:`, attErr.message);
        }
      }
    }

    // 3. Process Counseling & SPDK Rows (Sheet 3: "Konseling & SPDK")
    if (hasCounselRows) {
      const allCurrentEmployees = await db.select().from(employees);
      const nameToEmpMap = new Map<string, any>();
      const nikToEmpMap = new Map<string, any>();

      for (const emp of allCurrentEmployees) {
        if (emp.nik) nikToEmpMap.set(emp.nik.toUpperCase().trim(), emp);
        if (emp.name) {
          const normKey = normalizeNameKey(emp.name);
          if (normKey) nameToEmpMap.set(normKey, emp);
        }
      }

      for (let k = 0; k < counselingRows.length; k++) {
        const cRaw = counselingRows[k];
        if (!cRaw || typeof cRaw !== 'object') continue;

        // Clean & normalize counseling row keys
        const cNorm: Record<string, string> = {};
        for (const [key, v] of Object.entries(cRaw)) {
          const cleanK = String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanK) {
            cNorm[cleanK] = v !== undefined && v !== null ? String(v).trim() : '';
          }
        }

        const rawName = cRaw['Nama Karyawan'] || cRaw['Nama'] || cRaw['Name'] || cRaw['Employee Name'] || cNorm['namakaryawan'] || cNorm['nama'] || cNorm['name'] || cNorm['employeename'] || '';
        const rawNik = cRaw['NIK'] || cRaw['nik'] || cNorm['nik'] || cNorm['id'] || cNorm['noid'] || '';

        // Match with employee
        let matchedEmp = rawNik ? nikToEmpMap.get(rawNik.toUpperCase().trim()) : null;
        if (!matchedEmp && rawName) {
          const normN = normalizeNameKey(rawName);
          matchedEmp = nameToEmpMap.get(normN);
          if (!matchedEmp) {
            for (const [key, emp] of nameToEmpMap.entries()) {
              if (key && normN && (key.includes(normN) || normN.includes(key))) {
                matchedEmp = emp;
                break;
              }
            }
          }
        }

        const targetNik = matchedEmp ? matchedEmp.nik : (rawNik || `TEMP-${Date.now()}-${k}`);
        const targetName = matchedEmp ? matchedEmp.name : (rawName || 'Karyawan');
        const jabatan = cRaw['Jabatan'] || cRaw['Posisi'] || cNorm['jabatan'] || cNorm['posisi'] || cNorm['jabatanbaru'] || matchedEmp?.jabatan || '';
        const pt = cRaw['PT'] || cRaw['Perusahaan'] || cNorm['pt'] || cNorm['perusahaan'] || matchedEmp?.pt || '';
        const totalSp = String(cRaw['Total SP'] ?? cRaw['Total Sanksi'] ?? cNorm['totalsp'] ?? cNorm['totalsanksi'] ?? cNorm['total'] ?? '').trim();
        const bulanKonseling = String(cRaw['Bulan Konseling'] ?? cRaw['Bulan Sanksi'] ?? cRaw['Bulan'] ?? cNorm['bulankonseling'] ?? cNorm['bulansanksi'] ?? cNorm['bulan'] ?? cNorm['periode'] ?? '').trim();
        // Per-level Dates
        const tglK1 = String(cRaw['Tanggal Konseling 1'] ?? cRaw['Tanggal Konseling I'] ?? cNorm['tanggalkonseling1'] ?? cNorm['tanggalkonselingi'] ?? '').trim();
        const tglK2 = String(cRaw['Tanggal Konseling 2'] ?? cRaw['Tanggal Konseling II'] ?? cNorm['tanggalkonseling2'] ?? cNorm['tanggalkonselingii'] ?? '').trim();
        const tglK3 = String(cRaw['Tanggal Konseling 3'] ?? cRaw['Tanggal Konseling III'] ?? cNorm['tanggalkonseling3'] ?? cNorm['tanggalkonselingiii'] ?? '').trim();
        const tglSt = String(cRaw['Tanggal Surat Teguran'] ?? cRaw['Tanggal ST'] ?? cNorm['tanggalsuratteguran'] ?? cNorm['tanggalst'] ?? '').trim();
        const tglSp1 = String(cRaw['Tanggal SP 1'] ?? cRaw['Tanggal SP I'] ?? cNorm['tanggalsp1'] ?? cNorm['tanggalspi'] ?? '').trim();
        const tglSp2 = String(cRaw['Tanggal SP 2'] ?? cRaw['Tanggal SP II'] ?? cNorm['tanggalsp2'] ?? cNorm['tanggalspii'] ?? '').trim();
        const tglSp3 = String(cRaw['Tanggal SP 3'] ?? cRaw['Tanggal SP III'] ?? cNorm['tanggalsp3'] ?? cNorm['tanggalspiii'] ?? '').trim();
        const tglSppt = String(cRaw['Tanggal SPPT'] ?? cRaw['Tanggal SP Pertama dan Terakhir'] ?? cNorm['tanggalsppt'] ?? cNorm['tanggalsppertamadanterakhir'] ?? '').trim();

        // Flags or raw dates
        const rawK1 = String(cRaw['Konseling I'] ?? cRaw['Konseling 1'] ?? cNorm['konselingi'] ?? cNorm['konseling1'] ?? cNorm['konselingpertama'] ?? '').trim();
        const rawK2 = String(cRaw['Konseling II'] ?? cRaw['Konseling 2'] ?? cNorm['konselingii'] ?? cNorm['konseling2'] ?? cNorm['konselingkedua'] ?? '').trim();
        const rawK3 = String(cRaw['Konseling III'] ?? cRaw['Konseling 3'] ?? cNorm['konselingiii'] ?? cNorm['konseling3'] ?? cNorm['konselingketiga'] ?? '').trim();
        const rawSt = String(cRaw['ST'] ?? cRaw['Surat Teguran'] ?? cNorm['st'] ?? cNorm['suratteguran'] ?? cNorm['teguran'] ?? '').trim();
        const rawSp1 = String(cRaw['SP I'] ?? cRaw['SP 1'] ?? cRaw['SP-1'] ?? cNorm['spi'] ?? cNorm['sp1'] ?? cNorm['suratperingatan1'] ?? cNorm['suratperingatani'] ?? '').trim();
        const rawSp2 = String(cRaw['SP II'] ?? cRaw['SP 2'] ?? cRaw['SP-2'] ?? cNorm['spii'] ?? cNorm['sp2'] ?? cNorm['suratperingatan2'] ?? cNorm['suratperingatanii'] ?? '').trim();
        const rawSp3 = String(cRaw['SP III'] ?? cRaw['SP 3'] ?? cRaw['SP-3'] ?? cNorm['spiii'] ?? cNorm['sp3'] ?? cNorm['suratperingatan3'] ?? cNorm['suratperingataniii'] ?? '').trim();
        const rawSppt = String(cRaw['SPPT'] ?? cRaw['SP Pertama dan Terakhir'] ?? cRaw['SPPT (SP 3)'] ?? cNorm['sppt'] ?? cNorm['sppertamadanterakhir'] ?? cNorm['sp1sppt'] ?? cNorm['spterakhir'] ?? '').trim();

        const konseling1 = tglK1 || (rawK1 !== '0' ? rawK1 : '');
        const konseling2 = tglK2 || (rawK2 !== '0' ? rawK2 : '');
        const konseling3 = tglK3 || (rawK3 !== '0' ? rawK3 : '');
        const st = tglSt || (rawSt !== '0' ? rawSt : '');
        const sp1 = tglSp1 || (rawSp1 !== '0' ? rawSp1 : '');
        const sp2 = tglSp2 || (rawSp2 !== '0' ? rawSp2 : '');
        const sp3 = tglSp3 || (rawSp3 !== '0' ? rawSp3 : '');
        const sppt = tglSppt || (rawSppt !== '0' ? rawSppt : '');

        const tanggalSp = [tglSppt, tglSp3, tglSp2, tglSp1, tglSt].filter(Boolean).join('; ') || String(cRaw['Tanggal SP'] ?? cRaw['Tanggal Surat Peringatan'] ?? cNorm['tanggalsp'] ?? cNorm['tglsp'] ?? cNorm['tanggalperingatan'] ?? cNorm['tglperingatan'] ?? '').trim();
        const phk = String(cRaw['PHK'] ?? cNorm['phk'] ?? '').trim();
        
        const rawMasaBerlaku = cRaw['Masa Berlaku Sanksi'] ?? cRaw['Masa Berlaku'] ?? cRaw['Periode Berlaku'] ?? cNorm['masaberlakusanksi'] ?? cNorm['masaberlaku'] ?? cNorm['periodeberlaku'] ?? cNorm['tglberlaku'] ?? cNorm['tanggalberlaku'] ?? '';
        const masaBerlakuSanksi = cleanDateVal(rawMasaBerlaku) || String(rawMasaBerlaku).trim();
        
        const rawMasaPemulihan1 = cRaw['Masa Pemulihan I'] ?? cRaw['Masa Pemulihan 1'] ?? cNorm['masapemulihani'] ?? cNorm['masapemulihan1'] ?? cNorm['pemulihani'] ?? cNorm['pemulihan1'] ?? cNorm['masapemulihantahap1'] ?? '';
        const masaPemulihan1 = cleanDateVal(rawMasaPemulihan1) || String(rawMasaPemulihan1).trim();
        
        const rawMasaPemulihan2 = cRaw['Masa Pemulihan II'] ?? cRaw['Masa Pemulihan 2'] ?? cNorm['masapemulihanii'] ?? cNorm['masapemulihan2'] ?? cNorm['pemulihanii'] ?? cNorm['pemulihan2'] ?? cNorm['masapemulihantahap2'] ?? '';
        const masaPemulihan2 = cleanDateVal(rawMasaPemulihan2) || String(rawMasaPemulihan2).trim();
        
        // Multi-level reasons
        const ak1 = String(cRaw['Alasan Konseling 1'] ?? cRaw['Alasan Konseling I'] ?? cNorm['alasankonseling1'] ?? cNorm['alasankonselingi'] ?? '').trim();
        const ak2 = String(cRaw['Alasan Konseling 2'] ?? cRaw['Alasan Konseling II'] ?? cNorm['alasankonseling2'] ?? cNorm['alasankonselingii'] ?? '').trim();
        const ak3 = String(cRaw['Alasan Konseling 3'] ?? cRaw['Alasan Konseling III'] ?? cNorm['alasankonseling3'] ?? cNorm['alasankonselingiii'] ?? '').trim();
        const akCombined = [ak1, ak2, ak3].filter(Boolean).join('\n');

        const alasanKonseling = akCombined || String(
          cRaw['Alasan Konseling'] ?? 
          cRaw['Alasan Pembinaan'] ?? 
          cRaw['Topik Konseling'] ?? 
          cRaw['Catatan Konseling'] ?? 
          cRaw['Konseling Alasan'] ?? 
          cNorm['alasankonseling'] ?? 
          cNorm['alasankonselingpembinaan'] ?? 
          cNorm['alasanpembinaan'] ?? 
          cNorm['topikkonseling'] ?? 
          cNorm['catatankonseling'] ?? 
          cNorm['konselingalasan'] ?? 
          ''
        ).trim();

        const ast = String(cRaw['Alasan Surat Teguran'] ?? cRaw['Alasan ST'] ?? cNorm['alasansuratteguran'] ?? cNorm['alasanst'] ?? '').trim();
        const asp1 = String(cRaw['Alasan SP 1'] ?? cRaw['Alasan SP I'] ?? cNorm['alasansp1'] ?? cNorm['alasanspi'] ?? '').trim();
        const asp2 = String(cRaw['Alasan SP 2'] ?? cRaw['Alasan SP II'] ?? cNorm['alasansp2'] ?? cNorm['alasanspii'] ?? '').trim();
        const asp3 = String(cRaw['Alasan SP 3'] ?? cRaw['Alasan SP III'] ?? cNorm['alasansp3'] ?? cNorm['alasanspiii'] ?? '').trim();
        const asppt = String(cRaw['Alasan SPPT'] ?? cRaw['Alasan SP Pertama dan Terakhir'] ?? cNorm['alasansppt'] ?? cNorm['alasansppertamadanterakhir'] ?? '').trim();
        const aspCombined = [ast, asp1, asp2, asp3, asppt].filter(Boolean).join('\n');

        const alasanSp = aspCombined || String(
          cRaw['Alasan Surat Peringatan'] ?? 
          cRaw['Alasan SP'] ?? 
          cRaw['Alasan SPDK'] ?? 
          cRaw['Alasan Sanksi SPDK'] ?? 
          cRaw['Alasan Sanksi'] ?? 
          cRaw['Alasan Pelanggaran'] ?? 
          cRaw['Alasan ST'] ?? 
          cRaw['Alasan Surat Teguran'] ?? 
          cRaw['Pelanggaran'] ?? 
          cRaw['Kasus'] ?? 
          cRaw['Uraian Pelanggaran'] ?? 
          cRaw['Uraian Masalah'] ?? 
          cRaw['Deskripsi Masalah'] ?? 
          cRaw['Alasan Sanksi Disiplin'] ?? 
          cRaw['Alasan'] ?? 
          cNorm['alasansuratperingatan'] ?? 
          cNorm['alasansp'] ?? 
          cNorm['alasanspdk'] ?? 
          cNorm['alasansanksispdk'] ?? 
          cNorm['alasansanksi'] ?? 
          cNorm['alasanpelanggaran'] ?? 
          cNorm['alasanst'] ?? 
          cNorm['alasansuratteguran'] ?? 
          cNorm['alasansp1'] ?? 
          cNorm['alasansp2'] ?? 
          cNorm['alasansp3'] ?? 
          cNorm['alasansppt'] ?? 
          cNorm['pelanggaran'] ?? 
          cNorm['kasus'] ?? 
          cNorm['uraianpelanggaran'] ?? 
          cNorm['uraianmasalah'] ?? 
          cNorm['deskripsimasalah'] ?? 
          cNorm['alasansanksidisiplin'] ?? 
          cNorm['alasan'] ?? 
          cNorm['alasanperingatan'] ?? 
          ''
        ).trim();

        const keterangan = String(cRaw['Keterangan SP'] ?? cRaw['Keterangan'] ?? cRaw['Catatan'] ?? cNorm['keterangansp'] ?? cNorm['keterangan'] ?? cNorm['catatan'] ?? '').trim();
        const pernahSpSebelumnya = String(cRaw['Pernah SP/ST Sebelumnya'] ?? cRaw['Pernah SP/ST'] ?? cRaw['Pernah SP'] ?? cNorm['pernahspstsebelumnya'] ?? cNorm['pernahspsebelumnya'] ?? cNorm['pernahspst'] ?? cNorm['pernahsp'] ?? cNorm['spsebelumnya'] ?? cNorm['riwayatsp'] ?? '').trim();
        let pernahTerlibatSpdk = String(cRaw['Pernah Terlibat SPDK'] ?? cRaw['Terlibat SPDK'] ?? cRaw['SPDK'] ?? cNorm['pernahterlibatspdk'] ?? cNorm['terlibatspdk'] ?? cNorm['spdk'] ?? cNorm['statusspdk'] ?? '').trim();
        let kronologiSpdk = String(cRaw['Kronologi Kejadian SPDK'] ?? cRaw['Kronologi Kejadian'] ?? cRaw['Kronologi SPDK'] ?? cRaw['Kronologi'] ?? cNorm['kronologikejadianspdk'] ?? cNorm['kronologikejadian'] ?? cNorm['kronologispdk'] ?? cNorm['kronologi'] ?? cNorm['riwayatkejadian'] ?? '').trim();
        let kategoriSpdk = String(cRaw['Kategori Sanksi SPDK'] ?? cRaw['Kategori SPDK'] ?? cRaw['Kategori Sanksi'] ?? cRaw['Kategori Pelanggaran'] ?? cNorm['kategorisanksispdk'] ?? cNorm['kategorispdk'] ?? cNorm['kategorisanksi'] ?? cNorm['kategoripelanggaran'] ?? cNorm['jenispelanggaran'] ?? '').trim();
        let tindakanSpdk = String(cRaw['Tindakan Disiplin SPDK'] ?? cRaw['Tindakan Disiplin'] ?? cRaw['Tindakan SPDK'] ?? cRaw['Sanksi SPDK'] ?? cNorm['tindakandisiplinspdk'] ?? cNorm['tindakandisiplin'] ?? cNorm['tindakanspdk'] ?? cNorm['sanksispdk'] ?? cNorm['tindakan'] ?? '').trim();

        // Check if employee has active SP (SP 1, 2, 3, SPPT, ST) -> Kesimpulan: Masuk Kategori SPDK
        const hasActiveSp = Boolean(
          (sp1 && sp1 !== '-' && sp1 !== '0') || 
          (sp2 && sp2 !== '-' && sp2 !== '0') || 
          (sp3 && sp3 !== '-' && sp3 !== '0') || 
          (sppt && sppt !== '-' && sppt !== '0') || 
          (st && st !== '-' && st !== '0') ||
          (phk && phk !== '-' && phk !== '0') ||
          (totalSp && totalSp !== '0' && totalSp !== '-')
        );

        if (hasActiveSp) {
          pernahTerlibatSpdk = 'Ya';
          if (!kategoriSpdk || kategoriSpdk === '-' || kategoriSpdk.toLowerCase() === 'tidak ada') {
            if (sppt && sppt !== '-' && sppt !== '0') kategoriSpdk = 'Pelanggaran Disiplin Berat (SPPT - Pertama & Terakhir)';
            else if (sp3 && sp3 !== '-' && sp3 !== '0') kategoriSpdk = 'Pelanggaran Disiplin Berat (SP III)';
            else if (sp2 && sp2 !== '-' && sp2 !== '0') kategoriSpdk = 'Pelanggaran Disiplin Sedang (SP II)';
            else if (sp1 && sp1 !== '-' && sp1 !== '0') kategoriSpdk = 'Pelanggaran Disiplin Kerja (SP I)';
            else if (st && st !== '-' && st !== '0') kategoriSpdk = 'Pelanggaran Tata Tertib (Surat Teguran / ST)';
            else if (phk && phk !== '-' && phk !== '0') kategoriSpdk = 'Pemutusan Hubungan Kerja (PHK)';
          }
          if (!tindakanSpdk || tindakanSpdk === '-') {
            if (sppt && sppt !== '-' && sppt !== '0') tindakanSpdk = 'Penerbitan SPPT & Evaluasi Kerja';
            else if (sp3 && sp3 !== '-' && sp3 !== '0') tindakanSpdk = 'Penerbitan SP III & Evaluasi Status';
            else if (sp2 && sp2 !== '-' && sp2 !== '0') tindakanSpdk = 'Penerbitan SP II & Evaluasi Kedisiplinan';
            else if (sp1 && sp1 !== '-' && sp1 !== '0') tindakanSpdk = 'Penerbitan SP I & Pembinaan Kedisiplinan';
            else if (st && st !== '-' && st !== '0') tindakanSpdk = 'Pemberian Surat Teguran (ST) Tertulis';
            else if (phk && phk !== '-' && phk !== '0') tindakanSpdk = 'Terminasi Hubungan Kerja (PHK)';
          }
          // Kronologi SPDK HANYA diisi dari Alasan SPDK / SP / Pelanggaran (TIDAK boleh dari Alasan Konseling)
          if (!kronologiSpdk && alasanSp) {
            kronologiSpdk = alasanSp;
          }
        }

        // Calculate status sanksi
        let statusSanksi = 'Aman';
        if (phk && phk !== '-' && phk !== '0') statusSanksi = 'PHK';
        else if (sppt && sppt !== '-' && sppt !== '0') statusSanksi = 'SPPT';
        else if (sp3 && sp3 !== '-' && sp3 !== '0') statusSanksi = 'SP III';
        else if (sp2 && sp2 !== '-' && sp2 !== '0') statusSanksi = 'SP II';
        else if (sp1 && sp1 !== '-' && sp1 !== '0') statusSanksi = 'SP I';
        else if (st && st !== '-' && st !== '0') statusSanksi = 'Surat Teguran (ST)';
        else if (konseling3 && konseling3 !== '-' && konseling3 !== '0') statusSanksi = 'Konseling III';
        else if (konseling2 && konseling2 !== '-' && konseling2 !== '0') statusSanksi = 'Konseling II';
        else if (konseling1 && konseling1 !== '-' && konseling1 !== '0') statusSanksi = 'Konseling I';
        else if (pernahTerlibatSpdk.toLowerCase().includes('ya') || kronologiSpdk.length > 5) statusSanksi = 'SPDK';

        const counselRecord = {
          nik: targetNik,
          name: targetName,
          jabatan,
          pt,
          totalSp,
          bulanKonseling,
          konseling1,
          konseling2,
          konseling3,
          st,
          sp1,
          sp2,
          sp3,
          sppt,
          tanggalSp,
          phk,
          masaBerlakuSanksi,
          masaPemulihan1,
          masaPemulihan2,
          alasanKonseling,
          alasanSp,
          keterangan,
          pernahSpSebelumnya,
          pernahTerlibatSpdk,
          kronologiSpdk,
          kategoriSpdk,
          tindakanSpdk,
          statusSanksi,
          updatedAt: new Date()
        };

        try {
          const existing = await db.select().from(employeeCounseling).where(eq(employeeCounseling.nik, targetNik)).limit(1);
          if (existing.length > 0) {
            await db.update(employeeCounseling).set(counselRecord).where(eq(employeeCounseling.nik, targetNik));
          } else {
            await db.insert(employeeCounseling).values(counselRecord);
          }
          counselUpdatedCount++;
        } catch (cErr: any) {
          console.warn(`Error updating counseling for ${targetNik}:`, cErr.message);
        }
      }
    }

    res.json({
      status: "success",
      message: `Import berhasil selesai! ${updatedCount} data master diperbarui, ${insertedCount} ditambahkan, ${attUpdatedCount} absensi & ${counselUpdatedCount} data konseling/SPDK disinkronkan.`,
      stats: {
        total: (rows?.length || 0) + (attendanceRows?.length || 0) + (counselingRows?.length || 0),
        updated: updatedCount,
        inserted: insertedCount,
        attendanceUpdated: attUpdatedCount,
        counselingUpdated: counselUpdatedCount,
        errors: errorCount,
        errorList: errors.slice(0, 10)
      }
    });
  } catch (error: any) {
    console.error("Error importing employees:", error);
    res.status(500).json({ status: "error", message: error.message || "Gagal mengimport data karyawan." });
  } finally {
    clearEmployeeCache();
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

    clearEmployeeCache();
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

    clearEmployeeCache();
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

employeesRouter.put("/:nik", async (req, res) => {
  try {
    const { nik } = req.params;
    const requesterNik = req.body?.editorNik || req.headers['x-user-nik'];
    const isAuth = await isAuthorizedDatabaseEditor(String(requesterNik || ''));
    if (!isAuth) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak: Pengeditan data karyawan hanya dapat dilakukan oleh section Administration atau Developer."
      });
    }

    if (!nik) {
      return res.status(400).json({ status: "error", message: "NIK karyawan wajib diisi." });
    }

    const currentEmp = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    if (currentEmp.length === 0) {
      return res.status(404).json({ status: "error", message: "Karyawan tidak ditemukan." });
    }

    const body = req.body || {};
    const empUpdate: Record<string, any> = {};

    const stringFields = [
      'name', 'ktp', 'pt', 'poh', 'sponsor', 'statusKaryawan', 'statusKontrak',
      'tanggalEfektifTidakBekerja', 'tanggalAwalBergabung', 'tanggalJabatanBaru',
      'masaKerja', 'masaKerjaJabatanTerakhir', 'department', 'section',
      'jobGrade', 'gol', 'jabatan', 'tanggalPermanent', 'tempatLahir',
      'tanggalLahir', 'phone', 'keluargaKandung', 'phoneKeluarga',
      'orangTerdekat', 'phoneDarurat', 'alamatKtp', 'alamatDomisili',
      'sisaCt', 'jatuhTempoCt', 'photo'
    ];

    for (const f of stringFields) {
      if (body[f] !== undefined) {
        empUpdate[f] = body[f] === '' ? null : body[f];
      }
    }

    // Process Attendance Updates if provided
    const att26 = body.attendance2026 || body.attendance?.['2026'] || body.attendance?.[2026];
    if (att26 && typeof att26 === 'object') {
      const year = 2026;
      const cleanDateOrReason = (v: any) => v !== undefined && v !== null ? String(v).trim() : '';

      const tglIzin = cleanDateOrReason(att26.tanggalIzin);
      const tglIzinKhusus = cleanDateOrReason(att26.tanggalIzinKhusus);
      const tglSakitSite = cleanDateOrReason(att26.tanggalSakitSite);
      const tglSakitLuar = cleanDateOrReason(att26.tanggalSakitLuar);
      const tglAlpa = cleanDateOrReason(att26.tanggalAlpa);

      const alasanIzin = cleanDateOrReason(att26.alasanIzin);
      const alasanIzinKhusus = cleanDateOrReason(att26.alasanIzinKhusus);
      const alasanSakitSite = cleanDateOrReason(att26.alasanSakitSite);
      const alasanSakitLuar = cleanDateOrReason(att26.alasanSakitLuar);
      const alasanSakit = cleanDateOrReason(att26.alasanSakit) || alasanSakitSite || alasanSakitLuar;

      const countFromLines = (val: string, fallbackNum?: any) => {
        if (fallbackNum !== undefined && fallbackNum !== null && fallbackNum !== '' && !isNaN(Number(fallbackNum))) {
          return Number(fallbackNum);
        }
        if (!val) return 0;
        return val.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean).length;
      };

      const ssCount = countFromLines(tglSakitSite, att26.sakitSite);
      const slCount = countFromLines(tglSakitLuar, att26.sakitLuar);
      const izinCount = countFromLines(tglIzin, att26.izin);
      const izinKhususCount = countFromLines(tglIzinKhusus, att26.izinKhusus);
      const alpaCount = countFromLines(tglAlpa, att26.alpa);
      const sakitCount = (att26.sakit !== undefined && att26.sakit !== null && att26.sakit !== '')
        ? Number(att26.sakit)
        : (ssCount + slCount);

      const attRecord = {
        nik,
        name: body.name || currentEmp[0].name || '',
        year,
        izin: izinCount,
        izinKhusus: izinKhususCount,
        sakit: sakitCount,
        sakitSiteCount: ssCount,
        sakitLuarCount: slCount,
        alpa: alpaCount,
        tanggalIzin: tglIzin,
        tanggalIzinKhusus: tglIzinKhusus,
        tanggalSakitSite: tglSakitSite,
        tanggalSakitLuar: tglSakitLuar,
        tanggalAlpa: tglAlpa,
        alasanIzin,
        alasanIzinKhusus,
        alasanSakitSite,
        alasanSakitLuar,
        alasanSakit,
        updatedAt: new Date()
      };

      const existingAtt = await db.select().from(employeeAttendance)
        .where(sql`${employeeAttendance.nik} = ${nik} AND ${employeeAttendance.year} = ${year}`)
        .limit(1);

      if (existingAtt.length > 0) {
        await db.update(employeeAttendance).set(attRecord)
          .where(sql`${employeeAttendance.nik} = ${nik} AND ${employeeAttendance.year} = ${year}`);
      } else {
        await db.insert(employeeAttendance).values(attRecord);
      }

      // Also update cached attendanceData on employee
      const currentAttData = (currentEmp[0].attendanceData as Record<string, any>) || {};
      empUpdate.attendanceData = {
        ...currentAttData,
        [year]: {
          izin: izinCount,
          izinKhusus: izinKhususCount,
          sakit: sakitCount,
          sakitSite: ssCount,
          sakitLuar: slCount,
          alpa: alpaCount,
          tanggalIzin: tglIzin,
          tanggalIzinKhusus: tglIzinKhusus,
          tanggalSakitSite: tglSakitSite,
          tanggalSakitLuar: tglSakitLuar,
          tanggalAlpa: tglAlpa,
          alasanIzin,
          alasanIzinKhusus,
          alasanSakitSite,
          alasanSakitLuar,
          alasanSakit
        }
      };
    }

    // Process Counseling & SPDK Updates if provided
    const cData = body.counselingSpdk || body.counseling;
    if (cData && typeof cData === 'object') {
      const totalSp = String(cData.totalSp ?? cData.total_sp ?? '').trim();
      const bulanKonseling = String(cData.bulanKonseling ?? cData.bulan_konseling ?? cData.bulan ?? '').trim();
      const konseling1 = String(cData.konseling1 ?? cData.konseling_1 ?? '').trim();
      const konseling2 = String(cData.konseling2 ?? cData.konseling_2 ?? '').trim();
      const konseling3 = String(cData.konseling3 ?? cData.konseling_3 ?? '').trim();
      const st = String(cData.st ?? '').trim();
      const sp1 = String(cData.sp1 ?? cData.sp_1 ?? '').trim();
      const sp2 = String(cData.sp2 ?? cData.sp_2 ?? '').trim();
      const sp3 = String(cData.sp3 ?? cData.sp_3 ?? '').trim();
      const sppt = String(cData.sppt ?? cData.sp_pt ?? '').trim();
      const tanggalSp = String(cData.tanggalSp ?? cData.tanggal_sp ?? '').trim();
      const phk = String(cData.phk ?? '').trim();
      
      const rawMasaBerlaku = cData.masaBerlakuSanksi ?? cData.masa_berlaku_sanksi ?? cData.masaBerlaku ?? cData.masa_berlaku ?? cData.periodeBerlaku ?? cData.tanggalBerlaku ?? '';
      const masaBerlakuSanksi = (rawMasaBerlaku && typeof rawMasaBerlaku === 'string') ? rawMasaBerlaku.trim() : (cleanDateVal(rawMasaBerlaku) || String(rawMasaBerlaku || '').trim());
      
      const rawMasaPemulihan1 = cData.masaPemulihan1 ?? cData.masa_pemulihan_1 ?? cData.pemulihan1 ?? cData.pemulihan_1 ?? '';
      const masaPemulihan1 = (rawMasaPemulihan1 && typeof rawMasaPemulihan1 === 'string') ? rawMasaPemulihan1.trim() : (cleanDateVal(rawMasaPemulihan1) || String(rawMasaPemulihan1 || '').trim());
      
      const rawMasaPemulihan2 = cData.masaPemulihan2 ?? cData.masa_pemulihan_2 ?? cData.pemulihan2 ?? cData.pemulihan_2 ?? '';
      const masaPemulihan2 = (rawMasaPemulihan2 && typeof rawMasaPemulihan2 === 'string') ? rawMasaPemulihan2.trim() : (cleanDateVal(rawMasaPemulihan2) || String(rawMasaPemulihan2 || '').trim());
      
      const alasanKonseling = String(cData.alasanKonseling ?? cData.alasan_konseling ?? '').trim();
      const alasanSp = String(cData.alasanSp ?? cData.alasan_sp ?? cData.alasanSuratPeringatan ?? cData.alasan_surat_peringatan ?? cData.alasan ?? cData.alasanSanksi ?? '').trim();
      const keterangan = String(cData.keterangan ?? cData.keterangan_sp ?? cData.keteranganSp ?? cData.catatan ?? '').trim();
      const pernahSpSebelumnya = String(cData.pernahSpSebelumnya ?? cData.pernah_sp_sebelumnya ?? cData.pernahSp ?? 'Tidak').trim();
      let pernahTerlibatSpdk = String(cData.pernahTerlibatSpdk ?? cData.pernah_terlibat_spdk ?? cData.spdk ?? 'Tidak').trim();
      let kronologiSpdk = String(cData.kronologiSpdk ?? cData.kronologi_spdk ?? cData.kronologiKejadianSpdk ?? cData.kronologi ?? '').trim();
      let kategoriSpdk = String(cData.kategoriSpdk ?? cData.kategori_spdk ?? cData.kategoriSanksiSpdk ?? cData.kategori ?? '').trim();
      let tindakanSpdk = String(cData.tindakanSpdk ?? cData.tindakan_spdk ?? cData.tindakanDisiplinSpdk ?? cData.tindakan ?? '').trim();

      // Check if employee has active SP (SP 1, 2, 3, SPPT, ST) -> Kesimpulan: Masuk Kategori SPDK
      const hasActiveSp = Boolean(
        (sp1 && sp1 !== '-' && sp1 !== '0') || 
        (sp2 && sp2 !== '-' && sp2 !== '0') || 
        (sp3 && sp3 !== '-' && sp3 !== '0') || 
        (sppt && sppt !== '-' && sppt !== '0') || 
        (st && st !== '-' && st !== '0') ||
        (phk && phk !== '-' && phk !== '0') ||
        (totalSp && totalSp !== '0' && totalSp !== '-')
      );

      if (hasActiveSp) {
        pernahTerlibatSpdk = 'Ya';
        if (!kategoriSpdk || kategoriSpdk === '-' || kategoriSpdk.toLowerCase() === 'tidak ada') {
          if (sppt && sppt !== '-' && sppt !== '0') kategoriSpdk = 'Pelanggaran Disiplin Berat (SPPT - Pertama & Terakhir)';
          else if (sp3 && sp3 !== '-' && sp3 !== '0') kategoriSpdk = 'Pelanggaran Disiplin Berat (SP III)';
          else if (sp2 && sp2 !== '-' && sp2 !== '0') kategoriSpdk = 'Pelanggaran Disiplin Sedang (SP II)';
          else if (sp1 && sp1 !== '-' && sp1 !== '0') kategoriSpdk = 'Pelanggaran Disiplin Kerja (SP I)';
          else if (st && st !== '-' && st !== '0') kategoriSpdk = 'Pelanggaran Tata Tertib (Surat Teguran / ST)';
          else if (phk && phk !== '-' && phk !== '0') kategoriSpdk = 'Pemutusan Hubungan Kerja (PHK)';
        }
        if (!tindakanSpdk || tindakanSpdk === '-') {
          if (sppt && sppt !== '-' && sppt !== '0') tindakanSpdk = 'Penerbitan SPPT & Evaluasi Kerja';
          else if (sp3 && sp3 !== '-' && sp3 !== '0') tindakanSpdk = 'Penerbitan SP III & Evaluasi Status';
          else if (sp2 && sp2 !== '-' && sp2 !== '0') tindakanSpdk = 'Penerbitan SP II & Evaluasi Kedisiplinan';
          else if (sp1 && sp1 !== '-' && sp1 !== '0') tindakanSpdk = 'Penerbitan SP I & Pembinaan Kedisiplinan';
          else if (st && st !== '-' && st !== '0') tindakanSpdk = 'Pemberian Surat Teguran (ST) Tertulis';
          else if (phk && phk !== '-' && phk !== '0') tindakanSpdk = 'Terminasi Hubungan Kerja (PHK)';
        }
        if (!kronologiSpdk && alasanSp) {
          kronologiSpdk = alasanSp;
        }
      }

      // Calculate status sanksi
      let statusSanksi = 'Aman';
      if (phk && phk !== '-' && phk !== '0') statusSanksi = 'PHK';
      else if (sppt && sppt !== '-' && sppt !== '0') statusSanksi = 'SPPT';
      else if (sp3 && sp3 !== '-' && sp3 !== '0') statusSanksi = 'SP III';
      else if (sp2 && sp2 !== '-' && sp2 !== '0') statusSanksi = 'SP II';
      else if (sp1 && sp1 !== '-' && sp1 !== '0') statusSanksi = 'SP I';
      else if (st && st !== '-' && st !== '0') statusSanksi = 'Surat Teguran (ST)';
      else if (konseling3 && konseling3 !== '-' && konseling3 !== '0') statusSanksi = 'Konseling III';
      else if (konseling2 && konseling2 !== '-' && konseling2 !== '0') statusSanksi = 'Konseling II';
      else if (konseling1 && konseling1 !== '-' && konseling1 !== '0') statusSanksi = 'Konseling I';
      else if (pernahTerlibatSpdk.toLowerCase().includes('ya') || kronologiSpdk.length > 5) statusSanksi = 'SPDK';

      const counselRecord = {
        nik,
        name: body.name || currentEmp[0].name || '',
        jabatan: body.jabatan || currentEmp[0].jabatan || '',
        pt: body.pt || currentEmp[0].pt || '',
        totalSp,
        bulanKonseling,
        konseling1,
        konseling2,
        konseling3,
        st,
        sp1,
        sp2,
        sp3,
        sppt,
        tanggalSp,
        phk,
        masaBerlakuSanksi,
        masaPemulihan1,
        masaPemulihan2,
        alasanKonseling,
        alasanSp,
        keterangan,
        pernahSpSebelumnya,
        pernahTerlibatSpdk,
        kronologiSpdk,
        kategoriSpdk,
        tindakanSpdk,
        statusSanksi,
        updatedAt: new Date()
      };

      const existingCounsel = await db.select().from(employeeCounseling).where(eq(employeeCounseling.nik, nik)).limit(1);
      if (existingCounsel.length > 0) {
        await db.update(employeeCounseling).set(counselRecord).where(eq(employeeCounseling.nik, nik));
      } else {
        await db.insert(employeeCounseling).values(counselRecord);
      }
    }

    if (Object.keys(empUpdate).length > 0) {
      await db.update(employees).set(empUpdate).where(eq(employees.nik, nik));
    }

    clearEmployeeCache();

    const updatedEmp = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    const attMap = await getAttendanceMap();
    const counselMap = await getCounselingMap();
    const finalEmp = attachAttendanceToEmployee(updatedEmp[0], attMap, counselMap);

    res.json({
      status: "success",
      message: "Data karyawan berhasil diperbarui.",
      data: finalEmp
    });
  } catch (error: any) {
    console.error("Error updating employee:", error);
    res.status(500).json({ status: "error", message: error.message || "Gagal memperbarui data karyawan." });
  }
});

employeesRouter.post("/:nik/attendance-entry", async (req, res) => {
  try {
    const { nik } = req.params;
    const requesterNik = req.body?.editorNik || req.headers['x-user-nik'];
    const isAuth = await isAuthorizedDatabaseEditor(String(requesterNik || ''));
    if (!isAuth) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak: Penambahan catatan absensi hanya dapat dilakukan oleh section Administration atau Developer."
      });
    }

    const { category, value, date, note, year = 2026 } = req.body;
    if (!category || !value) {
      return res.status(400).json({ status: "error", message: "Kategori dan isi data wajib diisi." });
    }

    const currentEmp = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    if (currentEmp.length === 0) {
      return res.status(404).json({ status: "error", message: "Karyawan tidak ditemukan." });
    }

    const existingAtt = await db.select().from(employeeAttendance)
      .where(sql`${employeeAttendance.nik} = ${nik} AND ${employeeAttendance.year} = ${year}`)
      .limit(1);

    const currentAtt = existingAtt[0] || {
      nik,
      name: currentEmp[0].name || '',
      year,
      izin: 0,
      izinKhusus: 0,
      sakit: 0,
      sakitSiteCount: 0,
      sakitLuarCount: 0,
      alpa: 0,
      tanggalIzin: '',
      tanggalIzinKhusus: '',
      tanggalSakitSite: '',
      tanggalSakitLuar: '',
      tanggalAlpa: '',
      alasanIzin: '',
      alasanIzinKhusus: '',
      alasanSakitSite: '',
      alasanSakitLuar: '',
      alasanSakit: ''
    };

    const appendText = (current: string | null | undefined, addition: string) => {
      const cur = (current || '').trim();
      const add = addition.trim();
      if (!cur) return add;
      return `${cur}\n${add}`;
    };

    const updateObj: Record<string, any> = {
      updatedAt: new Date()
    };

    const countLines = (str: string) => str.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean).length;

    if (category === 'tanggalIzin') {
      const updated = appendText(currentAtt.tanggalIzin, value);
      updateObj.tanggalIzin = updated;
      updateObj.izin = countLines(updated);
    } else if (category === 'tanggalIzinKhusus') {
      const updated = appendText(currentAtt.tanggalIzinKhusus, value);
      updateObj.tanggalIzinKhusus = updated;
      updateObj.izinKhusus = countLines(updated);
    } else if (category === 'tanggalSakitSite') {
      const updated = appendText(currentAtt.tanggalSakitSite, value);
      updateObj.tanggalSakitSite = updated;
      updateObj.sakitSiteCount = countLines(updated);
      updateObj.sakit = (updateObj.sakitSiteCount || currentAtt.sakitSiteCount || 0) + (currentAtt.sakitLuarCount || 0);
    } else if (category === 'tanggalSakitLuar') {
      const updated = appendText(currentAtt.tanggalSakitLuar, value);
      updateObj.tanggalSakitLuar = updated;
      updateObj.sakitLuarCount = countLines(updated);
      updateObj.sakit = (currentAtt.sakitSiteCount || 0) + (updateObj.sakitLuarCount || 0);
    } else if (category === 'tanggalAlpa') {
      const updated = appendText(currentAtt.tanggalAlpa, value);
      updateObj.tanggalAlpa = updated;
      updateObj.alpa = countLines(updated);
    } else if (category === 'alasanIzin') {
      updateObj.alasanIzin = appendText(currentAtt.alasanIzin, value);
    } else if (category === 'alasanIzinKhusus') {
      updateObj.alasanIzinKhusus = appendText(currentAtt.alasanIzinKhusus, value);
    } else if (category === 'alasanSakitSite') {
      updateObj.alasanSakitSite = appendText(currentAtt.alasanSakitSite, value);
    } else if (category === 'alasanSakitLuar') {
      updateObj.alasanSakitLuar = appendText(currentAtt.alasanSakitLuar, value);
    }

    if (existingAtt.length > 0) {
      await db.update(employeeAttendance).set(updateObj)
        .where(sql`${employeeAttendance.nik} = ${nik} AND ${employeeAttendance.year} = ${year}`);
    } else {
      await db.insert(employeeAttendance).values({ ...currentAtt, ...updateObj });
    }

    clearEmployeeCache();

    // Refresh attendance and return
    const attMap = await getAttendanceMap();
    const refreshedEmp = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    const finalEmp = attachAttendanceToEmployee(refreshedEmp[0], attMap);

    res.json({
      status: "success",
      message: "Catatan absensi berhasil ditambahkan.",
      data: finalEmp
    });
  } catch (error: any) {
    console.error("Error adding attendance entry:", error);
    res.status(500).json({ status: "error", message: error.message || "Gagal menambahkan catatan absensi." });
  }
});



