import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ExternalLink, 
  FileText, 
  RefreshCw, 
  Sparkles, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Pencil, 
  Trash2, 
  Eye, 
  Image as ImageIcon,
  Building2,
  Layers,
  ArrowUpDown,
  TrendingUp,
  AlertTriangle,
  X,
  Check,
  BarChart3,
  Table as TableIcon,
  Maximize2,
  Minimize2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { EmployeeTardinessDiagram } from './employee-tardiness-diagram';
import DisplayCards, { DisplayCardProps } from './ui/display-cards';
import { MenuTabBackdrop } from './ui/menu-tab-backdrop';
import { useTableColumnResize, ColumnResizeHandle, ColumnDef } from '../hooks/useTableColumnResize';

export const TARDINESS_COLUMNS: ColumnDef[] = [
  { id: 'no', label: 'No', defaultWidth: 55, minWidth: 42, align: 'center' },
  { id: 'tanggal', label: 'Tanggal', defaultWidth: 140, minWidth: 100, align: 'center' },
  { id: 'waktu', label: 'Waktu', defaultWidth: 100, minWidth: 80, align: 'center' },
  { id: 'nama', label: 'Nama Karyawan', defaultWidth: 190, minWidth: 120, align: 'left' },
  { id: 'jabatan', label: 'Jabatan', defaultWidth: 170, minWidth: 110, align: 'center' },
  { id: 'section', label: 'Section', defaultWidth: 140, minWidth: 100, align: 'center' },
  { id: 'shift', label: 'Shift', defaultWidth: 110, minWidth: 85, align: 'center' },
  { id: 'kategori', label: 'Kategori', defaultWidth: 150, minWidth: 110, align: 'center' },
  { id: 'alasan', label: 'Alasan', defaultWidth: 220, minWidth: 130, align: 'center' },
  { id: 'warning', label: 'Status Peringatan', defaultWidth: 220, minWidth: 130, align: 'center' },
  { id: 'bukti', label: 'Bukti Finger', defaultWidth: 130, minWidth: 95, align: 'center' },
  { id: 'aksi', label: 'Aksi', defaultWidth: 90, minWidth: 70, align: 'center' },
];

export interface TardinessRecord {
  id: string | number;
  sheetRowId?: string;
  source: 'google_sheet' | 'web';
  nik?: string;
  name: string;
  jabatan?: string;
  section: string;
  shift: string;
  tanggal: string; // 'YYYY-MM-DD'
  waktuFinger: string; // 'HH:mm'
  statusFinger: 'Masuk' | 'Pulang'; // Masuk = Keterlambatan, Pulang = Pulang Cepat
  fotoFinger?: string;
  alasan?: string;
  acc?: string;
  accBy?: string;
  accAt?: string;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  userProfile?: any;
  inspectorName?: string;
  inspectorNik?: string;
  onNav?: (tab: string) => void;
  onBack?: () => void;
}

const INDO_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export function formatTardinessDateIndo(val?: any): string {
  if (!val || val === '-' || val === '#N/A' || val === '0' || String(val).toLowerCase() === 'null') {
    return '-';
  }
  const pad2 = (n: number) => String(n).padStart(2, '0');

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '-';
    return `${pad2(val.getDate())}-${INDO_MONTHS_SHORT[val.getMonth()]}-${val.getFullYear()}`;
  }

  const clean = String(val).trim();
  const dmyMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dmyMatch) {
    const year = dmyMatch[1];
    const month = parseInt(dmyMatch[2], 10) - 1;
    const day = parseInt(dmyMatch[3], 10);
    return `${pad2(day)}-${INDO_MONTHS_SHORT[month] || dmyMatch[2]}-${year}`;
  }
  return clean;
}

