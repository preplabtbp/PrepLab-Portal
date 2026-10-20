import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  ImageDown, 
  Users, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Bed, 
  UserCheck, 
  ChevronRight, 
  ChevronDown, 
  FileSpreadsheet, 
  RefreshCw, 
  Building2, 
  TrendingUp, 
  Award,
  Sparkles,
  Search,
  Filter,
  Eye,
  Stethoscope
} from 'lucide-react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { normalizeSectionName, type ClinicVisit } from './clinic-screen';

export interface EmployeeMaster {
  nik: string;
  name: string;
  section?: string;
  department?: string;
  jabatan?: string;
  pt?: string;
  statusKaryawan?: string;
}

interface ClinicMonthlyDiagramSheetProps {
  visits: ClinicVisit[];
  employees: EmployeeMaster[];
  onSelectVisit?: (visit: ClinicVisit) => void;
  onBackToTable?: () => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

// Fallback jumlah karyawan riil per section jika database karyawan offline / partial
const FALLBACK_SECTION_EMPLOYEE_COUNTS: Record<string, number> = {
  'Administration': 3,
  'Preparation': 115,
  'Laboratory': 54,
  'Maintenance': 16,
  'Quality Assurance': 2,
  'Inventory Control': 2,
  'HSE / Safety': 2,
  'Manager': 1,
  'General': 5
};

// Urutan prioritas tampilan section dalam laporan eksekutif
const ORDERED_SECTIONS = [
  'Administration',
  'Preparation',
  'Laboratory',
  'Maintenance',
  'Quality Assurance',
  'Inventory Control',
  'HSE / Safety',
  'Manager',
  'General'
];

// Format persentase ala standar Indonesia (e.g. 100% atau 33,3%)
function formatPct(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0%';
  const rounded = Math.round(val * 10) / 10;
  return String(rounded).replace('.', ',') + '%';
}

export function ClinicMonthlyDiagramSheet({
  visits,
  employees,
  onSelectVisit,
  onBackToTable
}: ClinicMonthlyDiagramSheetProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [periodType, setPeriodType] = useState<'monthly' | 'semester'>('monthly');
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [exportingPng, setExportingPng] = useState(false);
  const [viewMode, setViewMode] = useState<'diagram' | 'table'>('diagram');

  const reportRef = useRef<HTMLDivElement>(null);

  // Month prefix string 'YYYY-MM'
  const monthPrefix = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // Filter visits based on selected period: Bulanan atau Periode 6 Bulan (Semester)
  const monthlyVisits = useMemo(() => {
    if (periodType === 'semester') {
      if (selectedSemester === 1) {
        // Semester 1: 1 Januari - 31 Juni
        const start = `${selectedYear}-01-01`;
        const end = `${selectedYear}-06-30`;
        return visits.filter(v => v.visitDate && v.visitDate >= start && v.visitDate <= end);
      } else {
        // Semester 2: 1 Juli - 31 Desember
        const start = `${selectedYear}-07-01`;
        const end = `${selectedYear}-12-31`;
        return visits.filter(v => v.visitDate && v.visitDate >= start && v.visitDate <= end);
      }
    }
    return visits.filter(v => v.visitDate && v.visitDate.startsWith(monthPrefix));
  }, [visits, periodType, selectedSemester, selectedYear, monthPrefix]);

  // Descriptive label for active period
  const periodLabel = useMemo(() => {
    if (periodType === 'semester') {
      return selectedSemester === 1
        ? `1 Januari - 31 Juni ${selectedYear}`
        : `1 Juli - 31 Desember ${selectedYear}`;
    }
    return `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
  }, [periodType, selectedSemester, selectedMonth, selectedYear]);

  const periodBadgeLabel = useMemo(() => {
    if (periodType === 'semester') {
      return `Periode 6 Bulan • Semester ${selectedSemester}`;
    }
    return 'Periode Bulanan';
  }, [periodType, selectedSemester]);

  // Filter active employees (exclude Resign/PHK)
  const activeEmployees = useMemo(() => {
    return employees.filter(e => {
      const st = ((e as any).statusKaryawan || (e as any).status || '').toLowerCase();
      return !st.includes('resign') && !st.includes('phk') && !st.includes('keluar') && !st.includes('non-aktif');
    });
  }, [employees]);

  // Group active employees by normalized section
  const sectionEmployeeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const sec = normalizeSectionName(emp.section || emp.department || 'General');
      counts[sec] = (counts[sec] || 0) + 1;
    });

    // Merge with known fallback if active employees list was empty or missing section
    ORDERED_SECTIONS.forEach(sec => {
      if (!counts[sec] || counts[sec] === 0) {
        counts[sec] = FALLBACK_SECTION_EMPLOYEE_COUNTS[sec] || 0;
      }
    });

    return counts;
  }, [activeEmployees]);

  // Compute per-section clinic visit statistics
  const sectionStats = useMemo(() => {
    // Collect visits per section
    const visitsBySec: Record<string, ClinicVisit[]> = {};
    const visitorsBySec: Record<string, Set<string>> = {};

    monthlyVisits.forEach(v => {
      // Resolve section name from employee master if possible, else from visit record
      let secName = normalizeSectionName(v.section);
      if (v.nik) {
        const emp = employees.find(e => e.nik && e.nik.toUpperCase() === v.nik.toUpperCase());
        if (emp?.section) {
          secName = normalizeSectionName(emp.section);
        }
      }

      if (!visitsBySec[secName]) visitsBySec[secName] = [];
      if (!visitorsBySec[secName]) visitorsBySec[secName] = new Set();

      visitsBySec[secName].push(v);
      visitorsBySec[secName].add(v.nik?.trim().toUpperCase() || v.name.trim().toLowerCase());
    });

    // Build complete statistics array for all known sections
    const allSecNames = Array.from(new Set([...ORDERED_SECTIONS, ...Object.keys(visitsBySec)]));

    const rows = allSecNames.map(section => {
      const totalEmp = sectionEmployeeCounts[section] || (visitorsBySec[section]?.size || 0);
      const visitedList = visitsBySec[section] || [];
      const visitedCount = visitorsBySec[section]?.size || 0;
      const totalVisits = visitedList.length;

      // Percentage: (Karyawan ke Klinik / Total Karyawan) * 100%
      // Contoh: Karyawan pada section Administration Berjumlah 3 Orang dan yang ke klinik 3 Orang maka 100%
      const percentage = totalEmp > 0 ? (visitedCount / totalEmp) * 100 : (visitedCount > 0 ? 100 : 0);

      const restingCount = visitedList.filter(v => {
        const r = (v.recommendation || '').toLowerCase();
        return r.includes('istirahat') || r.includes('rujuk') || r.includes('observasi');
      }).length;

      const fitCount = totalVisits - restingCount;

      return {
        section,
        totalEmp,
        visitedCount,
        totalVisits,
        percentage,
        restingCount,
        fitCount,
        visits: visitedList
      };
    });

    // Sort: Sections with visits first, ordered by percentage desc
    return rows.sort((a, b) => {
      if (b.visitedCount !== a.visitedCount) return b.visitedCount - a.visitedCount;
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      return a.section.localeCompare(b.section);
    });
  }, [monthlyVisits, sectionEmployeeCounts, employees]);

  // Overall KPI Summary
  const summaryKpi = useMemo(() => {
    const totalEmpAll = Object.values(sectionEmployeeCounts).reduce((a, b) => a + b, 0);
    const uniqueVisitorsAll = new Set(monthlyVisits.map(v => v.nik?.trim().toUpperCase() || v.name.trim().toLowerCase())).size;
    const totalVisitsCount = monthlyVisits.length;
    const overallPct = totalEmpAll > 0 ? (uniqueVisitorsAll / totalEmpAll) * 100 : 0;
    const totalResting = monthlyVisits.filter(v => {
      const r = (v.recommendation || '').toLowerCase();
      return r.includes('istirahat') || r.includes('rujuk');
    }).length;

    const highestSec = sectionStats.filter(s => s.visitedCount > 0)[0] || null;

    return {
      totalEmpAll,
      uniqueVisitorsAll,
      totalVisitsCount,
      overallPct,
      totalResting,
      highestSec
    };
  }, [sectionEmployeeCounts, monthlyVisits, sectionStats]);

  // Filtered rows for search query
  const filteredStats = useMemo(() => {
    if (!searchFilter.trim()) return sectionStats;
    const q = searchFilter.toLowerCase().trim();
    return sectionStats.filter(s => s.section.toLowerCase().includes(q));
  }, [sectionStats, searchFilter]);

  // Download high-resolution PNG
  const handleDownloadPng = async () => {
    if (!reportRef.current) return;
    setExportingPng(true);
    const toastId = toast.loading('Menyiapkan gambar Diagram Rekapitulasi Klinik...');
    try {
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        cacheBust: true
      });
      const a = document.createElement('a');
      a.download = periodType === 'semester'
        ? `Diagram_Kunjungan_Klinik_Per_Section_Semester_${selectedSemester}_${selectedYear}.png`
        : `Diagram_Kunjungan_Klinik_Per_Section_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.png`;
      a.href = dataUrl;
      a.click();
      toast.success('Diagram Kunjungan Klinik berhasil diunduh sebagai gambar PNG!', { id: toastId });
    } catch (err) {
      console.error('Download PNG failed:', err);
      toast.error('Gagal mengunduh gambar diagram. Silakan coba lagi.', { id: toastId });
    } finally {
      setExportingPng(false);
    }
  };

  // Download Excel Spreadsheet
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Diagram Rekapitulasi Per Section
      const headerTitle = [
        [`REKAPITULASI DIAGRAM KUNJUNGAN KLINIK PER SECTION - PERIODE ${periodLabel.toUpperCase()}`],
        [`Departemen Preparation & Laboratory • Waktu Cetak: ${new Date().toLocaleString('id-ID')}`],
        []
      ];

      const tableHeader = [
        ['No', 'Section', 'Total Karyawan (Orang)', 'Karyawan ke Klinik (Orang)', 'Persentase Kunjungan (%)', 'Total Kunjungan (Kali)', 'Fit to Work', 'Istirahat / Rujuk', 'Keterangan Status']
      ];

      const tableData = sectionStats.map((s, idx) => [
        idx + 1,
        s.section,
        s.totalEmp,
        s.visitedCount,
        Number(s.percentage.toFixed(1)),
        s.totalVisits,
        s.fitCount,
        s.restingCount,
        s.percentage >= 100 ? '100% Kunjungan Penuh' : s.percentage > 50 ? 'Kunjungan Tinggi' : s.percentage > 0 ? 'Kunjungan Terkendali' : 'Nihil Kunjungan'
      ]);

      const summaryFooter = [
        [],
        ['', 'TOTAL / RATA-RATA', summaryKpi.totalEmpAll, summaryKpi.uniqueVisitorsAll, Number(summaryKpi.overallPct.toFixed(1)), summaryKpi.totalVisitsCount, summaryKpi.totalVisitsCount - summaryKpi.totalResting, summaryKpi.totalResting, '']
      ];

      const wsDiagram = XLSX.utils.aoa_to_sheet([...headerTitle, ...tableHeader, ...tableData, ...summaryFooter]);
      wsDiagram['!cols'] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 24 },
        { wch: 26 },
        { wch: 24 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 25 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDiagram, 'Diagram_Per_Section');

      // Sheet 2: Data Rincian Kunjungan
      const visitHeaders = ['No', 'Tanggal', 'Jam', 'NIK', 'Nama Karyawan', 'Section', 'PT', 'Kategori', 'Alasan / Keluhan', 'Diagnosa', 'Rekomendasi', 'Dokter/Paramedis', 'Catatan'];
      const visitRows = monthlyVisits.map((v, i) => [
        i + 1,
        v.visitDate,
        v.visitTime,
        v.nik,
        v.name,
        v.section || 'General',
        v.pt || 'TBP',
        v.category || '',
        v.reason || '',
        v.diagnosis || '',
        v.recommendation || 'Fit to Work',
        v.doctorOrMedicName || '',
        v.notes || ''
      ]);

      const wsVisits = XLSX.utils.aoa_to_sheet([visitHeaders, ...visitRows]);
      wsVisits['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 28 }, { wch: 20 },
        { wch: 8 }, { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(wb, wsVisits, 'Data_Kunjungan_Bulanan');

      XLSX.writeFile(wb, periodType === 'semester'
        ? `Rekap_Diagram_Klinik_Per_Section_Semester_${selectedSemester}_${selectedYear}.xlsx`
        : `Rekap_Diagram_Klinik_Per_Section_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.xlsx`);
      toast.success('File Excel Diagram Kunjungan Klinik berhasil diunduh!');
    } catch (e) {
      console.error('Export Excel failed:', e);
      toast.error('Gagal mengekspor file Excel');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Control Toolbar: Bulan, Tahun, Search & Ekspor Buttons */}
      <div 
        className="p-4 rounded-3xl border shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 transition-all"
        style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
      >
        {/* Month & Year Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector: Bulanan vs Periode 6 Bulan */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPeriodType('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodType === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('semester')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodType === 'semester'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Periode 6 Bulan
            </button>
          </div>

          {periodType === 'monthly' ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300 font-black text-xs">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Bulan:</span>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white cursor-pointer hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSemester(1)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedSemester === 1
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/20'
                    : 'bg-white border border-slate-300 text-slate-700 hover:border-teal-400'
                }`}
              >
                1. 1 Jan - 31 Jun
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester(2)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedSemester === 2
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/20'
                    : 'bg-white border border-slate-300 text-slate-700 hover:border-teal-400'
                }`}
              >
                2. 1 Jul - 31 Des
              </button>
            </div>
          )}

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white cursor-pointer hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* View Toggle Mode */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('diagram')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'diagram'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Diagram Batang
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tabel Rekap
            </button>
          </div>
        </div>

        {/* Action Buttons: Download PNG & Export Excel */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={exportingPng}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="Unduh Laporan Diagram sebagai gambar PNG berkualitas tinggi"
          >
            {exportingPng ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyiapkan PNG...</span>
              </>
            ) : (
              <>
                <ImageDown className="w-4 h-4" />
                <span>Download PNG</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs transition-all cursor-pointer shadow-xs"
            title="Unduh Spreadsheet Rekap Diagram & Data Kunjungan (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Quick Selector: Pills Bulanan ATAU Banner 6 Bulan */}
      {periodType === 'monthly' ? (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {MONTH_SHORT.map((m, idx) => {
            const mNum = idx + 1;
            const isActive = selectedMonth === mNum;
            return (
              <button
                key={mNum}
                type="button"
                onClick={() => setSelectedMonth(mNum)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30 ring-2 ring-teal-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedSemester(1)}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              selectedSemester === 1
                ? 'bg-teal-50 border-teal-500 shadow-xs ring-2 ring-teal-500/20 text-teal-950'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono font-black uppercase text-teal-700 block">
                Semester 1 (6 Bulan)
              </span>
              <span className="text-sm font-black text-slate-950">
                1 Januari — 31 Juni {selectedYear}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
              selectedSemester === 1 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {selectedSemester === 1 ? 'Aktif' : 'Pilih'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSemester(2)}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              selectedSemester === 2
                ? 'bg-teal-50 border-teal-500 shadow-xs ring-2 ring-teal-500/20 text-teal-950'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono font-black uppercase text-teal-700 block">
                Semester 2 (6 Bulan)
              </span>
              <span className="text-sm font-black text-slate-950">
                1 Juli — 31 Desember {selectedYear}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
              selectedSemester === 2 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {selectedSemester === 2 ? 'Aktif' : 'Pilih'}
            </span>
          </button>
        </div>
      )}

      {/* 2. EXPORTABLE REPORT CANVAS (Wrapped for PNG Generation) */}
      <div 
        ref={reportRef} 
        className="p-5 sm:p-7 rounded-3xl border shadow-sm space-y-6 transition-all bg-white text-slate-900"
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        {/* Printable Official Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300">
                  Modul Kunjungan Klinik
                </span>
                <span className="text-xs font-bold text-slate-500">
                  • {periodBadgeLabel}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 mt-1">
                Diagram Kunjungan Klinik Per Section — {periodLabel}
              </h2>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Rekapitulasi rasio karyawan berobat & persentase kunjungan terhadap total karyawan per section
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-xs font-bold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status Analisis</span>
            <span className="text-teal-700 font-black">{summaryKpi.uniqueVisitorsAll} Orang / {summaryKpi.totalVisitsCount} Kunjungan</span>
            <span className="text-[10px] font-mono text-slate-500">Prep & Lab Dept</span>
          </div>
        </div>

        {/* 3. Executive KPI Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Tile 1: Total Karyawan Dept */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-[11px] font-black uppercase tracking-wider">Total Karyawan</span>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-950">
                {summaryKpi.totalEmpAll}
              </span>
              <span className="text-xs font-bold text-slate-600">Orang</span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">Personil aktif lintas section</p>
          </div>

          {/* Tile 2: Karyawan ke Klinik */}
          <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/50 relative overflow-hidden">
            <div className="flex items-center justify-between text-teal-900">
              <span className="text-[11px] font-black uppercase tracking-wider">Karyawan ke Klinik</span>
              <Stethoscope className="w-4 h-4 text-teal-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-teal-950">
                {summaryKpi.uniqueVisitorsAll}
              </span>
              <span className="text-xs font-bold text-teal-800">
                Orang ({summaryKpi.totalVisitsCount}x)
              </span>
            </div>
            <p className="text-[10px] text-teal-700 font-semibold mt-1">
              Tercatat berobat di {periodLabel}
            </p>
          </div>

          {/* Tile 3: Rata-Rata Persentase Kunjungan */}
          <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 relative overflow-hidden">
            <div className="flex items-center justify-between text-indigo-900">
              <span className="text-[11px] font-black uppercase tracking-wider">Persentase Kunjungan</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-950">
                {formatPct(summaryKpi.overallPct)}
              </span>
              <span className="text-xs font-bold text-indigo-800">
                Rasio Dept
              </span>
            </div>
            <p className="text-[10px] text-indigo-700 font-semibold mt-1">Kunjungan personil ke klinik</p>
          </div>

          {/* Tile 4: Istirahat di Mess / Rujuk */}
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 relative overflow-hidden">
            <div className="flex items-center justify-between text-amber-900">
              <span className="text-[11px] font-black uppercase tracking-wider">Istirahat di Mess</span>
              <Bed className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-950">
                {summaryKpi.totalResting}
              </span>
              <span className="text-xs font-bold text-amber-800">
                Kasus Izin
              </span>
            </div>
            <p className="text-[10px] text-amber-700 font-semibold mt-1">Rekomendasi observasi / rest</p>
          </div>
        </div>

        {/* 4. VISUAL DIAGRAM BATANG PER SECTION */}
        {viewMode === 'diagram' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Diagram Batang Persentase Kunjungan Per Section
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                (Karyawan ke Klinik / Total Karyawan) × 100%
              </span>
            </div>

            {/* List Diagram Bar Cards */}
            <div className="space-y-3">
              {filteredStats.map((item, idx) => {
                const isHigh = item.percentage >= 100;
                const isMedium = item.percentage >= 50 && item.percentage < 100;
                const isLow = item.percentage > 0 && item.percentage < 50;
                const isZero = item.percentage === 0;

                // Color Themes based on visit rate
                let barColor = 'from-slate-300 to-slate-400';
                let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
                let pctTextClass = 'text-slate-700';

                if (isHigh) {
                  barColor = 'from-rose-500 to-orange-500';
                  badgeClass = 'bg-rose-50 text-rose-700 border-rose-300';
                  pctTextClass = 'text-rose-700';
                } else if (isMedium) {
                  barColor = 'from-amber-500 to-yellow-500';
                  badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
                  pctTextClass = 'text-amber-800';
                } else if (isLow) {
                  barColor = 'from-teal-500 to-emerald-500';
                  badgeClass = 'bg-teal-50 text-teal-800 border-teal-300';
                  pctTextClass = 'text-teal-800';
                }

                const isExpanded = expandedSection === item.section;

                return (
                  <div
                    key={item.section}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 hover:shadow-sm transition-all"
                  >
                    {/* Header Row: Section Name, Counts & Percentage */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-200 font-mono font-black text-xs text-slate-700 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-950">
                              {item.section}
                            </span>
                            {/* Special Highlight for Administration or 100% */}
                            {isHigh && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                100% Kunjungan
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            Total Karyawan Section: <strong className="text-slate-900 font-bold">{item.totalEmp} Orang</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right Metric Tag */}
                      <div className="flex items-center gap-2 sm:self-center self-start">
                        <div className="text-right">
                          <div className="flex items-baseline gap-1.5 justify-end">
                            <span className={`text-lg font-black font-mono ${pctTextClass}`}>
                              {formatPct(item.percentage)}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              ({item.visitedCount} / {item.totalEmp} Orang)
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            {item.totalVisits} kali kunjungan • {item.fitCount} Fit, {item.restingCount} Istirahat
                          </div>
                        </div>

                        {/* Expand Button for details */}
                        {item.totalVisits > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedSection(isExpanded ? null : item.section)}
                            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-all cursor-pointer ml-1"
                            title="Lihat rincian personil yang berkunjung"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visual Bar Gauge Track */}
                    <div className="relative w-full h-4 bg-slate-200/80 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500 relative`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      >
                        {/* Glow stripe inside progress */}
                        {item.percentage > 10 && (
                          <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Drill-down: List of visiting employees from this section */}
                    {isExpanded && item.visits.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 animate-in fade-in duration-200">
                        <span className="text-xs font-bold text-slate-700 block mb-1">
                          Daftar Kunjungan Klinik Section {item.section} ({item.visits.length} Kunjungan):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {item.visits.map((vis, vIdx) => (
                            <div
                              key={vis.id || vIdx}
                              onClick={() => onSelectVisit && onSelectVisit(vis)}
                              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between font-bold text-slate-900">
                                <span className="truncate max-w-[150px]">{vis.name}</span>
                                <span className="text-[10px] font-mono text-slate-500">{vis.visitDate}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 truncate">
                                NIK: {vis.nik}
                              </div>
                              <div className="text-[11px] text-slate-700 truncate">
                                Keluhan: <em>{vis.reason || '-'}</em>
                              </div>
                              <div className="flex items-center justify-between text-[10px] pt-1">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                                  {vis.category || 'Keluhan Sakit'}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded font-black ${
                                  (vis.recommendation || '').toLowerCase().includes('istirahat')
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-900'
                                }`}>
                                  {vis.recommendation || 'Fit'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. TABEL REKAPITULASI DETAIL PER SECTION */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Tabel Rincian Kunjungan Per Section — {periodLabel}
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total {filteredStats.length} Section Terdata
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-900 font-black">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-3 text-center">Total Karyawan</th>
                  <th className="py-3 px-3 text-center">Karyawan ke Klinik</th>
                  <th className="py-3 px-4 text-center">Persentase Kunjungan</th>
                  <th className="py-3 px-3 text-center">Total Kunjungan</th>
                  <th className="py-3 px-3 text-center">Fit to Work</th>
                  <th className="py-3 px-3 text-center">Istirahat/Rujuk</th>
                  <th className="py-3 px-4 text-center">Keterangan Evaluasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredStats.map((item, idx) => (
                  <tr 
                    key={item.section}
                    className="hover:bg-teal-50/30 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-950 flex items-center gap-2">
                      <span>{item.section}</span>
                      {item.percentage >= 100 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          100%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {item.totalEmp} Orang
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-teal-800">
                      {item.visitedCount} Orang
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-black text-xs border ${
                        item.percentage >= 100
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : item.percentage >= 50
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : item.percentage > 0
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {formatPct(item.percentage)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {item.totalVisits}x
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-800 font-bold">
                      {item.fitCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-800 font-bold">
                      {item.restingCount}
                    </td>
                    <td className="py-3 px-4 text-center text-[11px]">
                      {item.percentage >= 100 ? (
                        <span className="text-rose-700 font-bold">Semua Karyawan Berkunjung (100%)</span>
                      ) : item.percentage > 50 ? (
                        <span className="text-amber-800 font-semibold">Tingkat Kunjungan Tinggi</span>
                      ) : item.percentage > 0 ? (
                        <span className="text-teal-800 font-semibold">Kunjungan Terkendali</span>
                      ) : (
                        <span className="text-slate-400 font-semibold">Nihil Kunjungan (Sehat)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-950 border-t-2 border-slate-300">
                  <td colSpan={2} className="py-3 px-4 text-left">
                    TOTAL KESELURUHAN (ALL SECTIONS)
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {summaryKpi.totalEmpAll} Orang
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-teal-800">
                    {summaryKpi.uniqueVisitorsAll} Orang
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-indigo-900">
                    {formatPct(summaryKpi.overallPct)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {summaryKpi.totalVisitsCount}x
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-800">
                    {summaryKpi.totalVisitsCount - summaryKpi.totalResting}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-amber-800">
                    {summaryKpi.totalResting}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500 font-bold">
                    Rasio Dept {formatPct(summaryKpi.overallPct)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer Notes & Legal Verification for Exported Document */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div>
            Laporan resmi rekapitulasi data kunjungan klinik PT Wanatiara Persada • Prep & Lab Department.
          </div>
          <div className="font-mono">
            Diekspor pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}
