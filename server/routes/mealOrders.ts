import { Router } from "express";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { parseMealOrderSheet, type ParsedMealOrderRow } from "../../src/utils/meal-order-import.js";
import { MEAL_ORDER_SEED_CSV } from "../data/mealOrderSeed.js";
import { db } from "../../src/db/index.js";
import { and, asc, eq, sql, desc, inArray, notInArray } from "drizzle-orm";
import { mealOrders, employees, roster, mealBungkusDaily } from "../../src/db/schema.js";
import { mealCounts, resolveMealCompany, MEAL_SLOTS, type MealCompany, type MealSlot } from "../../src/utils/meal-bungkus-counts.js";
import { drive } from "../../google-services.js";
import { getTrainingAccess } from "./training.js";
import {
  computeMealOrderByRoster,
  getPossibleRosterDateStrings,
  getPreviousDateString,
  isLeaveOrPermissionRosterStatus,
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
  const rows = await db.select({ nik: employees.nik, statusKaryawan: employees.statusKaryawan, section: employees.section }).from(employees);
  return new Set(rows.filter(e => e.nik && isResignedOrNonActiveStatus(e)).map(e => e.nik.toUpperCase().trim()));
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
        set: Object.fromEntries([...setFields, 'updatedBy', 'updatedAt'].map(f => [f, f.startsWith('pilihan')
          ? sql.raw(`COALESCE(excluded.${toSnake(f)}, meal_orders.${toSnake(f)})`)
          : f === 'tempatTinggal'
          ? sql.raw(`COALESCE(NULLIF(TRIM(excluded.tempat_tinggal), ''), meal_orders.tempat_tinggal)`)
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
    const header1 = ['NO', 'NAMA KARYAWAN', 'NIK', 'Status Mess', 'PT', 'Shift', 'Section', 'Status Kerja Karyawan', 'Keterangan', '', 'Tempat Tinggal', 'Shift (SIANG/MALAM)',
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
  const rows = await db.select({ nik: mealOrders.nik, pilihanPagi: mealOrders.pilihanPagi, pilihanSore: mealOrders.pilihanSore })
    .from(mealOrders)
    .where(and(
      sql`${mealOrders.orderDate} <= ${date}`,
      sql`(${mealOrders.pilihanPagi} IS NOT NULL OR ${mealOrders.pilihanSore} IS NOT NULL)`,
      nik ? sql`UPPER(${mealOrders.nik}) = ${nik.toUpperCase()}` : undefined,
    ))
    .orderBy(desc(mealOrders.orderDate));
  const prefs = new Map<string, MealPreference>();
  const asChoice = (v: string | null): MealChoice | null => (v === 'kantin' || v === 'lapangan' ? v : null);
  for (const r of rows) {
    const k = r.nik.toUpperCase().trim();
    const p = prefs.get(k) || {};
    if (p.pagi === undefined && asChoice(r.pilihanPagi)) p.pagi = asChoice(r.pilihanPagi);
    if (p.sore === undefined && asChoice(r.pilihanSore)) p.sore = asChoice(r.pilihanSore);
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
type CurrentChoiceRow = { pilihanPagi: string | null; pilihanSore: string | null; pagiLapangan: string | null; soreLapangan: string | null; shiftKerja: string | null };
function withCurrentChoice(pref: MealPreference | undefined, current: CurrentChoiceRow | undefined): MealPreference {
  const out: MealPreference = { ...(pref || {}) };
  if (!current) return out;
  const asChoice = (v: string | null): MealChoice | null => (v === 'kantin' || v === 'lapangan' ? v : null);
  const isLongShift = String(current.shiftKerja || '').toUpperCase() === 'LONGSHIFT';
  const pagi = asChoice(current.pilihanPagi) || (portions(current.pagiLapangan) > 0 ? 'lapangan' : null);
  const sore = asChoice(current.pilihanSore) || (!isLongShift && portions(current.soreLapangan) > 0 ? 'lapangan' : null);
  if (pagi) out.pagi = pagi;
  if (sore) out.sore = sore;
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
    } else {
      const cur = map.get(k)!;
      if (cur !== 'Nirwana' && tt === 'Nirwana') {
        map.set(k, 'Nirwana');
      } else if (cur !== 'Nirwana' && cur !== 'Kampung Kawasi' && tt === 'Kampung Kawasi') {
        map.set(k, 'Kampung Kawasi');
      }
    }
  }
  return map;
}

async function loadRosterForDate(date: string): Promise<{ emps: RosterEmp[]; source: RosterSource }> {
  const dateFormats = getPossibleRosterDateStrings(date);
  const masterTtByNik = await loadMasterTempatTinggalMap();

  // Profil karyawan (Status Mess, PT, Shift, Section, Tempat Tinggal) TIDAK diambil dari roster:
  // disalin persis dari orderan terakhir karyawan tsb sebelum tanggal ini (bila tidak ada: orderan terdekat sesudahnya).
  // Roster / Database Karyawan hanya untuk karyawan yang belum pernah ada di orderan.
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
    const p = profileByNik.get(nik);
    // Tempat Tinggal operasional dikunci: prioritaskan master yang sudah valid (Nirwana / Kampung Kawasi),
    // lalu riwayat orderan terdekat. JANGAN PERNAH mengambil alamatDomisili (alamat KTP/rumah).
    const lockedTt = masterTtByNik.get(nik) || (p?.tempatTinggal && p.tempatTinggal.length <= 25 ? p.tempatTinggal : null) || fallback.tempatTinggal || null;
    return {
      statusMess: p?.statusMess || fallback.statusMess || null,
      pt: p?.pt || fallback.pt || null,
      shift: p?.shift || fallback.shift || null,
      section: p?.section || fallback.section || null,
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
          const profile = profileOf(nik, { statusMess: e.statusMess || null, pt: e.pt || null, shift: e.shift || null, section: e.section || null, tempatTinggal: null });
          return { nik: e.nik, name: e.name, ...profile, gol: e.gol || null, status: e.status };
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
    nik: mealOrders.nik, statusMess: mealOrders.statusMess, pt: mealOrders.pt, shift: mealOrders.shift,
    section: mealOrders.section, tempatTinggal: mealOrders.tempatTinggal,
    pilihanPagi: mealOrders.pilihanPagi, pilihanSore: mealOrders.pilihanSore, pagiLapangan: mealOrders.pagiLapangan, soreLapangan: mealOrders.soreLapangan,
    shiftKerja: mealOrders.shiftKerja,
    keteranganLapor: mealOrders.keteranganLapor,
  }).from(mealOrders).where(eq(mealOrders.orderDate, date));
  const existingByNik = new Map(existingRows.map(r => [r.nik.toUpperCase().trim(), r]));
  const existingNiks = new Set(existingByNik.keys());

  const rowsToSave: any[] = [];
  let sortIndex = 1;
  const prefs = await loadMealPreferences(date);
  const nonshift = await loadNonshiftNiks(date);
  const prevStatuses = await loadPreviousRosterStatuses(date);
  const masterTtByNik = await loadMasterTempatTinggalMap();

  for (const rosterEmp of activeEmps) {
    const nik = rosterEmp.nik.toUpperCase().trim();
    if (!overwrite && existingNiks.has(nik)) {
      continue;
    }
    const current = existingByNik.get(nik);
    // Kolom Tempat Tinggal dikunci: pertahankan nilai di orderan atau gunakan master operasional
    const lockedTt = (current?.tempatTinggal && current.tempatTinggal.length <= 25 ? current.tempatTinggal : null) || masterTtByNik.get(nik) || rosterEmp.tempatTinggal || null;
    const emp = current
      ? { ...rosterEmp, statusMess: current.statusMess, pt: current.pt, shift: current.shift, section: current.section, tempatTinggal: lockedTt, keteranganLapor: current.keteranganLapor }
      : { ...rosterEmp, tempatTinggal: lockedTt };
    const prevStatus = prevStatuses.get(nik);
    const computed = computeMealOrderByRoster(emp, emp.status, date, withCurrentChoice(prefs.get(nik), current), prevStatus);
    if (computed.shiftKerja === 'SIANG' && nonshift.has(nik)) computed.shiftKerja = 'Nonshift';
    rowsToSave.push({
      orderDate: date,
      sortNo: sortIndex++,
      nik: emp.nik,
      nama: emp.name,
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
      catatan: computed.catatan,
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
        // Hanya kolom hasil roster kehadiran — profil karyawan di orderan tidak ditimpa
        set: Object.fromEntries([
          'statusKerja', 'shiftKerja',
          'pagiKantin', 'pagiLapangan', 'siangKantin', 'siangLapangan', 'soreKantin', 'soreLapangan',
          'takjilLapangan', 'malamLapangan', 'batchPagi', 'batchSore', 'status', 'keteranganLapor', 'catatan',
          'updatedBy', 'updatedAt'
        ].map(f => [f, sql.raw(`excluded.${toSnake(f)}`)]))
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

    // Profil dari orderan tanggal tsb (Status Mess, Shift, Tempat Tinggal, Keterangan Lapor) — dari roster hanya kode kehadiran
    const [current] = await db.select({
      statusMess: mealOrders.statusMess, shift: mealOrders.shift, tempatTinggal: mealOrders.tempatTinggal,
      pilihanPagi: mealOrders.pilihanPagi, pilihanSore: mealOrders.pilihanSore, pagiLapangan: mealOrders.pagiLapangan, soreLapangan: mealOrders.soreLapangan,
      shiftKerja: mealOrders.shiftKerja,
      keteranganLapor: mealOrders.keteranganLapor,
    }).from(mealOrders)
      .where(and(eq(mealOrders.orderDate, ymd), eq(mealOrders.nik, emp.nik))).limit(1);
    if (!current) return;
    const prefs = await loadMealPreferences(ymd, cleanNik);
    const prevStatuses = await loadPreviousRosterStatuses(ymd, cleanNik);
    const prevStatus = prevStatuses.get(cleanNik);
    const computed = computeMealOrderByRoster(
      { ...emp, statusMess: current.statusMess, shift: current.shift, tempatTinggal: current.tempatTinggal, alamatDomisili: null, keteranganLapor: current.keteranganLapor },
      rosterStatus, ymd, withCurrentChoice(prefs.get(cleanNik), current), prevStatus,
    );
    if (computed.shiftKerja === 'SIANG' && (await loadNonshiftNiks(ymd, cleanNik)).has(cleanNik)) computed.shiftKerja = 'Nonshift';

    const updateValues = {
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
      catatan: computed.catatan,
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

// 1. GET /api/meal-orders?date=YYYY-MM-DD — daftar order satu tanggal + tanggal-tanggal yang sudah ada datanya
mealOrdersRouter.get("/api/meal-orders", async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const date = isDate(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
    const access = await getTrainingAccess((req as any).user);
    // Edit langsung di Google Sheets (oleh Section Administrasi) ditarik ke portal di background
    maybePullFromSheet();
    const inactive = await getInactiveNiks();
    let rows = (await db.select().from(mealOrders)
      .where(eq(mealOrders.orderDate, date))
      .orderBy(sql`${mealOrders.sortNo} ASC NULLS LAST`, asc(mealOrders.nama))).filter(isActiveRow(inactive));

    // Jika belum ada data orderan makanan sama sekali pada tanggal tsb, otomatis sinkronkan dari data Roster & Cuti!
    if (rows.length === 0) {
      try {
        const { synced: syncedCount } = await syncMealOrdersFromRoster(date, 'auto-roster-sync', false);
        if (syncedCount > 0) {
          rows = (await db.select().from(mealOrders)
            .where(eq(mealOrders.orderDate, date))
            .orderBy(sql`${mealOrders.sortNo} ASC NULLS LAST`, asc(mealOrders.nama))).filter(isActiveRow(inactive));
        }
      } catch (syncErr: any) {
        console.warn("[MealOrders auto-sync warning]:", syncErr?.message);
      }
    }

    // Sanitasi status Belum Lapor:
    // Selama "Belum Lapor" belum dimatikan, seluruh porsi orderan makanan, batch, dan catatan WAJIB tetap kosong
    let hasStaleBelumLaporInDb = false;
    rows = rows.map(r => {
      const isBelumLapor = r.keteranganLapor === 'Belum Lapor' || /belum\s*lapor/i.test(String(r.keteranganLapor || ''));
      if (isBelumLapor) {
        const hasMeals = r.pagiKantin || r.pagiLapangan || r.sahurKantin || r.sahurLapangan ||
          r.siangKantin || r.siangLapangan || r.soreKantin || r.soreLapangan ||
          r.takjilLapangan || r.malamLapangan || r.batchPagi || r.batchSore || r.catatan;
        if (hasMeals) hasStaleBelumLaporInDb = true;
        return {
          ...r,
          keteranganLapor: 'Belum Lapor',
          pagiKantin: null, pagiLapangan: null, sahurKantin: null, sahurLapangan: null,
          siangKantin: null, siangLapangan: null, soreKantin: null, soreLapangan: null,
          takjilLapangan: null, malamLapangan: null, batchPagi: null, batchSore: null, catatan: null,
        };
      }
      return r;
    });

    if (hasStaleBelumLaporInDb) {
      db.update(mealOrders).set({
        keteranganLapor: 'Belum Lapor',
        pagiKantin: null, pagiLapangan: null, sahurKantin: null, sahurLapangan: null,
        siangKantin: null, siangLapangan: null, soreKantin: null, soreLapangan: null,
        takjilLapangan: null, malamLapangan: null, batchPagi: null, batchSore: null, catatan: null,
      }).where(and(
        eq(mealOrders.orderDate, date),
        sql`(${mealOrders.keteranganLapor} = 'Belum Lapor' OR LOWER(${mealOrders.keteranganLapor}) LIKE '%belum lapor%')`
      )).catch(e => console.warn('[Clean stale belum lapor DB warning]:', e?.message));
    }

    const dates = await db.select({ date: mealOrders.orderDate, count: sql<number>`COUNT(*)::int` })
      .from(mealOrders)
      .where(inactive.size ? notInArray(sql`UPPER(TRIM(${mealOrders.nik}))`, Array.from(inactive)) : undefined)
      .groupBy(mealOrders.orderDate).orderBy(desc(mealOrders.orderDate)).limit(60);
    res.json({ status: "success", date, data: rows, dates, access: { canManage: access.canManage } });
  } catch (error: any) {
    console.error("[MealOrders GET] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
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
    await ensureMealOrdersTable();
    const { from, to } = req.query;
    if (!isDate(from) || !isDate(to) || from > to) return res.status(400).json({ status: "error", message: "Rentang tanggal tidak valid (from/to YYYY-MM-DD)." });
    const spanDays = (Date.parse(to) - Date.parse(from)) / 86400000;
    if (spanDays > 400) return res.status(400).json({ status: "error", message: "Rentang maksimal ±1 tahun." });

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
    res.json({ status: "success", from, to, data });
  } catch (error: any) {
    console.error("[MealOrders BUNGKUS-STATS] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
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
