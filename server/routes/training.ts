import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, asc, sql } from "drizzle-orm";
import { trainingRecords } from "../../src/db/schema.js";
import { TRAINING_SAP_SEED } from "../data/trainingSapSeed.js";

export const trainingRouter = Router();

let trainingTableEnsured = false;
export async function ensureTrainingRecordsTable() {
  if (trainingTableEnsured) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS training_records (
      id SERIAL PRIMARY KEY,
      no INTEGER,
      nik TEXT NOT NULL,
      nama TEXT NOT NULL,
      jabatan TEXT,
      gol TEXT,
      shift TEXT,
      hazid TEXT,
      jsa TEXT,
      iut_ott TEXT,
      iai TEXT,
      bfa TEXT,
      notes TEXT,
      updated_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_training_records_nik ON training_records(nik);`);

    // Isi data awal dari Training_SAP.csv jika tabel masih kosong
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(trainingRecords);
    if (count === 0) {
      await db.insert(trainingRecords).values(
        TRAINING_SAP_SEED.map(([no, nik, nama, jabatan, gol, shift, hazid, jsa, iutOtt, iai, bfa]) => ({
          no, nik, nama, jabatan, gol, shift,
          hazid: hazid || null,
          jsa: jsa || null,
          iutOtt: iutOtt || null,
          iai: iai || null,
          bfa: bfa || null,
          updatedBy: 'seed:Training_SAP.csv',
        }))
      ).onConflictDoNothing();
      console.log(`[Training] Seeded ${TRAINING_SAP_SEED.length} records from Training_SAP.csv`);
    }
    trainingTableEnsured = true;
  } catch (e: any) {
    console.error("[Training] Ensure table failed:", e.message);
  }
}

const MONTHS_ID: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

// Normalisasi berbagai format tanggal ke 'YYYY-MM-DD'; null jika kosong/tidak valid
export function normalizeTrainingDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === '-' || s === '`' || s === '0' || s.toLowerCase() === 'null' || s === '#N/A') return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const valid = (y: number, m: number, d: number) => y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;

  // YYYY-MM-DD (opsional diikuti jam), atau YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  // DD-MM-YYYY atau DD/MM/YYYY
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  // DD-Mon-YYYY (mis. 12-Feb-2026)
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*[-\s](\d{4})$/);
  if (m) {
    const mo = MONTHS_ID[m[2].toLowerCase()];
    const [d, y] = [Number(m[1]), Number(m[3])];
    return mo && valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  // Serial number Excel
  if (/^\d{5}$/.test(s)) {
    const num = Number(s);
    if (num >= 32874 && num <= 73051) {
      const dt = new Date(Math.round((num - 25569) * 86400 * 1000));
      return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
    }
  }
  return null;
}

const cleanText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s ? s : null;
};

function buildRecordValues(body: any) {
  return {
    no: body.no !== undefined && body.no !== null && String(body.no).trim() !== '' ? parseInt(String(body.no), 10) || null : null,
    nik: String(body.nik || '').trim().toUpperCase(),
    nama: cleanText(body.nama) || '',
    jabatan: cleanText(body.jabatan),
    gol: cleanText(body.gol),
    shift: cleanText(body.shift),
    hazid: normalizeTrainingDate(body.hazid),
    jsa: normalizeTrainingDate(body.jsa),
    iutOtt: normalizeTrainingDate(body.iutOtt),
    iai: normalizeTrainingDate(body.iai),
    bfa: normalizeTrainingDate(body.bfa),
    notes: cleanText(body.notes),
  };
}

