// Parser file Database Training (CSV / Excel) — dipakai bersama oleh client (import) & server (seed).
// Mendukung tiga format sumber:
//  - Training SAP (ringkas)  : NO, NIK, NAMA, Jabatan, GOL, SHIFT, HAZID, JSA, IUT OTT, IAI, BFA
//  - Monitoring Training SAP : NO, NIK, NAMA KARYAWAN, DEPT, JABATAN, PT, GOL, lalu per training satu grup kolom
//                              <Training>, TGL, INS, PRE, POST, [PRAK], KET, STATUS
//                              (First Aid = BFA, HIRA = HAZID, INSPEKSI = IUT OTT, BS)
//  - Training K3             : NO, NIK, NAMA KARYAWAN, Shift, BAGIAN, JABATAN, PT, GOL, WAH, Status, LOTO, Status,
//                              CONFINED SPACE, Status, Basic Fire Fighting, Status
// Kolom TGL/INS/PRE/POST/KET/STATUS dibaca berdasarkan posisi (milik kolom training di sebelah kirinya), dan isi
// KET/STATUS dibaca berdasarkan nilainya (PASS/FAILED = hasil, EXPIRED/WARNING = masa berlaku), sehingga header
// ganda di Excel ("Status", "Status_1") maupun CSV pandas ("Status.1", "TGL2") tetap terbaca benar.

export type TrainingProgram = 'sap' | 'k3' | 'pop';

export type SapDateKey = 'hazid' | 'jsa' | 'iutOtt' | 'iai' | 'bfa' | 'bs';
export type SapStatusKey = 'hazidStatus' | 'jsaStatus' | 'iutOttStatus' | 'iaiStatus' | 'bfaStatus' | 'bsStatus';
export type K3DateKey = 'wah' | 'loto' | 'confinedSpace' | 'fireFighting';
export type K3StatusKey = 'wahStatus' | 'lotoStatus' | 'confinedSpaceStatus' | 'fireFightingStatus';
type DateKey = SapDateKey | K3DateKey;
type StatusKey = SapStatusKey | K3StatusKey;

export const SAP_TRAININGS: { key: SapDateKey; statusKey: SapStatusKey; label: string; desc: string }[] = [
  { key: 'hazid', statusKey: 'hazidStatus', label: 'HAZID', desc: 'Hazard Identification (HIRA)' },
  { key: 'jsa', statusKey: 'jsaStatus', label: 'JSA', desc: 'Job Safety Analysis' },
  { key: 'iutOtt', statusKey: 'iutOttStatus', label: 'IUT OTT', desc: 'Inspeksi (IUT OTT)' },
  { key: 'iai', statusKey: 'iaiStatus', label: 'IAI', desc: 'IAI' },
  { key: 'bfa', statusKey: 'bfaStatus', label: 'BFA', desc: 'Basic First Aid' },
  { key: 'bs', statusKey: 'bsStatus', label: 'Basic Safety', desc: 'Basic Safety (BS)' },
];

export const K3_TRAININGS: { key: K3DateKey; statusKey: K3StatusKey; label: string; desc: string }[] = [
  { key: 'wah', statusKey: 'wahStatus', label: 'WAH', desc: 'Working at Height' },
  { key: 'loto', statusKey: 'lotoStatus', label: 'LOTO', desc: 'Lock Out Tag Out' },
  { key: 'confinedSpace', statusKey: 'confinedSpaceStatus', label: 'Confined Space', desc: 'Confined Space Entry' },
  { key: 'fireFighting', statusKey: 'fireFightingStatus', label: 'Fire Fighting', desc: 'Basic Fire Fighting' },
];

