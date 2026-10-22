import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, and, or, gte, lte, ilike, sql } from "drizzle-orm";
import { employeeTardinessRecords, employees } from "../../src/db/schema.js";
import { drive } from "../../google-services.js";
import * as XLSX from "xlsx";

export const employeeTardinessRouter = Router();

// ID Google Sheet Laporan Keterlambatan Karyawan Prep&Lab di Google Drive PrepLab Cloud
export const REKAPAN_TARDINESS_SPREADSHEET_ID =
  process.env.GDRIVE_REKAPAN_TARDINESS_SPREADSHEET_ID || "1c3fZOdmNFDKn7yRa_p1B2oKDYkMHPhOSLxWAEpY2n3Q";

let tardinessTableEnsured = false;
export async function ensureEmployeeTardinessTable() {
  if (tardinessTableEnsured) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS employee_tardiness_records (
      id SERIAL PRIMARY KEY,
      nik TEXT,
      name TEXT NOT NULL,
      jabatan TEXT,
      shift TEXT,
      section TEXT,
      tanggal TEXT NOT NULL,
      waktu_finger TEXT,
      status_finger TEXT NOT NULL,
      foto_finger TEXT,
      alasan TEXT,
      acc TEXT DEFAULT 'Disetujui',
      acc_by TEXT,
      acc_at TEXT,
      catatan TEXT,
      source TEXT DEFAULT 'web',
      sheet_row_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tardiness_name ON employee_tardiness_records(name);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tardiness_tanggal ON employee_tardiness_records(tanggal);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tardiness_section ON employee_tardiness_records(section);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tardiness_status ON employee_tardiness_records(status_finger);`);
    tardinessTableEnsured = true;
  } catch (e: any) {
    console.warn("[Employee Tardiness] Ensure table warning:", e.message);
  }
}

export interface SheetTardinessItem {
  id: string | number;
  sheetRowId?: string;
  source: 'google_sheet' | 'web';
  nik?: string;
  name: string;
  jabatan?: string;
  section: string;
  shift: string;
  tanggal: string; // 'YYYY-MM-DD'
  waktuFinger: string; // 'HH:mm'
  statusFinger: 'Masuk' | 'Pulang'; // Masuk = Keterlambatan, Pulang = Pulang Cepat
  fotoFinger?: string;
  alasan?: string;
  acc?: string;
  accBy?: string;
  accAt?: string;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

interface TardinessSheetCache {
  data: SheetTardinessItem[];
  lastFetchedAt: number;
  totalRows: number;
  spreadsheetId: string;
}

let sheetCache: TardinessSheetCache = {
  data: [],
  lastFetchedAt: 0,
  totalRows: 0,
  spreadsheetId: REKAPAN_TARDINESS_SPREADSHEET_ID
};

function formatExcelTime(val: any): string {
  if (val == null || val === '') return '-';
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  if (val instanceof Date) {
    const h = val.getHours();
    const m = val.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const timeMatch = s.match(/(\d{1,2})[:.](\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  return s;
}

function formatExcelDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    const utcMs = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(val).trim();
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

// Fetch and parse Google Sheet Keterlambatan & Pulang Cepat
export async function fetchGoogleSheetTardiness(force = false): Promise<SheetTardinessItem[]> {
  const now = Date.now();
  const CACHE_TTL = 30 * 1000; // 30 seconds

  if (!force && sheetCache.data.length > 0 && (now - sheetCache.lastFetchedAt < CACHE_TTL)) {
    return sheetCache.data;
  }

  try {
    console.log(`[Employee Tardiness] Fetching Google Sheet via Drive export (ID: ${REKAPAN_TARDINESS_SPREADSHEET_ID})...`);
    const res = await drive.files.export(
      {
        fileId: REKAPAN_TARDINESS_SPREADSHEET_ID,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0] || 'Form Responses 1';
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (!rawRows || rawRows.length <= 1) {
      console.warn('[Employee Tardiness] Sheet is empty or contains only header.');
      return sheetCache.data;
    }

    // Header mapping
    const headerRow: string[] = (rawRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
    const findCol = (...keywords: string[]): number => {
      return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const colTimestamp = findCol('timestamp') !== -1 ? findCol('timestamp') : 0;
    const colNama = findCol('nama karyawan', 'nama') !== -1 ? findCol('nama karyawan', 'nama') : 1;
    const colShift = findCol('shift') !== -1 ? findCol('shift') : 2;
    const colSection = findCol('section', 'bagian') !== -1 ? findCol('section', 'bagian') : 3;
    const colTanggal = findCol('tanggal', 'tgl') !== -1 ? findCol('tanggal', 'tgl') : 4;
    const colWaktu = findCol('waktu finger', 'waktu', 'jam') !== -1 ? findCol('waktu finger', 'waktu', 'jam') : 5;
    const colStatus = findCol('status finger', 'status') !== -1 ? findCol('status finger', 'status') : 6;
    const colFoto = findCol('foto finger', 'foto', 'bukti', 'lampiran') !== -1 ? findCol('foto finger', 'foto', 'bukti', 'lampiran') : 7;
    const colAlasan = findCol('alasan') !== -1 ? findCol('alasan') : 8;

    // Load employee master for NIK & Jabatan enrichment
    let empMap = new Map<string, { nik: string; jabatan?: string }>();
    try {
      const empList = await db.select({ nik: employees.nik, name: employees.name, jabatan: employees.jabatan }).from(employees);
      for (const e of empList) {
        if (e.name) empMap.set(e.name.toLowerCase().trim(), { nik: e.nik, jabatan: e.jabatan || undefined });
      }
    } catch (e) {}

    const parsedItems: SheetTardinessItem[] = [];

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawNama = row[colNama];
      if (!rawNama || !String(rawNama).trim()) continue;

      const name = String(rawNama).trim();
      const rawTimestamp = row[colTimestamp];
      const rawShift = row[colShift];
      const rawSection = row[colSection];
      const rawTanggal = row[colTanggal];
      const rawWaktu = row[colWaktu];
      const rawStatus = row[colStatus];
      const rawFoto = row[colFoto];
      const rawAlasan = row[colAlasan];

      const tanggal = formatExcelDate(rawTanggal) || (rawTimestamp ? formatExcelDate(rawTimestamp) : '');
      const waktuFinger = formatExcelTime(rawWaktu);

      // Status finger: Masuk (Terlambat) vs Pulang (Pulang Cepat)
      let statusFinger: 'Masuk' | 'Pulang' = 'Masuk';
      const stStr = String(rawStatus || '').trim().toLowerCase();
      if (stStr.includes('pulang')) {
        statusFinger = 'Pulang';
      } else {
        statusFinger = 'Masuk';
      }

      // Shift normalizer
      let shift = 'Nonshift';
      const shStr = String(rawShift || '').trim().toUpperCase();
      if (shStr === 'A' || shStr === 'SHIFT A') shift = 'Shift A';
      else if (shStr === 'B' || shStr === 'SHIFT B') shift = 'Shift B';
      else if (shStr.includes('NON')) shift = 'Nonshift';
      else if (shStr) shift = shStr;

      // Section normalizer
      let section = 'Preparation';
      const secStr = String(rawSection || '').trim().toLowerCase();
      if (secStr.includes('lab')) section = 'Laboratory';
      else if (secStr.includes('admin')) section = 'Administration';
      else if (secStr.includes('maint')) section = 'Maintenance';
      else if (secStr.includes('prep')) section = 'Preparation';
      else if (rawSection) section = String(rawSection).trim();

      const matchedEmp = empMap.get(name.toLowerCase());
      const nik = matchedEmp?.nik || 'N/A';
      const jabatan = matchedEmp?.jabatan || 'Crew, Preparation & Laboratory';

      let createdAtIso = new Date().toISOString();
      if (rawTimestamp instanceof Date && !isNaN(rawTimestamp.getTime())) {
        createdAtIso = rawTimestamp.toISOString();
      } else if (rawTimestamp) {
        try {
          const parsed = new Date(rawTimestamp);
          if (!isNaN(parsed.getTime())) createdAtIso = parsed.toISOString();
        } catch {}
      }

      parsedItems.push({
        id: `sheet-${i}`,
        sheetRowId: `row-${i}`,
        source: 'google_sheet',
        nik,
        name,
        jabatan,
        section,
        shift,
        tanggal,
        waktuFinger,
        statusFinger,
        fotoFinger: rawFoto ? String(rawFoto).trim() : '',
        alasan: rawAlasan ? String(rawAlasan).trim() : (statusFinger === 'Masuk' ? 'Terlambat Finger Masuk' : 'Pulang Cepat'),
        acc: 'Disetujui',
        accBy: 'Admin Prep&Lab',
        accAt: tanggal,
        createdAt: createdAtIso,
        updatedAt: createdAtIso
      });
    }

    parsedItems.reverse(); // Terbaru di paling atas

    sheetCache = {
      data: parsedItems,
      lastFetchedAt: now,
      totalRows: parsedItems.length,
      spreadsheetId: REKAPAN_TARDINESS_SPREADSHEET_ID
    };

    console.log(`[Employee Tardiness] Successfully parsed ${parsedItems.length} records from Google Sheet.`);
    return parsedItems;
  } catch (error: any) {
    console.error('[Employee Tardiness] Error fetching Google Sheet:', error.message);
    return sheetCache.data;
  }
}

// 1. GET /api/employee-tardiness - Get tardiness records (Google Sheet + DB)
employeeTardinessRouter.get("/api/employee-tardiness", async (req, res) => {
  try {
    ensureEmployeeTardinessTable().catch(() => {});

    const {
      section,
      shift,
      statusFinger,
      startDate,
      endDate,
      search,
      acc,
      limit = "100",
      offset = "0"
    } = req.query as Record<string, string>;

    const sheetItems = await fetchGoogleSheetTardiness();

    // Query DB rows
    let dbItems: SheetTardinessItem[] = [];
    try {
      const rows = await db
        .select()
        .from(employeeTardinessRecords)
        .orderBy(desc(employeeTardinessRecords.createdAt));

      dbItems = rows.map(r => ({
        id: r.id,
        sheetRowId: r.sheetRowId || undefined,
        source: (r.source as any) || 'web',
        nik: r.nik || 'N/A',
        name: r.name,
        jabatan: r.jabatan || 'Crew, Preparation & Laboratory',
        section: r.section || 'Preparation',
        shift: r.shift || 'Nonshift',
        tanggal: r.tanggal,
        waktuFinger: r.waktuFinger || '-',
        statusFinger: (r.statusFinger as any) || 'Masuk',
        fotoFinger: r.fotoFinger || '',
        alasan: r.alasan || '',
        acc: r.acc || 'Disetujui',
        accBy: r.accBy || undefined,
        accAt: r.accAt || undefined,
        catatan: r.catatan || undefined,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString()
      }));
    } catch (e: any) {
      console.warn("[Employee Tardiness] Warning query DB:", e.message);
    }

    // Merge DB items + Google Sheet items
    const dbSheetIds = new Set(dbItems.filter(d => d.sheetRowId).map(d => d.sheetRowId));
    const merged = [...dbItems];
    for (const s of sheetItems) {
      if (!s.sheetRowId || !dbSheetIds.has(s.sheetRowId)) {
        merged.push(s);
      }
    }

    // Sort by tanggal / createdAt descending
    merged.sort((a, b) => {
      const dateA = a.tanggal || a.createdAt.slice(0, 10);
      const dateB = b.tanggal || b.createdAt.slice(0, 10);
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return b.createdAt.localeCompare(a.createdAt);
    });

    // Compute Global Summary Stats
    const nowObj = new Date();
    const currentMonthPrefix = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;

    let totalTerlambat = 0;
    let totalPulangCepat = 0;
    let totalBulanIni = 0;
    let totalHariIni = 0;
    const sectionCounts: Record<string, number> = {};
    const shiftCounts: Record<string, number> = {};

    merged.forEach(item => {
      if (item.statusFinger === 'Pulang') {
        totalPulangCepat++;
      } else {
        totalTerlambat++;
      }

      if (item.tanggal && item.tanggal.startsWith(currentMonthPrefix)) {
        totalBulanIni++;
      }
      if (item.tanggal && item.tanggal === todayStr) {
        totalHariIni++;
      }

      const sec = item.section || 'Preparation';
      sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;

      const sh = item.shift || 'Nonshift';
      shiftCounts[sh] = (shiftCounts[sh] || 0) + 1;
    });

    // Apply Filters
    let filtered = merged;

    if (section && section !== 'ALL') {
      const secLower = section.toLowerCase();
      filtered = filtered.filter(item => (item.section || '').toLowerCase().includes(secLower));
    }

    if (shift && shift !== 'ALL') {
      const shLower = shift.toLowerCase();
      filtered = filtered.filter(item => (item.shift || '').toLowerCase().includes(shLower));
    }

    if (statusFinger && statusFinger !== 'ALL') {
      filtered = filtered.filter(item => item.statusFinger.toLowerCase() === statusFinger.toLowerCase());
    }

    if (acc && acc !== 'ALL') {
      filtered = filtered.filter(item => (item.acc || '').toLowerCase() === acc.toLowerCase());
    }

    if (startDate) {
      filtered = filtered.filter(item => item.tanggal >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(item => item.tanggal <= endDate);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) ||
        (item.nik && item.nik.toLowerCase().includes(q)) ||
        (item.alasan && item.alasan.toLowerCase().includes(q)) ||
        (item.jabatan && item.jabatan.toLowerCase().includes(q)) ||
        (item.section && item.section.toLowerCase().includes(q)) ||
        (item.waktuFinger && item.waktuFinger.toLowerCase().includes(q))
      );
    }

    const totalFiltered = filtered.length;
    const lim = Math.max(1, parseInt(limit, 10));
    const off = Math.max(0, parseInt(offset, 10));
    const paginated = filtered.slice(off, off + lim);

    res.json({
      status: "success",
      total: totalFiltered,
      limit: lim,
      offset: off,
      stats: {
        totalAll: merged.length,
        totalTerlambat,
        totalPulangCepat,
        totalBulanIni,
        totalHariIni,
        sectionCounts,
        shiftCounts
      },
      data: paginated,
      lastSyncAt: new Date(sheetCache.lastFetchedAt).toISOString()
    });
  } catch (error: any) {
    console.error("[Employee Tardiness GET] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal mengambil data keterlambatan & pulang cepat."
    });
  }
});

// 2. POST /api/employee-tardiness/sync-sheet - Paksa sinkronisasi Google Sheet
employeeTardinessRouter.post("/api/employee-tardiness/sync-sheet", async (req, res) => {
  try {
    const data = await fetchGoogleSheetTardiness(true);
    res.json({
      status: "success",
      message: `Berhasil menyinkronkan ${data.length} data rekapan keterlambatan & pulang cepat dari Google Sheet.`,
      totalRows: data.length,
      lastSyncAt: new Date(sheetCache.lastFetchedAt).toISOString(),
      spreadsheetId: REKAPAN_TARDINESS_SPREADSHEET_ID
    });
  } catch (error: any) {
    console.error("[Employee Tardiness Sync Sheet] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal menyinkronkan data dari Google Sheet."
    });
  }
});

// 3. POST /api/employee-tardiness - Tambah data keterlambatan / pulang cepat baru (dari Form)
employeeTardinessRouter.post("/api/employee-tardiness", async (req, res) => {
  try {
    await ensureEmployeeTardinessTable();

    const {
      nik,
      name,
      jabatan,
      shift,
      section,
      tanggal,
      waktuFinger,
      statusFinger,
      fotoFinger,
      alasan,
      acc,
      catatan
    } = req.body;

    if (!name || !tanggal || !statusFinger) {
      return res.status(400).json({
        status: "error",
        message: "Nama Karyawan, Tanggal, dan Status Finger wajib diisi."
      });
    }

    let finalNik = nik ? String(nik).trim().toUpperCase() : null;
    let finalJabatan = jabatan ? String(jabatan).trim() : null;
    let finalSection = section ? String(section).trim() : 'Preparation';

    // Auto lookup employee master if nik or jabatan missing
    if (!finalNik || !finalJabatan) {
      try {
        const [emp] = await db.select().from(employees).where(ilike(employees.name, name.trim())).limit(1);
        if (emp) {
          if (!finalNik) finalNik = emp.nik;
          if (!finalJabatan) finalJabatan = emp.jabatan || 'Crew, Preparation & Laboratory';
          if (!section && emp.section) finalSection = emp.section;
        }
      } catch (e) {}
    }

    const inserted = await db
      .insert(employeeTardinessRecords)
      .values({
        nik: finalNik,
        name: String(name).trim(),
        jabatan: finalJabatan || 'Crew, Preparation & Laboratory',
        shift: shift ? String(shift).trim() : 'Nonshift',
        section: finalSection,
        tanggal: String(tanggal).trim(),
        waktuFinger: waktuFinger ? String(waktuFinger).trim() : '-',
        statusFinger: statusFinger === 'Pulang' ? 'Pulang' : 'Masuk',
        fotoFinger: fotoFinger ? String(fotoFinger).trim() : null,
        alasan: alasan ? String(alasan).trim() : (statusFinger === 'Pulang' ? 'Pulang Cepat' : 'Terlambat Finger Masuk'),
        acc: acc ? String(acc).trim() : 'Disetujui',
        catatan: catatan ? String(catatan).trim() : null,
        source: 'web'
      })
      .returning();

    res.status(201).json({
      status: "success",
      message: "Data keterlambatan / pulang cepat berhasil disimpan.",
      data: inserted[0]
    });
  } catch (error: any) {
    console.error("[Employee Tardiness POST] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal menyimpan data keterlambatan / pulang cepat."
    });
  }
});

// 4. PUT /api/employee-tardiness/:id - Update data
employeeTardinessRouter.put("/api/employee-tardiness/:id", async (req, res) => {
  try {
    await ensureEmployeeTardinessTable();
    const idParam = req.params.id;

    const {
      nik,
      name,
      jabatan,
      shift,
      section,
      tanggal,
      waktuFinger,
      statusFinger,
      fotoFinger,
      alasan,
      acc,
      accBy,
      accAt,
      catatan
    } = req.body;

    const numId = parseInt(idParam, 10);

    // If numerical DB ID
    if (!isNaN(numId)) {
      const updated = await db
        .update(employeeTardinessRecords)
        .set({
          ...(nik !== undefined ? { nik: nik ? String(nik).trim().toUpperCase() : null } : {}),
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(jabatan !== undefined ? { jabatan: jabatan ? String(jabatan).trim() : null } : {}),
          ...(shift !== undefined ? { shift: shift ? String(shift).trim() : 'Nonshift' } : {}),
          ...(section !== undefined ? { section: section ? String(section).trim() : 'Preparation' } : {}),
          ...(tanggal !== undefined ? { tanggal: String(tanggal).trim() } : {}),
          ...(waktuFinger !== undefined ? { waktuFinger: String(waktuFinger).trim() } : {}),
          ...(statusFinger !== undefined ? { statusFinger: statusFinger === 'Pulang' ? 'Pulang' : 'Masuk' } : {}),
          ...(fotoFinger !== undefined ? { fotoFinger: fotoFinger ? String(fotoFinger).trim() : null } : {}),
          ...(alasan !== undefined ? { alasan: alasan ? String(alasan).trim() : null } : {}),
          ...(acc !== undefined ? { acc: String(acc).trim() } : {}),
          ...(accBy !== undefined ? { accBy: String(accBy).trim() } : {}),
          ...(accAt !== undefined ? { accAt: String(accAt).trim() } : {}),
          ...(catatan !== undefined ? { catatan: catatan ? String(catatan).trim() : null } : {}),
          updatedAt: new Date()
        })
        .where(eq(employeeTardinessRecords.id, numId))
        .returning();

      return res.json({
        status: "success",
        message: "Data berhasil diperbarui.",
        data: updated[0]
      });
    }

    // If it's a sheet-row ID (e.g. sheet-1), insert as custom override in DB
    const inserted = await db
      .insert(employeeTardinessRecords)
      .values({
        sheetRowId: idParam,
        nik: nik ? String(nik).trim().toUpperCase() : null,
        name: String(name || 'Karyawan').trim(),
        jabatan: jabatan ? String(jabatan).trim() : null,
        shift: shift ? String(shift).trim() : 'Nonshift',
        section: section ? String(section).trim() : 'Preparation',
        tanggal: String(tanggal || '').trim(),
        waktuFinger: waktuFinger ? String(waktuFinger).trim() : '-',
        statusFinger: statusFinger === 'Pulang' ? 'Pulang' : 'Masuk',
        fotoFinger: fotoFinger ? String(fotoFinger).trim() : null,
        alasan: alasan ? String(alasan).trim() : null,
        acc: acc ? String(acc).trim() : 'Disetujui',
        accBy: accBy ? String(accBy).trim() : 'Admin Prep&Lab',
        accAt: accAt ? String(accAt).trim() : new Date().toISOString().slice(0, 10),
        catatan: catatan ? String(catatan).trim() : null,
        source: 'google_sheet'
      })
      .returning();

    res.json({
      status: "success",
      message: "Data sheet berhasil diperbarui dan disimpan ke database.",
      data: inserted[0]
    });
  } catch (error: any) {
    console.error("[Employee Tardiness PUT] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal memperbarui data keterlambatan."
    });
  }
});

// 5. DELETE /api/employee-tardiness/:id - Hapus data
employeeTardinessRouter.delete("/api/employee-tardiness/:id", async (req, res) => {
  try {
    await ensureEmployeeTardinessTable();
    const idParam = req.params.id;
    const numId = parseInt(idParam, 10);

    if (!isNaN(numId)) {
      await db.delete(employeeTardinessRecords).where(eq(employeeTardinessRecords.id, numId));
    } else {
      // Mark as deleted in cache for sheet rows
      sheetCache.data = sheetCache.data.filter(d => d.id !== idParam && d.sheetRowId !== idParam);
    }

    res.json({
      status: "success",
      message: "Data berhasil dihapus."
    });
  } catch (error: any) {
    console.error("[Employee Tardiness DELETE] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal menghapus data keterlambatan."
    });
  }
});
