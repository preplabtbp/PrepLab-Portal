// Parser sheet "Orderan Makanan Karyawan" (CSV / Excel) — dipakai Import di browser & seed di server.
// Layout: baris header 1 (NO, NAMA KARYAWAN, NIK, ..., Pagi / Sahur, Siang, Sore, Takjil, Malam, <Hari>, <Tanggal>, ..., STATUS, ..., Keterangan (Belum Lapor), <catatan>)
//         baris header 2 (Sahur, Tidak Puasa, Kantin, Lapangan, ..., 1 (B.Pagi), 1 (B. Sore))
// Kolom dicari berdasarkan judulnya sehingga urutan kolom boleh sedikit berbeda.

export interface ParsedMealOrderRow {
  sortNo: number;
  nik: string;
  nama: string;
  statusMess: string | null;
  pt: string | null;
  shift: string | null;
  section: string | null;
  statusKerja: string | null;
  sahur: string | null;
  tidakPuasa: string | null;
  tempatTinggal: string | null;
  shiftKerja: string | null;
  pagiKantin: string | null;
  pagiLapangan: string | null;
  sahurKantin: string | null;
  sahurLapangan: string | null;
  siangKantin: string | null;
  siangLapangan: string | null;
  soreKantin: string | null;
  soreLapangan: string | null;
  takjilLapangan: string | null;
  malamLapangan: string | null;
  batchPagi: string | null;
  batchSore: string | null;
  status: string | null;
  keteranganLapor: string | null;
  catatan: string | null;
}

export interface ParsedMealOrderSheet {
  /** Tanggal order yang tertulis di header sheet (YYYY-MM-DD), bila ada */
  date: string | null;
  rows: ParsedMealOrderRow[];
}

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const key = (v: unknown) => norm(v).toLowerCase().replace(/[\s.()/]/g, '');

// Tanggal dari sel header: "2026-10-14 00:00:00", "14/10/2026", serial Excel, atau objek Date
function parseHeaderDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 30000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = norm(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

export function parseMealOrderSheet(table: unknown[][]): ParsedMealOrderSheet | null {
  const h1Index = table.findIndex(r => Array.isArray(r) && r.some(c => key(c).startsWith('namakaryawan')) && r.some(c => key(c) === 'nik'));
  if (h1Index < 0) return null;
  const h1 = (table[h1Index] || []).map(norm);
  const h2 = (table[h1Index + 1] || []).map(norm);
  const width = Math.max(h1.length, h2.length);
  const find = (row: string[], pred: (k: string) => boolean, from = 0) => {
    for (let i = from; i < width; i++) if (pred(key(row[i]))) return i;
    return -1;
  };

  const col = {
    no: find(h1, k => k === 'no'),
    nama: find(h1, k => k.startsWith('namakaryawan')),
    nik: find(h1, k => k === 'nik'),
    statusMess: find(h1, k => k === 'statusmess'),
    pt: find(h1, k => k === 'pt'),
    shift: find(h1, k => k === 'shift'),
    section: find(h1, k => k === 'section'),
    statusKerja: find(h1, k => k.startsWith('statuskerja')),
    sahur: find(h2, k => k === 'sahur'),
    tidakPuasa: find(h2, k => k === 'tidakpuasa'),
    tempatTinggal: find(h1, k => k === 'tempattinggal'),
    shiftKerja: find(h1, k => k.startsWith('shift') && k.includes('siang')),
    pagi: find(h1, k => k.startsWith('pagi')),
    // Grup "Sahur" terpisah (sheet lama memakai "Pagi / Sahur" → masuk Pagi)
    sahurMeal: find(h1, k => k === 'sahur'),
    siang: find(h1, k => k === 'siang'),
    sore: find(h1, k => k === 'sore'),
    takjil: find(h1, k => k === 'takjil'),
    malam: find(h1, k => k === 'malam'),
    batchPagi: find(h2, k => k.includes('bpagi')),
    batchSore: find(h2, k => k.includes('bsore')),
    status: find(h1, k => k === 'status'),
    keteranganLapor: find(h1, k => k.includes('belumlapor')),
  };
  if (col.nama < 0 || col.nik < 0) return null;

  // Tanggal: sel tanggal di atas kolom batch, atau sel header mana pun yang berupa tanggal
  let date: string | null = null;
  for (const c of [col.batchSore, col.batchPagi + 1, col.batchPagi]) {
    if (c >= 0 && !date) date = parseHeaderDate((table[h1Index] || [])[c]);
  }
  if (!date) for (const c of (table[h1Index] || [])) { date = parseHeaderDate(c); if (date) break; }

  const rows: ParsedMealOrderRow[] = [];
  const seen = new Set<string>();
  for (let i = h1Index + 2; i < table.length; i++) {
    const r = table[i] || [];
    const cell = (c: number) => { if (c < 0) return null; const v = norm(r[c]); return v ? v : null; };
    const nama = cell(col.nama);
    const nik = (cell(col.nik) || '').toUpperCase();
    // Baris legenda/total di bawah tabel tidak punya NIK → dilewati
    if (!nama || !nik || seen.has(nik)) continue;
    seen.add(nik);
    rows.push({
      sortNo: rows.length + 1,
      nik,
      nama,
      statusMess: cell(col.statusMess),
      pt: cell(col.pt),
      shift: cell(col.shift),
      section: cell(col.section),
      statusKerja: cell(col.statusKerja),
      sahur: cell(col.sahur),
      tidakPuasa: cell(col.tidakPuasa),
      tempatTinggal: cell(col.tempatTinggal),
      shiftKerja: cell(col.shiftKerja),
      pagiKantin: cell(col.pagi),
      pagiLapangan: cell(col.pagi >= 0 ? col.pagi + 1 : -1),
      sahurKantin: cell(col.sahurMeal),
      sahurLapangan: cell(col.sahurMeal >= 0 ? col.sahurMeal + 1 : -1),
      siangKantin: cell(col.siang),
      siangLapangan: cell(col.siang >= 0 ? col.siang + 1 : -1),
      soreKantin: cell(col.sore),
      soreLapangan: cell(col.sore >= 0 ? col.sore + 1 : -1),
      takjilLapangan: cell(col.takjil),
      malamLapangan: cell(col.malam),
      batchPagi: cell(col.batchPagi),
      batchSore: cell(col.batchSore),
      status: cell(col.status),
      keteranganLapor: cell(col.keteranganLapor),
      catatan: cell(col.keteranganLapor >= 0 ? col.keteranganLapor + 1 : -1),
    });
  }
  return { date, rows };
}
