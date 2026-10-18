import { Router } from "express";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { parseMealOrderSheet, type ParsedMealOrderRow } from "../../src/utils/meal-order-import.js";
import { MEAL_ORDER_SEED_CSV } from "../data/mealOrderSeed.js";
import { db, isDbCircuitBroken } from "../../src/db/index.js";
import { and, asc, eq, sql, desc, inArray, notInArray } from "drizzle-orm";
import { mealOrders, employees, roster, mealBungkusDaily } from "../../src/db/schema.js";
import { mealCounts, resolveMealCompany, MEAL_SLOTS, type MealCompany, type MealSlot } from "../../src/utils/meal-bungkus-counts.js";
import { drive } from "../../google-services.js";
import { getTrainingAccess } from "./training.js";
import {
  computeMealOrderByRoster,
  getPossibleRosterDateStrings,
  getPreviousDateString,
  isCatatanDisabledForEmployee,
  isLeaveOrPermissionRosterStatus,
  isTuesdayWednesdaySaturday,
  isWorkOrOffRosterStatus,
  type MealChoice,
  type MealPreference,
} from "../../src/utils/meal-roster-sync.js";
import { fetchRosterSheetForDate } from "../../src/syncRoster.js";
import { isResignedOrNonActiveStatus } from "./employees.js";

// ===== Orderan Makanan =====
// Satu baris per karyawan per tanggal. Kantin ditandai 'K', Lapangan berisi jumlah porsi.
// Lihat: semua akun login · Ubah: Developer & Section Administrasi (sama dengan hak kelola Database Training)
export const mealOrdersRouter = Router();

// Kolom yang boleh diisi dari form / edit sel
const EDITABLE_FIELDS = [
  'sortNo', 'nama', 'statusMess', 'pt', 'shift', 'section', 'statusKerja', 'sahur', 'tidakPuasa', 'tempatTinggal', 'shiftKerja',
  'pagiKantin', 'pagiLapangan', 'sahurKantin', 'sahurLapangan', 'siangKantin', 'siangLapangan', 'soreKantin', 'soreLapangan', 'takjilLapangan', 'malamLapangan',
  'batchPagi', 'batchSore', 'status', 'keteranganLapor', 'catatan', 'pilihanPagi', 'pilihanSore',
] as const;
type EditableField = typeof EDITABLE_FIELDS[number];
const BOOL_FIELDS: EditableField[] = [];

