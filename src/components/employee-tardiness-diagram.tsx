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
  FileSpreadsheet
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { TardinessRecord, formatTardinessDateIndo } from './employee-tardiness-screen';
import { parseGolonganLevel, checkIsGolonganI } from './RosterLeaveScheduleSheet';

interface Props {
  records: TardinessRecord[];
  defaultSection?: string;
  onPreviewPhoto?: (url: string, title: string) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Color palette
const COLORS = {
  amber: '#F59E0B',
  amberDark: '#D97706',
  indigo: '#6366F1',
  indigoDark: '#4F46E5',
  rose: '#F43F5E',
  emerald: '#10B981',
  teal: '#0D9488',
  slate: '#64748B',
  purple: '#8B5CF6'
};

const SECTION_COLORS: Record<string, string> = {
  Preparation: '#F59E0B',
  Laboratory: '#0D9488',
  Maintenance: '#6366F1',
  Administration: '#8B5CF6',
  Lainnya: '#94A3B8'
};

const SHIFT_COLORS: Record<string, string> = {
  'Shift A': '#10B981',
  'Shift B': '#3B82F6',
  'Nonshift': '#8B5CF6'
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

export function EmployeeTardinessDiagram({
  records,
  defaultSection = 'ALL',
  onPreviewPhoto
}: Props) {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Tab mode: 'week' | 'month' | 'year' | 'all'
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year' | 'all'>('week');

  // Filters inside diagram
  const [selectedSection, setSelectedSection] = useState(defaultSection);
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [selectedGolongan, setSelectedGolongan] = useState<'ALL' | 'STAFF' | 'CREW'>('ALL');
  const [searchTable, setSearchTable] = useState('');
  const [filterTableStatus, setFilterTableStatus] = useState<'ALL' | 'Masuk' | 'Pulang' | 'Warning'>('ALL');

  // Master employees data for Golongan detection
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-master-lite'],
    queryFn: async (): Promise<any[]> => {
      const r = await fetch('/api/employees');
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const empByNik = useMemo(() => new Map(employees.map((e: any) => [String(e.nik || '').trim().toUpperCase(), e])), [employees]);
  const empByName = useMemo(() => new Map(employees.map((e: any) => [String(e.nama || '').trim().toLowerCase(), e])), [employees]);

  const isStaff = (r: TardinessRecord): boolean => {
    const emp = (r.nik ? empByNik.get(r.nik.trim().toUpperCase()) : null) || empByName.get(r.name.trim().toLowerCase());
    if (emp) {
      if (checkIsGolonganI(emp)) return false;
      const lvl = parseGolonganLevel(emp.gol || emp.golongan || emp.jobGrade, emp.jabatan || r.jabatan);
      return lvl >= 2;
    }
    if (checkIsGolonganI({ jabatan: r.jabatan })) return false;
    const lvl = parseGolonganLevel(null, r.jabatan);
    return lvl >= 2;
  };

  const isCrew = (r: TardinessRecord): boolean => !isStaff(r);

  // Week Mode State (Monday - Sunday)
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    if (records.length > 0 && records[0].tanggal) {
      const d = new Date(records[0].tanggal);
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });

  // Month Mode State
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.tanggal && r.tanggal.length >= 7) {
        set.add(r.tanggal.slice(0, 7));
      }
    });
    const arr = Array.from(set).sort().reverse();
    if (arr.length === 0) arr.push(new Date().toISOString().slice(0, 7));
    return arr;
  }, [records]);

  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => {
    return availableMonths[0] || new Date().toISOString().slice(0, 7);
  });

  // Year Mode State
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.tanggal && r.tanggal.length >= 4) {
        set.add(r.tanggal.slice(0, 4));
      }
    });
    const arr = Array.from(set).sort().reverse();
    const curYear = String(new Date().getFullYear());
    if (!arr.includes(curYear)) arr.unshift(curYear);
    return arr;
  }, [records]);

  const [selectedYearStr, setSelectedYearStr] = useState<string>(() => {
    return availableYears[0] || String(new Date().getFullYear());
  });

  // Filter records by Section, Shift & Golongan (Staff / Crew)
  const baseFiltered = useMemo(() => {
    let result = records;
    if (selectedSection !== 'ALL') {
      result = result.filter(r => (r.section || '').toLowerCase().includes(selectedSection.toLowerCase()));
    }
    if (selectedShift !== 'ALL') {
      result = result.filter(r => (r.shift || '').toLowerCase().includes(selectedShift.toLowerCase()));
    }
    if (selectedGolongan === 'STAFF') {
      result = result.filter(r => isStaff(r));
    } else if (selectedGolongan === 'CREW') {
      result = result.filter(r => isCrew(r));
    }
    return result;
  }, [records, selectedSection, selectedShift, selectedGolongan, empByNik, empByName]);

  // Pre-calculate monthly tardiness count for warning check (Key: `${name.toLowerCase()}__${month}`)
  const monthlyTardinessCountMap = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      // count only status 'Masuk' (late) or all incidents
      if (r.name && r.tanggal && r.statusFinger === 'Masuk') {
        const month = r.tanggal.slice(0, 7);
        const key = `${r.name.trim().toLowerCase()}__${month}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [records]);

  // Helper to check if a record's employee has >= 4 late days in that month
  const getRecordMonthlyLateCount = (r: TardinessRecord): number => {
    if (!r.name || !r.tanggal) return 0;
    const month = r.tanggal.slice(0, 7);
    const key = `${r.name.trim().toLowerCase()}__${month}`;
    return monthlyTardinessCountMap.get(key) || 0;
  };

  // 1. DATA FOR WEEK MODE (Senin - Minggu)
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

  const weekStartDateStr = formatDateISO(currentMonday);
  const weekEndDateStr = formatDateISO(weekSunday);

  const weekRecords = useMemo(() => {
    return baseFiltered.filter(r => r.tanggal && r.tanggal >= weekStartDateStr && r.tanggal <= weekEndDateStr);
  }, [baseFiltered, weekStartDateStr, weekEndDateStr]);

  const weekChartData = useMemo(() => {
    return weekDays.map(({ dayName, dateStr, dayNumber, monthShort }) => {
      const dayRecs = weekRecords.filter(r => r.tanggal === dateStr);
      let masuk = 0;
      let pulang = 0;
      dayRecs.forEach(r => {
        if (r.statusFinger === 'Pulang') pulang++;
        else masuk++;
      });
      return {
        name: `${dayName} (${dayNumber} ${monthShort})`,
        dayName,
        dateStr,
        'Terlambat Masuk': masuk,
        'Pulang Cepat': pulang,
        total: masuk + pulang
      };
    });
  }, [weekDays, weekRecords]);

  // 2. DATA FOR MONTH MODE
  const monthRecords = useMemo(() => {
    return baseFiltered.filter(r => r.tanggal && r.tanggal.startsWith(selectedMonthStr));
  }, [baseFiltered, selectedMonthStr]);

  const monthChartData = useMemo(() => {
    // Breakdown by 4-5 weeks of the month, or by date groups
    const [yStr, mStr] = selectedMonthStr.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const numDays = new Date(year, month + 1, 0).getDate();

    // Group into 4 periods (1-7, 8-14, 15-21, 22-end) or daily
    const periods = [
      { name: 'Minggu I (Tgl 1-7)', start: 1, end: 7, masuk: 0, pulang: 0 },
      { name: 'Minggu II (Tgl 8-14)', start: 8, end: 14, masuk: 0, pulang: 0 },
      { name: 'Minggu III (Tgl 15-21)', start: 15, end: 21, masuk: 0, pulang: 0 },
      { name: `Minggu IV (Tgl 22-${numDays})`, start: 22, end: numDays, masuk: 0, pulang: 0 }
    ];

    monthRecords.forEach(r => {
      if (!r.tanggal) return;
      const day = parseInt(r.tanggal.slice(8, 10), 10);
      const isPulang = r.statusFinger === 'Pulang';
      for (const p of periods) {
        if (day >= p.start && day <= p.end) {
          if (isPulang) p.pulang++;
          else p.masuk++;
          break;
        }
      }
    });

    return periods.map(p => ({
      name: p.name,
      'Terlambat Masuk': p.masuk,
      'Pulang Cepat': p.pulang,
      total: p.masuk + p.pulang
    }));
  }, [monthRecords, selectedMonthStr]);

  // 3. DATA FOR YEAR MODE
  const yearRecords = useMemo(() => {
    return baseFiltered.filter(r => r.tanggal && r.tanggal.startsWith(selectedYearStr));
  }, [baseFiltered, selectedYearStr]);

  const yearChartData = useMemo(() => {
    return MONTH_NAMES.map((mName, idx) => {
      const monthPrefix = `${selectedYearStr}-${String(idx + 1).padStart(2, '0')}`;
      const recs = yearRecords.filter(r => r.tanggal && r.tanggal.startsWith(monthPrefix));
      let masuk = 0;
      let pulang = 0;
      recs.forEach(r => {
        if (r.statusFinger === 'Pulang') pulang++;
        else masuk++;
      });
      return {
        name: mName.slice(0, 3),
        monthFullName: mName,
        'Terlambat Masuk': masuk,
        'Pulang Cepat': pulang,
        total: masuk + pulang
      };
    });
  }, [yearRecords, selectedYearStr]);

  // Active records based on current viewMode
  const activeRecords = useMemo(() => {
    if (viewMode === 'week') return weekRecords;
    if (viewMode === 'month') return monthRecords;
    if (viewMode === 'year') return yearRecords;
    return baseFiltered;
  }, [viewMode, weekRecords, monthRecords, yearRecords, baseFiltered]);

  // Summary Metrics for active period
  const activeMetrics = useMemo(() => {
    let masuk = 0;
    let pulang = 0;
    const warningEmpSet = new Set<string>();

    activeRecords.forEach(r => {
      if (r.statusFinger === 'Pulang') pulang++;
      else masuk++;

      const lateCount = getRecordMonthlyLateCount(r);
      if (lateCount >= 4) {
        warningEmpSet.add(r.name);
      }
    });

    return {
      total: activeRecords.length,
      masuk,
      pulang,
      warningCount: warningEmpSet.size,
      warningEmpList: Array.from(warningEmpSet)
    };
  }, [activeRecords]);

  // Section distribution for pie chart
  const sectionPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeRecords.forEach(r => {
      const sec = r.section || 'Preparation';
      counts[sec] = (counts[sec] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [activeRecords]);

  // Shift distribution for pie chart
  const shiftPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeRecords.forEach(r => {
      const sh = r.shift || 'Nonshift';
      counts[sh] = (counts[sh] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [activeRecords]);

  // Top Late Employees in active period
  const topLateEmployees = useMemo(() => {
    const counts: Record<string, { name: string; section: string; shift: string; masuk: number; pulang: number }> = {};
    activeRecords.forEach(r => {
      if (!counts[r.name]) {
        counts[r.name] = {
          name: r.name,
          section: r.section || 'Preparation',
          shift: r.shift || 'Nonshift',
          masuk: 0,
          pulang: 0
        };
      }
      if (r.statusFinger === 'Pulang') counts[r.name].pulang++;
      else counts[r.name].masuk++;
    });

    return Object.values(counts)
      .sort((a, b) => (b.masuk + b.pulang) - (a.masuk + a.pulang))
      .slice(0, 5);
  }, [activeRecords]);

  // Filtered List Table for this period
  const tableFilteredRecords = useMemo(() => {
    let list = [...activeRecords];

    if (filterTableStatus === 'Masuk') {
      list = list.filter(r => r.statusFinger === 'Masuk');
    } else if (filterTableStatus === 'Pulang') {
      list = list.filter(r => r.statusFinger === 'Pulang');
    } else if (filterTableStatus === 'Warning') {
      list = list.filter(r => getRecordMonthlyLateCount(r) >= 4);
    }

    if (searchTable.trim()) {
      const q = searchTable.toLowerCase().trim();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.section && r.section.toLowerCase().includes(q)) ||
        (r.alasan && r.alasan.toLowerCase().includes(q)) ||
        (r.shift && r.shift.toLowerCase().includes(q)) ||
        (r.tanggal && r.tanggal.includes(q))
      );
    }

    // Sort by date desc
    list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    return list;
  }, [activeRecords, filterTableStatus, searchTable]);

  // Export Diagram to PNG
  const handleExportPng = async () => {
    if (!diagramRef.current) return;
    try {
      setIsExporting(true);
      const toastId = toast.loading('Memproses gambar diagram resolusi tinggi...');
      const dataUrl = await toPng(diagramRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF'
      });
      const link = document.createElement('a');
      link.download = `Diagram_Keterlambatan_${viewMode.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Diagram berhasil diunduh sebagai gambar PNG!', { id: toastId });
    } catch (err: any) {
      toast.error('Gagal mengekspor diagram: ' + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  // Week navigation
  const prevWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() - 7);
    setCurrentMonday(d);
  };

  const nextWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + 7);
    setCurrentMonday(d);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROL BAR ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        {/* Mode Switcher Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          {[
            { id: 'week', label: 'Rekapan Per Minggu', icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'month', label: 'Rekapan Per Bulan', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'year', label: 'Rekapan Per Tahun', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'all', label: 'Semua Rekapan', icon: <Layers className="w-3.5 h-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                viewMode === tab.id
                  ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Date / Period Selector based on mode */}
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
                {formatTardinessDateIndo(weekStartDateStr)} s/d {formatTardinessDateIndo(weekEndDateStr)}
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

          {/* Section Filter */}
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
          </select>

          {/* Shift Filter */}
          <select
            value={selectedShift}
            onChange={e => setSelectedShift(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Shift</option>
            <option value="Shift A">Shift A</option>
            <option value="Shift B">Shift B</option>
            <option value="Nonshift">Nonshift</option>
          </select>

          {/* Golongan Filter: Staff (Gol II-V) vs Crew (Gol I) */}
          <select
            value={selectedGolongan}
            onChange={e => setSelectedGolongan(e.target.value as any)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer font-bold"
            title="Filter Golongan: Staff (Gol II-V) / Crew (Gol I)"
          >
            <option value="ALL">Semua Golongan</option>
            <option value="STAFF">Staff (Gol II-V)</option>
            <option value="CREW">Crew (Gol I)</option>
          </select>

          {/* Export PNG */}
          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Download Diagram sebagai Gambar PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PNG</span>
          </button>
        </div>
      </div>

      {/* ── KANVAS DIAGRAM (READY FOR PNG EXPORT) ── */}
      <div 
        ref={diagramRef} 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6"
      >
        {/* Diagram Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Sheet Diagram Eksekutif
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-500">
                {viewMode === 'week' ? `Periode Minggu (${formatTardinessDateIndo(weekStartDateStr)} - ${formatTardinessDateIndo(weekEndDateStr)})` :
                 viewMode === 'month' ? `Periode Bulan ${MONTH_NAMES[parseInt(selectedMonthStr.split('-')[1], 10) - 1]} ${selectedMonthStr.split('-')[0]}` :
                 viewMode === 'year' ? `Periode Tahun ${selectedYearStr}` : 'Seluruh Database'}
              </span>
              {selectedGolongan !== 'ALL' && (
                <>
                  <span className="text-xs text-slate-400">·</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    selectedGolongan === 'STAFF'
                      ? 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {selectedGolongan === 'STAFF' ? 'Staff (Gol II-V)' : 'Crew (Gol I)'}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              Diagram Analitik Keterlambatan &amp; Pulang Cepat
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
              <span>Terlambat Masuk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
              <span>Pulang Cepat</span>
            </div>
          </div>
        </div>

        {/* ── KPI MINI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Laporan</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {activeMetrics.total} <span className="text-xs font-semibold text-slate-400">kasus</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pada periode terpilih</div>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Terlambat Masuk</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {activeMetrics.masuk} <span className="text-xs font-semibold text-amber-600/70">kali</span>
            </div>
            <div className="text-[11px] text-amber-600/80 mt-0.5">
              {activeMetrics.total > 0 ? Math.round((activeMetrics.masuk / activeMetrics.total) * 100) : 0}% dari total laporan
            </div>
          </div>

          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Pulang Cepat</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {activeMetrics.pulang} <span className="text-xs font-semibold text-indigo-600/70">kali</span>
            </div>
            <div className="text-[11px] text-indigo-600/80 mt-0.5">
              {activeMetrics.total > 0 ? Math.round((activeMetrics.pulang / activeMetrics.total) * 100) : 0}% dari total laporan
            </div>
          </div>

          <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Warning (&gt;= 4x Terlambat)</span>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {activeMetrics.warningCount} <span className="text-xs font-semibold text-rose-600/70">personil</span>
            </div>
            <div className="text-[11px] text-rose-600/80 mt-0.5">Perlu evaluasi / SP HR</div>
          </div>
        </div>

        {/* ── CHARTS ROW: MAIN BAR CHART + SECTION & SHIFT PIE CHARTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart */}
          <div className="lg:col-span-2 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                {viewMode === 'week' ? 'Tren Keterlambatan Harian (Senin - Minggu)' :
                 viewMode === 'month' ? 'Distribusi Mingguan di Bulan Terpilih' :
                 viewMode === 'year' ? `Distribusi Bulanan Tahun ${selectedYearStr}` : 'Rekapan Keseluruhan'}
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
                  <Bar dataKey="Terlambat Masuk" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pulang Cepat" fill={COLORS.indigo} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section & Shift Pie Charts */}
          <div className="flex flex-col gap-4">
            {/* Section Distribution */}
            <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Distribusi Section
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

            {/* Top Late Personnel */}
            <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span>Top Karyawan Terlambat</span>
                <span className="text-[10px] text-slate-400">Periode ini</span>
              </div>
              <div className="space-y-1.5">
                {topLateEmployees.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Tidak ada catatan</p>
                ) : (
                  topLateEmployees.map((emp, i) => {
                    const isWarn = emp.masuk >= 4;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] inline-flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                            {emp.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isWarn && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700">
                              ⚠️ &gt;=4x
                            </span>
                          )}
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {emp.masuk + emp.pulang}x
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION DAFTAR KARYAWAN PADA PERIODE TERPILIH ── */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-600" />
                <span>Daftar Karyawan Terlambat &amp; Pulang Cepat ({tableFilteredRecords.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Rincian detail personil untuk periode {viewMode === 'week' ? 'Mingguan' : viewMode === 'month' ? 'Bulanan' : 'Tahunan'} yang dipilih
              </p>
            </div>

            {/* Quick table filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
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

              {/* Status Tabs */}
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'Masuk', label: 'Terlambat' },
                  { id: 'Pulang', label: 'Pulang Cepat' },
                  { id: 'Warning', label: '⚠️ Warning >=4x' }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setFilterTableStatus(b.id as any)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      filterTableStatus === b.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3">Tanggal &amp; Waktu</th>
                  <th className="py-2.5 px-4">Nama Karyawan</th>
                  <th className="py-2.5 px-3 text-center">Section</th>
                  <th className="py-2.5 px-3 text-center">Shift</th>
                  <th className="py-2.5 px-3 text-center">Kategori</th>
                  <th className="py-2.5 px-4">Alasan</th>
                  <th className="py-2.5 px-3 text-center">Evaluasi Bulan Ini</th>
                  <th className="py-2.5 px-3 text-center">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tableFilteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      Tidak ada catatan karyawan pada periode / filter ini
                    </td>
                  </tr>
                ) : (
                  tableFilteredRecords.map((r, idx) => {
                    const isPulang = r.statusFinger === 'Pulang';
                    const monthlyLateCount = getRecordMonthlyLateCount(r);
                    const isWarning = monthlyLateCount >= 4;

                    return (
                      <tr 
                        key={r.id || idx}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isWarning ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatTardinessDateIndo(r.tanggal)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {r.waktuFinger || '-'}
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {r.name}
                            </span>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                              isStaff(r)
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
                            }`}>
                              {isStaff(r) ? 'Staff (Gol II-V)' : 'Crew (Gol I)'}
                            </span>
                          </div>
                          {r.jabatan && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {r.jabatan}
                            </div>
                          )}
                        </td>

                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {r.section || 'Preparation'}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {r.shift || 'Nonshift'}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            isPulang 
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200' 
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPulang ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                            {isPulang ? 'Pulang Cepat' : 'Terlambat Masuk'}
                          </span>
                        </td>

                        <td className="py-2 px-4 max-w-[220px]">
                          <div className="truncate text-slate-600 dark:text-slate-300" title={r.alasan || '-'}>
                            {r.alasan || '-'}
                          </div>
                        </td>

                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {isWarning ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>⚠️ {monthlyLateCount}x (SP / Warning)</span>
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-500">
                              {monthlyLateCount > 0 ? `${monthlyLateCount}x bln ini` : '-'}
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {r.fotoFinger ? (
                            <button
                              type="button"
                              onClick={() => onPreviewPhoto && onPreviewPhoto(r.fotoFinger!, `${r.name} · ${r.statusFinger}`)}
                              className="p-1 rounded-md text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Lihat Bukti Foto"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
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
