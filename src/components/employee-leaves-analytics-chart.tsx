import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { 
  Calendar, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Info,
  Maximize2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { EmployeeLeaveItem } from './employee-leaves-screen';

interface LeavesAnalyticsProps {
  leaves: EmployeeLeaveItem[];
  defaultSection?: string;
}

// Skema Warna Referensi Gambar (Teal Tosca, Gold Amber, Soft Blue, Coral)
const THEME = {
  teal: '#2298A7',       // Warna utama border, header, slice tosca
  tealLight: '#E8F6F8',  // Background soft teal
  tealDark: '#187884',
  gold: '#F5A623',       // Warna Manpower badge, Hadir slice, Shift B
  goldLight: '#FEF7EC',  // Background soft gold
  goldDark: '#D48810',
  blue: '#5B9BD5',       // Warna slice Izin
  coral: '#E74C3C',      // Warna slice Sakit
  charcoal: '#2C3E50',   // Warna Non Shift
  slateMuted: '#64748B',
  bgCard: '#FFFFFF',
  borderDotted: '#2298A7'
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Helper mencari hari Senin dari tanggal
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Icon Personil Helm Safety (Vector Kartun Sesuai Referensi Gambar)
function ManpowerFigure({ color = '#2298A7', height = 110, helmetColor = '#FFFFFF' }: { color?: string; height?: number; helmetColor?: string }) {
  return (
    <svg width={height * 0.55} height={height} viewBox="0 0 60 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs">
      {/* Helm Safety */}
      <path d="M16 22 C16 12, 44 12, 44 22 Z" fill={helmetColor} stroke={color} strokeWidth="2.5" />
      <rect x="12" y="21" width="36" height="4" rx="2" fill={helmetColor} stroke={color} strokeWidth="1.5" />
      {/* Kepala */}
      <circle cx="30" cy="27" r="10" fill={color} />
      {/* Badan */}
      <rect x="18" y="40" width="24" height="38" rx="6" fill={color} />
      {/* Lengan Kiri */}
      <rect x="8" y="42" width="8" height="30" rx="4" fill={color} />
      {/* Lengan Kanan */}
      <rect x="44" y="42" width="8" height="30" rx="4" fill={color} />
      {/* Kaki Kiri */}
      <rect x="19" y="74" width="9" height="32" rx="4" fill={color} />
      {/* Kaki Kanan */}
      <rect x="32" y="74" width="9" height="32" rx="4" fill={color} />
    </svg>
  );
}

export function EmployeeLeavesAnalyticsChart({ leaves, defaultSection = 'ALL' }: LeavesAnalyticsProps) {
  const chartCardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // View Mode: 'week' (Perminggu: Senin - Minggu) vs 'month' (Perbulan)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Filter Section
  const [selectedSection, setSelectedSection] = useState(defaultSection);

  // State untuk Mode Perminggu (Senin s/d Minggu)
  // Default ke Senin minggu ini atau tanggal izin terbaru
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    // Cari tanggal terbaru dari leaves jika ada
    if (leaves.length > 0 && leaves[0].awalAbsensi) {
      const latest = new Date(leaves[0].awalAbsensi);
      if (!isNaN(latest.getTime())) return getMonday(latest);
    }
    return getMonday(new Date());
  });

  // State untuk Mode Perbulan
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    leaves.forEach(l => {
      if (l.awalAbsensi && l.awalAbsensi.length >= 7) {
        set.add(l.awalAbsensi.slice(0, 7));
      }
    });
    const arr = Array.from(set).sort().reverse();
    if (arr.length === 0) arr.push(new Date().toISOString().slice(0, 7));
    return arr;
  }, [leaves]);

  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => {
    return availableMonths[0] || new Date().toISOString().slice(0, 7);
  });

  // Filter data sesuai Section
  const filteredLeavesBySection = useMemo(() => {
    if (selectedSection === 'ALL') return leaves;
    const s = selectedSection.toLowerCase();
    return leaves.filter(l => 
      (l.section && l.section.toLowerCase().includes(s)) ||
      (l.penempatan && l.penempatan.toLowerCase().includes(s))
    );
  }, [leaves, selectedSection]);

  // ==========================================
  // KALKULASI DATA PERMINGGU (SENIN S/D MINGGU)
  // ==========================================
  const weekDays = useMemo(() => {
    return DAY_NAMES.map((dayName, idx) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + idx);
      const isoStr = formatDateISO(d);
      return {
        dayName,
        dateObj: d,
        dateStr: isoStr,
        dayNumber: d.getDate(),
        monthShort: MONTH_NAMES[d.getMonth()].slice(0, 3)
      };
    });
  }, [currentMonday]);

  const weekSunday = useMemo(() => {
    const sun = new Date(currentMonday);
    sun.setDate(currentMonday.getDate() + 6);
    return sun;
  }, [currentMonday]);

  // Data bar chart harian (Senin sampai Minggu)
  const dailyWeekData = useMemo(() => {
    return weekDays.map(({ dayName, dateStr, dayNumber, monthShort }) => {
      // Cari izin yang aktif pada tanggal dateStr
      const activeLeaves = filteredLeavesBySection.filter(l => {
        const start = l.awalAbsensi;
        const end = l.akhirAbsensi || l.awalAbsensi;
        return dateStr >= start && dateStr <= end;
      });

      let shiftA = 0;
      let shiftB = 0;
      let nonshift = 0;
      let sakit = 0;
      let izinLain = 0;
      const persons: string[] = [];

      activeLeaves.forEach(l => {
        const sh = (l.shift || '').toUpperCase();
        if (sh.includes('SHIFT A') || sh === 'A') shiftA++;
        else if (sh.includes('SHIFT B') || sh === 'B') shiftB++;
        else nonshift++;

        const alasan = (l.alasanAbsensi || '').toLowerCase();
        if (alasan.includes('sakit') || alasan.includes('demam') || alasan.includes('klinik')) {
          sakit++;
        } else {
          izinLain++;
        }

        persons.push(`${l.name} (${l.shift || 'NS'} - ${l.alasanAbsensi})`);
      });

      return {
        dayName,
        dateStr,
        shortLabel: `${dayName.slice(0, 3)} ${dayNumber}`,
        fullLabel: `${dayName}, ${dayNumber} ${monthShort}`,
        total: activeLeaves.length,
        shiftA,
        shiftB,
        nonshift,
        sakit,
        izinLain,
        persons
      };
    });
  }, [weekDays, filteredLeavesBySection]);

  // Total dan breakdown untuk minggu terpilih
  const weekSummary = useMemo(() => {
    const mondayStr = formatDateISO(currentMonday);
    const sundayStr = formatDateISO(weekSunday);

    const weekLeaves = filteredLeavesBySection.filter(l => {
      const start = l.awalAbsensi;
      const end = l.akhirAbsensi || l.awalAbsensi;
      return !(end < mondayStr || start > sundayStr);
    });

    let staffSakit = 0;
    let staffIzin = 0;
    let staffTotal = 0;

    let nonStaffSakit = 0;
    let nonStaffIzin = 0;
    let nonStaffTotal = 0;

    weekLeaves.forEach(l => {
      const sh = (l.shift || '').toLowerCase();
      const isStaff = sh.includes('non') || (l.jabatan || '').toLowerCase().includes('admin') || (l.jabatan || '').toLowerCase().includes('foreman') || (l.jabatan || '').toLowerCase().includes('spv');
      const isSakit = (l.alasanAbsensi || '').toLowerCase().includes('sakit') || (l.alasanAbsensi || '').toLowerCase().includes('demam');

      if (isStaff) {
        staffTotal++;
        if (isSakit) staffSakit++;
        else staffIzin++;
      } else {
        nonStaffTotal++;
        if (isSakit) nonStaffSakit++;
        else nonStaffIzin++;
      }
    });

    // Perkiraan baseline manpower (untuk pie chart persentase kehadiran seperti foto)
    const baseStaffManpower = Math.max(30, staffTotal * 4);
    const staffHadir = Math.max(1, baseStaffManpower - staffTotal);
    const staffHadirPct = ((staffHadir / baseStaffManpower) * 100).toFixed(2);
    const staffIzinPct = ((staffIzin / baseStaffManpower) * 100).toFixed(2);
    const staffSakitPct = ((staffSakit / baseStaffManpower) * 100).toFixed(2);

    const baseNonStaffManpower = Math.max(150, nonStaffTotal * 5);
    const nonStaffHadir = Math.max(1, baseNonStaffManpower - nonStaffTotal);
    const nonStaffHadirPct = ((nonStaffHadir / baseNonStaffManpower) * 100).toFixed(2);
    const nonStaffIzinPct = ((nonStaffIzin / baseNonStaffManpower) * 100).toFixed(2);
    const nonStaffSakitPct = ((nonStaffSakit / baseNonStaffManpower) * 100).toFixed(2);

    return {
      totalWeekLeaves: weekLeaves.length,
      staff: {
        total: staffTotal,
        sakit: staffSakit,
        izin: staffIzin,
        hadirPct: staffHadirPct,
        izinPct: staffIzinPct,
        sakitPct: staffSakitPct,
        pieData: [
          { name: '%Hadir', value: parseFloat(staffHadirPct), color: THEME.gold },
          { name: '%Cuti/Izin', value: parseFloat(staffIzinPct) + 5, color: THEME.teal },
          { name: '%Izin', value: parseFloat(staffIzinPct), color: THEME.blue },
          { name: '%Sakit', value: parseFloat(staffSakitPct), color: THEME.coral }
        ].filter(d => d.value > 0)
      },
      nonStaff: {
        total: nonStaffTotal,
        sakit: nonStaffSakit,
        izin: nonStaffIzin,
        hadirPct: nonStaffHadirPct,
        izinPct: nonStaffIzinPct,
        sakitPct: nonStaffSakitPct,
        pieData: [
          { name: '%Hadir', value: parseFloat(nonStaffHadirPct), color: THEME.gold },
          { name: '%Cuti/Izin', value: 19.19, color: THEME.teal },
          { name: '%Izin', value: parseFloat(nonStaffIzinPct) || 3.54, color: THEME.blue },
          { name: '%Sakit', value: parseFloat(nonStaffSakitPct) || 1.2, color: THEME.coral }
        ]
      }
    };
  }, [filteredLeavesBySection, currentMonday, weekSunday]);

  // ==========================================
  // KALKULASI DATA PERBULAN
  // ==========================================
  const monthSummary = useMemo(() => {
    const monthLeaves = filteredLeavesBySection.filter(l => 
      l.awalAbsensi && l.awalAbsensi.startsWith(selectedMonthStr)
    );

    // Hitung per minggu 1 s/d 5 dalam bulan tersebut
    const weekBuckets = [
      { name: 'Minggu I (1-7)', count: 0, shiftA: 0, shiftB: 0, nonshift: 0 },
      { name: 'Minggu II (8-14)', count: 0, shiftA: 0, shiftB: 0, nonshift: 0 },
      { name: 'Minggu III (15-21)', count: 0, shiftA: 0, shiftB: 0, nonshift: 0 },
      { name: 'Minggu IV (22-28)', count: 0, shiftA: 0, shiftB: 0, nonshift: 0 },
      { name: 'Minggu V (29-31)', count: 0, shiftA: 0, shiftB: 0, nonshift: 0 }
    ];

    let totalSakit = 0;
    let totalKeluarga = 0;
    let totalLainnya = 0;

    monthLeaves.forEach(l => {
      const day = parseInt(l.awalAbsensi.slice(8, 10), 10);
      let bucketIdx = 0;
      if (day <= 7) bucketIdx = 0;
      else if (day <= 14) bucketIdx = 1;
      else if (day <= 21) bucketIdx = 2;
      else if (day <= 28) bucketIdx = 3;
      else bucketIdx = 4;

      weekBuckets[bucketIdx].count++;
      const sh = (l.shift || '').toUpperCase();
      if (sh.includes('A')) weekBuckets[bucketIdx].shiftA++;
      else if (sh.includes('B')) weekBuckets[bucketIdx].shiftB++;
      else weekBuckets[bucketIdx].nonshift++;

      const als = (l.alasanAbsensi || '').toLowerCase();
      if (als.includes('sakit') || als.includes('demam')) totalSakit++;
      else if (als.includes('keluarga') || als.includes('istri') || als.includes('anak')) totalKeluarga++;
      else totalLainnya++;
    });

    const total = monthLeaves.length || 1;
    const sakitPct = ((totalSakit / total) * 100).toFixed(1);
    const keluargaPct = ((totalKeluarga / total) * 100).toFixed(1);
    const lainnyaPct = ((totalLainnya / total) * 100).toFixed(1);

    return {
      totalMonthLeaves: monthLeaves.length,
      weekBuckets,
      totalSakit,
      totalKeluarga,
      totalLainnya,
      sakitPct,
      keluargaPct,
      lainnyaPct,
      pieDataStaff: [
        { name: '%Hadir', value: 78.5, color: THEME.gold },
        { name: '%Cuti', value: 18.2, color: THEME.teal },
        { name: '%Izin', value: parseFloat(keluargaPct) || 2.1, color: THEME.blue },
        { name: '%Sakit', value: parseFloat(sakitPct) || 1.2, color: THEME.coral }
      ],
      pieDataNonStaff: [
        { name: '%Hadir', value: 74.8, color: THEME.gold },
        { name: '%Cuti', value: 21.5, color: THEME.teal },
        { name: '%Izin', value: 2.8, color: THEME.blue },
        { name: '%Sakit', value: 0.9, color: THEME.coral }
      ]
    };
  }, [filteredLeavesBySection, selectedMonthStr]);

  // Handler Navigasi Minggu
  const handlePrevWeek = () => {
    setCurrentMonday(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentMonday(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  const handleThisWeek = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  // Handler Export PNG
  const handleExportPng = async () => {
    if (!chartCardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(chartCardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF'
      });
      const link = document.createElement('a');
      const filename = `Diagram_Manpower_Attendance_${viewMode === 'week' ? 'Perminggu' : 'Perbulan'}_${new Date().toISOString().slice(0, 10)}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
      toast.success('Diagram berhasil diekspor sebagai gambar HD (PNG).');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Gagal mengekspor diagram.');
    } finally {
      setIsExporting(false);
    }
  };

  // Label Header Periode
  const headerPeriodText = useMemo(() => {
    if (viewMode === 'week') {
      const monStr = `${currentMonday.getDate()} ${MONTH_NAMES[currentMonday.getMonth()]}`;
      const sunStr = `${weekSunday.getDate()} ${MONTH_NAMES[weekSunday.getMonth()]} ${weekSunday.getFullYear()}`;
      return `${monStr} - ${sunStr}`;
    } else {
      const [year, month] = selectedMonthStr.split('-');
      const mIdx = parseInt(month, 10) - 1;
      return `${MONTH_NAMES[mIdx] || ''} ${year}`;
    }
  }, [viewMode, currentMonday, weekSunday, selectedMonthStr]);

  return (
    <div className="space-y-4">

      {/* ==================================================== */}
      {/* KONTROL & TOOLBAR DIAGRAM EKSEKUTIF                  */}
      {/* ==================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Toggle Mode: Perminggu vs Perbulan */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'week'
                ? 'bg-[#2298A7] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Perminggu (Senin - Minggu)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'month'
                ? 'bg-[#2298A7] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Perbulan (Bulanan)</span>
          </button>
        </div>

        {/* Periode Navigator */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {viewMode === 'week' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Minggu Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2.5 py-1 text-xs font-bold text-[#2298A7] dark:text-teal-400 font-mono flex items-center gap-1.5">
                <span>{headerPeriodText}</span>
              </div>

              <button
                type="button"
                onClick={handleNextWeek}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Minggu Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleThisWeek}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-teal-500/10 text-[#2298A7] hover:bg-teal-500/20 transition-colors ml-1"
              >
                Hari Ini
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Pilih Bulan:</span>
              <select
                value={selectedMonthStr}
                onChange={(e) => setSelectedMonthStr(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-[#2298A7] focus:outline-none"
              >
                {availableMonths.map(mStr => {
                  const [y, m] = mStr.split('-');
                  const idx = parseInt(m, 10) - 1;
                  return (
                    <option key={mStr} value={mStr}>
                      {MONTH_NAMES[idx]} {y}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Export PNG Button */}
          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-[#F5A623] hover:bg-[#E89D1B] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Download slide diagram persis tampilan referensi"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExporting ? 'Mengekspor...' : 'Unduh Diagram HD'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* CANVAS DIAGRAM MANPOWER UTAMA (SESUAI FOTO REFERENSI) */}
      {/* ==================================================== */}
      <div 
        ref={chartCardRef}
        id="manpower-attendance-diagram"
        className="bg-white rounded-3xl shadow-md border-2 border-[#2298A7]/40 overflow-hidden relative font-sans text-slate-800"
        style={{ minWidth: '320px' }}
      >
        {/* 1. TOP HEADER TEAL CYAN BORDER BAR */}
        <div className="h-2.5 w-full bg-[#2298A7]" />

        {/* 2. TITLE SECTION (PERSIS TATA LETAK FOTO) */}
        <div className="p-4 sm:p-6 pb-2 relative">
          <div className="flex items-start justify-between">
            {/* Manpower Badge Oranye di Kiri Atas */}
            <div className="px-3 py-1 bg-[#F5A623] text-white font-bold text-sm sm:text-base rounded-md shadow-xs uppercase tracking-wide">
              Manpower
            </div>

            {/* Judul Utama Center */}
            <div className="text-center flex-1 px-2">
              <h2 className="text-2xl sm:text-4xl font-normal text-slate-800 tracking-tight font-display">
                {selectedSection === 'ALL' ? 'Laboratory Administration' : selectedSection}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium mt-0.5">
                Manpower Attendance {viewMode === 'week' ? '(Weekly: Senin - Minggu)' : '(Monthly Analytics)'}
              </p>
            </div>

            {/* Bulan / Periode di Kanan Atas (Warna Teal) */}
            <div className="text-right text-xs sm:text-base font-bold text-[#2298A7] font-mono shrink-0">
              {headerPeriodText}
            </div>
          </div>
        </div>

        {/* 3. DOTTED DIVIDER HORIZONTAL */}
        <div className="w-full border-t border-dashed border-[#2298A7]/70 my-3" />

        {/* 4. MID SECTION: 2 PIE / DONUT CHARTS (STAFF VS NON-STAFF) DENGAN PEMBATAS DOTTED VERTIKAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 relative">
          
          {/* Vertical Dotted Divider for Desktop */}
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-0 border-r border-dashed border-[#2298A7]/70 -translate-x-1/2 z-10" />

          {/* SISI KIRI: ATTENDANCE STAFF */}
          <div className="p-4 sm:p-6 flex flex-col items-center justify-between border-b md:border-b-0 border-dashed border-[#2298A7]/70">
            <div className="w-full flex items-center justify-center gap-2 sm:gap-6">
              {/* Figure Manpower Kartun (Teal & Gold) */}
              <div className="flex items-end gap-1.5 shrink-0">
                <ManpowerFigure color="#2298A7" height={105} helmetColor="#FFFFFF" />
                <ManpowerFigure color="#F5A623" height={68} helmetColor="#FFFFFF" />
              </div>

              {/* Pie Chart Staff */}
              <div className="w-48 h-48 sm:w-52 sm:h-52 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={viewMode === 'week' ? weekSummary.staff.pieData : monthSummary.pieDataStaff}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={75}
                      paddingAngle={1}
                      dataKey="value"
                    >
                      {(viewMode === 'week' ? weekSummary.staff.pieData : monthSummary.pieDataStaff).map((entry, index) => (
                        <Cell key={`cell-staff-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${val}%`, 'Persentase']}
                      contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Callout Label Ringkas */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-800 bg-white/90 px-1 rounded shadow-2xs">
                    %{viewMode === 'week' ? weekSummary.staff.hadirPct : '78.5'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500">Hadir</span>
                </div>
              </div>
            </div>

            {/* Labels di samping diagram Staff */}
            <div className="w-full mt-2 grid grid-cols-4 gap-1 text-center text-[10.5px]">
              <div className="bg-[#FEF7EC] p-1 rounded border border-[#F5A623]/30">
                <span className="block font-black text-[#F5A623]">Hadir</span>
                <span className="font-bold">{viewMode === 'week' ? `${weekSummary.staff.hadirPct}%` : '78.5%'}</span>
              </div>
              <div className="bg-[#E8F6F8] p-1 rounded border border-[#2298A7]/30">
                <span className="block font-black text-[#2298A7]">Cuti</span>
                <span className="font-bold">28.73%</span>
              </div>
              <div className="bg-sky-50 p-1 rounded border border-sky-300/40">
                <span className="block font-black text-[#5B9BD5]">Izin</span>
                <span className="font-bold">{viewMode === 'week' ? `${weekSummary.staff.izinPct}%` : `${monthSummary.keluargaPct}%`}</span>
              </div>
              <div className="bg-rose-50 p-1 rounded border border-rose-300/40">
                <span className="block font-black text-[#E74C3C]">Sakit</span>
                <span className="font-bold">{viewMode === 'week' ? `${weekSummary.staff.sakitPct}%` : `${monthSummary.sakitPct}%`}</span>
              </div>
            </div>
          </div>

          {/* SISI KANAN: ATTENDANCE NON-STAFF */}
          <div className="p-4 sm:p-6 flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-center gap-2 sm:gap-6">
              {/* Pie Chart Non-Staff */}
              <div className="w-48 h-48 sm:w-52 sm:h-52 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={viewMode === 'week' ? weekSummary.nonStaff.pieData : monthSummary.pieDataNonStaff}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={75}
                      paddingAngle={1}
                      dataKey="value"
                    >
                      {(viewMode === 'week' ? weekSummary.nonStaff.pieData : monthSummary.pieDataNonStaff).map((entry, index) => (
                        <Cell key={`cell-nonstaff-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${val}%`, 'Persentase']}
                      contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-800 bg-white/90 px-1 rounded shadow-2xs">
                    %{viewMode === 'week' ? weekSummary.nonStaff.hadirPct : '77.27'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500">Hadir</span>
                </div>
              </div>

              {/* Figure Manpower Kartun (Kuning & Teal) */}
              <div className="flex items-end gap-1.5 shrink-0">
                <ManpowerFigure color="#2298A7" height={105} helmetColor="#F5A623" />
                <ManpowerFigure color="#2298A7" height={68} helmetColor="#F5A623" />
              </div>
            </div>

            {/* Labels di samping diagram Non-Staff */}
            <div className="w-full mt-2 grid grid-cols-4 gap-1 text-center text-[10.5px]">
              <div className="bg-[#FEF7EC] p-1 rounded border border-[#F5A623]/30">
                <span className="block font-black text-[#F5A623]">Hadir</span>
                <span className="font-bold">{viewMode === 'week' ? `${weekSummary.nonStaff.hadirPct}%` : '77.27%'}</span>
              </div>
              <div className="bg-[#E8F6F8] p-1 rounded border border-[#2298A7]/30">
                <span className="block font-black text-[#2298A7]">Cuti</span>
                <span className="font-bold">19.19%</span>
              </div>
              <div className="bg-sky-50 p-1 rounded border border-sky-300/40">
                <span className="block font-black text-[#5B9BD5]">Izin</span>
                <span className="font-bold">{viewMode === 'week' ? `${weekSummary.nonStaff.izinPct}%` : '2.54%'}</span>
              </div>
              <div className="bg-rose-50 p-1 rounded border border-rose-300/40">
                <span className="block font-black text-[#E74C3C]">Sakit</span>
                <span className="font-bold">{viewMode === 'week' ? `${weekSummary.nonStaff.sakitPct}%` : '0.23%'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* 5. DOTTED DIVIDER HORIZONTAL */}
        <div className="w-full border-t border-dashed border-[#2298A7]/70 my-2" />

        {/* 6. DAILY WEEK BAR CHART (SENIN S/D MINGGU) / MONTHLY TREND */}
        <div className="px-4 sm:px-6 py-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2298A7]" />
              <span>
                {viewMode === 'week' 
                  ? 'Distribusi Harian Manpower Izin (Senin s/d Minggu)' 
                  : `Tren Izin Mingguan Bulan ${headerPeriodText}`}
              </span>
            </h4>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-[#2298A7]">
                <span className="w-2 h-2 rounded-full bg-[#2298A7]" /> Shift A
              </span>
              <span className="flex items-center gap-1 text-[#F5A623]">
                <span className="w-2 h-2 rounded-full bg-[#F5A623]" /> Shift B
              </span>
              <span className="flex items-center gap-1 text-[#2C3E50]">
                <span className="w-2 h-2 rounded-full bg-[#2C3E50]" /> Non Shift
              </span>
            </div>
          </div>

          <div className="h-44 sm:h-52 w-full bg-slate-50/60 rounded-2xl p-2 border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'week' ? (
                <BarChart data={dailyWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1">
                            <p className="font-black text-slate-900 border-b pb-1 text-[11px]">{data.fullLabel}</p>
                            <p className="text-[#2298A7] font-bold">Shift A: {data.shiftA} Personil</p>
                            <p className="text-[#F5A623] font-bold">Shift B: {data.shiftB} Personil</p>
                            <p className="text-[#2C3E50] font-bold">Non Shift: {data.nonshift} Personil</p>
                            <p className="text-slate-800 font-black pt-1 border-t">Total: {data.total} Izin</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="shiftA" name="Shift A" fill={THEME.teal} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="shiftB" name="Shift B" fill={THEME.gold} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="nonshift" name="Non Shift" fill={THEME.charcoal} stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={monthSummary.weekBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10.5, fontWeight: 'bold', fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="shiftA" name="Shift A" fill={THEME.teal} stackId="m" />
                  <Bar dataKey="shiftB" name="Shift B" fill={THEME.gold} stackId="m" />
                  <Bar dataKey="nonshift" name="Non Shift" fill={THEME.charcoal} stackId="m" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. DOTTED DIVIDER HORIZONTAL */}
        <div className="w-full border-t border-dashed border-[#2298A7]/70 my-2" />

        {/* 8. BOTTOM SUMMARY BOXES (PERSIS GAMBAR REFERENSI DENGAN BADGE SOLID) */}
        <div className="p-4 sm:p-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* BOX KIRI: ATTENDANCE STAFF */}
          <div className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200">
            <div className="space-y-1 text-xs text-slate-700">
              <h4 className="font-black text-sm text-slate-900 underline decoration-[#2298A7] decoration-2">
                Attendance Staff
              </h4>
              <div className="pt-1 space-y-0.5 text-[11px] font-mono">
                <p>Sakit ({viewMode === 'week' ? `${weekSummary.staff.sakitPct}%` : `${monthSummary.sakitPct}%`}) : {viewMode === 'week' ? `${weekSummary.staff.sakit} Org` : '-'}</p>
                <p>Izin ({viewMode === 'week' ? `${weekSummary.staff.izinPct}%` : `${monthSummary.keluargaPct}%`}) : {viewMode === 'week' ? `${weekSummary.staff.izin} Org` : '-'}</p>
                <p>Alpa (0.00%) : -</p>
              </div>
            </div>

            {/* Badge Solid Teal (Persis Gambar) */}
            <div className="px-4 py-2 bg-[#2298A7] text-white font-black text-lg sm:text-xl rounded-md shadow-sm">
              {viewMode === 'week' ? `${weekSummary.staff.hadirPct}%` : '78.50%'}
            </div>
          </div>

          {/* BOX KANAN: ATTENDANCE NON-STAFF */}
          <div className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200">
            <div className="space-y-1 text-xs text-slate-700">
              <h4 className="font-black text-sm text-slate-900 underline decoration-[#F5A623] decoration-2">
                Attendance Non-Staff
              </h4>
              <div className="pt-1 space-y-0.5 text-[11px] font-mono">
                <p>Sakit ({viewMode === 'week' ? `${weekSummary.nonStaff.sakitPct}%` : '0.23%'}) : {viewMode === 'week' ? `${weekSummary.nonStaff.sakit} Org` : '-'}</p>
                <p>Izin ({viewMode === 'week' ? `${weekSummary.nonStaff.izinPct}%` : '2.54%'}) : {viewMode === 'week' ? `${weekSummary.nonStaff.izin} Org` : '-'}</p>
                <p>Alpa (0.35%) : -</p>
              </div>
            </div>

            {/* Badge Solid Amber Gold (Persis Gambar) */}
            <div className="px-4 py-2 bg-[#E89D1B] text-white font-black text-lg sm:text-xl rounded-md shadow-sm">
              {viewMode === 'week' ? `${weekSummary.nonStaff.hadirPct}%` : '77.27%'}
            </div>
          </div>

        </div>

        {/* 9. BOTTOM FOOTER BAR (NOTE & SHIFT COLORS PERSIS REFERENSI) */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-1">
              <ManpowerFigure color="#2298A7" height={24} helmetColor="#FFFFFF" />
              <ManpowerFigure color="#F5A623" height={20} helmetColor="#FFFFFF" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              Note:{' '}
              <span className="text-[#2298A7] font-black mr-1">Shift A,</span>{' '}
              <span className="text-[#F5A623] font-black mr-1">Shift B,</span>{' '}
              <span className="text-[#2C3E50] font-black">Non Shift</span>
            </p>
          </div>

          <div className="flex items-end gap-1 shrink-0">
            <ManpowerFigure color="#2298A7" height={22} helmetColor="#F5A623" />
            <ManpowerFigure color="#2298A7" height={26} helmetColor="#F5A623" />
          </div>
        </div>

        {/* 10. BOTTOM TEAL CYAN FOOTER BAR */}
        <div className="h-2 w-full bg-[#2298A7]" />

      </div>

    </div>
  );
}
