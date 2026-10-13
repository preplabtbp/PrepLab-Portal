// Logika sinkronisasi Orderan Makanan dengan data Roster & Cuti
// Sesuai aturan operasional PrepLab:
// Mess CR (Gol II-V) vs Mess NR (Gol I-V, Nirwana / Non-Nirwana)

export interface RosterMealCalculation {
  statusKerja: string | null;
  shiftKerja: string | null;
  pagiKantin: string | null;
  pagiLapangan: string | null;
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

export interface EmployeeProfileLike {
  nik?: string | null;
  name?: string | null;
  statusMess?: string | null;
  gol?: string | null;
  shift?: string | null;
  tempatTinggal?: string | null;
  alamatDomisili?: string | null;
  section?: string | null;
}

/**
 * Menghitung order makanan karyawan berdasarkan status roster dan profil mess / tempat tinggal.
 */
export function computeMealOrderByRoster(
  emp: EmployeeProfileLike,
  rosterStatus: string | null | undefined,
  orderDate: string
): RosterMealCalculation {
  const code = String(rosterStatus || '').trim().toUpperCase();
  const sm = String(emp.statusMess || '').trim().toUpperCase();
  const isCR = sm === 'CR' || sm === 'MESS';
  
  const tt = `${emp.tempatTinggal || ''} ${emp.alamatDomisili || ''}`.toLowerCase();
  const isNirwana = tt.includes('nirwana');
  const isSelasaRabuSabtu = isTuesdayWednesdaySaturday(orderDate);

  const empShift = String(emp.shift || '').toLowerCase();
  const defaultDayShiftKerja = empShift.includes('nonshift') ? 'Nonshift' : 'SIANG';

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

  // Cuti kode: C, CE, CT, CI, TRV, TV, XP
  const isCuti = ['C', 'CE', 'CT', 'CI', 'TRV', 'TV', 'XP'].includes(code) || code.startsWith('CT') || code.startsWith('CI') || code.startsWith('CE') || code.startsWith('TRV');
  if (isCuti) {
    res.statusKerja = 'Cuti';
    res.status = 'CUTI';
    res.catatan = code ? `Cuti (${code})` : 'Cuti';
    return res;
  }

  if (isCR && isNirwana && ['D', 'N', 'LS'].includes(code)) {
    // ==========================================
    // LOGIKA MESS CR (Gol II-V) + tempat tinggal Nirwana
    // Pagi (D/N/LS) & Sore (D/N) bisa dipilih Kantin/Lapangan lewat dropdown di kolom Catatan — awalan "K" di Kantin
    // ==========================================
    res.pagiKantin = 'K';
    if (code === 'D') {
      // Siang = Lapangan 1, Sore = pilihan (awal Kantin), Malam = kosong
      res.shiftKerja = defaultDayShiftKerja;
      res.siangLapangan = '1';
      res.soreKantin = 'K';
    } else if (code === 'N') {
      // Siang = Kantin, Sore = pilihan (awal Kantin), Malam = Lapangan 1
      res.shiftKerja = 'MALAM';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
      res.malamLapangan = '1';
    } else {
      // LS: Siang, Sore & Malam = Lapangan 1
      res.shiftKerja = 'LONGSHIFT';
      res.siangLapangan = '1';
      res.soreLapangan = '1';
      res.malamLapangan = '1';
    }
  } else if (isCR) {
    // ==========================================
    // LOGIKA MESS CR (Gol II-V)
    // ==========================================
    if (code === 'D') {
      // 1. D: Nonshift dan shift siang
      // Pagi = Buat agar bisa diganti (Bungkusan Lapangan atau Kantin), default Kantin
      // Siang = Bungkusan Lapangan
      // Sore = Buat agar bisa diganti (Bungkusan Lapangan atau Kantin) Tapi saat hari Selasa, Rabu dan Sabtu tetap Kantin
      // Malam = Kosongkan
      res.shiftKerja = defaultDayShiftKerja;
      res.pagiKantin = 'K';
      res.siangLapangan = '1';
      if (isSelasaRabuSabtu) {
        res.soreKantin = 'K';
        res.soreLapangan = null;
      } else {
        res.soreLapangan = '1';
        res.soreKantin = null;
      }
    } else if (code === 'N') {
      // 2. N: Shift malam
      // Pagi = Kantin, Siang = Kantin, Sore = Kantin, Malam = Bungkusan Lapangan
      res.shiftKerja = 'MALAM';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
      res.malamLapangan = '1';
    } else if (code === 'LS') {
      // 3. LS: LongShift
      // Pagi = Buat agar bisa diganti (Bungkusan Lapangan atau Kantin), default Lapangan
      // Siang = Bungkusan Lapangan, Sore = Bungkusan Lapangan, Malam = Bungkusan Lapangan
      res.shiftKerja = 'LONGSHIFT';
      res.pagiLapangan = '1';
      res.siangLapangan = '1';
      res.soreLapangan = '1';
      res.malamLapangan = '1';
    } else if (code === 'I' || code === 'S') {
      // 5. I / S (Izin / Sakit)
      // Pagi = Kantin, Siang = Kantin, Sore = Kantin, Malam = Kosongkan
      res.statusKerja = code === 'S' ? 'Sakit' : 'Izin';
      res.status = code === 'S' ? 'SAKIT' : 'IZIN';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
    } else if (code === 'OFF') {
      // 6. Off
      // Pagi = Kantin, Siang = Kantin, Sore = Kantin, Malam = Kosongkan
      res.statusKerja = 'Off';
      res.status = 'OFF';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
    } else if (code === 'CS') {
      // 7. CS
      // Pagi = Kantin, Siang = Kantin, Sore = Kantin, Malam = Kosongkan
      res.statusKerja = 'CS';
      res.status = 'CS';
      res.pagiKantin = 'K';
      res.siangKantin = 'K';
      res.soreKantin = 'K';
    } else {
      // Kode tidak dikenal / '-'
      res.shiftKerja = defaultDayShiftKerja;
    }
  } else {
    // ==========================================
    // LOGIKA MESS NR (Gol I-V)
    // ==========================================
    // Keterangan: "Bungkusan Kantin" = 1 di kolom Kantin, "Bungkusan" (Lapangan) = 1 di kolom Lapangan.
    // Tempat tinggal Nirwana -> Bungkusan Kantin
    const BUNGKUS_KANTIN = '1';
    const bungkusanKantinPagi = isNirwana ? BUNGKUS_KANTIN : null;
    const bungkusanKantinSiang = isNirwana ? BUNGKUS_KANTIN : null;
    const bungkusanKantinSore = isNirwana ? BUNGKUS_KANTIN : null;
    const batchPagiNirwana = isNirwana ? '1' : null;
    const batchSoreNirwana = isNirwana ? '1' : null;

    if (code === 'D') {
      // 1. D: Nonshift dan shift siang
      // Pagi = Kosong (Jika Nirwana: 1 Bungkusan Kantin)
      // Siang = Bungkusan Lapangan
      // Sore = Kosong (Jika Nirwana: 1 Bungkusan Kantin)
      // Malam = Kosongkan
      res.shiftKerja = defaultDayShiftKerja;
      res.pagiKantin = bungkusanKantinPagi;
      res.batchPagi = batchPagiNirwana;
      res.siangLapangan = '1';
      res.soreKantin = bungkusanKantinSore;
      res.batchSore = batchSoreNirwana;
    } else if (code === 'N') {
      // 2. N: Shift malam
      // Pagi = Kosong (Nirwana: 1 Bungkusan Kantin)
      // Siang = Kosong (Nirwana: Bungkusan Kantin)
      // Sore = Kosong (Nirwana: 1 Bungkusan Kantin)
      // Malam = Bungkusan Lapangan
      res.shiftKerja = 'MALAM';
      res.pagiKantin = bungkusanKantinPagi;
      res.batchPagi = batchPagiNirwana;
      res.siangKantin = bungkusanKantinSiang;
      res.soreKantin = bungkusanKantinSore;
      res.batchSore = batchSoreNirwana;
      res.malamLapangan = '1';
    } else if (code === 'LS') {
      // 3. LS: LongShift
      // Pagi = Kosong (Nirwana: 1 Bungkusan Kantin)
      // Siang = Bungkusan Lapangan, Sore = Bungkusan Lapangan, Malam = Bungkusan Lapangan
      res.shiftKerja = 'LONGSHIFT';
      res.pagiKantin = bungkusanKantinPagi;
      res.batchPagi = batchPagiNirwana;
      res.siangLapangan = '1';
      res.soreLapangan = '1';
      res.malamLapangan = '1';
    } else if (code === 'I' || code === 'S') {
      // 5. I: Beri keterangan jika belum lapor akan tetap izin
      // Pagi = Bungkusan Kantin, Siang = Bungkusan Kantin, Sore = Bungkusan Kantin, Malam = Kosongkan
      res.statusKerja = code === 'S' ? 'Sakit' : 'Izin';
      res.status = code === 'S' ? 'SAKIT' : 'IZIN';
      res.keteranganLapor = 'Belum Lapor';
      res.pagiKantin = BUNGKUS_KANTIN;
      res.batchPagi = '1';
      res.siangKantin = BUNGKUS_KANTIN;
      res.soreKantin = BUNGKUS_KANTIN;
      res.batchSore = '1';
    } else if (code === 'CS') {
      // 6. CS: Pagi, Siang, Sore = Kosong (Nirwana: Bungkusan Kantin), Malam = Kosongkan
      res.statusKerja = 'CS';
      res.status = 'CS';
      res.pagiKantin = bungkusanKantinPagi;
      res.batchPagi = batchPagiNirwana;
      res.siangKantin = bungkusanKantinSiang;
      res.soreKantin = bungkusanKantinSore;
      res.batchSore = batchSoreNirwana;
    } else if (code === 'OFF') {
      // 7. Off: Pagi, Siang, Sore = Kosong (Nirwana: Bungkusan Kantin), Malam = Kosongkan
      res.statusKerja = 'Off';
      res.status = 'OFF';
      res.pagiKantin = bungkusanKantinPagi;
      res.batchPagi = batchPagiNirwana;
      res.siangKantin = bungkusanKantinSiang;
      res.soreKantin = bungkusanKantinSore;
      res.batchSore = batchSoreNirwana;
    } else {
      res.shiftKerja = defaultDayShiftKerja;
      res.pagiKantin = bungkusanKantinPagi;
      res.batchPagi = batchPagiNirwana;
      res.siangLapangan = '1';
      res.soreKantin = bungkusanKantinSore;
      res.batchSore = batchSoreNirwana;
    }
  }

  return res;
}