// Training SAP wajib per golongan:
//  - GOL I (Crew)      : BFA & BS
//  - GOL IV & V        : HAZID, JSA, IUT OTT, IAI (BFA tidak wajib)
//  - GOL II, III & lain: HAZID, JSA, IUT OTT, IAI, BFA
export function sapRequiredKeys(gol: string | null | undefined): SapDateKey[] {
  const g = String(gol || '').trim().toUpperCase();
  if (g === 'I') return ['bfa', 'bs'];
  if (g === 'IV' || g === 'V') return ['hazid', 'jsa', 'iutOtt', 'iai'];
  return ['hazid', 'jsa', 'iutOtt', 'iai', 'bfa'];
}
export const isBfaExempt = (gol: string | null | undefined) => !sapRequiredKeys(gol).includes('bfa');

// Training K3 wajib per section (bagian) & golongan — hanya GOL I–III:
//  - WAH            : Section Preparation (termasuk Wet/Dry) & Maintenance
//  - LOTO           : Section Maintenance
//  - Confined Space : Section Maintenance
//  - Fire Fighting  : semua section, kecuali QA, Administration & Inventory Control
export const K3_RULES: Record<K3DateKey, string> = {
  wah: 'Section Preparation & Maintenance · GOL I–III',
  loto: 'Section Maintenance · GOL I–III',
  confinedSpace: 'Section Maintenance · GOL I–III',
  fireFighting: 'Semua section GOL I–III, kecuali QA, Administration & Inventory Control',
};
export function k3RequiredKeys(bagian: string | null | undefined, gol: string | null | undefined): K3DateKey[] {
  const g = String(gol || '').trim().toUpperCase();
  if (g !== 'I' && g !== 'II' && g !== 'III') return [];
  const b = String(bagian || '').toLowerCase();
  const isPrep = b.includes('prep');
  const isMaint = b.includes('maint');
  const noFireFighting = /\bqa\b|quality|admin|inventory/.test(b);
  const keys: K3DateKey[] = [];
  if (isPrep || isMaint) keys.push('wah');
  if (isMaint) keys.push('loto', 'confinedSpace');
  if (!noFireFighting) keys.push('fireFighting');
  return keys;
}

// ===== Masa berlaku training (dihitung dari tanggal training) =====
// ≥ 1 tahun 6 bulan → WARNING (kuning), ≥ 2 tahun → EXPIRED (merah)
export const TRAINING_WARNING_MONTHS = 18;
export const TRAINING_EXPIRY_MONTHS = 24;

export type TrainingValidity = 'valid' | 'warning' | 'expired';

// Tanggal hari ini 'YYYY-MM-DD' zona Asia/Jayapura (WIT)
export const todayWit = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });

