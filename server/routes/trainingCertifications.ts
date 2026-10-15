import { Router } from "express";
import { db } from "../../src/db/index.js";
import { asc, eq, sql } from "drizzle-orm";
import { trainingCertifications, employees } from "../../src/db/schema.js";
import { getTrainingAccess } from "./training.js";
import { isCertType, defaultCertExpired, type CertType } from "../../src/utils/training-certifications.js";

// ===== Sertifikasi K3 & Kompetensi (modul Training External) =====
// Lihat: semua (akses penuh Database Training) atau hanya milik sendiri · Ubah: Developer & Section Administrasi
export const trainingCertificationsRouter = Router();

const updatedByOf = (req: any) => String(req.user?.nik || req.user?.name || 'system');
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Data awal sesuai rekap sertifikasi (LIST UPDATE 2026)
const SEED: { certType: CertType; nama: string; jabatan: string; pt: string; tanggal: string; keterangan: string | null; expired: string | null; note?: string }[] = [
  { certType: 'ahli_k3_kimia', nama: 'Deni Nugraha Perdiana', jabatan: 'Preparation & Laboratory Manager', pt: 'TBP', tanggal: '2025-10-04', keterangan: 'Lulus', expired: '2028-10-04' },
  { certType: 'ahli_k3_kimia', nama: 'Tigwa Anggawikara', jabatan: 'Laboratory Superintendent', pt: 'TBP', tanggal: '2024-06-04', keterangan: null, expired: '2027-06-04' },
  { certType: 'ahli_k3_kimia', nama: 'Arthur Paul Marnix Souisa', jabatan: 'Laboratory Supervisor', pt: 'GPS', tanggal: '2025-03-08', keterangan: null, expired: '2028-03-07' },
  { certType: 'ahli_k3_kimia', nama: 'Sukarman A Akil', jabatan: 'Quality Assurance Supervisor', pt: 'TBP', tanggal: '2026-05-20', keterangan: null, expired: '2029-05-20' },
  { certType: 'petugas_k3_kimia', nama: 'Muhammad Amran Selang', jabatan: 'Laboratory Supervisor', pt: 'TBP', tanggal: '2023-11-18', keterangan: 'Lulus', expired: '2028-10-22' },
  { certType: 'petugas_k3_kimia', nama: 'Muhammad Reza Satria', jabatan: 'Laboratory Foreman', pt: 'GPS', tanggal: '2024-08-29', keterangan: 'Lulus', expired: '2029-08-03' },
  { certType: 'petugas_k3_kimia', nama: 'M. Harits Asyardy', jabatan: 'Laboratory Foreman', pt: 'TBP', tanggal: '2025-05-20', keterangan: 'Lulus', expired: '2030-04-24' },
  { certType: 'petugas_k3_kimia', nama: 'Khaufi Wirawan A', jabatan: 'Laboratory Supervisor', pt: 'GPS', tanggal: '2026-05-22', keterangan: 'Lulus', expired: '2031-05-22' },
  { certType: 'proteksi_radiasi', nama: 'Sukarman A. Akil, ST', jabatan: 'Quality Assurance Supervisor', pt: 'TBP', tanggal: '2023-02-27', keterangan: 'Lulus', expired: '2028-02-01' },
  { certType: 'proteksi_radiasi', nama: 'Arthur Paul Marnix Souisa', jabatan: 'Laboratory Supervisor', pt: 'GPS', tanggal: '2023-09-22', keterangan: 'Lulus', expired: '2028-08-26' },
  { certType: 'proteksi_radiasi', nama: 'Deni Nugraha Perdiana', jabatan: 'Preparation & Laboratory Manager', pt: 'TBP', tanggal: '2024-04-22', keterangan: 'Lulus', expired: '2029-03-27' },
  { certType: 'proteksi_radiasi', nama: 'Muhammad Amran Selang', jabatan: 'Laboratory Supervisor', pt: 'TBP', tanggal: '2026-02-26', keterangan: 'Lulus', expired: '2031-02-26', note: 'Ujian pertama tgl 26/09/2025\nUjian ulang di tgl 26/02/2026' },
  { certType: 'proteksi_radiasi', nama: 'Tigwa Anggawikara', jabatan: 'Laboratory Superintendent', pt: 'TBP', tanggal: '2026-04-27', keterangan: 'Lulus', expired: '2031-04-27' },
  { certType: 'teknisi_k3_listrik', nama: 'Moch. Siswanto', jabatan: 'Lab Maintenance Supervisor', pt: 'TBP', tanggal: '2024-09-04', keterangan: 'Lulus', expired: '2027-09-04' },
  { certType: 'juru_las_3', nama: 'Christian Anggawijaya', jabatan: 'Lab Maintenance Supervisor', pt: 'GPS', tanggal: '2024-09-09', keterangan: 'Lulus', expired: null },
];

