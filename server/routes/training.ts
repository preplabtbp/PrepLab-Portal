import { Router } from "express";
import Papa from "papaparse";
import { db } from "../../src/db/index.js";
import { eq, asc, sql, inArray } from "drizzle-orm";
import { trainingRecords } from "../../src/db/schema.js";
import { TRAINING_SAP_SEED } from "../data/trainingSapSeed.js";
import { TRAINING_K3_SEED_CSV } from "../data/trainingK3Seed.js";
import {
  parseTrainingSheet,
  normalizeTrainingDate,
  normalizeTrainingStatus,
  type ParsedTrainingRow,
  type TrainingProgram,
} from "../../src/utils/training-import.js";

export const trainingRouter = Router();

type TrainingRow = typeof trainingRecords.$inferSelect;

const PROFILE_FIELDS = ['nama', 'jabatan', 'gol', 'shift', 'bagian', 'pt'] as const;
const PROGRAM_FIELDS: Record<TrainingProgram, readonly (keyof ParsedTrainingRow)[]> = {
  sap: ['hazid', 'jsa', 'iutOtt', 'iai', 'bfa'],
  k3: ['wah', 'wahStatus', 'loto', 'lotoStatus', 'confinedSpace', 'confinedSpaceStatus', 'fireFighting', 'fireFightingStatus'],
};
const STATUS_FIELDS = new Set(['wahStatus', 'lotoStatus', 'confinedSpaceStatus', 'fireFightingStatus']);

const isProgram = (v: unknown): v is TrainingProgram => v === 'sap' || v === 'k3';

const cleanText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s ? s : null;
};

// Kolom yang ditimpa saat ON CONFLICT (nik) — nilainya sudah digabung dengan data lama di JS
const UPSERT_COLUMNS: { field: keyof typeof trainingRecords.$inferInsert; column: string }[] = [
  { field: 'nama', column: 'nama' }, { field: 'jabatan', column: 'jabatan' }, { field: 'gol', column: 'gol' },
  { field: 'shift', column: 'shift' }, { field: 'bagian', column: 'bagian' }, { field: 'pt', column: 'pt' },
  { field: 'no', column: 'no' }, { field: 'noK3', column: 'no_k3' },
  { field: 'inSap', column: 'in_sap' }, { field: 'inK3', column: 'in_k3' },
  { field: 'hazid', column: 'hazid' }, { field: 'jsa', column: 'jsa' }, { field: 'iutOtt', column: 'iut_ott' },
  { field: 'iai', column: 'iai' }, { field: 'bfa', column: 'bfa' },
  { field: 'wah', column: 'wah' }, { field: 'wahStatus', column: 'wah_status' },
  { field: 'loto', column: 'loto' }, { field: 'lotoStatus', column: 'loto_status' },
  { field: 'confinedSpace', column: 'confined_space' }, { field: 'confinedSpaceStatus', column: 'confined_space_status' },
  { field: 'fireFighting', column: 'fire_fighting' }, { field: 'fireFightingStatus', column: 'fire_fighting_status' },
  { field: 'updatedBy', column: 'updated_by' }, { field: 'updatedAt', column: 'updated_at' },
];
const UPSERT_SET = Object.fromEntries(UPSERT_COLUMNS.map(c => [c.field, sql.raw(`excluded.${c.column}`)]));
const UPSERT_CHUNK = 200;