// Tambah n bulan ke tanggal 'YYYY-MM-DD' (tanggal 31 dipotong ke akhir bulan)
export function addMonthsToDate(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12 + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

export function trainingValidity(dateStr: string, today: string = todayWit()) {
  const warningDate = addMonthsToDate(dateStr, TRAINING_WARNING_MONTHS);
  const expiryDate = addMonthsToDate(dateStr, TRAINING_EXPIRY_MONTHS);
  const state: TrainingValidity = today >= expiryDate ? 'expired' : today >= warningDate ? 'warning' : 'valid';
  return { state, warningDate, expiryDate };
}

// Detail nilai per training dari file Monitoring (instruktur & skor)
export interface TrainingScoreDetail {
  ins?: string;
  pre?: number;
  post?: number;
  prak?: number;
}
export type SapDetails = Partial<Record<SapDateKey, TrainingScoreDetail>>;

export interface ParsedTrainingRow {
  no?: number | null;
  nik: string;
  nama: string;
  jabatan?: string | null;
  gol?: string | null;
  shift?: string | null;
  bagian?: string | null;
  pt?: string | null;
  hazid?: string | null;
  hazidStatus?: string | null;
  jsa?: string | null;
  jsaStatus?: string | null;
  iutOtt?: string | null;
  iutOttStatus?: string | null;
  iai?: string | null;
  iaiStatus?: string | null;
  bfa?: string | null;
  bfaStatus?: string | null;
  bs?: string | null;
  bsStatus?: string | null;
  sapDetails?: SapDetails | null;
  wah?: string | null;
  wahStatus?: string | null;
  loto?: string | null;
  lotoStatus?: string | null;
  confinedSpace?: string | null;
  confinedSpaceStatus?: string | null;
  fireFighting?: string | null;
  fireFightingStatus?: string | null;
  popData?: PopData | null;
}

// ===== Sertifikasi Pengawas Operasional (Pra POP / POP / POM) =====
// Keterangan POP dinormalisasi ke kode baku agar konsisten & mudah difilter
export type PopKeterangan = 'PASS' | 'TIDAK_WAJIB' | 'IJAZAH' | 'MASA_KERJA';
export const POP_KETERANGAN: Record<PopKeterangan, { label: string; desc: string }> = {
  PASS: { label: 'Memenuhi Syarat', desc: 'Memenuhi persyaratan Pengawas Operasional Pertama (POP)' },
  MASA_KERJA: { label: 'Masa Kerja Belum Cukup', desc: 'Belum memenuhi syarat masa kerja minimum untuk POP' },
  IJAZAH: { label: 'Ijazah Tidak Mendukung', desc: 'Pendidikan terakhir belum memenuhi syarat POP' },
  TIDAK_WAJIB: { label: 'Tidak Wajib POP', desc: 'Jabatan tidak termasuk daftar wajib POP' },
};

export interface PopData {
  doh?: string | null;               // Tanggal awal bergabung (DOH)
  praPop?: string | null;            // Tanggal Pra POP
  praPopIns?: string | null;         // Instruktur Pra POP
  praPopPre?: number | null;
  praPopPost?: number | null;
  praPopResult?: string | null;      // 'PASS' | 'FAIL' | null
  popBatch?: string | null;          // mis. "Batch 4", "Batch 2 · 2026", "Batch 2022"
  pendidikan?: string | null;        // Pendidikan terakhir (POP)
  tahunLulus?: string | null;
  pengalamanTambang?: string | null; // Pengalaman kerja di pertambangan lain
  masaKerja?: string | null;         // Masa kerja (teks dari file, cadangan bila DOH kosong)
  popKeterangan?: PopKeterangan | string | null;
  pom?: string | null;               // Keikutsertaan POM (batch / keterangan)
  pomPendidikan?: string | null;
  pomMasaKerja?: string | null;
  pomKeterangan?: string | null;     // 'PASS' | null
}

export function normalizePopKeterangan(val: unknown): PopKeterangan | string | null {
  const s = String(val ?? '').trim();
  if (!s || s === '-') return null;
  const l = s.toLowerCase();
  if (l === 'pass' || l === 'lulus' || l.includes('memenuhi syarat')) return 'PASS';
  if (l.includes('tidak masuk') || l.includes('tidak wajib')) return 'TIDAK_WAJIB';
  if (l.includes('ijazah') || l.includes('pendidikan')) return 'IJAZAH';
  if (l.includes('masa kerja')) return 'MASA_KERJA';
  return s;
}

// "Batch (2022)" → "Batch 2022", "Batch 2 (2026)" → "Batch 2 · 2026", "Batch 4" → "Batch 4"
export function formatPopBatch(val: unknown): string | null {
  const s = String(val ?? '').replace(/\s+/g, ' ').trim();
  if (!s || s === '-') return null;
  const m = s.match(/^batch\s*(\d+)?\s*\(?\s*(\d{4})?\s*\)?$/i);
  if (!m) return s;
  const [, no, year] = m;
  if (no && year) return `Batch ${no} · ${year}`;
  if (no) return `Batch ${no}`;
  if (year) return `Batch ${year}`;
  return s;
}

// Masa kerja dari DOH → "9 Tahun 6 Bulan"
export function masaKerjaFromDoh(doh: string, today: string = todayWit()): string {
  const [y1, m1, d1] = doh.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (months < 0) months = 0;
  return `${Math.floor(months / 12)} Tahun ${months % 12} Bulan`;
}

export const popAttendedPra = (p?: PopData | null) => !!p && (!!p.praPop || p.praPopResult === 'PASS' || p.praPopPre != null || p.praPopPost != null);
export const popAttendedPop = (p?: PopData | null) => !!p?.popBatch;
export const popPassedPom = (p?: PopData | null) => p?.pomKeterangan === 'PASS';

export interface ParsedTrainingSheet {
  programs: TrainingProgram[];
  records: ParsedTrainingRow[];
  skipped: number;
  // File satu-training (kolom "Tanggal Training" tanpa nama training, mis. Basic_Safety.csv):
  // training yang dipakai, atau null bila belum bisa ditentukan (user harus memilih)
  singleTraining?: TrainingKey | null;
}

export type TrainingKey = SapDateKey | K3DateKey;

export const ALL_TRAININGS: { key: TrainingKey; label: string; desc: string; program: TrainingProgram }[] = [
  ...SAP_TRAININGS.map(t => ({ key: t.key as TrainingKey, label: t.label, desc: t.desc, program: 'sap' as const })),
  ...K3_TRAININGS.map(t => ({ key: t.key as TrainingKey, label: t.label, desc: t.desc, program: 'k3' as const })),
];

// Tebak jenis training dari nama file, untuk file satu-training (mis. "Basic_Safety.csv" → BS)
export function guessTrainingFromFileName(fileName: string): TrainingKey | null {
  const n = fileName.toLowerCase().replace(/[^a-z]/g, '');
  const rules: [string[], TrainingKey][] = [
    [['basicsafety'], 'bs'],
    [['firstaid', 'bfa'], 'bfa'],
    [['firefight', 'pemadam'], 'fireFighting'],
    [['confined'], 'confinedSpace'],
    [['loto', 'lockout'], 'loto'],
    [['wah', 'workatheight', 'workingatheight'], 'wah'],
    [['hira', 'hazid'], 'hazid'],
    [['jsa'], 'jsa'],
    [['inspeksi', 'iutott'], 'iutOtt'],
    [['iai'], 'iai'],
  ];
  return rules.find(([words]) => words.some(w => n.includes(w)))?.[1] ?? null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

// Normalisasi berbagai format tanggal ke 'YYYY-MM-DD'; null jika kosong/tidak valid
export function normalizeTrainingDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }
  const s = String(val).trim();
  if (!s || s === '-' || s === '`' || s === '0' || s.toLowerCase() === 'null' || s === '#N/A') return null;
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
  // DD-Mon-YYYY (mis. 12-Feb-2026 / 12 Februari 2026)
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*[-\s](\d{4})$/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()];
    const [d, y] = [Number(m[1]), Number(m[3])];
    return mo && valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  // Serial number Excel (boleh pecahan)
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const num = Math.round(Number(s));
    if (num >= 32874 && num <= 73051) {
      const dt = new Date((num - 25569) * 86400 * 1000);
      return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
    }
  }
  return null;
}