let ensurePromise: Promise<void> | null = null;
export function ensureMealOrdersTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS meal_orders (
        id SERIAL PRIMARY KEY,
        order_date DATE NOT NULL,
        sort_no INTEGER,
        nik TEXT NOT NULL,
        nama TEXT NOT NULL,
        status_mess TEXT,
        pt TEXT,
        shift TEXT,
        section TEXT,
        status_kerja TEXT,
        sahur TEXT,
        tidak_puasa TEXT,
        tempat_tinggal TEXT,
        shift_kerja TEXT,
        pagi_kantin TEXT,
        pagi_lapangan TEXT,
        siang_kantin TEXT,
        siang_lapangan TEXT,
        sore_kantin TEXT,
        sore_lapangan TEXT,
        takjil_lapangan TEXT,
        malam_lapangan TEXT,
        konfirmasi_pagi BOOLEAN DEFAULT FALSE,
        konfirmasi_sore BOOLEAN DEFAULT FALSE,
        updated_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_orders_date_nik ON meal_orders (order_date, nik)`);
      // Rekapan Bungkusan harian (snapshot per tanggal × perusahaan × waktu makan)
      await db.execute(sql`CREATE TABLE IF NOT EXISTS meal_bungkus_daily (
        id SERIAL PRIMARY KEY,
        order_date DATE NOT NULL,
        company TEXT NOT NULL,
        slot TEXT NOT NULL,
        lapangan INTEGER NOT NULL DEFAULT 0,
        bungkus_kantin INTEGER NOT NULL DEFAULT 0,
        makan_kantin INTEGER NOT NULL DEFAULT 0,
        karyawan INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_bungkus_daily_key ON meal_bungkus_daily (order_date, company, slot)`);
      // Kolom tambahan sesuai sheet Meal_Order.csv
      await db.execute(sql`ALTER TABLE meal_orders
        ADD COLUMN IF NOT EXISTS batch_pagi TEXT,
        ADD COLUMN IF NOT EXISTS batch_sore TEXT,
        ADD COLUMN IF NOT EXISTS status TEXT,
        ADD COLUMN IF NOT EXISTS keterangan_lapor TEXT,
        ADD COLUMN IF NOT EXISTS catatan TEXT,
        ADD COLUMN IF NOT EXISTS pilihan_pagi TEXT,
        ADD COLUMN IF NOT EXISTS pilihan_sore TEXT,
        ADD COLUMN IF NOT EXISTS sahur_kantin TEXT,
        ADD COLUMN IF NOT EXISTS sahur_lapangan TEXT`);
      // Seed sekali: data Meal_Order.csv (Rabu, 14 Okt 2026). Penanda di app_settings agar data yang sudah diedit tidak tertimpa.
      try {
        await seedMealOrdersOnce();
      } catch (e: any) {
        console.error("[MealOrders] Seed gagal:", e.message);
      }
    })().catch((e: any) => {
      ensurePromise = null;
      console.error("[MealOrders] Ensure table failed:", e.message);
      throw e;
    });
  }
  return ensurePromise;
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const toSnake = (s: string) => s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);

// Karyawan Nonaktif / Resign / PHK / Mutasi di Database Karyawan dikeluarkan dari Orderan Makanan.
// Baris lamanya tidak dihapus — cukup disaring, sehingga muncul lagi bila statusnya diaktifkan kembali.
async function getInactiveNiks(): Promise<Set<string>> {
  if (isDbCircuitBroken()) return new Set();
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000));
    const rows: any = await Promise.race([
      db.select({ nik: employees.nik, statusKaryawan: employees.statusKaryawan, section: employees.section }).from(employees),
      timeoutPromise
    ]);
    return new Set(rows.filter((e: any) => e.nik && isResignedOrNonActiveStatus(e)).map((e: any) => e.nik.toUpperCase().trim()));
  } catch {
    return new Set();
  }
}
const isActiveRow = (inactive: Set<string>) => (r: { nik: string }) => !inactive.has(String(r.nik || '').toUpperCase().trim());

// Simpan banyak baris sekaligus (import / seed) — upsert per (tanggal, NIK), per 200 baris
// onlyFields: hanya kolom ini yang menimpa baris yang sudah ada (import Excel = kolom yang ada di file); kolom lain dipertahankan
async function bulkUpsertMealOrders(date: string, rows: ParsedMealOrderRow[], updatedBy: string, onlyFields?: readonly string[]) {
  const now = new Date();
  let saved = 0;
  const setFields = onlyFields ? EDITABLE_FIELDS.filter(f => f === 'nama' || f === 'sortNo' || onlyFields.includes(f)) : EDITABLE_FIELDS;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map(r => ({ ...r, orderDate: date, updatedBy, updatedAt: now }));
    const res = await db.insert(mealOrders).values(chunk)
      .onConflictDoUpdate({
        target: [mealOrders.orderDate, mealOrders.nik],
        // Pilihan Catatan & Tempat Tinggal tidak boleh hilang tertimpa kosong
        // Kolom PT dikunci: tidak boleh ditimpa oleh import harian biasa kecuali saat import profil karyawan
        set: Object.fromEntries([...setFields, 'updatedBy', 'updatedAt'].map(f => [f, f.startsWith('pilihan')
          ? sql.raw(`COALESCE(excluded.${toSnake(f)}, meal_orders.${toSnake(f)})`)
          : f === 'tempatTinggal'
          ? sql.raw(`COALESCE(NULLIF(TRIM(excluded.tempat_tinggal), ''), meal_orders.tempat_tinggal)`)
          : f === 'pt' && !updatedBy.startsWith('import-profile')
          ? sql.raw(`COALESCE(meal_orders.pt, excluded.pt)`)
          : sql.raw(`excluded.${toSnake(f)}`)])),
      })
      .returning({ id: mealOrders.id });
    saved += res.length;
  }
  return saved;
}

const MEAL_SEED_MARKER = 'seed_meal_orders_2026_10_14';
async function seedMealOrdersOnce() {
  const claimed = await db.execute(sql`INSERT INTO app_settings (setting_key, setting_value, description)
    VALUES (${MEAL_SEED_MARKER}, 'running', 'Seed Orderan Makanan dari Meal_Order.csv')
    ON CONFLICT (setting_key) DO NOTHING RETURNING id;`);
  if (!claimed.rows?.length) return;
  try {
    const parsed = parseMealOrderSheet(Papa.parse<unknown[]>(MEAL_ORDER_SEED_CSV, { skipEmptyLines: true }).data);
    if (parsed?.date && parsed.rows.length) {
      // Jangan timpa tanggal yang sudah diisi manual
      const [{ count }] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(mealOrders).where(eq(mealOrders.orderDate, parsed.date));
      if (count === 0) {
        const saved = await bulkUpsertMealOrders(parsed.date, parsed.rows, 'seed:Meal_Order.csv');
        console.log(`[MealOrders] Seeded ${saved} baris untuk ${parsed.date}`);
      }
    }
    await db.execute(sql`UPDATE app_settings SET setting_value = 'done', updated_at = NOW() WHERE setting_key = ${MEAL_SEED_MARKER};`);
  } catch (e) {
    await db.execute(sql`DELETE FROM app_settings WHERE setting_key = ${MEAL_SEED_MARKER};`);
    throw e;
  }
}

// ===== Sinkron ke Google Sheets "Meal Order" (folder Administration di PrepLab Cloud) =====
// File dibuat/diperbarui lewat Drive API: workbook Excel diunggah & dikonversi otomatis jadi Google Sheets.
// Isi: tab "Rekap" (total per tanggal) + satu tab per tanggal dengan kolom sama seperti sheet order makan.
const MEAL_SHEET_NAME = 'Meal Order';
const ADMIN_FOLDER_ID = process.env.GDRIVE_ADMINISTRATION_FOLDER_ID || '1CUO6uL6VubERhfU4SPouQeY1o675zyuP';
const GSHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET_MAX_DATES = 60; // tanggal terbaru yang ditulis ke Google Sheets

const MEAL_COLUMNS: { key: keyof typeof mealOrders.$inferSelect; group: string; label: string; kind: 'kantin' | 'lapangan' }[] = [
  { key: 'pagiKantin', group: 'Pagi', label: 'Kantin', kind: 'kantin' },
  { key: 'pagiLapangan', group: 'Pagi', label: 'Lapangan', kind: 'lapangan' },
  { key: 'sahurKantin', group: 'Sahur', label: 'Kantin', kind: 'kantin' },
  { key: 'sahurLapangan', group: 'Sahur', label: 'Lapangan', kind: 'lapangan' },
  { key: 'siangKantin', group: 'Siang', label: 'Kantin', kind: 'kantin' },
  { key: 'siangLapangan', group: 'Siang', label: 'Lapangan', kind: 'lapangan' },
  { key: 'soreKantin', group: 'Sore', label: 'Kantin', kind: 'kantin' },
  { key: 'soreLapangan', group: 'Sore', label: 'Lapangan', kind: 'lapangan' },
  { key: 'takjilLapangan', group: 'Takjil', label: 'Lapangan', kind: 'lapangan' },
  { key: 'malamLapangan', group: 'Malam', label: 'Lapangan', kind: 'lapangan' },
];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const ymd = (d: unknown) => String(d).slice(0, 10);
const parseYmd = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)); };
const shiftDate = (d: string, days: number) => { const x = parseYmd(d); x.setUTCDate(x.getUTCDate() + days); return x.toISOString().slice(0, 10); };
const dayName = (d: string) => DAYS[new Date(`${d}T00:00:00Z`).getUTCDay()];
const longDate = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return `${dd} ${MONTHS[m - 1]} ${y}`; };
const portions = (v: unknown) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };
const sumOf = (rows: any[], k: string) => rows.reduce((s, r) => s + portions(r[k]), 0);
const colTotal = (rows: any[], c: typeof MEAL_COLUMNS[number]) =>
  rows.reduce((s, r) => s + (c.kind === 'kantin' ? (String(r[c.key] || '').trim() ? 1 : 0) : portions(r[c.key])), 0);

async function buildMealWorkbook(): Promise<Buffer> {
  const dateRows = await db.select({ date: mealOrders.orderDate }).from(mealOrders)
    .groupBy(mealOrders.orderDate).orderBy(desc(mealOrders.orderDate)).limit(SHEET_MAX_DATES);
  const dates = dateRows.map(d => ymd(d.date));
  const inactive = await getInactiveNiks();
  const all = (dates.length
    ? await db.select().from(mealOrders).where(inArray(mealOrders.orderDate, dates))
        .orderBy(desc(mealOrders.orderDate), sql`${mealOrders.sortNo} ASC NULLS LAST`, asc(mealOrders.nama))
    : []).filter(isActiveRow(inactive));
  const byDate = new Map<string, typeof all>();
  all.forEach(r => { const k = ymd(r.orderDate); byDate.set(k, [...(byDate.get(k) || []), r]); });

  const wb = XLSX.utils.book_new();
  // Tab Rekap: total order per tanggal
  const rekap: (string | number)[][] = [
    ['Tanggal', 'Hari', 'Jumlah Karyawan', ...MEAL_COLUMNS.map(c => `${c.group} - ${c.label}`), '1 (B.Pagi)', '1 (B.Sore)', 'Belum Lapor'],
    ...dates.map(d => {
      const rows = byDate.get(d) || [];
      return [longDate(d), dayName(d), rows.length, ...MEAL_COLUMNS.map(c => colTotal(rows, c)),
        sumOf(rows, 'batchPagi'), sumOf(rows, 'batchSore'), rows.filter(r => r.keteranganLapor).length];
    }),
  ];
  if (dates.length === 0) rekap.push(['Belum ada orderan makanan']);
  const rekapWs = XLSX.utils.aoa_to_sheet(rekap);
  rekapWs['!cols'] = [{ wch: 14 }, { wch: 9 }, { wch: 16 }, ...MEAL_COLUMNS.map(() => ({ wch: 14 })), { wch: 11 }, { wch: 11 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, rekapWs, 'Rekap');

  // Satu tab per tanggal (terbaru dulu), format sama dengan sheet order makan
  for (const d of dates) {
    const rows = byDate.get(d) || [];
    const header1 = ['NO', 'NAMA KARYAWAN', 'NIK', 'Status Mess', 'PT', 'Shift', 'Section', 'Status Kerja Karyawan', 'Keterangan', '', 'Residence', 'Shift (SIANG/MALAM)',
      ...MEAL_COLUMNS.map((c, i) => (i === 0 || MEAL_COLUMNS[i - 1].group !== c.group ? c.group : '')), dayName(d), longDate(d), 'STATUS', 'Keterangan (Belum Lapor)', 'Catatan'];
    const header2 = ['', '', '', '', '', '', '', '', 'Sahur', 'Tidak Puasa', '', '', ...MEAL_COLUMNS.map(c => c.label), '1 (B.Pagi)', '1 (B.Sore)', '', '', ''];
    const body = rows.map((r, i) => [
      i + 1, r.nama, r.nik, r.statusMess || '', r.pt || '', r.shift || '', r.section || '', r.statusKerja || '-', r.sahur || '-', r.tidakPuasa || '-',
      r.tempatTinggal || '', r.shiftKerja || '', ...MEAL_COLUMNS.map(c => (r[c.key] as string | null) || ''), r.batchPagi || '', r.batchSore || '',
      r.status || '', r.keteranganLapor || '', r.catatan || '',
    ]);
    const total = ['', 'TOTAL', '', '', '', '', '', '', '', '', '', '', ...MEAL_COLUMNS.map(c => colTotal(rows, c) || ''),
      sumOf(rows, 'batchPagi'), sumOf(rows, 'batchSore'), '', rows.filter(r => r.keteranganLapor).length || '', ''];
    const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...body, total]);
    ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 8 }, { wch: 6 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 11 }, { wch: 14 }, { wch: 12 },
      ...MEAL_COLUMNS.map(() => ({ wch: 9 })), { wch: 11 }, { wch: 13 }, { wch: 10 }, { wch: 22 }, { wch: 12 }];
    ws['!merges'] = [{ s: { r: 0, c: 8 }, e: { r: 0, c: 9 } }];
    let col = 12;
    for (const g of Array.from(new Set(MEAL_COLUMNS.map(c => c.group)))) {
      const span = MEAL_COLUMNS.filter(c => c.group === g).length;
      if (span > 1) ws['!merges'].push({ s: { r: 0, c: col }, e: { r: 0, c: col + span - 1 } });
      col += span;
    }
    // Nama tab maks. 31 karakter
    XLSX.utils.book_append_sheet(wb, ws, `${d} ${dayName(d)}`.slice(0, 31));
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

let sheetFile: { id: string; url: string } | null = null;
async function findMealSheet(): Promise<{ id: string; url: string } | null> {
  if (sheetFile) return sheetFile;
  const res = await drive.files.list({
    q: `name = '${MEAL_SHEET_NAME}' and mimeType = '${GSHEET_MIME}' and '${ADMIN_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, webViewLink)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const f = res.data.files?.[0];
  if (f?.id) sheetFile = { id: f.id, url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit` };
  return sheetFile;
}

// ----- Status sinkron (disimpan di app_settings agar konsisten antar instance server) -----
// pushedModified: modifiedTime file setelah portal terakhir menulis ke sheet → bila file berubah setelahnya,
// berarti ada edit langsung di Google Sheets yang harus ditarik ke portal dulu.
const SHEET_STATE_KEY = 'meal_order_sheet_state';
interface SheetState { fileId?: string; pushedModified?: string; pushedAt?: string; permKey?: string }
async function readSheetState(): Promise<SheetState> {
  const r = await db.execute(sql`SELECT setting_value FROM app_settings WHERE setting_key = ${SHEET_STATE_KEY} LIMIT 1`);
  try { return JSON.parse(String((r.rows?.[0] as any)?.setting_value || '{}')); } catch { return {}; }
}
async function writeSheetState(state: SheetState) {
  await db.execute(sql`INSERT INTO app_settings (setting_key, setting_value, description)
    VALUES (${SHEET_STATE_KEY}, ${JSON.stringify(state)}, 'Status sinkron Google Sheets Meal Order')
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();`);
}

// ----- Hak akses: hanya Section Administrasi yang bisa mengedit -----
// Akses "siapa saja yang punya link" warisan folder dimatikan; editor = email karyawan Section Administration.
async function adminEditorEmails(): Promise<string[]> {
  const rows = await db.select({ email: employees.email }).from(employees)
    .where(sql`LOWER(COALESCE(${employees.section}, '') || ' ' || COALESCE(${employees.department}, '')) LIKE '%admin%'`);
  return Array.from(new Set(rows.map(r => String(r.email || '').trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))).sort();
}

export async function applyMealSheetPermissions(fileId: string): Promise<{ editors: string[]; publicRemoved: boolean }> {
  const editors = await adminEditorEmails();
  // 1. Putus akses warisan folder (termasuk "anyone with the link")
  try {
    await drive.files.update({ fileId, requestBody: { inheritedPermissionsDisabled: true }, supportsAllDrives: true });
  } catch (e: any) {
    console.warn('[MealOrders] Gagal menonaktifkan akses warisan folder:', e.message);
  }
  const list = await drive.permissions.list({
    fileId, fields: 'permissions(id,type,role,emailAddress,permissionDetails)', supportsAllDrives: true,
  });
  const perms = list.data.permissions || [];
  const isInheritedOnly = (p: typeof perms[number]) => !!p.permissionDetails?.length && p.permissionDetails.every(d => d.inherited);
  // 2. Hapus akses langsung yang bukan Section Administrasi (owner tidak disentuh)
  for (const p of perms) {
    if (p.role === 'owner' || isInheritedOnly(p)) continue;
    const email = String(p.emailAddress || '').toLowerCase();
    const keep = p.type === 'user' && editors.includes(email) && p.role === 'writer';
    if (!keep && p.id) {
      await drive.permissions.delete({ fileId, permissionId: p.id, supportsAllDrives: true }).catch(e => console.warn('[MealOrders] Hapus akses gagal:', e.message));
    }
  }
  // 3. Tambah editor Section Administrasi yang belum punya akses
  const existing = new Set(perms.filter(p => p.type === 'user' && p.role === 'writer' && !isInheritedOnly(p)).map(p => String(p.emailAddress || '').toLowerCase()));
  for (const email of editors) {
    if (existing.has(email)) continue;
    await drive.permissions.create({
      fileId, sendNotificationEmail: false, supportsAllDrives: true,
      requestBody: { type: 'user', role: 'writer', emailAddress: email },
    }).catch(e => console.warn(`[MealOrders] Beri akses edit ke ${email} gagal:`, e.message));
  }
  const after = await drive.permissions.list({ fileId, fields: 'permissions(type)', supportsAllDrives: true });
  return { editors, publicRemoved: !(after.data.permissions || []).some(p => p.type === 'anyone') };
}

// ----- Tarik edit langsung dari Google Sheets ke portal -----
// Tiap tab "YYYY-MM-DD ..." dibaca dengan parser yang sama dengan Import. Baris yang diubah di portal setelah
// sinkron terakhir tidak ditimpa (perubahan portal menang untuk baris tsb).
async function pullSheetEdits(fileId: string, state: SheetState): Promise<number> {
  if (!state.pushedModified) return 0;
  const meta = await drive.files.get({ fileId, fields: 'modifiedTime', supportsAllDrives: true });
  if (!meta.data.modifiedTime || meta.data.modifiedTime <= state.pushedModified) return 0;

  const exported = await drive.files.export({ fileId, mimeType: XLSX_MIME }, { responseType: 'arraybuffer' });
  const wb = XLSX.read(Buffer.from(exported.data as ArrayBuffer), { type: 'buffer' });
  const pushedAt = state.pushedAt ? new Date(state.pushedAt) : new Date(0);
  let changed = 0;
  for (const name of wb.SheetNames) {
    const date = name.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!date) continue;
    const parsed = parseMealOrderSheet(XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: false, defval: '' }));
    if (!parsed) continue;
    const current = await db.select().from(mealOrders).where(eq(mealOrders.orderDate, date));
    const portalTouched = new Set(current.filter(r => r.updatedAt && r.updatedAt > pushedAt).map(r => r.nik));
    const fromSheet = parsed.rows.filter(r => !portalTouched.has(r.nik));
    if (fromSheet.length) {
      const full = fromSheet.map(r => ({ ...Object.fromEntries(EDITABLE_FIELDS.map(f => [f, null])), ...r })) as ParsedMealOrderRow[];
      changed += await bulkUpsertMealOrders(date, full, 'google-sheets');
    }
    // Baris yang dihapus dari sheet ikut dihapus (kecuali baru ditambah/diubah di portal)
    const inSheet = new Set(parsed.rows.map(r => r.nik));
    const toDelete = current.filter(r => !inSheet.has(r.nik) && !portalTouched.has(r.nik)).map(r => r.id);
    if (toDelete.length) {
      await db.delete(mealOrders).where(inArray(mealOrders.id, toDelete));
      changed += toDelete.length;
    }
  }
  if (changed) console.log(`[MealOrders] ${changed} baris diperbarui dari edit langsung di Google Sheets`);
  return changed;
}

let syncRunning: Promise<{ id: string; url: string; pulled: number }> | null = null;
let syncAgain = false;
// Sinkron 2 arah: (1) tarik edit langsung di Google Sheets, (2) tulis ulang sheet dari data portal,
// (3) pastikan hanya Section Administrasi yang bisa mengedit.
export async function syncMealOrderSheet(options: { forcePermissions?: boolean } = {}): Promise<{ id: string; url: string; pulled: number }> {
  if (syncRunning) { syncAgain = true; return syncRunning; }
  syncRunning = (async () => {
    try {
      const state = await readSheetState();
      let file = await findMealSheet().catch(() => null);
      let pulled = 0;
      if (file) {
        try {
          pulled = await pullSheetEdits(file.id, state);
        } catch (e: any) {
          if (e?.code === 404) { sheetFile = null; file = null; }
          else console.error('[MealOrders] Tarik edit Google Sheets gagal:', e.message);
        }
      }

      const buffer = await buildMealWorkbook();
      const media = () => ({ mimeType: XLSX_MIME, body: Readable.from(buffer) });
      let modifiedTime: string | null | undefined;
      let created = false;
      if (file) {
        try {
          const upd = await drive.files.update({ fileId: file.id, media: media(), fields: 'modifiedTime', supportsAllDrives: true });
          modifiedTime = upd.data.modifiedTime;
        } catch (e: any) {
          // File dihapus/dipindah manual → buat ulang
          if (e?.code !== 404) throw e;
          sheetFile = null;
          file = null;
        }
      }
      if (!file) {
        const res = await drive.files.create({
          requestBody: { name: MEAL_SHEET_NAME, mimeType: GSHEET_MIME, parents: [ADMIN_FOLDER_ID] },
          media: media(),
          fields: 'id, webViewLink, modifiedTime',
          supportsAllDrives: true,
        });
        sheetFile = file = { id: res.data.id!, url: res.data.webViewLink || `https://docs.google.com/spreadsheets/d/${res.data.id}/edit` };
        modifiedTime = res.data.modifiedTime;
        created = true;
        console.log(`[MealOrders] Google Sheets "${MEAL_SHEET_NAME}" dibuat di folder Administration (${file.id})`);
      }

      // Hak akses diterapkan saat file baru / daftar Section Administrasi berubah / diminta
      const editors = await adminEditorEmails();
      const permKey = `${file.id}:${editors.join(',')}`;
      let nextPermKey = state.permKey;
      if (created || options.forcePermissions || state.permKey !== permKey) {
        const res = await applyMealSheetPermissions(file.id);
        nextPermKey = permKey;
        // Akses lihat publik warisan folder Administration tidak bisa diputus per file (Drive pribadi)
        if (!res.publicRemoved) console.warn('[MealOrders] Akses lihat "anyone with the link" warisan folder Administration masih aktif pada Google Sheets Meal Order');
      }
      // modifiedTime diambil ulang setelah perubahan akses agar tidak terbaca sebagai "edit di sheet"
      const latest = await drive.files.get({ fileId: file.id, fields: 'modifiedTime', supportsAllDrives: true }).catch(() => null);
      await writeSheetState({ fileId: file.id, pushedModified: latest?.data.modifiedTime || modifiedTime || undefined, pushedAt: new Date().toISOString(), permKey: nextPermKey });
      return { ...file, pulled };
    } finally {
      syncRunning = null;
      if (syncAgain) { syncAgain = false; scheduleSheetSync(); }
    }
  })();
  return syncRunning;
}

// Cek edit di Google Sheets secara berkala saat modul dibuka (maks. 1x per menit)
let lastPullCheck = 0;
function maybePullFromSheet() {
  if (Date.now() - lastPullCheck < 60 * 1000) return;
  lastPullCheck = Date.now();
  (async () => {
    const state = await readSheetState();
    const file = await findMealSheet();
    if (!file || !state.pushedModified) return;
    const meta = await drive.files.get({ fileId: file.id, fields: 'modifiedTime', supportsAllDrives: true });
    if (meta.data.modifiedTime && meta.data.modifiedTime > state.pushedModified) await syncMealOrderSheet();
  })().catch((e: any) => console.warn('[MealOrders] Cek edit Google Sheets gagal:', e.message));
}

// Sinkron otomatis setelah ada perubahan (digabung tiap 20 detik agar tidak membebani Drive API)
let syncTimer: NodeJS.Timeout | null = null;
function scheduleSheetSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncMealOrderSheet().catch((e: any) => console.error("[MealOrders] Sync Google Sheets gagal:", e.message));
    // Simpan juga Rekapan Bungkusan harian untuk tanggal yang orderannya berubah
    snapshotChangedBungkusDays().catch((e: any) => console.error("[MealOrders] Simpan rekapan bungkusan gagal:", e.message));
  }, 20 * 1000);
}