// Upsert massal berdasarkan NIK untuk program tertentu — 1 query baca + 1 query tulis per 200 baris.
// Field program selalu diganti sesuai sumber; field profil: Training SAP menimpa, Training K3 hanya
// mengisi yang kosong (kecuali Bagian & PT yang memang bersumber dari file K3).
async function bulkUpsertTrainingRows(
  recs: ParsedTrainingRow[],
  programs: TrainingProgram[],
  updatedBy: string | null
): Promise<{ inserted: number; updated: number }> {
  // NIK ganda dalam satu file: baris terakhir yang dipakai (ON CONFLICT tidak boleh menyentuh baris 2x)
  const byNik = new Map<string, ParsedTrainingRow>();
  recs.forEach(r => byNik.set(r.nik, r));
  const unique = Array.from(byNik.values());
  if (unique.length === 0) return { inserted: 0, updated: 0 };

  const existingRows = await db.select().from(trainingRecords).where(inArray(trainingRecords.nik, unique.map(r => r.nik)));
  const existingByNik = new Map(existingRows.map(r => [r.nik, r]));
  const sapIsSource = programs.includes('sap');
  const now = new Date();
  let inserted = 0;

  const values = unique.map(rec => {
    const existing = existingByNik.get(rec.nik);
    if (!existing) inserted++;
    const row: Record<string, unknown> = { nik: rec.nik, updatedBy, updatedAt: now };

    PROFILE_FIELDS.forEach(f => {
      const incoming = rec[f] ?? null;
      const current = existing ? existing[f as keyof TrainingRow] ?? null : null;
      const preferIncoming = sapIsSource || f === 'bagian' || f === 'pt';
      row[f] = preferIncoming ? (incoming ?? current) : (current ?? incoming);
    });
    // Semua field program diisi: program sumber dari file, program lain dipertahankan dari data lama
    (Object.keys(PROGRAM_FIELDS) as TrainingProgram[]).forEach(p => PROGRAM_FIELDS[p].forEach(f => {
      row[f] = programs.includes(p) ? rec[f] ?? null : existing ? (existing as any)[f] ?? null : null;
    }));
    row.no = sapIsSource && rec.no != null ? rec.no : existing?.no ?? null;
    row.noK3 = !sapIsSource && programs.includes('k3') && rec.no != null ? rec.no : existing?.noK3 ?? null;
    row.inSap = programs.includes('sap') || !!existing?.inSap;
    row.inK3 = programs.includes('k3') || !!existing?.inK3;
    return row as typeof trainingRecords.$inferInsert;
  });

  for (let i = 0; i < values.length; i += UPSERT_CHUNK) {
    await db
      .insert(trainingRecords)
      .values(values.slice(i, i + UPSERT_CHUNK))
      .onConflictDoUpdate({ target: trainingRecords.nik, set: UPSERT_SET });
  }
  return { inserted, updated: unique.length - inserted };
}

// Buat / migrasi tabel (hanya dijalankan bila kolom terbaru belum ada)
async function migrateTrainingTable() {
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
  // Kolom tambahan untuk Training K3 (aman dijalankan berulang)
  await db.execute(sql`ALTER TABLE training_records
    ADD COLUMN IF NOT EXISTS no_k3 INTEGER,
    ADD COLUMN IF NOT EXISTS bagian TEXT,
    ADD COLUMN IF NOT EXISTS pt TEXT,
    ADD COLUMN IF NOT EXISTS in_sap BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS in_k3 BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS wah TEXT,
    ADD COLUMN IF NOT EXISTS wah_status TEXT,
    ADD COLUMN IF NOT EXISTS loto TEXT,
    ADD COLUMN IF NOT EXISTS loto_status TEXT,
    ADD COLUMN IF NOT EXISTS confined_space TEXT,
    ADD COLUMN IF NOT EXISTS confined_space_status TEXT,
    ADD COLUMN IF NOT EXISTS fire_fighting TEXT,
    ADD COLUMN IF NOT EXISTS fire_fighting_status TEXT;`);
  // Baris lama (sebelum ada flag program) adalah peserta Training SAP
  await db.execute(sql`UPDATE training_records SET in_sap = TRUE
    WHERE COALESCE(in_sap, FALSE) = FALSE AND COALESCE(in_k3, FALSE) = FALSE;`);
}

const countPrograms = async () => {
  const [counts] = await db.select({
    sapCount: sql<number>`count(*) filter (where ${trainingRecords.inSap})::int`,
    k3Count: sql<number>`count(*) filter (where ${trainingRecords.inK3})::int`,
  }).from(trainingRecords);
  return counts;
};