// Normalisasi status: 'PASS' | 'Pending' | 'FAIL' | 'EXPIRED' | 'WARNING' | null
export function normalizeTrainingStatus(val: unknown): string | null {
  const s = String(val ?? '').trim();
  if (!s || s === '-' || s === '`') return null;
  const l = s.toLowerCase();
  if (['pass', 'passed', 'lulus', 'ok', 'kompeten'].includes(l)) return 'PASS';
  if (['pending', 'proses', 'menunggu', 'on progress'].includes(l)) return 'Pending';
  if (['fail', 'failed', 'tidak lulus', 'gagal', 'remedial'].includes(l)) return 'FAIL';
  if (['expired', 'kadaluarsa', 'kedaluwarsa', 'habis'].includes(l)) return 'EXPIRED';
  if (['warning', 'hampir habis', 'akan expired'].includes(l)) return 'WARNING';
  return s;
}

// Gabungkan beberapa nilai KET/STATUS menjadi satu status (prioritas: FAIL > EXPIRED > WARNING > Pending > PASS)
const STATUS_PRIORITY = ['FAIL', 'EXPIRED', 'WARNING', 'Pending', 'PASS'];
function combineStatuses(values: unknown[]): string | null {
  const normalized = values.map(normalizeTrainingStatus).filter((v): v is string => !!v);
  if (normalized.length === 0) return null;
  for (const p of STATUS_PRIORITY) if (normalized.includes(p)) return p;
  return normalized[0];
}

