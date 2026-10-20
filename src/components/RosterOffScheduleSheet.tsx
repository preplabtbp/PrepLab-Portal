import React, { useState, useMemo } from 'react';
import {
  Calendar, Users, Search, Filter, FileSpreadsheet, Download,
  RefreshCw, CheckCircle2, Clock, Sparkles, Building2,
  Printer, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown,
  Coffee, CalendarClock, ShieldCheck, Sun, Moon, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface RosterOffScheduleSheetProps {
  roster: any[];
  returnTo?: string | null;
  currentUser?: any;
  developerList?: string[];
}

export interface OffRecord {
  id: string;
  nik: string;
  nama: string;
  jabatan: string;
  section: string;
  poh: string;
  pt: string;
  shift: string;
  offDates: {
    date: Date;
    dateStr: string;
    dayName: string;
    formatted: string;
    code: string;
  }[];
  totalOffDays: number;
  offSummary: string;
  weekDailyStatus: {
    date: Date;
    dayName: string;
    dateNum: string;
    code: string;
    isOff: boolean;
    isToday: boolean;
  }[];
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  mei: 4, agu: 7, ags: 7, okt: 9, des: 11
};

export function parseKeyDate(str: string | null | undefined): Date | null {
  if (!str || str === '-') return null;
  const s = String(str).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s)) {
    const parts = s.split(/[-/]/).map(Number);
    const day = parts[0];
    const month = parts[1] - 1;
    let yr = parts[2];
    if (yr < 100) yr += 2000;
    return new Date(yr, month, day);
  }

  // "24 Aug 26" or "1 Sep 26" or "19 Oct 2026"
  const parts = s.replace(/-/g, ' ').split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[mStr] ?? 0;
    let yr = parseInt(parts[2], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, month, day);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatIndonesianDate(d: Date | null, options?: { withDay?: boolean; shortMonth?: boolean }): string {
  if (!d || isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const fullDayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthName = options?.shortMonth
    ? MONTH_NAMES_ID[monthIdx].substring(0, 3)
    : MONTH_NAMES_ID[monthIdx];

  if (options?.withDay) {
    return `${fullDayNames[d.getDay()]}, ${day} ${monthName} ${year}`;
  }
  return `${day} ${monthName} ${year}`;
}

/**
 * Filter Perusahaan: Hanya personil PT TBP dan PT GPS yang diambil.
 * Personil PT GTS, vendor, atau kontraktor lainnya tidak diambil.
 */
export function isTbpOrGpsEmployee(emp: any): boolean {
  if (!emp) return false;
  const rawPt = String(emp.pt || emp.perusahaan || emp.company || '').trim().toUpperCase();
  const nik = String(emp.nik || '').trim().toUpperCase();

  if (rawPt) {
    if (rawPt.includes('TBP') || rawPt.includes('TRIMEGAH')) return true;
    if (rawPt.includes('GPS') || rawPt.includes('GEBE PRIMA')) return true;
    return false;
  }

  if (nik.startsWith('GTS') || nik.includes('GTS')) {
    return false;
  }

  return true;
}

/**
 * Filter Shift: Hanya karyawan dengan status shift "Nonshift" saja.
 * Mengabaikan karyawan shift operasional (Shift A, Shift B, dsb.).
 */
export function isNonshiftEmployee(emp: any): boolean {
  if (!emp) return false;
  const rawShift = String(emp.shift || emp.grup || emp.group || '').trim().toUpperCase();
  const rawJabatan = String(emp.jabatan || emp.position || emp.role || '').trim().toLowerCase();

  // Indikator Nonshift eksplisit
  if (
    rawShift.includes('NON') ||
    rawShift === 'NS' ||
    rawShift === 'OFFICE' ||
    rawShift === 'NONSHIFT' ||
    rawShift === 'NON-SHIFT' ||
    rawShift.includes('NON SHIFT') ||
    rawShift === 'NON SHIFT'
  ) {
    return true;
  }

  // Jika eksplisit Shift A atau Shift B
  if (
    rawShift === 'A' ||
    rawShift === 'B' ||
    rawShift.includes('SHIFT A') ||
    rawShift.includes('SHIFT B') ||
    rawShift === 'SHIFT 1' ||
    rawShift === 'SHIFT 2'
  ) {
    return false;
  }

  // Jika jabatan tipikal nonshift office/manajerial
  if (
    rawJabatan.includes('manager') ||
    rawJabatan.includes('superintendent') ||
    rawJabatan.includes('admin') ||
    rawJabatan.includes('qa') ||
    rawJabatan.includes('inventory')
  ) {
    return true;
  }

  // Fallback: jika shift kosong atau tidak terdefinisi A/B
  return rawShift === '' || rawShift === '-';
}

/**
 * Menghitung hari Senin s.d. Minggu pada minggu tertentu (7 hari).
 */
export function getMondayToSundayWeek(refDate: Date): {
  monday: Date;
  sunday: Date;
  days: {
    date: Date;
    dayIndex: number;
    dayName: string;
    fullDayName: string;
    dateNum: string;
    dateKey: string;
    isoKey: string;
    isToday: boolean;
  }[];
} {
  const d = new Date(refDate);
  d.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const dayShortNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const fullDayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const days: {
    date: Date;
    dayIndex: number;
    dayName: string;
    fullDayName: string;
    dateNum: string;
    dateKey: string;
    isoKey: string;
    isToday: boolean;
  }[] = [];

  for (let i = 0; i < 7; i++) {
    const iter = new Date(monday);
    iter.setDate(monday.getDate() + i);
    iter.setHours(0, 0, 0, 0);

    const parts = iter.toDateString().split(' ');
    const day = parseInt(parts[2], 10);
    const dateKey = `${day} ${parts[1]} ${parts[3].substring(2)}`; // e.g. "19 Oct 26"
    const isoKey = iter.toISOString().split('T')[0];

    days.push({
      date: new Date(iter),
      dayIndex: iter.getDay(),
      dayName: dayShortNames[iter.getDay()],
      fullDayName: fullDayNames[iter.getDay()],
      dateNum: `${day} ${parts[1]}`,
      dateKey,
      isoKey,
      isToday: iter.getTime() === today.getTime()
    });
  }

  const sunday = days[6].date;
  return { monday, sunday, days };
}

/**
 * Mengambil kode shift karyawan untuk tanggal tertentu dari fullSchedule.
 */
function getEmployeeShiftCodeForDate(emp: any, dayMeta: { date: Date; dateKey: string; isoKey: string }): string {
  if (!emp?.fullSchedule) return '';
  const sched = emp.fullSchedule;

  // 1. Direct match key
  if (sched[dayMeta.dateKey]) return String(sched[dayMeta.dateKey]).trim().toUpperCase();
  if (sched[dayMeta.isoKey]) return String(sched[dayMeta.isoKey]).trim().toUpperCase();

  // 2. Iterate keys
  const targetTime = dayMeta.date.getTime();
  for (const [k, v] of Object.entries(sched)) {
    const parsed = parseKeyDate(k);
    if (parsed) {
      parsed.setHours(0, 0, 0, 0);
      if (parsed.getTime() === targetTime) {
        return String(v || '').trim().toUpperCase();
      }
    }
  }

  return '';
}

export function RosterOffScheduleSheet({
  roster,
  returnTo,
  currentUser,
  developerList = []
}: RosterOffScheduleSheetProps) {
  // Reference date for week navigation (defaults to today)
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [ptFilter, setPtFilter] = useState<'ALL' | 'TBP' | 'GPS'>('ALL');
  const [offDayFilter, setOffDayFilter] = useState<string>('ALL'); // 'ALL' | 'HAS_OFF' | 'SEN' | 'SEL' ...
  const [sortField, setSortField] = useState<'nama' | 'section' | 'totalOff' | 'pt'>('nama');
  const [sortAsc, setSortAsc] = useState(true);

  // Week calculation (Monday - Sunday)
  const weekInfo = useMemo(() => {
    return getMondayToSundayWeek(selectedWeekDate);
  }, [selectedWeekDate]);

  // Navigate week
  const handlePrevWeek = () => {
    setSelectedWeekDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setSelectedWeekDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleCurrentWeek = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setSelectedWeekDate(now);
  };

  // Compile unified list of Nonshift personnel with their weekly OFF records
  const allOffRecords = useMemo<OffRecord[]>(() => {
    const results: OffRecord[] = [];

    for (const emp of roster) {
      // 1. Filter PT: Hanya PT TBP dan GPS saja
      if (!isTbpOrGpsEmployee(emp)) continue;

      // 2. Filter Shift: Hanya karyawan dengan status shift "Nonshift"
      if (!isNonshiftEmployee(emp)) continue;

      const nik = String(emp.nik || '').trim();
      const nama = String(emp.name || emp.nama || '').trim();
      if (!nama || nik.includes('DEMO')) continue;

      const jabatan = String(emp.jabatan || emp.position || '-').trim();
      const section = String(emp.section || emp.department || 'Laboratory').trim();
      const poh = String(emp.poh || emp.domisili || '-').trim();
      const pt = String(emp.pt || 'TBP').trim().toUpperCase().includes('GPS') ? 'GPS' : 'TBP';
      const shift = String(emp.shift || 'Nonshift').trim();

      // Check each day of the current week (Senin s.d. Minggu)
      const offDates: OffRecord['offDates'] = [];
      const weekDailyStatus: OffRecord['weekDailyStatus'] = [];

      for (const dayMeta of weekInfo.days) {
        const code = getEmployeeShiftCodeForDate(emp, dayMeta);
        const isOff = code === 'OFF' || code.startsWith('OFF');

        weekDailyStatus.push({
          date: dayMeta.date,
          dayName: dayMeta.dayName,
          dateNum: dayMeta.dateNum,
          code: code || 'D',
          isOff,
          isToday: dayMeta.isToday
        });

        if (isOff) {
          offDates.push({
            date: dayMeta.date,
            dateStr: dayMeta.dateKey,
            dayName: dayMeta.fullDayName,
            formatted: `${dayMeta.fullDayName}, ${dayMeta.date.getDate()} ${MONTH_NAMES_ID[dayMeta.date.getMonth()].slice(0, 3)}`,
            code
          });
        }
      }

      // Summary string for human reading
      let offSummary = '-';
      if (offDates.length > 0) {
        offSummary = offDates.map(o => `${o.dayName} (${o.date.getDate()} ${MONTH_NAMES_ID[o.date.getMonth()].slice(0, 3)})`).join(', ');
      }

      results.push({
        id: `${nik}_${weekInfo.monday.toISOString()}`,
        nik,
        nama,
        jabatan,
        section,
        poh,
        pt,
        shift,
        offDates,
        totalOffDays: offDates.length,
        offSummary,
        weekDailyStatus
      });
    }

    return results;
  }, [roster, weekInfo]);

  // Extract unique sections for filter dropdown (All sections merged into 1 unified sheet by default)
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    for (const r of allOffRecords) {
      if (r.section) set.add(r.section);
    }
    return Array.from(set).sort();
  }, [allOffRecords]);

  // Filtered & Sorted list
  const filteredRecords = useMemo(() => {
    let list = [...allOffRecords];

    // Filter Section (Default ALL)
    if (sectionFilter !== 'ALL') {
      list = list.filter(r => r.section.toLowerCase() === sectionFilter.toLowerCase());
    }

    // Filter PT
    if (ptFilter !== 'ALL') {
      list = list.filter(r => r.pt === ptFilter);
    }

    // Filter Hari Off
    if (offDayFilter === 'HAS_OFF') {
      list = list.filter(r => r.totalOffDays > 0);
    } else if (offDayFilter !== 'ALL') {
      const targetDayName = offDayFilter.toLowerCase();
      list = list.filter(r => r.offDates.some(o => o.dayName.toLowerCase().includes(targetDayName)));
    }

    // Filter Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        r.nama.toLowerCase().includes(q) ||
        r.nik.toLowerCase().includes(q) ||
        r.jabatan.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.poh.toLowerCase().includes(q) ||
        r.offSummary.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'nama') {
        cmp = a.nama.localeCompare(b.nama);
      } else if (sortField === 'section') {
        cmp = a.section.localeCompare(b.section) || a.nama.localeCompare(b.nama);
      } else if (sortField === 'totalOff') {
        cmp = b.totalOffDays - a.totalOffDays || a.nama.localeCompare(b.nama);
      } else if (sortField === 'pt') {
        cmp = a.pt.localeCompare(b.pt) || a.nama.localeCompare(b.nama);
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [allOffRecords, sectionFilter, ptFilter, offDayFilter, searchQuery, sortField, sortAsc]);

  // Statistics KPIs
  const stats = useMemo(() => {
    const totalEmployees = allOffRecords.length;
    const withOff = allOffRecords.filter(r => r.totalOffDays > 0).length;

    // Off Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offTodayCount = allOffRecords.filter(r =>
      r.offDates.some(o => o.date.getTime() === today.getTime())
    ).length;

    // Breakdown per day of this week
    const dailyCounts: { dayName: string; fullDayName: string; dateNum: string; count: number; date: Date }[] = [];
    for (const d of weekInfo.days) {
      const count = allOffRecords.filter(r =>
        r.offDates.some(o => o.date.getTime() === d.date.getTime())
      ).length;
      dailyCounts.push({
        dayName: d.dayName,
        fullDayName: d.fullDayName,
        dateNum: d.dateNum,
        count,
        date: d.date
      });
    }

    const tbpCount = allOffRecords.filter(r => r.pt === 'TBP').length;
    const gpsCount = allOffRecords.filter(r => r.pt === 'GPS').length;

    return {
      totalEmployees,
      withOff,
      offTodayCount,
      dailyCounts,
      tbpCount,
      gpsCount
    };
  }, [allOffRecords, weekInfo]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const periodLabel = `${formatIndonesianDate(weekInfo.monday)} - ${formatIndonesianDate(weekInfo.sunday)}`;
      const filename = `Jadwal_Off_Karyawan_Nonshift_${weekInfo.monday.getDate()}-${weekInfo.sunday.getDate()}_${MONTH_NAMES_ID[weekInfo.monday.getMonth()].slice(0, 3)}_${weekInfo.monday.getFullYear()}.xlsx`;

      const rowsData = filteredRecords.map((r, idx) => {
        const row: Record<string, any> = {
          'NO': idx + 1,
          'PERUSAHAAN': `PT ${r.pt}`,
          'NIK': r.nik,
          'NAMA KARYAWAN': r.nama,
          'SECTION': r.section,
          'JABATAN': r.jabatan,
          'POH': r.poh,
          'SHIFT': r.shift,
          'HARI & TANGGAL OFF': r.offSummary,
          'TOTAL HARI OFF': `${r.totalOffDays} Hari`
        };

        // Tambah status masing-masing 7 hari
        weekInfo.days.forEach((d) => {
          const dayStatus = r.weekDailyStatus.find(s => s.date.getTime() === d.date.getTime());
          row[`${d.dayName} (${d.dateNum})`] = dayStatus?.code || 'D';
        });

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rowsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 6 },  // NO
        { wch: 14 }, // PT
        { wch: 15 }, // NIK
        { wch: 28 }, // NAMA
        { wch: 18 }, // SECTION
        { wch: 24 }, // JABATAN
        { wch: 14 }, // POH
        { wch: 12 }, // SHIFT
        { wch: 36 }, // HARI OFF
        { wch: 16 }, // TOTAL OFF
        { wch: 12 }, // Sen
        { wch: 12 }, // Sel
        { wch: 12 }, // Rab
        { wch: 12 }, // Kam
        { wch: 12 }, // Jum
        { wch: 12 }, // Sab
        { wch: 12 }, // Min
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Off Karyawan');
      XLSX.writeFile(wb, filename);

      toast.success(`Berhasil mengunduh Excel Jadwal Off (${periodLabel})!`);
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengekspor data ke Excel.');
    }
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  const periodString = `${formatIndonesianDate(weekInfo.monday, { withDay: true })} s.d. ${formatIndonesianDate(weekInfo.sunday, { withDay: true })}`;
  const periodShortString = `${weekInfo.monday.getDate()} ${MONTH_NAMES_ID[weekInfo.monday.getMonth()].slice(0, 3)} - ${weekInfo.sunday.getDate()} ${MONTH_NAMES_ID[weekInfo.sunday.getMonth()].slice(0, 3)} ${weekInfo.sunday.getFullYear()}`;

  return (
    <div className="w-full space-y-4 sm:space-y-6 bg-white min-h-[85vh] p-3 sm:p-6 rounded-2xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
      
      {/* Return to Labnote Banner (Jika diarahkan dari Modul Labnote) */}
      {returnTo && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-950 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shadow-xs shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-amber-950">
                Terhubung dengan Modul Labnote
              </div>
              <div className="text-[11px] sm:text-xs text-amber-800">
                Anda sedang melihat rekapitulasi Jadwal Off Karyawan Nonshift (PT TBP & GPS) untuk minggu berjalan.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                window.location.href = decodeURIComponent(returnTo);
              } catch (e) {
                window.history.back();
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            title="Klik untuk kembali ke Modul Labnote semula"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Labnote</span>
          </button>
        </div>
      )}

      {/* Header Utama & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>Khusus Shift Nonshift</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>PT TBP & PT GPS Saja</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Semua Section Digabung</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span>Jadwal Off Karyawan</span>
            <span className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
              Minggu Berjalan: {periodShortString}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Daftar ringkasan tanggal OFF personil Nonshift PT Trimegah Bangun Persada & PT Gebe Prima Solusi (Senin – Minggu).
          </p>
        </div>

        {/* Toolbar Aksi: Navigasi Minggu & Export */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Week Navigator */}
          <div className="inline-flex items-center bg-slate-50 border border-slate-300 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Minggu Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Kembali ke Minggu Ini"
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Minggu Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Download Rekap Jadwal Off Format Excel"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {/* Cetak */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Cetak Halaman Ini"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Daily Quick Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {/* Total Personil Nonshift */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/60 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Total Nonshift</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats.totalEmployees}
            <span className="text-xs font-normal text-slate-500 ml-1.5">Orang</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            PT TBP: <strong className="text-slate-700">{stats.tbpCount}</strong> | PT GPS: <strong className="text-slate-700">{stats.gpsCount}</strong>
          </div>
        </div>

        {/* Memiliki Off Minggu Ini */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Off Minggu Ini</span>
            <Coffee className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950">
            {stats.withOff}
            <span className="text-xs font-normal text-amber-800 ml-1.5">Personil</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-1">
            Terjadwal off pada 19 - 25 Okt 2026
          </div>
        </div>

        {/* Off Hari Ini */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Sedang Off Hari Ini</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-950">
            {stats.offTodayCount}
            <span className="text-xs font-normal text-rose-800 ml-1.5">Personil</span>
          </div>
          <div className="text-[11px] text-rose-700 mt-1">
            Status OFF pada hari ini ({formatIndonesianDate(new Date(), { withDay: true })})
          </div>
        </div>

        {/* Periode Minggu Berjalan */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-teal-200 bg-teal-50/50 shadow-2xs">
          <div className="flex items-center justify-between text-teal-800 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Rentang Kalender</span>
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-sm sm:text-base font-extrabold text-teal-950 leading-tight">
            {weekInfo.monday.getDate()} {MONTH_NAMES_ID[weekInfo.monday.getMonth()].slice(0, 3)} – {weekInfo.sunday.getDate()} {MONTH_NAMES_ID[weekInfo.sunday.getMonth()].slice(0, 3)} {weekInfo.sunday.getFullYear()}
          </div>
          <div className="text-[11px] text-teal-700 mt-1">
            Senin s.d. Minggu (7 Hari Kerja/Off)
          </div>
        </div>
      </div>

      {/* Quick Day Selector Strip (Senin - Minggu) */}
      <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/80 shadow-2xs print:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-amber-600" />
            <span>Peta Personil Off per Hari (Klik untuk Filter):</span>
          </span>
          {offDayFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setOffDayFilter('ALL')}
              className="text-[11px] text-teal-700 hover:text-teal-800 font-bold underline cursor-pointer"
            >
              Reset Filter Hari
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {stats.dailyCounts.map((dc) => {
            const isSelected = offDayFilter.toLowerCase() === dc.dayName.toLowerCase();
            const isToday = dc.date.toDateString() === new Date().toDateString();

            return (
              <button
                key={dc.dayName}
                type="button"
                onClick={() => {
                  setOffDayFilter(prev => prev.toLowerCase() === dc.dayName.toLowerCase() ? 'ALL' : dc.dayName);
                }}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/50'
                    : isToday
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-amber-100' : 'text-slate-500'}`}>
                  {dc.dayName}
                </div>
                <div className="text-xs sm:text-sm font-black my-0.5">
                  {dc.date.getDate()}
                </div>
                <div className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-full inline-block ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : dc.count > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {dc.count} OFF
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 print:hidden">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama karyawan, NIK, jabatan, atau section..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 placeholder-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Section Filter (Default ALL - All sections merged) */}
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">Section:</span>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Section (Gabungan)</option>
              {availableSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* PT Filter */}
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">PT:</span>
            <select
              value={ptFilter}
              onChange={(e) => setPtFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua (TBP & GPS)</option>
              <option value="TBP">Hanya PT TBP</option>
              <option value="GPS">Hanya PT GPS</option>
            </select>
          </div>

          {/* Status Off Filter */}
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Coffee className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">Status Off:</span>
            <select
              value={offDayFilter}
              onChange={(e) => setOffDayFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Karyawan Nonshift</option>
              <option value="HAS_OFF">Hanya Yang Memiliki Jadwal OFF</option>
              <option value="Senin">Hanya OFF Hari Senin</option>
              <option value="Selasa">Hanya OFF Hari Selasa</option>
              <option value="Rabu">Hanya OFF Hari Rabu</option>
              <option value="Kamis">Hanya OFF Hari Kamis</option>
              <option value="Jumat">Hanya OFF Hari Jumat</option>
              <option value="Sabtu">Hanya OFF Hari Sabtu</option>
              <option value="Minggu">Hanya OFF Hari Minggu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 text-center w-12 border-r border-slate-200">NO</th>
              <th
                onClick={() => {
                  if (sortField === 'pt') setSortAsc(!sortAsc);
                  else { setSortField('pt'); setSortAsc(true); }
                }}
                className="py-3 px-3 text-center w-24 border-r border-slate-200 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>PT</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => {
                  if (sortField === 'nama') setSortAsc(!sortAsc);
                  else { setSortField('nama'); setSortAsc(true); }
                }}
                className="py-3 px-3 min-w-[220px] border-r border-slate-200 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Nama & NIK Karyawan</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => {
                  if (sortField === 'section') setSortAsc(!sortAsc);
                  else { setSortField('section'); setSortAsc(true); }
                }}
                className="py-3 px-3 min-w-[170px] border-r border-slate-200 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Section & Jabatan</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 min-w-[100px] border-r border-slate-200 text-center">POH</th>
              <th className="py-3 px-3 min-w-[220px] border-r border-slate-200">
                <div className="flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5 text-amber-600" />
                  <span>Jadwal Hari & Tanggal Off</span>
                </div>
              </th>
              <th
                onClick={() => {
                  if (sortField === 'totalOff') setSortAsc(!sortAsc);
                  else { setSortField('totalOff'); setSortAsc(false); }
                }}
                className="py-3 px-3 text-center w-24 border-r border-slate-200 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Total Off</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              {/* Matriks 7 Hari (Senin - Minggu) */}
              {weekInfo.days.map((d) => (
                <th
                  key={d.dateKey}
                  className={`py-3 px-2 text-center w-16 border-r border-slate-200 ${
                    d.isToday ? 'bg-amber-100 text-amber-950 font-black' : ''
                  }`}
                >
                  <div className="text-[10px] leading-tight">{d.dayName}</div>
                  <div className="text-[11px] font-black">{d.date.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Coffee className="w-8 h-8 text-slate-400" />
                    <span className="font-bold text-sm text-slate-700">Tidak ada data jadwal off karyawan yang sesuai</span>
                    <span className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau sesuaikan filter section/status.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => {
                const hasOff = record.totalOffDays > 0;

                return (
                  <tr
                    key={record.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      hasOff ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* NO */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                      {index + 1}
                    </td>

                    {/* PT Badge */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200">
                      {record.pt === 'GPS' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                          PT GPS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          PT TBP
                        </span>
                      )}
                    </td>

                    {/* Nama & NIK */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug">
                        {record.nama}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-500">
                          {record.nik}
                        </span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          Nonshift
                        </span>
                      </div>
                    </td>

                    {/* Section & Jabatan */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <div className="font-semibold text-slate-800 text-xs">
                        {record.section}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={record.jabatan}>
                        {record.jabatan}
                      </div>
                    </td>

                    {/* POH */}
                    <td className="py-2.5 px-3 text-center text-slate-600 border-r border-slate-200">
                      {record.poh || '-'}
                    </td>

                    {/* Jadwal Hari & Tanggal Off */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      {record.offDates.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {record.offDates.map((off, oIdx) => (
                            <span
                              key={oIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-900 border border-amber-400/40 shadow-2xs"
                            >
                              <Coffee className="w-3 h-3 text-amber-600" />
                              <span>{off.formatted}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Tidak ada jadwal OFF minggu ini
                        </span>
                      )}
                    </td>

                    {/* Total Off */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200">
                      {record.totalOffDays > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          {record.totalOffDays} Hari
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">-</span>
                      )}
                    </td>

                    {/* Matriks 7 Kolom Harian */}
                    {record.weekDailyStatus.map((dayStatus, dIdx) => {
                      const isOff = dayStatus.isOff;
                      const code = dayStatus.code;

                      let cellBg = 'bg-transparent text-slate-700';
                      let badge = (
                        <span className="text-[11px] font-semibold text-slate-600">
                          {code || 'D'}
                        </span>
                      );

                      if (isOff) {
                        cellBg = 'bg-amber-100/70 font-black';
                        badge = (
                          <span className="px-1.5 py-0.5 rounded font-black text-[10.5px] bg-amber-500 text-white shadow-2xs">
                            OFF
                          </span>
                        );
                      } else if (code === 'CT' || code === 'C' || code.startsWith('C')) {
                        cellBg = 'bg-teal-50 font-bold';
                        badge = (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-teal-100 text-teal-800 border border-teal-300">
                            {code}
                          </span>
                        );
                      } else if (code === 'S' || code === 'SL' || code === 'I' || code === 'IK') {
                        cellBg = 'bg-rose-50 font-bold';
                        badge = (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-300">
                            {code}
                          </span>
                        );
                      }

                      return (
                        <td
                          key={dIdx}
                          className={`py-2 px-1 text-center border-r border-slate-200 transition-colors ${cellBg} ${
                            dayStatus.isToday ? 'ring-1 ring-inset ring-amber-400' : ''
                          }`}
                        >
                          {badge}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200 gap-2">
        <div>
          Menampilkan <strong className="text-slate-800">{filteredRecords.length}</strong> dari{' '}
          <strong className="text-slate-800">{allOffRecords.length}</strong> personil Nonshift terdaftar (PT TBP & PT GPS).
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Jadwal OFF</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span>Kerja Reguler (D)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <span>Cuti / Izin</span>
          </span>
        </div>
      </div>
    </div>
  );
}