// Peserta Pelatihan ISO 17025 : 2017 Sistem Manajemen Laboratorium (Pelaksanaan 24-Jul-25)
const ISO_17025_NAMES = [
  'Deni Nugraha Perdiana',
  'Tigwa Anggawikara',
  'Arif Maulana Lessy',
  'Arthur Paul Marnix Souisa',
  'Khaufi Wirawan A',
  'Muhammad Amran Selang',
  'Sukarman A. Akil, ST',
  'Junjunan Muhammad Syukur',
  'Ryan M Rusli',
  'Subrandi',
  'Christian Anggawijaya',
  'Moch. Siswanto',
  'Muhammad Reza Satria',
  'Kemal Maulana',
  'M. Harits Asyardy',
  'Ahmad Jusma Azhari Annur',
  'Fachmi Amarullah',
  'Herwin Predianto',
  'Rizal Zaelani',
  'Muhammad Fandy Septiawan',
  'Murti Tamisari Harun',
  'Valdi Pratama',
];

// Cocokkan nama ke Database Karyawan: nama tanpa gelar/tanda baca; cocok penuh, atau 2 kata depan + kata terakhir/inisial
const nameTokens = (s: string) => s.split(',')[0].toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
function matchEmployeeNik(nama: string, emps: { nik: string; name: string }[]): string | null {
  const t = nameTokens(nama);
  const exact = emps.find(e => nameTokens(e.name).join(' ') === t.join(' '));
  if (exact) return exact.nik;
  const candidates = emps.filter(e => {
    const et = nameTokens(e.name);
    if (et.length === 0 || t.length === 0) return false;
    const last = t[t.length - 1];
    const firstOk = et[0] === t[0] || (t[0].length === 1 && et[0].startsWith(t[0]));
    const restOk = t.slice(1).every(w => (w.length === 1 ? et.some(x => x.startsWith(w)) : et.includes(w)));
    return firstOk && restOk && (et.includes(last) || (last.length === 1 && et.some(x => x.startsWith(last))));
  });
  return candidates.length === 1 ? candidates[0].nik : null;
}

