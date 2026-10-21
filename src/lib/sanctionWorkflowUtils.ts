/**
 * Utility functions for Handling Disciplinary Sanction & Counseling Workflows
 * Sesuai aturan:
 * 1. Masa berlaku Konseling (I, II, III) = 3 Bulan dari tanggal pelaksanaan
 * 2. Masa berlaku Surat Teguran (ST) = 3 Bulan dari tanggal penerbitan
 * 3. Masa berlaku Surat Peringatan (SP 1, SP 2, SP 3, SPPT) = 6 Bulan dari tanggal penerbitan
 * 4. Jika tahap sebelumnya masih AKTIF: dituntun ke tahap berikutnya (I -> II -> III, atau ST -> SP 1 -> SP 2 -> SP 3 -> SPPT)
 * 5. Jika tahap sebelumnya sudah TIDAK AKTIF / kadaluarsa: siklus kembali lagi ke form awal (Konseling I atau ST)
 */

export const SANCTION_MONTH_MAP: Record<string, number> = {
  jan: 0, januari: 0, january: 0,
  feb: 1, februari: 1, february: 1,
  mar: 2, maret: 2, march: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  agu: 7, ags: 7, agustus: 7, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oct: 9, oktober: 9, october: 9,
  nov: 10, november: 10,
  des: 11, desember: 11, dec: 11, december: 11
};

export const INDO_MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export const INDO_MONTH_NAMES_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Parsing satu token string menjadi Date object
 */