export function EmployeeTardinessScreen({
  userProfile,
  inspectorName = '',
  inspectorNik = '',
  onNav,
  onBack
}: Props) {
  // View tab: 'tabel' | 'diagram'
  // 'landing' = Pusat Menu Tab (3D DisplayCards), sama seperti modul Rekapan Izin & Finger
  const [viewTab, setViewTab] = useState<'landing' | 'tabel' | 'diagram'>('landing');

  // Data state
  const [records, setRecords] = useState<TardinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');

  // Stats
  const [stats, setStats] = useState({
    totalAll: 0,
    totalTerlambat: 0,
    totalPulangCepat: 0,
    totalBulanIni: 0,
    totalHariIni: 0,
    sectionCounts: {} as Record<string, number>,
    shiftCounts: {} as Record<string, number>
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [selectedStatusFinger, setSelectedStatusFinger] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | 'TODAY' | 'MONTH' | 'CUSTOM'>('ALL');
  const [filterWarningOnly, setFilterWarningOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'time-desc'>('date-desc');

  // Table column resize helper
  const resizeHelper = useTableColumnResize({
    tableId: 'employee_tardiness',
    columns: TARDINESS_COLUMNS
  });

  // Inline editing state: { id, field }
  const [editingCell, setEditingCell] = useState<{ id: string | number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Modal preview photo
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoTitle, setPreviewPhotoTitle] = useState('');

  // Modal edit/view detail
  const [editingRecord, setEditingRecord] = useState<TardinessRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Load data from backend
  const loadData = async (forceSync = false) => {
    try {
      if (forceSync) setSyncing(true);
      else setLoading(true);

      const endpoint = forceSync ? '/api/employee-tardiness/sync-sheet' : '/api/employee-tardiness?limit=500';
      const method = forceSync ? 'POST' : 'GET';
      const res = await fetch(endpoint, { method });
      const json = await res.json();

      if (json.status === 'success') {
        if (forceSync) {
          toast.success(json.message || 'Sinkronisasi Google Sheet berhasil.');
          const refRes = await fetch('/api/employee-tardiness?limit=500');
          const refJson = await refRes.json();
          if (refJson.status === 'success') {
            setRecords(refJson.data || []);
            if (refJson.stats) setStats(refJson.stats);
            if (refJson.lastSyncAt) setLastSyncAt(refJson.lastSyncAt);
          }
        } else {
          setRecords(json.data || []);
          if (json.stats) setStats(json.stats);
          if (json.lastSyncAt) setLastSyncAt(json.lastSyncAt);
        }
      } else {
        toast.error(json.message || 'Gagal memuat data keterlambatan.');
      }
    } catch (e: any) {
      toast.error(`Terjadi kesalahan: ${e?.message || e}`);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pre-calculate monthly late count (per employee name & month YYYY-MM) for warning detection (>= 4 days late in a month)
  const monthlyLateCountMap = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      // count only status 'Masuk' (late arrival)
      if (r.name && r.tanggal && r.statusFinger === 'Masuk') {
        const month = r.tanggal.slice(0, 7);
        const key = `${r.name.trim().toLowerCase()}__${month}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [records]);

  // Helper to get monthly late count for a specific record
  const getRecordMonthlyLateCount = (r: TardinessRecord): number => {
    if (!r.name || !r.tanggal) return 0;
    const month = r.tanggal.slice(0, 7);
    const key = `${r.name.trim().toLowerCase()}__${month}`;
    return monthlyLateCountMap.get(key) || 0;
  };

  // Filter shortcuts
  const handlePeriodChange = (period: 'ALL' | 'TODAY' | 'MONTH' | 'CUSTOM') => {
    setSelectedPeriod(period);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (period === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
    } else if (period === 'MONTH') {
      const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      setStartDate(firstDay);
      setEndDate(today);
    } else if (period === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Kartu DisplayCards untuk Landing View Modul Rekapan Keterlambatan & Pulang Cepat
  const tardinessDisplayCards: DisplayCardProps[] = useMemo(() => {
    const masukCount = records.filter(r => r.statusFinger === 'Masuk').length;
    const pulangCount = records.length - masukCount;
    return [
      {
        icon: <TableIcon className="w-4 h-4 text-rose-600" />,
        title: "Tabel Rekapan",
        description: "Rekap terlambat masuk & pulang cepat, dapat diedit seperti Google Sheet",
        date: `${masukCount} Terlambat · ${pulangCount} Pulang Cepat`,
        iconClassName: "bg-slate-100 text-rose-600",
        titleClassName: "text-rose-800",
        onClick: () => setViewTab('tabel')
      },
      {
        icon: <BarChart3 className="w-4 h-4 text-indigo-600" />,
        title: "Diagram & Analitik",
        description: "Rekapan visual per minggu, per bulan & per tahun",
        date: `${records.length} Data Laporan`,
        iconClassName: "bg-slate-100 text-indigo-600",
        titleClassName: "text-indigo-800",
        onClick: () => setViewTab('diagram')
      },
      {
        icon: <FileText className="w-4 h-4 text-amber-600" />,
        title: "Form Keterlambatan",
        description: "Laporkan keterlambatan masuk atau pulang cepat karyawan",
        date: "Form Pelaporan Online",
        iconClassName: "bg-slate-100 text-amber-600",
        titleClassName: "text-amber-800",
        onClick: () => onNav?.('form-keterlambatan')
      }
    ];
  }, [records, onNav]);

  // 1. KPI Card Click Handler (Makes summary cards interactive & filterable)
  const handleKpiCardClick = (type: 'Masuk' | 'Pulang' | 'BulanIni' | 'All') => {
    // If we're on diagram tab, switch to table tab to see filtered data
    if (viewTab !== 'tabel') setViewTab('tabel');

    if (type === 'Masuk') {
      if (selectedStatusFinger === 'Masuk') {
        setSelectedStatusFinger('ALL');
      } else {
        setSelectedStatusFinger('Masuk');
        setSelectedPeriod('ALL');
        setStartDate('');
        setEndDate('');
        setFilterWarningOnly(false);
      }
    } else if (type === 'Pulang') {
      if (selectedStatusFinger === 'Pulang') {
        setSelectedStatusFinger('ALL');
      } else {
        setSelectedStatusFinger('Pulang');
        setSelectedPeriod('ALL');
        setStartDate('');
        setEndDate('');
        setFilterWarningOnly(false);
      }
    } else if (type === 'BulanIni') {
      if (selectedPeriod === 'MONTH') {
        setSelectedPeriod('ALL');
        setStartDate('');
        setEndDate('');
      } else {
        handlePeriodChange('MONTH');
        setSelectedStatusFinger('ALL');
        setFilterWarningOnly(false);
      }
    } else if (type === 'All') {
      setSelectedStatusFinger('ALL');
      setSelectedSection('ALL');
      setSelectedShift('ALL');
      setSelectedPeriod('ALL');
      setStartDate('');
      setEndDate('');
      setSearchTerm('');
      setFilterWarningOnly(false);
    }
  };

  // 2. Inline Cell Update Handler (Direct Google Sheet style inline editing)
  const handleInlineCellUpdate = async (id: string | number, field: string, value: any) => {
    setEditingCell(null);
    const currentRec = records.find(r => r.id === id);
    if (!currentRec || currentRec[field as keyof TardinessRecord] === value) return;

    // Optimistically update state
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

    try {
      const res = await fetch(`/api/employee-tardiness/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Data ${field} berhasil diperbarui.`);
      } else {
        toast.error(json.message || 'Gagal memperbarui sel.');
        // Revert on error
        setRecords(prev => prev.map(r => r.id === id ? currentRec : r));
      }
    } catch (err: any) {
      toast.error('Gagal memperbarui sel: ' + (err?.message || err));
      setRecords(prev => prev.map(r => r.id === id ? currentRec : r));
    }
  };

  const startEditingCell = (id: string | number, field: string, initialVal: any) => {
    setEditingCell({ id, field });
    setEditValue(initialVal || '');
  };

  // Filtered & Sorted items
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (selectedSection !== 'ALL') {
      result = result.filter(r => (r.section || '').toLowerCase().includes(selectedSection.toLowerCase()));
    }

    if (selectedShift !== 'ALL') {
      result = result.filter(r => (r.shift || '').toLowerCase().includes(selectedShift.toLowerCase()));
    }

    if (selectedStatusFinger !== 'ALL') {
      result = result.filter(r => r.statusFinger.toLowerCase() === selectedStatusFinger.toLowerCase());
    }

    if (startDate) {
      result = result.filter(r => (r.tanggal || '') >= startDate);
    }

    if (endDate) {
      result = result.filter(r => (r.tanggal || '') <= endDate);
    }

    if (filterWarningOnly) {
      result = result.filter(r => getRecordMonthlyLateCount(r) >= 4);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(r => 
        r.name.toLowerCase().includes(q) ||
        (r.alasan && r.alasan.toLowerCase().includes(q)) ||
        (r.jabatan && r.jabatan.toLowerCase().includes(q)) ||
        (r.section && r.section.toLowerCase().includes(q)) ||
        (r.shift && r.shift.toLowerCase().includes(q)) ||
        (r.waktuFinger && r.waktuFinger.toLowerCase().includes(q)) ||
        (r.tanggal && r.tanggal.includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        const da = a.tanggal || a.createdAt;
        const db = b.tanggal || b.createdAt;
        return db.localeCompare(da);
      }
      if (sortBy === 'date-asc') {
        const da = a.tanggal || a.createdAt;
        const db = b.tanggal || b.createdAt;
        return da.localeCompare(db);
      }
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'time-desc') {
        return (b.waktuFinger || '').localeCompare(a.waktuFinger || '');
      }
      return 0;
    });

    return result;
  }, [records, selectedSection, selectedShift, selectedStatusFinger, startDate, endDate, filterWarningOnly, searchTerm, sortBy, monthlyLateCountMap]);

  // Total records with >= 4 late days in their month
  const totalWarningRecords = useMemo(() => {
    return records.filter(r => getRecordMonthlyLateCount(r) >= 4).length;
  }, [records, monthlyLateCountMap]);

  // Export Excel with Data sheet & Diagram Summary sheet
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error('Tidak ada data untuk diekspor.');
      return;
    }

    // 1. Data Sheet (Without NIK, with Warning column)
    const rows = filteredRecords.map((r, i) => {
      const lateCount = getRecordMonthlyLateCount(r);
      const isWarn = lateCount >= 4;
      return {
        'No': i + 1,
        'Tanggal': r.tanggal || '-',
        'Waktu Finger': r.waktuFinger || '-',
        'Nama Karyawan': r.name,
        'Jabatan': r.jabatan || '-',
        'Section': r.section,
        'Shift': r.shift,
        'Status Finger': r.statusFinger === 'Pulang' ? 'Pulang Cepat' : 'Keterlambatan (Masuk)',
        'Alasan': r.alasan || '-',
        'Evaluasi Kehadiran': isWarn ? `⚠️ PERINGATAN / SP (${lateCount}x Terlambat bln ini)` : `${lateCount > 0 ? lateCount + 'x Terlambat' : 'Aman'}`,
        'Foto / Bukti': r.fotoFinger || '-',
        'Status Verifikasi': r.acc || 'Disetujui'
      };
    });

    const wb = XLSX.utils.book_new();
    const wsData = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsData, 'Data Keterlambatan');

    // 2. Sheet Diagram & Rekapan
    const summaryRows = [
      ['REKAPITULASI LAPORAN KETERLAMBATAN & PULANG CEPAT PREP & LAB'],
      ['Tanggal Ekspor', new Date().toLocaleString('id-ID')],
      [],
      ['RINGKASAN METRIK', 'JUMLAH KASUS'],
      ['Total Terlambat Masuk', stats.totalTerlambat],
      ['Total Pulang Cepat', stats.totalPulangCepat],
      ['Total Laporan Bulan Ini', stats.totalBulanIni],
      ['Total Seluruh Data', stats.totalAll],
      ['Total Kasus Karyawan Warning (>= 4x)', totalWarningRecords],
      [],
      ['REKAPAN PER SECTION', 'JUMLAH'],
      ...Object.entries(stats.sectionCounts).map(([sec, count]) => [sec, count]),
      [],
      ['REKAPAN PER SHIFT', 'JUMLAH'],
      ...Object.entries(stats.shiftCounts).map(([sh, count]) => [sh, count])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekapitulasi & Ringkasan');

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Rekapan_Keterlambatan_Pulang_Cepat_${today}.xlsx`);
    toast.success('File Excel beserta Sheet Rekapitulasi berhasil didownload.');
  };

  // Delete handler
  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan keterlambatan ini?')) return;
    try {
      const res = await fetch(`/api/employee-tardiness/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Data berhasil dihapus.');
        setRecords(prev => prev.filter(r => r.id !== id));
      } else {
        toast.error(json.message || 'Gagal menghapus data.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Terjadi kesalahan.');
    }
  };

  // Save Edit modal
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/employee-tardiness/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRecord)
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Data berhasil diperbarui.');
        setRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...editingRecord } : r));
        setEditingRecord(null);
      } else {
        toast.error(json.message || 'Gagal memperbarui data.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memperbarui data.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Helper styling warna badge per section: Preparation (Hijau), Laboratory (Biru Langit), Maintenance (Orange)
  const getSectionBadgeClass = (section?: string) => {
    const s = (section || '').trim().toLowerCase();
    if (s.includes('prep')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700';
    }
    if (s.includes('lab')) {
      return 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700';
    }
    if (s.includes('maint')) {
      return 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER BAR (hanya di dalam tab, tidak di Menu Tab) ── */}
      {viewTab !== 'landing' && (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setViewTab('landing')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            title="Kembali ke Menu Tab"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                Administrasi &amp; HR
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Google Sheet &amp; Web Sync
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Rekapan Keterlambatan &amp; Pulang Cepat
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring keterlambatan finger masuk dan kepulangan cepat karyawan Preparation &amp; Laboratory
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNav ? onNav('form-keterlambatan') : null}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Form Keterlambatan</span>
          </button>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Sinkronkan data langsung dari Google Sheet Laporan Keterlambatan Karyawan Prep&Lab"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sinkron Google Sheet</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer"
            title="Download Excel beserta Sheet Rekapitulasi"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Download Excel</span>
          </button>
        </div>
      </div>
      )}

      {/* ── LANDING: PUSAT MENU TAB (3D) ── */}
      {viewTab === 'landing' && onBack && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
            title="Kembali ke Zona Administrasi"
          >
            <ChevronLeft className="w-4 h-4 text-rose-600" />
            <span>Kembali ke Zona Administrasi</span>
          </button>
        </div>
      )}
      {viewTab === 'landing' && (
        <div className="min-h-[calc(100vh-11rem)] flex flex-col justify-center bg-white rounded-3xl px-4 sm:px-8 py-10 sm:py-14 text-center space-y-8 sm:space-y-10 animate-in fade-in duration-500 relative overflow-hidden">
            <MenuTabBackdrop />
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200/80 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              PORTAL OPERASIONAL PREPLAB • NAVIGASI MODUL
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Pusat Rekapan Keterlambatan &amp; Pulang Cepat
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
              Pilih lembar kerja interaktif di bawah untuk membuka tabel rekapan, diagram analitik, atau form pelaporan keterlambatan.
            </p>
          </div>

          {/* Ambient Soft Blur Behind Cards */}
          <div className="relative pt-2 pb-6 flex justify-center overflow-x-auto z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] sm:w-[42rem] h-60 sm:h-72 bg-gradient-to-r from-rose-200/50 via-amber-100/40 to-teal-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
            <DisplayCards cards={tardinessDisplayCards} />
          </div>

          <div className="self-center inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/70 shadow-2xs relative z-10">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Klik salah satu kartu untuk membuka lembar kerja</span>
          </div>
        </div>
      )}

      {viewTab !== 'landing' && (<>
      {/* ── TAB SWITCHER: TABEL REKAP VS SHEET DIAGRAM ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setViewTab('landing')}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 hover:border-rose-300 transition-all cursor-pointer shadow-xs"
          title="Kembali ke Menu Tab"
        >
          <ChevronLeft className="w-4 h-4 text-rose-600" />
          <span>Menu Tab</span>
        </button>
        <div className="inline-flex p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            onClick={() => setViewTab('tabel')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewTab === 'tabel'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>Tabel Rekapan</span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('diagram')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewTab === 'diagram'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Sheet Diagram &amp; Analitik</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
              Baru
            </span>
          </button>
        </div>
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          {viewTab === 'tabel' ? 'Tabel langsung dapat diedit seperti Google Sheet' : 'Rekapan visual per minggu, per bulan, per tahun'}
        </div>
      </div>

      {/* ── 1. STATS / KPI CARDS (INTERACTIVE & CLICKABLE FILTER) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Terlambat Masuk */}
        <button
          type="button"
          onClick={() => handleKpiCardClick('Masuk')}
          className={`text-left bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs flex items-center gap-3.5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-98 ${
            selectedStatusFinger === 'Masuk'
              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20 dark:bg-amber-950/30'
              : 'border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400'
          }`}
          title="Klik untuk memfilter: Hanya Keterlambatan Masuk"
        >
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800/60 shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Terlambat Masuk</span>
              {selectedStatusFinger === 'Masuk' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {stats.totalTerlambat} <span className="text-xs font-semibold text-slate-400">kali</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <span>Status Finger Masuk</span>
              <span className="text-[10px] text-amber-600 font-bold underline">Filter</span>
            </div>
          </div>
        </button>

        {/* Total Pulang Cepat */}
        <button
          type="button"
          onClick={() => handleKpiCardClick('Pulang')}
          className={`text-left bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs flex items-center gap-3.5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-98 ${
            selectedStatusFinger === 'Pulang'
              ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30'
              : 'border-indigo-200/80 dark:border-indigo-900/40 hover:border-indigo-400'
          }`}
          title="Klik untuk memfilter: Hanya Pulang Cepat"
        >
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Pulang Cepat</span>
              {selectedStatusFinger === 'Pulang' && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {stats.totalPulangCepat} <span className="text-xs font-semibold text-slate-400">kali</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <span>Status Finger Pulang</span>
              <span className="text-[10px] text-indigo-600 font-bold underline">Filter</span>
            </div>
          </div>
        </button>

        {/* Bulan Ini */}
        <button
          type="button"
          onClick={() => handleKpiCardClick('BulanIni')}
          className={`text-left bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs flex items-center gap-3.5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-98 ${
            selectedPeriod === 'MONTH'
              ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/20 dark:bg-rose-950/30'
              : 'border-rose-200/80 dark:border-rose-900/40 hover:border-rose-400'
          }`}
          title="Klik untuk memfilter: Periode Bulan Ini"
        >
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800/60 shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Bulan Ini</span>
              {selectedPeriod === 'MONTH' && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {stats.totalBulanIni} <span className="text-xs font-semibold text-slate-400">laporan</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <span>Periode bulan berjalan</span>
              <span className="text-[10px] text-rose-600 font-bold underline">Filter</span>
            </div>
          </div>
        </button>

        {/* Total Keseluruhan */}
        <button
          type="button"
          onClick={() => handleKpiCardClick('All')}
          className={`text-left bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs flex items-center gap-3.5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-98 ${
            selectedStatusFinger === 'ALL' && selectedPeriod === 'ALL' && !startDate && !endDate && !filterWarningOnly
              ? 'ring-2 ring-slate-400 border-slate-400'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
          title="Klik untuk reset filter: Tampilkan Seluruh Data"
        >
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Seluruh Data
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5">
              {stats.totalAll} <span className="text-xs font-semibold text-slate-400">laporan</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <span>Google Sheet + Web</span>
              <span className="text-[10px] text-slate-500 font-bold underline">Reset</span>
            </div>
          </div>
        </button>
      </div>

      {/* ── VIEW TAB 1: TABEL REKAPAN ── */}
      {viewTab === 'tabel' && (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            {/* Top Controls: Search, Presets, Section, Shift */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan, alasan keterlambatan..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Period Buttons & Warning Toggle */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                <span className="text-xs font-medium text-slate-400 mr-1 hidden sm:inline">Periode:</span>
                {(['ALL', 'TODAY', 'MONTH'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriodChange(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedPeriod === p && !startDate && !endDate
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {p === 'ALL' ? 'Semua' : p === 'TODAY' ? 'Hari Ini' : 'Bulan Ini'}
                  </button>
                ))}

                {/* Quick Button for Warning (>= 4x late in month) */}
                <button
                  type="button"
                  onClick={() => setFilterWarningOnly(!filterWarningOnly)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    filterWarningOnly
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                  }`}
                  title="Filter hanya karyawan yang terlambat 4 hari atau lebih dalam 1 bulan"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>⚠️ Warning &gt;= 4 Hari ({totalWarningRecords})</span>
                </button>
              </div>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Section Filter */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Section
                </label>
                <select
                  value={selectedSection}
                  onChange={e => setSelectedSection(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Semua Section</option>
                  <option value="Preparation">Preparation</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>

              {/* Shift Filter */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Shift
                </label>
                <select
                  value={selectedShift}
                  onChange={e => setSelectedShift(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Semua Shift</option>
                  <option value="Shift A">Shift A</option>
                  <option value="Shift B">Shift B</option>
                  <option value="Nonshift">Nonshift</option>
                </select>
              </div>

              {/* Status Finger Filter */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Status Finger
                </label>
                <select
                  value={selectedStatusFinger}
                  onChange={e => setSelectedStatusFinger(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value="Masuk">Terlambat Masuk</option>
                  <option value="Pulang">Pulang Cepat</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Urutkan
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="date-desc">Tanggal Terbaru</option>
                  <option value="date-asc">Tanggal Terlama</option>
                  <option value="name-asc">Nama Karyawan (A-Z)</option>
                  <option value="time-desc">Waktu Finger</option>
                </select>
              </div>

              {/* Tanggal Dari */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setSelectedPeriod('CUSTOM');
                  }}
                  className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              {/* Tanggal Sampai */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setSelectedPeriod('CUSTOM');
                  }}
                  className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Active Filter Info & Reset Button */}
            {(searchTerm || selectedSection !== 'ALL' || selectedShift !== 'ALL' || selectedStatusFinger !== 'ALL' || startDate || endDate || filterWarningOnly) && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{filteredRecords.length}</span> dari {records.length} data laporan
                  {filterWarningOnly && (
                    <span className="ml-2 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      ⚠️ Hanya Karyawan Terlambat &gt;= 4 Hari
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedSection('ALL');
                    setSelectedShift('ALL');
                    setSelectedStatusFinger('ALL');
                    setSelectedPeriod('ALL');
                    setStartDate('');
                    setEndDate('');
                    setFilterWarningOnly(false);
                  }}
                  className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Semua Filter</span>
                </button>
              </div>
            )}
          </div>

          {/* ── 2. MAIN TABLE DENGAN INLINE EDITING SEPERTI GOOGLE SHEET ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Tabel Keterlambatan &amp; Pulang Cepat</span>
                <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">
                  (Klik sel untuk mengedit langsung seperti Google Sheet)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Autofit Button */}
                <button
                  type="button"
                  onClick={resizeHelper.handleToggleAutofit}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all shadow-2xs cursor-pointer active:scale-95 ${
                    resizeHelper.isAutofit
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                  title={resizeHelper.isAutofit ? 'Matikan Autofit (Gunakan ukuran kolom kustom)' : 'Aktifkan Autofit (Otomatis sesuaikan lebar kolom)'}
                >
                  {resizeHelper.isAutofit ? (
                    <>
                      <Minimize2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      <span>Autofit: Aktif</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3 text-slate-500" />
                      <span>Autofit Kolom</span>
                    </>
                  )}
                </button>

                {/* Reset Columns Button */}
                {resizeHelper.isAnyColumnResized && (
                  <button
                    type="button"
                    onClick={resizeHelper.handleResetAllColumns}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Kembalikan semua lebar kolom ke ukuran bawaan"
                  >
                    <RotateCcw className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>Reset Kolom</span>
                  </button>
                )}

                {lastSyncAt && (
                  <span className="text-[11px] text-slate-400 hidden md:inline ml-1">
                    Sinkron: {lastSyncAt}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-500 mb-3" />
                <p className="text-sm font-semibold">Memuat data keterlambatan &amp; pulang cepat...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">Tidak ada data ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau ubah filter periode.</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[420px] rounded-b-2xl border-t border-slate-200 dark:border-slate-800">
                <table 
                  className="w-full text-left text-xs border-collapse relative"
                  style={{
                    tableLayout: resizeHelper.isAutofit ? 'auto' : 'fixed',
                    width: resizeHelper.isAutofit ? '100%' : `${resizeHelper.totalTableWidth}px`,
                    minWidth: '100%'
                  }}
                >
                  <thead className="sticky top-0 z-20 shadow-xs">
                    <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                      {TARDINESS_COLUMNS.map((col) => {
                        const colW = resizeHelper.getColWidth(col.id);
                        return (
                          <th
                            key={col.id}
                            style={{ width: resizeHelper.isAutofit ? undefined : `${colW}px` }}
                            className={`sticky top-0 bg-slate-100 dark:bg-slate-800 py-3.5 px-3 z-20 border-r border-slate-200/60 dark:border-slate-700/60 relative select-none ${
                              col.align === 'center' ? 'text-center' : 'text-left'
                            } ${resizeHelper.resizingCol === col.id ? 'bg-rose-500/10 text-rose-700' : ''}`}
                          >
                            <span className="truncate">{col.label}</span>
                            <ColumnResizeHandle
                              colId={col.id}
                              isResizing={resizeHelper.resizingCol === col.id}
                              onResizeStart={resizeHelper.handleResizeStart}
                              onResetCol={resizeHelper.handleResetCol}
                            />
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRecords.map((r, idx) => {
                      const isPulang = r.statusFinger === 'Pulang';
                      const monthlyLateCount = getRecordMonthlyLateCount(r);
                      const isWarning = monthlyLateCount >= 4;

                      return (
                        <tr 
                          key={r.id || idx}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isWarning ? 'bg-rose-50/25 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          {/* No */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>

                          {/* 1. Tanggal (Inline Editable) */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            {editingCell?.id === r.id && editingCell?.field === 'tanggal' ? (
                              <input
                                type="date"
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleInlineCellUpdate(r.id, 'tanggal', editValue)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleInlineCellUpdate(r.id, 'tanggal', editValue);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full text-xs text-center font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-teal-500 shadow-xs focus:outline-none"
                              />
                            ) : (
                              <div
                                onClick={() => startEditingCell(r.id, 'tanggal', r.tanggal)}
                                className="cursor-pointer group inline-flex items-center justify-center gap-1.5 p-1 -m-1 rounded hover:bg-teal-50/40 dark:hover:bg-teal-950/20 hover:ring-1 hover:ring-teal-400 mx-auto"
                                title="Klik untuk mengedit tanggal"
                              >
                                <div className="text-center">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {formatTardinessDateIndo(r.tanggal)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {r.tanggal || '-'}
                                  </div>
                                </div>
                                <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>

                          {/* 2. Waktu Finger (Inline Editable) */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {editingCell?.id === r.id && editingCell?.field === 'waktuFinger' ? (
                              <input
                                type="text"
                                autoFocus
                                placeholder="HH:mm"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleInlineCellUpdate(r.id, 'waktuFinger', editValue)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleInlineCellUpdate(r.id, 'waktuFinger', editValue);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-20 text-xs font-mono font-bold text-center px-2 py-1 rounded bg-white dark:bg-slate-800 border border-teal-500 shadow-xs focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEditingCell(r.id, 'waktuFinger', r.waktuFinger)}
                                className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-teal-400 hover:bg-teal-50/40"
                                title="Klik untuk mengedit jam"
                              >
                                <Clock className="w-3 h-3 text-slate-400" />
                                {r.waktuFinger || '-'}
                              </span>
                            )}
                          </td>

                          {/* 3. Nama Karyawan (Tanpa NIK Sesuai Request User, Inline Editable) */}
                          <td className="py-2.5 px-4">
                            {editingCell?.id === r.id && editingCell?.field === 'name' ? (
                              <input
                                type="text"
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleInlineCellUpdate(r.id, 'name', editValue)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleInlineCellUpdate(r.id, 'name', editValue);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full text-xs font-bold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-teal-500 shadow-xs focus:outline-none"
                              />
                            ) : (
                              <div
                                onClick={() => startEditingCell(r.id, 'name', r.name)}
                                className="cursor-pointer group p-1 -m-1 rounded hover:bg-teal-50/40 dark:hover:bg-teal-950/20 hover:ring-1 hover:ring-teal-400"
                                title="Klik untuk mengedit nama"
                              >
                                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                  <span>{r.name}</span>
                                  <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 3b. Jabatan (Kolom Terpisah di Samping Nama Karyawan, Inline Editable) */}
                          <td className="py-2.5 px-4 text-center">
                            {editingCell?.id === r.id && editingCell?.field === 'jabatan' ? (
                              <input
                                type="text"
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleInlineCellUpdate(r.id, 'jabatan', editValue)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleInlineCellUpdate(r.id, 'jabatan', editValue);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full text-xs text-center font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-teal-500 shadow-xs focus:outline-none"
                              />
                            ) : (
                              <div
                                onClick={() => startEditingCell(r.id, 'jabatan', r.jabatan || '')}
                                className="cursor-pointer group p-1 -m-1 rounded hover:bg-teal-50/40 dark:hover:bg-teal-950/20 hover:ring-1 hover:ring-teal-400 inline-flex items-center justify-center mx-auto"
                                title="Klik untuk mengedit jabatan"
                              >
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px] text-center">
                                  {r.jabatan || '-'}
                                </span>
                                <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                              </div>
                            )}
                          </td>

                          {/* 4. Section (Inline Editable Select) */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                            {editingCell?.id === r.id && editingCell?.field === 'section' ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={e => handleInlineCellUpdate(r.id, 'section', e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                className="text-xs font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 focus:outline-none"
                              >
                                <option value="Preparation">Preparation</option>
                                <option value="Laboratory">Laboratory</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Administration">Administration</option>
                              </select>
                            ) : (
                              <span
                                onClick={() => startEditingCell(r.id, 'section', r.section || 'Preparation')}
                                className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:shadow-xs transition-colors"
                                title="Klik untuk mengubah Section"
                              >
                                {r.section || 'Preparation'}
                              </span>
                            )}
                          </td>

                          {/* 5. Shift (Inline Editable Select) */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                            {editingCell?.id === r.id && editingCell?.field === 'shift' ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={e => handleInlineCellUpdate(r.id, 'shift', e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                className="text-xs font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 focus:outline-none"
                              >
                                <option value="Shift A">Shift A</option>
                                <option value="Shift B">Shift B</option>
                                <option value="Nonshift">Nonshift</option>
                              </select>
                            ) : (
                              <span
                                onClick={() => startEditingCell(r.id, 'shift', r.shift || 'Nonshift')}
                                className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:opacity-80"
                                title="Klik untuk mengubah Shift"
                              >
                                {r.shift || 'Nonshift'}
                              </span>
                            )}
                          </td>

                          {/* 6. Kategori / Status Finger (Inline Editable Select) */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                            {editingCell?.id === r.id && editingCell?.field === 'statusFinger' ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={e => handleInlineCellUpdate(r.id, 'statusFinger', e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                className="text-xs font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 focus:outline-none"
                              >
                                <option value="Masuk">Terlambat Masuk</option>
                                <option value="Pulang">Pulang Cepat</option>
                              </select>
                            ) : (
                              <span
                                onClick={() => startEditingCell(r.id, 'statusFinger', r.statusFinger)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:opacity-80"
                                title="Klik untuk mengubah status Masuk / Pulang"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                {isPulang ? 'Pulang Cepat' : 'Terlambat Masuk'}
                              </span>
                            )}
                          </td>

                          {/* 7. Alasan (Inline Editable Text) */}
                          <td className="py-2.5 px-4 text-center max-w-[240px] border-r border-slate-100 dark:border-slate-800">
                            {editingCell?.id === r.id && editingCell?.field === 'alasan' ? (
                              <input
                                type="text"
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleInlineCellUpdate(r.id, 'alasan', editValue)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleInlineCellUpdate(r.id, 'alasan', editValue);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full text-xs text-center px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 shadow-xs focus:outline-none"
                              />
                            ) : (
                              <div
                                onClick={() => startEditingCell(r.id, 'alasan', r.alasan || '')}
                                className="cursor-pointer group inline-flex items-center justify-center gap-1 p-1 -m-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800/60 mx-auto"
                                title="Klik untuk mengedit alasan"
                              >
                                <div className="font-medium text-slate-700 dark:text-slate-300 truncate text-center" title={r.alasan || '-'}>
                                  {r.alasan || '-'}
                                </div>
                                <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>
                            )}
                          </td>

                          {/* 8. KOLOM WARNING KETIKA DALAM 1 BULAN KARYAWAN SUDAH TERLAMBAT >= 4 HARI */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                            {isWarning ? (
                              <span 
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 shadow-2xs animate-pulse"
                                title={`Karyawan telah terlambat sebanyak ${monthlyLateCount} hari pada bulan ini (>= 4 hari). Diperlukan Surat Peringatan (SP) atau Evaluasi HR.`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>⚠️ {monthlyLateCount}x Terlambat (SP / Evaluasi)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {monthlyLateCount > 0 ? `${monthlyLateCount}x di bln ini` : '-'}
                              </span>
                            )}
                          </td>

                          {/* 9. Foto Bukti Finger */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                            {r.fotoFinger ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewPhotoUrl(r.fotoFinger!);
                                  setPreviewPhotoTitle(`${r.name} · ${r.statusFinger} (${r.waktuFinger})`);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                                <span>Lihat Foto</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Tidak ada</span>
                            )}
                          </td>

                          {/* 10. Aksi */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingRecord(r)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                                title="Edit Detail Form"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(r.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── VIEW TAB 2: SHEET DIAGRAM & ANALITIK (PER MINGGU, PER BULAN, PER TAHUN) ── */}
      {viewTab === 'diagram' && (
        <EmployeeTardinessDiagram
          records={records}
          defaultSection={selectedSection}
          onPreviewPhoto={(url, title) => {
            setPreviewPhotoUrl(url);
            setPreviewPhotoTitle(title);
          }}
        />
      )}
      </>)}

      {/* ── MODAL PREVIEW FOTO BUKTI FINGER ── */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bukti Foto Finger Karyawan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {previewPhotoTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[260px] max-h-[420px]">
              <img
                src={previewPhotoUrl}
                alt="Bukti Finger"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Foto+Tersimpan+di+Google+Drive';
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={previewPhotoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Link Asli di Google Drive</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT DETAIL CATATAN ── */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-600" />
                <span>Edit Catatan Keterlambatan</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Karyawan
                </label>
                <input
                  type="text"
                  value={editingRecord.name}
                  onChange={e => setEditingRecord({ ...editingRecord, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={editingRecord.tanggal}
                    onChange={e => setEditingRecord({ ...editingRecord, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Waktu Finger
                  </label>
                  <input
                    type="text"
                    value={editingRecord.waktuFinger}
                    onChange={e => setEditingRecord({ ...editingRecord, waktuFinger: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Section
                  </label>
                  <select
                    value={editingRecord.section}
                    onChange={e => setEditingRecord({ ...editingRecord, section: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-none"
                  >
                    <option value="Preparation">Preparation</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Shift
                  </label>
                  <select
                    value={editingRecord.shift}
                    onChange={e => setEditingRecord({ ...editingRecord, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-none"
                  >
                    <option value="Shift A">Shift A</option>
                    <option value="Shift B">Shift B</option>
                    <option value="Nonshift">Nonshift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Kategori Finger
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRecord({ ...editingRecord, statusFinger: 'Masuk' })}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      editingRecord.statusFinger === 'Masuk'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Terlambat Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRecord({ ...editingRecord, statusFinger: 'Pulang' })}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      editingRecord.statusFinger === 'Pulang'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Pulang Cepat
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Alasan Keterlambatan / Pulang Cepat
                </label>
                <textarea
                  rows={3}
                  value={editingRecord.alasan || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, alasan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
