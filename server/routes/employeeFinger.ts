export function parseGolonganLevel(val: any, jabatan?: string): number {
  const s = String(val || '').trim().toUpperCase();
  if (s === '5' || s === 'V' || (s.includes('V') && !s.includes('IV'))) return 5;
  if (s === '4' || s === 'IV' || s.includes('IV')) return 4;
  if (s === '3' || s === 'III' || s.includes('III')) return 3;
  if (s === '2' || s === 'II' || s.includes('II')) return 2;
  if (s === '1' || s === 'I' || s.includes('I')) return 1;

  const j = String(jabatan || '').toLowerCase();
  if (j.includes('manager') || j.includes('head') || j.includes('superintendent') || j.includes('spt')) return 5;
  if (j.includes('spv') || j.includes('supervisor')) return 3;
  if (j.includes('foreman') || j.includes('group leader') || j.includes('lead hand') || j.includes('leader')) return 2;
  return 1;
}

import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, sql, and } from "drizzle-orm";
import { employeeFingerRecords, employees, roster } from "../../src/db/schema.js";
import { drive } from "../../google-services.js";
import { isResignedOrNonActiveStatus } from "./employees.js";
import { computeRosterData } from "./roster.js";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

export const employeeFingerRouter = Router();

// ID Google Sheet Rekap Finger Karyawan di folder Administrasi Google Drive PrepLab Cloud
export const REKAP_FINGER_SPREADSHEET_ID =
  process.env.GDRIVE_REKAP_FINGER_SPREADSHEET_ID || "1FSfIhXEPBHowOsjgMvl7kwbHCKwwKUgoUA6qIQX9ys0";