let ensurePromise: Promise<void> | null = null;
export function ensureTrainingRecordsTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      // Jalur cepat: 1 query. Jika tabel/kolom terbaru belum ada, query gagal → jalankan migrasi.
      let counts: { sapCount: number; k3Count: number };
      try {
        counts = await countPrograms();
      } catch {
        await migrateTrainingTable();
        counts = await countPrograms();
      }

      // Seed data awal per program bila program tersebut masih kosong
      if (counts.sapCount === 0) {
        const recs: ParsedTrainingRow[] = TRAINING_SAP_SEED.map(([no, nik, nama, jabatan, gol, shift, hazid, jsa, iutOtt, iai, bfa]) => ({
          no, nik, nama, jabatan, gol, shift,
          hazid: hazid || null, jsa: jsa || null, iutOtt: iutOtt || null, iai: iai || null, bfa: bfa || null,
        }));
        await bulkUpsertTrainingRows(recs, ['sap'], 'seed:Training_SAP.csv');
        console.log(`[Training] Seeded ${recs.length} SAP records`);
      }
      if (counts.k3Count === 0) {
        const parsed = parseTrainingSheet(Papa.parse<unknown[]>(TRAINING_K3_SEED_CSV, { skipEmptyLines: true }).data);
        if (parsed) {
          await bulkUpsertTrainingRows(parsed.records, ['k3'], 'seed:Training_WAH_LOTO_CONFINE_SPACE_FIRE_FIGHTER.csv');
          console.log(`[Training] Seeded ${parsed.records.length} K3 records`);
        }
      }
    })().catch((e: any) => {
      ensurePromise = null; // coba lagi di request berikutnya
      console.error("[Training] Ensure table failed:", e.message);
      throw e;
    });
  }
  return ensurePromise;
}

// Ambil field dari body form (POST/PUT) sesuai program
function parseBody(body: any, program: TrainingProgram): ParsedTrainingRow {
  const rec: ParsedTrainingRow = {
    nik: String(body.nik || '').trim().toUpperCase(),
    nama: cleanText(body.nama) || '',
    jabatan: cleanText(body.jabatan),
    gol: cleanText(body.gol)?.toUpperCase() ?? null,
    shift: cleanText(body.shift),
    bagian: cleanText(body.bagian),
    pt: cleanText(body.pt)?.toUpperCase() ?? null,
    no: body.no !== undefined && String(body.no).trim() !== '' ? parseInt(String(body.no), 10) || null : null,
  };
  PROGRAM_FIELDS[program].forEach(f => {
    (rec as any)[f] = STATUS_FIELDS.has(f) ? normalizeTrainingStatus(body[f]) : normalizeTrainingDate(body[f]);
  });
  return rec;
}

