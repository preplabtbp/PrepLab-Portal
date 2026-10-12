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

export type TrainingProgram = 'sap' | 'k3';

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
  { key: 'bs', statusKey: 'bsStatus', label: 'BS', desc: 'BS' },
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
}

export interface ParsedTrainingSheet {
  programs: TrainingProgram[];
  records: ParsedTrainingRow[];
  skipped: number;
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
  nama: 'nama', namakaryawan: 'nama', name: 'nama',
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

// rows: array-of-arrays (hasil Papa.parse tanpa header, atau XLSX sheet_to_json { header: 1 })
export function parseTrainingSheet(rows: unknown[][]): ParsedTrainingSheet | null {
  // Cari baris header (baris yang memuat kolom NIK) di 15 baris pertama
  const headerIdx = rows.slice(0, 15).findIndex(r => Array.isArray(r) && r.some(c => normalizeHeader(c) === 'nik'));
  if (headerIdx < 0) return null;

  const headers = rows[headerIdx].map(normalizeHeader);
  const columns: ColumnDef[] = [];
  let current: DateKey | null = null;
  headers.forEach((h, i) => {
    if (!h) { columns[i] = null; return; }
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

  const programs: TrainingProgram[] = [];
  if (columns.some(c => c?.kind === 'training' && SAP_KEYS.has(c.key))) programs.push('sap');
  if (columns.some(c => c?.kind === 'training' && K3_KEYS.has(c.key))) programs.push('k3');
  if (programs.length === 0) return null;
  const trainingKeys = Array.from(new Set(columns.flatMap(c => (c?.kind === 'training' ? [c.key] : []))));
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
  return { programs, records, skipped };
}