// 1. GET /api/training-records — seluruh data training
trainingRouter.get("/api/training-records", async (_req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const rows = await db
      .select()
      .from(trainingRecords)
      .orderBy(sql`${trainingRecords.no} ASC NULLS LAST`, asc(trainingRecords.nama));
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("[Training GET] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 2. POST /api/training-records — tambah data training karyawan
trainingRouter.post("/api/training-records", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const values = buildRecordValues(req.body);
    if (!values.nik || !values.nama) {
      return res.status(400).json({ status: "error", message: "NIK dan Nama wajib diisi." });
    }
    const [existing] = await db.select({ id: trainingRecords.id }).from(trainingRecords).where(eq(trainingRecords.nik, values.nik));
    if (existing) {
      return res.status(409).json({ status: "error", message: `NIK ${values.nik} sudah terdaftar di Database Training.` });
    }
    if (values.no === null) {
      const [{ maxNo }] = await db.select({ maxNo: sql<number>`coalesce(max(${trainingRecords.no}), 0)::int` }).from(trainingRecords);
      values.no = maxNo + 1;
    }
    const [created] = await db
      .insert(trainingRecords)
      .values({ ...values, updatedBy: cleanText(req.body.updatedBy) })
      .returning();
    res.status(201).json({ status: "success", message: "Data training berhasil ditambahkan.", data: created });
  } catch (error: any) {
    console.error("[Training POST] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 3. POST /api/training-records/import — upsert massal berdasarkan NIK (dari file CSV/Excel)
trainingRouter.post("/api/training-records/import", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const updatedBy = cleanText(req.body?.updatedBy);
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const existingRows = await db.select({ nik: trainingRecords.nik }).from(trainingRecords);
    const existingNiks = new Set(existingRows.map(r => r.nik));

    for (const raw of rows) {
      const values = buildRecordValues(raw);
      if (!values.nik || !values.nama) {
        skipped++;
        continue;
      }
      await db
        .insert(trainingRecords)
        .values({ ...values, updatedBy })
        .onConflictDoUpdate({
          target: trainingRecords.nik,
          set: {
            no: values.no ?? sql`${trainingRecords.no}`,
            nama: values.nama,
            jabatan: values.jabatan,
            gol: values.gol,
            shift: values.shift,
            hazid: values.hazid,
            jsa: values.jsa,
            iutOtt: values.iutOtt,
            iai: values.iai,
            bfa: values.bfa,
            updatedBy,
            updatedAt: new Date(),
          },
        });
      if (existingNiks.has(values.nik)) {
        updated++;
      } else {
        inserted++;
        existingNiks.add(values.nik);
      }
    }

    res.json({
      status: "success",
      message: `Import selesai: ${inserted} baru, ${updated} diperbarui, ${skipped} dilewati.`,
      summary: { inserted, updated, skipped },
    });
  } catch (error: any) {
    console.error("[Training IMPORT] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 4. PUT /api/training-records/:id — ubah data training
trainingRouter.put("/api/training-records/:id", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: "error", message: "ID tidak valid" });
    }
    const values = buildRecordValues(req.body);
    if (!values.nik || !values.nama) {
      return res.status(400).json({ status: "error", message: "NIK dan Nama wajib diisi." });
    }
    const [conflict] = await db.select({ id: trainingRecords.id }).from(trainingRecords).where(eq(trainingRecords.nik, values.nik));
    if (conflict && conflict.id !== id) {
      return res.status(409).json({ status: "error", message: `NIK ${values.nik} sudah dipakai data lain.` });
    }
    const [updated] = await db
      .update(trainingRecords)
      .set({ ...values, updatedBy: cleanText(req.body.updatedBy), updatedAt: new Date() })
      .where(eq(trainingRecords.id, id))
      .returning();
    if (!updated) {
      return res.status(404).json({ status: "error", message: "Data training tidak ditemukan" });
    }
    res.json({ status: "success", message: "Data training berhasil diperbarui", data: updated });
  } catch (error: any) {
    console.error("[Training PUT] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 5. DELETE /api/training-records/:id — hapus data training
trainingRouter.delete("/api/training-records/:id", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: "error", message: "ID tidak valid" });
    }
    const [deleted] = await db.delete(trainingRecords).where(eq(trainingRecords.id, id)).returning();
    if (!deleted) {
      return res.status(404).json({ status: "error", message: "Data training tidak ditemukan" });
    }
    res.json({ status: "success", message: "Data training berhasil dihapus", data: deleted });
  } catch (error: any) {
    console.error("[Training DELETE] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});