const cleanText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s && s !== '-' && s !== '`' ? s : null;
};

const toScore = (v: unknown): number | undefined => {
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? undefined : n;
};

type ProfileField = 'no' | 'nik' | 'nama' | 'jabatan' | 'gol' | 'shift' | 'bagian' | 'pt';
type SubField = 'tgl' | 'ins' | 'pre' | 'post' | 'prak' | 'status';
type ColumnDef =
  | { kind: 'profile'; field: ProfileField }
  | { kind: 'training'; key: DateKey; isFlag: boolean }
  | { kind: 'sub'; sub: SubField; key: DateKey }
  | null;

const PROFILE_ALIASES: Record<string, ProfileField> = {
  no: 'no', nomor: 'no',
  nik: 'nik',
  nama: 'nama', namakaryawan: 'nama', name: 'nama', employeename: 'nama',
  jabatan: 'jabatan', position: 'jabatan',
  gol: 'gol', golongan: 'gol', grade: 'gol',
  shift: 'shift',
  bagian: 'bagian', section: 'bagian', seksi: 'bagian',
  pt: 'pt', perusahaan: 'pt', company: 'pt',
};

const TRAINING_ALIASES: Record<string, DateKey> = {
  hazid: 'hazid', hira: 'hazid',
  jsa: 'jsa',
  iutott: 'iutOtt', inspeksi: 'iutOtt',
  iai: 'iai',
  bfa: 'bfa', firstaid: 'bfa', basicfirstaid: 'bfa',
  bs: 'bs',
  wah: 'wah', workatheight: 'wah', workingatheight: 'wah',
  loto: 'loto', lockouttagout: 'loto',
  confinedspace: 'confinedSpace', cse: 'confinedSpace',
  basicfirefighting: 'fireFighting', firefighting: 'fireFighting', bff: 'fireFighting',
};

const STATUS_KEY_OF: Record<DateKey, StatusKey> = {
  hazid: 'hazidStatus', jsa: 'jsaStatus', iutOtt: 'iutOttStatus', iai: 'iaiStatus', bfa: 'bfaStatus', bs: 'bsStatus',
  wah: 'wahStatus', loto: 'lotoStatus', confinedSpace: 'confinedSpaceStatus', fireFighting: 'fireFightingStatus',
};
const SAP_KEYS = new Set<string>(SAP_TRAININGS.map(t => t.key));
const K3_KEYS = new Set<string>(K3_TRAININGS.map(t => t.key));

const normalizeHeader = (h: unknown) => String(h ?? '').toLowerCase().replace(/[^a-z]/g, '');

// Header sub-kolom: TGL, TGL2, INS3, INST, PRE4, POST5, PRAK, KET6, STATUS.1, dst.
function subFieldOf(h: string): SubField | null {
  if (h.startsWith('tgl') || h === 'tanggal' || h === 'date') return 'tgl';
  if (h.startsWith('ins')) return 'ins';
  if (h.startsWith('prak')) return 'prak';
  if (h.startsWith('pre')) return 'pre';
  if (h.startsWith('post')) return 'post';
  if (h.startsWith('ket') || h.startsWith('status')) return 'status';
  return null;
}

// Kolom tanggal generik pada file satu-training (tidak menyebut nama training)
const GENERIC_DATE_HEADERS = new Set(['tanggaltraining', 'tgltraining', 'trainingdate', 'tanggalpelatihan', 'tglpelatihan']);

