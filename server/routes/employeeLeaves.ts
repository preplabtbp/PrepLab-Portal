import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, and, or, gte, lte, ilike, sql, inArray } from "drizzle-orm";
import { employeeLeaveRequests, employees } from "../../src/db/schema.js";
import { drive } from "../../google-services.js";
import * as XLSX from "xlsx";

export const employeeLeavesRouter = Router();

// ID Google Sheet Rekapan Izin Karyawan di Google Drive PrepLab Cloud
export const REKAPAN_IZIN_SPREADSHEET_ID =
  process.env.GDRIVE_REKAPAN_IZIN_SPREADSHEET_ID || "1yeRjyHjsWlEmy37xj4qnysMWUuzDIBUP0gg3nVR1Rys";

let leavesTableEnsured = false;
export async function ensureEmployeeLeavesTable() {
  if (leavesTableEnsured) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS employee_leave_requests (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      name TEXT NOT NULL,
      jabatan TEXT,
      section TEXT,
      shift TEXT,
      jam_shift TEXT,
      penempatan TEXT,
      tempat_tinggal TEXT,
      awal_absensi TEXT NOT NULL,
      akhir_absensi TEXT NOT NULL,
      jumlah INTEGER DEFAULT 1,
      lamanya_izin TEXT,
      alasan_absensi TEXT NOT NULL,
      pengawas_mengetahui TEXT,
      lampiran TEXT,
      acc TEXT DEFAULT 'Pending',
      acc_by TEXT,
      acc_at TEXT,
      catatan TEXT,
      source TEXT DEFAULT 'web',
      sheet_row_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`
      ALTER TABLE employee_leave_requests 
      ADD COLUMN IF NOT EXISTS tempat_tinggal TEXT,
      ADD COLUMN IF NOT EXISTS pengawas_mengetahui TEXT,
      ADD COLUMN IF NOT EXISTS lamanya_izin TEXT,
      ADD COLUMN IF NOT EXISTS jam_shift TEXT,
      ADD COLUMN IF NOT EXISTS penempatan TEXT,
      ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web',
      ADD COLUMN IF NOT EXISTS sheet_row_id TEXT,
      ADD COLUMN IF NOT EXISTS kategori_izin TEXT;
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS deleted_sheet_leaves (
        id SERIAL PRIMARY KEY,
        sheet_row_id TEXT NOT NULL UNIQUE,
        deleted_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Pembersihan otomatis: Hapus row kosong / sampah di database
    await db.execute(sql`
      DELETE FROM employee_leave_requests 
      WHERE name IS NULL OR TRIM(name) = '' OR nik IS NULL OR TRIM(nik) = '';
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_leave_requests_nik ON employee_leave_requests(nik);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON employee_leave_requests(awal_absensi, akhir_absensi);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_leave_requests_section ON employee_leave_requests(section);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_leave_requests_acc ON employee_leave_requests(acc);`);
    leavesTableEnsured = true;
  } catch (e: any) {
    console.warn("[Employee Leaves] Ensure table warning:", e.message);
  }
}

// In-Memory Cache untuk Rekapan Google Sheet
interface SheetLeaveItem {
  id: string | number;
  sheetRowId?: string;
  source: 'google_sheet' | 'web';
  timestamp?: string;
  nik: string;
  name: string;
  jabatan: string;
  section: string;
  penempatan: string;
  tempatTinggal?: string;
  gol?: string;
  shift: string;
  jamShift: string;
  awalAbsensi: string;
  akhirAbsensi: string;
  lamanyaIzin: string;
  jumlah: number;
  kategoriIzin?: 'I' | 'IK' | 'SS' | 'SL' | string;
  alasanAbsensi: string;
  pengawasMengetahui: string;
  lampiran: string;
  acc: string;
  accBy?: string;
  accAt?: string;
  catatan?: string;
  createdAt: string;
  updatedAt?: string;
}

let sheetCache: {
  data: SheetLeaveItem[];
  lastFetchedAt: number;
  totalRows: number;
  spreadsheetId: string;
} = {
  data: [],
  lastFetchedAt: 0,
  totalRows: 0,
  spreadsheetId: REKAPAN_IZIN_SPREADSHEET_ID
};

// ID Google Sheet Database Rooster Prep & Lab
export const ROOSTER_SPREADSHEET_ID =
  process.env.ROOSTER_SPREADSHEET_ID || "1iijlFReGxHyMiFAbd0J5-yfs1udWvZo4ydrJJKJBCNo";

export const ROOSTER_STAFF_CSV_URL = `https://docs.google.com/spreadsheets/d/${ROOSTER_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Rooster_Staff`;
export const ROOSTER_CREW_CSV_URL = `https://docs.google.com/spreadsheets/d/${ROOSTER_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Rooster_Crew`;

const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let roosterCache: {
  map: Map<string, string>; // `${cleanNik}_${headerDate}` -> status (I, IK, SS, SL)
  lastFetchedAt: number;
} = {
  map: new Map(),
  lastFetchedAt: 0
};

export async function fetchRoosterLeaveCodes(force = false): Promise<Map<string, string>> {
  const now = Date.now();
  const CACHE_TTL = 60 * 1000; // 60 detik cache

  if (!force && roosterCache.map.size > 0 && (now - roosterCache.lastFetchedAt < CACHE_TTL)) {
    return roosterCache.map;
  }

  try {
    const urls = [
      { type: 'Staff', url: ROOSTER_STAFF_CSV_URL, dateStartCol: 15, nikCol: 2 },
      { type: 'Crew', url: ROOSTER_CREW_CSV_URL, dateStartCol: 14, nikCol: 2 }
    ];

    const newMap = new Map<string, string>();

    await Promise.all(
      urls.map(async ({ type, url, dateStartCol, nikCol }) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const text = await res.text();
          const lines = text.split(/\r?\n/);
          if (lines.length < 2) return;

          const parseLine = (line: string): string[] => {
            const cells: string[] = [];
            let inQuote = false;
            let curr = '';
            for (let i = 0; i < line.length; i++) {
              const c = line[i];
              if (c === '"') inQuote = !inQuote;
              else if (c === ',' && !inQuote) { cells.push(curr.trim()); curr = ''; }
              else curr += c;
            }
            cells.push(curr.trim());
            return cells;
          };

          const headerRow = parseLine(lines[0] || '').map(h => h.replace(/"/g, '').trim());

          for (let r = 2; r < lines.length; r++) {
            const row = parseLine(lines[r]);
            const nik = row[nikCol] ? row[nikCol].replace(/"/g, '').trim().toUpperCase() : '';
            if (!nik || nik.length < 3) continue;

            for (let c = dateStartCol; c < row.length; c++) {
              const rawStatus = row[c] ? row[c].replace(/"/g, '').trim().toUpperCase() : '';
              if (!rawStatus) continue;
              if (['I', 'IK', 'SS', 'SL', 'S'].includes(rawStatus)) {
                const dHeader = headerRow[c];
                if (dHeader) {
                  const statusNormalized = rawStatus === 'S' ? 'SS' : rawStatus;
                  newMap.set(`${nik}_${dHeader}`, statusNormalized);
                }
              }
            }
          }
        } catch (err: any) {
          console.warn(`[Employee Leaves] Failed to fetch Rooster_${type}:`, err.message);
        }
      })
    );

    if (newMap.size > 0) {
      roosterCache = {
        map: newMap,
        lastFetchedAt: now
      };
      console.log(`[Employee Leaves] Synced ${newMap.size} leave status entries from Database Rooster Prep & Lab.`);
    }

    return roosterCache.map;
  } catch (error: any) {
    console.error('[Employee Leaves] Error syncing Rooster leave codes:', error.message);
    return roosterCache.map;
  }
}

export function getRosterDateKeys(startIso?: string, endIso?: string): string[] {
  const keys: string[] = [];
  if (!startIso) return keys;
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date(startIso);
  if (isNaN(start.getTime())) {
    return [String(startIso).trim()];
  }
  const cur = new Date(start);
  const maxDays = 14;
  let count = 0;
  while (cur <= end && count < maxDays) {
    const y = cur.getUTCFullYear() % 100;
    const mon = cur.getUTCMonth();
    const d = cur.getUTCDate();
    keys.push(`${d} ${EN_MONTHS_SHORT[mon]} ${y}`);
    cur.setUTCDate(cur.getUTCDate() + 1);
    count++;
  }
  if (keys.length === 0) {
    const y = start.getUTCFullYear() % 100;
    const mon = start.getUTCMonth();
    const d = start.getUTCDate();
    keys.push(`${d} ${EN_MONTHS_SHORT[mon]} ${y}`);
  }
  return keys;
}

export function resolveKategoriIzin(
  nik: string,
  awalAbsensi: string,
  akhirAbsensi: string,
  alasan: string,
  overrideKategori?: string | null,
  rosterMap?: Map<string, string>
): 'I' | 'IK' | 'SS' | 'SL' {
  // 1. Manual override dari database
  if (overrideKategori) {
    const u = overrideKategori.trim().toUpperCase();
    if (u === 'I' || u === 'IK' || u === 'SS' || u === 'SL') return u as any;
  }

  // 2. Lookup sinkronisasi Google Sheet Database Rooster Prep & Lab
  if (rosterMap && nik) {
    const cleanNik = nik.trim().toUpperCase();
    const dateKeys = getRosterDateKeys(awalAbsensi, akhirAbsensi);

    // Prioritas: SS / SL > IK > I
    let foundCode: 'I' | 'IK' | 'SS' | 'SL' | '' = '';
    for (const dKey of dateKeys) {
      const st = rosterMap.get(`${cleanNik}_${dKey}`);
      if (!st) continue;
      if (st === 'SS' || st === 'SL') {
        foundCode = st;
        break;
      }
      if (st === 'IK' && foundCode !== 'SS' && foundCode !== 'SL') {
        foundCode = st;
      }
      if (st === 'I' && !foundCode) {
        foundCode = st;
      }
    }
    if (foundCode) return foundCode;
  }

  // 3. Fallback: Inferensi cerdas dari alasan izin
  const r = String(alasan || '').toLowerCase();
  if (r.includes('sakit') || r.includes('demam') || r.includes('pusing') || r.includes('klinik') || r.includes('flu') || r.includes('batuk') || r.includes('opname') || r.includes('rawat') || r.includes('muntaber') || r.includes('diare') || r.includes('gigi')) {
    if (r.includes('rujukan') || r.includes('luar') || r.includes('rs') || r.includes('rumah sakit') || r.includes('kampung') || r.includes('ternate') || r.includes('labuha') || r.includes('luar site')) {
      return 'SL'; // Sakit Luar Site
    }
    return 'SS'; // Sakit Site
  }

  if (r.includes('duka') || r.includes('menikah') || r.includes('nikah') || r.includes('melahirkan') || r.includes('kematian') || r.includes('istri melahirkan') || r.includes('anak lahir') || r.includes('khitanan') || r.includes('baptis') || r.includes('khusus') || r.includes('hakikad') || r.includes('aqiqah')) {
    return 'IK'; // Izin Khusus
  }

  return 'I'; // Izin Biasa
}

// Helper: Format tanggal excel / serial / string ke 'YYYY-MM-DD'
function formatExcelDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    // Spreadsheet di Halmahera/Site Kawasi menggunakan WIT (UTC+9).
    // Nilai date dari Google Sheets via XLSX di-parse sebagai midnight UTC+9 (yaitu 15:00 UTC kemarin).
    // Tambahkan 9 jam (32.400.000 ms) agar tanggal konsisten dengan kalender lokal Site Kawasi (WIT).
    const localMs = val.getTime() + (9 * 60 * 60 * 1000);
    const d = new Date(localMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (typeof val === 'number') {
    // Excel serial number (approximate conversion) + offset WIT (+9 jam)
    const utcMs = Math.round((val - 25569) * 86400 * 1000);
    const date = new Date(utcMs + (9 * 60 * 60 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  const s = String(val).trim();
  // Jika format ISO seperti '2026-10-19T15:00:00.000Z'
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const localMs = parsed.getTime() + (9 * 60 * 60 * 1000);
      const d = new Date(localMs);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return s.slice(0, 10);
  }
  // If format is like '18/10/2026' or '18-10-2026'
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  return s;
}

function parseDurationDays(val: any): number {
  if (!val) return 1;
  if (typeof val === 'number') return Math.max(1, Math.round(val));
  const numMatch = String(val).match(/\d+/);
  return numMatch ? Math.max(1, parseInt(numMatch[0], 10)) : 1;
}

// Fetch dan parse Google Sheet Rekapan Izin Karyawan
export async function fetchGoogleSheetLeaves(force = false): Promise<SheetLeaveItem[]> {
  const now = Date.now();
  const CACHE_TTL = 15 * 1000; // 15 detik untuk respon cepat saat Google Sheet diperbarui/dihapus

  if (!force && sheetCache.data.length > 0 && (now - sheetCache.lastFetchedAt < CACHE_TTL)) {
    return sheetCache.data;
  }

  try {
    console.log(`[Employee Leaves] Fetching Google Sheet via Drive export (ID: ${REKAPAN_IZIN_SPREADSHEET_ID})...`);
    const res = await drive.files.export(
      {
        fileId: REKAPAN_IZIN_SPREADSHEET_ID,
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
      console.warn('[Employee Leaves] Sheet is empty or contains only header.');
      return sheetCache.data;
    }

    // Ambil daftar sheetRowId yang telah dihapus jika ada
    const deletedSheetIds = new Set<string>();
    try {
      const delRes = await db.execute(sql`SELECT sheet_row_id FROM deleted_sheet_leaves`);
      delRes.rows.forEach((r: any) => {
        if (r.sheet_row_id) deletedSheetIds.add(String(r.sheet_row_id));
      });
    } catch {}

    // Header dinamis
    const headerRow: string[] = (rawRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
    const findCol = (...keywords: string[]): number => {
      return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const colTimestamp = findCol('timestamp') !== -1 ? findCol('timestamp') : 0;
    const colNama = findCol('nama karyawan', 'nama') !== -1 ? findCol('nama karyawan', 'nama') : 1;
    const colTglIzin = findCol('tanggal izin', 'tgl izin') !== -1 ? findCol('tanggal izin', 'tgl izin') : 2;
    const colDurasi = findCol('lamanya izin', 'lama izin', 'durasi') !== -1 ? findCol('lamanya izin', 'lama izin', 'durasi') : 3;
    const colShift = findCol('shift karyawan', 'shift') !== -1 ? findCol('shift karyawan', 'shift') : 4;
    const colAlasan = findCol('alasan izin', 'alasan') !== -1 ? findCol('alasan izin', 'alasan') : 5;
    const colPengawas = findCol('nama dari pengawas', 'pengawas') !== -1 ? findCol('nama dari pengawas', 'pengawas') : 6;
    const colNik = findCol('nik id card', 'nik') !== -1 ? findCol('nik id card', 'nik') : 7;
    const colJabatan = findCol('jabatan') !== -1 ? findCol('jabatan') : 8;
    const colJamShift = findCol('jam / shift masuk', 'jam shift', 'masuk bekerja') !== -1 ? findCol('jam / shift masuk', 'jam shift', 'masuk bekerja') : 9;
    const colPenempatan = findCol('penempatan') !== -1 ? findCol('penempatan') : 10;
    const colLampiran = findCol('foto lampiran', 'lampiran', 'bukti') !== -1 ? findCol('foto lampiran', 'lampiran', 'bukti') : 11;
    const colTempatTinggal = findCol('tempat tinggal', 'mess') !== -1 ? findCol('tempat tinggal', 'mess') : 12;

    const parsedItems: SheetLeaveItem[] = [];

    // Iterasi baris data (mulai index 1)
    for (let i = 1; i < rawRows.length; i++) {
      const rowId = `sheet-${i}`;
      if (deletedSheetIds.has(rowId)) continue;

      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawNama = row[colNama];
      const rawNik = row[colNik] || row[colTimestamp]; // fallback
      if (!rawNama && !rawNik) continue;

      const name = String(rawNama || '').trim();
      const nik = String(rawNik || '').trim().toUpperCase();
      const rawTimestamp = row[colTimestamp];
      const rawTglIzin = row[colTglIzin];
      const rawDurasi = row[colDurasi];
      const rawShift = row[colShift];
      const rawAlasan = row[colAlasan];
      const rawPengawas = row[colPengawas];
      const rawJabatan = row[colJabatan];
      const rawJamShift = row[colJamShift];
      const rawPenempatan = row[colPenempatan];
      const rawLampiran = row[colLampiran];
      const rawTempatTinggal = colTempatTinggal !== -1 ? row[colTempatTinggal] : '-';

      const tglAwal = formatExcelDate(rawTglIzin) || (rawTimestamp ? formatExcelDate(rawTimestamp) : '');
      const jumlahHari = parseDurationDays(rawDurasi);

      // Hitung akhir absensi berdasarkan tglAwal + (jumlahHari - 1)
      let tglAkhir = tglAwal;
      if (tglAwal && jumlahHari > 1) {
        try {
          const d = new Date(tglAwal);
          d.setDate(d.getDate() + (jumlahHari - 1));
          tglAkhir = d.toISOString().slice(0, 10);
        } catch {}
      }

      // Normalisasi section / penempatan
      let section = 'Preparation';
      const penempatanStr = String(rawPenempatan || '').toLowerCase();
      if (penempatanStr.includes('lab')) section = 'Laboratory';
      else if (penempatanStr.includes('admin')) section = 'Administration';
      else if (penempatanStr.includes('maint')) section = 'Maintenance';
      else if (penempatanStr.includes('qa') || penempatanStr.includes('mutu')) section = 'Quality Assurance';
      else if (penempatanStr.includes('prep')) section = 'Preparation';
      else if (rawPenempatan) section = String(rawPenempatan).trim();

      // Normalisasi shift akurat dari Google Sheet
      let shift = 'Nonshift';
      const shiftStr = String(rawShift || '').trim().toUpperCase();
      if (shiftStr === 'A' || shiftStr === 'SHIFT A' || shiftStr.startsWith('A ') || shiftStr.endsWith(' A')) shift = 'Shift A';
      else if (shiftStr === 'B' || shiftStr === 'SHIFT B' || shiftStr.startsWith('B ') || shiftStr.endsWith(' B')) shift = 'Shift B';
      else if (shiftStr.includes('NON')) shift = 'Nonshift';
      else if (shiftStr === '1' || shiftStr === 'SHIFT 1') shift = 'Shift A';
      else if (shiftStr === '2' || shiftStr === 'SHIFT 2') shift = 'Shift B';
      else if (shiftStr && shiftStr !== '-' && shiftStr !== 'NULL') shift = shiftStr;

      // Normalisasi nama pengawas dari Google Sheet
      let pengawas = '-';
      if (rawPengawas && String(rawPengawas).trim() && String(rawPengawas).trim() !== '-' && String(rawPengawas).trim().toLowerCase() !== 'null') {
        pengawas = String(rawPengawas).trim();
      }

      // Timestamp created
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
        nik: nik || 'N/A',
        name: name || 'Tanpa Nama',
        jabatan: rawJabatan ? String(rawJabatan).trim() : 'Crew, Preparation & Laboratory',
        section,
        penempatan: rawPenempatan ? String(rawPenempatan).trim() : section,
        tempatTinggal: rawTempatTinggal ? String(rawTempatTinggal).trim() : '-',
        shift,
        jamShift: rawJamShift ? String(rawJamShift).trim() : '',
        awalAbsensi: tglAwal,
        akhirAbsensi: tglAkhir,
        lamanyaIzin: rawDurasi ? String(rawDurasi).trim() : `${jumlahHari} Hari`,
        jumlah: jumlahHari,
        alasanAbsensi: rawAlasan ? String(rawAlasan).trim() : 'Izin Ketidakhadiran',
        pengawasMengetahui: pengawas,
        lampiran: rawLampiran ? String(rawLampiran).trim() : '',
        acc: 'Disetujui',
        accBy: pengawas !== '-' ? pengawas : 'Pengawas Terkait',
        accAt: tglAwal,
        createdAt: createdAtIso,
        updatedAt: createdAtIso
      });
    }

    // Urutkan dari data terbaru ke terlama
    parsedItems.reverse();

    sheetCache = {
      data: parsedItems,
      lastFetchedAt: now,
      totalRows: parsedItems.length,
      spreadsheetId: REKAPAN_IZIN_SPREADSHEET_ID
    };

    console.log(`[Employee Leaves] Successfully parsed ${parsedItems.length} records from Google Sheet.`);
    return parsedItems;
  } catch (error: any) {
    console.error('[Employee Leaves] Error fetching Google Sheet:', error.message);
    return sheetCache.data;
  }
}

// 1. GET /api/employee-leaves - Ambil seluruh rekapan perizinan karyawan (Google Sheet + Database)
employeeLeavesRouter.get("/api/employee-leaves", async (req, res) => {
  try {
    ensureEmployeeLeavesTable().catch(() => {});

    const {
      section,
      shift,
      acc,
      search,
      startDate,
      endDate,
      year,
      source,
      pengawas
    } = req.query as {
      section?: string;
      shift?: string;
      acc?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      year?: string;
      source?: string;
      pengawas?: string;
    };

    // 1. Ambil data dari Google Sheet (di-cache) & sinkronkan kategori izin dari Google Sheet Rooster
    const forceRefresh = req.query.force === "true" || req.query.refresh === "true";
    const [sheetData, rosterLeaveMap] = await Promise.all([
      fetchGoogleSheetLeaves(forceRefresh),
      fetchRoosterLeaveCodes(forceRefresh)
    ]);

    // 2. Ambil data dari Database Postgres & Master Employees untuk penentuan Golongan
    let dbLeaves: any[] = [];
    let empGolMap = new Map<string, { gol?: string; section?: string; jabatan?: string; shift?: string }>();
    try {
      const [leavesRes, empsRes] = await Promise.all([
        db.select().from(employeeLeaveRequests).orderBy(desc(employeeLeaveRequests.id)),
        db.select({
          nik: employees.nik,
          gol: employees.gol,
          jobGrade: employees.jobGrade,
          section: employees.section,
          jabatan: employees.jabatan,
          shift: employees.shift
        }).from(employees)
      ]);
      dbLeaves = leavesRes;
      empsRes.forEach(e => {
        if (e.nik) {
          empGolMap.set(String(e.nik).trim().toUpperCase(), {
            gol: e.gol || e.jobGrade || undefined,
            section: e.section || undefined,
            jabatan: e.jabatan || undefined,
            shift: e.shift || undefined
          });
        }
      });
    } catch (e: any) {
      console.warn('[Employee Leaves] DB select notice:', e.message);
    }

    // Format dbLeaves agar selaras dengan interface (jangan beri default yang merusak override)
    const formattedDbLeaves: SheetLeaveItem[] = dbLeaves.map(d => {
      const kat = resolveKategoriIzin(
        d.nik,
        d.awalAbsensi,
        d.akhirAbsensi,
        d.alasanAbsensi,
        (d as any).kategoriIzin || (d as any).kategori_izin,
        rosterLeaveMap
      );
      return {
        id: d.id,
        sheetRowId: d.sheetRowId,
        source: 'web',
        nik: d.nik,
        name: d.name,
        jabatan: d.jabatan || '',
        section: d.section || 'Preparation',
        penempatan: d.penempatan || d.section || 'Preparation',
        tempatTinggal: d.tempatTinggal || '-',
        shift: d.shift || '',
        jamShift: d.jamShift || '',
        awalAbsensi: d.awalAbsensi,
        akhirAbsensi: d.akhirAbsensi,
        lamanyaIzin: d.lamanyaIzin || `${d.jumlah || 1} Hari`,
        jumlah: d.jumlah || 1,
        kategoriIzin: kat,
        alasanAbsensi: d.alasanAbsensi,
        pengawasMengetahui: d.pengawasMengetahui || '',
        lampiran: d.lampiran || '',
        acc: d.acc || 'Pending',
        accBy: d.accBy || '',
        accAt: d.accAt || '',
        catatan: d.catatan || '',
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString()
      };
    });

    // Pisahkan override sheet dari pure web records & bersihkan data yang telah dihapus dari Google Sheet
    const sheetOverrides = new Map<string, SheetLeaveItem>();
    const pureWebLeaves: SheetLeaveItem[] = [];

    // Himpunan ID baris Google Sheet yang valid saat ini
    const validSheetRowIds = new Set(sheetData.map(s => String(s.id)));
    // Himpunan kunci data resmi dari Google Sheet saat ini: NIK + tanggal awal
    const existingSheetKeySet = new Set(
      sheetData.map(s => `${String(s.nik || '').trim().toUpperCase()}_${String(s.awalAbsensi || '').trim()}`)
    );
    const orphanedDbIds: number[] = [];

    formattedDbLeaves.forEach(d => {
      // 1. Abaikan dan bersihkan record kosong / rusak
      if (!d.name || !d.name.trim() || !d.nik || !d.nik.trim()) {
        orphanedDbIds.push(Number(d.id));
        return;
      }

      if (d.sheetRowId) {
        // Cek apakah data baris ini masih ada di Google Sheet
        if (validSheetRowIds.has(d.sheetRowId)) {
          sheetOverrides.set(d.sheetRowId, d);
        } else {
          // Baris ini telah DIHAPUS dari Google Sheet!
          // Maka otomatis bersihkan override-nya dari DB agar tidak menjadi hantu
          orphanedDbIds.push(Number(d.id));
        }
      } else {
        // Pure web record (source: 'web')
        const leaveKey = `${String(d.nik || '').trim().toUpperCase()}_${String(d.awalAbsensi || '').trim()}`;
        // Jika data ini SUDAH ADA di Google Sheet (seperti duplikasi Erwin Asnawi row 16 vs sheet-1237):
        // Hapus duplikasi dari DB agar tampilan 100% konsisten dengan Google Sheet!
        if (existingSheetKeySet.has(leaveKey)) {
          orphanedDbIds.push(Number(d.id));
        } else {
          // Jika data web ini TIDAK ADA di Google Sheet:
          // Google Sheet adalah master database rekapan. Jika record web ini berumur lebih dari 30 menit
          // dan tidak ada di Google Sheet (misalnya telah dihapus dari Google Sheet oleh admin):
          // Otomatis hilangkan / hapus dari DB!
          const recordAgeMs = Date.now() - new Date(d.createdAt).getTime();
          if (recordAgeMs > 30 * 60 * 1000) {
            orphanedDbIds.push(Number(d.id));
          } else {
            pureWebLeaves.push(d);
          }
        }
      }
    });

    // Jalankan auto-pruning data yang telah dihapus dari Google Sheet secara asynchronous
    const idsToDelete = orphanedDbIds.filter(id => !isNaN(id) && id > 0);
    if (idsToDelete.length > 0) {
      db.delete(employeeLeaveRequests)
        .where(inArray(employeeLeaveRequests.id, idsToDelete))
        .catch(err => console.warn('[Employee Leaves] Auto-cleanup notice:', err.message));
    }

    // Terapkan override dari DB ke data Google Sheet jika diedit oleh Administrasi
    const mergedSheetData: SheetLeaveItem[] = sheetData.map(s => {
      const cleanNik = String(s.nik || '').trim().toUpperCase();
      const empMeta = empGolMap.get(cleanNik);

      // Sinkronkan Shift: Jika di sheet kosong atau Nonshift, cek apakah karyawan terdaftar Shift A atau Shift B di master employee
      let finalShift = s.shift;
      if (!finalShift || finalShift === 'Nonshift') {
        const masterShift = String(empMeta?.shift || '').trim().toUpperCase();
        if (masterShift === 'A' || masterShift === 'SHIFT A') finalShift = 'Shift A';
        else if (masterShift === 'B' || masterShift === 'SHIFT B') finalShift = 'Shift B';
      }

      const override = sheetOverrides.get(String(s.id));
      if (override) {
        // Hanya timpa shift jika override memiliki shift valid (bukan sekadar default Nonshift/kosong)
        const validOverrideShift = (override.shift && override.shift !== 'Nonshift' && override.shift !== '-') ? override.shift : '';
        // Hanya timpa pengawas jika override memiliki nama pengawas valid (bukan '-' atau kosong)
        const validOverridePengawas = (override.pengawasMengetahui && override.pengawasMengetahui !== '-' && override.pengawasMengetahui.trim() !== '') ? override.pengawasMengetahui : '';

        const kat = resolveKategoriIzin(
          override.nik || s.nik,
          override.awalAbsensi || s.awalAbsensi,
          override.akhirAbsensi || s.akhirAbsensi,
          override.alasanAbsensi || s.alasanAbsensi,
          override.kategoriIzin,
          rosterLeaveMap
        );

        return {
          ...s,
          nik: (override.nik && override.nik.trim()) ? override.nik : s.nik,
          name: (override.name && override.name.trim()) ? override.name : s.name,
          jabatan: (override.jabatan && override.jabatan.trim()) ? override.jabatan : s.jabatan,
          section: (override.section && override.section.trim()) ? override.section : s.section,
          penempatan: (override.penempatan && override.penempatan.trim()) ? override.penempatan : s.penempatan,
          tempatTinggal: (override.tempatTinggal && override.tempatTinggal !== '-') ? override.tempatTinggal : (s.tempatTinggal || '-'),
          shift: validOverrideShift || finalShift,
          jamShift: override.jamShift || s.jamShift,
          awalAbsensi: override.awalAbsensi || s.awalAbsensi,
          akhirAbsensi: override.akhirAbsensi || s.akhirAbsensi,
          lamanyaIzin: override.lamanyaIzin || s.lamanyaIzin,
          jumlah: override.jumlah || s.jumlah,
          kategoriIzin: kat,
          alasanAbsensi: (override.alasanAbsensi && override.alasanAbsensi.trim()) ? override.alasanAbsensi : s.alasanAbsensi,
          pengawasMengetahui: validOverridePengawas || s.pengawasMengetahui,
          acc: override.acc || s.acc,
          accBy: override.accBy || s.accBy,
          accAt: override.accAt || s.accAt,
          catatan: override.catatan || s.catatan,
          updatedAt: override.updatedAt || s.updatedAt,
          isEdited: true
        } as any;
      }

      const kat = resolveKategoriIzin(
        s.nik,
        s.awalAbsensi,
        s.akhirAbsensi,
        s.alasanAbsensi,
        s.kategoriIzin,
        rosterLeaveMap
      );

      return {
        ...s,
        shift: finalShift,
        kategoriIzin: kat
      };
    });

    // Gabungkan: Catatan lokal web berada paling atas, diikuti catatan Google Sheet
    let allLeaves: SheetLeaveItem[] = [...pureWebLeaves, ...mergedSheetData];

    // Filter berdasarkan parameter jika ada
    if (source && source !== 'ALL') {
      allLeaves = allLeaves.filter(item => item.source === source);
    }

    if (section && section !== 'ALL' && section.trim()) {
      const secTerm = section.trim().toLowerCase();
      allLeaves = allLeaves.filter(item => 
        (item.section && item.section.toLowerCase().includes(secTerm)) ||
        (item.penempatan && item.penempatan.toLowerCase().includes(secTerm))
      );
    }

    if (shift && shift !== 'ALL' && shift.trim()) {
      const shiftTerm = shift.trim().toLowerCase();
      allLeaves = allLeaves.filter(item => 
        item.shift && item.shift.toLowerCase().includes(shiftTerm)
      );
    }

    if (acc && acc !== 'ALL' && acc.trim()) {
      const accTerm = acc.trim().toLowerCase();
      allLeaves = allLeaves.filter(item => 
        item.acc && item.acc.toLowerCase().includes(accTerm)
      );
    }

    if (pengawas && pengawas.trim()) {
      const pTerm = pengawas.trim().toLowerCase();
      allLeaves = allLeaves.filter(item => 
        item.pengawasMengetahui && item.pengawasMengetahui.toLowerCase().includes(pTerm)
      );
    }

    if (startDate && startDate.trim() && endDate && endDate.trim()) {
      const sDate = startDate.trim();
      const eDate = endDate.trim();
      allLeaves = allLeaves.filter(item => {
        const start = item.awalAbsensi || item.createdAt.slice(0, 10);
        const end = item.akhirAbsensi || start;
        return start <= eDate && end >= sDate;
      });
    } else if (startDate && startDate.trim()) {
      const sDate = startDate.trim();
      allLeaves = allLeaves.filter(item => {
        const end = item.akhirAbsensi || item.awalAbsensi || item.createdAt.slice(0, 10);
        return end >= sDate;
      });
    } else if (endDate && endDate.trim()) {
      const eDate = endDate.trim();
      allLeaves = allLeaves.filter(item => {
        const start = item.awalAbsensi || item.createdAt.slice(0, 10);
        return start <= eDate;
      });
    }

    if (year && year.trim()) {
      const yTerm = year.trim();
      allLeaves = allLeaves.filter(item => 
        (item.awalAbsensi && item.awalAbsensi.startsWith(yTerm)) ||
        (item.createdAt && item.createdAt.startsWith(yTerm))
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allLeaves = allLeaves.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.nik && item.nik.toLowerCase().includes(q)) ||
        (item.jabatan && item.jabatan.toLowerCase().includes(q)) ||
        (item.alasanAbsensi && item.alasanAbsensi.toLowerCase().includes(q)) ||
        (item.pengawasMengetahui && item.pengawasMengetahui.toLowerCase().includes(q))
      );
    }

    // Sematkan informasi Golongan ke setiap item izin
    allLeaves = allLeaves.map(item => {
      const cleanNik = String(item.nik || '').trim().toUpperCase();
      const matched = empGolMap.get(cleanNik);
      return {
        ...item,
        gol: item.gol || matched?.gol || 'I'
      };
    });

    // Summary metrics
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let sakitCount = 0;
    let keluargaCount = 0;

    allLeaves.forEach((l) => {
      const st = (l.acc || '').toLowerCase();
      if (st.includes('setuju') || st === 'acc') approvedCount++;
      else if (st.includes('tolak')) rejectedCount++;
      else pendingCount++;

      const alasan = (l.alasanAbsensi || '').toLowerCase();
      if (alasan.includes('sakit') || alasan.includes('demam') || alasan.includes('klinik') || alasan.includes('badan')) {
        sakitCount++;
      }
      if (alasan.includes('keluarga') || alasan.includes('anak') || alasan.includes('istri') || alasan.includes('orang tua')) {
        keluargaCount++;
      }
    });

    res.json({
      status: "success",
      data: allLeaves,
      summary: {
        total: allLeaves.length,
        sheetTotalRows: sheetCache.totalRows,
        webTotalRows: formattedDbLeaves.length,
        pendingCount,
        approvedCount,
        rejectedCount,
        sakitCount,
        keluargaCount,
        lastSyncAt: sheetCache.lastFetchedAt ? new Date(sheetCache.lastFetchedAt).toISOString() : null,
        spreadsheetId: REKAPAN_IZIN_SPREADSHEET_ID
      }
    });
  } catch (error: any) {
    console.error("[Employee Leaves GET] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal memuat rekapan perizinan karyawan."
    });
  }
});

// 2. POST /api/employee-leaves/sync-sheet - Paksa sinkronisasi ulang data langsung dari Google Sheet PrepLab Cloud
employeeLeavesRouter.post("/api/employee-leaves/sync-sheet", async (req, res) => {
  try {
    const data = await fetchGoogleSheetLeaves(true);
    res.json({
      status: "success",
      message: `Berhasil menyinkronkan ${data.length} data rekapan izin langsung dari Google Sheet PrepLab Cloud.`,
      totalRows: data.length,
      lastSyncAt: new Date(sheetCache.lastFetchedAt).toISOString(),
      spreadsheetId: REKAPAN_IZIN_SPREADSHEET_ID
    });
  } catch (error: any) {
    console.error("[Employee Leaves Sync Sheet] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal menyinkronkan data dari Google Sheet."
    });
  }
});

// 3. GET /api/employee-leaves/supervisors - Daftar Pengawas Gol II - V untuk Autosearch Form Izin
employeeLeavesRouter.get("/api/employee-leaves/supervisors", async (req, res) => {
  try {
    const supervisorRows = await db
      .select({
        nik: employees.nik,
        name: employees.name,
        jabatan: employees.jabatan,
        gol: employees.gol,
        jobGrade: employees.jobGrade,
        section: employees.section,
        shift: employees.shift
      })
      .from(employees)
      .where(
        or(
          sql`${employees.gol} IN ('2', '3', '4', '5', 'II', 'III', 'IV', 'V')`,
          ilike(employees.gol, '%II%'),
          ilike(employees.gol, '%III%'),
          ilike(employees.gol, '%IV%'),
          ilike(employees.gol, '%V%'),
          ilike(employees.jabatan, '%supervisor%'),
          ilike(employees.jabatan, '%foreman%'),
          ilike(employees.jabatan, '%superintendent%'),
          ilike(employees.jabatan, '%manager%'),
          ilike(employees.jabatan, '%spv%')
        )
      )
      .orderBy(employees.name);

    res.json({
      status: "success",
      data: supervisorRows
    });
  } catch (error: any) {
    console.error("[Employee Leaves Supervisors] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal memuat daftar pengawas."
    });
  }
});

// 4. POST /api/employee-leaves - Simpan pelaporan izin baru bergaya Google Form
employeeLeavesRouter.post("/api/employee-leaves", async (req, res) => {
  try {
    ensureEmployeeLeavesTable().catch(() => {});

    const {
      nik,
      name,
      jabatan,
      section,
      penempatan,
      shift,
      jamShift,
      tempatTinggal,
      awalAbsensi,
      akhirAbsensi,
      jumlah,
      lamanyaIzin,
      alasanAbsensi,
      pengawasMengetahui,
      lampiran,
      acc,
      kategoriIzin,
      kategori_izin,
      catatan
    } = req.body;

    if (!nik || !name || !awalAbsensi || !akhirAbsensi || !alasanAbsensi) {
      return res.status(400).json({
        status: "error",
        message: "Kolom NIK, Nama, Tanggal Awal, Tanggal Akhir, dan Alasan Absensi wajib diisi."
      });
    }

    // Hitung jumlah hari otomatis jika tidak dikirim
    let jmlHari = Number(jumlah) || 1;
    if (!jumlah && awalAbsensi && akhirAbsensi) {
      try {
        const d1 = new Date(awalAbsensi).getTime();
        const d2 = new Date(akhirAbsensi).getTime();
        const diffDays = Math.round((d2 - d1) / (1000 * 3600 * 24)) + 1;
        jmlHari = Math.max(1, diffDays);
      } catch {}
    }

    const durasiText = lamanyaIzin ? String(lamanyaIzin).trim() : `${jmlHari} Hari`;

    const katIzin = (kategoriIzin || kategori_izin)
      ? String(kategoriIzin || kategori_izin).trim().toUpperCase()
      : resolveKategoriIzin(nik, awalAbsensi, akhirAbsensi, alasanAbsensi);

    const inserted = await db
      .insert(employeeLeaveRequests)
      .values({
        nik: String(nik).trim().toUpperCase(),
        name: String(name).trim(),
        jabatan: jabatan ? String(jabatan).trim() : null,
        section: section ? String(section).trim() : 'Preparation',
        penempatan: penempatan ? String(penempatan).trim() : (section ? String(section).trim() : 'Preparation'),
        shift: shift ? String(shift).trim() : 'Nonshift',
        jamShift: jamShift ? String(jamShift).trim() : null,
        tempatTinggal: tempatTinggal ? String(tempatTinggal).trim() : null,
        awalAbsensi: String(awalAbsensi).trim(),
        akhirAbsensi: String(akhirAbsensi).trim(),
        jumlah: jmlHari,
        lamanyaIzin: durasiText,
        kategoriIzin: katIzin,
        alasanAbsensi: String(alasanAbsensi).trim(),
        pengawasMengetahui: pengawasMengetahui ? String(pengawasMengetahui).trim() : '-',
        lampiran: lampiran ? String(lampiran).trim() : null,
        acc: acc ? String(acc).trim() : 'Pending',
        catatan: catatan ? String(catatan).trim() : null,
        source: 'web'
      })
      .returning();

    const newRecord = inserted.length > 0 ? inserted[0] : {
      id: Date.now(),
      nik,
      name,
      jabatan,
      section,
      penempatan,
      shift,
      jamShift,
      awalAbsensi,
      akhirAbsensi,
      jumlah: jmlHari,
      lamanyaIzin: durasiText,
      alasanAbsensi,
      pengawasMengetahui,
      lampiran,
      acc: acc || 'Pending',
      source: 'web',
      createdAt: new Date().toISOString()
    };

    res.json({
      status: "success",
      message: "Formulir Pelaporan Izin Karyawan berhasil dikirim dan tersimpan ke dalam rekapan portal.",
      data: newRecord
    });
  } catch (error: any) {
    console.error("[Employee Leaves POST] Error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal menyimpan formulir pelaporan izin karyawan."
    });
  }
});

// 5. PUT /api/employee-leaves/:id/acc - ACC / Approval status oleh HR / Atasan
employeeLeavesRouter.put("/api/employee-leaves/:id/acc", async (req, res) => {
  try {
    ensureEmployeeLeavesTable().catch(() => {});
    const id = Number(req.params.id);
    const { acc, accBy, catatan } = req.body;

    if (!acc) {
      return res.status(400).json({ status: "error", message: "Status ACC wajib ditentukan" });
    }

    const accAtStr = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jayapura',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const updated = await db
      .update(employeeLeaveRequests)
      .set({
        acc: String(acc).trim(),
        accBy: accBy ? String(accBy).trim() : null,
        accAt: accAtStr,
        catatan: catatan !== undefined ? String(catatan).trim() : undefined,
        updatedAt: new Date()
      })
      .where(eq(employeeLeaveRequests.id, id))
      .returning();

    res.json({
      status: "success",
      message: `Status izin berhasil diperbarui menjadi ${acc}`,
      data: updated.length > 0 ? updated[0] : null
    });
  } catch (error: any) {
    console.error("[Employee Leaves ACC PUT] Error:", error);
    res.status(500).json({ status: "error", message: error?.message || "Gagal memperbarui ACC" });
  }
});


// 5b. PUT /api/employee-leaves/:id - Edit perorangan oleh Section Administrasi
employeeLeavesRouter.put("/api/employee-leaves/:id", async (req, res) => {
  try {
    await ensureEmployeeLeavesTable();
    const rawId = req.params.id;
    const {
      nik,
      name,
      jabatan,
      section,
      penempatan,
      shift,
      jamShift,
      tempatTinggal,
      awalAbsensi,
      akhirAbsensi,
      jumlah,
      lamanyaIzin,
      alasanAbsensi,
      pengawasMengetahui,
      kategoriIzin,
      kategori_izin,
      acc,
      accBy,
      catatan
    } = req.body;

    const finalKategori = (kategoriIzin || kategori_izin) ? String(kategoriIzin || kategori_izin).trim().toUpperCase() : undefined;

    let jmlHari = Number(jumlah) || 1;
    if (!jumlah && awalAbsensi && akhirAbsensi) {
      try {
        const d1 = new Date(awalAbsensi).getTime();
        const d2 = new Date(akhirAbsensi).getTime();
        const diffDays = Math.round((d2 - d1) / (1000 * 3600 * 24)) + 1;
        jmlHari = Math.max(1, diffDays);
      } catch {}
    }
    const durasiText = lamanyaIzin ? String(lamanyaIzin).trim() : `${jmlHari} Hari`;

    if (rawId.startsWith('sheet-')) {
      // Cek apakah sudah ada override untuk sheetRowId ini di database
      const existing = await db
        .select()
        .from(employeeLeaveRequests)
        .where(eq(employeeLeaveRequests.sheetRowId, rawId))
        .limit(1);

      let savedRecord: any;
      if (existing.length > 0) {
        const updated = await db
          .update(employeeLeaveRequests)
          .set({
            nik: nik ? String(nik).trim().toUpperCase() : existing[0].nik,
            name: name ? String(name).trim() : existing[0].name,
            jabatan: jabatan !== undefined ? String(jabatan).trim() : existing[0].jabatan,
            section: section !== undefined ? String(section).trim() : existing[0].section,
            penempatan: penempatan !== undefined ? String(penempatan).trim() : existing[0].penempatan,
            shift: shift !== undefined ? String(shift).trim() : existing[0].shift,
            jamShift: jamShift !== undefined ? String(jamShift).trim() : existing[0].jamShift,
            tempatTinggal: tempatTinggal !== undefined ? String(tempatTinggal).trim() : existing[0].tempatTinggal,
            awalAbsensi: awalAbsensi ? String(awalAbsensi).trim() : existing[0].awalAbsensi,
            akhirAbsensi: akhirAbsensi ? String(akhirAbsensi).trim() : existing[0].akhirAbsensi,
            jumlah: jmlHari,
            lamanyaIzin: durasiText,
            kategoriIzin: finalKategori !== undefined ? finalKategori : (existing[0] as any).kategoriIzin,
            alasanAbsensi: alasanAbsensi !== undefined ? String(alasanAbsensi).trim() : existing[0].alasanAbsensi,
            pengawasMengetahui: pengawasMengetahui !== undefined ? String(pengawasMengetahui).trim() : existing[0].pengawasMengetahui,
            acc: acc !== undefined ? String(acc).trim() : existing[0].acc,
            accBy: accBy !== undefined ? String(accBy).trim() : existing[0].accBy,
            catatan: catatan !== undefined ? String(catatan).trim() : existing[0].catatan,
            updatedAt: new Date()
          })
          .where(eq(employeeLeaveRequests.sheetRowId, rawId))
          .returning();
        savedRecord = updated[0];
      } else {
        const inserted = await db
          .insert(employeeLeaveRequests)
          .values({
            sheetRowId: rawId,
            nik: String(nik || '').trim().toUpperCase(),
            name: String(name || '').trim(),
            jabatan: jabatan ? String(jabatan).trim() : null,
            section: section ? String(section).trim() : 'Preparation',
            penempatan: penempatan ? String(penempatan).trim() : (section ? String(section).trim() : 'Preparation'),
            shift: shift ? String(shift).trim() : 'Nonshift',
            jamShift: jamShift ? String(jamShift).trim() : null,
            awalAbsensi: String(awalAbsensi || '').trim(),
            akhirAbsensi: String(akhirAbsensi || '').trim(),
            jumlah: jmlHari,
            lamanyaIzin: durasiText,
            kategoriIzin: finalKategori || null,
            alasanAbsensi: String(alasanAbsensi || '').trim(),
            pengawasMengetahui: pengawasMengetahui ? String(pengawasMengetahui).trim() : '-',
            acc: acc ? String(acc).trim() : 'Disetujui',
            accBy: accBy ? String(accBy).trim() : null,
            catatan: catatan ? String(catatan).trim() : null,
            source: 'web'
          })
          .returning();
        savedRecord = inserted[0];
      }

      return res.json({
        status: 'success',
        message: 'Data izin perorangan berhasil diperbarui dan tersimpan permanen.',
        data: {
          ...savedRecord,
          id: rawId,
          kategoriIzin: finalKategori || savedRecord.kategoriIzin,
          source: 'google_sheet',
          isEdited: true
        }
      });
    } else {
      const numId = Number(rawId);
      if (isNaN(numId)) {
        return res.status(400).json({ status: 'error', message: 'ID tidak valid' });
      }

      const updated = await db
        .update(employeeLeaveRequests)
        .set({
          nik: nik ? String(nik).trim().toUpperCase() : undefined,
          name: name ? String(name).trim() : undefined,
          jabatan: jabatan !== undefined ? String(jabatan).trim() : undefined,
          section: section !== undefined ? String(section).trim() : undefined,
          penempatan: penempatan !== undefined ? String(penempatan).trim() : undefined,
          shift: shift !== undefined ? String(shift).trim() : undefined,
          jamShift: jamShift !== undefined ? String(jamShift).trim() : undefined,
          tempatTinggal: tempatTinggal !== undefined ? String(tempatTinggal).trim() : undefined,
          awalAbsensi: awalAbsensi ? String(awalAbsensi).trim() : undefined,
          akhirAbsensi: akhirAbsensi ? String(akhirAbsensi).trim() : undefined,
          jumlah: jmlHari,
          lamanyaIzin: durasiText,
          kategoriIzin: finalKategori !== undefined ? finalKategori : undefined,
          alasanAbsensi: alasanAbsensi !== undefined ? String(alasanAbsensi).trim() : undefined,
          pengawasMengetahui: pengawasMengetahui !== undefined ? String(pengawasMengetahui).trim() : undefined,
          acc: acc !== undefined ? String(acc).trim() : undefined,
          accBy: accBy !== undefined ? String(accBy).trim() : undefined,
          catatan: catatan !== undefined ? String(catatan).trim() : undefined,
          updatedAt: new Date()
        })
        .where(eq(employeeLeaveRequests.id, numId))
        .returning();

      return res.json({
        status: 'success',
        message: 'Data izin perorangan berhasil diperbarui.',
        data: updated.length > 0 ? updated[0] : null
      });
    }
  } catch (error: any) {
    console.error('[Employee Leaves Edit PUT] Error:', error);
    res.status(500).json({
      status: 'error',
      message: error?.message || 'Gagal memperbarui data izin karyawan.'
    });
  }
});

// 6. DELETE /api/employee-leaves/:id - Hapus catatan izin (Support ID Google Sheet & DB)
employeeLeavesRouter.delete("/api/employee-leaves/:id", async (req, res) => {
  try {
    await ensureEmployeeLeavesTable();
    const rawId = String(req.params.id);

    if (rawId.startsWith('sheet-')) {
      // 1. Simpan ke daftar deleted_sheet_leaves agar tidak muncul lagi
      await db.execute(sql`
        INSERT INTO deleted_sheet_leaves (sheet_row_id)
        VALUES (${rawId})
        ON CONFLICT (sheet_row_id) DO NOTHING;
      `);

      // 2. Hapus override jika ada
      await db.delete(employeeLeaveRequests).where(eq(employeeLeaveRequests.sheetRowId, rawId));

      // 3. Invalidate in-memory sheetCache seketika
      sheetCache.data = sheetCache.data.filter(item => String(item.id) !== rawId);
      sheetCache.totalRows = sheetCache.data.length;

      return res.json({
        status: "success",
        message: "Catatan izin Google Sheet berhasil dihapus dan dihilangkan dari rekapan."
      });
    }

    const numId = Number(rawId);
    if (!isNaN(numId)) {
      await db.delete(employeeLeaveRequests).where(eq(employeeLeaveRequests.id, numId));
      return res.json({ status: "success", message: "Catatan perizinan berhasil dihapus." });
    }

    res.status(400).json({ status: "error", message: "ID catatan izin tidak valid" });
  } catch (error: any) {
    console.error("[Employee Leaves DELETE] Error:", error);
    res.status(500).json({ status: "error", message: error?.message || "Gagal menghapus catatan perizinan" });
  }
});
