import { Router } from "express";
import { db } from "../../src/db/index.js";
import { and, asc, eq, sql, desc } from "drizzle-orm";
import { mealOrders, employees } from "../../src/db/schema.js";
import { getTrainingAccess } from "./training.js";

// ===== Orderan Makanan =====
// Satu baris per karyawan per tanggal. Kantin ditandai 'K', Lapangan berisi jumlah porsi.
// Lihat: semua akun login · Ubah: Developer & Section Administrasi (sama dengan hak kelola Database Training)
export const mealOrdersRouter = Router();

// Kolom yang boleh diisi dari form / edit sel
const EDITABLE_FIELDS = [
  'sortNo', 'nama', 'statusMess', 'pt', 'shift', 'section', 'statusKerja', 'sahur', 'tidakPuasa', 'tempatTinggal', 'shiftKerja',
  'pagiKantin', 'pagiLapangan', 'siangKantin', 'siangLapangan', 'soreKantin', 'soreLapangan', 'takjilLapangan', 'malamLapangan',
  'konfirmasiPagi', 'konfirmasiSore',
] as const;
type EditableField = typeof EDITABLE_FIELDS[number];
const BOOL_FIELDS: EditableField[] = ['konfirmasiPagi', 'konfirmasiSore'];

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
    })().catch((e: any) => {
      ensurePromise = null;
      console.error("[MealOrders] Ensure table failed:", e.message);
      throw e;
    });
  }
  return ensurePromise;
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

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
    const values = source.map(({ id, createdAt, updatedAt, updatedBy, orderDate, konfirmasiPagi, konfirmasiSore, ...rest }) => ({
      ...rest, orderDate: to, konfirmasiPagi: false, konfirmasiSore: false, updatedBy: by, updatedAt: now,
    }));
    // Karyawan yang sudah ada di tanggal tujuan tidak ditimpa
    const inserted = await db.insert(mealOrders).values(values)
      .onConflictDoNothing({ target: [mealOrders.orderDate, mealOrders.nik] }).returning({ id: mealOrders.id });
    res.json({ status: "success", inserted: inserted.length, skipped: values.length - inserted.length });
  } catch (error: any) {
    console.error("[MealOrders COPY] Error:", error);
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
    res.json({ status: "success" });
  } catch (error: any) {
    console.error("[MealOrders DELETE] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});
