// Parser file Database Training (CSV / Excel) — dipakai bersama oleh client (import) & server (seed).
// Mendukung dua format sumber:
//  - Training SAP  : NO, NIK, NAMA, Jabatan, GOL, SHIFT, HAZID, JSA, IUT OTT, IAI, BFA
//  - Training K3   : NO, NIK, NAMA KARYAWAN, Shift, BAGIAN, JABATAN, PT, GOL, WAH, Status, LOTO, Status,
//                    CONFINED SPACE, Status, Basic Fire Fighting, Status
// Kolom "Status" dibaca berdasarkan posisi (milik kolom training di sebelah kirinya), sehingga header
// ganda di Excel ("Status", "Status_1") maupun CSV pandas ("Status.1") tetap terbaca benar.

export type TrainingProgram = 'sap' | 'k3';

export type SapDateKey = 'hazid' | 'jsa' | 'iutOtt' | 'iai' | 'bfa';
export type K3DateKey = 'wah' | 'loto' | 'confinedSpace' | 'fireFighting';
export type K3StatusKey = 'wahStatus' | 'lotoStatus' | 'confinedSpaceStatus' | 'fireFightingStatus';

export const SAP_TRAININGS: { key: SapDateKey; label: string; desc: string }[] = [
  { key: 'hazid', label: 'HAZID', desc: 'Hazard Identification' },
  { key: 'jsa', label: 'JSA', desc: 'Job Safety Analysis' },
  { key: 'iutOtt', label: 'IUT OTT', desc: 'IUT OTT' },
  { key: 'iai', label: 'IAI', desc: 'IAI' },
  { key: 'bfa', label: 'BFA', desc: 'Basic First Aid' },
];

export const K3_TRAININGS: { key: K3DateKey; statusKey: K3StatusKey; label: string; desc: string }[] = [
  { key: 'wah', statusKey: 'wahStatus', label: 'WAH', desc: 'Working at Height' },
  { key: 'loto', statusKey: 'lotoStatus', label: 'LOTO', desc: 'Lock Out Tag Out' },
  { key: 'confinedSpace', statusKey: 'confinedSpaceStatus', label: 'Confined Space', desc: 'Confined Space Entry' },
  { key: 'fireFighting', statusKey: 'fireFightingStatus', label: 'Fire Fighting', desc: 'Basic Fire Fighting' },
];

// GOL IV & V tidak wajib mengikuti Basic First Aid (BFA)
export const isBfaExempt = (gol: string | null | undefined) => ['IV', 'V'].includes(String(gol || '').trim().toUpperCase());

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
  jsa?: string | null;
  iutOtt?: string | null;
  iai?: string | null;
  bfa?: string | null;
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

// Normalisasi status kelulusan: 'PASS' | 'Pending' | 'FAIL' | null
export function normalizeTrainingStatus(val: unknown): string | null {
  const s = String(val ?? '').trim();
  if (!s || s === '-' || s === '`') return null;
  const l = s.toLowerCase();
  if (['pass', 'passed', 'lulus', 'ok', 'kompeten'].includes(l)) return 'PASS';
  if (['pending', 'proses', 'menunggu', 'on progress'].includes(l)) return 'Pending';
  if (['fail', 'failed', 'tidak lulus', 'gagal', 'remedial'].includes(l)) return 'FAIL';
  return s;
}

const cleanText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s && s !== '-' && s !== '`' ? s : null;
};

type ColumnField = keyof ParsedTrainingRow | 'status';

