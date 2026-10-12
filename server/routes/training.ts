import { Router } from "express";
import Papa from "papaparse";
import { db } from "../../src/db/index.js";
import { eq, asc, sql, inArray } from "drizzle-orm";
import cron from "node-cron";
import { trainingRecords, notifications, employees, developerUsers } from "../../src/db/schema.js";
import { sendWebPush } from "../utils.js";
import { TRAINING_SAP_SEED } from "../data/trainingSapSeed.js";
import { TRAINING_K3_SEED_CSV } from "../data/trainingK3Seed.js";
import { TRAINING_MONITORING_SEED_CSV } from "../data/trainingMonitoringSeed.js";
import { TRAINING_BASIC_SAFETY_SEED_CSV } from "../data/trainingBasicSafetySeed.js";
import { TRAINING_POP_SEED_CSV } from "../data/trainingPopSeed.js";
import { PROGRAM_FIELDS, PROGRAM_FLAG, PROGRAM_NO, mergeTrainingRow } from "./trainingMerge.js";
import {
  parseTrainingSheet,
  trainingAlertsForRecord,
  todayWit,
  type TrainingAlert,
  type TrainingKey,
  normalizeTrainingDate,
  normalizeTrainingStatus,
  normalizePopKeterangan,
  formatPopBatch,
  type ParsedTrainingRow,
  type TrainingProgram,
  type PopData,
} from "../../src/utils/training-import.js";

export const trainingRouter = Router();

const STATUS_FIELDS = new Set([
  'hazidStatus', 'jsaStatus', 'iutOttStatus', 'iaiStatus', 'bfaStatus', 'bsStatus',
  'wahStatus', 'lotoStatus', 'confinedSpaceStatus', 'fireFightingStatus',
]);
// Field yang tidak diedit lewat form (hanya dari file Monitoring) — tidak ikut ditimpa saat PUT
const NON_FORM_FIELDS = new Set(['sapDetails']);