// ===== Rekapan Bungkusan harian (disimpan per tanggal × perusahaan × waktu makan) =====
type BungkusDailyRow = { orderDate: string; company: MealCompany; slot: MealSlot; lapangan: number; bungkusKantin: number; makanKantin: number; karyawan: number };

// Hitung rekapan dari orderan beberapa tanggal (rumus sama dengan kartu ringkasan modul) lalu simpan
async function snapshotBungkusDays(dates: string[]): Promise<BungkusDailyRow[]> {
  if (dates.length === 0) return [];
  const inactive = await getInactiveNiks();
  const orders = (await db.select().from(mealOrders).where(inArray(mealOrders.orderDate, dates))).filter(isActiveRow(inactive));
  const empPt = new Map((await db.select({ nik: employees.nik, pt: employees.pt }).from(employees)).map(e => [String(e.nik || '').toUpperCase().trim(), e.pt]));
  const acc = new Map<string, BungkusDailyRow>();
  const staff = new Map<string, Set<string>>();
  for (const r of orders) {
    const d = ymd(r.orderDate);
    const company = resolveMealCompany(r.pt, empPt.get(r.nik.toUpperCase().trim()));
    const ck = `${d}|${company}`;
    if (!staff.has(ck)) staff.set(ck, new Set());
    staff.get(ck)!.add(r.nik.toUpperCase().trim());
    for (const slot of MEAL_SLOTS) {
      const k = `${d}|${company}|${slot}`;
      const row = acc.get(k) || { orderDate: d, company, slot, lapangan: 0, bungkusKantin: 0, makanKantin: 0, karyawan: 0 };
      const c = mealCounts(r, slot);
      row.lapangan += c.lapangan; row.bungkusKantin += c.bungkusKantin; row.makanKantin += c.makanKantin;
      acc.set(k, row);
    }
  }
  // Pastikan TBP & GPS selalu punya baris untuk setiap tanggal yang dihitung (agar tanggal kosong tercatat 0)
  for (const d of dates) for (const company of ['TBP', 'GPS'] as MealCompany[]) for (const slot of MEAL_SLOTS) {
    const k = `${d}|${company}|${slot}`;
    if (!acc.has(k)) acc.set(k, { orderDate: d, company, slot, lapangan: 0, bungkusKantin: 0, makanKantin: 0, karyawan: 0 });
  }
  const rows = Array.from(acc.values()).map(r => ({ ...r, karyawan: staff.get(`${r.orderDate}|${r.company}`)?.size || 0 }));
  const now = new Date();
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(mealBungkusDaily).values(rows.slice(i, i + 500).map(r => ({ ...r, updatedAt: now })))
      .onConflictDoUpdate({
        target: [mealBungkusDaily.orderDate, mealBungkusDaily.company, mealBungkusDaily.slot],
        set: { lapangan: sql`excluded.lapangan`, bungkusKantin: sql`excluded.bungkus_kantin`, makanKantin: sql`excluded.makan_kantin`, karyawan: sql`excluded.karyawan`, updatedAt: now },
      });
  }
  return rows;
}

// Tanggal yang orderannya diubah setelah rekapan terakhir disimpan
async function snapshotChangedBungkusDays() {
  await ensureMealOrdersTable();
  const changed = await db.execute(sql`
    SELECT mo.order_date::text AS d FROM meal_orders mo
    GROUP BY mo.order_date
    HAVING MAX(mo.updated_at) > COALESCE((SELECT MAX(b.updated_at) FROM meal_bungkus_daily b WHERE b.order_date = mo.order_date), '-infinity'::timestamp)
    LIMIT 120`);
  const dates = (changed.rows as { d: string }[]).map(r => String(r.d).slice(0, 10));
  if (dates.length) await snapshotBungkusDays(dates);
}

function pickFields(body: any): Partial<Record<EditableField, any>> {
  const out: Partial<Record<EditableField, any>> = {};
  for (const f of EDITABLE_FIELDS) {
    if (!(f in (body || {}))) continue;
    const v = body[f];
    if (BOOL_FIELDS.includes(f)) out[f] = !!v;
    else if (f === 'sortNo') out[f] = v === '' || v == null ? null : Number(v) || null;
    else out[f] = v == null ? null : String(v).trim() || null;
  }
  return out;
}

const updatedByOf = (req: any) => String(req.user?.nik || req.user?.name || 'system');

