// Logika sinkronisasi Orderan Makanan dengan data Roster & Cuti
// Sesuai aturan operasional PrepLab:
// Mess CR (Gol II-V) vs Mess NR (Gol I-V, Nirwana / Non-Nirwana)

export interface RosterMealCalculation {
  statusKerja: string | null;
  shiftKerja: string | null;
  pagiKantin: string | null;
  pagiLapangan: string | null;
  sahurKantin?: string | null;
  sahurLapangan?: string | null;
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

/**
 * Format tanggal YYYY-MM-DD ke berbagai kemungkinan format di tabel roster:
 * contoh: '2026-10-14' -> ['2026-10-14', '14 Oct 26', '14 Okt 26', '14 Oct 2026', '14 Okt 2026']
 */
export function getPossibleRosterDateStrings(ymdDate: string): string[] {
  if (!ymdDate || !/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) return [ymdDate];
  const [y, m, d] = ymdDate.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayNum = dateObj.getUTCDate();
  const year2 = String(dateObj.getUTCFullYear()).slice(2);
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthIdx = dateObj.getUTCMonth();

  const results = [
    ymdDate,
    `${dayNum} ${enMonths[monthIdx]} ${year2}`,
    `${dayNum} ${idMonths[monthIdx]} ${year2}`,
    `${dayNum} ${enMonths[monthIdx]} ${dateObj.getUTCFullYear()}`,
    `${dayNum} ${idMonths[monthIdx]} ${dateObj.getUTCFullYear()}`,
  ];
  return Array.from(new Set(results));
}

/**
 * Cek apakah hari adalah Selasa (2), Rabu (3), atau Sabtu (6)
 */
export function isTuesdayWednesdaySaturday(ymdDate: string): boolean {
  if (!ymdDate) return false;
  const [y, m, d] = ymdDate.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const day = dateObj.getUTCDay(); // 0=Min, 1=Sen, 2=Sel, 3=Rab, 4=Kam, 5=Jum, 6=Sab
  return day === 2 || day === 3 || day === 6;
}

/**
 * Dapatkan tanggal sebelumnya dalam format YYYY-MM-DD
 */
export function getPreviousDateString(ymdDate: string): string {
  if (!ymdDate || !/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) return ymdDate;
  const [y, m, d] = ymdDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Cek apakah status roster/kerja tanggal sebelumnya adalah Cuti, Travel, atau Izin:
 * C, CE, CT, CS, TRV, I (beserta variasi Cuti / Izin / Travel)
 */
export function isLeaveOrPermissionRosterStatus(val: string | null | undefined): boolean {
  if (!val) return false;
  const s = val.trim().toUpperCase();
  if (['C', 'CE', 'CT', 'CS', 'TRV', 'I', 'CI', 'TV', 'XP', 'CUTI', 'IZIN', 'TRAVEL', 'BELUM LAPOR'].includes(s)) return true;
  if (s.startsWith('CUTI') || s.startsWith('IZIN') || s.startsWith('BELUM LAPOR') || s.includes('BELUM LAPOR')) return true;
  const prefixes = ['CE', 'CT', 'CS', 'TRV', 'CI', 'TV', 'XP', 'C', 'I'];
  return prefixes.some(p => s === p || s.startsWith(p + ' ') || s.startsWith(p + '-') || s.startsWith(p + '(') || s.startsWith(p + '/'));
}

/**
 * Cek apakah keterangan/status roster tanggal saat ini adalah kerja atau off:
 * D, N, LS, Atau OFF
 */
export function isWorkOrOffRosterStatus(val: string | null | undefined): boolean {
  if (!val) return false;
  const s = val.trim().toUpperCase();
  if (['D', 'N', 'LS', 'OFF'].includes(s)) return true;
  if (s === 'DS' || s === 'DAY' || s.startsWith('D ') || s.startsWith('D-') || s.startsWith('D(')) return true;
  if (s === 'NS' || s === 'NIGHT' || s.startsWith('N ') || s.startsWith('N-') || s.startsWith('N(')) return true;
  if (s === 'LONGSHIFT' || s.startsWith('LS ') || s.startsWith('LS-') || s.startsWith('LS(')) return true;
  if (s.startsWith('OFF ') || s.startsWith('OFF-') || s.startsWith('OFF(')) return true;
  return false;
}

export interface EmployeeProfileLike {
  nik?: string | null;
  name?: string | null;
  statusMess?: string | null;
  gol?: string | null;
  shift?: string | null;
  tempatTinggal?: string | null;
  alamatDomisili?: string | null;
  section?: string | null;
  status?: string | null; // status/keterangan roster (mis. "Belum Lapor")
  keteranganLapor?: string | null; // status keterangan Belum Lapor
}

// Pilihan Pagi/Sore di kolom Catatan (Mess CR + Nirwana) — disimpan & dipakai terus di tanggal berikutnya
export type MealChoice = 'kantin' | 'lapangan';
export interface MealPreference { pagi?: MealChoice | null; sore?: MealChoice | null }

export type CatatanOption = '-' | 'Bungkusan Pagi' | 'Bungkusan Sore' | 'Bungkusan Pagi dan Bungkusan Sore';

export function getCatatanString(pref: MealPreference): string | null {
  const p = pref.pagi === 'lapangan';
  const s = pref.sore === 'lapangan';
  if (p && s) return 'Bungkusan Pagi dan Bungkusan Sore';
  if (p) return 'Bungkusan Pagi';
  if (s) return 'Bungkusan Sore';
  return null;
}

export function parseCatatanToPreference(catatan: string | null | undefined): MealPreference {
  const c = String(catatan || '').trim().toLowerCase();
  if (c.includes('pagi') && c.includes('sore')) {
    return { pagi: 'lapangan', sore: 'lapangan' };
  }
  if (c.includes('pagi')) {
    return { pagi: 'lapangan', sore: 'kantin' };
  }
  if (c.includes('sore')) {
    return { pagi: 'kantin', sore: 'lapangan' };
  }
  return { pagi: 'kantin', sore: 'kantin' };
}

/** Cek apakah catatan bungkusan pagi/sore dinonaktifkan (Belum Lapor, Kampung Kawasi, Cuti, Cuti Site, Izin, Off, Sakit, Malam) */
export function isCatatanDisabledForEmployee(emp: {
  tempatTinggal?: string | null;
  alamatDomisili?: string | null;
  shiftKerja?: string | null;
  statusKerja?: string | null;
  status?: string | null;
  keteranganLapor?: string | null;
}): boolean {
  if (emp.keteranganLapor === 'Belum Lapor') return true;
  const tt = `${emp.tempatTinggal || ''} ${emp.alamatDomisili || ''}`.toLowerCase();
  if (tt.includes('kawasi')) return true;
  const sk = String(emp.shiftKerja || emp.statusKerja || emp.status || '').trim().toUpperCase();
  if (['CUTI', 'CS', 'IZIN', 'OFF', 'SAKIT', 'MALAM'].includes(sk)) return true;
  if (sk.startsWith('CUTI') || sk.startsWith('CS') || sk.startsWith('IZIN') || sk.startsWith('OFF') || sk.startsWith('SAKIT') || sk.startsWith('MALAM')) return true;
  return false;
}

/** Karyawan yang punya pilihan Pagi/Sore di kolom Catatan: Mess CR atau tempat tinggal Nirwana */
export function isMealChoiceEmployee(emp: { statusMess?: string | null; tempatTinggal?: string | null; alamatDomisili?: string | null }): boolean {
  const tt = `${emp.tempatTinggal || ''} ${emp.alamatDomisili || ''}`.toLowerCase();
  if (tt.includes('kawasi')) return false;
  const sm = String(emp.statusMess || '').trim().toUpperCase();
  return sm === 'CR' || sm === 'MESS' || tt.includes('nirwana');
}

/**
 * Isi sel satu waktu makan sesuai pilihan. Kantin = "K" (Mess CR) atau 1 Bungkusan Kantin + batch 1 (NR Nirwana);
 * Lapangan/Bungkusan = 1 di kolom Lapangan.
 */
export function mealChoicePatch(
  emp: { statusMess?: string | null; tempatTinggal?: string | null; alamatDomisili?: string | null },
  time: 'pagi' | 'sore',
  choice: MealChoice,
): Partial<Record<'pagiKantin' | 'pagiLapangan' | 'soreKantin' | 'soreLapangan' | 'batchPagi' | 'batchSore', string | null>> {
  const sm = String(emp.statusMess || '').trim().toUpperCase();
  const isNRNirwana = sm === 'NR' && `${emp.tempatTinggal || ''} ${emp.alamatDomisili || ''}`.toLowerCase().includes('nirwana');
  const [k, l, b] = time === 'pagi' ? ['pagiKantin', 'pagiLapangan', 'batchPagi'] as const : ['soreKantin', 'soreLapangan', 'batchSore'] as const;
  return choice === 'kantin'
    ? { [k]: isNRNirwana ? '1' : 'K', [l]: null, [b]: isNRNirwana ? '1' : null }
    : { [k]: null, [l]: '1', [b]: null };
}

/**
 * Menghitung order makanan karyawan berdasarkan status roster dan profil mess / tempat tinggal
 * Persis sesuai tabel acuan operasional PrepLab (CSV Orderan Makanan).
 */
export function computeMealOrderByRoster(
  emp: EmployeeProfileLike,
  rosterStatus: string | null | undefined,
  orderDate: string,
  pref: MealPreference = {},
  prevRosterStatus?: string | null
): RosterMealCalculation {
  const rawCode = String(rosterStatus || '').trim().toUpperCase();
  const sm = String(emp.statusMess || '').trim().toUpperCase();
  const isCR = sm === 'CR' || sm === 'MESS';
  
  const tt = `${emp.tempatTinggal || ''} ${emp.alamatDomisili || ''}`.toLowerCase();
  const isKawasi = tt.includes('kawasi');
  const isNirwana = tt.includes('nirwana') || (!isKawasi && isCR);

  const empShift = String(emp.shift || '').toLowerCase();
  const defaultDayShiftKerja = empShift.includes('nonshift') ? 'Nonshift' : 'Siang';

  const hasBelumLapor = /belum\s*lapor|\bBL\b/i.test(rawCode) || /belum\s*lapor/i.test(String(emp.status || ''));
  const cleanCode = rawCode.replace(/belum\s*lapor|\bBL\b/gi, '').trim().toUpperCase();

  // Normalisasi kode roster sesuai acuan CSV:
  // D, N, LS, C/CE/CI/CT/TRV, CS, I, OFF, SS, SL
  let code = cleanCode;
  if (
    ['C', 'CE', 'CT', 'CI', 'TRV', 'TV', 'XP'].includes(cleanCode) ||
    cleanCode.startsWith('CT') ||
    cleanCode.startsWith('CI') ||
    cleanCode.startsWith('CE') ||
    cleanCode.startsWith('TRV') ||
    cleanCode.startsWith('CUTI') ||
    (cleanCode.includes('/') && /^(C|CE|CI|CT|TRV)/i.test(cleanCode))
  ) {
    code = 'CUTI';
  } else if (cleanCode === 'CS' || cleanCode.startsWith('CS') || cleanCode.startsWith('CUTI SITE') || cleanCode === 'CUTISITE') {
    code = 'CS';
  } else if (cleanCode === 'I' || cleanCode.startsWith('I ') || cleanCode.startsWith('I-') || cleanCode.startsWith('IZIN') || cleanCode === 'IZN') {
    code = 'I';
  } else if (cleanCode === 'OFF' || cleanCode.startsWith('OFF')) {
    code = 'OFF';
  } else if (['SS', 'SL', 'S'].includes(cleanCode) || cleanCode.startsWith('SAKIT') || cleanCode.startsWith('SS') || cleanCode.startsWith('SL')) {
    code = 'SAKIT';
  } else if (['D', 'DS', 'DAY'].includes(cleanCode) || cleanCode.startsWith('D ') || cleanCode.startsWith('D-') || cleanCode.startsWith('D(')) {
    code = 'D';
  } else if (['N', 'NS', 'NIGHT'].includes(cleanCode) || cleanCode.startsWith('N ') || cleanCode.startsWith('N-') || cleanCode.startsWith('N(')) {
    code = 'N';
  } else if (['LS', 'LONGSHIFT'].includes(cleanCode) || cleanCode.startsWith('LS ') || cleanCode.startsWith('LS-') || cleanCode.startsWith('LS(')) {
    code = 'LS';
  }

  // Inisialisasi kosong
  const res: RosterMealCalculation = {
    statusKerja: '-',
    shiftKerja: null,
    pagiKantin: null,
    pagiLapangan: null,
    siangKantin: null,
    siangLapangan: null,
    soreKantin: null,
    soreLapangan: null,
    takjilLapangan: null,
    malamLapangan: null,
    batchPagi: null,
    batchSore: null,
    status: null,
    keteranganLapor: null,
    catatan: null,
  };

  // 1. KELOMPOK: KAMPUNG KAWASI (Catatan selalu mati / tidak bisa dipilih)
  if (isKawasi) {
    if (code === 'D') {
      res.shiftKerja = defaultDayShiftKerja;
      res.siangLapangan = '1';
    } else if (code === 'N') {
      res.shiftKerja = 'Malam';
      res.malamLapangan = '1';
    } else if (code === 'LS') {
      res.shiftKerja = 'Longshift';
      res.siangLapangan = '1';
      res.soreLapangan = '1';
      res.malamLapangan = '1';
    } else if (code === 'CUTI') {
      res.shiftKerja = 'CUTI';
      res.statusKerja = 'Cuti';
      res.status = 'CUTI';
    } else if (code === 'CS') {
      res.shiftKerja = 'Cuti Site';
      res.statusKerja = 'CS';
      res.status = 'CS';
    } else if (code === 'I') {
      res.shiftKerja = 'Izin';
      res.statusKerja = 'Izin';
      res.status = 'IZIN';
    } else if (code === 'OFF') {
      res.shiftKerja = 'Off';
      res.statusKerja = 'Off';
      res.status = 'OFF';
    } else if (code === 'SAKIT') {
      res.shiftKerja = 'Sakit';
      res.statusKerja = 'Sakit';
      res.status = 'SAKIT';
    } else {
      res.shiftKerja = defaultDayShiftKerja;
      res.siangLapangan = '1';
    }
    // Kampung kawasi: catatan selalu '-' dan tidak bisa dipilih
    res.catatan = null;
  }
  // 2. KELOMPOK: CR, NIRWANA
  else if (isCR) {
    const isTueWedSat = isTuesdayWednesdaySaturday(orderDate);
    if (code === 'D') {
      res.shiftKerja = defaultDayShiftKerja;
      res.siangLapangan = '1';
      // Pagi
      if (pref.pagi === 'lapangan') {
        res.pagiLapangan = '1';
      } else {
        res.pagiKantin = 'K';
      }
      // Sore: Hari Selasa, Rabu, dan Sabtu: Karyawan Mess CR wajib Kantin (tidak ada Bungkusan Sore)
      if (isTueWedSat) {
        res.soreKantin = 'K';
        res.soreLapangan = null;
        res.batchSore = null;
      } else if (pref.sore === 'lapangan') {
        res.soreLapangan = '1';
      } else {
        res.soreKantin = 'K';
      }
      res.catatan = isTueWedSat
        ? (pref.pagi === 'lapangan' ? 'Bungkusan Pagi' : null)
        : getCatatanString(pref);
    } else if (code === 'N') {
      res.shiftKerja = 'Malam';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
      res.malamLapangan = '1';
      res.catatan = null;
    } else if (code === 'LS') {
      res.shiftKerja = 'Longshift';
      res.siangLapangan = '1';
      if (isTueWedSat) {
        res.soreKantin = 'K';
        res.soreLapangan = null;
        res.batchSore = null;
      } else {
        res.soreLapangan = '1';
      }
      res.malamLapangan = '1';
      // Pagi
      if (pref.pagi === 'lapangan') {
        res.pagiLapangan = '1';
      } else {
        res.pagiKantin = 'K';
      }
      res.catatan = isTueWedSat
        ? (pref.pagi === 'lapangan' ? 'Bungkusan Pagi' : null)
        : getCatatanString(pref);
    } else if (code === 'CUTI') {
      res.shiftKerja = 'CUTI';
      res.statusKerja = 'Cuti';
      res.status = 'CUTI';
      res.catatan = null;
    } else if (code === 'CS') {
      res.shiftKerja = 'Cuti Site';
      res.statusKerja = 'CS';
      res.status = 'CS';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
      res.catatan = null;
    } else if (code === 'I') {
      res.shiftKerja = 'Izin';
      res.statusKerja = 'Izin';
      res.status = 'IZIN';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
      res.catatan = null;
    } else if (code === 'OFF') {
      res.shiftKerja = 'Off';
      res.statusKerja = 'Off';
      res.status = 'OFF';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
      res.catatan = null;
    } else if (code === 'SAKIT') {
      res.shiftKerja = 'Sakit';
      res.statusKerja = 'Sakit';
      res.status = 'SAKIT';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
      res.catatan = null;
    } else {
      res.shiftKerja = defaultDayShiftKerja;
      res.pagiKantin = 'K';
      res.siangLapangan = '1';
      res.soreKantin = 'K';
    }
  }
  // 3. KELOMPOK: NR, NIRWANA
  else {
    if (code === 'D') {
      res.shiftKerja = defaultDayShiftKerja;
      res.pagiKantin = '1';
      res.batchPagi = '1';
      res.siangLapangan = '1';
      res.soreKantin = '1';
      res.batchSore = '1';
      res.catatan = getCatatanString(pref);
    } else if (code === 'N') {
      res.shiftKerja = 'Malam';
      res.pagiKantin = '1';
      res.batchPagi = '1';
      res.siangKantin = '1';
      res.soreKantin = '1';
      res.batchSore = '1';
      res.malamLapangan = '1';
      res.catatan = null;
    } else if (code === 'LS') {
      res.shiftKerja = 'Longshift';
      res.pagiKantin = '1';
      res.batchPagi = '1';
      res.siangLapangan = '1';
      res.soreLapangan = '1';
      res.malamLapangan = '1';
      res.catatan = getCatatanString(pref);
    } else if (code === 'CUTI') {
      res.shiftKerja = 'CUTI';
      res.statusKerja = 'Cuti';
      res.status = 'CUTI';
      res.catatan = null;
    } else if (code === 'CS') {
      res.shiftKerja = 'Cuti Site';
      res.statusKerja = 'CS';
      res.status = 'CS';
      res.pagiKantin = '1';
      res.batchPagi = '1';
      res.siangKantin = '1';
      res.soreKantin = '1';
      res.batchSore = '1';
      res.catatan = null;
    } else if (code === 'I') {
      res.shiftKerja = 'Izin';
      res.statusKerja = 'Izin';
      res.status = 'IZIN';
      res.pagiKantin = '1';
      res.batchPagi = '1';
      res.siangKantin = '1';
      res.soreKantin = '1';
      res.batchSore = '1';
      res.catatan = null;
    } else if (code === 'OFF') {
      res.shiftKerja = 'Off';
      res.statusKerja = 'Off';
      res.status = 'OFF';
      res.pagiKantin = '1';
      res.batchPagi = '1';
      res.siangKantin = '1';
      res.soreKantin = '1';
      res.batchSore = '1';
      res.catatan = null;
    } else if (code === 'SAKIT') {
      res.shiftKerja = 'Sakit';
      res.statusKerja = 'Sakit';
      res.status = 'SAKIT';
      res.pagiKantin = '1';
      res.batchPagi = '1';
      res.siangKantin = '1';
      res.soreKantin = '1';
      res.batchSore = '1';
      res.catatan = null;
    } else {
      res.shiftKerja = defaultDayShiftKerja;
      res.pagiKantin = '1';
      res.batchPagi = '1';
      res.siangLapangan = '1';
      res.soreKantin = '1';
      res.batchSore = '1';
    }
  }

  // Jika karyawan termasuk yang dinonaktifkan catatannya (Kampung Kawasi, Cuti, Cuti Site, Izin, Off, Sakit, Malam)
  if (isCatatanDisabledForEmployee({ tempatTinggal: emp.tempatTinggal, alamatDomisili: emp.alamatDomisili, shiftKerja: res.shiftKerja, statusKerja: res.statusKerja, status: res.status })) {
    res.catatan = null;
  }

  // Aturan Khusus: Hari Selasa, Rabu, dan Sabtu untuk Karyawan Status Mess CR (Gol II-V):
  // Tidak ada yang Bungkusan Sore, semua kantin dan tidak bisa diganti!
  if (isCR && isTuesdayWednesdaySaturday(orderDate)) {
    const sk = String(res.shiftKerja || res.statusKerja || res.status || '').trim().toUpperCase();
    const isAbsent = ['CUTI', 'CS', 'IZIN', 'OFF', 'SAKIT', 'MALAM'].includes(sk);
    if (!isAbsent && res.keteranganLapor !== 'Belum Lapor') {
      res.soreKantin = 'K';
      res.soreLapangan = null;
      res.batchSore = null;
    }
    if (res.catatan === 'Bungkusan Sore') {
      res.catatan = null;
    } else if (res.catatan === 'Bungkusan Pagi dan Bungkusan Sore') {
      res.catatan = 'Bungkusan Pagi';
    }
  }

  // Aturan status Belum Lapor:
  // 1. Jika Tanggal sebelumnya "C,CE,CT,CS,TRV,I,BELUM LAPOR" dan Tanggal berikutnya keterangannya "D, N, LS Atau OFF"
  //    maka Keterangan belum lapor Otomatis Aktif
  // 2. Atau jika karyawan saat ini memang masih berstatus Belum Lapor (belum dimatikan oleh admin)
  if (isLeaveOrPermissionRosterStatus(prevRosterStatus) && isWorkOrOffRosterStatus(code)) {
    res.keteranganLapor = 'Belum Lapor';
  } else if (/belum\s*lapor|\bBL\b/i.test(rawCode) || /belum\s*lapor/i.test(String(emp.status || ''))) {
    res.keteranganLapor = 'Belum Lapor';
  } else if (emp.keteranganLapor === 'Belum Lapor' || /belum\s*lapor/i.test(String(emp.keteranganLapor || ''))) {
    res.keteranganLapor = 'Belum Lapor';
  }

  // JIKA STATUS BELUM LAPOR AKTIF:
  // Selama "Belum Lapor" belum dimatikan, seluruh porsi orderan makanan AKAN TETAP KOSONG
  if (res.keteranganLapor === 'Belum Lapor' || /belum\s*lapor/i.test(String(res.keteranganLapor || ''))) {
    res.keteranganLapor = 'Belum Lapor';
    res.pagiKantin = null;
    res.pagiLapangan = null;
    res.sahurKantin = null;
    res.sahurLapangan = null;
    res.siangKantin = null;
    res.siangLapangan = null;
    res.soreKantin = null;
    res.soreLapangan = null;
    res.takjilLapangan = null;
    res.malamLapangan = null;
    res.batchPagi = null;
    res.batchSore = null;
    res.catatan = null;
  }

  return res;
}