export function parseSingleSanctionDate(val?: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  const str = String(val).trim();
  if (!str || str === '-' || str === '#N/A' || str === '0' || /^\d{1,2}$/.test(str) || /^(ya|tidak|ok|v|x|true|false)$/i.test(str)) return null;

  // DD-Mmm-YYYY atau DD Mmm YYYY (contoh: 21-Mei-2025, 06-Jul-2026, 15-Feb-2026, 20-Oct-2026)
  const dMmmY = str.match(/(\d{1,2})[-\s/]([a-zA-Z]+)[-\s/](\d{2,4})/);
  if (dMmmY) {
    const day = parseInt(dMmmY[1], 10);
    const mStr = dMmmY[2].toLowerCase();
    let year = parseInt(dMmmY[3], 10);
    if (year < 100) year += 2000;
    const month = SANCTION_MONTH_MAP[mStr];
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  // YYYY-MM-DD
  const ymd = str.match(/(\d{4})[-\s/](\d{1,2})[-\s/](\d{1,2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    return new Date(year, month, day);
  }

  // DD-MM-YYYY atau DD/MM/YYYY
  const dmy = str.match(/(\d{1,2})[-\s/](\d{1,2})[-\s/](\d{2,4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  // Fallback native Date
  if (/\d{4}/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Ekstrak semua string tanggal yang valid dari suatu teks,
 * dipisahkan secara rapi dan diurutkan secara kronologis (terlama ke terbaru).
 * Mendukung format tanggal yang dipisahkan spasi, newline, koma, titik koma.
 * Contoh input: "21-Mei-2025 10-Des-2025 06-Jul-2026 20-Oct-2026"
 * Contoh output: ['21-Mei-2025', '10-Des-2025', '06-Jul-2026', '20-Oct-2026']
 */
export function extractSanctionDateStrings(val?: any): string[] {
  if (!val) return [];
  const str = String(val).trim();
  if (!str || str === '-' || str === '0' || str === '#N/A' || /^(ya|tidak|ok|v|x|true|false)$/i.test(str)) return [];

  // Match semua kemungkinan token tanggal
  const matches = str.match(/\b(?:\d{1,2}[-\s/][a-zA-Z]+[-\s/]\d{2,4}|\d{4}[-\s/]\d{1,2}[-\s/]\d{1,2}|\d{1,2}[-\s/]\d{1,2}[-\s/]\d{2,4})\b/g);
  if (matches && matches.length > 0) {
    const parsed = matches.map(s => ({ raw: s.trim(), date: parseSingleSanctionDate(s.trim()) }));
    parsed.sort((a, b) => {
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date.getTime() - b.date.getTime();
    });
    return parsed.map(p => p.raw);
  }

  // Fallback pemisahan standar jika format lain
  return str.split(/[\r\n,;]+|\s+/).map(s => s.trim()).filter(s => s && s !== '-' && s !== '0' && s !== '#N/A');
}

/**
 * Ekstrak semua tanggal yang valid dari suatu field teks (Date object[])
 */
export function extractSanctionDates(val?: any): Date[] {
  const dateStrings = extractSanctionDateStrings(val);
  const dates: Date[] = [];
  for (const s of dateStrings) {
    const d = parseSingleSanctionDate(s);
    if (d && !isNaN(d.getTime())) {
      dates.push(d);
    }
  }
  return dates;
}

/**
 * Mengambil tanggal terbaru (terakhir) dari suatu field
 */
export function getLatestSanctionDate(val?: any): Date | null {
  const dates = extractSanctionDates(val);
  if (dates.length === 0) return null;
  return dates[dates.length - 1];
}

/**
 * Tambah bulan dengan aman (clamped ke hari terakhir bulan tujuan)
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth() + months;
  const result = new Date(targetYear, targetMonth, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Format tanggal standar Indonesia: DD-Mmm-YYYY (contoh: 21-Okt-2026)
 */
export function formatSanctionDateId(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = INDO_MONTH_NAMES_SHORT[date.getMonth()] || 'Jan';
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format bulan dan tahun Indonesia: Bulan YYYY (contoh: Oktober 2026)
 */
export function formatBulanTahunId(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return '';
  const month = INDO_MONTH_NAMES_FULL[date.getMonth()] || '';
  const year = date.getFullYear();
  return `${month} ${year}`.trim();
}

export interface SanctionStatusInfo {
  latestDate: Date | null;
  expiryDate: Date | null;
  isActive: boolean;
  daysLeft: number;
  formattedLatest: string;
  formattedExpiry: string;
  count: number;
}

/**
 * Periksa status keaktifan sanksi / konseling berdasarkan tanggal terakhir dan durasi bulan
 */
export function checkSanctionActiveStatus(
  val?: any,
  validityMonths: number = 3,
  refDate: Date = new Date()
): SanctionStatusInfo {
  const latestDate = getLatestSanctionDate(val);
  const dates = extractSanctionDates(val);

  if (!latestDate) {
    return {
      latestDate: null,
      expiryDate: null,
      isActive: false,
      daysLeft: 0,
      formattedLatest: '-',
      formattedExpiry: '-',
      count: 0
    };
  }

  const expiryDate = addMonthsClamped(latestDate, validityMonths);
  const nowTime = refDate.getTime();
  const expiryTime = expiryDate.getTime();
  const isActive = nowTime <= expiryTime;
  const daysLeft = Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24));

  return {
    latestDate,
    expiryDate,
    isActive,
    daysLeft: Math.max(0, daysLeft),
    formattedLatest: formatSanctionDateId(latestDate),
    formattedExpiry: formatSanctionDateId(expiryDate),
    count: dates.length
  };
}

export interface NextCounselingStep {
  targetLevel: 'Konseling I' | 'Konseling II' | 'Konseling III';
  targetField: 'konseling1' | 'konseling2' | 'konseling3';
  reason: string;
  isProgression: boolean;
  activeLevelName?: string;
  activeExpiryFormatted?: string;
  k1Status: SanctionStatusInfo;
  k2Status: SanctionStatusInfo;
  k3Status: SanctionStatusInfo;
}

/**
 * Menentukan langkah konseling berikutnya:
 * - Konseling berlaku 3 bulan.
 * - Jika Konseling 2 aktif -> Ke Konseling 3
 * - Jika Konseling 1 aktif -> Ke Konseling 2
 * - Jika tidak ada yang aktif (atau 1-3 sudah expired > 3 bulan) -> Kembali ke Konseling 1
 */
export function determineNextCounselingStep(
  counselData: { konseling1?: string; konseling2?: string; konseling3?: string },
  refDate: Date = new Date()
): NextCounselingStep {
  const k1Status = checkSanctionActiveStatus(counselData.konseling1, 3, refDate);
  const k2Status = checkSanctionActiveStatus(counselData.konseling2, 3, refDate);
  const k3Status = checkSanctionActiveStatus(counselData.konseling3, 3, refDate);

  if (k2Status.isActive) {
    return {
      targetLevel: 'Konseling III',
      targetField: 'konseling3',
      reason: `Konseling II masih AKTIF (berlaku s/d ${k2Status.formattedExpiry}). Dituntun ke Konseling III.`,
      isProgression: true,
      activeLevelName: 'Konseling II',
      activeExpiryFormatted: k2Status.formattedExpiry,
      k1Status,
      k2Status,
      k3Status
    };
  }

  if (k1Status.isActive) {
    return {
      targetLevel: 'Konseling II',
      targetField: 'konseling2',
      reason: `Konseling I masih AKTIF (berlaku s/d ${k1Status.formattedExpiry}). Dituntun ke Konseling II.`,
      isProgression: true,
      activeLevelName: 'Konseling I',
      activeExpiryFormatted: k1Status.formattedExpiry,
      k1Status,
      k2Status,
      k3Status
    };
  }

  // Jika semua konseling tidak aktif atau belum ada
  const hadPrevious = Boolean(k1Status.latestDate || k2Status.latestDate || k3Status.latestDate);
  return {
    targetLevel: 'Konseling I',
    targetField: 'konseling1',
    reason: hadPrevious
      ? 'Masa berlaku konseling sebelumnya sudah TIDAK AKTIF / selesai. Membuka siklus pembinaan baru: Konseling I.'
      : 'Belum ada konseling aktif. Membuka form pembinaan awal: Konseling I.',
    isProgression: false,
    k1Status,
    k2Status,
    k3Status
  };
}

export type SanctionLevelKey = 'st' | 'sp1' | 'sp2' | 'sp3' | 'sppt';

export interface NextSanctionStep {
  targetLevel: string;
  targetField: SanctionLevelKey;
  targetStatus: string;
  validityMonths: number;
  reason: string;
  isProgression: boolean;
  activeLevelName?: string;
  activeExpiryFormatted?: string;
  stStatus: SanctionStatusInfo;
  sp1Status: SanctionStatusInfo;
  sp2Status: SanctionStatusInfo;
  sp3Status: SanctionStatusInfo;
  spptStatus: SanctionStatusInfo;
}

/**
 * Menentukan langkah penerbitan Surat Peringatan & Sanksi berikutnya:
 * - ST berlaku 3 Bulan
 * - SP 1, SP 2, SP 3, SPPT berlaku 6 Bulan
 * - Jika SP 3 aktif -> Ke SPPT
 * - Jika SP 2 aktif -> Ke SP 3
 * - Jika SP 1 aktif -> Ke SP 2
 * - Jika ST aktif -> Ke SP 1
 * - Jika tidak ada sanksi aktif (sudah kadaluarsa / pemutihan / belum ada) -> Kembali ke ST
 */
export function determineNextSanctionStep(
  counselData: { st?: string; sp1?: string; sp2?: string; sp3?: string; sppt?: string },
  refDate: Date = new Date()
): NextSanctionStep {
  const stStatus = checkSanctionActiveStatus(counselData.st, 3, refDate);
  const sp1Status = checkSanctionActiveStatus(counselData.sp1, 6, refDate);
  const sp2Status = checkSanctionActiveStatus(counselData.sp2, 6, refDate);
  const sp3Status = checkSanctionActiveStatus(counselData.sp3, 6, refDate);
  const spptStatus = checkSanctionActiveStatus(counselData.sppt, 6, refDate);

  if (sp3Status.isActive) {
    return {
      targetLevel: 'SPPT (SP Terakhir)',
      targetField: 'sppt',
      targetStatus: 'SPPT',
      validityMonths: 6,
      reason: `SP III masih AKTIF (berlaku s/d ${sp3Status.formattedExpiry}, 6 Bulan). Dituntun ke tingkat SPPT.`,
      isProgression: true,
      activeLevelName: 'SP III',
      activeExpiryFormatted: sp3Status.formattedExpiry,
      stStatus, sp1Status, sp2Status, sp3Status, spptStatus
    };
  }

  if (sp2Status.isActive) {
    return {
      targetLevel: 'SP III (Peringatan 3)',
      targetField: 'sp3',
      targetStatus: 'SP III',
      validityMonths: 6,
      reason: `SP II masih AKTIF (berlaku s/d ${sp2Status.formattedExpiry}, 6 Bulan). Dituntun ke tingkat SP III.`,
      isProgression: true,
      activeLevelName: 'SP II',
      activeExpiryFormatted: sp2Status.formattedExpiry,
      stStatus, sp1Status, sp2Status, sp3Status, spptStatus
    };
  }

  if (sp1Status.isActive) {
    return {
      targetLevel: 'SP II (Peringatan 2)',
      targetField: 'sp2',
      targetStatus: 'SP II',
      validityMonths: 6,
      reason: `SP I masih AKTIF (berlaku s/d ${sp1Status.formattedExpiry}, 6 Bulan). Dituntun ke tingkat SP II.`,
      isProgression: true,
      activeLevelName: 'SP I',
      activeExpiryFormatted: sp1Status.formattedExpiry,
      stStatus, sp1Status, sp2Status, sp3Status, spptStatus
    };
  }

  if (stStatus.isActive) {
    return {
      targetLevel: 'SP I (Peringatan 1)',
      targetField: 'sp1',
      targetStatus: 'SP I',
      validityMonths: 6,
      reason: `Surat Teguran (ST) masih AKTIF (berlaku s/d ${stStatus.formattedExpiry}, 3 Bulan). Dituntun ke tingkat SP I.`,
      isProgression: true,
      activeLevelName: 'Surat Teguran (ST)',
      activeExpiryFormatted: stStatus.formattedExpiry,
      stStatus, sp1Status, sp2Status, sp3Status, spptStatus
    };
  }

  // Jika semua sanksi sudah selesai / expired atau belum ada
  const hadPrevious = Boolean(
    stStatus.latestDate || sp1Status.latestDate || sp2Status.latestDate ||
    sp3Status.latestDate || spptStatus.latestDate
  );

  return {
    targetLevel: 'Surat Teguran (ST)',
    targetField: 'st',
    targetStatus: 'Surat Teguran (ST)',
    validityMonths: 3,
    reason: hadPrevious
      ? 'Sanksi sebelumnya sudah TIDAK AKTIF / masa berlaku selesai. Membuka sanksi awal baru: Surat Teguran (ST).'
      : 'Belum ada sanksi aktif. Membuka sanksi awal baru: Surat Teguran (ST).',
    isProgression: false,
    stStatus, sp1Status, sp2Status, sp3Status, spptStatus
  };
}

/**
 * Menggabungkan tanggal baru ke string tanggal sanksi/konseling yang sudah ada
 */
export function appendDateToField(existingValue: string | undefined, newDateStr: string): string {
  const cleanNew = newDateStr.trim();
  if (!cleanNew) return existingValue || '';
  const cleanOld = (existingValue || '').trim();
  if (!cleanOld || cleanOld === '-' || cleanOld === '0') {
    return cleanNew;
  }
  // Hindari duplikasi tanggal yang sama persis
  if (cleanOld.includes(cleanNew)) {
    return cleanOld;
  }
  return `${cleanOld} ${cleanNew}`;
}