// rows: array-of-arrays (hasil Papa.parse tanpa header, atau XLSX sheet_to_json { header: 1 })
// singleTraining: jenis training untuk file satu-training (kolom "Tanggal Training"), mis. 'bs' untuk Basic Safety
export function parseTrainingSheet(rows: unknown[][], options: { singleTraining?: TrainingKey | null } = {}): ParsedTrainingSheet | null {
  // Cari baris header (baris yang memuat kolom NIK) di 15 baris pertama
  const headerIdx = rows.slice(0, 15).findIndex(r => Array.isArray(r) && r.some(c => normalizeHeader(c) === 'nik'));
  if (headerIdx < 0) return null;

  const headers = rows[headerIdx].map(normalizeHeader);
  // Format Sertifikasi Pengawas (Pra POP / POP / POM)
  if (headers.includes('prapop') || headers.some(h => h.startsWith('keteranganpop'))) {
    return parsePopSheet(rows, headerIdx, headers);
  }
  const isSingleTraining = headers.some(h => GENERIC_DATE_HEADERS.has(h)) && !headers.some(h => TRAINING_ALIASES[h]);
  if (isSingleTraining && !options.singleTraining) {
    // Format dikenali, tapi jenis trainingnya harus dipilih dulu
    return { programs: [], records: [], skipped: 0, singleTraining: null };
  }

  const columns: ColumnDef[] = [];
  let current: DateKey | null = null;
  headers.forEach((h, i) => {
    if (!h) { columns[i] = null; return; }
    if (isSingleTraining && GENERIC_DATE_HEADERS.has(h)) {
      // Tanggal training generik → milik training yang dipilih; PRE/POST/Ket sesudahnya ikut training ini
      current = options.singleTraining!;
      columns[i] = { kind: 'sub', sub: 'tgl', key: current };
      return;
    }
    // Nama training dicek lebih dulu (mis. "INSPEKSI" bukan sub-kolom "INS")
    const training = TRAINING_ALIASES[h];
    if (training) {
      current = training;
      // Format Monitoring: kolom nama training berisi penanda (1.0), tanggal ada di kolom TGL sesudahnya
      const next = headers[i + 1] ? subFieldOf(headers[i + 1]) : null;
      columns[i] = { kind: 'training', key: training, isFlag: next === 'tgl' };
      return;
    }
    const profile = PROFILE_ALIASES[h];
    if (profile) { columns[i] = { kind: 'profile', field: profile }; return; }
    const sub = subFieldOf(h);
    columns[i] = sub && current ? { kind: 'sub', sub, key: current } : null;
  });

  const trainingKeys = isSingleTraining
    ? [options.singleTraining!]
    : Array.from(new Set(columns.flatMap(c => (c?.kind === 'training' ? [c.key] : []))));
  const programs: TrainingProgram[] = [];
  if (trainingKeys.some(k => SAP_KEYS.has(k))) programs.push('sap');
  if (trainingKeys.some(k => K3_KEYS.has(k))) programs.push('k3');
  if (programs.length === 0) return null;
  // Detail skor hanya ada di format Monitoring; format lain tidak boleh menghapus detail yang sudah tersimpan
  const hasScoreColumns = columns.some(c => c?.kind === 'sub' && c.sub !== 'tgl' && c.sub !== 'status' && SAP_KEYS.has(c.key));

  let skipped = 0;
  const records: ParsedTrainingRow[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    if (!Array.isArray(row)) continue;
    const rec: Record<string, any> = {};
    const statusValues: Partial<Record<DateKey, unknown[]>> = {};
    const details: SapDetails = {};

    columns.forEach((col, i) => {
      if (!col) return;
      const value = row[i];
      if (col.kind === 'profile') {
        if (col.field === 'no') {
          const n = parseInt(String(value ?? '').trim(), 10);
          rec.no = isNaN(n) ? null : n;
        } else if (col.field === 'nik') rec.nik = String(value ?? '').trim().toUpperCase();
        else rec[col.field] = cleanText(value);
        return;
      }
      if (col.kind === 'training') {
        if (!col.isFlag) rec[col.key] = normalizeTrainingDate(value);
        return;
      }
      // Sub-kolom milik training di sebelah kirinya
      if (col.sub === 'tgl') rec[col.key] = normalizeTrainingDate(value);
      else if (col.sub === 'status') (statusValues[col.key] ??= []).push(value);
      else if (SAP_KEYS.has(col.key)) {
        const d = (details[col.key as SapDateKey] ??= {});
        if (col.sub === 'ins') {
          const ins = cleanText(value);
          if (ins) d.ins = ins.toUpperCase();
        } else {
          const score = toScore(value);
          if (score !== undefined) d[col.sub] = score;
        }
      }
    });

    const hasAnyValue = row.some(c => String(c ?? '').trim() && String(c ?? '').trim() !== '`');
    if (!rec.nik || !rec.nama) {
      if (hasAnyValue) skipped++;
      continue;
    }
    if (typeof rec.gol === 'string') rec.gol = rec.gol.toUpperCase();
    // Hanya training yang kolomnya ada di file yang diisi (training lain dibiarkan apa adanya di server)
    trainingKeys.forEach(key => {
      if (rec[key] === undefined) rec[key] = null;
      rec[STATUS_KEY_OF[key]] = combineStatuses(statusValues[key] ?? []);
    });
    if (hasScoreColumns) {
      const cleaned = Object.fromEntries(Object.entries(details).filter(([, d]) => d && Object.keys(d).length > 0));
      rec.sapDetails = Object.keys(cleaned).length > 0 ? cleaned : null;
    }
    records.push(rec as ParsedTrainingRow);
  }
  return { programs, records, skipped, singleTraining: isSingleTraining ? options.singleTraining : undefined };
}