let fingerTableEnsured = false;
export async function ensureEmployeeFingerTable() {
  if (fingerTableEnsured) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS employee_finger_records (
      id SERIAL PRIMARY KEY,
      sheet_row_id TEXT UNIQUE,
      nik TEXT NOT NULL,
      name TEXT NOT NULL,
      pt TEXT,
      section TEXT,
      jabatan TEXT,
      tanggal TEXT NOT NULL,
      jam_masuk TEXT,
      jam_pulang TEXT,
      schedule TEXT,
      alasan_kategori TEXT,
      keterangan_lain TEXT,
      tanda_tangan TEXT,
      catatan TEXT,
      source TEXT DEFAULT 'google_sheet',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_finger_nik ON employee_finger_records(nik);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_finger_tanggal ON employee_finger_records(tanggal);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_finger_sheet_row_id ON employee_finger_records(sheet_row_id);`);
    fingerTableEnsured = true;
  } catch (e: any) {
    console.warn("[Employee Finger] Ensure table warning:", e.message);
  }
}

export interface FingerRecapItem {
  id: string | number;
  sheetRowId: string;
  sheetRowIdx?: number;
  nik: string;
  name: string;
  pt: string;
  section: string;
  jabatan: string;
  tanggal: string; // ISO 'YYYY-MM-DD'
  tanggalDisplay: string; // 'DD/MM/YYYY'
  tanggalDoc: string; // 'DD-MMM-YYYY', e.g. '15-Oct-2026'
  jamMasuk: string; // 'HH:mm' or '-'
  jamPulang: string; // 'HH:mm' or '-'
  schedule: string; // 'D', 'N', 'LS'
  shift?: string;
  alasanKategori: string;
  keteranganLain?: string;
  tandaTangan?: string;
  catatan?: string;
  rawScanMasuk?: string;
  rawScanPulang?: string;
  rawShiftMalam?: string;
  source: 'google_sheet' | 'db' | 'master_csv';
  isValueError?: boolean;
  updatedAt?: string;
}

let sheetFingerCache: {
  data: FingerRecapItem[];
  allActiveEmployees?: any[];
  lastFetchedAt: number;
  totalRows: number;
} = {
  data: [],
  allActiveEmployees: [],
  lastFetchedAt: 0,
  totalRows: 0,
};

// Helper format waktu ke HH:mm atau '-'
function formatTimeString(raw: any): string {
  if (raw === undefined || raw === null) return '-';
  const str = String(raw).trim();
  if (!str || str === '-' || str === '#N/A' || str.toLowerCase() === 'null') return '-';

  // Jika date object atau ISO
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const hours = String(raw.getUTCHours()).padStart(2, '0');
    const mins = String(raw.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  // Jika format "6:26" atau "19:01" atau "06:01"
  const m = str.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const hh = m[1].padStart(2, '0');
    const mm = m[2];
    return `${hh}:${mm}`;
  }

  // Jika decimal serial number misal 0.2513
  if (typeof raw === 'number' && raw > 0 && raw < 1) {
    const totalMinutes = Math.round(raw * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const min = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  return str;
}

// Format tanggal ISO ke '15-Oct-2026'
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDocDate(isoDate: string): string {
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const monStr = EN_MONTHS[monthIdx] || parts[1];
      return `${day}-${monStr}-${year}`;
    }
  } catch {}
  return isoDate;
}

// Helper tanggal dari format cell
function parseCellDate(cell: any): { isoDate: string; displayDate: string; docDate: string } {
  if (!cell) {
    const d = new Date();
    const iso = d.toISOString().slice(0, 10);
    return { isoDate: iso, displayDate: iso, docDate: formatDocDate(iso) };
  }

  // Jika cell.v adalah Date object
  if (cell.v instanceof Date && !isNaN(cell.v.getTime())) {
    // Sheet Halmahera WIT (+9 jam)
    const localMs = cell.v.getTime() + 9 * 60 * 60 * 1000;
    const d = new Date(localMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    return {
      isoDate: iso,
      displayDate: `${day}/${m}/${y}`,
      docDate: `${day}-${EN_MONTHS[d.getUTCMonth()]}-${y}`
    };
  }

  // Jika cell.w seperti '15/10/2026'
  const text = String(cell.w || cell.v || '').trim();
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const mon = dmy[2].padStart(2, '0');
    const yr = dmy[3];
    const iso = `${yr}-${mon}-${day}`;
    const monIdx = parseInt(mon, 10) - 1;
    return {
      isoDate: iso,
      displayDate: `${day}/${mon}/${yr}`,
      docDate: `${day}-${EN_MONTHS[monIdx] || mon}-${yr}`
    };
  }

  // ISO default
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const iso = text.slice(0, 10);
    const parts = iso.split('-');
    const display = `${parts[2]}/${parts[1]}/${parts[0]}`;
    return { isoDate: iso, displayDate: display, docDate: formatDocDate(iso) };
  }

  return { isoDate: text, displayDate: text, docDate: text };
}

// Fetch dan filter data Rekap Finger dari Google Sheet dengan Retensi Data Historis Permanen
export async function fetchGoogleSheetFinger(force = false): Promise<FingerRecapItem[]> {
  const now = Date.now();
  const CACHE_TTL = 15 * 1000; // 15 detik

  if (!force && sheetFingerCache.data.length > 0 && (now - sheetFingerCache.lastFetchedAt < CACHE_TTL)) {
    return sheetFingerCache.data;
  }

  try {
    await ensureEmployeeFingerTable();

    // 1. Ambil data active employees TBP & GPS dari Roster / Employees
    const [rawEmps, rawRosters] = await Promise.all([
      db.select().from(employees),
      computeRosterData().catch(() => [])
    ]);
    const rosterMap = new Map<string, any>();
    const rosterNameMap = new Map<string, any>();
    for (const r of (rawRosters as any[])) {
      if (r.nik) rosterMap.set(String(r.nik).trim().toUpperCase(), r);
      if (r.name) rosterNameMap.set(String(r.name).trim().toLowerCase(), r);
    }
    const activeEmpMap = new Map<string, any>();
    const activeNameMap = new Map<string, any>();

    for (const emp of rawEmps) {
      if (isResignedOrNonActiveStatus(emp)) continue;
      const cleanNik = String(emp.nik || '').toUpperCase().trim();
      const rData = rosterMap.get(cleanNik) || (emp.name ? rosterNameMap.get(emp.name.toLowerCase().trim()) : null);

      // Keterangan PT Karyawan Mengambil data PT dari Roster
      let resolvedPt = rData?.pt || emp.pt || 'TBP';
      resolvedPt = String(resolvedPt).trim().toUpperCase();
      if (!resolvedPt.includes('TBP') && !resolvedPt.includes('GPS')) continue;
      if (resolvedPt.includes('GPS')) resolvedPt = 'GPS';
      else resolvedPt = 'TBP';

      // Shift Karyawan Mengambil data Shift dari Roster: Shift A, Shift B, atau Nonshift
      let sRaw = String(rData?.shift || emp.shift || '').trim().toUpperCase();
      let resolvedShift = 'Nonshift';
      if (sRaw === 'A' || sRaw.includes('SHIFT A')) resolvedShift = 'Shift A';
      else if (sRaw === 'B' || sRaw.includes('SHIFT B')) resolvedShift = 'Shift B';
      else resolvedShift = 'Nonshift';

      const enrichedEmp = {
        ...emp,
        pt: resolvedPt,
        shift: resolvedShift,
        gol: rData?.gol || emp.gol || emp.jobGrade || ''
      };

      if (cleanNik) {
        activeEmpMap.set(cleanNik, enrichedEmp);
      }
      if (emp.name) {
        activeNameMap.set(emp.name.toLowerCase().trim(), enrichedEmp);
      }
    }

    const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatIso = (dStr: string) => {
      const parts = dStr.split('-');
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      const d = parts[2];
      const display = `${d}/${parts[1]}/${y}`;
      const doc = `${d}-${monthsArr[m - 1]}-${y}`;
      return { iso: dStr, display, doc };
    };

    const cleanTime = (tStr: string) => {
      if (!tStr || tStr === '-' || tStr.trim() === '') return '-';
      const parts = tStr.trim().split(':');
      if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
      return tStr.trim();
    };

    const inferSched = (jamMasuk: string, jamPulang: string) => {
      const masukH = parseInt(jamMasuk.split(':')[0], 10);
      const pulangH = parseInt(jamPulang.split(':')[0], 10);
      if ((masukH >= 18 && masukH <= 23) || (pulangH >= 0 && pulangH <= 7)) return 'N';
      return 'D';
    };

    // 2. Ambil data yang SUDAH TERSIMPAN di database (Data Lama yang Tertahan)
    const existingDbRecords = await db.select().from(employeeFingerRecords);
    const existingKeys = new Set<string>(); // Kunci unik: `${cleanNik}_${tanggal}`
    const existingSheetRowIds = new Set<string>();

    for (const r of existingDbRecords) {
      if (r.sheetRowId) existingSheetRowIds.add(r.sheetRowId);
      if (r.nik && r.tanggal) {
        existingKeys.add(`${r.nik.toUpperCase().trim()}_${r.tanggal}`);
      }
    }

    // 3. Masukkan data Master CSV jika belum ada di database (147 catatan rekapan dari 1 Agustus s/d 15 Oktober 2026)
    const masterJsonPath = path.resolve(process.cwd(), 'server/data/masterFingerRecords.json');
    if (fs.existsSync(masterJsonPath)) {
      try {
        const masterRaw = JSON.parse(fs.readFileSync(masterJsonPath, 'utf8'));
        const toInsertMaster: any[] = [];

        for (const r of masterRaw) {
          const cleanNik = String(r.nik || '').toUpperCase().trim();
          const emp = activeEmpMap.get(cleanNik) || activeNameMap.get(String(r.name || '').toLowerCase().trim());
          if (!emp) continue;

          const dt = formatIso(r.tanggal);
          const jm = cleanTime(r.jamMasuk);
          const jp = cleanTime(r.jamPulang);
          const sched = inferSched(jm, jp);
          const sheetRowId = `master_${cleanNik}_${dt.iso}_${r.no}`;
          const recKey = `${cleanNik}_${dt.iso}`;

          if (!existingKeys.has(recKey) && !existingSheetRowIds.has(sheetRowId)) {
            toInsertMaster.push({
              sheetRowId,
              nik: emp.nik,
              name: emp.name,
              pt: emp.pt || (cleanNik.startsWith('02') || cleanNik.startsWith('M02') ? 'GPS' : 'TBP'),
              section: emp.section || 'Preparation & Laboratory',
              jabatan: emp.jabatan || 'Crew, Preparation & Laboratory',
              tanggal: dt.iso,
              jamMasuk: jm,
              jamPulang: jp,
              schedule: sched,
              alasanKategori: r.alasan || 'Masalah Jaringan',
              keteranganLain: '',
              source: 'master_csv'
            });
            existingKeys.add(recKey);
            existingSheetRowIds.add(sheetRowId);
          }
        }

        if (toInsertMaster.length > 0) {
          console.log(`[Employee Finger] Menambahkan ${toInsertMaster.length} data master ke database...`);
          for (let i = 0; i < toInsertMaster.length; i += 50) {
            const chunk = toInsertMaster.slice(i, i + 50);
            await db.insert(employeeFingerRecords).values(chunk);
          }
        }
      } catch (err: any) {
        console.warn('[Employee Finger] Could not seed masterFingerRecords.json:', err.message);
      }
    }

    const sheetValKeys = new Set<string>();

    // 4. Sinkronisasi Data Baru dari Google Sheet di Google Drive (Incremental Merge & Retention)
    if (force || existingDbRecords.length === 0) {
      try {
        console.log(`[Employee Finger] Checking Google Sheet (ID: ${REKAP_FINGER_SPREADSHEET_ID})...`);
        const res = await drive.files.export(
          {
            fileId: REKAP_FINGER_SPREADSHEET_ID,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          },
          { responseType: 'arraybuffer' }
        );

        const buffer = Buffer.from(res.data as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0] || 'Sheet1';
        const sheet = workbook.Sheets[sheetName];

        const toInsertNewSheet: any[] = [];

        for (let r = 2; r <= 3000; r++) {
          const cellI = sheet['I' + r];
          if (!cellI) continue;

          const isValError =
            cellI.t === 'e' ||
            cellI.w === '#VALUE!' ||
            String(cellI.v) === '15' ||
            String(cellI.v || '').toUpperCase().includes('#VAL') ||
            String(cellI.w || '').toUpperCase().includes('#VAL');

          if (!isValError) continue;

          const cellB = sheet['B' + r];
          if (!cellB) continue;
          const sheetNik = String(cellB.w || cellB.v || '').toUpperCase().trim();
          if (!sheetNik) continue;

          const emp = activeEmpMap.get(sheetNik);
          if (!emp) continue;

          const cellD = sheet['D' + r];
          const { isoDate } = parseCellDate(cellD);
          if (!isoDate || isoDate === '-') continue;

          const dupKey = `${sheetNik}_${isoDate}`;
          sheetValKeys.add(dupKey);

          // RETENSI DATA MUTLAK:
          // Jika data NIK + Tanggal SUDAH ADA di database, PERTAHANKAN DATA LAMA!
          // Namun pastikan source diset ke 'google_sheet' agar ditandai resmi sebagai kendala #VALUE!
          if (existingKeys.has(dupKey)) {
            try {
              await db
                .update(employeeFingerRecords)
                .set({ source: 'google_sheet', updatedAt: new Date() })
                .where(and(eq(employeeFingerRecords.nik, sheetNik), eq(employeeFingerRecords.tanggal, isoDate)));
            } catch (uErr: any) {
              // ignore
            }
            continue;
          }

          const rawScanMasuk = formatTimeString(sheet['F' + r]?.w || sheet['F' + r]?.v);
          const rawScanPulang = formatTimeString(sheet['G' + r]?.w || sheet['G' + r]?.v);
          const rawShiftMalam = formatTimeString(sheet['H' + r]?.w || sheet['H' + r]?.v);

          const rawSched = String(sheet['K' + r]?.w || sheet['K' + r]?.v || '').trim().toUpperCase();
          const sched = rawSched || 'D';

          let jamMasuk = '-';
          let jamPulang = '-';

          if (sched === 'D' || sched === 'LS' || sched.startsWith('D') || sched.startsWith('LS')) {
            jamMasuk = rawScanMasuk;
            jamPulang = rawScanPulang;
          } else if (sched === 'N' || sched.startsWith('N')) {
            jamMasuk = rawScanPulang;
            jamPulang = rawShiftMalam;
          } else {
            jamMasuk = rawScanMasuk;
            jamPulang = rawScanPulang;
          }

          let defaultAlasan = 'Masalah Jaringan';
          if (jamMasuk === '-' && jamPulang === '-') {
            defaultAlasan = 'Lupa Finger Masuk dan Pulang';
          } else if (jamMasuk === '-' && jamPulang !== '-') {
            defaultAlasan = 'Lupa Finger Masuk';
          } else if (jamMasuk !== '-' && jamPulang === '-') {
            defaultAlasan = 'Lupa Finger Pulang';
          }

          const sheetRowId = `finger_${sheetNik}_${isoDate}_r${r}`;

          toInsertNewSheet.push({
            sheetRowId,
            nik: sheetNik,
            name: emp.name || String(sheet['C' + r]?.w || sheet['C' + r]?.v || ''),
            pt: emp.pt || (String(sheet['J' + r]?.w || sheet['J' + r]?.v || '').includes('GPS') ? 'GPS' : 'TBP'),
            section: emp.section || 'Preparation & Laboratory',
            jabatan: emp.jabatan || 'Crew, Preparation & Laboratory',
            tanggal: isoDate,
            jamMasuk,
            jamPulang,
            schedule: sched,
            alasanKategori: defaultAlasan,
            keteranganLain: '',
            source: 'google_sheet'
          });
          existingKeys.add(dupKey);
          existingSheetRowIds.add(sheetRowId);
        }

        if (toInsertNewSheet.length > 0) {
          console.log(`[Employee Finger] Menambahkan ${toInsertNewSheet.length} data baru dari Google Sheet ke database.`);
          for (let i = 0; i < toInsertNewSheet.length; i += 50) {
            const chunk = toInsertNewSheet.slice(i, i + 50);
            await db.insert(employeeFingerRecords).values(chunk);
          }
        } else {
          console.log(`[Employee Finger] Tidak ada data baru dari Google Sheet. Seluruh data lama tetap tertahan.`);
        }
      } catch (gErr: any) {
        console.warn('[Employee Finger] Google Sheet live export note:', gErr.message);
      }
    }

    // 5. Muat Seluruh Rekapan dari Database (Data Lama yang Tertahan + Data Baru)
    const allDbRows = await db
      .select()
      .from(employeeFingerRecords)
      .orderBy(desc(employeeFingerRecords.tanggal));

    const items: FingerRecapItem[] = allDbRows.map(r => {
      const dt = formatIso(r.tanggal);
      const cleanNik = String(r.nik || '').trim().toUpperCase();
      const matchedEmp = activeEmpMap.get(cleanNik) || (r.name ? activeNameMap.get(r.name.toLowerCase().trim()) : null);
      
      // Strict: PT dan Shift diambil dari Roster
      const finalPt = matchedEmp ? matchedEmp.pt : (String(r.pt || '').toUpperCase().includes('GPS') ? 'GPS' : 'TBP');
      const finalShift = matchedEmp ? matchedEmp.shift : 'Nonshift';
      const recKey = `${cleanNik}_${r.tanggal}`;
      const isVal = sheetValKeys.has(recKey) || r.source === 'google_sheet';

      return {
        id: r.id,
        sheetRowId: r.sheetRowId || `finger_db_${r.id}`,
        nik: r.nik,
        name: matchedEmp?.name || r.name,
        pt: finalPt,
        shift: finalShift,
        section: r.section || 'Preparation & Laboratory',
        jabatan: r.jabatan || 'Crew, Preparation & Laboratory',
        tanggal: r.tanggal,
        tanggalDisplay: dt.display,
        tanggalDoc: dt.doc,
        jamMasuk: r.jamMasuk || '-',
        jamPulang: r.jamPulang || '-',
        schedule: r.schedule || 'D',
        alasanKategori: r.alasanKategori || 'Masalah Jaringan',
        keteranganLain: r.keteranganLain || '',
        tandaTangan: r.tandaTangan || '',
        catatan: r.catatan || '',
        source: (r.source as any) || 'google_sheet',
        isValueError: isVal
      };
    });

    // Urutkan tanggal terbaru ke terlama, lalu alfabetis nama
    items.sort((a, b) => {
      if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return a.name.localeCompare(b.name);
    });

    const sortedActiveEmployees = Array.from(activeEmpMap.values()).map(e => ({
      nik: e.nik,
      name: e.name,
      pt: e.pt, // Mengambil data PT dari Roster (TBP / GPS)
      shift: e.shift, // Mengambil data Shift dari Roster (Shift A, Shift B, Nonshift)
      section: e.section,
      jabatan: e.jabatan,
      gol: e.gol || e.jobGrade || ''
    })).sort((a, b) => {
      const gA = parseGolonganLevel(a.gol, a.jabatan);
      const gB = parseGolonganLevel(b.gol, b.jabatan);
      if (gB !== gA) return gB - gA; // Gol V ke Gol I
      return a.name.localeCompare(b.name);
    });

    sheetFingerCache = {
      data: items,
      allActiveEmployees: sortedActiveEmployees,
      lastFetchedAt: now,
      totalRows: items.length
    };

    console.log(`[Employee Finger] Total data rekapan aktif (historis + baru): ${items.length} catatan.`);
    return items;
  } catch (error: any) {
    console.error("[Employee Finger] Error fetching records:", error.message);
    return sheetFingerCache.data;
  }
}

// 1. GET /api/employee-finger - Mendapatkan seluruh rekapan finger
employeeFingerRouter.get("/api/employee-finger", async (req, res) => {
  try {
    const {
      search,
      pt,
      schedule,
      alasan,
      startDate,
      endDate,
      tanggal
    } = req.query as Record<string, string>;

    const allItems = await fetchGoogleSheetFinger();

    // Filter di memori
    let filtered = [...allItems];

    if (search) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        item => item.name.toLowerCase().includes(q) || item.nik.toLowerCase().includes(q)
      );
    }

    if (pt && pt !== 'ALL') {
      const ptUpper = pt.toUpperCase();
      filtered = filtered.filter(item => item.pt.toUpperCase() === ptUpper);
    }

    if (schedule && schedule !== 'ALL') {
      const schedUpper = schedule.toUpperCase();
      filtered = filtered.filter(item => item.schedule.toUpperCase().startsWith(schedUpper));
    }

    if (alasan && alasan !== 'ALL') {
      filtered = filtered.filter(item => item.alasanKategori === alasan);
    }

    if (tanggal && tanggal !== 'ALL') {
      filtered = filtered.filter(item => item.tanggal === tanggal || item.tanggalDisplay === tanggal);
    }

    if (startDate) {
      filtered = filtered.filter(item => item.tanggal >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(item => item.tanggal <= endDate);
    }

    // Ekstrak daftar tanggal unik untuk tab per-tanggal
    const uniqueDatesMap = new Map<string, { isoDate: string; displayDate: string; docDate: string; count: number }>();
    for (const item of allItems) {
      const existing = uniqueDatesMap.get(item.tanggal);
      if (existing) {
        existing.count++;
      } else {
        uniqueDatesMap.set(item.tanggal, {
          isoDate: item.tanggal,
          displayDate: item.tanggalDisplay,
          docDate: item.tanggalDoc,
          count: 1
        });
      }
    }
    const uniqueDates = Array.from(uniqueDatesMap.values()).sort((a, b) => b.isoDate.localeCompare(a.isoDate));

    // Ringkasan Statistik KPI
    const stats = {
      totalKasus: allItems.length,
      filteredCount: filtered.length,
      tbpCount: allItems.filter(i => i.pt === 'TBP').length,
      gpsCount: allItems.filter(i => i.pt === 'GPS').length,
      shiftACount: allItems.filter(i => i.shift === 'Shift A').length,
      shiftBCount: allItems.filter(i => i.shift === 'Shift B').length,
      nonshiftCount: allItems.filter(i => i.shift === 'Nonshift').length,
      activeTbpCount: (sheetFingerCache.allActiveEmployees || []).filter(e => e.pt === 'TBP').length,
      activeGpsCount: (sheetFingerCache.allActiveEmployees || []).filter(e => e.pt === 'GPS').length,
      activeShiftACount: (sheetFingerCache.allActiveEmployees || []).filter(e => e.shift === 'Shift A').length,
      activeShiftBCount: (sheetFingerCache.allActiveEmployees || []).filter(e => e.shift === 'Shift B').length,
      activeNonshiftCount: (sheetFingerCache.allActiveEmployees || []).filter(e => e.shift === 'Nonshift').length,
      siangCount: allItems.filter(i => i.schedule === 'D' || i.schedule === 'LS').length,
      malamCount: allItems.filter(i => i.schedule === 'N').length,
      uniqueEmployees: new Set(allItems.map(i => i.nik)).size,
      reasonsCount: {} as Record<string, number>
    };

    for (const i of allItems) {
      stats.reasonsCount[i.alasanKategori] = (stats.reasonsCount[i.alasanKategori] || 0) + 1;
    }

    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
      grandTotal: allItems.length,
      uniqueDates,
      allActiveEmployees: sheetFingerCache.allActiveEmployees,
      stats
    });
  } catch (err: any) {
    console.error("[Employee Finger] Error fetching API:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/employee-finger/sync-sheet - Paksa refresh dari Google Sheet
employeeFingerRouter.post("/api/employee-finger/sync-sheet", async (req, res) => {
  try {
    const data = await fetchGoogleSheetFinger(true);
    res.json({
      success: true,
      message: `Berhasil menyinkronkan ${data.length} catatan Rekap Finger dari Google Sheet PrepLab Cloud!`,
      data
    });
  } catch (err: any) {
    console.error("[Employee Finger] Error force sync:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. PUT /api/employee-finger/update-record - Update Alasan, Keterangan, atau Tanda Tangan
employeeFingerRouter.put("/api/employee-finger/update-record", async (req, res) => {
  try {
    await ensureEmployeeFingerTable();
    const {
      sheetRowId,
      nik,
      name,
      pt,
      section,
      jabatan,
      tanggal,
      jamMasuk,
      jamPulang,
      schedule,
      alasanKategori,
      keteranganLain,
      tandaTangan,
      catatan
    } = req.body;

    if (!sheetRowId && !nik) {
      return res.status(400).json({ success: false, message: "sheetRowId atau nik wajib diisi." });
    }

    // Upsert ke database
    const existing = sheetRowId
      ? await db.select().from(employeeFingerRecords).where(eq(employeeFingerRecords.sheetRowId, sheetRowId))
      : await db.select().from(employeeFingerRecords).where(eq(employeeFingerRecords.nik, nik));

    if (existing && existing.length > 0) {
      const targetId = existing[0].id;
      await db
        .update(employeeFingerRecords)
        .set({
          alasanKategori: alasanKategori !== undefined ? alasanKategori : existing[0].alasanKategori,
          keteranganLain: keteranganLain !== undefined ? keteranganLain : existing[0].keteranganLain,
          jamMasuk: jamMasuk !== undefined ? jamMasuk : existing[0].jamMasuk,
          jamPulang: jamPulang !== undefined ? jamPulang : existing[0].jamPulang,
          tandaTangan: tandaTangan !== undefined ? tandaTangan : existing[0].tandaTangan,
          catatan: catatan !== undefined ? catatan : existing[0].catatan,
          updatedAt: new Date()
        })
        .where(eq(employeeFingerRecords.id, targetId));
    } else {
      await db.insert(employeeFingerRecords).values({
        sheetRowId: sheetRowId || `finger_${nik}_${tanggal || Date.now()}`,
        nik,
        name: name || '',
        pt: pt || 'TBP',
        section: section || 'Preparation & Laboratory',
        jabatan: jabatan || 'Crew, Preparation & Laboratory',
        tanggal: tanggal || new Date().toISOString().slice(0, 10),
        jamMasuk: jamMasuk || '-',
        jamPulang: jamPulang || '-',
        schedule: schedule || 'D',
        alasanKategori: alasanKategori || 'Lupa Finger Masuk',
        keteranganLain: keteranganLain || '',
        tandaTangan: tandaTangan || '',
        catatan: catatan || '',
        source: 'manual'
      });
    }

    // Refresh cache data
    await fetchGoogleSheetFinger(true);

    res.json({
      success: true,
      message: "Data Rekapan Finger berhasil diperbarui dan disimpan permanen!"
    });
  } catch (err: any) {
    console.error("[Employee Finger] Error updating record:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. POST /api/employee-finger/add-record - Tambah baris karyawan manual ke rekapan
employeeFingerRouter.post("/api/employee-finger/add-record", async (req, res) => {
  try {
    await ensureEmployeeFingerTable();
    const {
      nik,
      name,
      pt,
      section,
      jabatan,
      tanggal,
      jamMasuk,
      jamPulang,
      schedule,
      alasanKategori,
      keteranganLain,
      tandaTangan,
      catatan
    } = req.body;

    if (!nik || !tanggal) {
      return res.status(400).json({ success: false, message: "nik dan tanggal wajib diisi." });
    }

    const sheetRowId = `custom_${nik}_${tanggal}_${Date.now()}`;
    await db.insert(employeeFingerRecords).values({
      sheetRowId,
      nik: String(nik).trim().toUpperCase(),
      name: name || '',
      pt: pt || 'TBP',
      section: section || 'Preparation & Laboratory',
      jabatan: jabatan || 'Crew, Preparation & Laboratory',
      tanggal,
      jamMasuk: jamMasuk || '-',
      jamPulang: jamPulang || '-',
      schedule: schedule || 'D',
      alasanKategori: alasanKategori || 'Kendala Transport',
      keteranganLain: keteranganLain || '',
      tandaTangan: tandaTangan || '',
      catatan: catatan || '',
      source: 'manual'
    });

    await fetchGoogleSheetFinger(true);

    res.json({
      success: true,
      message: `Berhasil menambahkan karyawan ${name || nik} ke rekapan tanggal ${tanggal}!`
    });
  } catch (err: any) {
    console.error("[Employee Finger] Error adding record:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. DELETE /api/employee-finger/delete-record - Hapus record tertentu
employeeFingerRouter.delete("/api/employee-finger/delete-record", async (req, res) => {
  try {
    await ensureEmployeeFingerTable();
    const { sheetRowId, id } = req.body;

    if (id) {
      await db.delete(employeeFingerRecords).where(eq(employeeFingerRecords.id, Number(id)));
    } else if (sheetRowId) {
      await db.delete(employeeFingerRecords).where(eq(employeeFingerRecords.sheetRowId, String(sheetRowId)));
    } else {
      return res.status(400).json({ success: false, message: "id atau sheetRowId wajib diberikan." });
    }

    await fetchGoogleSheetFinger(true);

    res.json({
      success: true,
      message: "Data rekapan berhasil dihapus."
    });
  } catch (err: any) {
    console.error("[Employee Finger] Error deleting record:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. POST /api/employee-finger/bulk-import - Simpan batch data hasil import Excel (Tabel Rekap atau Comben TBP/GPS)
employeeFingerRouter.post("/api/employee-finger/bulk-import", async (req, res) => {
  try {
    await ensureEmployeeFingerTable();
    const { items, source = 'import_excel' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Daftar items kosong atau tidak valid." });
    }

    let count = 0;
    for (const item of items) {
      if (!item.nik || !item.tanggal) continue;
      const cleanNik = String(item.nik).trim().toUpperCase();
      const sheetRowId = item.sheetRowId || `imp_${cleanNik}_${item.tanggal}`;

      const existing = await db
        .select()
        .from(employeeFingerRecords)
        .where(eq(employeeFingerRecords.sheetRowId, sheetRowId));

      if (existing && existing.length > 0) {
        await db
          .update(employeeFingerRecords)
          .set({
            name: item.name || existing[0].name,
            pt: item.pt || existing[0].pt,
            jamMasuk: item.jamMasuk !== undefined ? item.jamMasuk : existing[0].jamMasuk,
            jamPulang: item.jamPulang !== undefined ? item.jamPulang : existing[0].jamPulang,
            schedule: item.schedule || existing[0].schedule,
            alasanKategori: item.alasanKategori || existing[0].alasanKategori,
            keteranganLain: item.keteranganLain !== undefined ? item.keteranganLain : existing[0].keteranganLain,
            updatedAt: new Date()
          })
          .where(eq(employeeFingerRecords.id, existing[0].id));
      } else {
        await db.insert(employeeFingerRecords).values({
          sheetRowId,
          nik: cleanNik,
          name: item.name || '',
          pt: item.pt || (cleanNik.startsWith('02') || cleanNik.startsWith('M02') ? 'GPS' : 'TBP'),
          section: item.section || 'Preparation & Laboratory',
          jabatan: item.jabatan || 'Crew, Preparation & Laboratory',
          tanggal: item.tanggal,
          jamMasuk: item.jamMasuk || '-',
          jamPulang: item.jamPulang || '-',
          schedule: item.schedule || 'D',
          alasanKategori: item.alasanKategori || 'Kendala Transport',
          keteranganLain: item.keteranganLain || '',
          source: String(source)
        });
      }
      count++;
    }

    await fetchGoogleSheetFinger(true);

    res.json({
      success: true,
      message: `Berhasil mengimpor dan menyimpan ${count} catatan ke database.`,
      count
    });
  } catch (err: any) {
    console.error("[Employee Finger] Error bulk import:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