const HEADER_ALIASES: Record<string, ColumnField> = {
  no: 'no', nomor: 'no',
  nik: 'nik',
  nama: 'nama', namakaryawan: 'nama', name: 'nama',
  jabatan: 'jabatan', position: 'jabatan',
  gol: 'gol', golongan: 'gol', grade: 'gol',
  shift: 'shift',
  bagian: 'bagian', section: 'bagian', seksi: 'bagian', departemen: 'bagian',
  pt: 'pt', perusahaan: 'pt', company: 'pt',
  hazid: 'hazid', jsa: 'jsa', iutott: 'iutOtt', iai: 'iai', bfa: 'bfa', basicfirstaid: 'bfa',
  wah: 'wah', workatheight: 'wah', workingatheight: 'wah',
  loto: 'loto', lockouttagout: 'loto',
  confinedspace: 'confinedSpace', cse: 'confinedSpace',
  basicfirefighting: 'fireFighting', firefighting: 'fireFighting', bff: 'fireFighting',
};

const K3_STATUS_OF: Record<K3DateKey, K3StatusKey> = {
  wah: 'wahStatus', loto: 'lotoStatus', confinedSpace: 'confinedSpaceStatus', fireFighting: 'fireFightingStatus',
};

const normalizeHeader = (h: unknown) => String(h ?? '').toLowerCase().replace(/[^a-z]/g, '');

function resolveHeaderField(header: unknown): ColumnField | null {
  const h = normalizeHeader(header);
  if (!h) return null;
  if (h.startsWith('status')) return 'status';
  return HEADER_ALIASES[h] ?? null;
}

// rows: array-of-arrays (hasil Papa.parse tanpa header, atau XLSX sheet_to_json { header: 1 })
export function parseTrainingSheet(rows: unknown[][]): ParsedTrainingSheet | null {
  // Cari baris header (baris yang memuat kolom NIK) di 15 baris pertama
  const headerIdx = rows.slice(0, 15).findIndex(r => Array.isArray(r) && r.some(c => normalizeHeader(c) === 'nik'));
  if (headerIdx < 0) return null;

  const header = rows[headerIdx];
  const columns: (ColumnField | null)[] = [];
  let lastK3: K3DateKey | null = null;
  header.forEach((cell, i) => {
    const field = resolveHeaderField(cell);
    if (field === 'status') {
      columns[i] = lastK3 ? K3_STATUS_OF[lastK3] : null;
      return;
    }
    columns[i] = field;
    if (field && field in K3_STATUS_OF) lastK3 = field as K3DateKey;
  });

  const programs: TrainingProgram[] = [];
  if (columns.some(c => c && SAP_TRAININGS.some(t => t.key === c))) programs.push('sap');
  if (columns.some(c => c && K3_TRAININGS.some(t => t.key === c))) programs.push('k3');
  if (programs.length === 0) return null;

  const dateFields = new Set<string>([...SAP_TRAININGS.map(t => t.key), ...K3_TRAININGS.map(t => t.key)]);
  const statusFields = new Set<string>(K3_TRAININGS.map(t => t.statusKey));

  let skipped = 0;
  const records: ParsedTrainingRow[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    if (!Array.isArray(row)) continue;
    const rec: Record<string, unknown> = {};
    columns.forEach((field, i) => {
      if (!field) return;
      const value = row[i];
      if (dateFields.has(field)) rec[field] = normalizeTrainingDate(value);
      else if (statusFields.has(field)) rec[field] = normalizeTrainingStatus(value);
      else if (field === 'no') {
        const n = parseInt(String(value ?? '').trim(), 10);
        rec.no = isNaN(n) ? null : n;
      } else if (field === 'nik') rec.nik = String(value ?? '').trim().toUpperCase();
      else rec[field] = cleanText(value);
    });
    const hasAnyValue = row.some(c => String(c ?? '').trim() && String(c ?? '').trim() !== '`');
    if (!rec.nik || !rec.nama) {
      if (hasAnyValue) skipped++;
      continue;
    }
    if (typeof rec.gol === 'string') rec.gol = rec.gol.toUpperCase();
    // Tanggal ada tapi status kosong/tanggal kosong tapi status '-': biarkan apa adanya
    records.push(rec as unknown as ParsedTrainingRow);
  }
  return { programs, records, skipped };
}
