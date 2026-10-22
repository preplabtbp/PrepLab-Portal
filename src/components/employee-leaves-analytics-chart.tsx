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
  AlertTriangle, 
  Search, 
  Filter, 
  Layers, 
  BarChart3, 
  TrendingUp, 
  Image as ImageIcon, 
  CheckCircle2, 
  FileSpreadsheet,
  ShieldCheck,
  HeartPulse,
  Home,
  FileText,
  ExternalLink
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { EmployeeLeaveItem, formatLeaveDateIndo } from './employee-leaves-screen';
import { parseGolonganLevel, checkIsGolonganI } from './RosterLeaveScheduleSheet';

interface LeavesAnalyticsProps {
  leaves: EmployeeLeaveItem[];
  defaultSection?: string;
  onPreviewPhoto?: (url: string, title: string) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Palette warna modern tosca, teal, amber, indigo, rose
const COLORS = {
  teal: '#0D9488',
  tealDark: '#0F766E',
  amber: '#F59E0B',
  amberDark: '#D97706',
  indigo: '#6366F1',
  indigoDark: '#4F46E5',
  rose: '#F43F5E',
  emerald: '#10B981',
  sky: '#0284C7',
  slate: '#64748B',
  purple: '#8B5CF6'
};

const SECTION_COLORS: Record<string, string> = {
  Preparation: '#10B981',      // Hijau
  Laboratory: '#0284C7',       // Biru Langit
  Maintenance: '#F59E0B',      // Orange
  Administration: '#8B5CF6',   // Ungu
  'Inventory Control': '#6366F1',
  'Quality Assurance': '#EC4899',
  Lainnya: '#94A3B8'
};

const SHIFT_COLORS: Record<string, string> = {
  'Shift A': '#0D9488',
  'Shift B': '#F59E0B',
  'Nonshift': '#6366F1'
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday
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

export function EmployeeLeavesAnalyticsChart({
  leaves,
  defaultSection = 'ALL',
  onPreviewPhoto
}: LeavesAnalyticsProps) {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Mode Tampilan: 'week' | 'month' | 'year' | 'all'
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year' | 'all'>('week');

  // Filters
  const [selectedSection, setSelectedSection] = useState(defaultSection);
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [selectedGolongan, setSelectedGolongan] = useState<'ALL' | 'STAFF' | 'CREW'>('ALL');

  // Table inner filters
  const [searchTable, setSearchTable] = useState('');
  const [filterCategoryTable, setFilterCategoryTable] = useState<'ALL' | 'Sakit' | 'Keluarga' | 'Lainnya'>('ALL');

  // Query Master Employees untuk deteksi akurat Golongan Staff (Gol II-V) vs Crew (Gol I)
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-master-lite'],
    queryFn: async (): Promise<any[]> => {
      try {
        const r = await fetch('/api/employees');
        const j = await r.json();
        return Array.isArray(j) ? j : [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const empByNik = useMemo(() => new Map(employees.map((e: any) => [String(e.nik || '').trim().toUpperCase(), e])), [employees]);
  const empByName = useMemo(() => new Map(employees.map((e: any) => [String(e.nama || '').trim().toLowerCase(), e])), [employees]);

  const isStaff = (l: EmployeeLeaveItem): boolean => {
    const emp = (l.nik ? empByNik.get(l.nik.trim().toUpperCase()) : null) || empByName.get(l.name.trim().toLowerCase());
    if (emp) {
      if (checkIsGolonganI(emp)) return false;
      const lvl = parseGolonganLevel(emp.gol || emp.golongan || emp.jobGrade, emp.jabatan || l.jabatan);
      return lvl >= 2;
    }
    if (checkIsGolonganI({ gol: l.gol, jabatan: l.jabatan })) return false;
    const lvl = parseGolonganLevel(l.gol, l.jabatan);
    return lvl >= 2;
  };

  const isCrew = (l: EmployeeLeaveItem): boolean => !isStaff(l);

  // State Mode Perminggu (Senin - Minggu)
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    if (leaves.length > 0 && leaves[0].awalAbsensi) {
      const d = new Date(leaves[0].awalAbsensi);
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });

  // State Mode Perbulan & Pertahun
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

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    leaves.forEach(l => {
      if (l.awalAbsensi && l.awalAbsensi.length >= 4) {
        set.add(l.awalAbsensi.slice(0, 4));
      }
    });
    const arr = Array.from(set).sort().reverse();
    if (arr.length === 0) arr.push(new Date().getFullYear().toString());
    return arr;
  }, [leaves]);

  const [selectedYearStr, setSelectedYearStr] = useState<string>(() => {
    return availableYears[0] || new Date().getFullYear().toString();
  });

  // Tanggal batas minggu
  const weekStartDate = currentMonday;
  const weekEndDate = useMemo(() => {
    const sun = new Date(currentMonday);
    sun.setDate(currentMonday.getDate() + 6);
    return sun;
  }, [currentMonday]);

  const weekStartDateStr = formatDateISO(weekStartDate);
  const weekEndDateStr = formatDateISO(weekEndDate);

  const prevWeek = () => {
    setCurrentMonday(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const nextWeek = () => {
    setCurrentMonday(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  // Filter Utama Berdasarkan Section, Shift, dan Golongan (Staff vs Crew)
  const baseFilteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      // 1. Filter Section
      if (selectedSection !== 'ALL') {
        const s = `${l.section || ''} ${l.penempatan || ''}`.toLowerCase();
        if (!s.includes(selectedSection.toLowerCase())) return false;
      }

      // 2. Filter Shift kerja karyawan (Permintaan 1)
      if (selectedShift !== 'ALL') {
        const sh = (l.shift || '').toLowerCase();
        const targetSh = selectedShift.toLowerCase();
        if (targetSh.includes('non') && !sh.includes('non')) return false;
        if (targetSh.includes('a') && !sh.includes('a')) return false;
        if (targetSh.includes('b') && !sh.includes('b')) return false;
      }

      // 3. Filter Staff vs Crew (Permintaan 2)
      if (selectedGolongan === 'STAFF' && !isStaff(l)) return false;
      if (selectedGolongan === 'CREW' && !isCrew(l)) return false;

      return true;
    });
  }, [leaves, selectedSection, selectedShift, selectedGolongan, employees]);

  // Filter Periode Aktif Sesuai Tab (Week / Month / Year / All)
  const activePeriodLeaves = useMemo(() => {
    return baseFilteredLeaves.filter(l => {
      const start = l.awalAbsensi || '';
      const end = l.akhirAbsensi || l.awalAbsensi || '';

      if (viewMode === 'week') {
        return !(end < weekStartDateStr || start > weekEndDateStr);
      }
      if (viewMode === 'month') {
        return start.startsWith(selectedMonthStr) || end.startsWith(selectedMonthStr);
      }
      if (viewMode === 'year') {
        return start.startsWith(selectedYearStr) || end.startsWith(selectedYearStr);
      }
      return true; // 'all'
    });
  }, [baseFilteredLeaves, viewMode, weekStartDateStr, weekEndDateStr, selectedMonthStr, selectedYearStr]);

  // Klasifikasi Alasan Izin
  const getLeaveCategory = (l: EmployeeLeaveItem): 'Sakit' | 'Keluarga' | 'Lainnya' => {
    const als = (l.alasanAbsensi || '').toLowerCase();
    if (als.includes('sakit') || als.includes('demam') || als.includes('klinik') || als.includes('rawat') || als.includes('opname')) {
      return 'Sakit';
    }
    if (als.includes('keluarga') || als.includes('istri') || als.includes('anak') || als.includes('orang tua') || als.includes('duka') || als.includes('nikah') || als.includes('melahirkan')) {
      return 'Keluarga';
    }
    return 'Lainnya';
  };

  // Metrik KPI Periode Terpilih
  const activeMetrics = useMemo(() => {
    let sakit = 0;
    let keluarga = 0;
    let lainnya = 0;
    let totalHari = 0;

    activePeriodLeaves.forEach(l => {
      const cat = getLeaveCategory(l);
      if (cat === 'Sakit') sakit++;
      else if (cat === 'Keluarga') keluarga++;
      else lainnya++;

      totalHari += Number(l.jumlah) || 1;
    });

    const uniqueEmployees = new Set(activePeriodLeaves.map(l => l.nik || l.name)).size;

    return {
      totalKasus: activePeriodLeaves.length,
      totalHari,
      sakit,
      keluarga,
      lainnya,
      uniqueEmployees
    };
  }, [activePeriodLeaves]);

  // 1. DATA CHART PERMINGGU (Senin s/d Minggu)
  const weekChartData = useMemo(() => {
    return DAY_NAMES.map((dayName, idx) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + idx);
      const isoStr = formatDateISO(d);

      let shiftA = 0;
      let shiftB = 0;
      let nonshift = 0;
      let sakit = 0;
      let keluarga = 0;
      let lainnya = 0;

      activePeriodLeaves.forEach(l => {
        const start = l.awalAbsensi || '';
        const end = l.akhirAbsensi || l.awalAbsensi || '';
        if (isoStr >= start && isoStr <= end) {
          const sh = (l.shift || '').toLowerCase();
          if (sh.includes('non')) nonshift++;
          else if (sh.includes('b')) shiftB++;
          else shiftA++;

          const cat = getLeaveCategory(l);
          if (cat === 'Sakit') sakit++;
          else if (cat === 'Keluarga') keluarga++;
          else lainnya++;
        }
      });

      return {
        name: `${dayName.slice(0, 3)} ${d.getDate()}`,
        fullName: `${dayName}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
        'Shift A': shiftA,
        'Shift B': shiftB,
        'Non Shift': nonshift,
        total: shiftA + shiftB + nonshift,
        sakit,
        keluarga,
        lainnya
      };
    });
  }, [currentMonday, activePeriodLeaves]);

  // 2. DATA CHART PERBULAN (Minggu 1 s/d 5)
  const monthChartData = useMemo(() => {
    const buckets = [
      { name: 'Mg I (1-7)', startDay: 1, endDay: 7, 'Shift A': 0, 'Shift B': 0, 'Non Shift': 0, total: 0 },
      { name: 'Mg II (8-14)', startDay: 8, endDay: 14, 'Shift A': 0, 'Shift B': 0, 'Non Shift': 0, total: 0 },
      { name: 'Mg III (15-21)', startDay: 15, endDay: 21, 'Shift A': 0, 'Shift B': 0, 'Non Shift': 0, total: 0 },
      { name: 'Mg IV (22-28)', startDay: 22, endDay: 28, 'Shift A': 0, 'Shift B': 0, 'Non Shift': 0, total: 0 },
      { name: 'Mg V (29-31)', startDay: 29, endDay: 31, 'Shift A': 0, 'Shift B': 0, 'Non Shift': 0, total: 0 }
    ];

    activePeriodLeaves.forEach(l => {
      const day = parseInt((l.awalAbsensi || '').slice(8, 10), 10);
      if (isNaN(day)) return;

      let bIdx = 0;
      if (day <= 7) bIdx = 0;
      else if (day <= 14) bIdx = 1;
      else if (day <= 21) bIdx = 2;
      else if (day <= 28) bIdx = 3;
      else bIdx = 4;

      const sh = (l.shift || '').toLowerCase();
      if (sh.includes('non')) buckets[bIdx]['Non Shift']++;
      else if (sh.includes('b')) buckets[bIdx]['Shift B']++;
      else buckets[bIdx]['Shift A']++;

      buckets[bIdx].total++;
    });

    return buckets;
  }, [activePeriodLeaves]);

  // 3. DATA CHART PERTAHUN (12 Bulan)
  const yearChartData = useMemo(() => {
    return MONTH_NAMES.map((mName, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      let shiftA = 0;
      let shiftB = 0;
      let nonshift = 0;

      activePeriodLeaves.forEach(l => {
        const start = l.awalAbsensi || '';
        if (start.startsWith(`${selectedYearStr}-${mStr}`)) {
          const sh = (l.shift || '').toLowerCase();
          if (sh.includes('non')) nonshift++;
          else if (sh.includes('b')) shiftB++;
          else shiftA++;
        }
      });

      return {
        name: mName.slice(0, 3),
        fullName: `${mName} ${selectedYearStr}`,
        'Shift A': shiftA,
        'Shift B': shiftB,
        'Non Shift': nonshift,
        total: shiftA + shiftB + nonshift
      };
    });
  }, [selectedYearStr, activePeriodLeaves]);

  // 4. DISTRIBUSI SECTION (Pie Chart)
  const sectionPieData = useMemo(() => {
    const counts: Record<string, number> = {
      Preparation: 0,
      Laboratory: 0,
      Maintenance: 0,
      Administration: 0,
      Lainnya: 0
    };

    activePeriodLeaves.forEach(l => {
      const sec = (l.section || l.penempatan || '').toLowerCase();
      if (sec.includes('prep')) counts.Preparation++;
      else if (sec.includes('lab')) counts.Laboratory++;
      else if (sec.includes('maint')) counts.Maintenance++;
      else if (sec.includes('admin')) counts.Administration++;
      else counts.Lainnya++;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [activePeriodLeaves]);

  // 5. TOP KARYAWAN IZIN TERBANYAK
  const topLeaveEmployees = useMemo(() => {
    const map = new Map<string, { nik: string; name: string; section: string; shift: string; isStaff: boolean; count: number; days: number }>();
    activePeriodLeaves.forEach(l => {
      const key = l.nik ? l.nik.trim().toUpperCase() : l.name.trim();
      const existing = map.get(key) || {
        nik: l.nik || '-',
        name: l.name,
        section: l.section || l.penempatan || 'Preparation',
        shift: l.shift || 'Nonshift',
        isStaff: isStaff(l),
        count: 0,
        days: 0
      };
      existing.count += 1;
      existing.days += Number(l.jumlah) || 1;
      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.days - a.days || b.count - a.count)
      .slice(0, 5);
  }, [activePeriodLeaves, employees]);

  // 6. FILTER TABEL DETAIL LIST
  const tableFilteredRecords = useMemo(() => {
    return activePeriodLeaves.filter(l => {
      // Filter kategori alasan
      if (filterCategoryTable !== 'ALL') {
        const cat = getLeaveCategory(l);
        if (cat !== filterCategoryTable) return false;
      }

      // Search text
      if (searchTable.trim()) {
        const q = searchTable.toLowerCase();
        const str = `${l.name} ${l.nik} ${l.section} ${l.penempatan} ${l.alasanAbsensi} ${l.pengawasMengetahui}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });
  }, [activePeriodLeaves, filterCategoryTable, searchTable]);

  // Handler Export PNG
  const handleExportPng = async () => {
    if (!diagramRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(diagramRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF'
      });
      const link = document.createElement('a');
      const filename = `Diagram_Analitik_Izin_${viewMode}_${new Date().toISOString().slice(0, 10)}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
      toast.success('Diagram analitik berhasil diunduh sebagai gambar PNG HD.');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Gagal mengekspor diagram.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── 1. TOOLBAR KONTROL & FILTER (PERSIS MODUL REKAP KETERLAMBATAN) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* ROW 1: View Mode Tabs & Navigation Period */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Mode Switcher Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
            {[
              { id: 'week', label: 'Perminggu (Senin - Minggu)', icon: <Calendar className="w-3.5 h-3.5" /> },
              { id: 'month', label: 'Perbulan (Bulanan)', icon: <Clock className="w-3.5 h-3.5" /> },
              { id: 'year', label: 'Pertahun', icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { id: 'all', label: 'Semua Riwayat', icon: <Layers className="w-3.5 h-3.5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  viewMode === tab.id
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Date Navigator Based on Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {viewMode === 'week' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={prevWeek}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  title="Minggu Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2 min-w-[190px] text-center">
                  {formatLeaveDateIndo(weekStartDateStr)} s/d {formatLeaveDateIndo(weekEndDateStr)}
                </span>
                <button
                  type="button"
                  onClick={nextWeek}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  title="Minggu Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {viewMode === 'month' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Pilih Bulan:</span>
                <select
                  value={selectedMonthStr}
                  onChange={e => setSelectedMonthStr(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none"
                >
                  {availableMonths.map(m => {
                    const [y, mm] = m.split('-');
                    const mName = MONTH_NAMES[parseInt(mm, 10) - 1] || mm;
                    return (
                      <option key={m} value={m}>
                        {mName} {y}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {viewMode === 'year' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Pilih Tahun:</span>
                <select
                  value={selectedYearStr}
                  onChange={e => setSelectedYearStr(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Export PNG */}
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Download Diagram sebagai Gambar PNG HD"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Mengekspor...' : 'Unduh PNG HD'}</span>
            </button>
          </div>
        </div>

        {/* ROW 2: FILTERS (SECTION, SHIFT KERJA, STAFF VS CREW) */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          
          {/* 1. Filter Section */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Section:</span>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Section</option>
              <option value="Preparation">Preparation</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Administration">Administration</option>
              <option value="Inventory Control">Inventory Control</option>
              <option value="Quality Assurance">Quality Assurance</option>
            </select>
          </div>

          {/* 2. Filter Shift Kerja Karyawan (PERMINTAAN USER 1) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift:</span>
            <select
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              title="Filter Shift Kerja Karyawan"
            >
              <option value="ALL">Semua Shift</option>
              <option value="Shift A">Shift A</option>
              <option value="Shift B">Shift B</option>
              <option value="Nonshift">Nonshift</option>
            </select>
          </div>

          {/* 3. Filter Staff dan Crew (PERMINTAAN USER 2) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori:</span>
            <select
              value={selectedGolongan}
              onChange={e => setSelectedGolongan(e.target.value as any)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 focus:outline-none cursor-pointer"
              title="Filter Karyawan: Staff (Gol II-V) vs Crew (Gol I)"
            >
              <option value="ALL">Semua Karyawan (Staff &amp; Crew)</option>
              <option value="STAFF">Staff (Gol II - V)</option>
              <option value="CREW">Crew (Gol I)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedSection !== 'ALL' || selectedShift !== 'ALL' || selectedGolongan !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedSection('ALL');
                setSelectedShift('ALL');
                setSelectedGolongan('ALL');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* ── 2. KANVAS DIAGRAM UTAMA (EKSPOR PNG HD) ── */}
      <div 
        ref={diagramRef} 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6"
      >
        {/* Diagram Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                <Sparkles className="w-3 h-3 text-teal-500" />
                Sheet Diagram Eksekutif
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-500">
                {viewMode === 'week' ? `Periode Minggu (${formatLeaveDateIndo(weekStartDateStr)} - ${formatLeaveDateIndo(weekEndDateStr)})` :
                 viewMode === 'month' ? `Periode Bulan ${MONTH_NAMES[parseInt(selectedMonthStr.split('-')[1], 10) - 1]} ${selectedMonthStr.split('-')[0]}` :
                 viewMode === 'year' ? `Periode Tahun ${selectedYearStr}` : 'Seluruh Database'}
              </span>
              {selectedShift !== 'ALL' && (
                <>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Shift: {selectedShift}
                  </span>
                </>
              )}
              {selectedGolongan !== 'ALL' && (
                <>
                  <span className="text-xs text-slate-400">·</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    selectedGolongan === 'STAFF'
                      ? 'text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      : 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {selectedGolongan === 'STAFF' ? 'Staff (Gol II-V)' : 'Crew (Gol I)'}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Diagram Analitik Rekap Izin Karyawan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring absensi, distribusi perizinan sakit dan keperluan keluarga personil Preparation &amp; Laboratory
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-teal-600 inline-block" />
              <span>Shift A</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
              <span>Shift B</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
              <span>Non Shift</span>
            </div>
          </div>
        </div>

        {/* ── KPI MINI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Kasus Izin */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Laporan Izin</span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {activeMetrics.totalKasus} <span className="text-xs font-semibold text-slate-400">kasus</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Total {activeMetrics.totalHari} hari absensi ({activeMetrics.uniqueEmployees} personil)
            </div>
          </div>

          {/* Izin Sakit */}
          <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center justify-between">
              <span>Izin Sakit / Klinik</span>
              <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {activeMetrics.sakit} <span className="text-xs font-semibold text-rose-600/70">kasus</span>
            </div>
            <div className="text-[11px] text-rose-600/80 mt-0.5">
              {activeMetrics.totalKasus > 0 ? Math.round((activeMetrics.sakit / activeMetrics.totalKasus) * 100) : 0}% dari total izin
            </div>
          </div>

          {/* Izin Keperluan Keluarga */}
          <div className="bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/40 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider flex items-center justify-between">
              <span>Keperluan Keluarga</span>
              <Home className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {activeMetrics.keluarga} <span className="text-xs font-semibold text-teal-600/70">kasus</span>
            </div>
            <div className="text-[11px] text-teal-600/80 mt-0.5">
              {activeMetrics.totalKasus > 0 ? Math.round((activeMetrics.keluarga / activeMetrics.totalKasus) * 100) : 0}% dari total izin
            </div>
          </div>

          {/* Izin Lainnya / Dispensasi */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center justify-between">
              <span>Lainnya / Dispensasi</span>
              <Users className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {activeMetrics.lainnya} <span className="text-xs font-semibold text-indigo-600/70">kasus</span>
            </div>
            <div className="text-[11px] text-indigo-600/80 mt-0.5">
              {activeMetrics.totalKasus > 0 ? Math.round((activeMetrics.lainnya / activeMetrics.totalKasus) * 100) : 0}% dari total izin
            </div>
          </div>
        </div>

        {/* ── CHARTS ROW: MAIN STACKED BAR CHART + PIE BREAKDOWNS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Bar Chart (Col-span 2) */}
          <div className="lg:col-span-2 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                {viewMode === 'week' ? 'Tren Izin Harian per Shift (Senin - Minggu)' :
                 viewMode === 'month' ? `Distribusi Izin Mingguan di Bulan ${selectedMonthStr}` :
                 viewMode === 'year' ? `Distribusi Izin Bulanan Tahun ${selectedYearStr}` : 'Rekapan Izin Keseluruhan'}
              </div>
              <div className="text-xs text-slate-400">
                Satuan: Personil Izin
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={
                    viewMode === 'week' ? weekChartData :
                    viewMode === 'month' ? monthChartData :
                    viewMode === 'year' ? yearChartData :
                    monthChartData
                  }
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748B' }} 
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748B' }} 
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderColor: '#E2E8F0', 
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Bar dataKey="Shift A" fill={COLORS.teal} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Shift B" fill={COLORS.amber} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Non Shift" fill={COLORS.indigo} stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Section Pie & Top Karyawan Izin */}
          <div className="flex flex-col gap-4">
            
            {/* Section Breakdown Pie */}
            <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span>Distribusi Section</span>
                <span className="text-[10px] text-slate-400">Total Izin</span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sectionPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={SECTION_COLORS[entry.name] || COLORS.slate} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Karyawan Izin Terbanyak */}
            <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span>Top Karyawan Izin</span>
                <span className="text-[10px] text-slate-400">Periode ini</span>
              </div>
              <div className="space-y-1.5">
                {topLeaveEmployees.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Tidak ada catatan pada periode ini</p>
                ) : (
                  topLeaveEmployees.map((emp, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] inline-flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block max-w-[130px]">
                            {emp.name}
                          </span>
                          <span className="text-[9.5px] text-slate-400 block">
                            {emp.isStaff ? 'Staff' : 'Crew'} • {emp.section}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-teal-600 dark:text-teal-400 block">
                          {emp.days} Hari
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          {emp.count}x izin
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── 3. SECTION DAFTAR DETAIL KARYAWAN IZIN PADA PERIODE TERPILIH ── */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Rincian Daftar Karyawan Izin ({tableFilteredRecords.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Detail personil izin untuk periode {viewMode === 'week' ? 'Mingguan' : viewMode === 'month' ? 'Bulanan' : viewMode === 'year' ? 'Tahunan' : 'Semua'} yang sedang difilter
              </p>
            </div>

            {/* Quick table filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari personil di list..."
                  value={searchTable}
                  onChange={e => setSearchTable(e.target.value)}
                  className="pl-8 pr-3 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'Sakit', label: 'Sakit' },
                  { id: 'Keluarga', label: 'Keluarga' },
                  { id: 'Lainnya', label: 'Lainnya' }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setFilterCategoryTable(b.id as any)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      filterCategoryTable === b.id
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 text-center w-12">No</th>
                  <th className="py-2.5 px-3">Tanggal Izin</th>
                  <th className="py-2.5 px-4">Nama &amp; NIK</th>
                  <th className="py-2.5 px-3 text-center">Kategori</th>
                  <th className="py-2.5 px-3 text-center">Section</th>
                  <th className="py-2.5 px-3 text-center">Shift</th>
                  <th className="py-2.5 px-4">Alasan Absensi</th>
                  <th className="py-2.5 px-3 text-center">Durasi</th>
                  <th className="py-2.5 px-3 text-center">Pengawas</th>
                  <th className="py-2.5 px-3 text-center">Surat / Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tableFilteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data izin personil yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  tableFilteredRecords.map((item, idx) => {
                    const itemIsStaff = isStaff(item);
                    const cat = getLeaveCategory(item);
                    const sec = item.section || item.penempatan || 'Preparation';

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                          <div>{formatLeaveDateIndo(item.awalAbsensi)}</div>
                          {item.akhirAbsensi && item.akhirAbsensi !== item.awalAbsensi && (
                            <div className="text-[10px] text-slate-400">s/d {formatLeaveDateIndo(item.akhirAbsensi)}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>{item.nik || '-'}</span>
                            <span>·</span>
                            <span className="truncate max-w-[120px]">{item.jabatan || '-'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            itemIsStaff
                              ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          }`}>
                            {itemIsStaff ? 'Staff (Gol II-V)' : 'Crew (Gol I)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                            sec.toLowerCase().includes('prep')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                              : sec.toLowerCase().includes('lab')
                              ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700'
                              : sec.toLowerCase().includes('maint')
                              ? 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}>
                            {sec}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${
                            (item.shift || '').toLowerCase().includes('a')
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                              : (item.shift || '').toLowerCase().includes('b')
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                          }`}>
                            {item.shift || 'Nonshift'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                          <span className={`inline-block mr-1.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                            cat === 'Sakit'
                              ? 'bg-rose-100 text-rose-700'
                              : cat === 'Keluarga'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {cat}
                          </span>
                          <span>{item.alasanAbsensi || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold text-slate-700 dark:text-slate-300">
                          {item.lamanyaIzin || `${item.jumlah || 1} Hari`}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap text-[11px] text-slate-500">
                          {item.pengawasMengetahui || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {item.lampiran && item.lampiran !== '-' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onPreviewPhoto) onPreviewPhoto(item.lampiran, `Surat / Bukti Izin - ${item.name}`);
                                else window.open(item.lampiran, '_blank');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Lihat Surat</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