// Bersihkan data Sertifikasi POP dari form / import (tipe & format baku)
function sanitizePopData(value: unknown): PopData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const text = (x: unknown) => cleanText(x === '-' ? null : x);
  const num = (x: unknown) => {
    const n = parseFloat(String(x ?? '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };
  const passOnly = (x: unknown) => {
    const s = normalizeTrainingStatus(x);
    return s === 'PASS' || s === 'FAIL' ? s : null;
  };
  const year = String(v.tahunLulus ?? '').match(/(\d{4})/);
  return {
    doh: normalizeTrainingDate(v.doh),
    praPop: normalizeTrainingDate(v.praPop),
    praPopIns: text(v.praPopIns)?.toUpperCase() ?? null,
    praPopPre: num(v.praPopPre),
    praPopPost: num(v.praPopPost),
    praPopResult: passOnly(v.praPopResult),
    popBatch: formatPopBatch(v.popBatch),
    pendidikan: text(v.pendidikan),
    tahunLulus: year ? year[1] : null,
    pengalamanTambang: text(v.pengalamanTambang),
    masaKerja: text(v.masaKerja),
    popKeterangan: normalizePopKeterangan(v.popKeterangan),
    pom: text(v.pom),
    pomPendidikan: text(v.pomPendidikan),
    pomMasaKerja: text(v.pomMasaKerja),
    pomKeterangan: passOnly(v.pomKeterangan),
  };
}

// Normalisasi satu field program sesuai jenisnya
function normalizeProgramField(field: string, value: unknown): unknown {
  if (field === 'sapDetails') return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (field === 'popData') return sanitizePopData(value);
  return STATUS_FIELDS.has(field) ? normalizeTrainingStatus(value) : normalizeTrainingDate(value);
}

const MONITORING_SEED_MARKER = 'training_seed_monitoring_sap_v1';
const BASIC_SAFETY_SEED_MARKER = 'training_seed_basic_safety_v1';
const POP_SEED_MARKER = 'training_seed_pop_v1';
const isProgram = (v: unknown): v is TrainingProgram => v === 'sap' || v === 'k3' || v === 'pop';
const NO_COLUMN = { sap: trainingRecords.no, k3: trainingRecords.noK3, pop: trainingRecords.noPop } as const;

const cleanText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s ? s : null;
};

// Kolom yang ditimpa saat ON CONFLICT (nik) — nilainya sudah digabung dengan data lama di JS
const UPSERT_COLUMNS: { field: keyof typeof trainingRecords.$inferInsert; column: string }[] = [
  { field: 'nama', column: 'nama' }, { field: 'jabatan', column: 'jabatan' }, { field: 'gol', column: 'gol' },
  { field: 'shift', column: 'shift' }, { field: 'bagian', column: 'bagian' }, { field: 'pt', column: 'pt' },
  { field: 'no', column: 'no' }, { field: 'noK3', column: 'no_k3' }, { field: 'noPop', column: 'no_pop' },
  { field: 'inSap', column: 'in_sap' }, { field: 'inK3', column: 'in_k3' }, { field: 'inPop', column: 'in_pop' },
  { field: 'popData', column: 'pop_data' },
  { field: 'hazid', column: 'hazid' }, { field: 'jsa', column: 'jsa' }, { field: 'iutOtt', column: 'iut_ott' },
  { field: 'iai', column: 'iai' }, { field: 'bfa', column: 'bfa' }, { field: 'bs', column: 'bs' },
  { field: 'hazidStatus', column: 'hazid_status' }, { field: 'jsaStatus', column: 'jsa_status' },
  { field: 'iutOttStatus', column: 'iut_ott_status' }, { field: 'iaiStatus', column: 'iai_status' },
  { field: 'bfaStatus', column: 'bfa_status' }, { field: 'bsStatus', column: 'bs_status' },
  { field: 'sapDetails', column: 'sap_details' },
  { field: 'wah', column: 'wah' }, { field: 'wahStatus', column: 'wah_status' },
  { field: 'loto', column: 'loto' }, { field: 'lotoStatus', column: 'loto_status' },
  { field: 'confinedSpace', column: 'confined_space' }, { field: 'confinedSpaceStatus', column: 'confined_space_status' },
  { field: 'fireFighting', column: 'fire_fighting' }, { field: 'fireFightingStatus', column: 'fire_fighting_status' },
  { field: 'updatedBy', column: 'updated_by' }, { field: 'updatedAt', column: 'updated_at' },
];
const UPSERT_SET = Object.fromEntries(UPSERT_COLUMNS.map(c => [c.field, sql.raw(`excluded.${c.column}`)]));
const UPSERT_CHUNK = 200;

// Upsert massal berdasarkan NIK untuk program tertentu — 1 query baca + 1 query tulis per 200 baris.
// Field program yang ADA di data sumber diganti; yang tidak ada (mis. kolom BS di file lama) dipertahankan.
// Field profil: Training SAP menimpa, Training K3 hanya mengisi yang kosong (kecuali Bagian & PT dari file K3).
async function bulkUpsertTrainingRows(
  recs: ParsedTrainingRow[],
  programs: TrainingProgram[],
  updatedBy: string | null,
  // File satu-training (mis. Basic Safety) hanya mengisi profil yang kosong, tidak menimpa nama/jabatan
  fillProfileOnly = false
): Promise<{ inserted: number; updated: number }> {
  // NIK ganda dalam satu file: baris terakhir yang dipakai (ON CONFLICT tidak boleh menyentuh baris 2x)
  const byNik = new Map<string, ParsedTrainingRow>();
  recs.forEach(r => byNik.set(r.nik, r));
  const unique = Array.from(byNik.values());
  if (unique.length === 0) return { inserted: 0, updated: 0 };

  const existingRows = await db.select().from(trainingRecords).where(inArray(trainingRecords.nik, unique.map(r => r.nik)));
  const existingByNik = new Map(existingRows.map(r => [r.nik, r]));
  const now = new Date();
  let inserted = 0;

  const values = unique.map(rec => {
    const existing = existingByNik.get(rec.nik);
    if (!existing) inserted++;
    return mergeTrainingRow(rec, existing, { programs, updatedBy, now, fillProfileOnly }) as typeof trainingRecords.$inferInsert;
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
  // Kolom status per training SAP, training BS & detail skor (format Monitoring Training)
  await db.execute(sql`ALTER TABLE training_records
    ADD COLUMN IF NOT EXISTS bs TEXT,
    ADD COLUMN IF NOT EXISTS hazid_status TEXT,
    ADD COLUMN IF NOT EXISTS jsa_status TEXT,
    ADD COLUMN IF NOT EXISTS iut_ott_status TEXT,
    ADD COLUMN IF NOT EXISTS iai_status TEXT,
    ADD COLUMN IF NOT EXISTS bfa_status TEXT,
    ADD COLUMN IF NOT EXISTS bs_status TEXT,
    ADD COLUMN IF NOT EXISTS sap_details JSONB;`);
  // Kolom Sertifikasi Pengawas Operasional (Pra POP / POP / POM)
  await db.execute(sql`ALTER TABLE training_records
    ADD COLUMN IF NOT EXISTS in_pop BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS no_pop INTEGER,
    ADD COLUMN IF NOT EXISTS pop_data JSONB;`);
  // Baris lama (sebelum ada flag program) adalah peserta Training SAP
  await db.execute(sql`UPDATE training_records SET in_sap = TRUE
    WHERE COALESCE(in_sap, FALSE) = FALSE AND COALESCE(in_k3, FALSE) = FALSE AND COALESCE(in_pop, FALSE) = FALSE;`);
}

// Menyentuh kolom terbaru (bs_status, sap_details, pop_data) agar query gagal bila migrasi belum dijalankan
const countPrograms = async () => {
  const [counts] = await db.select({
    sapCount: sql<number>`count(*) filter (where ${trainingRecords.inSap})::int`,
    k3Count: sql<number>`count(*) filter (where ${trainingRecords.inK3})::int`,
    detailCount: sql<number>`count(*) filter (where ${trainingRecords.bsStatus} is not null or ${trainingRecords.sapDetails} is not null or ${trainingRecords.popData} is not null)::int`,
  }).from(trainingRecords);
  return counts;
};

// Seed sekali pakai dari file CSV. Penanda di app_settings dibuat secara atomik, sehingga hanya satu instance server
// yang menjalankannya dan edit/import berikutnya tidak pernah tertimpa.
async function seedCsvOnce(marker: string, fileName: string, csv: string, singleTraining?: TrainingKey) {
  const claimed = await db.execute(sql`INSERT INTO app_settings (setting_key, setting_value, description)
    VALUES (${marker}, 'running', ${`Seed Database Training dari ${fileName}`})
    ON CONFLICT (setting_key) DO NOTHING RETURNING id;`);
  if (!claimed.rows?.length) return;
  try {
    const parsed = parseTrainingSheet(Papa.parse<unknown[]>(csv, { skipEmptyLines: true }).data, { singleTraining });
    if (parsed && parsed.programs.length > 0) {
      const result = await bulkUpsertTrainingRows(parsed.records, parsed.programs, `seed:${fileName}`, !!singleTraining);
      console.log(`[Training] Seed ${fileName}: ${result.inserted} baru, ${result.updated} diperbarui`);
    }
    await db.execute(sql`UPDATE app_settings SET setting_value = 'done', updated_at = NOW() WHERE setting_key = ${marker};`);
  } catch (e) {
    await db.execute(sql`DELETE FROM app_settings WHERE setting_key = ${marker};`);
    throw e;
  }
}

let ensurePromise: Promise<void> | null = null;
export function ensureTrainingRecordsTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      // Jalur cepat: 1 query. Jika tabel/kolom terbaru belum ada, query gagal → jalankan migrasi.
      let counts: { sapCount: number; k3Count: number; detailCount: number };
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
      // Gagal seed tidak boleh menghalangi data tampil; akan dicoba lagi saat server berikutnya start
      // Urutan penting: Basic Safety (lebih baru) setelah Monitoring agar tanggal BS terbaru yang dipakai
      try {
        await seedCsvOnce(MONITORING_SEED_MARKER, 'Monitoring_Training_Monitoring.csv', TRAINING_MONITORING_SEED_CSV);
        await seedCsvOnce(BASIC_SAFETY_SEED_MARKER, 'Basic_Safety.csv', TRAINING_BASIC_SAFETY_SEED_CSV, 'bs');
        await seedCsvOnce(POP_SEED_MARKER, 'Pra_POP_POP_POM.csv', TRAINING_POP_SEED_CSV);
      } catch (e: any) {
        console.error("[Training] CSV seed failed:", e.message);
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
    if (!NON_FORM_FIELDS.has(f)) (rec as any)[f] = normalizeProgramField(f, body[f]);
  });
  return rec;
}

// ===== Pengingat & notifikasi training WARNING (≥ 1,5 th) / EXPIRED (≥ 2 th) =====
const MONTHS_ID_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmtDate = (d: string) => `${d.slice(8, 10)} ${MONTHS_ID_SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

let notificationLogEnsured = false;
async function ensureNotificationLog() {
  if (notificationLogEnsured) return;
  // Satu baris per (karyawan, training, status, tanggal training) → notifikasi tidak pernah terkirim dobel,
  // dan training yang diperbarui (tanggal baru) akan memicu notifikasi baru saat kembali warning/expired
  await db.execute(sql`CREATE TABLE IF NOT EXISTS training_notification_log (
    id SERIAL PRIMARY KEY,
    nik TEXT NOT NULL,
    training_key TEXT NOT NULL,
    state TEXT NOT NULL,
    training_date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (nik, training_key, state, training_date)
  );`);
  notificationLogEnsured = true;
}

// Kirim notifikasi ke tiap karyawan yang punya training baru masuk WARNING / EXPIRED (satu notifikasi per karyawan)
export async function runTrainingExpiryNotifications(): Promise<{ employees: number; alerts: number }> {
  await ensureTrainingRecordsTable();
  await ensureNotificationLog();
  const today = todayWit();
  const rows = await db.select().from(trainingRecords);
  const candidates = rows.flatMap(r => trainingAlertsForRecord(r, today).map(a => ({ r, a })));
  if (candidates.length === 0) return { employees: 0, alerts: 0 };

  // Klaim atomik: hanya alert yang BELUM pernah tercatat yang dikembalikan (aman untuk banyak instance server)
  const fresh = new Set<string>();
  const keyOf = (nik: string, key: string, state: string, date: string) => `${nik}|${key}|${state}|${date}`;
  for (let i = 0; i < candidates.length; i += 500) {
    const chunk = candidates.slice(i, i + 500);
    const values = sql.join(chunk.map(({ r, a }) => sql`(${r.nik}, ${a.key}, ${a.state}, ${a.date})`), sql`, `);
    const inserted = await db.execute(sql`INSERT INTO training_notification_log (nik, training_key, state, training_date)
      VALUES ${values} ON CONFLICT DO NOTHING RETURNING nik, training_key, state, training_date;`);
    (inserted.rows as any[]).forEach(x => fresh.add(keyOf(x.nik, x.training_key, x.state, x.training_date)));
  }

  const byNik = new Map<string, { nama: string; alerts: TrainingAlert[] }>();
  candidates.forEach(({ r, a }) => {
    if (!fresh.has(keyOf(r.nik, a.key, a.state, a.date))) return;
    if (!byNik.has(r.nik)) byNik.set(r.nik, { nama: r.nama, alerts: [] });
    byNik.get(r.nik)!.alerts.push(a);
  });
  if (byNik.size === 0) return { employees: 0, alerts: 0 };

  const notifValues = Array.from(byNik.entries()).map(([nik, { alerts }]) => {
    const hasExpired = alerts.some(a => a.state === 'expired');
    const lines = alerts.map(a => a.state === 'expired'
      ? `${a.desc}: EXPIRED sejak ${fmtDate(a.expiryDate)}`
      : `${a.desc}: WARNING, berlaku s/d ${fmtDate(a.expiryDate)}`);
    return {
      userId: nik,
      title: hasExpired ? '⛔ Training Anda Sudah Expired' : '⚠️ Training Anda Akan Expired',
      message: `${lines.join('; ')}. Segera ikuti training ulang — hubungi Admin/Safety untuk jadwal.`,
      type: hasExpired ? 'error' : 'warning',
      category: 'training',
      link: '/',
    };
  });
  const created = await db.insert(notifications).values(notifValues).returning();
  sendWebPush(created).catch((e: any) => console.warn('[Training] Web push gagal:', e?.message));
  const alertCount = Array.from(byNik.values()).reduce((s, v) => s + v.alerts.length, 0);
  console.log(`[Training] Notifikasi masa berlaku: ${byNik.size} karyawan, ${alertCount} training`);
  return { employees: byNik.size, alerts: alertCount };
}

// Jadwal harian 07:00 WIT + sekali setelah server start. Hanya di production agar server lokal
// (yang terhubung ke database yang sama) tidak ikut mengirim notifikasi ke karyawan.
export function initTrainingNotificationCron() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Training] Notifikasi masa berlaku dinonaktifkan di non-production');
    return;
  }
  const run = () => runTrainingExpiryNotifications().catch(e => console.error('[Training] Notifikasi gagal:', e.message));
  cron.schedule('0 7 * * *', run, { timezone: 'Asia/Jayapura' });
  setTimeout(run, 2 * 60 * 1000);
}

// GET /api/training-records/me — training WARNING / EXPIRED milik karyawan yang login (untuk kartu di Home)
trainingRouter.get("/api/training-records/me", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const nik = String((req as any).user?.nik || '').trim().toUpperCase();
    if (!nik) return res.json({ status: "success", data: { alerts: [] } });
    const [rec] = await db.select().from(trainingRecords).where(eq(trainingRecords.nik, nik));
    res.json({ status: "success", data: { nik, nama: rec?.nama ?? null, alerts: rec ? trainingAlertsForRecord(rec) : [] } });
  } catch (error: any) {
    console.error("[Training ME] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ===== Hak akses Database Training =====
// - Lihat SEMUA data : Developer, Section Administrasi, Jabatan Manager & Superintendent
// - Kelola (tambah / edit / import / hapus): Developer & Section Administrasi
// - Selain itu       : hanya data training milik sendiri
const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
interface TrainingAccess { nik: string; viewAll: boolean; canManage: boolean }
const accessCache = new Map<string, { access: TrainingAccess; expires: number }>();
const ACCESS_CACHE_MS = 5 * 60 * 1000;

async function getTrainingAccess(user: any): Promise<TrainingAccess> {
  const nik = String(user?.nik || '').trim().toUpperCase();
  if (!nik) return { nik, viewAll: false, canManage: false };
  const cached = accessCache.get(nik);
  if (cached && cached.expires > Date.now()) return cached.access;

  let isDev = HARDCODED_DEVS.includes(nik) || !!user?.isDeveloper;
  if (!isDev) {
    const [dev] = await db.select({ id: developerUsers.id }).from(developerUsers).where(sql`UPPER(${developerUsers.nik}) = ${nik}`).limit(1);
    isDev = !!dev;
  }
  const [emp] = await db.select().from(employees).where(sql`UPPER(${employees.nik}) = ${nik}`).limit(1);
  const [rec] = await db.select({ bagian: trainingRecords.bagian, jabatan: trainingRecords.jabatan })
    .from(trainingRecords).where(eq(trainingRecords.nik, nik)).limit(1);

  const sections = [emp?.section, (emp as any)?.department, user?.section, user?.department, rec?.bagian]
    .map(v => String(v || '').toLowerCase());
  const jabatans = [emp?.jabatan, (emp as any)?.position, user?.jabatan, rec?.jabatan].map(v => String(v || '').toLowerCase());
  const isAdminSection = sections.some(s => s.includes('administra'));
  const isManagerial = jabatans.some(j => j.includes('manager') || j.includes('superintendent'));

  const access = { nik, viewAll: isDev || isAdminSection || isManagerial, canManage: isDev || isAdminSection };
  accessCache.set(nik, { access, expires: Date.now() + ACCESS_CACHE_MS });
  return access;
}

// Middleware untuk endpoint ubah data: hanya Developer & Section Administrasi
async function requireTrainingManager(req: any, res: any, next: any) {
  try {
    const access = await getTrainingAccess(req.user);
    if (!access.canManage) {
      return res.status(403).json({ status: "error", message: "Anda tidak memiliki akses untuk mengubah Database Training." });
    }
    next();
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// 1. GET /api/training-records — seluruh data (akses penuh) atau hanya data milik sendiri
trainingRouter.get("/api/training-records", async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const access = await getTrainingAccess((req as any).user);
    const rows = await db
      .select()
      .from(trainingRecords)
      .where(access.viewAll ? undefined : eq(trainingRecords.nik, access.nik || '__none__'))
      .orderBy(sql`${trainingRecords.no} ASC NULLS LAST`, sql`${trainingRecords.noK3} ASC NULLS LAST`, asc(trainingRecords.nama));
    res.json({ status: "success", data: rows, access: { viewAll: access.viewAll, canManage: access.canManage, nik: access.nik } });
  } catch (error: any) {
    console.error("[Training GET] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 2. POST /api/training-records — tambah karyawan ke program training
trainingRouter.post("/api/training-records", requireTrainingManager, async (req, res) => {
  try {
    await ensureTrainingRecordsTable();
    const program = isProgram(req.body?.program) ? req.body.program : 'sap';
    const rec = parseBody(req.body, program);
    if (!rec.nik || !rec.nama) {
      return res.status(400).json({ status: "error", message: "NIK dan Nama wajib diisi." });
    }
    const [existing] = await db.select().from(trainingRecords).where(eq(trainingRecords.nik, rec.nik));
    if (existing && existing[PROGRAM_FLAG[program]]) {
      return res.status(409).json({ status: "error", message: `NIK ${rec.nik} sudah terdaftar di program ini.` });
    }
    if (rec.no == null) {
      const col = NO_COLUMN[program];
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
trainingRouter.post("/api/training-records/import", requireTrainingManager, async (req, res) => {
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
      // Normalisasi ulang di server; field yang tidak ada di file dibiarkan tidak ada (data lama dipertahankan)
      programs.forEach(p => PROGRAM_FIELDS[p].forEach(f => {
        if (f in rec) (rec as any)[f] = normalizeProgramField(f, rec[f]);
      }));
      recs.push(rec);
    }
    const { inserted, updated } = await bulkUpsertTrainingRows(recs, programs, updatedBy, !!req.body?.singleTraining);

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
trainingRouter.put("/api/training-records/:id", requireTrainingManager, async (req, res) => {
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
    PROGRAM_FIELDS[program].forEach(f => {
      if (!NON_FORM_FIELDS.has(f)) programValues[f] = rec[f] ?? null;
    });
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
        [PROGRAM_NO[program]]: rec.no ?? null,
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

// 5. DELETE /api/training-records/:id?program=sap|k3|pop — keluarkan karyawan dari satu program;
//    baris dihapus permanen hanya jika tidak lagi terdaftar di program manapun
trainingRouter.delete("/api/training-records/:id", requireTrainingManager, async (req, res) => {
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
    const stillInOther = program
      ? (Object.keys(PROGRAM_FLAG) as TrainingProgram[]).some(p => p !== program && existing[PROGRAM_FLAG[p]])
      : false;
    if (program && stillInOther) {
      const cleared: Record<string, unknown> = {};
      PROGRAM_FIELDS[program].forEach(f => { cleared[f] = null; });
      await db.update(trainingRecords).set({
        ...cleared,
        [PROGRAM_FLAG[program]]: false,
        [PROGRAM_NO[program]]: null,
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