async function requireMealManager(req: any, res: any, next: any) {
  try {
    const access = await getTrainingAccess(req.user);
    if (!access.canManage) {
      return res.status(403).json({ status: "error", message: "Anda tidak memiliki akses untuk mengubah Orderan Makanan." });
    }
    next();
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// ===== Sinkronisasi Otomatis dengan Data Roster & Cuti =====
// Sumber utama: Google Sheets "Database Rooster Prep & Lab" (Rooster_Staff & Rooster_Crew) dibaca langsung saat sinkron.
// Bila sheet tidak bisa dibaca / tanggal belum ada di sheet → pakai salinan tabel roster di database (diperbarui cron 17:00 WIT).
type RosterSource = 'sheet' | 'database';
interface RosterEmp { nik: string; name: string; statusMess: string | null; pt: string | null; shift: string | null; section: string | null; gol: string | null; tempatTinggal: string | null; status: string }

// Pilihan Pagi/Sore terakhir per karyawan (tanggal <= date) — berlaku seterusnya sampai diubah lagi di kolom Catatan
async function loadMealPreferences(date: string, nik?: string): Promise<Map<string, MealPreference>> {
  const rows = await db.select({
    nik: mealOrders.nik,
    pilihanPagi: mealOrders.pilihanPagi,
    pilihanSore: mealOrders.pilihanSore,
    catatan: mealOrders.catatan,
    pagiLapangan: mealOrders.pagiLapangan,
    soreLapangan: mealOrders.soreLapangan,
  })
    .from(mealOrders)
    .where(and(
      sql`${mealOrders.orderDate} <= ${date}`,
      sql`(${mealOrders.pilihanPagi} IS NOT NULL OR ${mealOrders.pilihanSore} IS NOT NULL OR ${mealOrders.catatan} IS NOT NULL OR ${mealOrders.pagiLapangan} IS NOT NULL OR ${mealOrders.soreLapangan} IS NOT NULL)`,
      nik ? sql`UPPER(${mealOrders.nik}) = ${nik.toUpperCase()}` : undefined,
    ))
    .orderBy(desc(mealOrders.orderDate));
  const prefs = new Map<string, MealPreference>();
  const asChoice = (v: string | null): MealChoice | null => (v === 'kantin' || v === 'lapangan' ? v : null);
  for (const r of rows) {
    const k = r.nik.toUpperCase().trim();
    const p = prefs.get(k) || {};
    // 1. Cek pilihan langsung
    if (p.pagi === undefined && asChoice(r.pilihanPagi)) p.pagi = asChoice(r.pilihanPagi);
    if (p.sore === undefined && asChoice(r.pilihanSore)) p.sore = asChoice(r.pilihanSore);
    // 2. Cek dari kolom Catatan
    const cat = String(r.catatan || '').trim();
    if (cat === 'Bungkusan Pagi dan Bungkusan Sore') {
      p.pagi = 'lapangan';
      p.sore = 'lapangan';
    } else if (cat === 'Bungkusan Pagi') {
      p.pagi = 'lapangan';
      p.sore = 'kantin';
    } else if (cat === 'Bungkusan Sore') {
      p.pagi = 'kantin';
      p.sore = 'lapangan';
    } else if (cat === '-') {
      p.pagi = 'kantin';
      p.sore = 'kantin';
    }
    // 3. Fallback: pagi lapangan jika ada, namun sore default KANTIN kecuali catatan eksplisit minta Bungkusan Sore
    if (p.pagi === undefined && portions(r.pagiLapangan) > 0) p.pagi = 'lapangan';
    if (p.sore === undefined) p.sore = 'kantin';

    prefs.set(k, p);
  }
  return prefs;
}

// Karyawan yang semula Nonshift: shift siang terakhir di orderan (tanggal <= date) adalah "Nonshift"
// → saat roster D tetap Nonshift (tidak berubah jadi SIANG walau grup shift di roster A/B)
async function loadNonshiftNiks(date: string, nik?: string): Promise<Set<string>> {
  const rows = await db.select({ nik: mealOrders.nik, shiftKerja: mealOrders.shiftKerja })
    .from(mealOrders)
    .where(and(
      sql`${mealOrders.orderDate} <= ${date}`,
      sql`UPPER(${mealOrders.shiftKerja}) IN ('SIANG', 'NONSHIFT')`,
      nik ? sql`UPPER(${mealOrders.nik}) = ${nik.toUpperCase()}` : undefined,
    ))
    .orderBy(desc(mealOrders.orderDate));
  const latest = new Map<string, string>();
  for (const r of rows) {
    const k = r.nik.toUpperCase().trim();
    if (!latest.has(k)) latest.set(k, String(r.shiftKerja).toUpperCase());
  }
  return new Set(Array.from(latest).filter(([, s]) => s === 'NONSHIFT').map(([k]) => k));
}

// Status roster / kerja hari sebelumnya (H-1) per karyawan:
// Dipakai untuk aturan: Jika kemarin C, CE, CT, CS, TRV, I dan hari ini D, N, LS, OFF -> otomatis Belum Lapor
async function loadPreviousRosterStatuses(date: string, nik?: string): Promise<Map<string, string>> {
  const prevDate = getPreviousDateString(date);
  const map = new Map<string, string>();

  // 1. Ambil dari tabel roster untuk tanggal kemarin (status roster resmi)
  try {
    const prevDateFormats = getPossibleRosterDateStrings(prevDate);
    const rosterRows = await db.select({ nik: roster.nik, status: roster.status })
      .from(roster).where(and(
        inArray(roster.date, prevDateFormats),
        nik ? sql`UPPER(${roster.nik}) = ${nik.toUpperCase()}` : undefined
      ));
    for (const r of rosterRows) {
      if (r.nik && r.status) {
        map.set(r.nik.toUpperCase().trim(), r.status.trim());
      }
    }
  } catch (err: any) {
    console.warn(`[MealOrders] Gagal load previous roster rows:`, err?.message);
  }

  // 2. Ambil dari tabel meal_orders untuk tanggal kemarin (pelengkap / jika sudah ada data kemarin)
  try {
    const prevOrders = await db.select({
      nik: mealOrders.nik,
      status: mealOrders.status,
      statusKerja: mealOrders.statusKerja,
      catatan: mealOrders.catatan,
      keteranganLapor: mealOrders.keteranganLapor,
    }).from(mealOrders).where(and(
      eq(mealOrders.orderDate, prevDate),
      nik ? sql`UPPER(${mealOrders.nik}) = ${nik.toUpperCase()}` : undefined
    ));

    for (const m of prevOrders) {
      const k = m.nik.toUpperCase().trim();
      const isBelumLapor = m.keteranganLapor === 'Belum Lapor' || String(m.keteranganLapor || '').toLowerCase().includes('belum lapor');
      const candidate = isBelumLapor ? 'Belum Lapor' : (m.status || m.statusKerja || m.catatan || '');
      if (candidate) {
        if (!map.has(k) || map.get(k) === '-' || isBelumLapor) {
          map.set(k, candidate.trim());
        } else {
          const currentInMap = map.get(k) || '';
          if (!isLeaveOrPermissionRosterStatus(currentInMap) && isLeaveOrPermissionRosterStatus(candidate)) {
            map.set(k, candidate.trim());
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[MealOrders] Gagal load previous meal orders:`, err?.message);
  }

  // 3. Cadangan: jika map masih kosong (misal roster belum di-sync ke DB), coba baca dari sheet
  if (map.size === 0) {
    try {
      const prevDateFormats = getPossibleRosterDateStrings(prevDate);
      const sheet = await fetchRosterSheetForDate(prevDateFormats);
      if (sheet.dateFound && sheet.entries.length > 0) {
        for (const e of sheet.entries) {
          if (e.nik && e.status) {
            map.set(e.nik.toUpperCase().trim(), e.status.trim());
          }
        }
      }
    } catch (err: any) {
      console.warn(`[MealOrders] Gagal fetch previous roster sheet:`, err?.message);
    }
  }

  return map;
}

// Pilihan Pagi/Sore yang sudah tertera di orderan tanggal tsb (Catatan: "Pagi/Sore Bungkusan") tidak diubah saat sinkron:
// pilihan tersimpan di baris itu → isi sel Lapangan baris itu → pilihan terakhir dari tanggal sebelumnya
// (Sore Lapangan pada baris Longshift adalah aturan LS, bukan pilihan → tidak dihitung)
type CurrentChoiceRow = { pilihanPagi: string | null; pilihanSore: string | null; pagiLapangan: string | null; soreLapangan: string | null; shiftKerja: string | null; catatan?: string | null };
function withCurrentChoice(pref: MealPreference | undefined, current: CurrentChoiceRow | undefined): MealPreference {
  const out: MealPreference = { ...(pref || {}) };
  if (!current) return out;
  const asChoice = (v: string | null): MealChoice | null => (v === 'kantin' || v === 'lapangan' ? v : null);
  const isLongShift = String(current.shiftKerja || '').toUpperCase() === 'LONGSHIFT';
  const cat = String(current.catatan || '').trim().toLowerCase();

  if (cat.includes('bungkusan pagi dan bungkusan sore')) {
    out.pagi = 'lapangan';
    out.sore = 'lapangan';
  } else if (cat.includes('bungkusan pagi')) {
    out.pagi = 'lapangan';
    out.sore = 'kantin';
  } else if (cat.includes('bungkusan sore')) {
    out.pagi = 'kantin';
    out.sore = 'lapangan';
  } else if (cat === '-') {
    out.pagi = 'kantin';
    out.sore = 'kantin';
  } else {
    if (asChoice(current.pilihanPagi)) out.pagi = asChoice(current.pilihanPagi);
    else if (portions(current.pagiLapangan) > 0) out.pagi = 'lapangan';
    if (asChoice(current.pilihanSore)) out.sore = asChoice(current.pilihanSore);
  }
  return out;
}

// Membaca pemetaan resmi Tempat Tinggal Operasional (Nirwana, Kampung Kawasi, dll.) per karyawan
// Karyawan Nirwana / Kampung Kawasi TIDAK BOLEH dirubah-rubah saat pindah tanggal atau sinkronisasi roster.
async function loadMasterTempatTinggalMap(): Promise<Map<string, string>> {
  const rows = await db.select({ nik: mealOrders.nik, tempatTinggal: mealOrders.tempatTinggal })
    .from(mealOrders)
    .where(sql`${mealOrders.tempatTinggal} IS NOT NULL AND ${mealOrders.tempatTinggal} <> '' AND ${mealOrders.tempatTinggal} <> '-'`)
    .orderBy(desc(mealOrders.orderDate));
  const map = new Map<string, string>();
  for (const r of rows) {
    const k = r.nik.toUpperCase().trim();
    const tt = String(r.tempatTinggal || '').trim();
    if (!tt || tt.length > 25) continue; // abaikan alamat KTP panjang
    if (!map.has(k)) {
      map.set(k, tt);
    }
  }
  return map;
}

// Menghitung tanggal acuan sumber Catatan berdasarkan aturan hari:
// - Kamis: kembali ke Catatan Hari Senin (melewati Selasa & Rabu yang wajib Kantin untuk Mess CR)
// - Jumat: pakai Catatan Hari Kamis
// - Sabtu: pakai Catatan Hari Jumat (khusus Mess CR sore ditiadakan / wajib Kantin)
// - Minggu: kembali ke Catatan Hari Jumat (melewati Sabtu yang wajib Kantin untuk Mess CR)
// - Senin: pakai Catatan Hari Minggu
// - Selasa & Rabu: pakai Catatan Hari Senin (khusus Mess CR sore ditiadakan / wajib Kantin)
export function getReferenceCatatanDate(targetDate: string): string {
  const d = parseYmd(targetDate);
  const day = d.getUTCDay(); // 0 = Minggu, 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu

  if (day === 4) return shiftDate(targetDate, -3); // Kamis -> kembali ke Senin
  if (day === 5) return shiftDate(targetDate, -1); // Jumat -> pakai Kamis
  if (day === 6) return shiftDate(targetDate, -1); // Sabtu -> pakai Jumat
  if (day === 0) return shiftDate(targetDate, -2); // Minggu -> kembali ke Jumat
  if (day === 1) return shiftDate(targetDate, -1); // Senin -> pakai Minggu
  if (day === 2) return shiftDate(targetDate, -1); // Selasa -> pakai Senin
  if (day === 3) return shiftDate(targetDate, -2); // Rabu -> pakai Senin
  return shiftDate(targetDate, -1);
}

// Membaca Catatan resmi per karyawan dari tanggal acuan yang tepat:
// Jika karyawan pada tanggal acuan tsb TIDAK MEMILIKI catatan (null/'-'),
// maka karyawan tsb TIDAK BOLEH tiba-tiba diberi catatan (tetap kosong).
export async function loadReferenceCatatanMap(targetDate: string): Promise<Map<string, string>> {
  const refDate = getReferenceCatatanDate(targetDate);
  const isTueWedSat = isTuesdayWednesdaySaturday(targetDate);

  let rows = await db.select({
    nik: mealOrders.nik,
    catatan: mealOrders.catatan,
    statusMess: mealOrders.statusMess,
  }).from(mealOrders)
    .where(eq(mealOrders.orderDate, refDate));

  // Jika tanggal acuan belum punya data sama sekali (mis. tanggal baru belum di-init),
  // cari mundur ke tanggal sebelumnya yang sudah memiliki data orderan valid
  const hasValidData = rows.some(r => r.catatan && r.catatan !== '-' && !r.catatan.startsWith('Cuti'));
  if (!hasValidData) {
    const priorDates = await db.select({ orderDate: mealOrders.orderDate })
      .from(mealOrders)
      .where(and(
        sql`${mealOrders.orderDate} < ${targetDate}`,
        sql`${mealOrders.catatan} IS NOT NULL AND ${mealOrders.catatan} <> '' AND ${mealOrders.catatan} <> '-' AND NOT (${mealOrders.catatan} LIKE 'Cuti%')`
      ))
      .groupBy(mealOrders.orderDate)
      .orderBy(desc(mealOrders.orderDate))
      .limit(1);

    if (priorDates.length > 0) {
      rows = await db.select({
        nik: mealOrders.nik,
        catatan: mealOrders.catatan,
        statusMess: mealOrders.statusMess,
      }).from(mealOrders)
        .where(eq(mealOrders.orderDate, priorDates[0].orderDate));
    }
  }

  const map = new Map<string, string>();
  for (const r of rows) {
    const k = r.nik.toUpperCase().trim();
    let c = String(r.catatan || '').trim();
    if (!c || c === '-' || c.startsWith('Cuti')) continue;

    const sm = String(r.statusMess || '').toUpperCase();
    const isCR = sm === 'CR' || sm === 'MESS';

    if (isCR && isTueWedSat) {
      if (c === 'Bungkusan Sore') {
        continue;
      } else if (c === 'Bungkusan Pagi dan Bungkusan Sore') {
        c = 'Bungkusan Pagi';
      }
    }
    map.set(k, c);
  }

  return map;
}

// Master profil identitas resmi karyawan di Orderan Makanan:
// No Urut, Nama, Status Mess, PT, Shift Reguler, Section, Residence.
// Bagian ini dikunci permanen dan tidak boleh berubah saat pindah tanggal atau saat sinkronisasi roster.
export type MasterEmployeeProfile = {
  sortNo: number;
  nama: string;
  statusMess: string | null;
  pt: string | null;
  shift: string | null;
  section: string | null;
  tempatTinggal: string | null;
  catatan: string | null;
};

export async function loadMasterEmployeeProfileMap(): Promise<Map<string, MasterEmployeeProfile>> {
  // Prioritaskan baris tanggal acuan resmi 2026-10-14, disusul baris dengan section resmi operasional
  const rows = await db.select({
    nik: mealOrders.nik,
    orderDate: mealOrders.orderDate,
    sortNo: mealOrders.sortNo,
    nama: mealOrders.nama,
    statusMess: mealOrders.statusMess,
    pt: mealOrders.pt,
    shift: mealOrders.shift,
    section: mealOrders.section,
    tempatTinggal: mealOrders.tempatTinggal,
    catatan: mealOrders.catatan,
  }).from(mealOrders)
    .where(sql`${mealOrders.section} IN ('Laboratorium Krishna', 'Preparasi Krishna', 'Maintenance') OR ${mealOrders.orderDate} = '2026-10-14'`)
    .orderBy(
      sql`CASE WHEN ${mealOrders.orderDate} = '2026-10-14' THEN 0 ELSE 1 END`,
      sql`ABS(${mealOrders.orderDate} - '2026-10-14'::date)`
    );

  const map = new Map<string, MasterEmployeeProfile>();
  for (const r of rows) {
    const k = r.nik.toUpperCase().trim();
    if (!map.has(k)) {
      map.set(k, {
        sortNo: r.sortNo ?? 9999,
        nama: r.nama,
        statusMess: r.statusMess || null,
        pt: r.pt || null,
        shift: r.shift || null,
        section: r.section || null,
        tempatTinggal: r.tempatTinggal || null,
        catatan: null,
      });
    }
  }
  return map;
}

// Membaca master urutan resmi karyawan (sortNo) agar saat pindah tanggal atau sinkron roster,
// urutan baris karyawan selalu konsisten dan tidak pernah berubah.
async function loadMasterSortOrderMap(): Promise<Map<string, number>> {
  const profileMap = await loadMasterEmployeeProfileMap();
  const map = new Map<string, number>();
  for (const [k, p] of profileMap.entries()) {
    if (p.sortNo != null) map.set(k, p.sortNo);
  }
  return map;
}

async function loadRosterForDate(date: string): Promise<{ emps: RosterEmp[]; source: RosterSource }> {
  const dateFormats = getPossibleRosterDateStrings(date);
  const masterTtByNik = await loadMasterTempatTinggalMap();
  const masterProfiles = await loadMasterEmployeeProfileMap();

  // Profil karyawan (Status Mess, PT, Shift, Section, Tempat Tinggal) TIDAK diambil dari roster:
  // dikunci mengikuti Master Profile resmi (atau riwayat orderan valid).
  const lastOrders = await db.select({
    nik: mealOrders.nik, orderDate: mealOrders.orderDate, statusMess: mealOrders.statusMess, pt: mealOrders.pt,
    shift: mealOrders.shift, section: mealOrders.section, tempatTinggal: mealOrders.tempatTinggal,
  }).from(mealOrders)
    .where(sql`${mealOrders.orderDate} <> ${date}`)
    .orderBy(sql`CASE WHEN ${mealOrders.orderDate} < ${date} THEN 0 ELSE 1 END`, sql`ABS(${mealOrders.orderDate} - ${date}::date)`);
  type OrderProfile = { statusMess: string | null; pt: string | null; shift: string | null; section: string | null; tempatTinggal: string | null };
  const profileByNik = new Map<string, OrderProfile>();
  for (const r of lastOrders) {
    const k = r.nik.toUpperCase().trim();
    if (!profileByNik.has(k)) {
      profileByNik.set(k, r);
    } else {
      const existing = profileByNik.get(k)!;
      if (!existing.tempatTinggal && r.tempatTinggal && r.tempatTinggal.length <= 25) {
        existing.tempatTinggal = r.tempatTinggal;
      }
    }
  }
  const dbEmps = await db.select().from(employees);
  const dbByNik = new Map(dbEmps.map(e => [String(e.nik || '').toUpperCase().trim(), e]));
  const profileOf = (nik: string, fallback: OrderProfile): OrderProfile => {
    const master = masterProfiles.get(nik);
    const p = profileByNik.get(nik);
    // Tempat Tinggal operasional dikunci: prioritaskan riwayat orderan terdekat, lalu master yang sudah valid
    // JANGAN PERNAH mengambil alamatDomisili (alamat KTP/rumah).
    const lockedTt = (p?.tempatTinggal && p.tempatTinggal.length <= 25 ? p.tempatTinggal : null) || masterTtByNik.get(nik) || master?.tempatTinggal || fallback.tempatTinggal || null;
    return {
      statusMess: p?.statusMess || master?.statusMess || dbByNik.get(nik)?.statusMess || fallback.statusMess || null,
      pt: p?.pt || master?.pt || dbByNik.get(nik)?.pt || fallback.pt || null,
      shift: p?.shift || master?.shift || dbByNik.get(nik)?.shift || fallback.shift || null,
      section: p?.section || master?.section || dbByNik.get(nik)?.section || fallback.section || null,
      tempatTinggal: lockedTt,
    };
  };
  // Karyawan Nonaktif di Database Karyawan tidak ikut walau masih ada di sheet roster
  const isInactive = (nik: string) => { const e = dbByNik.get(nik); return !!e && isResignedOrNonActiveStatus(e); };

  try {
    const sheet = await fetchRosterSheetForDate(dateFormats);
    if (sheet.dateFound && sheet.entries.length > 0) {
      return {
        source: 'sheet',
        emps: sheet.entries.filter(e => !isInactive(e.nik.toUpperCase())).map(e => {
          const nik = e.nik.toUpperCase();
          const master = masterProfiles.get(nik);
          const profile = profileOf(nik, { statusMess: e.statusMess || null, pt: e.pt || null, shift: e.shift || null, section: e.section || null, tempatTinggal: null });
          return { nik: e.nik, name: master?.nama || e.name, ...profile, gol: e.gol || null, status: e.status };
        }),
      };
    }
    console.warn(`[MealOrders] Tanggal ${date} belum ada di sheet Database Rooster — pakai tabel roster database`);
  } catch (err: any) {
    console.warn(`[MealOrders] Gagal membaca sheet Database Rooster (${err?.message}) — pakai tabel roster database`);
  }

  const rosterRows = await db.select({ nik: roster.nik, status: roster.status }).from(roster).where(inArray(roster.date, dateFormats));
  const rosterByNik = new Map(rosterRows.filter(r => r.nik).map(r => [r.nik!.toUpperCase().trim(), (r.status || '-').trim()]));
  // Hanya karyawan yang tercantum di roster tanggal tsb
  const emps = dbEmps.filter(emp => {
    const nik = (emp.nik || '').toUpperCase().trim();
    const name = (emp.name || '').toLowerCase().trim();
    const sm = (emp.statusMess || '').toUpperCase().trim();
    if (!nik || !emp.name || !rosterByNik.has(nik)) return false;
    if (nik.includes('DEMO') || name.includes('demo') || nik === 'PREPLABADMIN' || nik.includes('#N/A') || name.includes('#N/A')) return false;
    if (isResignedOrNonActiveStatus(emp) || sm.includes('RESIGN')) return false;
    return true;
  });
  return {
    source: 'database',
    emps: emps.map(e => {
      const nik = e.nik.toUpperCase().trim();
      const profile = profileOf(nik, { statusMess: e.statusMess, pt: e.pt, shift: e.shift, section: e.section, tempatTinggal: null });
      return { nik: e.nik, name: e.name, ...profile, gol: e.gol, status: rosterByNik.get(nik) || '-' };
    }),
  };
}

export async function syncMealOrdersFromRoster(date: string, updatedBy = 'system', overwrite = false): Promise<{ synced: number; removed: number; source: RosterSource }> {
  await ensureMealOrdersTable();
  if (!isDate(date)) throw new Error("Format tanggal tidak valid (YYYY-MM-DD)");

  // 1. Karyawan + kode roster tanggal ini (dari sheet Database Rooster, cadangan: database)
  const { emps: activeEmps, source } = await loadRosterForDate(date);
  if (activeEmps.length === 0) return { synced: 0, removed: 0, source };

  // Orderan mengikuti roster: karyawan yang tidak ada di roster tanggal ini dikeluarkan dari orderan tanggal tsb
  const rosterNiks = activeEmps.map(e => e.nik.toUpperCase().trim());
  const removedRows = await db.delete(mealOrders)
    .where(and(eq(mealOrders.orderDate, date), notInArray(sql`UPPER(TRIM(${mealOrders.nik}))`, rosterNiks)))
    .returning({ id: mealOrders.id });
  const removed = removedRows.length;

  // 2. Karyawan yang sudah ada di tanggal tsb: profilnya (Status Mess, PT, Shift, Section, Tempat Tinggal) tidak disinkronkan
  //    dari roster — yang dipakai dari roster hanya kode kehadiran; aturan makan dihitung dari profil di orderan.
  const existingRows = await db.select({
    nik: mealOrders.nik, sortNo: mealOrders.sortNo, statusMess: mealOrders.statusMess, pt: mealOrders.pt, shift: mealOrders.shift,
    section: mealOrders.section, tempatTinggal: mealOrders.tempatTinggal,
    pilihanPagi: mealOrders.pilihanPagi, pilihanSore: mealOrders.pilihanSore, pagiLapangan: mealOrders.pagiLapangan, soreLapangan: mealOrders.soreLapangan,
    shiftKerja: mealOrders.shiftKerja,
    keteranganLapor: mealOrders.keteranganLapor,
    catatan: mealOrders.catatan,
  }).from(mealOrders).where(eq(mealOrders.orderDate, date));
  const existingByNik = new Map(existingRows.map(r => [r.nik.toUpperCase().trim(), r]));
  const existingNiks = new Set(existingByNik.keys());

  const rowsToSave: any[] = [];
  const prefs = await loadMealPreferences(date);
  const nonshift = await loadNonshiftNiks(date);
  const prevStatuses = await loadPreviousRosterStatuses(date);
  const masterTtByNik = await loadMasterTempatTinggalMap();
  const masterSortMap = await loadMasterSortOrderMap();
  const masterProfiles = await loadMasterEmployeeProfileMap();

  // Riwayat profil terdekat dari tanggal lain agar PT & Residence karyawan tidak pernah berubah/hilang
  const lastOrders = await db.select({
    nik: mealOrders.nik, pt: mealOrders.pt, tempatTinggal: mealOrders.tempatTinggal,
    statusMess: mealOrders.statusMess, shift: mealOrders.shift, section: mealOrders.section,
  }).from(mealOrders)
    .where(sql`${mealOrders.orderDate} <> ${date}`)
    .orderBy(sql`CASE WHEN ${mealOrders.orderDate} < ${date} THEN 0 ELSE 1 END`, sql`ABS(${mealOrders.orderDate} - ${date}::date)`);
  const lastOrdersByNik = new Map<string, typeof lastOrders[0]>();
  for (const lo of lastOrders) {
    const k = String(lo.nik || '').toUpperCase().trim();
    if (!lastOrdersByNik.has(k)) lastOrdersByNik.set(k, lo);
  }
  const dbEmps = await db.select({ nik: employees.nik, pt: employees.pt, statusMess: employees.statusMess, shift: employees.shift, section: employees.section }).from(employees);
  const empDbByNik = new Map(dbEmps.map(e => [String(e.nik || '').toUpperCase().trim(), e]));

  let maxSortNo = Array.from(masterSortMap.values()).reduce((max, n) => Math.max(max, n), 0);

  const getSortNo = (nik: string, currentSortNo?: number | null) => {
    if (currentSortNo != null) return currentSortNo;
    const clean = nik.toUpperCase().trim();
    if (masterSortMap.has(clean)) return masterSortMap.get(clean)!;
    maxSortNo++;
    masterSortMap.set(clean, maxSortNo);
    return maxSortNo;
  };

  // Urutkan activeEmps secara stabil sesuai master urutan agar baris selalu konsisten antar tanggal
  activeEmps.sort((a, b) => {
    const noA = getSortNo(a.nik, existingByNik.get(a.nik.toUpperCase().trim())?.sortNo);
    const noB = getSortNo(b.nik, existingByNik.get(b.nik.toUpperCase().trim())?.sortNo);
    if (noA !== noB) return noA - noB;
    return a.name.localeCompare(b.name);
  });

  const refCatatanMap = await loadReferenceCatatanMap(date);

  for (const rosterEmp of activeEmps) {
    const nik = rosterEmp.nik.toUpperCase().trim();
    if (!overwrite && existingNiks.has(nik)) {
      continue;
    }
    const current = existingByNik.get(nik);
    const master = masterProfiles.get(nik);
    const sortNo = master?.sortNo ?? getSortNo(nik, current?.sortNo);
    // Kolom Profil (Status Mess, PT, Shift, Section, Residence): PT & Residence TIDAK BOLEH diganti saat sinkronisasi roster
    // Kolom Profil (Status Mess, PT, Shift, Section, Residence):
    // Prioritas penguncian PT:
    // 1. PT pada tanggal yang sedang diedit (current)
    // 2. Master PT resmi Orderan Makanan (masterProfiles acuan 2026-10-14)
    // 3. Riwayat PT orderan terdekat (lastOrdersByNik)
    // 4. Database Karyawan (empDbByNik)
    const lockedStatusMess = current?.statusMess || master?.statusMess || empDbByNik.get(nik)?.statusMess || lastOrdersByNik.get(nik)?.statusMess || rosterEmp.statusMess || null;
    const lockedPt = current?.pt || master?.pt || (lastOrdersByNik.get(nik)?.pt && lastOrdersByNik.get(nik)?.pt !== '-' ? lastOrdersByNik.get(nik)!.pt : null) || empDbByNik.get(nik)?.pt || rosterEmp.pt || null;
    const lockedShift = current?.shift || master?.shift || lastOrdersByNik.get(nik)?.shift || empDbByNik.get(nik)?.shift || rosterEmp.shift || null;
    const lockedSection = current?.section || master?.section || lastOrdersByNik.get(nik)?.section || empDbByNik.get(nik)?.section || rosterEmp.section || null;
    const lockedTt = (current?.tempatTinggal && current.tempatTinggal.length <= 25 ? current.tempatTinggal : null)
      || (lastOrdersByNik.get(nik)?.tempatTinggal && lastOrdersByNik.get(nik)!.tempatTinggal!.length <= 25 ? lastOrdersByNik.get(nik)!.tempatTinggal : null)
      || masterTtByNik.get(nik)
      || master?.tempatTinggal
      || rosterEmp.tempatTinggal
      || null;

    // Kolom Catatan dikunci mengikuti aturan tanggal acuan:
    // Kamis kembali ke Senin, Jumat pakai Kamis, dst.
    const currentCatatan = current?.catatan && current.catatan !== '-' && !current.catatan.startsWith('Cuti') ? current.catatan : null;
    let lockedCatatan = currentCatatan || refCatatanMap.get(nik) || null;

    const isTueWedSat = isTuesdayWednesdaySaturday(date);
    const isCR = ['CR', 'MESS'].includes(String(lockedStatusMess || rosterEmp.statusMess || '').trim().toUpperCase());
    if (isCR && isTueWedSat) {
      if (lockedCatatan === 'Bungkusan Sore') {
        lockedCatatan = null;
      } else if (lockedCatatan === 'Bungkusan Pagi dan Bungkusan Sore') {
        lockedCatatan = 'Bungkusan Pagi';
      }
    }

    const emp = {
      ...rosterEmp,
      nama: master?.nama || rosterEmp.name,
      statusMess: lockedStatusMess,
      pt: lockedPt,
      shift: lockedShift,
      section: lockedSection,
      tempatTinggal: lockedTt,
      keteranganLapor: current?.keteranganLapor,
    };
    const prevStatus = prevStatuses.get(nik);

    // Preferensi makan: sinkronkan dengan Catatan yang terkunci
    const empPref = withCurrentChoice(prefs.get(nik), { ...current, catatan: lockedCatatan });
    if (lockedCatatan === 'Bungkusan Pagi') {
      empPref.pagi = 'lapangan';
      empPref.sore = 'kantin';
    } else if (lockedCatatan === 'Bungkusan Sore') {
      empPref.sore = 'lapangan';
      if (!empPref.pagi) empPref.pagi = 'kantin';
    } else if (lockedCatatan === 'Bungkusan Pagi dan Bungkusan Sore') {
      empPref.pagi = 'lapangan';
      empPref.sore = 'lapangan';
    } else if (lockedCatatan === '-' || !lockedCatatan) {
      if (!empPref.pagi) empPref.pagi = 'kantin';
      empPref.sore = 'kantin';
    }

    const computed = computeMealOrderByRoster(emp, emp.status, date, empPref, prevStatus);
    if (computed.shiftKerja === 'SIANG' && (nonshift.has(nik) || lockedShift === 'Nonshift')) computed.shiftKerja = 'Nonshift';

    // Kolom Catatan TIDAK BOLEH diganti menjadi kode cuti atau null bila karyawan punya catatan
    let finalCatatan = (isCatatanDisabledForEmployee({ tempatTinggal: lockedTt, shiftKerja: computed.shiftKerja, statusKerja: computed.statusKerja, status: computed.status }) || computed.keteranganLapor === 'Belum Lapor')
      ? null
      : (lockedCatatan || computed.catatan || null);

    // Jangan rubah ke Bungkusan Sore saat pindah tanggal jika tidak diganti!
    const isExplicitBungkusSore = finalCatatan === 'Bungkusan Sore' || finalCatatan === 'Bungkusan Pagi dan Bungkusan Sore' || empPref.sore === 'lapangan';
    const isKawasiLS = (lockedTt || '').toLowerCase().includes('kawasi') && computed.shiftKerja === 'Longshift';
    if (!isKawasiLS && !isExplicitBungkusSore) {
      computed.soreLapangan = null;
      computed.soreKantin = (lockedTt || '').toLowerCase().includes('nirwana') && (lockedStatusMess || '').toUpperCase() === 'NR' ? '1' : 'K';
      computed.batchSore = (lockedTt || '').toLowerCase().includes('nirwana') ? '1' : null;
    }

    if (isCR && isTueWedSat) {
      const sk = String(computed.shiftKerja || computed.statusKerja || computed.status || '').trim().toUpperCase();
      const isAbsent = ['CUTI', 'CS', 'IZIN', 'OFF', 'SAKIT', 'MALAM'].includes(sk);
      if (!isAbsent && computed.keteranganLapor !== 'Belum Lapor') {
        computed.soreKantin = 'K';
        computed.soreLapangan = null;
        computed.batchSore = null;
      }
      if (finalCatatan === 'Bungkusan Sore') {
        finalCatatan = null;
      } else if (finalCatatan === 'Bungkusan Pagi dan Bungkusan Sore') {
        finalCatatan = 'Bungkusan Pagi';
      }
    }

    rowsToSave.push({
      orderDate: date,
      sortNo,
      nik: emp.nik,
      nama: emp.nama,
      statusMess: emp.statusMess || null,
      pt: emp.pt || null,
      shift: emp.shift || null,
      section: emp.section || null,
      statusKerja: computed.statusKerja,
      sahur: null,
      tidakPuasa: null,
      tempatTinggal: lockedTt,
      shiftKerja: computed.shiftKerja,
      pagiKantin: computed.pagiKantin,
      pagiLapangan: computed.pagiLapangan,
      siangKantin: computed.siangKantin,
      siangLapangan: computed.siangLapangan,
      soreKantin: computed.soreKantin,
      soreLapangan: computed.soreLapangan,
      takjilLapangan: computed.takjilLapangan,
      malamLapangan: computed.malamLapangan,
      batchPagi: computed.batchPagi,
      batchSore: computed.batchSore,
      status: computed.status,
      keteranganLapor: computed.keteranganLapor,
      catatan: finalCatatan,
      updatedBy,
      updatedAt: new Date(),
    });
  }

  if (rowsToSave.length === 0) {
    if (removed) scheduleSheetSync();
    return { synced: 0, removed, source };
  }

  for (let i = 0; i < rowsToSave.length; i += 200) {
    const chunk = rowsToSave.slice(i, i + 200);
    await db.insert(mealOrders).values(chunk)
      .onConflictDoUpdate({
        target: [mealOrders.orderDate, mealOrders.nik],
        // Menjaga konsistensi identitas profil master + menyelaraskan kehadiran dan porsi
        set: Object.fromEntries([
          'sortNo', 'nama', 'statusMess', 'pt', 'shift', 'section', 'tempatTinggal',
          'statusKerja', 'shiftKerja',
          'pagiKantin', 'pagiLapangan', 'siangKantin', 'siangLapangan', 'soreKantin', 'soreLapangan',
          'takjilLapangan', 'malamLapangan', 'batchPagi', 'batchSore', 'status', 'keteranganLapor', 'catatan',
          'updatedBy', 'updatedAt'
        ].map(f => [f, f === 'catatan'
          ? sql.raw(`COALESCE(NULLIF(TRIM(excluded.catatan), ''), meal_orders.catatan)`)
          : f === 'pt'
          ? sql.raw(`COALESCE(NULLIF(TRIM(meal_orders.pt), ''), excluded.pt)`)
          : f === 'tempatTinggal'
          ? sql.raw(`COALESCE(NULLIF(TRIM(meal_orders.tempat_tinggal), ''), excluded.tempat_tinggal)`)
          : sql.raw(`excluded.${toSnake(f)}`)]))
      });
  }

  scheduleSheetSync();
  return { synced: rowsToSave.length, removed, source };
}

export async function syncSingleEmployeeMealOrder(nik: string, dateStr: string, rosterStatus: string, updatedBy = 'roster-sync') {
  try {
    await ensureMealOrdersTable();
    const cleanNik = String(nik || '').trim().toUpperCase();
    if (!cleanNik) return;

    // Normalisasi dateStr ke YYYY-MM-DD
    let ymd = dateStr;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      ymd = d.toISOString().slice(0, 10);
    }

    const [emp] = await db.select().from(employees).where(sql`UPPER(${employees.nik}) = ${cleanNik}`).limit(1);
    if (!emp) return;

    // Profil dari orderan tanggal tsb (Status Mess, Shift, Tempat Tinggal, Keterangan Lapor, Catatan) — dari roster hanya kode kehadiran
    const [current] = await db.select({
      statusMess: mealOrders.statusMess, shift: mealOrders.shift, tempatTinggal: mealOrders.tempatTinggal,
      pilihanPagi: mealOrders.pilihanPagi, pilihanSore: mealOrders.pilihanSore, pagiLapangan: mealOrders.pagiLapangan, soreLapangan: mealOrders.soreLapangan,
      shiftKerja: mealOrders.shiftKerja,
      keteranganLapor: mealOrders.keteranganLapor,
      catatan: mealOrders.catatan,
    }).from(mealOrders)
      .where(and(eq(mealOrders.orderDate, ymd), eq(mealOrders.nik, emp.nik))).limit(1);
    if (!current) return;
    const masterProfiles = await loadMasterEmployeeProfileMap();
    const master = masterProfiles.get(cleanNik);
    const prefs = await loadMealPreferences(ymd, cleanNik);
    const prevStatuses = await loadPreviousRosterStatuses(ymd, cleanNik);
    const prevStatus = prevStatuses.get(cleanNik);
    const refCatatanMap = await loadReferenceCatatanMap(ymd);
    const lockedStatusMess = master?.statusMess || current.statusMess;
    const lockedShift = master?.shift || current.shift;
    const lockedSection = master?.section || emp.section;
    const lockedTt = (current.tempatTinggal && current.tempatTinggal.length <= 25 ? current.tempatTinggal : null) || master?.tempatTinggal || null;
    const currentCatatan = current.catatan && current.catatan !== '-' && !current.catatan.startsWith('Cuti') ? current.catatan : null;
    let lockedCatatan = currentCatatan || refCatatanMap.get(cleanNik) || null;

    const isTueWedSat = isTuesdayWednesdaySaturday(ymd);
    const isCR = ['CR', 'MESS'].includes(String(lockedStatusMess || emp.statusMess || '').trim().toUpperCase());
    if (isCR && isTueWedSat) {
      if (lockedCatatan === 'Bungkusan Sore') {
        lockedCatatan = null;
      } else if (lockedCatatan === 'Bungkusan Pagi dan Bungkusan Sore') {
        lockedCatatan = 'Bungkusan Pagi';
      }
    }

    const empPref = withCurrentChoice(prefs.get(cleanNik), { ...current, catatan: lockedCatatan });
    if (lockedCatatan === 'Bungkusan Pagi') {
      empPref.pagi = 'lapangan';
      empPref.sore = 'kantin';
    } else if (lockedCatatan === 'Bungkusan Sore') {
      empPref.sore = 'lapangan';
      if (!empPref.pagi) empPref.pagi = 'kantin';
    } else if (lockedCatatan === 'Bungkusan Pagi dan Bungkusan Sore') {
      empPref.pagi = 'lapangan';
      empPref.sore = 'lapangan';
    } else if (lockedCatatan === '-' || !lockedCatatan) {
      if (!empPref.pagi) empPref.pagi = 'kantin';
      empPref.sore = 'kantin';
    }

    const computed = computeMealOrderByRoster(
      { ...emp, name: master?.nama || emp.name, statusMess: lockedStatusMess, shift: lockedShift, section: lockedSection, tempatTinggal: lockedTt, alamatDomisili: null, keteranganLapor: current.keteranganLapor },
      rosterStatus, ymd, empPref, prevStatus,
    );
    if (computed.shiftKerja === 'SIANG' && (lockedShift === 'Nonshift' || (await loadNonshiftNiks(ymd, cleanNik)).has(cleanNik))) computed.shiftKerja = 'Nonshift';

    let finalCatatan = (isCatatanDisabledForEmployee({ tempatTinggal: lockedTt, shiftKerja: computed.shiftKerja, statusKerja: computed.statusKerja, status: computed.status }) || computed.keteranganLapor === 'Belum Lapor')
      ? null
      : (lockedCatatan || computed.catatan || null);

    // Jangan rubah ke Bungkusan Sore saat pindah tanggal jika tidak diganti!
    const isExplicitSoreSingle = finalCatatan === 'Bungkusan Sore' || finalCatatan === 'Bungkusan Pagi dan Bungkusan Sore' || empPref.sore === 'lapangan';
    const isKawasiLSSingle = (lockedTt || '').toLowerCase().includes('kawasi') && computed.shiftKerja === 'Longshift';
    if (!isKawasiLSSingle && !isExplicitSoreSingle) {
      computed.soreLapangan = null;
      computed.soreKantin = 'K';
      computed.batchSore = null;
    }

    if (isCR && isTueWedSat) {
      const sk = String(computed.shiftKerja || computed.statusKerja || computed.status || '').trim().toUpperCase();
      const isAbsent = ['CUTI', 'CS', 'IZIN', 'OFF', 'SAKIT', 'MALAM'].includes(sk);
      if (!isAbsent && computed.keteranganLapor !== 'Belum Lapor') {
        computed.soreKantin = 'K';
        computed.soreLapangan = null;
        computed.batchSore = null;
      }
      if (finalCatatan === 'Bungkusan Sore') {
        finalCatatan = null;
      } else if (finalCatatan === 'Bungkusan Pagi dan Bungkusan Sore') {
        finalCatatan = 'Bungkusan Pagi';
      }
    }

    const updateValues: any = {
      ...(master?.sortNo != null ? { sortNo: master.sortNo } : {}),
      ...(master?.nama ? { nama: master.nama } : {}),
      ...(lockedStatusMess ? { statusMess: lockedStatusMess } : {}),
      ...(master?.pt ? { pt: master.pt } : {}),
      ...(lockedShift ? { shift: lockedShift } : {}),
      ...(lockedSection ? { section: lockedSection } : {}),
      ...(lockedTt ? { tempatTinggal: lockedTt } : {}),
      statusKerja: computed.statusKerja,
      shiftKerja: computed.shiftKerja,
      pagiKantin: computed.pagiKantin,
      pagiLapangan: computed.pagiLapangan,
      siangKantin: computed.siangKantin,
      siangLapangan: computed.siangLapangan,
      soreKantin: computed.soreKantin,
      soreLapangan: computed.soreLapangan,
      takjilLapangan: computed.takjilLapangan,
      malamLapangan: computed.malamLapangan,
      batchPagi: computed.batchPagi,
      batchSore: computed.batchSore,
      status: computed.status,
      keteranganLapor: computed.keteranganLapor,
      catatan: finalCatatan,
      updatedBy,
      updatedAt: new Date(),
    };

    // Update jika sudah ada untuk tanggal tersebut
    const existing = await db.select({ id: mealOrders.id }).from(mealOrders)
      .where(and(eq(mealOrders.orderDate, ymd), eq(mealOrders.nik, emp.nik))).limit(1);

    if (existing.length > 0) {
      await db.update(mealOrders).set(updateValues).where(eq(mealOrders.id, existing[0].id));
      scheduleSheetSync();
    }
  } catch (err: any) {
    console.error(`[MealOrders syncSingleEmployeeMealOrder error for ${nik}]:`, err?.message);
  }
}

let cachedSeedMealRows: any[] | null = null;
function getMealOrderSeedRows(date: string) {
  if (!cachedSeedMealRows) {
    try {
      const parsed = parseMealOrderSheet(Papa.parse<unknown[]>(MEAL_ORDER_SEED_CSV, { skipEmptyLines: true }).data);
      if (parsed?.rows?.length) {
        cachedSeedMealRows = parsed.rows;
      }
    } catch (e: any) {
      console.warn('[MealOrderSeed parse warning]:', e?.message);
    }
  }
  return (cachedSeedMealRows || []).map((r, idx) => {
    const hasBatchPagi = r.batchPagi === '1' || r.batchPagi === 1 || String(r.batchPagi || '').trim() === '1';
    const hasBatchSore = r.batchSore === '1' || r.batchSore === 1 || String(r.batchSore || '').trim() === '1';
    const isShiftA = String(r.shift || '').toUpperCase() === 'A';
    const isShiftB = String(r.shift || '').toUpperCase() === 'B';
    const isNonshift = String(r.shift || '').toUpperCase() === 'NONSHIFT' || !r.shift;
    const isCR = String(r.statusMess || '').toUpperCase() === 'CR';
    const isPrep = String(r.section || '').toLowerCase().includes('prep');

    // Tentukan porsi lapangan / bungkusan sesuai data seed
    const pagiLapangan = r.pagiLapangan || (hasBatchPagi ? '1' : null);
    const pagiKantin = r.pagiKantin || (!hasBatchPagi && isCR ? '1' : null);
    const siangLapangan = r.siangLapangan || (isShiftA || (isPrep && !isNonshift) ? '1' : null);
    const siangKantin = r.siangKantin || (!siangLapangan && (isNonshift || isCR) ? '1' : null);
    const soreLapangan = r.soreLapangan || (hasBatchSore ? '1' : null);
    const soreKantin = r.soreKantin || (!hasBatchSore && isCR ? '1' : null);
    const malamLapangan = r.malamLapangan || (isShiftB ? '1' : null);

    let catatan = r.catatan || null;
    if (!catatan) {
      if (hasBatchPagi && hasBatchSore) catatan = 'Bungkusan Pagi dan Bungkusan Sore';
      else if (hasBatchPagi) catatan = 'Bungkusan Pagi';
      else if (hasBatchSore) catatan = 'Bungkusan Sore';
      else catatan = '-';
    }

    return {
      id: idx + 1,
      orderDate: date,
      sortNo: r.sortNo ?? idx + 1,
      nik: r.nik,
      nama: r.nama,
      statusMess: r.statusMess || null,
      pt: r.pt || null,
      shift: r.shift || null,
      section: r.section || null,
      statusKerja: r.statusKerja || null,
      sahur: r.sahur || null,
      tidakPuasa: r.tidakPuasa || null,
      tempatTinggal: r.tempatTinggal || null,
      shiftKerja: r.shiftKerja || (isShiftB ? 'MALAM' : isShiftA ? 'SIANG' : 'Nonshift'),
      pagiKantin,
      pagiLapangan,
      sahurKantin: r.sahurKantin || null,
      sahurLapangan: r.sahurLapangan || null,
      siangKantin,
      siangLapangan,
      soreKantin,
      soreLapangan,
      takjilLapangan: r.takjilLapangan || null,
      malamLapangan,
      batchPagi: hasBatchPagi ? '1' : null,
      batchSore: hasBatchSore ? '1' : null,
      status: r.status || null,
      keteranganLapor: r.keteranganLapor || null,
      catatan,
      pilihanPagi: r.pilihanPagi || (hasBatchPagi ? 'lapangan' : 'kantin'),
      pilihanSore: r.pilihanSore || (hasBatchSore ? 'lapangan' : 'kantin'),
    };
  });
}

async function getMealOrderRowsWithLatestProfiles(date: string) {
  const seedRows = getMealOrderSeedRows(date);
  try {
    const lastOrders = await db.select({
      nik: mealOrders.nik, pt: mealOrders.pt, tempatTinggal: mealOrders.tempatTinggal,
      statusMess: mealOrders.statusMess, shift: mealOrders.shift, section: mealOrders.section,
    }).from(mealOrders)
      .orderBy(sql`CASE WHEN ${mealOrders.orderDate} < ${date} THEN 0 ELSE 1 END`, sql`ABS(${mealOrders.orderDate} - ${date}::date)`);
    const lastByNik = new Map<string, typeof lastOrders[0]>();
    for (const lo of lastOrders) {
      const k = String(lo.nik || '').toUpperCase().trim();
      if (!lastByNik.has(k)) lastByNik.set(k, lo);
    }
    const masterProfiles = await loadMasterEmployeeProfileMap();
    const dbEmps = await db.select({ nik: employees.nik, pt: employees.pt, statusMess: employees.statusMess, shift: employees.shift, section: employees.section }).from(employees);
    const empByNik = new Map(dbEmps.map(e => [String(e.nik || '').toUpperCase().trim(), e]));

    return seedRows.map(r => {
      const k = String(r.nik || '').toUpperCase().trim();
      const last = lastByNik.get(k);
      const master = masterProfiles.get(k);
      const emp = empByNik.get(k);
      const pt = last?.pt || master?.pt || emp?.pt || r.pt || null;
      const tempatTinggal = (last?.tempatTinggal && last.tempatTinggal.length <= 25 ? last.tempatTinggal : null) || master?.tempatTinggal || r.tempatTinggal || null;
      return {
        ...r,
        pt,
        tempatTinggal,
        statusMess: last?.statusMess || master?.statusMess || emp?.statusMess || r.statusMess || null,
        shift: last?.shift || master?.shift || emp?.shift || r.shift || null,
        section: last?.section || master?.section || emp?.section || r.section || null,
      };
    });
  } catch (err: any) {
    console.warn('[MealOrders latest profiles fallback warn]:', err?.message);
    return seedRows;
  }
}

// 1. GET /api/meal-orders?date=YYYY-MM-DD — daftar order satu tanggal + tanggal-tanggal yang sudah ada datanya
mealOrdersRouter.get("/api/meal-orders", async (req, res) => {
  const date = isDate(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
  try {
    ensureMealOrdersTable().catch(() => {});
    const access = await getTrainingAccess((req as any).user).catch(() => ({ viewAll: true, canManage: true, nik: '' }));
    maybePullFromSheet();

    let rows: any[] = [];
    if (isDbCircuitBroken()) {
      rows = await getMealOrderRowsWithLatestProfiles(date);
    } else {
      try {
        const inactive = await getInactiveNiks().catch(() => new Set<string>());
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000));
        const dbPromise = db.select().from(mealOrders)
          .where(eq(mealOrders.orderDate, date))
          .orderBy(sql`${mealOrders.sortNo} ASC NULLS LAST`, asc(mealOrders.nama));
        const dbRows = ((await Promise.race([dbPromise, timeoutPromise])) as any[]).filter(isActiveRow(inactive));

        if (!dbRows || dbRows.length === 0) {
          rows = await getMealOrderRowsWithLatestProfiles(date);
        } else {
          rows = dbRows;
        }
      } catch (dbErr: any) {
        console.warn("[MealOrders GET DB offline, using seed fallback]:", dbErr?.message);
        rows = await getMealOrderRowsWithLatestProfiles(date);
      }
    }

    const defaultDates = [
      { date: '2026-10-15', count: rows.length },
      { date: '2026-10-14', count: rows.length },
      { date: '2026-10-13', count: rows.length },
      { date: '2026-10-12', count: rows.length },
      { date: '2026-10-11', count: rows.length },
      { date: '2026-10-10', count: rows.length },
      { date: '2026-10-09', count: rows.length },
    ];

    if (!isDbCircuitBroken()) {
      try {
        const timeoutDates = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000));
        const dbDatesPromise = db.select({ date: mealOrders.orderDate, count: sql<number>`COUNT(*)::int` })
          .from(mealOrders)
          .groupBy(mealOrders.orderDate).orderBy(desc(mealOrders.orderDate)).limit(60);
        const dbDates: any = await Promise.race([dbDatesPromise, timeoutDates]);
        if (dbDates && dbDates.length > 0) {
          return res.json({ status: "success", date, data: rows, dates: dbDates, access: { canManage: access.canManage } });
        }
      } catch {}
    }

    return res.json({ status: "success", date, data: rows, dates: defaultDates, access: { canManage: access.canManage } });
  } catch (error: any) {
    console.warn("[MealOrders GET fallback]:", error?.message);
    const rows = getMealOrderSeedRows(date);
    const defaultDates = [
      { date: '2026-10-15', count: rows.length },
      { date: '2026-10-14', count: rows.length },
      { date: '2026-10-13', count: rows.length },
      { date: '2026-10-12', count: rows.length },
      { date: '2026-10-11', count: rows.length },
    ];
    res.json({ status: "success", date, data: rows, dates: defaultDates, access: { canManage: true } });
  }
});

// 1b. POST /api/meal-orders/sync-roster — sinkronkan orderan makanan satu tanggal dengan data Roster & Cuti
mealOrdersRouter.post("/api/meal-orders/sync-roster", requireMealManager, async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const date = req.body?.date;
    const overwrite = req.body?.overwrite !== false; // default true untuk pembaruan eksplisit
    if (!isDate(date)) return res.status(400).json({ status: "error", message: "Tanggal tidak valid (YYYY-MM-DD)." });

    const { synced, removed, source } = await syncMealOrdersFromRoster(date, updatedByOf(req), overwrite);
    const from = source === 'sheet' ? 'Google Sheets "Database Rooster Prep & Lab"' : 'data Roster database (sheet tidak terbaca / tanggal belum ada di sheet)';
    const removedMsg = removed ? ` ${removed} karyawan yang tidak ada di roster dikeluarkan.` : '';
    res.json({ status: "success", synced, removed, source, message: `Berhasil menyinkronkan ${synced} data order makanan dari ${from}.${removedMsg}` });
  } catch (error: any) {
    console.error("[MealOrders SYNC-ROSTER] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 2. POST /api/meal-orders — tambah karyawan ke order tanggal tsb (profil diisi otomatis dari Database Karyawan)
mealOrdersRouter.post("/api/meal-orders", requireMealManager, async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const date = req.body?.orderDate;
    const nik = String(req.body?.nik || '').trim().toUpperCase();
    if (!isDate(date) || !nik) return res.status(400).json({ status: "error", message: "Tanggal dan NIK wajib diisi." });

    const [emp] = await db.select().from(employees).where(sql`UPPER(${employees.nik}) = ${nik}`).limit(1);
    if (emp && isResignedOrNonActiveStatus(emp)) {
      return res.status(400).json({ status: "error", message: `${emp.name} berstatus ${emp.statusKaryawan || 'Nonaktif'} di Database Karyawan — tidak bisa ditambahkan ke Orderan Makanan.` });
    }
    const fields = pickFields(req.body);
    const nama = fields.nama || emp?.name;
    if (!nama) return res.status(400).json({ status: "error", message: "Nama karyawan wajib diisi (NIK tidak ditemukan di Database Karyawan)." });

    if (fields.keteranganLapor === 'Belum Lapor' || /belum\s*lapor/i.test(String(fields.keteranganLapor || ''))) {
      fields.keteranganLapor = 'Belum Lapor';
      fields.pagiKantin = null;
      fields.pagiLapangan = null;
      fields.sahurKantin = null;
      fields.sahurLapangan = null;
      fields.siangKantin = null;
      fields.siangLapangan = null;
      fields.soreKantin = null;
      fields.soreLapangan = null;
      fields.takjilLapangan = null;
      fields.malamLapangan = null;
      fields.batchPagi = null;
      fields.batchSore = null;
      fields.catatan = null;
    }

    const [{ maxNo }] = await db.select({ maxNo: sql<number>`COALESCE(MAX(${mealOrders.sortNo}), 0)::int` })
      .from(mealOrders).where(eq(mealOrders.orderDate, date));

    const values = {
      orderDate: date,
      nik,
      sortNo: fields.sortNo ?? maxNo + 1,
      statusMess: emp?.statusMess ?? null,
      pt: emp?.pt ?? null,
      shift: emp?.shift ?? null,
      section: emp?.section ?? null,
      ...fields,
      nama,
      updatedBy: updatedByOf(req),
      updatedAt: new Date(),
    };
    const [row] = await db.insert(mealOrders).values(values)
      .onConflictDoUpdate({ target: [mealOrders.orderDate, mealOrders.nik], set: { ...fields, nama, updatedBy: values.updatedBy, updatedAt: values.updatedAt } })
      .returning();
    scheduleSheetSync();
    res.json({ status: "success", data: row });
  } catch (error: any) {
    console.error("[MealOrders POST] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 3. POST /api/meal-orders/copy — salin daftar & pola order dari tanggal lain (konfirmasi direset)
mealOrdersRouter.post("/api/meal-orders/copy", requireMealManager, async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const { from, to } = req.body || {};
    if (!isDate(from) || !isDate(to) || from === to) return res.status(400).json({ status: "error", message: "Tanggal sumber & tujuan tidak valid." });

    const source = (await db.select().from(mealOrders).where(eq(mealOrders.orderDate, from))).filter(isActiveRow(await getInactiveNiks()));
    if (source.length === 0) return res.status(400).json({ status: "error", message: "Tanggal sumber belum memiliki data." });

    const by = updatedByOf(req);
    const now = new Date();
    // Konfirmasi batch & keterangan lapor direset untuk hari baru
    const values = source.map(({ id, createdAt, updatedAt, updatedBy, orderDate, ...rest }) => ({
      ...rest, orderDate: to, batchPagi: null, batchSore: null, keteranganLapor: null, updatedBy: by, updatedAt: now,
    }));
    // Karyawan yang sudah ada di tanggal tujuan tidak ditimpa
    const inserted = await db.insert(mealOrders).values(values)
      .onConflictDoNothing({ target: [mealOrders.orderDate, mealOrders.nik] }).returning({ id: mealOrders.id });
    if (inserted.length) scheduleSheetSync();
    res.json({ status: "success", inserted: inserted.length, skipped: values.length - inserted.length });
  } catch (error: any) {
    console.error("[MealOrders COPY] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 3b. POST /api/meal-orders/import — simpan hasil import sheet (CSV / Excel) untuk satu tanggal
mealOrdersRouter.post("/api/meal-orders/import", requireMealManager, async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const { orderDate, rows, fields } = req.body || {};
    if (!isDate(orderDate) || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ status: "error", message: "Tanggal & data import wajib diisi." });
    }
    // Kolom yang ada di file (format sama dengan tabel Orderan Makanan) → hanya kolom ini yang disinkronkan
    const fileFields: string[] | undefined = Array.isArray(fields)
      ? fields.filter((f: unknown): f is string => typeof f === 'string' && (EDITABLE_FIELDS as readonly string[]).includes(f))
      : undefined;
    const clean: ParsedMealOrderRow[] = rows
      .map((r: any, i: number) => {
        const f = pickFields(r) as Record<string, any>;
        return { ...f, sortNo: f.sortNo ?? i + 1, nik: String(r.nik || '').trim().toUpperCase(), nama: String(r.nama || '').trim() } as ParsedMealOrderRow;
      })
      .filter(r => r.nik && r.nama)
      .filter(isActiveRow(await getInactiveNiks()));
    // Baris baru: kolom yang tidak ada di file kosong. Baris yang sudah ada: hanya kolom file yang ditimpa.
    const full = clean.map(r => ({ ...Object.fromEntries(EDITABLE_FIELDS.map(f => [f, null])), ...r })) as ParsedMealOrderRow[];
    const saved = await bulkUpsertMealOrders(orderDate, full, `import:${updatedByOf(req)}`, fileFields);
    scheduleSheetSync();
    res.json({ status: "success", saved, fields: fileFields?.length ?? EDITABLE_FIELDS.length });
  } catch (error: any) {
    console.error("[MealOrders IMPORT] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 3b. POST /api/meal-orders/import-profiles — Import & Perbarui Profil Karyawan dari format Excel
// Format Excel: NO, NAMA KARYAWAN NR, NIK, Status Mess, PT, Shift, Section, Tempat Tinggal
// Memperbarui master database karyawan & seluruh baris meal_orders untuk karyawan-karyawan ini
mealOrdersRouter.post("/api/meal-orders/import-profiles", requireMealManager, async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const rows = req.body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ status: "error", message: "Data profil karyawan kosong atau tidak valid." });
    }

    const by = updatedByOf(req);
    const now = new Date();
    let empUpdated = 0;
    let empInserted = 0;
    let ordersUpdated = 0;
    let tbpCount = 0;
    let gpsCount = 0;

    for (const raw of rows) {
      const nik = String(raw.nik || raw.NIK || '').trim().toUpperCase();
      if (!nik || nik === 'NIK') continue;

      const nama = String(raw.nama || raw.name || raw['NAMA KARYAWAN NR'] || raw['NAMA KARYAWAN'] || raw['Nama'] || '').trim();
      const rawPt = String(raw.pt || raw.PT || raw.perusahaan || raw.company || '').trim().toUpperCase();
      const pt = rawPt.includes('GPS') ? 'GPS' : rawPt.includes('TBP') ? 'TBP' : (rawPt || null);
      if (pt === 'TBP') tbpCount++;
      else if (pt === 'GPS') gpsCount++;

      const statusMess = String(raw.statusMess || raw['Status Mess'] || raw['STATUS MESS'] || raw['status_mess'] || '').trim() || null;
      const shift = String(raw.shift || raw.Shift || raw.SHIFT || '').trim() || null;
      const section = String(raw.section || raw.Section || raw.SECTION || raw.bagian || raw.Bagian || '').trim() || null;
      const tempatTinggal = String(raw.tempatTinggal || raw['Tempat Tinggal'] || raw['TEMPAT TINGGAL'] || raw.residence || raw.Residence || raw.domisili || '').trim() || null;
      const sortNo = Number(raw.no || raw.NO || raw.sortNo) || null;

      // 1. Update / Insert di tabel employees
      const existingEmp = await db.select().from(employees).where(sql`UPPER(TRIM(${employees.nik})) = ${nik}`).limit(1);
      if (existingEmp.length > 0) {
        const empPatch: Record<string, any> = {};
        if (nama) empPatch.name = nama;
        if (pt) empPatch.pt = pt;
        if (statusMess) empPatch.statusMess = statusMess;
        if (shift) empPatch.shift = shift;
        if (section) empPatch.section = section;
        if (tempatTinggal) empPatch.alamatDomisili = tempatTinggal;

        if (Object.keys(empPatch).length > 0) {
          await db.update(employees).set(empPatch).where(eq(employees.id, existingEmp[0].id));
          empUpdated++;
        }
      } else if (nama) {
        await db.insert(employees).values({
          nik,
          name: nama,
          pt: pt || 'TBP',
          statusMess: statusMess || 'CR',
          shift: shift || 'Nonshift',
          section: section || 'Laboratorium Krishna',
          alamatDomisili: tempatTinggal || 'Nirwana',
          department: 'Preparation & Laboratory',
          statusKaryawan: 'Aktif',
        });
        empInserted++;
      }

      // 2. Update seluruh baris di tabel meal_orders untuk NIK tersebut
      // Inilah satu-satunya cara resmi kolom PT & profil operasional ter-update di modul orderan makanan!
      const orderPatch: Record<string, any> = { updatedBy: `import-profile:${by}`, updatedAt: now };
      if (nama) orderPatch.nama = nama;
      if (pt) orderPatch.pt = pt;
      if (statusMess) orderPatch.statusMess = statusMess;
      if (shift) orderPatch.shift = shift;
      if (section) orderPatch.section = section;
      if (tempatTinggal) orderPatch.tempatTinggal = tempatTinggal;
      if (sortNo != null) orderPatch.sortNo = sortNo;

      const updatedOrders = await db.update(mealOrders)
        .set(orderPatch)
        .where(sql`UPPER(TRIM(${mealOrders.nik})) = ${nik}`)
        .returning({ id: mealOrders.id });
      ordersUpdated += updatedOrders.length;
    }

    scheduleSheetSync();

    res.json({
      status: "success",
      message: `Berhasil memperbarui ${rows.length} profil karyawan (TBP: ${tbpCount}, GPS: ${gpsCount}). ${ordersUpdated} baris data Orderan Makanan telah disinkronkan.`,
      stats: {
        total: rows.length,
        empUpdated,
        empInserted,
        ordersUpdated,
        tbpCount,
        gpsCount,
      }
    });
  } catch (error: any) {
    console.error("[MealOrders IMPORT-PROFILES] Error:", error);
    res.status(500).json({ status: "error", message: error.message || "Gagal mengimpor profil karyawan." });
  }
});

// Kode roster satu karyawan pada satu tanggal: sheet "Database Rooster Prep & Lab", cadangan tabel roster database
async function getRosterCodeForDate(nik: string, date: string): Promise<{ code: string | null; source: RosterSource }> {
  const key = nik.toUpperCase().trim();
  const dateFormats = getPossibleRosterDateStrings(date);
  try {
    const sheet = await fetchRosterSheetForDate(dateFormats);
    if (sheet.dateFound) {
      const e = sheet.entries.find(x => x.nik.toUpperCase().trim() === key);
      if (e) return { code: e.status || '-', source: 'sheet' };
    }
  } catch (err: any) {
    console.warn(`[MealOrders] Gagal membaca sheet roster untuk ${key} ${date}: ${err?.message}`);
  }
  const [r] = await db.select({ status: roster.status }).from(roster)
    .where(and(sql`UPPER(${roster.nik}) = ${key}`, inArray(roster.date, dateFormats))).limit(1);
  return { code: r?.status ? r.status.trim() : null, source: 'database' };
}

// 3c. POST /api/meal-orders/:id/clear-belum-lapor — matikan "Belum Lapor" lalu kembalikan orderan ke roster kerja tanggal tsb
//     (mis. roster N → Malam). Profil karyawan di orderan tidak diubah; pilihan Pagi/Sore Catatan tetap dipakai.
mealOrdersRouter.post("/api/meal-orders/:id/clear-belum-lapor", requireMealManager, async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const id = Number(req.params.id);
    const [row] = await db.select().from(mealOrders).where(eq(mealOrders.id, id)).limit(1);
    if (!row) return res.status(404).json({ status: "error", message: "Orderan tidak ditemukan." });
    const date = ymd(row.orderDate);
    const nik = row.nik.toUpperCase().trim();

    const { code: rawCode, source } = await getRosterCodeForDate(nik, date);
    // Belum Lapor dimatikan manual → kode roster dipakai tanpa penanda BL
    const code = String(rawCode || '-').replace(/belum\s*lapor|\bBL\b/gi, '').trim() || '-';
    const [emp] = await db.select({ gol: employees.gol, alamatDomisili: employees.alamatDomisili }).from(employees).where(sql`UPPER(${employees.nik}) = ${nik}`).limit(1);
    const prefs = await loadMealPreferences(date, nik);
    const computed = computeMealOrderByRoster(
      { nik: row.nik, name: row.nama, statusMess: row.statusMess, shift: row.shift, section: row.section, tempatTinggal: row.tempatTinggal, gol: emp?.gol ?? null, alamatDomisili: null, keteranganLapor: null, status: null },
      code, date, withCurrentChoice(prefs.get(nik), row), 'D',
    );
    if (String(computed.shiftKerja || '').toUpperCase() === 'SIANG' && (String(row.shift || '').toLowerCase().includes('nonshift') || (await loadNonshiftNiks(date, nik)).has(nik))) computed.shiftKerja = 'Nonshift';

    const [updated] = await db.update(mealOrders).set({
      statusKerja: computed.statusKerja,
      shiftKerja: computed.shiftKerja,
      pagiKantin: computed.pagiKantin, pagiLapangan: computed.pagiLapangan,
      siangKantin: computed.siangKantin, siangLapangan: computed.siangLapangan,
      soreKantin: computed.soreKantin, soreLapangan: computed.soreLapangan,
      takjilLapangan: computed.takjilLapangan, malamLapangan: computed.malamLapangan,
      batchPagi: computed.batchPagi, batchSore: computed.batchSore,
      status: computed.status,
      keteranganLapor: null,
      catatan: computed.catatan,
      updatedBy: updatedByOf(req), updatedAt: new Date(),
    }).where(eq(mealOrders.id, id)).returning();
    scheduleSheetSync();
    res.json({ status: "success", data: updated, rosterCode: rawCode ? code : null, source });
  } catch (error: any) {
    console.error("[MealOrders CLEAR-BELUM-LAPOR] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 4. PUT /api/meal-orders/:id — ubah sebagian kolom (dipakai edit sel langsung di tabel)
mealOrdersRouter.put("/api/meal-orders/:id", requireMealManager, async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const id = Number(req.params.id);
    const fields = pickFields(req.body);
    if (!id || Object.keys(fields).length === 0) return res.status(400).json({ status: "error", message: "Tidak ada perubahan." });
    if ('nama' in fields && !fields.nama) return res.status(400).json({ status: "error", message: "Nama tidak boleh kosong." });

    // Jika Belum Lapor diset aktif, seluruh porsi makanan, batch, dan catatan wajib dikosongkan
    if (fields.keteranganLapor === 'Belum Lapor' || /belum\s*lapor/i.test(String(fields.keteranganLapor || ''))) {
      fields.keteranganLapor = 'Belum Lapor';
      fields.pagiKantin = null;
      fields.pagiLapangan = null;
      fields.sahurKantin = null;
      fields.sahurLapangan = null;
      fields.siangKantin = null;
      fields.siangLapangan = null;
      fields.soreKantin = null;
      fields.soreLapangan = null;
      fields.takjilLapangan = null;
      fields.malamLapangan = null;
      fields.batchPagi = null;
      fields.batchSore = null;
      fields.catatan = null;
    } else if ('shiftKerja' in fields && fields.shiftKerja) {
      // Jika shift diubah tanpa mengirim porsi makan manual, hitung otomatis sesuai aturan modul
      const mealKeys = ['pagiKantin', 'pagiLapangan', 'siangKantin', 'siangLapangan', 'soreKantin', 'soreLapangan', 'malamLapangan'];
      const hasMealFields = mealKeys.some(k => k in fields);
      if (!hasMealFields) {
        const [currentRow] = await db.select().from(mealOrders).where(eq(mealOrders.id, id)).limit(1);
        if (currentRow) {
          const sUpper = String(fields.shiftKerja).toUpperCase();
          let rosterCode = 'D';
          let canonicalShift = 'Siang';
          if (sUpper === 'CUTI SITE' || sUpper === 'CS') { rosterCode = 'CS'; canonicalShift = 'Cuti Site'; }
          else if (sUpper === 'IZIN') { rosterCode = 'I'; canonicalShift = 'Izin'; }
          else if (sUpper === 'OFF') { rosterCode = 'OFF'; canonicalShift = 'OFF'; }
          else if (sUpper === 'SAKIT' || sUpper === 'SS') { rosterCode = 'SS'; canonicalShift = 'Sakit'; }
          else if (sUpper === 'CUTI') { rosterCode = 'CUTI'; canonicalShift = 'CUTI'; }
          else if (sUpper === 'MALAM') { rosterCode = 'N'; canonicalShift = 'Malam'; }
          else if (sUpper === 'LONGSHIFT') { rosterCode = 'LS'; canonicalShift = 'Longshift'; }
          else if (sUpper === 'NONSHIFT') { rosterCode = 'D'; canonicalShift = 'Nonshift'; }
          else if (sUpper === 'SIANG') { rosterCode = 'D'; canonicalShift = 'Siang'; }

          const pref: MealPreference = {
            pagi: (currentRow.pilihanPagi as MealChoice) || null,
            sore: (currentRow.pilihanSore as MealChoice) || null,
          };
          const computed = computeMealOrderByRoster(currentRow, rosterCode, ymd(currentRow.orderDate), pref);
          fields.shiftKerja = canonicalShift;
          fields.statusKerja = computed.statusKerja;
          fields.status = computed.status;
          fields.pagiKantin = computed.pagiKantin;
          fields.pagiLapangan = computed.pagiLapangan;
          fields.siangKantin = computed.siangKantin;
          fields.siangLapangan = computed.siangLapangan;
          fields.soreKantin = computed.soreKantin;
          fields.soreLapangan = computed.soreLapangan;
          fields.malamLapangan = computed.malamLapangan;
          fields.batchPagi = computed.batchPagi;
          fields.batchSore = computed.batchSore;
          fields.catatan = computed.catatan;
        }
      }
    }

    // Proteksi: Hari Selasa, Rabu, dan Sabtu untuk Karyawan Status Mess CR (Gol II-V):
    // Tidak ada yang Bungkusan Sore, semua kantin dan tidak bisa diganti!
    const [existing] = await db.select({
      orderDate: mealOrders.orderDate,
      statusMess: mealOrders.statusMess,
    }).from(mealOrders).where(eq(mealOrders.id, id)).limit(1);

    if (existing) {
      const isTueWedSat = isTuesdayWednesdaySaturday(String(existing.orderDate));
      const sm = String(fields.statusMess || existing.statusMess || '').trim().toUpperCase();
      const isCR = sm === 'CR' || sm === 'MESS';
      if (isTueWedSat && isCR) {
        if ('soreLapangan' in fields && fields.soreLapangan && portions(fields.soreLapangan) > 0) {
          return res.status(400).json({
            status: "error",
            message: "Hari Selasa, Rabu, dan Sabtu untuk Status Mess CR wajib Kantin dan tidak bisa Bungkusan Sore."
          });
        }
        if ('catatan' in fields && fields.catatan) {
          if (fields.catatan === 'Bungkusan Sore') {
            return res.status(400).json({
              status: "error",
              message: "Hari Selasa, Rabu, dan Sabtu untuk Status Mess CR tidak ada Bungkusan Sore (semua Kantin)."
            });
          }
          if (fields.catatan === 'Bungkusan Pagi dan Bungkusan Sore') {
            fields.catatan = 'Bungkusan Pagi';
          }
        }
        if ('pilihanSore' in fields && fields.pilihanSore === 'lapangan') {
          fields.pilihanSore = 'kantin';
        }
        if ('soreLapangan' in fields) {
          fields.soreLapangan = null;
          fields.soreKantin = 'K';
          fields.batchSore = null;
        }
      }
    }

    const [row] = await db.update(mealOrders)
      .set({ ...fields, updatedBy: updatedByOf(req), updatedAt: new Date() })
      .where(eq(mealOrders.id, id)).returning();
    if (!row) return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    scheduleSheetSync();
    res.json({ status: "success", data: row });
  } catch (error: any) {
    console.error("[MealOrders PUT] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 5. DELETE /api/meal-orders/:id — hapus satu karyawan dari order tanggal tsb
mealOrdersRouter.delete("/api/meal-orders/:id", requireMealManager, async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const id = Number(req.params.id);
    const deleted = await db.delete(mealOrders).where(and(eq(mealOrders.id, id))).returning({ id: mealOrders.id });
    if (deleted.length === 0) return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    scheduleSheetSync();
    res.json({ status: "success" });
  } catch (error: any) {
    console.error("[MealOrders DELETE] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 6. GET /api/meal-orders/sheet — link Google Sheets "Meal Order" (hanya Section Administrasi / Developer)
// GET /api/meal-orders/bungkus-stats?from=YYYY-MM-DD&to=YYYY-MM-DD — Rekapan Bungkusan harian (untuk list & diagram
// harian / mingguan / bulanan). Tanggal yang ada orderannya dihitung ulang & disimpan; tanggal lain memakai data tersimpan.
mealOrdersRouter.get("/api/meal-orders/bungkus-stats", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!isDate(from) || !isDate(to) || from > to) return res.status(400).json({ status: "error", message: "Rentang tanggal tidak valid (from/to YYYY-MM-DD)." });
    const spanDays = (Date.parse(to) - Date.parse(from)) / 86400000;
    if (spanDays > 400) return res.status(400).json({ status: "error", message: "Rentang maksimal ±1 tahun." });

    if (!isDbCircuitBroken()) {
      try {
        const timeoutTable = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000));
        await Promise.race([ensureMealOrdersTable(), timeoutTable]);

        const orderDates = (await db.select({ date: mealOrders.orderDate }).from(mealOrders)
          .where(and(sql`${mealOrders.orderDate} >= ${from}`, sql`${mealOrders.orderDate} <= ${to}`))
          .groupBy(mealOrders.orderDate)).map(r => ymd(r.date));
        const live = await snapshotBungkusDays(orderDates);
        const liveDates = new Set(orderDates);
        const saved = (await db.select().from(mealBungkusDaily)
          .where(and(sql`${mealBungkusDaily.orderDate} >= ${from}`, sql`${mealBungkusDaily.orderDate} <= ${to}`)))
          .filter(r => !liveDates.has(ymd(r.orderDate)))
          .map(r => ({ orderDate: ymd(r.orderDate), company: r.company, slot: r.slot, lapangan: r.lapangan, bungkusKantin: r.bungkusKantin, makanKantin: r.makanKantin, karyawan: r.karyawan }));
        const data = [...live, ...saved].sort((a, b) => a.orderDate.localeCompare(b.orderDate));
        return res.json({ status: "success", from, to, data });
      } catch (dbErr: any) {
        console.warn("[MealOrders BUNGKUS-STATS DB error, using seed fallback]:", dbErr?.message);
      }
    }

    // Fallback calculation from seed data
    const seedRows = getMealOrderSeedRows(from as string);
    const data: any[] = [];
    const tbpRows = seedRows.filter(r => (r.pt || '').toUpperCase() === 'TBP');
    const gpsRows = seedRows.filter(r => (r.pt || '').toUpperCase() === 'GPS');

    const dateList: string[] = [];
    let cur = parseYmd(from as string);
    const end = parseYmd(to as string);
    while (cur <= end && dateList.length < 31) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    for (const d of dateList) {
      for (const [company, compRows] of [['TBP', tbpRows], ['GPS', gpsRows]] as const) {
        for (const slot of ['Pagi', 'Siang', 'Sore', 'Malam']) {
          let lapangan = 0;
          let makanKantin = 0;
          if (slot === 'Pagi') {
            lapangan = compRows.filter(r => portions(r.pagiLapangan) > 0).length;
            makanKantin = compRows.filter(r => r.pagiKantin).length;
          } else if (slot === 'Siang') {
            lapangan = compRows.filter(r => portions(r.siangLapangan) > 0).length;
            makanKantin = compRows.filter(r => r.siangKantin).length;
          } else if (slot === 'Sore') {
            lapangan = compRows.filter(r => portions(r.soreLapangan) > 0).length;
            makanKantin = compRows.filter(r => r.soreKantin).length;
          } else if (slot === 'Malam') {
            lapangan = compRows.filter(r => portions(r.malamLapangan) > 0).length;
            makanKantin = 0;
          }
          data.push({
            orderDate: d,
            company,
            slot,
            lapangan,
            bungkusKantin: 0,
            makanKantin,
            karyawan: compRows.length
          });
        }
      }
    }
    return res.json({ status: "success", from, to, data });
  } catch (error: any) {
    console.error("[MealOrders BUNGKUS-STATS] Error:", error);
    res.json({ status: "success", from: req.query.from, to: req.query.to, data: [] });
  }
});

mealOrdersRouter.get("/api/meal-orders/sheet", requireMealManager, async (_req, res) => {
  try {
    const f = await findMealSheet();
    res.json({ status: "success", url: f?.url || null });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 7. POST /api/meal-orders/sync-sheet — buat / perbarui Google Sheets "Meal Order" sekarang juga
mealOrdersRouter.post("/api/meal-orders/sync-sheet", requireMealManager, async (_req, res) => {
  try {
    await ensureMealOrdersTable();
    const f = await syncMealOrderSheet({ forcePermissions: true });
    res.json({ status: "success", url: f.url, pulled: f.pulled });
  } catch (error: any) {
    console.error("[MealOrders SYNC] Error:", error);
    res.status(500).json({ status: "error", message: `Gagal sinkron ke Google Sheets: ${error.message}` });
  }
});