// ===== Pengingat training per karyawan (WARNING / EXPIRED) =====
// Dipakai server (notifikasi & Action Center di Home) dan client agar aturannya selalu sama.
// Masa berlaku HANYA berlaku untuk Training SAP (training yang WAJIB untuk GOL karyawan).
// Training K3 (WAH, LOTO, Confined Space, Fire Fighting) & Sertifikasi POP/POM tidak punya masa berlaku —
// cukup dihitung jumlah karyawan yang telah mengikuti.
export interface TrainingAlert {
  key: TrainingKey;
  label: string;
  desc: string;
  program: TrainingProgram;
  date: string;
  expiryDate: string;
  state: 'warning' | 'expired';
}

export function trainingAlertsForRecord(r: Record<string, any>, today: string = todayWit()): TrainingAlert[] {
  const alerts: TrainingAlert[] = [];
  const push = (key: TrainingKey, label: string, desc: string, program: TrainingProgram, date: string) => {
    const v = trainingValidity(date, today);
    if (v.state !== 'valid') alerts.push({ key, label, desc, program, date, expiryDate: v.expiryDate, state: v.state });
  };
  if (r.inSap) {
    const required = sapRequiredKeys(r.gol);
    SAP_TRAININGS.forEach(t => {
      if (required.includes(t.key) && r[t.key] && r[t.statusKey] !== 'FAIL') push(t.key, t.label, t.desc, 'sap', r[t.key]);
    });
  }
  // Expired dulu, lalu yang paling cepat habis
  return alerts.sort((a, b) => (a.state === b.state ? a.expiryDate.localeCompare(b.expiryDate) : a.state === 'expired' ? -1 : 1));
}

