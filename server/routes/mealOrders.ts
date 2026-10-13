import { Router } from "express";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { parseMealOrderSheet, type ParsedMealOrderRow } from "../../src/utils/meal-order-import.js";
import { MEAL_ORDER_SEED_CSV } from "../data/mealOrderSeed.js";
import { db } from "../../src/db/index.js";
import { and, asc, eq, sql, desc, inArray } from "drizzle-orm";
import { mealOrders, employees } from "../../src/db/schema.js";
import { drive } from "../../google-services.js";
import { getTrainingAccess } from "./training.js";

// ===== Orderan Makanan =====
// Satu baris per karyawan per tanggal. Kantin ditandai 'K', Lapangan berisi jumlah porsi.
// Lihat: semua akun login · Ubah: Developer & Section Administrasi (sama dengan hak kelola Database Training)
export const mealOrdersRouter = Router();

// Kolom yang boleh diisi dari form / edit sel
const EDITABLE_FIELDS = [
  'sortNo', 'nama', 'statusMess', 'pt', 'shift', 'section', 'statusKerja', 'sahur', 'tidakPuasa', 'tempatTinggal', 'shiftKerja',
  'pagiKantin', 'pagiLapangan', 'siangKantin', 'siangLapangan', 'soreKantin', 'soreLapangan', 'takjilLapangan', 'malamLapangan',
  'batchPagi', 'batchSore', 'status', 'keteranganLapor', 'catatan',
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
      // Kolom tambahan sesuai sheet Meal_Order.csv
      await db.execute(sql`ALTER TABLE meal_orders
        ADD COLUMN IF NOT EXISTS batch_pagi TEXT,
        ADD COLUMN IF NOT EXISTS batch_sore TEXT,
        ADD COLUMN IF NOT EXISTS status TEXT,
        ADD COLUMN IF NOT EXISTS keterangan_lapor TEXT,
        ADD COLUMN IF NOT EXISTS catatan TEXT`);
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

// Simpan banyak baris sekaligus (import / seed) — upsert per (tanggal, NIK), per 200 baris
async function bulkUpsertMealOrders(date: string, rows: ParsedMealOrderRow[], updatedBy: string) {
  const now = new Date();
  let saved = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map(r => ({ ...r, orderDate: date, updatedBy, updatedAt: now }));
    const res = await db.insert(mealOrders).values(chunk)
      .onConflictDoUpdate({
        target: [mealOrders.orderDate, mealOrders.nik],
        set: Object.fromEntries([...EDITABLE_FIELDS, 'updatedBy', 'updatedAt'].map(f => [f, sql.raw(`excluded.${toSnake(f)}`)])),
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
  { key: 'pagiKantin', group: 'Pagi / Sahur', label: 'Kantin', kind: 'kantin' },
  { key: 'pagiLapangan', group: 'Pagi / Sahur', label: 'Lapangan', kind: 'lapangan' },
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
  const all = dates.length
    ? await db.select().from(mealOrders).where(inArray(mealOrders.orderDate, dates))
        .orderBy(desc(mealOrders.orderDate), sql`${mealOrders.sortNo} ASC NULLS LAST`, asc(mealOrders.nama))
    : [];
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

let syncRunning: Promise<{ id: string; url: string }> | null = null;
let syncAgain = false;
// Buat (bila belum ada) lalu timpa isi Google Sheets "Meal Order" dengan data terbaru
export async function syncMealOrderSheet(): Promise<{ id: string; url: string }> {
  if (syncRunning) { syncAgain = true; return syncRunning; }
  syncRunning = (async () => {
    try {
      const buffer = await buildMealWorkbook();
      const media = () => ({ mimeType: XLSX_MIME, body: Readable.from(buffer) });
      const existing = await findMealSheet().catch(() => null);
      if (existing) {
        try {
          await drive.files.update({ fileId: existing.id, media: media(), supportsAllDrives: true });
          return existing;
        } catch (e: any) {
          // File dihapus/dipindah manual → buat ulang
          if (e?.code !== 404) throw e;
          sheetFile = null;
        }
      }
      const created = await drive.files.create({
        requestBody: { name: MEAL_SHEET_NAME, mimeType: GSHEET_MIME, parents: [ADMIN_FOLDER_ID] },
        media: media(),
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });
      sheetFile = { id: created.data.id!, url: created.data.webViewLink || `https://docs.google.com/spreadsheets/d/${created.data.id}/edit` };
      console.log(`[MealOrders] Google Sheets "${MEAL_SHEET_NAME}" dibuat di folder Administration (${sheetFile.id})`);
      return sheetFile;
    } finally {
      syncRunning = null;
      if (syncAgain) { syncAgain = false; scheduleSheetSync(); }
    }
  })();
  return syncRunning;
}

// Sinkron otomatis setelah ada perubahan (digabung tiap 20 detik agar tidak membebani Drive API)
let syncTimer: NodeJS.Timeout | null = null;
function scheduleSheetSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncMealOrderSheet().catch((e: any) => console.error("[MealOrders] Sync Google Sheets gagal:", e.message));
  }, 20 * 1000);
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

const updatedByOf = (req: any) => String(req.user?.nik || req.user?.name || 'system');

// 1. GET /api/meal-orders?date=YYYY-MM-DD — daftar order satu tanggal + tanggal-tanggal yang sudah ada datanya
mealOrdersRouter.get("/api/meal-orders", async (req, res) => {
  try {
    await ensureMealOrdersTable();
    const date = isDate(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
    const access = await getTrainingAccess((req as any).user);
    const rows = await db.select().from(mealOrders)
      .where(eq(mealOrders.orderDate, date))
      .orderBy(sql`${mealOrders.sortNo} ASC NULLS LAST`, asc(mealOrders.nama));
    const dates = await db.select({ date: mealOrders.orderDate, count: sql<number>`COUNT(*)::int` })
      .from(mealOrders).groupBy(mealOrders.orderDate).orderBy(desc(mealOrders.orderDate)).limit(60);
    res.json({ status: "success", date, data: rows, dates, access: { canManage: access.canManage } });
  } catch (error: any) {
    console.error("[MealOrders GET] Error:", error);
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
    const fields = pickFields(req.body);
    const nama = fields.nama || emp?.name;
    if (!nama) return res.status(400).json({ status: "error", message: "Nama karyawan wajib diisi (NIK tidak ditemukan di Database Karyawan)." });

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

    const source = await db.select().from(mealOrders).where(eq(mealOrders.orderDate, from));
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
    const { orderDate, rows } = req.body || {};
    if (!isDate(orderDate) || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ status: "error", message: "Tanggal & data import wajib diisi." });
    }
    const clean: ParsedMealOrderRow[] = rows
      .map((r: any, i: number) => {
        const f = pickFields(r) as Record<string, any>;
        return { ...f, sortNo: f.sortNo ?? i + 1, nik: String(r.nik || '').trim().toUpperCase(), nama: String(r.nama || '').trim() } as ParsedMealOrderRow;
      })
      .filter(r => r.nik && r.nama);
    // Kolom yang tidak ada di file tetap terisi null (import = isi sheet tanggal tsb apa adanya)
    const full = clean.map(r => ({ ...Object.fromEntries(EDITABLE_FIELDS.map(f => [f, null])), ...r })) as ParsedMealOrderRow[];
    const saved = await bulkUpsertMealOrders(orderDate, full, `import:${updatedByOf(req)}`);
    scheduleSheetSync();
    res.json({ status: "success", saved });
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

// 6. GET /api/meal-orders/sheet — link Google Sheets "Meal Order" (bila sudah dibuat)
mealOrdersRouter.get("/api/meal-orders/sheet", async (_req, res) => {
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
    const f = await syncMealOrderSheet();
    res.json({ status: "success", url: f.url });
  } catch (error: any) {
    console.error("[MealOrders SYNC] Error:", error);
    res.status(500).json({ status: "error", message: `Gagal sinkron ke Google Sheets: ${error.message}` });
  }
});