let ensurePromise: Promise<void> | null = null;
export function ensureTrainingCertificationsTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS training_certifications (
        id SERIAL PRIMARY KEY,
        cert_type TEXT NOT NULL,
        nik TEXT,
        nama TEXT NOT NULL,
        jabatan TEXT,
        pt TEXT,
        tanggal TEXT,
        keterangan TEXT,
        expired TEXT,
        note TEXT,
        updated_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`);
      // Seed sekali (penanda di app_settings agar data yang sudah diedit/dihapus tidak dibuat ulang)
      const claimed = await db.execute(sql`INSERT INTO app_settings (setting_key, setting_value, description)
        VALUES ('seed_training_certifications_2026', 'done', 'Seed Sertifikasi K3 & Kompetensi (LIST UPDATE 2026)')
        ON CONFLICT (setting_key) DO NOTHING RETURNING id;`);
      if (claimed.rows?.length) {
        const emps = (await db.select({ nik: employees.nik, name: employees.name }).from(employees)).filter(e => e.nik && e.name);
        await db.insert(trainingCertifications).values(SEED.map(s => ({
          ...s, note: s.note || null, nik: matchEmployeeNik(s.nama, emps), updatedBy: 'seed', updatedAt: new Date(),
        })));
        console.log(`[TrainingCert] Seed ${SEED.length} sertifikasi K3 & kompetensi`);
      }

      // Seed ISO 17025 : 2017 Sistem Manajemen Laboratorium
      const claimedIso = await db.execute(sql`INSERT INTO app_settings (setting_key, setting_value, description)
        VALUES ('seed_training_iso_17025_2025', 'done', 'Seed ISO 17025 : 2017 Sistem Manajemen Laboratorium')
        ON CONFLICT (setting_key) DO NOTHING RETURNING id;`);
      if (claimedIso.rows?.length) {
        const emps = (await db.select({ nik: employees.nik, name: employees.name, position: employees.position, pt: employees.pt }).from(employees)).filter(e => e.nik && e.name);
        const isoRows = ISO_17025_NAMES.map(nama => {
          const matchedNik = matchEmployeeNik(nama, emps);
          const emp = emps.find(e => e.nik === matchedNik);
          return {
            certType: 'iso_17025' as CertType,
            nama: emp?.name || nama,
            nik: matchedNik,
            jabatan: emp?.position || null,
            pt: emp?.pt ? (emp.pt.toUpperCase().includes('GPS') ? 'GPS' : 'TBP') : 'TBP',
            tanggal: '2025-07-24',
            keterangan: 'Lulus',
            expired: '2028-07-24',
            note: null,
            updatedBy: 'seed',
            updatedAt: new Date()
          };
        });
        await db.insert(trainingCertifications).values(isoRows);
        console.log(`[TrainingCert] Seed ${isoRows.length} peserta ISO 17025 : 2017`);
      }
    })().catch((e: any) => {
      ensurePromise = null;
      console.error("[TrainingCert] Ensure table failed:", e.message);
      throw e;
    });
  }
  return ensurePromise;
}

async function requireManager(req: any, res: any, next: any) {
  try {
    const access = await getTrainingAccess(req.user);
    if (!access.canManage) return res.status(403).json({ status: "error", message: "Anda tidak memiliki akses untuk mengubah data sertifikasi." });
    next();
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// Bersihkan input form
function pickCert(body: any) {
  const str = (v: unknown) => { const s = String(v ?? '').trim(); return s ? s : null; };
  const certType = body?.certType;
  if (!isCertType(certType)) throw new Error("Jenis sertifikat tidak valid.");
  const nama = str(body?.nama);
  if (!nama) throw new Error("Nama karyawan wajib diisi.");
  const tanggal = str(body?.tanggal);
  if (tanggal && !isDate(tanggal)) throw new Error("Format tanggal training tidak valid (YYYY-MM-DD).");
  let expired = str(body?.expired);
  if (expired && !isDate(expired)) throw new Error("Format tanggal expired tidak valid (YYYY-MM-DD).");
  if (!expired) expired = defaultCertExpired(certType, tanggal);
  return {
    certType, nama, tanggal, expired,
    nik: str(body?.nik)?.toUpperCase() || null,
    jabatan: str(body?.jabatan), pt: str(body?.pt)?.toUpperCase() || null,
    keterangan: str(body?.keterangan), note: str(body?.note),
  };
}

// GET /api/training-certifications
trainingCertificationsRouter.get("/api/training-certifications", async (req, res) => {
  try {
    ensureTrainingCertificationsTable().catch(() => {});
    const access = await getTrainingAccess((req as any).user).catch(() => ({ viewAll: true, canManage: true, nik: '' }));
    let rows: any[] = [];
    try {
      rows = await db.select().from(trainingCertifications).orderBy(asc(trainingCertifications.certType), asc(trainingCertifications.tanggal), asc(trainingCertifications.id));
    } catch (dbErr: any) {
      console.warn("[TrainingCert GET DB offline, using seed]:", dbErr?.message);
    }
    if (!rows || rows.length === 0) {
      rows = SEED.map((s, idx) => ({
        id: idx + 1,
        certType: s.certType,
        nama: s.nama,
        nik: null,
        jabatan: s.jabatan,
        pt: s.pt,
        tanggal: s.tanggal,
        expired: s.expired,
        keterangan: s.keterangan,
        note: s.note || null,
        updatedBy: 'seed',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }
    const data = access.viewAll ? rows : rows.filter(r => !r.nik || String(r.nik).toUpperCase() === access.nik);
    res.json({ status: "success", data, access: { viewAll: access.viewAll, canManage: access.canManage } });
  } catch (error: any) {
    console.warn("[TrainingCert GET] Error:", error?.message);
    const data = SEED.map((s, idx) => ({ id: idx + 1, ...s, nik: null, createdAt: new Date() }));
    res.json({ status: "success", data, access: { viewAll: true, canManage: true } });
  }
});

// POST /api/training-certifications — tambah peserta sertifikasi
trainingCertificationsRouter.post("/api/training-certifications", requireManager, async (req, res) => {
  try {
    await ensureTrainingCertificationsTable();
    const values = pickCert(req.body);
    if (!values.nik) {
      const emps = (await db.select({ nik: employees.nik, name: employees.name }).from(employees)).filter(e => e.nik && e.name);
      values.nik = matchEmployeeNik(values.nama, emps);
    }
    const [row] = await db.insert(trainingCertifications).values({ ...values, updatedBy: updatedByOf(req), updatedAt: new Date() }).returning();
    res.json({ status: "success", data: row });
  } catch (error: any) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

// PUT /api/training-certifications/:id
trainingCertificationsRouter.put("/api/training-certifications/:id", requireManager, async (req, res) => {
  try {
    await ensureTrainingCertificationsTable();
    const id = Number(req.params.id);
    const values = pickCert(req.body);
    const [row] = await db.update(trainingCertifications).set({ ...values, updatedBy: updatedByOf(req), updatedAt: new Date() })
      .where(eq(trainingCertifications.id, id)).returning();
    if (!row) return res.status(404).json({ status: "error", message: "Data sertifikasi tidak ditemukan." });
    res.json({ status: "success", data: row });
  } catch (error: any) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

// DELETE /api/training-certifications/:id
trainingCertificationsRouter.delete("/api/training-certifications/:id", requireManager, async (req, res) => {
  try {
    await ensureTrainingCertificationsTable();
    const id = Number(req.params.id);
    await db.delete(trainingCertifications).where(eq(trainingCertifications.id, id));
    res.json({ status: "success" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});
