import { Router } from "express";
import { db } from "../../src/db/index.js";
import { and, eq, sql } from "drizzle-orm";
import { safetyRekapEdits } from "../../src/db/schema.js";

export const safetyRekapRouter = Router();

let tableEnsured = false;
async function ensureSafetyRekapEditsTable() {
  if (tableEnsured) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS safety_rekap_edits (
    id SERIAL PRIMARY KEY,
    week TEXT NOT NULL,
    year INTEGER NOT NULL,
    nik TEXT NOT NULL,
    name TEXT,
    is_cuti BOOLEAN,
    kta_done BOOLEAN,
    tgl_kta TEXT,
    tgl_tta1 TEXT,
    tgl_tta2 TEXT,
    inspeksi_done BOOLEAN,
    keterangan_inspeksi TEXT,
    tgl_inspeksi TEXT,
    catatan TEXT,
    updated_by_nik TEXT,
    updated_by_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_safety_rekap_edits_week_nik ON safety_rekap_edits(year, week, nik);`);
  await db.execute(sql`ALTER TABLE safety_rekap_edits ADD COLUMN IF NOT EXISTS absence_status TEXT;`);
  tableEnsured = true;
}

function normalizeWeek(raw: unknown): string {
  const m = String(raw || '').match(/(\d+)/);
  return m ? `W${parseInt(m[1], 10)}` : '';
}

// Nilai tanggal yang diizinkan: null (otomatis), '' (kosong), '-' (tidak wajib), 'YYYY-MM-DD'
function cleanDateValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || s === '-') return s;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const ABSENCE_STATUSES = ['CUTI', 'IZIN', 'DINAS', 'RESIGN', 'NEW_HIRE'];

// null = otomatis, '' = hadir (wajib lapor), atau salah satu ABSENCE_STATUSES
function cleanAbsence(v: unknown): string | null {
  if (v === '') return '';
  const s = String(v ?? '').trim().toUpperCase();
  return ABSENCE_STATUSES.includes(s) ? s : null;
}

function cleanBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

safetyRekapRouter.get('/api/safety-rekap/edits', async (req, res) => {
  try {
    await ensureSafetyRekapEditsTable();
    const week = normalizeWeek(req.query.week);
    const year = parseInt(String(req.query.year || ''), 10);
    if (!week || !year) return res.status(400).json({ error: 'Parameter week & year wajib diisi' });
    const rows = await db.select().from(safetyRekapEdits)
      .where(and(eq(safetyRekapEdits.week, week), eq(safetyRekapEdits.year, year)));
    res.json(rows);
  } catch (e: any) {
    console.error('[SafetyRekap] GET edits failed:', e.message);
    res.status(500).json({ error: 'Gagal memuat data edit rekap' });
  }
});

safetyRekapRouter.put('/api/safety-rekap/edits', async (req, res) => {
  try {
    await ensureSafetyRekapEditsTable();
    const b = req.body || {};
    const week = normalizeWeek(b.week);
    const year = parseInt(String(b.year || ''), 10);
    const nik = String(b.nik || '').trim();
    if (!week || !year || !nik) return res.status(400).json({ error: 'week, year & nik wajib diisi' });
    if (!b.editorNik) return res.status(401).json({ error: 'Identitas editor tidak ditemukan' });

    const values = {
      week, year, nik,
      name: b.name ? String(b.name) : null,
      isCuti: null,
      absenceStatus: cleanAbsence(b.absenceStatus),
      ktaDone: cleanBool(b.ktaDone),
      tglKta: cleanDateValue(b.tglKta),
      tglTta1: cleanDateValue(b.tglTta1),
      tglTta2: cleanDateValue(b.tglTta2),
      inspeksiDone: cleanBool(b.inspeksiDone),
      keteranganInspeksi: b.keteranganInspeksi === null || b.keteranganInspeksi === undefined ? null : String(b.keteranganInspeksi).slice(0, 300),
      tglInspeksi: cleanDateValue(b.tglInspeksi),
      catatan: b.catatan ? String(b.catatan).slice(0, 500) : null,
      updatedByNik: String(b.editorNik),
      updatedByName: b.editorName ? String(b.editorName) : null,
      updatedAt: new Date(),
    };

    const [row] = await db.insert(safetyRekapEdits).values(values)
      .onConflictDoUpdate({
        target: [safetyRekapEdits.year, safetyRekapEdits.week, safetyRekapEdits.nik],
        set: values,
      })
      .returning();
    res.json(row);
  } catch (e: any) {
    console.error('[SafetyRekap] PUT edit failed:', e.message);
    res.status(500).json({ error: 'Gagal menyimpan edit rekap' });
  }
});

// Reset baris ke data otomatis
safetyRekapRouter.delete('/api/safety-rekap/edits', async (req, res) => {
  try {
    await ensureSafetyRekapEditsTable();
    const week = normalizeWeek(req.query.week);
    const year = parseInt(String(req.query.year || ''), 10);
    const nik = String(req.query.nik || '').trim();
    if (!week || !year || !nik) return res.status(400).json({ error: 'week, year & nik wajib diisi' });
    await db.delete(safetyRekapEdits).where(and(
      eq(safetyRekapEdits.week, week), eq(safetyRekapEdits.year, year), eq(safetyRekapEdits.nik, nik)
    ));
    res.json({ success: true });
  } catch (e: any) {
    console.error('[SafetyRekap] DELETE edit failed:', e.message);
    res.status(500).json({ error: 'Gagal mereset edit rekap' });
  }
});