// 1. GET /api/training-records — seluruh data training (kedua program)
trainingRouter.get("/api/training-records", async (_req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const rows = await db
      .select()
      .from(trainingRecords)
      .orderBy(sql`${trainingRecords.no} ASC NULLS LAST`, sql`${trainingRecords.noK3} ASC NULLS LAST`, asc(trainingRecords.nama));
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("[Training GET] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 2. POST /api/training-records — tambah karyawan ke program training
trainingRouter.post("/api/training-records", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const program = isProgram(req.body?.program) ? req.body.program : 'sap';
    const rec = parseBody(req.body, program);
    if (!rec.nik || !rec.nama) {
      return res.status(400).json({ status: "error", message: "NIK dan Nama wajib diisi." });
    }
    const [existing] = await db.select().from(trainingRecords).where(eq(trainingRecords.nik, rec.nik));
    if (existing && (program === 'sap' ? existing.inSap : existing.inK3)) {
      return res.status(409).json({ status: "error", message: `NIK ${rec.nik} sudah terdaftar di program ini.` });
    }
    if (rec.no == null) {
      const col = program === 'sap' ? trainingRecords.no : trainingRecords.noK3;
      const [{ maxNo }] = await db.select({ maxNo: sql<number>`coalesce(max(${col}), 0)::int` }).from(trainingRecords);
      rec.no = maxNo + 1;
    }
    await bulkUpsertTrainingRows([rec], [program], cleanText(req.body.updatedBy));
    if (req.body.notes !== undefined) {
      await db.update(trainingRecords).set({ notes: cleanText(req.body.notes) }).where(eq(trainingRecords.nik, rec.nik));
    }
    res.status(201).json({ status: "success", message: "Data training berhasil ditambahkan." });
  } catch (error: any) {
    console.error("[Training POST] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 3. POST /api/training-records/import — upsert massal berdasarkan NIK (hasil parse file CSV/Excel)
trainingRouter.post("/api/training-records/import", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const rows: ParsedTrainingRow[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const programs: TrainingProgram[] = (Array.isArray(req.body?.programs) ? req.body.programs : []).filter(isProgram);
    if (programs.length === 0) {
      return res.status(400).json({ status: "error", message: "Format file tidak dikenali (kolom training tidak ditemukan)." });
    }
    const updatedBy = cleanText(req.body?.updatedBy);
    let skipped = 0;
    const recs: ParsedTrainingRow[] = [];

    for (const raw of rows) {
      const rec: ParsedTrainingRow = {
        ...raw,
        nik: String(raw?.nik || '').trim().toUpperCase(),
        nama: cleanText(raw?.nama) || '',
      };
      if (!rec.nik || !rec.nama) {
        skipped++;
        continue;
      }
      // Normalisasi ulang di server agar data tetap konsisten walau dikirim client lain
      programs.forEach(p => PROGRAM_FIELDS[p].forEach(f => {
        (rec as any)[f] = STATUS_FIELDS.has(f) ? normalizeTrainingStatus(rec[f]) : normalizeTrainingDate(rec[f]);
      }));
      recs.push(rec);
    }
    const { inserted, updated } = await bulkUpsertTrainingRows(recs, programs, updatedBy);

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

// 4. PUT /api/training-records/:id — ubah profil + data training program aktif
trainingRouter.put("/api/training-records/:id", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: "error", message: "ID tidak valid" });
    }
    const program = isProgram(req.body?.program) ? req.body.program : 'sap';
    const rec = parseBody(req.body, program);
    if (!rec.nik || !rec.nama) {
      return res.status(400).json({ status: "error", message: "NIK dan Nama wajib diisi." });
    }
    const [conflict] = await db.select({ id: trainingRecords.id }).from(trainingRecords).where(eq(trainingRecords.nik, rec.nik));
    if (conflict && conflict.id !== id) {
      return res.status(409).json({ status: "error", message: `NIK ${rec.nik} sudah dipakai data lain.` });
    }
    const programValues: Record<string, unknown> = {};
    PROGRAM_FIELDS[program].forEach(f => { programValues[f] = rec[f] ?? null; });
    const [updated] = await db
      .update(trainingRecords)
      .set({
        nik: rec.nik,
        nama: rec.nama,
        jabatan: rec.jabatan ?? null,
        gol: rec.gol ?? null,
        shift: rec.shift ?? null,
        bagian: rec.bagian ?? null,
        pt: rec.pt ?? null,
        ...(program === 'sap' ? { no: rec.no ?? null } : { noK3: rec.no ?? null }),
        ...programValues,
        notes: cleanText(req.body.notes),
        updatedBy: cleanText(req.body.updatedBy),
        updatedAt: new Date(),
      })
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

// 5. DELETE /api/training-records/:id?program=sap|k3 — keluarkan karyawan dari satu program;
//    baris dihapus permanen hanya jika tidak lagi terdaftar di program manapun
trainingRouter.delete("/api/training-records/:id", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: "error", message: "ID tidak valid" });
    }
    const program = isProgram(req.query.program) ? req.query.program : null;
    const [existing] = await db.select().from(trainingRecords).where(eq(trainingRecords.id, id));
    if (!existing) {
      return res.status(404).json({ status: "error", message: "Data training tidak ditemukan" });
    }
    const stillInOther = program === 'sap' ? existing.inK3 : program === 'k3' ? existing.inSap : false;
    if (program && stillInOther) {
      const cleared: Record<string, unknown> = {};
      PROGRAM_FIELDS[program].forEach(f => { cleared[f] = null; });
      await db.update(trainingRecords).set({
        ...cleared,
        ...(program === 'sap' ? { inSap: false, no: null } : { inK3: false, noK3: null }),
        updatedAt: new Date(),
      }).where(eq(trainingRecords.id, id));
    } else {
      await db.delete(trainingRecords).where(eq(trainingRecords.id, id));
    }
    res.json({ status: "success", message: "Data training berhasil dihapus" });
  } catch (error: any) {
    console.error("[Training DELETE] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});