// ===== Parser format Sertifikasi Pengawas Operasional (Pra_POP_POP_POM.csv) =====
// Header: No, Employee Name, NIK, Section, Jabatan, PT, Doh Awal, Pra POP, INS, PRE, POST, Ket, POP,
//         Pendidikan Terakhir (POP), Lulusan pendidikan Terakhir, Pengalaman Kerja ... (Pertambangan),
//         Masa Kerja (POP), Keterangan (POP), POM, Pendidikan Terakhir (POM), Masa Kerja (POM), Keterangan (POM)
// INS/PRE/POST/Ket dibaca sebagai milik kolom "Pra POP" di sebelah kirinya.
type PopField = keyof PopData | 'no' | 'nik' | 'nama' | 'jabatan' | 'bagian' | 'pt' | 'gol' | 'shift';
function popFieldOf(h: string, afterPraPop: boolean): PopField | null {
  const profile: Record<string, PopField> = {
    no: 'no', nik: 'nik', nama: 'nama', namakaryawan: 'nama', employeename: 'nama', name: 'nama',
    jabatan: 'jabatan', section: 'bagian', bagian: 'bagian', pt: 'pt', gol: 'gol', golongan: 'gol', shift: 'shift',
  };
  if (profile[h]) return profile[h];
  if (h.startsWith('doh') || h === 'tanggalawalbergabung') return 'doh';
  if (h === 'prapop') return 'praPop';
  if (afterPraPop && h.startsWith('ins')) return 'praPopIns';
  if (afterPraPop && h.startsWith('pre')) return 'praPopPre';
  if (afterPraPop && h.startsWith('post')) return 'praPopPost';
  if (afterPraPop && (h === 'ket' || h === 'keterangan' || h === 'hasil')) return 'praPopResult';
  if (h === 'pop') return 'popBatch';
  if (h === 'pendidikanterakhirpop') return 'pendidikan';
  if (h.startsWith('lulusan') || h === 'tahunlulus') return 'tahunLulus';
  if (h.startsWith('pengalamankerja')) return 'pengalamanTambang';
  if (h === 'masakerjapop') return 'masaKerja';
  if (h === 'keteranganpop') return 'popKeterangan';
  if (h === 'pom') return 'pom';
  if (h === 'pendidikanterakhirpom') return 'pomPendidikan';
  if (h === 'masakerjapom') return 'pomMasaKerja';
  if (h === 'keteranganpom') return 'pomKeterangan';
  return null;
}

function parsePopSheet(rows: unknown[][], headerIdx: number, headers: string[]): ParsedTrainingSheet {
  let afterPraPop = false;
  const columns = headers.map(h => {
    const f = popFieldOf(h, afterPraPop);
    if (f === 'praPop') afterPraPop = true;
    else if (f === 'popBatch') afterPraPop = false;
    return f;
  });
  const records: ParsedTrainingRow[] = [];
  let skipped = 0;
  for (const row of rows.slice(headerIdx + 1)) {
    if (!Array.isArray(row)) continue;
    const rec: Record<string, any> = {};
    const pop: PopData = {};
    columns.forEach((f, i) => {
      if (!f) return;
      const v = row[i];
      switch (f) {
        case 'no': { const n = parseInt(String(v ?? '').trim(), 10); rec.no = isNaN(n) ? null : n; break; }
        case 'nik': rec.nik = String(v ?? '').trim().toUpperCase(); break;
        case 'nama': case 'jabatan': case 'bagian': case 'pt': case 'shift': rec[f] = cleanText(v); break;
        case 'gol': rec.gol = cleanText(v)?.toUpperCase() ?? null; break;
        case 'doh': case 'praPop': pop[f] = normalizeTrainingDate(v); break;
        case 'praPopPre': case 'praPopPost': pop[f] = toScore(v) ?? null; break;
        case 'praPopResult': case 'pomKeterangan': {
          const s = normalizeTrainingStatus(v);
          pop[f] = s === 'PASS' || s === 'FAIL' ? s : null;
          break;
        }
        case 'popBatch': pop.popBatch = formatPopBatch(v); break;
        case 'popKeterangan': pop.popKeterangan = normalizePopKeterangan(v); break;
        case 'tahunLulus': { const y = String(v ?? '').trim().match(/^(\d{4})/); pop.tahunLulus = y ? y[1] : null; break; }
        case 'praPopIns': { const s = cleanText(v); pop.praPopIns = s ? s.toUpperCase() : null; break; }
        default: (pop as any)[f] = cleanText(v);
      }
    });
    const hasAnyValue = row.some(c => String(c ?? '').trim() && String(c ?? '').trim() !== '`');
    if (!rec.nik || !rec.nama) {
      if (hasAnyValue) skipped++;
      continue;
    }
    rec.popData = pop;
    records.push(rec as ParsedTrainingRow);
  }
  return { programs: ['pop'], records, skipped };
}
