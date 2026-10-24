import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Fingerprint,
  Calendar,
  Clock,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Download,
  Printer,
  Table as TableIcon,
  FileText,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  UserCheck,
  ShieldCheck,
  Check,
  ArrowUpDown,
  Sparkles,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  Info,
  Plus,
  Trash2,
  Edit3,
  X,
  RotateCcw,
  Upload
} from 'lucide-react';
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
  Legend,
  LabelList
} from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { TBP_HEADER_LOGO_BASE64 } from '../utils/tbpLogoBase64';
import DisplayCards, { DisplayCardProps } from './ui/display-cards';

const INDO_MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Helper Format Tanggal Indonesia: [$-id-ID] DD-MMM-YYYY (contoh: 13-Okt-2026)
 */
export function formatToIndoDateDDMMMYYYY(val?: any): string {
  if (!val || val === '-' || val === '#N/A' || val === '0' || String(val).toLowerCase() === 'null') {
    return '-';
  }
  const pad2 = (n: number) => String(n).padStart(2, '0');

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '-';
    return `${pad2(val.getDate())}-${INDO_MONTH_NAMES_SHORT[val.getMonth()]}-${val.getFullYear()}`;
  }

  const clean = String(val).trim();
  if (!clean) return '-';

  // Excel serial number (e.g. 45000)
  if (/^\d{5}$/.test(clean)) {
    const num = Number(clean);
    if (num >= 25569 && num <= 65000) {
      const dObj = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(dObj.getTime())) {
        return `${pad2(dObj.getDate())}-${INDO_MONTH_NAMES_SHORT[dObj.getMonth()]}-${dObj.getFullYear()}`;
      }
    }
  }

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const mIdx = Math.max(0, Math.min(11, m - 1));
    return `${pad2(d)}-${INDO_MONTH_NAMES_SHORT[mIdx]}-${y}`;
  }

  // Format DD-MMM-YYYY yang sudah ada
  const parts = clean.split(/[-/ ]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let mStr = parts[1].toLowerCase();
    let year = parseInt(parts[2], 10);

    const engMonths: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5,
      jul: 6, aug: 7, agu: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11
    };
    if (!isNaN(day) && engMonths[mStr.slice(0, 3)] !== undefined && !isNaN(year)) {
      return `${pad2(day)}-${INDO_MONTH_NAMES_SHORT[engMonths[mStr.slice(0, 3)]]}-${year}`;
    }
  }

  return clean;
}

/**
 * Normalisasi format tanggal apapun (Date, Serial Excel, DD/MM/YYYY, DD-MMM-YY, dsb.)
 * Menghasilkan: { iso: 'YYYY-MM-DD', display: 'DD/MM/YYYY', doc: 'DD-MMM-YYYY' }
 */
export function parseAnyToStandardDate(val: any): { iso: string; display: string; doc: string } {
  let y = 2026;
  let m = 10;
  let d = 1;
  let matched = false;

  if (val instanceof Date && !isNaN(val.getTime())) {
    y = val.getFullYear();
    m = val.getMonth() + 1;
    d = val.getDate();
    matched = true;
  } else if (typeof val === 'number' && val >= 25569 && val <= 65000) {
    const dObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dObj.getTime())) {
      y = dObj.getFullYear();
      m = dObj.getMonth() + 1;
      d = dObj.getDate();
      matched = true;
    }
  } else {
    const str = String(val || '').trim();
    if (/^\d{5}$/.test(str)) {
      const num = Number(str);
      const dObj = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(dObj.getTime())) {
        y = dObj.getFullYear();
        m = dObj.getMonth() + 1;
        d = dObj.getDate();
        matched = true;
      }
    } else {
      const mIso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (mIso) {
        y = parseInt(mIso[1], 10);
        m = parseInt(mIso[2], 10);
        d = parseInt(mIso[3], 10);
        matched = true;
      } else {
        const mSlash = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
        if (mSlash) {
          d = parseInt(mSlash[1], 10);
          m = parseInt(mSlash[2], 10);
          let rawY = parseInt(mSlash[3], 10);
          y = rawY < 100 ? 2000 + rawY : rawY;
          matched = true;
        } else {
          const parts = str.split(/[-/ ]/);
          if (parts.length === 3) {
            const rawD = parseInt(parts[0], 10);
            const mStr = parts[1].toLowerCase().slice(0, 3);
            let rawY = parseInt(parts[2], 10);
            if (rawY < 100) rawY += 2000;
            const monthsMap: Record<string, number> = {
              jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6,
              jul: 7, aug: 8, agu: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12
            };
            if (!isNaN(rawD) && monthsMap[mStr] && !isNaN(rawY)) {
              d = rawD;
              m = monthsMap[mStr];
              y = rawY;
              matched = true;
            }
          }
        }
      }
    }
  }

  if (!matched) {
    const today = new Date();
    y = today.getFullYear();
    m = today.getMonth() + 1;
    d = today.getDate();
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  const display = `${pad(d)}/${pad(m)}/${y}`;
  const enShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] || 'Oct';
  const doc = `${pad(d)}-${enShort}-${y}`;

  return { iso, display, doc };
}

/**
 * Normalisasi format waktu ke format HH:mm atau '-'
 */
export function parseAnyToTimeString(val: any): string {
  if (val === undefined || val === null) return '-';
  if (typeof val === 'number' && val >= 0 && val < 1) {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const min = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  if (!str || str === '-' || str === '#N/A' || str.toLowerCase() === 'null') return '-';
  const match = str.match(/^(\d{1,2})[:.](\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return str;
}

// Helper: Normalisasi Golongan ke angka 1 - 5 (Gol V s/d I)
export function parseGolonganLevel(val: any, jabatan?: string): number {
  const s = String(val || '').trim().toUpperCase();
  if (s === '5' || s === 'V' || (s.includes('V') && !s.includes('IV'))) return 5;
  if (s === '4' || s === 'IV' || s.includes('IV')) return 4;
  if (s === '3' || s === 'III' || s.includes('III')) return 3;
  if (s === '2' || s === 'II' || s.includes('II')) return 2;
  if (s === '1' || s === 'I' || s.includes('I')) return 1;

  const j = String(jabatan || '').toLowerCase();
  if (j.includes('manager') || j.includes('head') || j.includes('superintendent') || j.includes('spt')) return 5;
  if (j.includes('spv') || j.includes('supervisor')) return 3;
  if (j.includes('foreman') || j.includes('group leader') || j.includes('lead hand') || j.includes('leader')) return 2;
  return 1;
}

export function formatGolonganRoman(level: number): string {
  if (level === 5) return 'Gol V';
  if (level === 4) return 'Gol IV';
  if (level === 3) return 'Gol III';
  if (level === 2) return 'Gol II';
  return 'Gol I';
}

export interface FingerRecapItem {
  id: string | number;
  sheetRowId: string;
  sheetRowIdx?: number;
  nik: string;
  name: string;
  pt: string; // Strictly from Roster (TBP / GPS)
  shift?: string; // Strictly from Roster (Shift A, Shift B, Nonshift)
  section: string;
  jabatan: string;
  tanggal: string; // 'YYYY-MM-DD'
  tanggalDisplay: string; // 'DD/MM/YYYY'
  tanggalDoc: string; // '15-Oct-2026'
  jamMasuk: string;
  jamPulang: string;
  schedule: string;
  alasanKategori: string;
  keteranganLain?: string;
  tandaTangan?: string;
  catatan?: string;
  rawScanMasuk?: string;
  rawScanPulang?: string;
  rawShiftMalam?: string;
  source: 'google_sheet' | 'db' | 'manual' | 'import_excel';
  isValueError?: boolean;
  updatedAt?: string;
}

export interface EmployeeFingerGroup {
  nik: string;
  name: string;
  pt: string;
  shift: string;
  section: string;
  jabatan: string;
  gol: string;
  golLevel: number;
  golDisplay: string;
  incidents: FingerRecapItem[];
  reasonCounts: Record<string, number>;
  latestJamMasuk: string;
  latestJamPulang: string;
}

export const FINGER_REASON_COLUMNS = [
  { key: 'Kendala Transport', label: 'Kendala Transport', group: 'operational', bgHeader: 'bg-emerald-100/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  { key: 'Pindah Area Kerja', label: 'Pindah Area Kerja', group: 'operational', bgHeader: 'bg-emerald-100/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  { key: 'Penugasan Kerja', label: 'Penugasan Kerja', group: 'operational', bgHeader: 'bg-emerald-100/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  { key: 'Mesin Rusak', label: 'Mesin Rusak', group: 'device', bgHeader: 'bg-sky-100/90 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-800' },
  { key: 'Tidak / Belum Terdaftar', label: 'Tidak / Belum Terdaftar', group: 'device', bgHeader: 'bg-sky-100/90 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-800' },
  { key: 'Kendala Sidik Jari', label: 'Kendala Sidik Jari', group: 'device', bgHeader: 'bg-sky-100/90 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-800' },
  { key: 'Masalah Jaringan', label: 'Masalah Jaringan', group: 'device', bgHeader: 'bg-sky-100/90 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-800' },
  { key: 'Lupa Finger Masuk', label: 'Lupa Finger Masuk', group: 'personal', bgHeader: 'bg-emerald-100/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  { key: 'Lupa Finger Pulang', label: 'Lupa Finger Pulang', group: 'personal', bgHeader: 'bg-emerald-100/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  { key: 'Lupa Finger Masuk dan Pulang', label: 'Lupa Finger Masuk dan Pulang', group: 'personal', bgHeader: 'bg-emerald-100/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' }
] as const;

export const FORM_REASON_COLUMNS = [
  'Kendala Transport',
  'Pindah Area Kerja',
  'Penugasan Kerja',
  'Mesin Rusak',
  'Tidak / Belum Terdaftar',
  'Kendala Sidik Jari',
  'Masalah Jaringan',
  'Lainnya'
] as const;

interface EmployeeFingerScreenProps {
  userProfile?: any;
  inspectorName?: string;
  inspectorNik?: string;
  onNav?: (tab: string) => void;
  onBack?: () => void;
}

export function EmployeeFingerScreen({
  userProfile,
  inspectorName = '',
  inspectorNik = '',
  onNav,
  onBack
}: EmployeeFingerScreenProps) {
  const [activeTab, setActiveTab] = useState<'landing' | 'rekap' | 'form' | 'diagram'>('landing');
  const [formSubTab, setFormSubTab] = useState<'form_view' | 'need_form_view'>('form_view');
  const [records, setRecords] = useState<FingerRecapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // State untuk Tab 4: Karyawan #VALUE! (Google Sheet)
  const [valSearchQuery, setValSearchQuery] = useState<string>('');
  const [valSelectedPt, setValSelectedPt] = useState<string>('ALL');
  const [valSelectedShift, setValSelectedShift] = useState<string>('ALL');
  const [valSelectedDate, setValSelectedDate] = useState<string>('ALL');
  const [valSelectedReason, setValSelectedReason] = useState<string>('ALL');
  const [valCurrentPage, setValCurrentPage] = useState<number>(1);
  const valPageSize = 25;

  // File input refs untuk fitur Import Excel
  const rekapFileInputRef = useRef<HTMLInputElement>(null);
  const tbpFileInputRef = useRef<HTMLInputElement>(null);
  const gpsFileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Scope: 'issues_only' (hanya karyawan terkendala finger) atau 'all_roster' (semua 186 karyawan aktif)
  const [employeeScope, setEmployeeScope] = useState<'all_roster' | 'issues_only'>('all_roster');
  const [freezePaneHeader, setFreezePaneHeader] = useState<boolean>(true);
  // State dropdown accordion (nik -> boolean)
  const [isStatsAccordionOpen, setIsStatsAccordionOpen] = useState<boolean>(true);
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});
  const [allActiveEmployees, setAllActiveEmployees] = useState<Array<{ nik: string; name: string; pt: string; shift?: string; section?: string; jabatan?: string; gol?: string }>>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPt, setSelectedPt] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('ALL');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');
  const [selectedGol, setSelectedGol] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  const [formFilterDate, setFormFilterDate] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  const [sortField, setSortField] = useState<'tanggal' | 'name' | 'nik' | 'jamMasuk'>('tanggal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // ==========================================
  // STATE ANALITIK PERIODE (PER MINGGU, PER BULAN, PER TAHUN)
  // Referensi dari Modul Rekap Izin Karyawan
  // ==========================================
  const [diagramViewMode, setDiagramViewMode] = useState<'week' | 'month' | 'year' | 'all'>('week');
  const [diagramSearchTable, setDiagramSearchTable] = useState<string>('');
  const [diagramFilterReason, setDiagramFilterReason] = useState<string>('ALL');

  // Helper untuk Senin pada minggu dari tanggal tertentu
  const getMondayDate = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay(); // 0 is Sunday
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(date.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  };

  // State Senin saat ini untuk mode perminggu
  const [diagramMonday, setDiagramMonday] = useState<Date>(() => {
    return getMondayDate(new Date());
  });

  // Sinkronkan diagramMonday jika ada records
  useEffect(() => {
    if (records.length > 0) {
      const sorted = [...records].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      if (sorted[0]?.tanggal) {
        const d = new Date(sorted[0].tanggal + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          setDiagramMonday(getMondayDate(d));
        }
      }
    }
  }, [records]);

  // Bulan dan Tahun yang tersedia dari data
  const availableDiagramMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.tanggal && r.tanggal.length >= 7) set.add(r.tanggal.slice(0, 7));
    });
    const arr = Array.from(set).sort().reverse();
    if (arr.length === 0) arr.push(new Date().toISOString().slice(0, 7));
    return arr;
  }, [records]);

  const [diagramMonthStr, setDiagramMonthStr] = useState<string>(() => {
    return availableDiagramMonths[0] || new Date().toISOString().slice(0, 7);
  });

  const availableDiagramYears = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.tanggal && r.tanggal.length >= 4) set.add(r.tanggal.slice(0, 4));
    });
    const arr = Array.from(set).sort().reverse();
    if (arr.length === 0) arr.push(new Date().getFullYear().toString());
    return arr;
  }, [records]);

  const [diagramYearStr, setDiagramYearStr] = useState<string>(() => {
    return availableDiagramYears[0] || new Date().getFullYear().toString();
  });

  // Batas tanggal awal & akhir minggu (Senin - Minggu)
  const diagramWeekStart = diagramMonday;
  const diagramWeekEnd = useMemo(() => {
    const sun = new Date(diagramMonday);
    sun.setDate(diagramMonday.getDate() + 6);
    return sun;
  }, [diagramMonday]);

  const formatIsoDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const diagramWeekStartStr = formatIsoDate(diagramWeekStart);
  const diagramWeekEndStr = formatIsoDate(diagramWeekEnd);

  const prevDiagramWeek = () => {
    setDiagramMonday(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const nextDiagramWeek = () => {
    setDiagramMonday(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };
  const [formOverrides, setFormOverrides] = useState<Record<string, FingerRecapItem[]> | null>(() => {
    try {
      const saved = localStorage.getItem('preplab_form_tidak_finger_custom_records_v1');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [docHeaderMeta, setDocHeaderMeta] = useState<{
    docNumber: string;
    effectiveDate: string;
    validDate: string;
    revision: string;
    shift: string;
    department: string;
    spvName: string;
    spvTitle: string;
    deptHeadName: string;
    deptHeadTitle: string;
    hrDeptTitle: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('preplab_form_tidak_finger_meta_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      docNumber: 'TBP-FR-HR-10',
      effectiveDate: '01 November 2024',
      validDate: '1 Agustus 2022',
      revision: '0.1',
      shift: 'Siang & Malam',
      department: 'Preparation & Laboratory',
      spvName: 'Muhammad Amran Selang',
      spvTitle: 'SPV/Sptd Dept',
      deptHeadName: 'Deni Nugraha Perdiana',
      deptHeadTitle: 'Departemen Head',
      hrDeptTitle: 'HR Departemen'
    };
  });

  // State cetak (Print Satuan / Print Semua)
  const [printSingleDate, setPrintSingleDate] = useState<string | null>(null);

  // Modal State: Tambah / Edit Karyawan
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingTargetDate, setEditingTargetDate] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [empFormNik, setEmpFormNik] = useState('');
  const [empFormName, setEmpFormName] = useState('');
  const [empFormPt, setEmpFormPt] = useState('TBP');
  const [empFormJamMasuk, setEmpFormJamMasuk] = useState('-');
  const [empFormJamPulang, setEmpFormJamPulang] = useState('-');
  const [empFormReason, setEmpFormReason] = useState('Kendala Transport');
  const [empFormLainnya, setEmpFormLainnya] = useState('');
  const [empFormSigned, setEmpFormSigned] = useState(false);

  // Autocomplete Pencarian Karyawan
  const [empSearchKeyword, setEmpSearchKeyword] = useState('');
  const [showEmpSuggestions, setShowEmpSuggestions] = useState(false);

  // Modal State: Edit Header & Pengesahan Dokumen
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaFormDocNumber, setMetaFormDocNumber] = useState(docHeaderMeta.docNumber);
  const [metaFormEffectiveDate, setMetaFormEffectiveDate] = useState(docHeaderMeta.effectiveDate);
  const [metaFormValidDate, setMetaFormValidDate] = useState(docHeaderMeta.validDate);
  const [metaFormRevision, setMetaFormRevision] = useState(docHeaderMeta.revision);
  const [metaFormShift, setMetaFormShift] = useState(docHeaderMeta.shift);
  const [metaFormDepartment, setMetaFormDepartment] = useState(docHeaderMeta.department);
  const [metaFormSpvName, setMetaFormSpvName] = useState(docHeaderMeta.spvName);
  const [metaFormSpvTitle, setMetaFormSpvTitle] = useState(docHeaderMeta.spvTitle);
  const [metaFormDeptHeadName, setMetaFormDeptHeadName] = useState(docHeaderMeta.deptHeadName);
  const [metaFormDeptHeadTitle, setMetaFormDeptHeadTitle] = useState(docHeaderMeta.deptHeadTitle);

  // Simpan meta ke localStorage saat berubah
  useEffect(() => {
    try {
      localStorage.setItem('preplab_form_tidak_finger_meta_v1', JSON.stringify(docHeaderMeta));
    } catch {}
  }, [docHeaderMeta]);

  // Simpan overrides ke localStorage saat berubah
  useEffect(() => {
    try {
      if (formOverrides) {
        localStorage.setItem('preplab_form_tidak_finger_custom_records_v1', JSON.stringify(formOverrides));
      } else {
        localStorage.removeItem('preplab_form_tidak_finger_custom_records_v1');
      }
    } catch {}
  }, [formOverrides]);

  const fetchData = async (forceSync = false) => {
    try {
      if (forceSync) setSyncing(true);
      else setLoading(true);

      const endpoint = forceSync ? '/api/employee-finger/sync-sheet' : '/api/employee-finger';
      const method = forceSync ? 'POST' : 'GET';
      const res = await fetch(endpoint, { method });
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data);
        if (Array.isArray(json.allActiveEmployees) && json.allActiveEmployees.length > 0) {
          setAllActiveEmployees(json.allActiveEmployees);
        }
        setErrorMsg('');
        if (forceSync) {
          toast.success(json.message || 'Data Google Sheet Rekap Finger berhasil diperbarui!');
        }
      } else {
        throw new Error(json.message || 'Gagal memuat data rekapan finger.');
      }
    } catch (err: any) {
      console.error('Error fetching finger records:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan jaringan.');
      if (forceSync) toast.error(err.message || 'Gagal menyinkronkan data.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Pastikan 186 Karyawan Aktif Roster selalu terisi lengkap
    fetch('/api/employees')
      .then(r => r.json())
      .then(resData => {
        const list = Array.isArray(resData) ? resData : (resData.data || []);
        const active = list.filter((e: any) => {
          const pt = String(e.pt || '').toUpperCase().trim();
          const isResigned = String(e.status || '').toLowerCase().includes('resign') ||
                             String(e.employmentStatus || '').toLowerCase().includes('resign') ||
                             String(e.statusKerja || '').toLowerCase().includes('resign');
          return !isResigned && (pt.includes('TBP') || pt.includes('GPS'));
        }).map((e: any) => ({
          nik: e.nik,
          name: e.name,
          pt: e.pt,
          section: e.section,
          jabatan: e.jabatan,
          gol: e.gol || e.jobGrade || ''
        }));
        if (active.length > 0) {
          setAllActiveEmployees(prev => (prev.length >= active.length ? prev : active));
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateRecordReason = async (item: FingerRecapItem, newReason: string) => {
    const previous = [...records];
    const updated = records.map(r => r.sheetRowId === item.sheetRowId ? { ...r, alasanKategori: newReason } : r);
    setRecords(updated);

    try {
      const res = await fetch('/api/employee-finger/update-record', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetRowId: item.sheetRowId,
          nik: item.nik,
          name: item.name,
          pt: item.pt,
          tanggal: item.tanggal,
          alasanKategori: newReason
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success(`Alasan ${item.name} diperbarui ke "${newReason}"`);
    } catch (err: any) {
      toast.error('Gagal menyimpan perubahan alasan.');
      setRecords(previous);
    }
  };

  const uniqueDates = useMemo(() => {
    const map = new Map<string, { iso: string; display: string; doc: string; count: number }>();
    records.forEach(r => {
      if (!map.has(r.tanggal)) {
        map.set(r.tanggal, {
          iso: r.tanggal,
          display: r.tanggalDisplay,
          doc: r.tanggalDoc,
          count: 1
        });
      } else {
        map.get(r.tanggal)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.iso.localeCompare(a.iso));
  }, [records]);

  // Data Karyawan yang Perlu Dibuat Form: Khusus status #VALUE! dari Google Sheet & Excel Comben
  const needFormRecords = useMemo(() => {
    return records.filter(item => Boolean(item.isValueError || item.source === 'google_sheet'));
  }, [records]);

  // Tanggal unik khusus untuk Tab Form & Tab Karyawan yang perlu dibuat Form
  const formUniqueDates = useMemo(() => {
    const map = new Map<string, { iso: string; display: string; doc: string; count: number }>();
    needFormRecords.forEach(r => {
      if (!map.has(r.tanggal)) {
        map.set(r.tanggal, {
          iso: r.tanggal,
          display: r.tanggalDisplay,
          doc: r.tanggalDoc,
          count: 1
        });
      } else {
        map.get(r.tanggal)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.iso.localeCompare(a.iso));
  }, [needFormRecords]);

  const filteredRecords = useMemo(() => {
    let result = records.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchNik = item.nik.toLowerCase().includes(q);
        if (!matchName && !matchNik) return false;
      }
      if (selectedPt !== 'ALL' && item.pt.toUpperCase() !== selectedPt.toUpperCase()) return false;
      if (selectedSchedule !== 'ALL' && !item.schedule.toUpperCase().startsWith(selectedSchedule.toUpperCase())) return false;
      if (selectedReason !== 'ALL' && item.alasanKategori !== selectedReason) return false;
      if (selectedDate !== 'ALL' && item.tanggal !== selectedDate) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'tanggal') cmp = a.tanggal.localeCompare(b.tanggal);
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'nik') cmp = a.nik.localeCompare(b.nik);
      else if (sortField === 'jamMasuk') cmp = a.jamMasuk.localeCompare(b.jamMasuk);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [records, searchQuery, selectedPt, selectedSchedule, selectedReason, selectedDate, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Daftar semua karyawan unik dari records untuk autocomplete
  const knownEmployees = useMemo(() => {
    const map = new Map<string, { nik: string; name: string; pt: string }>();
    records.forEach(r => {
      if (r.nik && !map.has(r.nik)) {
        map.set(r.nik, { nik: r.nik, name: r.name, pt: r.pt || 'TBP' });
      }
    });
    return Array.from(map.values());
  }, [records]);

  // Autocomplete suggestion list
  const filteredSuggestions = useMemo(() => {
    if (!empSearchKeyword.trim()) return [];
    const q = empSearchKeyword.toLowerCase().trim();
    return knownEmployees.filter(
      e => e.nik.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [knownEmployees, empSearchKeyword]);

  // recordsByDate mengintegrasikan formOverrides (jika pernah diedit oleh user)
  // ==============================================================
  // LOGIKA PENGELOMPOKKAN PER KARYAWAN (GROUPED BY EMPLOYEE)
  // Menampilkan 1 baris per karyawan dengan tanggal-tanggal berderet
  // ==============================================================
  const groupedEmployees = useMemo<EmployeeFingerGroup[]>(() => {
    const map = new Map<string, EmployeeFingerGroup>();

    // 1. Inisialisasi dari seluruh Karyawan Roster Aktif TBP & GPS (Gol V - I)
    const baseList = allActiveEmployees.length > 0 ? allActiveEmployees : [];
    baseList.forEach(emp => {
      const gLevel = parseGolonganLevel(emp.gol, emp.jabatan);
      map.set(emp.nik, {
        nik: emp.nik,
        name: emp.name,
        pt: emp.pt || 'TBP',
        shift: emp.shift || 'Nonshift',
        section: emp.section || 'Preparation & Laboratory',
        jabatan: emp.jabatan || 'Crew Prep & Lab',
        gol: emp.gol || '',
        golLevel: gLevel,
        golDisplay: formatGolonganRoman(gLevel),
        incidents: [],
        reasonCounts: {},
        latestJamMasuk: '-',
        latestJamPulang: '-'
      });
    });

    // 2. Cocokkan insiden kendala finger dari filteredRecords HANYA untuk Karyawan Aktif Roster (186 orang)
    filteredRecords.forEach(item => {
      let group = map.get(item.nik);
      if (!group) {
        // STRICT: Abaikan jika karyawan bukan bagian dari 186 Karyawan Aktif Roster
        return;
      }

      group.incidents.push(item);
      group.reasonCounts[item.alasanKategori] = (group.reasonCounts[item.alasanKategori] || 0) + 1;
      if (group.latestJamMasuk === '-' && item.jamMasuk !== '-') group.latestJamMasuk = item.jamMasuk;
      if (group.latestJamPulang === '-' && item.jamPulang !== '-') group.latestJamPulang = item.jamPulang;
    });

    // 3. Urutkan tanggal kejadian setiap karyawan secara kronologis
    for (const group of map.values()) {
      group.incidents.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    }

    let list = Array.from(map.values());

    // 4. Filter Perusahaan (PT Roster: TBP / GPS)
    if (selectedPt !== 'ALL') {
      const ptUpper = selectedPt.toUpperCase();
      list = list.filter(e => e.pt.toUpperCase() === ptUpper);
    }

    // Filter Shift Roster: Shift A, Shift B, Nonshift
    if (selectedShift !== 'ALL') {
      list = list.filter(e => e.shift === selectedShift);
    }

    // 5. Filter Golongan (Gol V - I)
    if (selectedGol !== 'ALL') {
      const golTarget = parseInt(selectedGol, 10);
      list = list.filter(e => e.golLevel === golTarget);
    }

    // 6. Filter Scope: Hanya Terkendala Finger vs Semua Karyawan
    if (employeeScope === 'issues_only') {
      list = list.filter(e => e.incidents.length > 0);
    }

    // 7. Filter Alasan Kendala
    if (selectedReason !== 'ALL') {
      list = list.filter(e => e.incidents.some(i => i.alasanKategori === selectedReason));
    }

    // 8. Filter Pencarian Nama / NIK
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.nik.toLowerCase().includes(q));
    }

    // 9. Urutkan: Golongan V ke I (Level 5 -> 1), lalu yang ada insiden, lalu alfabetis nama
    list.sort((a, b) => {
      if (b.golLevel !== a.golLevel) {
        return b.golLevel - a.golLevel; // Gol V paling atas, lalu IV, III, II, I
      }
      if (b.incidents.length !== a.incidents.length) {
        return b.incidents.length - a.incidents.length;
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [filteredRecords, allActiveEmployees, employeeScope, selectedPt, selectedShift, selectedGol, selectedReason, searchQuery]);

  const toggleEmployeeExpand = (nik: string) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [nik]: !prev[nik]
    }));
  };

  const expandAllEmployees = () => {
    const next: Record<string, boolean> = {};
    groupedEmployees.forEach(e => { next[e.nik] = true; });
    setExpandedEmployees(next);
  };

  const collapseAllEmployees = () => {
    setExpandedEmployees({});
  };

  const recordsByDate = useMemo(() => {
    const map = new Map<string, FingerRecapItem[]>();

    // STRICT: Untuk Form, yang diambil HANYA karyawan yang terdaftar di list pada Tab "Karyawan yang perlu dibuat Form" (#VALUE!)
    needFormRecords.forEach(item => {
      if (!map.has(item.tanggal)) map.set(item.tanggal, []);
      map.get(item.tanggal)!.push(item);
    });

    // Jika ada formOverrides, gunakan override per tanggal
    if (formOverrides) {
      Object.entries(formOverrides).forEach(([tgl, customItems]) => {
        map.set(tgl, customItems);
      });
    }

    // Filter jika user memilih tanggal spesifik di dropdown form
    let entries = Array.from(map.entries());
    if (formFilterDate !== 'ALL') {
      entries = entries.filter(([d]) => d === formFilterDate);
    }

    return entries.sort((a, b) => b[0].localeCompare(a[0]));
  }, [needFormRecords, formFilterDate, formOverrides]);

  // Helper untuk membuka modal tambah karyawan ke tanggal tertentu
  const handleOpenAddEmployee = (targetDateIso?: string) => {
    const defaultDate = targetDateIso || (formUniqueDates[0]?.iso || uniqueDates[0]?.iso || new Date().toISOString().split('T')[0]);
    setEditingTargetDate(defaultDate);
    setEditingItemId(null);
    setEmpFormNik('');
    setEmpFormName('');
    setEmpFormPt('TBP');
    setEmpFormJamMasuk('-');
    setEmpFormJamPulang('-');
    setEmpFormReason('Kendala Transport');
    setEmpFormLainnya('');
    setEmpFormSigned(false);
    setEmpSearchKeyword('');
    setShowEmpSuggestions(false);
    setEmployeeModalOpen(true);
  };

  // Helper untuk membuka modal edit karyawan
  const handleOpenEditEmployee = (dateIso: string, item: FingerRecapItem) => {
    setEditingTargetDate(dateIso);
    setEditingItemId(String(item.sheetRowId || item.id));
    setEmpFormNik(item.nik);
    setEmpFormName(item.name);
    setEmpFormPt(item.pt || 'TBP');
    setEmpFormJamMasuk(item.jamMasuk || '-');
    setEmpFormJamPulang(item.jamPulang || '-');
    setEmpFormReason(item.alasanKategori || 'Kendala Transport');
    setEmpFormLainnya(item.keteranganLain || '');
    setEmpFormSigned(Boolean(item.tandaTangan));
    setEmpSearchKeyword('');
    setShowEmpSuggestions(false);
    setEmployeeModalOpen(true);
  };

  // Helper simpan data karyawan ke form overrides
  const handleSaveEmployee = () => {
    if (!empFormName.trim() || !empFormNik.trim()) {
      toast.error('Harap isi Nama dan NIK karyawan.');
      return;
    }

    // Tentukan tanggalDoc display
    const dateObj = new Date(editingTargetDate + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const docDisplay = !isNaN(dateObj.getTime())
      ? `${String(dateObj.getDate()).padStart(2, '0')}-${months[dateObj.getMonth()]}-${dateObj.getFullYear()}`
      : editingTargetDate;

    // Ambil list saat ini untuk tanggal target (khusus list yang perlu dibuatkan form)
    const currentList = (formOverrides && formOverrides[editingTargetDate])
      ? [...formOverrides[editingTargetDate]]
      : [...(needFormRecords.filter(r => r.tanggal === editingTargetDate))];

    if (editingItemId) {
      // Edit mode
      const updatedList = currentList.map(item => {
        if (String(item.sheetRowId || item.id) === editingItemId) {
          return {
            ...item,
            nik: empFormNik.trim(),
            name: empFormName.trim(),
            pt: empFormPt,
            jamMasuk: empFormJamMasuk.trim() || '-',
            jamPulang: empFormJamPulang.trim() || '-',
            alasanKategori: empFormReason,
            keteranganLain: empFormReason === 'Lainnya' ? empFormLainnya.trim() : '',
            tandaTangan: empFormSigned ? 'Signed' : undefined
          };
        }
        return item;
      });

      setFormOverrides(prev => ({
        ...(prev || {}),
        [editingTargetDate]: updatedList
      }));

      // Simpan ke database backend agar permanen
      fetch('/api/employee-finger/update-record', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetRowId: editingItemId,
          nik: empFormNik.trim(),
          name: empFormName.trim(),
          pt: empFormPt,
          tanggal: editingTargetDate,
          jamMasuk: empFormJamMasuk.trim() || '-',
          jamPulang: empFormJamPulang.trim() || '-',
          alasanKategori: empFormReason,
          keteranganLain: empFormReason === 'Lainnya' ? empFormLainnya.trim() : '',
          tandaTangan: empFormSigned ? 'Signed' : ''
        })
      }).catch(() => {});

      toast.success(`Data karyawan "${empFormName}" berhasil diperbarui.`);
    } else {
      // Add mode
      const customRowId = `custom-row-${Date.now()}`;
      const newItem: FingerRecapItem = {
        id: `custom-${Date.now()}`,
        sheetRowId: customRowId,
        nik: empFormNik.trim(),
        name: empFormName.trim(),
        pt: empFormPt,
        section: 'Preparation & Laboratory',
        jabatan: 'Crew, Preparation & Laboratory',
        tanggal: editingTargetDate,
        tanggalDisplay: editingTargetDate.split('-').reverse().join('/'),
        tanggalDoc: docDisplay,
        jamMasuk: empFormJamMasuk.trim() || '-',
        jamPulang: empFormJamPulang.trim() || '-',
        schedule: 'D',
        alasanKategori: empFormReason,
        keteranganLain: empFormReason === 'Lainnya' ? empFormLainnya.trim() : '',
        tandaTangan: empFormSigned ? 'Signed' : undefined,
        source: 'db'
      };

      setFormOverrides(prev => ({
        ...(prev || {}),
        [editingTargetDate]: [...currentList, newItem]
      }));

      // Simpan record baru ke database backend agar permanen
      fetch('/api/employee-finger/add-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: empFormNik.trim(),
          name: empFormName.trim(),
          pt: empFormPt,
          tanggal: editingTargetDate,
          jamMasuk: empFormJamMasuk.trim() || '-',
          jamPulang: empFormJamPulang.trim() || '-',
          alasanKategori: empFormReason,
          keteranganLain: empFormReason === 'Lainnya' ? empFormLainnya.trim() : '',
          tandaTangan: empFormSigned ? 'Signed' : ''
        })
      }).catch(() => {});

      toast.success(`Karyawan "${empFormName}" berhasil ditambahkan ke formulir.`);
    }

    setEmployeeModalOpen(false);
  };

  // Helper hapus baris karyawan dari formulir tanggal tertentu
  const handleDeleteEmployeeRow = (dateIso: string, itemKey: string, empName: string) => {
    if (!confirm(`Hapus ${empName} dari formulir tanggal ini?`)) return;

    const currentList = (formOverrides && formOverrides[dateIso])
      ? [...formOverrides[dateIso]]
      : [...(needFormRecords.filter(r => r.tanggal === dateIso))];

    const updatedList = currentList.filter(item => String(item.sheetRowId || item.id) !== itemKey);

    setFormOverrides(prev => ({
      ...(prev || {}),
      [dateIso]: updatedList
    }));

    // Hapus dari backend database jika ada
    fetch('/api/employee-finger/delete-record', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetRowId: itemKey })
    }).catch(() => {});

    toast.success(`Baris ${empName} telah dihapus dari formulir.`);
  };

  // Helper simpan pengesahan & metadata dokumen
  const handleSaveHeaderMeta = () => {
    setDocHeaderMeta({
      docNumber: metaFormDocNumber.trim() || 'TBP-FR-HR-10',
      effectiveDate: metaFormEffectiveDate.trim() || '01 November 2024',
      validDate: metaFormValidDate.trim() || '1 Agustus 2022',
      revision: metaFormRevision.trim() || '0.1',
      shift: metaFormShift.trim() || 'Siang & Malam',
      department: metaFormDepartment.trim() || 'Preparation & Laboratory',
      spvName: metaFormSpvName.trim() || 'Muhammad Amran Selang',
      spvTitle: metaFormSpvTitle.trim() || 'SPV/Sptd Dept',
      deptHeadName: metaFormDeptHeadName.trim() || 'Deni Nugraha Perdiana',
      deptHeadTitle: metaFormDeptHeadTitle.trim() || 'Departemen Head',
      hrDeptTitle: 'HR Departemen'
    });
    setMetaModalOpen(false);
    toast.success('Pengaturan header & pengesahan dokumen berhasil disimpan.');
  };

  // Helper reset formulir ke data bawaan sistem
  const handleResetFormOverrides = () => {
    if (!confirm('Kembalikan seluruh isi formulir ke data otomatis hasil sinkronisasi? Semua penyesuaian manual di formulir akan di-reset.')) return;
    setFormOverrides(null);
    localStorage.removeItem('preplab_form_tidak_finger_custom_records_v1');
    toast.success('Formulir berhasil di-reset ke data otomatis.');
  };

  // Helper cetak formulir (Satuan vs Banyak)
  const handlePrintDocument = (targetDateIso?: string) => {
    if (targetDateIso) {
      setPrintSingleDate(targetDateIso);
    } else {
      setPrintSingleDate(null);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // ==========================================
  // DATA FILTERED BERDASARKAN PERIODE DIAGRAM
  // (Per Minggu, Per Bulan, Per Tahun, atau Semua)
  // ==========================================
  const periodFilteredRecords = useMemo(() => {
    return records.filter(r => {
      if (!r.tanggal) return false;

      if (diagramViewMode === 'week') {
        return r.tanggal >= diagramWeekStartStr && r.tanggal <= diagramWeekEndStr;
      }
      if (diagramViewMode === 'month') {
        return r.tanggal.startsWith(diagramMonthStr);
      }
      if (diagramViewMode === 'year') {
        return r.tanggal.startsWith(diagramYearStr);
      }
      return true;
    });
  }, [records, diagramViewMode, diagramWeekStartStr, diagramWeekEndStr, diagramMonthStr, diagramYearStr]);

  // Statistik khusus untuk diagram pada periode terpilih
  const diagramStats = useMemo(() => {
    const total = periodFilteredRecords.length;
    const tbp = periodFilteredRecords.filter(r => r.pt === 'TBP').length;
    const gps = periodFilteredRecords.filter(r => r.pt === 'GPS').length;
    const empRosterMap = new Map<string, { pt: string; shift: string }>();
    allActiveEmployees.forEach(e => {
      empRosterMap.set(e.nik, { pt: e.pt || 'TBP', shift: e.shift || 'Nonshift' });
    });
    const shiftA = periodFilteredRecords.filter(r => (empRosterMap.get(r.nik)?.shift || r.shift) === 'Shift A').length;
    const shiftB = periodFilteredRecords.filter(r => (empRosterMap.get(r.nik)?.shift || r.shift) === 'Shift B').length;
    const nonshift = periodFilteredRecords.filter(r => {
      const s = empRosterMap.get(r.nik)?.shift || r.shift;
      return s === 'Nonshift' || (!s || (s !== 'Shift A' && s !== 'Shift B'));
    }).length;
    const siang = periodFilteredRecords.filter(r => r.schedule === 'D' || r.schedule === 'LS').length;
    const malam = periodFilteredRecords.filter(r => r.schedule === 'N').length;
    const uniquePersonnel = new Set(periodFilteredRecords.map(r => r.nik)).size;

    const reasonCounts: Record<string, number> = {};
    periodFilteredRecords.forEach(r => {
      reasonCounts[r.alasanKategori] = (reasonCounts[r.alasanKategori] || 0) + 1;
    });

    const dateCountsMap = new Map<string, { iso: string; formatted: string; count: number }>();
    periodFilteredRecords.forEach(r => {
      const iso = r.tanggal || '';
      if (!dateCountsMap.has(iso)) {
        dateCountsMap.set(iso, {
          iso,
          formatted: formatToIndoDateDDMMMYYYY(iso),
          count: 1
        });
      } else {
        dateCountsMap.get(iso)!.count++;
      }
    });

    const dateChartData = Array.from(dateCountsMap.values())
      .filter(item => item.iso && item.iso !== '-')
      .sort((a, b) => a.iso.localeCompare(b.iso))
      .map(d => ({ date: d.formatted, count: d.count }));

    const dateCounts: Record<string, number> = {};
    dateChartData.forEach(d => {
      dateCounts[d.date] = d.count;
    });

    const empCounts: Record<string, { nik: string; name: string; pt: string; count: number }> = {};
    periodFilteredRecords.forEach(r => {
      if (!empCounts[r.nik]) {
        empCounts[r.nik] = { nik: r.nik, name: r.name, pt: r.pt, count: 0 };
      }
      empCounts[r.nik].count++;
    });
    const topEmployees = Object.values(empCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      total,
      tbp,
      gps,
      shiftA,
      shiftB,
      nonshift,
      siang,
      malam,
      uniquePersonnel,
      reasonCounts,
      dateCounts,
      dateChartData,
      topEmployees
    };
  }, [periodFilteredRecords, allActiveEmployees]);

  // Rincian Daftar Karyawan Izin pada Periode Terpilih (dengan search & filter kategori alasan)
  const diagramTableRecords = useMemo(() => {
    return periodFilteredRecords.filter(r => {
      if (diagramFilterReason !== 'ALL' && r.alasanKategori !== diagramFilterReason) {
        return false;
      }
      if (diagramSearchTable.trim()) {
        const q = diagramSearchTable.toLowerCase().trim();
        const matchName = r.name.toLowerCase().includes(q);
        const matchNik = r.nik.toLowerCase().includes(q);
        if (!matchName && !matchNik) return false;
      }
      return true;
    });
  }, [periodFilteredRecords, diagramFilterReason, diagramSearchTable]);

  const stats = useMemo(() => {
    const total = records.length;
    const empRosterMap = new Map<string, { pt: string; shift: string }>();
    allActiveEmployees.forEach(e => {
      empRosterMap.set(e.nik, { pt: e.pt || 'TBP', shift: e.shift || 'Nonshift' });
    });

    const tbp = records.filter(r => (empRosterMap.get(r.nik)?.pt || r.pt) === 'TBP').length;
    const gps = records.filter(r => (empRosterMap.get(r.nik)?.pt || r.pt) === 'GPS').length;
    
    // Shift A, Shift B, Nonshift sesuai data Roster
    const shiftA = records.filter(r => (empRosterMap.get(r.nik)?.shift || r.shift) === 'Shift A').length;
    const shiftB = records.filter(r => (empRosterMap.get(r.nik)?.shift || r.shift) === 'Shift B').length;
    const nonshift = records.filter(r => {
      const s = empRosterMap.get(r.nik)?.shift || r.shift;
      return s === 'Nonshift' || (!s || (s !== 'Shift A' && s !== 'Shift B'));
    }).length;

    const siang = records.filter(r => r.schedule === 'D' || r.schedule === 'LS').length;
    const malam = records.filter(r => r.schedule === 'N').length;
    const uniquePersonnel = new Set(records.map(r => r.nik)).size;

    const activeTbp = allActiveEmployees.filter(e => e.pt === 'TBP').length || 110;
    const activeGps = allActiveEmployees.filter(e => e.pt === 'GPS').length || 76;
    const activeShiftA = allActiveEmployees.filter(e => e.shift === 'Shift A').length || 80;
    const activeShiftB = allActiveEmployees.filter(e => e.shift === 'Shift B').length || 84;
    const activeNonshift = allActiveEmployees.filter(e => e.shift === 'Nonshift').length || 22;

    const reasonCounts: Record<string, number> = {};
    records.forEach(r => {
      reasonCounts[r.alasanKategori] = (reasonCounts[r.alasanKategori] || 0) + 1;
    });

    const dateCounts: Record<string, number> = {};
    records.forEach(r => {
      dateCounts[r.tanggalDisplay] = (dateCounts[r.tanggalDisplay] || 0) + 1;
    });

    const empCounts: Record<string, { nik: string; name: string; pt: string; count: number }> = {};
    records.forEach(r => {
      if (!empCounts[r.nik]) {
        empCounts[r.nik] = { nik: r.nik, name: r.name, pt: r.pt, count: 0 };
      }
      empCounts[r.nik].count++;
    });
    const topEmployees = Object.values(empCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      total,
      tbp,
      gps,
      shiftA,
      shiftB,
      nonshift,
      activeTbp,
      activeGps,
      activeShiftA,
      activeShiftB,
      activeNonshift,
      siang,
      malam,
      uniquePersonnel,
      reasonCounts,
      dateCounts,
      topEmployees
    };
  }, [records, allActiveEmployees]);

  const handleExportExcel = () => {
    if (records.length === 0) {
      toast.error('Tidak ada data untuk diekspor.');
      return;
    }

    const exportRows = filteredRecords.map((r, idx) => {
      const row: Record<string, any> = {
        'No': idx + 1,
        'NIK': r.nik,
        'Nama': r.name,
        'Jam Masuk': r.jamMasuk,
        'Jam Pulang': r.jamPulang
      };

      FINGER_REASON_COLUMNS.forEach(col => {
        row[col.label] = r.alasanKategori === col.key ? '?' : '-';
      });

      row['Tanggal'] = r.tanggalDisplay;
      row['Perusahaan'] = r.pt;
      row['Schedule'] = r.schedule;
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Tabel Rekap Finger');

    const summaryData = [
      ['REKAPITULASI PENGAJUAN IZIN TIDAK FINGER - PREPARATION & LABORATORY'],
      ['Tanggal Ekspor', new Date().toLocaleString('id-ID')],
      [],
      ['RINGKASAN METRIK', 'JUMLAH KASUS'],
      ['Total Kasus Tidak Finger', stats.total],
      ['Total Personel Unik Terkendala', stats.uniquePersonnel],
      ['Total Karyawan TBP', stats.tbp],
      ['Total Karyawan GPS', stats.gps],
      ['Kasus Shift Siang (D / LS)', stats.siang],
      ['Kasus Shift Malam (N)', stats.malam],
      [],
      ['DISTRIBUSI KENDALA & ALASAN', 'JUMLAH'],
      ...Object.entries(stats.reasonCounts).map(([reason, count]) => [reason, count]),
      [],
      ['TOP 5 KARYAWAN DENGAN KASUS TERBANYAK', 'NIK', 'PERUSAHAAN', 'JUMLAH KASUS'],
      ...stats.topEmployees.map(e => [e.name, e.nik, e.pt, e.count])
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan & Analitik');

    XLSX.writeFile(wb, `Rekapan_Finger_PrepLab_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('File Excel Rekapan Finger berhasil didownload!');
  };

  // Memoized map shift roster
  const empShiftMap = useMemo(() => {
    const map = new Map<string, string>();
    allActiveEmployees.forEach(e => {
      if (e.nik) map.set(e.nik.toUpperCase().trim(), e.shift || 'Nonshift');
    });
    return map;
  }, [allActiveEmployees]);

  // Data filter untuk Tab: Karyawan yang perlu dibuat Form (#VALUE!)
  const filteredValueRecords = useMemo(() => {
    let result = needFormRecords.filter(item => {
      if (valSearchQuery.trim()) {
        const q = valSearchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchNik = item.nik.toLowerCase().includes(q);
        if (!matchName && !matchNik) return false;
      }
      if (valSelectedPt !== 'ALL' && item.pt.toUpperCase() !== valSelectedPt.toUpperCase()) return false;
      if (valSelectedDate !== 'ALL' && item.tanggal !== valSelectedDate) return false;
      if (valSelectedReason !== 'ALL' && item.alasanKategori !== valSelectedReason) return false;
      if (valSelectedShift !== 'ALL') {
        const s = empShiftMap.get(item.nik.toUpperCase().trim()) || 'Nonshift';
        if (s !== valSelectedShift) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [needFormRecords, valSearchQuery, valSelectedPt, valSelectedDate, valSelectedReason, valSelectedShift, empShiftMap]);

  const valTotalPages = Math.ceil(filteredValueRecords.length / valPageSize) || 1;
  const paginatedValueRecords = useMemo(() => {
    const start = (valCurrentPage - 1) * valPageSize;
    return filteredValueRecords.slice(start, start + valPageSize);
  }, [filteredValueRecords, valCurrentPage, valPageSize]);

  // Kartu DisplayCards untuk Landing View Modul Rekapan Finger
  const fingerDisplayCards: DisplayCardProps[] = useMemo(() => [
    {
      icon: <TableIcon className="w-4 h-4 text-emerald-600" />,
      title: "Tabel Rekap Absensi",
      description: "Rekap data kehadiran, jam masuk/keluar & catatan finger",
      date: `${groupedEmployees.length} Karyawan Terdata (${records.length} Kasus)`,
      iconClassName: activeTab === 'rekap' ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/40" : "bg-slate-100 text-emerald-600",
      titleClassName: "text-emerald-800",
      className: activeTab === 'rekap' ? "border-emerald-500/70 shadow-md ring-2 ring-emerald-500/20 bg-emerald-50/30" : "",
      onClick: () => setActiveTab('rekap')
    },
    {
      icon: <FileText className="w-4 h-4 text-indigo-600" />,
      title: "Form Tidak Finger",
      description: "Dokumen resmi TBP-FR-HR-10 form dispensasi finger karyawan",
      date: `${recordsByDate.length} Form Terbit / Tersimpan`,
      iconClassName: (activeTab === 'form' && formSubTab === 'form_view') ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/40" : "bg-slate-100 text-indigo-600",
      titleClassName: "text-indigo-800",
      className: (activeTab === 'form' && formSubTab === 'form_view') ? "border-indigo-500/70 shadow-md ring-2 ring-indigo-500/20 bg-indigo-50/30" : "",
      onClick: () => {
        setActiveTab('form');
        setFormSubTab('form_view');
      }
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      title: "Karyawan Perlu Form",
      description: "Filter otomatis hasil import TBP & GPS (Status #VALUE!)",
      date: `${filteredValueRecords.length} Karyawan Perlu Dibuatkan Form`,
      iconClassName: (activeTab === 'form' && formSubTab === 'need_form_view') ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500/40" : "bg-slate-100 text-amber-600",
      titleClassName: "text-amber-800",
      className: (activeTab === 'form' && formSubTab === 'need_form_view') ? "border-amber-500/70 shadow-md ring-2 ring-amber-500/20 bg-amber-50/30" : "",
      onClick: () => {
        setActiveTab('form');
        setFormSubTab('need_form_view');
      }
    }
  ], [activeTab, formSubTab, groupedEmployees.length, records.length, recordsByDate.length, filteredValueRecords.length]);

  const handleExportValueRecords = () => {
    if (filteredValueRecords.length === 0) {
      toast.error('Tidak ada data #VALUE! untuk diekspor.');
      return;
    }

    const exportRows = filteredValueRecords.map((r, idx) => ({
      'No': idx + 1,
      'NIK': r.nik,
      'Nama Karyawan': r.name,
      'Perusahaan': r.pt,
      'Shift Roster': empShiftMap.get(r.nik.toUpperCase().trim()) || 'Nonshift',
      'Tanggal Kejadian': formatToIndoDateDDMMMYYYY(r.tanggal),
      'Scan Masuk': r.jamMasuk,
      'Scan Pulang': r.jamPulang,
      'Status Kolom I Google Sheet': '#VALUE!',
      'Schedule': r.schedule,
      'Kategori Kendala': r.alasanKategori,
      'Keterangan': r.keteranganLain || '-',
      'Pengesahan': r.tandaTangan ? 'Signed' : '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Data VALUE Google Sheet');
    XLSX.writeFile(wb, `Karyawan_VALUE_GoogleSheet_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('File Excel Data #VALUE! berhasil didownload!');
  };

  // ==========================================================================
  // HANDLER 1: IMPORT EXCEL TABEL REKAP (REFERENSI FOTO 1)
  // Format: No, NIK, Nama, Jam Masuk, Jam Pulang, 10 Kolom Alasan, Tanggal
  // ==========================================================================
  const handleImportRekapExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      toast.loading('Membaca file Excel Rekap Finger...', { id: 'import-rekap' });

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error('Lembar kerja (Sheet) tidak ditemukan.');

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows || rows.length === 0) throw new Error('File Excel kosong.');

      // Cari baris header tabel
      let headerRowIdx = -1;
      let colNik = -1;
      let colName = -1;
      let colMasuk = -1;
      let colPulang = -1;
      let colDate = -1;
      const reasonColMap: { colIdx: number; reasonName: string }[] = [];

      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const row = rows[i] || [];
        const rowStr = row.map(c => String(c).toUpperCase()).join(' | ');
        if (rowStr.includes('NIK') && (rowStr.includes('NAMA') || rowStr.includes('JAM MASUK') || rowStr.includes('TANGGAL'))) {
          headerRowIdx = i;
          row.forEach((cellVal, cIdx) => {
            const upper = String(cellVal).trim().toUpperCase();
            if (upper === 'NIK' || upper.startsWith('NIK')) colNik = cIdx;
            else if (upper === 'NAMA' || upper.startsWith('NAMA')) colName = cIdx;
            else if (upper.includes('JAM MASUK') || upper === 'MASUK') colMasuk = cIdx;
            else if (upper.includes('JAM PULANG') || upper === 'PULANG') colPulang = cIdx;
            else if (upper.includes('TANGGAL') || upper === 'DATE') colDate = cIdx;
            else {
              for (const rCol of FINGER_REASON_COLUMNS) {
                if (upper.includes(rCol.key.toUpperCase())) {
                  reasonColMap.push({ colIdx: cIdx, reasonName: rCol.key });
                  break;
                }
              }
            }
          });
          break;
        }
      }

      if (colNik === -1 || colDate === -1) {
        throw new Error('Kolom NIK atau Tanggal tidak ditemukan dalam file. Pastikan format sesuai format Foto 1.');
      }

      const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 1;
      const newItems: FingerRecapItem[] = [];

      for (let r = startRow; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const nikRaw = String(row[colNik] || '').trim().toUpperCase();
        if (!nikRaw || nikRaw.length < 3 || nikRaw.includes('NIK')) continue;

        const nameRaw = colName >= 0 ? String(row[colName] || '').trim() : '';
        const dateRaw = row[colDate];
        const stdDate = parseAnyToStandardDate(dateRaw);
        const jamMasuk = colMasuk >= 0 ? parseAnyToTimeString(row[colMasuk]) : '-';
        const jamPulang = colPulang >= 0 ? parseAnyToTimeString(row[colPulang]) : '-';

        let matchedReason = 'Masalah Jaringan';
        for (const rCol of reasonColMap) {
          const val = String(row[rCol.colIdx] || '').trim();
          if (val && val !== '0' && val !== '-' && val.toLowerCase() !== 'false') {
            matchedReason = rCol.reasonName;
            break;
          }
        }

        const pt = (nikRaw.startsWith('02') || nikRaw.startsWith('M02')) ? 'GPS' : 'TBP';
        let schedule = 'D';
        if (jamPulang !== '-' && jamPulang <= '08:30') schedule = 'N';

        const sheetRowId = `rekap_imp_${nikRaw}_${stdDate.iso}`;

        newItems.push({
          id: sheetRowId,
          sheetRowId,
          nik: nikRaw,
          name: nameRaw || nikRaw,
          pt,
          section: 'Preparation & Laboratory',
          jabatan: 'Crew, Preparation & Laboratory',
          tanggal: stdDate.iso,
          tanggalDisplay: stdDate.display,
          tanggalDoc: stdDate.doc,
          jamMasuk,
          jamPulang,
          schedule,
          alasanKategori: matchedReason,
          source: 'manual'
        });
      }

      if (newItems.length === 0) {
        toast.dismiss('import-rekap');
        toast.info('Tidak ada baris data valid yang dapat dibaca dari file Excel.');
        return;
      }

      // Merge ke records (retention data lama tetap ada)
      setRecords(prev => {
        const map = new Map<string, FingerRecapItem>();
        prev.forEach(item => map.set(`${item.nik}_${item.tanggal}`, item));
        newItems.forEach(item => map.set(`${item.nik}_${item.tanggal}`, item));
        return Array.from(map.values());
      });

      // Simpan ke database backend
      fetch('/api/employee-finger/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newItems, source: 'import_rekap_excel' })
      }).catch(err => console.error('Bulk import error:', err));

      toast.dismiss('import-rekap');
      toast.success(`Berhasil mengimpor ${newItems.length} catatan Rekap Finger dari Excel!`);
    } catch (err: any) {
      console.error('Error importing rekap excel:', err);
      toast.dismiss('import-rekap');
      toast.error(err.message || 'Gagal memproses file Excel.');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  // ==========================================================================
  // HANDLER 2: IMPORT EXCEL COMBEN TBP / GPS (REFERENSI FOTO 2)
  // Khusus baris yang kolom Check (Kolom I) bernilai #VALUE!
  // Menyalurkan ke sub-tab "Karyawan yang perlu dibuat Form" dan "Form"
  // ==========================================================================
  const handleImportCombenExcel = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetPt: 'TBP' | 'GPS'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      toast.loading(`Membaca file absensi Excel ${targetPt}...`, { id: 'import-comben' });

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error('Lembar kerja (Sheet) tidak ditemukan dalam file Excel.');

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows || rows.length === 0) throw new Error('File Excel kosong.');

      // Cari baris header tabel (yang mengandung 'NIK' / 'NIK NEW' dan 'CHECK' / 'SCAN MASUK')
      let headerRowIdx = -1;
      let colNik = 1; // Default Col B
      let colName = 2; // Default Col C
      let colDate = 3; // Default Col D
      let colMasuk = 5; // Default Col F
      let colPulang = 6; // Default Col G
      let colMalam = 7; // Default Col H
      let colCheck = 8; // Default Col I
      let colSched = 10; // Default Col K

      for (let i = 0; i < Math.min(25, rows.length); i++) {
        const row = rows[i] || [];
        const rowStr = row.map(c => String(c).toUpperCase()).join(' | ');
        if (rowStr.includes('NIK') && (rowStr.includes('CHECK') || rowStr.includes('SCAN MASUK') || rowStr.includes('JAM KERJA'))) {
          headerRowIdx = i;
          row.forEach((cellVal, cIdx) => {
            const upper = String(cellVal).trim().toUpperCase();
            if (upper.includes('NIK')) colNik = cIdx;
            else if (upper.includes('NAMA') || upper === 'NAME') colName = cIdx;
            else if (upper.includes('TANGGAL') || upper === 'DATE') colDate = cIdx;
            else if (upper.includes('SCAN MASUK') || upper === 'MASUK') colMasuk = cIdx;
            else if (upper.includes('SCAN PULANG') || upper === 'PULANG') colPulang = cIdx;
            else if (upper.includes('SHIFT MALAM') || upper.includes('MALAM')) colMalam = cIdx;
            else if (upper === 'CHECK' || upper.includes('CHECK')) colCheck = cIdx;
            else if (upper.includes('SCHEDULE') || upper.includes('KODE ABSEN')) colSched = cIdx;
          });
          break;
        }
      }

      const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 9;
      const newItems: FingerRecapItem[] = [];

      for (let r = startRow; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        // Cek apakah kolom Check adalah #VALUE!
        const checkVal = String(row[colCheck] || '').trim().toUpperCase();
        const isValue = checkVal.includes('#VALUE') || checkVal.includes('#VAL') || checkVal === '15';
        if (!isValue) continue;

        const nikRaw = String(row[colNik] || '').trim().toUpperCase();
        if (!nikRaw || nikRaw.length < 3 || nikRaw.includes('NIK')) continue;

        const nameRaw = String(row[colName] || '').trim();
        const dateRaw = row[colDate];
        const stdDate = parseAnyToStandardDate(dateRaw);
        const jamMasuk = parseAnyToTimeString(row[colMasuk]);
        const jamPulang = parseAnyToTimeString(row[colPulang]);
        const shiftMalam = parseAnyToTimeString(row[colMalam]);
        const schedule = String(row[colSched] || '').trim() || 'D';

        let alasanKategori = 'Masalah Jaringan';
        if (jamMasuk === '-' && jamPulang !== '-') {
          alasanKategori = 'Lupa Finger Masuk';
        } else if (jamMasuk !== '-' && jamPulang === '-') {
          alasanKategori = 'Lupa Finger Pulang';
        } else if (jamMasuk === '-' && jamPulang === '-') {
          alasanKategori = 'Lupa Finger Masuk dan Pulang';
        } else {
          alasanKategori = 'Kendala Sidik Jari';
        }

        const sheetRowId = `comben_${targetPt.toLowerCase()}_${nikRaw}_${stdDate.iso}`;

        newItems.push({
          id: sheetRowId,
          sheetRowId,
          nik: nikRaw,
          name: nameRaw || nikRaw,
          pt: targetPt,
          section: 'Preparation & Laboratory',
          jabatan: 'Crew, Preparation & Laboratory',
          tanggal: stdDate.iso,
          tanggalDisplay: stdDate.display,
          tanggalDoc: stdDate.doc,
          jamMasuk,
          jamPulang,
          schedule,
          alasanKategori,
          rawShiftMalam: shiftMalam,
          source: 'google_sheet'
        });
      }

      if (newItems.length === 0) {
        toast.dismiss('import-comben');
        toast.info(`Tidak ditemukan baris dengan status #VALUE! pada file Excel ${targetPt}. Pastikan kolom Check berisi #VALUE!.`);
        return;
      }

      // 1. Perbarui state records (merge dengan retention)
      setRecords(prev => {
        const map = new Map<string, FingerRecapItem>();
        prev.forEach(r => map.set(`${r.nik}_${r.tanggal}`, r));
        newItems.forEach(r => map.set(`${r.nik}_${r.tanggal}`, r));
        return Array.from(map.values());
      });

      // 2. Muat otomatis ke Tab Form (TBP-FR-HR-10 per lembar tanggal)
      setFormOverrides(prev => {
        const updated = { ...(prev || {}) };
        newItems.forEach(item => {
          const tgl = item.tanggal;
          if (!updated[tgl]) {
            updated[tgl] = records.filter(r => r.tanggal === tgl);
          }
          const existingIdx = updated[tgl].findIndex(r => r.nik === item.nik);
          if (existingIdx >= 0) {
            updated[tgl][existingIdx] = item;
          } else {
            updated[tgl].push(item);
          }
        });
        try {
          localStorage.setItem('preplab_form_tidak_finger_custom_records_v1', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 3. Simpan permanen ke database backend
      fetch('/api/employee-finger/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: newItems,
          source: `import_${targetPt.toLowerCase()}`
        })
      }).catch(err => console.error('Bulk import error:', err));

      toast.dismiss('import-comben');
      toast.success(
        `Berhasil mengimpor ${newItems.length} karyawan #VALUE! PT ${targetPt}. Data otomatis dimuat pada Formulir TBP-FR-HR-10 dan Karyawan yang Perlu Dibuat Form.`
      );

      // Otomatis arahkan ke sub-tab Form dan tampilkan tanggal dari data yang baru diimpor
      setFormSubTab('form_view');
      if (newItems[0]?.tanggal) {
        setFormFilterDate(newItems[0].tanggal);
      }
    } catch (err: any) {
      console.error('Error importing comben excel:', err);
      toast.dismiss('import-comben');
      toast.error(err.message || 'Gagal memproses file Excel.');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handlePrintForms = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors pb-16">
      {/* ================= HEADER ATAS ================= */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Judul & Back */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (activeTab !== 'landing') {
                    setActiveTab('landing');
                    return;
                  }
                  if (onBack) onBack();
                  else if (onNav) onNav('home');
                  else window.history.back();
                }}
                className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={activeTab !== 'landing' ? "Kembali ke Menu Tab" : "Kembali ke Menu Utama"}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    Rekapan Finger Karyawan
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      TBP &amp; GPS
                    </span>
                  </h1>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rekapitulasi ketidakhadiran finger &amp; formulir pengajuan izin resmi Preparation &amp; Laboratory
                </p>
              </div>
            </div>

            {/* Actions: Sync & Import & Export & Print */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Hidden File Inputs */}
              <input
                ref={rekapFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportRekapExcel}
              />
              <input
                ref={tbpFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => handleImportCombenExcel(e, 'TBP')}
              />
              <input
                ref={gpsFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => handleImportCombenExcel(e, 'GPS')}
              />


              {/* Tombol Import Excel Tabel Rekap (Format Foto 1) */}
              {activeTab === 'rekap' && (
                <button
                  type="button"
                  onClick={() => rekapFileInputRef.current?.click()}
                  disabled={isImporting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                  title="Import file Excel Rekapitulasi Izin Tidak Finger (Format Foto 1)"
                >
                  <Upload className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isImporting ? 'animate-bounce' : ''}`} />
                  <span>Import Excel Rekap</span>
                </button>
              )}

              {/* Tombol Import TBP & GPS pada Form Tidak Finger (Format Foto 2) */}
              {activeTab === 'form' && (
                <>
                  <button
                    type="button"
                    onClick={() => tbpFileInputRef.current?.click()}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                    title="Import file Excel Absensi TBP Comben (#VALUE!)"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Import TBP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => gpsFileInputRef.current?.click()}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                    title="Import file Excel Absensi GPS Comben (#VALUE!)"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Import GPS</span>
                  </button>
                </>
              )}

              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-xs transition-all"
                title="Download file Excel 2 Sheet (Tabel Rekap + Ringkasan)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Export Excel</span>
              </button>

              {activeTab === 'form' && (
                <button
                  onClick={handlePrintForms}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm transition-all"
                  title="Cetak Formulir Resmi ke PDF atau Printer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF Form</span>
                </button>
              )}
            </div>
          </div>

          {/* ================= BAR NAVIGASI LEMBAR KERJA ================= */}
          {activeTab !== 'landing' && (
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('landing')}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
                title="Kembali ke Menu Tab"
              >
                <ChevronLeft className="w-4 h-4 text-indigo-600" />
                <span>← Kembali ke Menu Tab</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lembar Kerja:
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200/70 shadow-2xs">
                  {activeTab === 'rekap'
                    ? `📊 Tabel Rekap (${groupedEmployees.length} Karyawan)`
                    : activeTab === 'form'
                    ? (formSubTab === 'need_form_view' ? '⚠️ Karyawan Perlu Form' : `📝 Form Tidak Finger (${recordsByDate.length} Form)`)
                    : '📈 Diagram Analitik'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= ISI KONTEN UTAMA ================= */}
      {activeTab === 'landing' ? (
        <div className="w-full px-3 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-12 shadow-sm text-center space-y-8 animate-in fade-in duration-500 relative overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200/80 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                PORTAL OPERASIONAL PREPLAB • NAVIGASI MODUL
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Pusat Rekapan Absensi & Form Finger
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
                Pilih lembar kerja interaktif di bawah untuk melihat rekap kehadiran, lembar pengajuan dispensasi finger, atau karyawan yang memerlukan formulir.
              </p>
            </div>

            {/* Ambient Soft Blur Behind Cards */}
            <div className="relative pt-2 pb-6 flex justify-center overflow-x-auto z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] sm:w-[42rem] h-60 sm:h-72 bg-gradient-to-r from-indigo-200/50 via-sky-100/40 to-teal-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
              <DisplayCards cards={fingerDisplayCards} />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/70 shadow-2xs relative z-10">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Arahkan kursor & klik salah satu kartu di atas untuk membuka lembar kerja secara instan</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full px-3 sm:px-6 lg:px-8 py-6">
                {/* ==================================================== */}
        {/* AKORDION RINGKASAN & STATISTIK REKAP FINGER         */}
        {/* (Sesuai Format Akordion Modul Rekap Izin Karyawan)  */}
        {/* ==================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-all duration-200 mb-6 print:hidden">
          {/* Header Akordion (Bisa diklik untuk buka/tutup) */}
          <div
            onClick={() => setIsStatsAccordionOpen(prev => !prev)}
            className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Ringkasan & Keterangan Rekap Finger
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {stats.total} Total Kasus
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {stats.uniquePersonnel} Personel
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    TBP: {stats.tbp}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    GPS: {stats.gps}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    Shift A: {stats.shiftA}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Shift B: {stats.shiftB}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Nonshift: {stats.nonshift}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {isStatsAccordionOpen ? 'Klik untuk menutup akordion ringkasan & kartu analitik' : 'Klik untuk membuka 7 kartu statistik rekap finger, per shift & per entitas PT'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsStatsAccordionOpen(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                isStatsAccordionOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title={isStatsAccordionOpen ? "Tutup Akordion" : "Buka Akordion Statistik & KPI"}
            >
              <span className="text-[11px]">{isStatsAccordionOpen ? 'Tutup Akordion' : 'Buka Akordion'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isStatsAccordionOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            </button>
          </div>

          {/* Konten 7 Kartu Statistik (Muncul Ketika Akordion Dibuka) */}
          {isStatsAccordionOpen && (
            <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              {/* Baris 1: Ringkasan Entitas & Kasus (4 Kartu) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Kasus */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Total Kasus</span>
                    <Fingerprint className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{stats.total}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Kejadian tidak finger</div>
                </div>

                {/* Personel Unik */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Personel Unik</span>
                    <Users className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{stats.uniquePersonnel}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Karyawan aktif roster</div>
                </div>

                {/* PT TBP */}
                <div
                  onClick={() => { setSelectedPt(selectedPt === 'TBP' ? 'ALL' : 'TBP'); setCurrentPage(1); }}
                  className={`border rounded-xl p-3.5 shadow-2xs cursor-pointer transition-all ${
                    selectedPt === 'TBP'
                      ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
                  }`}
                  title="Klik untuk filter PT TBP"
                >
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="text-blue-700 dark:text-blue-300 font-extrabold">PT TBP</span>
                    <Building2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">{stats.tbp}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stats.activeTbp} personil di Roster (Klik filter)</div>
                </div>

                {/* PT GPS */}
                <div
                  onClick={() => { setSelectedPt(selectedPt === 'GPS' ? 'ALL' : 'GPS'); setCurrentPage(1); }}
                  className={`border rounded-xl p-3.5 shadow-2xs cursor-pointer transition-all ${
                    selectedPt === 'GPS'
                      ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
                  }`}
                  title="Klik untuk filter PT GPS"
                >
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="text-amber-700 dark:text-amber-300 font-extrabold">PT GPS</span>
                    <Building2 className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{stats.gps}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stats.activeGps} personil di Roster (Klik filter)</div>
                </div>
              </div>

              {/* Baris 2: Distribusi Shift Roster (3 Kartu Shift A, Shift B, Nonshift) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Shift A */}
                <div
                  onClick={() => { setSelectedShift(selectedShift === 'Shift A' ? 'ALL' : 'Shift A'); setCurrentPage(1); }}
                  className={`border rounded-xl p-3.5 shadow-2xs cursor-pointer transition-all ${
                    selectedShift === 'Shift A'
                      ? 'bg-teal-50/90 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 ring-2 ring-teal-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-teal-300'
                  }`}
                  title="Klik untuk filter Shift A"
                >
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="text-teal-700 dark:text-teal-300 font-extrabold">Shift A</span>
                    <Clock className="w-4 h-4 text-teal-500" />
                  </div>
                  <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 font-mono">{stats.shiftA}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stats.activeShiftA} personil di Roster (Klik filter)</div>
                </div>

                {/* Shift B */}
                <div
                  onClick={() => { setSelectedShift(selectedShift === 'Shift B' ? 'ALL' : 'Shift B'); setCurrentPage(1); }}
                  className={`border rounded-xl p-3.5 shadow-2xs cursor-pointer transition-all ${
                    selectedShift === 'Shift B'
                      ? 'bg-sky-50/90 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 ring-2 ring-sky-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-300'
                  }`}
                  title="Klik untuk filter Shift B"
                >
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="text-sky-700 dark:text-sky-300 font-extrabold">Shift B</span>
                    <Clock className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">{stats.shiftB}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stats.activeShiftB} personil di Roster (Klik filter)</div>
                </div>

                {/* Nonshift */}
                <div
                  onClick={() => { setSelectedShift(selectedShift === 'Nonshift' ? 'ALL' : 'Nonshift'); setCurrentPage(1); }}
                  className={`border rounded-xl p-3.5 shadow-2xs cursor-pointer transition-all ${
                    selectedShift === 'Nonshift'
                      ? 'bg-purple-50/90 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-purple-300'
                  }`}
                  title="Klik untuk filter Nonshift"
                >
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="text-purple-700 dark:text-purple-300 font-extrabold">Nonshift</span>
                    <Clock className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">{stats.nonshift}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stats.activeNonshift} personil di Roster (Klik filter)</div>
                </div>
              </div>
            </div>
          )}
        </div>
{/* ============================================================== */}
        {/* TAB 1: TABEL REKAP (REFERENSI FOTO 1 & GAYA REKAP IZIN KARYAWAN) */}
        {/* ============================================================== */}
        ﻿{activeTab === 'rekap' && (
          <div className="space-y-4">
            {/* Filter Bar & Scope Switcher */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari NIK atau Nama Karyawan..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Filter Perusahaan (PT dari Roster) */}
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                  <select
                    value={selectedPt}
                    onChange={e => { setSelectedPt(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Semua PT ({stats.activeTbp + stats.activeGps} Roster)</option>
                    <option value="TBP">Hanya TBP ({stats.activeTbp} Personil)</option>
                    <option value="GPS">Hanya GPS ({stats.activeGps} Personil)</option>
                  </select>
                </div>

                {/* Filter Shift Roster (Shift A, Shift B, Nonshift) */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                  <select
                    value={selectedShift}
                    onChange={e => { setSelectedShift(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Semua Shift ({allActiveEmployees.length || 186} Personil)</option>
                    <option value="Shift A">Shift A ({stats.activeShiftA} Personil)</option>
                    <option value="Shift B">Shift B ({stats.activeShiftB} Personil)</option>
                    <option value="Nonshift">Nonshift ({stats.activeNonshift} Personil)</option>
                  </select>
                </div>

                {/* Filter Golongan Roster (Gol V - I) */}
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                  <select
                    value={selectedGol}
                    onChange={e => { setSelectedGol(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Semua Golongan (Gol V - I)</option>
                    <option value="5">Golongan V (Manager / Dept Head)</option>
                    <option value="4">Golongan IV (Superintendent)</option>
                    <option value="3">Golongan III (Supervisor)</option>
                    <option value="2">Golongan II (Foreman / Admin)</option>
                    <option value="1">Golongan I (Crew / Operator)</option>
                  </select>
                </div>

                {/* Filter Alasan Kendala */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                  <select
                    value={selectedReason}
                    onChange={e => { setSelectedReason(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Semua Alasan Kendala</option>
                    {FINGER_REASON_COLUMNS.map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Tanggal */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                  <select
                    value={selectedDate}
                    onChange={e => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Semua Tanggal Kejadian</option>
                    {uniqueDates.map(d => (
                      <option key={d.iso} value={d.iso}>{d.display} ({d.count} orang)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toolbar Aksi: Accordion Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Daftar Karyawan Roster Aktif Gol V - I ({allActiveEmployees.length || groupedEmployees.length} Personel)</span>
                </div>

                <div className="flex items-center gap-2">


                  <button
                    type="button"
                    onClick={expandAllEmployees}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition-all"
                    title="Buka semua dropdown detail baris karyawan"
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Buka Semua Dropdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllEmployees}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition-all"
                    title="Tutup semua dropdown detail baris"
                  >
                    <span>Tutup Semua</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TABEL REKAP UTAMA (FORMAT SEMUA KARYAWAN GOL V - I TANPA JAM MASUK/PULANG) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className={`w-full overflow-x-auto relative custom-scrollbar ${
                'overflow-y-auto max-h-[74vh]'
              }`}>
                <table className="w-full text-xs text-left border-collapse border-slate-200 dark:border-slate-800">
                  {/* HEADER TABEL RESMI DENGAN FREEZE PANE (STICKY TOP-0) */}
                  <thead className="sticky top-0 z-20 shadow-xs">
                    <tr className="border-b border-slate-300 dark:border-slate-750 font-bold uppercase tracking-wider text-[11px] text-center select-none bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 shadow-xs">
                      <th className={`px-3 py-3.5 w-12 border-r border-slate-300 dark:border-slate-750 text-center bg-slate-100 dark:bg-slate-850 ${
                        'sticky top-0 z-20 shadow-xs'
                      }`}>
                        No
                      </th>
                      <th className={`px-3 py-3.5 w-32 border-r border-slate-300 dark:border-slate-750 text-center bg-slate-100 dark:bg-slate-850 ${
                        'sticky top-0 z-20 shadow-xs'
                      }`}>
                        NIK
                      </th>
                      <th className={`px-4 py-3.5 min-w-[260px] text-left border-r border-slate-300 dark:border-slate-750 bg-slate-100 dark:bg-slate-850 ${
                        'sticky top-0 z-20 shadow-xs'
                      }`}>
                        Nama Karyawan (Roster Gol V - I)
                      </th>
                      <th className={`px-4 py-3.5 min-w-[240px] text-left border-r border-slate-300 dark:border-slate-750 bg-rose-50/95 dark:bg-rose-950/90 text-rose-800 dark:text-rose-300 backdrop-blur-xs ${
                        'sticky top-0 z-20 shadow-xs'
                      }`}>
                        Alasan Tidak Finger
                      </th>
                      <th className={`px-4 py-3.5 min-w-[240px] text-left border-r border-slate-300 dark:border-slate-750 bg-indigo-50/95 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 backdrop-blur-xs ${
                        'sticky top-0 z-20 shadow-xs'
                      }`}>
                        Tanggal Kejadian
                      </th>
                      <th className={`px-3 py-3.5 w-24 text-center bg-slate-100 dark:bg-slate-850 ${
                        'sticky top-0 z-20 shadow-xs'
                      }`}>
                        Detail
                      </th>
                    </tr>
                  </thead>

﻿                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                          <span>Memuat dan mencocokkan data Karyawan Roster &amp; Rekapan Finger...</span>
                        </td>
                      </tr>
                    ) : groupedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                          <AlertTriangle className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                          <p className="font-medium">Tidak ada data karyawan yang cocok dengan filter saat ini.</p>
                          <p className="text-xs text-slate-400 mt-1">Coba ganti kata kunci pencarian atau reset filter.</p>
                        </td>
                      </tr>
                    ) : (
                      groupedEmployees.map((emp, idx) => {
                        const globalIndex = idx + 1;
                        const isExpanded = !!expandedEmployees[emp.nik];
                        const hasIncidents = emp.incidents.length > 0;

                        return (
                          <React.Fragment key={emp.nik}>
                            {/* BARIS UTAMA KARYAWAN ROSTER GOL V - I */}
                            <tr
                              onClick={() => toggleEmployeeExpand(emp.nik)}
                              className={`cursor-pointer transition-colors ${
                                isExpanded
                                  ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                                  : hasIncidents
                                  ? 'hover:bg-slate-50/90 dark:hover:bg-slate-850/70 bg-white dark:bg-slate-900'
                                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-850/50 bg-slate-50/20 dark:bg-slate-900/30'
                              } text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800`}
                            >
                              {/* No */}
                              <td className="px-3 py-3 text-center font-medium text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                {globalIndex}
                              </td>

                              {/* NIK */}
                              <td className="px-3 py-3 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 text-center">
                                {emp.nik}
                              </td>

                              {/* Nama Karyawan, Golongan V-I, Jabatan & Status */}
                              <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                                    {emp.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      emp.golLevel === 5 ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300' :
                                      emp.golLevel === 4 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300' :
                                      emp.golLevel === 3 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300' :
                                      emp.golLevel === 2 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' :
                                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                      {emp.golDisplay}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      emp.pt === 'GPS'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                    }`} title="PT Karyawan dari Data Roster">
                                      {emp.pt}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      emp.shift === 'Shift A'
                                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                                        : emp.shift === 'Shift B'
                                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`} title="Shift Roster Karyawan">
                                      {emp.shift || 'Nonshift'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-slate-400">
                                    {emp.jabatan} • {emp.section}
                                  </span>
                                  {hasIncidents ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/70 px-2 py-0.2 rounded-md border border-rose-200 dark:border-rose-900">
                                      <Fingerprint className="w-3 h-3 text-rose-500" />
                                      {emp.incidents.length} Kasus Finger
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                                      Normal / Nihil
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* KOLOM ALASAN TIDAK FINGER (MENAMPILKAN ALASAN LANGSUNG BERDERET/SESUAI TANGGAL) */}
                              <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 align-top">
                                {!hasIncidents ? (
                                  <span className="text-slate-400 text-xs italic">-</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    {emp.incidents.map((inc, i) => (
                                      <div
                                        key={inc.sheetRowId || i}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 shadow-2xs whitespace-nowrap"
                                        title={`Kasus #${i + 1}: ${inc.alasanKategori}`}
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        <span>{inc.alasanKategori || 'Masalah Jaringan'}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* KOLOM TANGGAL KEJADIAN (MENAMPILKAN TANGGAL BERDERET SEJAJAR DENGAN ALASAN) */}
                              <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 align-top">
                                {!hasIncidents ? (
                                  <span className="text-slate-400 text-xs italic">-</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                                    {emp.incidents.map((inc, i) => (
                                      <div
                                        key={inc.sheetRowId || i}
                                        className="inline-flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs whitespace-nowrap"
                                        title={`Shift ${inc.schedule} | Masuk: ${inc.jamMasuk}, Pulang: ${inc.jamPulang}`}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                          <span>{inc.tanggalDisplay || inc.tanggal}</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                          Shift {inc.schedule}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* DETAIL / DROPDOWN BUTTON */}
                              <td className="px-3 py-3 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleEmployeeExpand(emp.nik); }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                                    isExpanded
                                      ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800'
                                  }`}
                                  title="Klik untuk membuka/menutup dropdown list kejadian"
                                >
                                  <span>{isExpanded ? 'Tutup' : 'Detail'}</span>
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              </td>
                            </tr>

                            {/* DROPDOWN LIST EXPAND SECTION (RINCIAN DETAIL TIAP TANGGAL & SCAN WAKTU) */}
                            {isExpanded && (
                              <tr className="bg-slate-50/95 dark:bg-slate-850/95 border-b-2 border-indigo-300 dark:border-indigo-800">
                                <td colSpan={6} className="p-4 sm:p-5">
                                  <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                                    {/* Header Kartu Dropdown */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150 dark:border-slate-800">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                          {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{emp.name}</span>
                                            <span className="font-mono text-xs text-slate-500 font-semibold">{emp.nik}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                              emp.golLevel === 5 ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300' :
                                              emp.golLevel === 4 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300' :
                                              emp.golLevel === 3 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300' :
                                              emp.golLevel === 2 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' :
                                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                            }`}>
                                              {emp.golDisplay}
                                            </span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                              emp.pt === 'GPS'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                            }`}>
                                              {emp.pt}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-400 mt-0.5">
                                            {emp.jabatan} • {emp.section} • Total <b className="text-indigo-600 dark:text-indigo-400">{emp.incidents.length} Kasus Finger Tercatat</b>
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            setSearchQuery(emp.name);
                                            setActiveTab('form');
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-all shadow-xs"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          <span>Buka di Formulir Resmi</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Rincian Kasus Per Tanggal (Dropdown List) */}
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                          Rincian Kasus Finger Per Tanggal Kejadian:
                                        </h4>
                                        <span className="text-[11px] text-slate-400">
                                          Pilih alasan kendala melalui dropdown untuk memperbarui data
                                        </span>
                                      </div>

                                      {emp.incidents.length === 0 ? (
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-400">
                                          Karyawan ini tidak memiliki catatan masalah finger (Normal/Nihil).
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {emp.incidents.map((inc, i) => (
                                            <div
                                              key={inc.sheetRowId || i}
                                              className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                            >
                                              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/60 dark:border-slate-750">
                                                <div className="flex items-center gap-2">
                                                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center">
                                                    #{i + 1}
                                                  </span>
                                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {inc.tanggalDisplay}
                                                  </span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                  inc.schedule === 'N'
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                                    : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                                                }`}>
                                                  {inc.schedule === 'N' ? 'Shift Malam (N)' : `Shift Siang (${inc.schedule})`}
                                                </span>
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                                                  <div className="text-[10px] text-slate-400">Jam Scan Masuk</div>
                                                  <div className={`font-mono font-bold mt-0.5 ${inc.jamMasuk === '-' ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {inc.jamMasuk}
                                                  </div>
                                                </div>
                                                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                                                  <div className="text-[10px] text-slate-400">Jam Scan Pulang</div>
                                                  <div className={`font-mono font-bold mt-0.5 ${inc.jamPulang === '-' ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {inc.jamPulang}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Interactive Dropdown Alasan Tidak Finger */}
                                              <div className="space-y-1 mb-2">
                                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                                                  <span>Alasan Tidak Finger:</span>
                                                </label>
                                                <select
                                                  value={inc.alasanKategori}
                                                  onChange={(e) => handleUpdateRecordReason(inc, e.target.value)}
                                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                                                >
                                                  {FINGER_REASON_COLUMNS.map(col => (
                                                    <option key={col.key} value={col.key}>{col.label}</option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-750">
                                                <span className="text-[10px] text-slate-400">
                                                  {inc.tanggalDoc}
                                                </span>
                                                <button
                                                  onClick={() => {
                                                    setFormFilterDate(inc.tanggal);
                                                    setActiveTab('form');
                                                  }}
                                                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                                                >
                                                  <span>Cetak Form Tanggal Ini</span>
                                                  <ExternalLink className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Status Footer Bar */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Menampilkan <b>{groupedEmployees.length}</b> Karyawan Roster dengan total <b>{filteredRecords.length}</b> Insiden Finger
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">
                    Klik baris karyawan untuk membuka atau menutup rincian kejadian
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB 2: FORM TIDAK FINGER (REFERENSI FOTO 2 - DOKUMEN RESMI TBP-FR-HR-10) */}
        {/* ====================================================================== */}
        {activeTab === 'form' && (
          <div className="space-y-6">
            {/* SUB-TAB SWITCHER DI DALAM TAB FORM TIDAK FINGER */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormSubTab('form_view')}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      formSubTab === 'form_view'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Form</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      formSubTab === 'form_view'
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {recordsByDate.length} Form
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSubTab('need_form_view')}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      formSubTab === 'need_form_view'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Karyawan yang perlu dibuat Form</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      formSubTab === 'need_form_view'
                        ? 'bg-amber-700 text-white'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    }`}>
                      {filteredValueRecords.length}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {formSubTab === 'need_form_view' && (
                    <button
                      type="button"
                      onClick={() => fetchData(true)}
                      disabled={syncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                      title="Sinkronkan data langsung dari Google Sheet Rekap Finger (#VALUE!) di Folder Administrasi"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Menyinkronkan...' : 'Sinkron Google Sheet'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => tbpFileInputRef.current?.click()}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                    title="Import file Excel Absensi TBP Comben (#VALUE!)"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Import TBP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => gpsFileInputRef.current?.click()}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                    title="Import file Excel Absensi GPS Comben (#VALUE!)"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Import GPS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SUB-TAB 1: TAMPILAN FORMULIR RESMI TBP-FR-HR-10 */}
            {formSubTab === 'form_view' && (
              <div className="space-y-6">
                {/* Filter & Toolbar Pengelolaan Formulir (Mirip Form Permintaan Training) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs print:hidden space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Selector Tanggal Form */}
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Tampilan Tanggal:
                  </span>
                  <select
                    value={formFilterDate}
                    onChange={e => setFormFilterDate(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="ALL">Semua Tanggal ({recordsByDate.length} Formulir terpisah)</option>
                    {uniqueDates.map(d => (
                      <option key={d.iso} value={d.iso}>Formulir Tanggal {d.doc} ({d.count} orang)</option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenAddEmployee(formFilterDate !== 'ALL' ? formFilterDate : undefined)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Karyawan
                  </button>

                  <button
                    onClick={() => {
                      setMetaFormDocNumber(docHeaderMeta.docNumber);
                      setMetaFormEffectiveDate(docHeaderMeta.effectiveDate);
                      setMetaFormValidDate(docHeaderMeta.validDate);
                      setMetaFormRevision(docHeaderMeta.revision);
                      setMetaFormShift(docHeaderMeta.shift);
                      setMetaFormDepartment(docHeaderMeta.department);
                      setMetaFormSpvName(docHeaderMeta.spvName);
                      setMetaFormSpvTitle(docHeaderMeta.spvTitle);
                      setMetaFormDeptHeadName(docHeaderMeta.deptHeadName);
                      setMetaFormDeptHeadTitle(docHeaderMeta.deptHeadTitle);
                      setMetaModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                    Edit Header &amp; Pengesahan
                  </button>

                  {/* Print Semua Form */}
                  <button
                    onClick={() => handlePrintDocument()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    title="Cetak seluruh formulir dari seluruh tanggal sekaligus"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Banyak Form ({recordsByDate.length})
                  </button>

                  {/* Reset jika ada custom override */}
                  {formOverrides && (
                    <button
                      onClick={handleResetFormOverrides}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors"
                      title="Kembalikan ke data otomatis hasil sync sheet"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset ke Otomatis
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>
                  Formulir dapat diedit secara langsung (tambah/edit karyawan, checklist alasan, ubah penandatangan). Anda dapat memilih <b>Print Satuan</b> per lembar tanggal atau <b>Print Banyak Form</b> sekaligus.
                </span>
              </div>
            </div>

            {/* STACK OF OFFICIAL FORMS (PER TANGGAL SESUAI REQUEST USER) */}
            <div className="space-y-8">
              {recordsByDate.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-semibold">Tidak ada data untuk formulir izin tidak finger.</p>
                </div>
              ) : (
                recordsByDate.map(([dateIso, dateRecords], formIdx) => {
                  const docDateDisplay = dateRecords[0]?.tanggalDoc || dateIso;
                  // Jika sedang printSingleDate, sembunyikan tanggal lain saat cetak
                  const isHiddenInPrint = printSingleDate && printSingleDate !== dateIso;

                  return (
                    <div
                      key={dateIso}
                      className={`bg-white text-slate-900 border border-slate-300 shadow-md rounded-xl p-6 sm:p-8 w-full max-w-7xl mx-auto print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:break-after-page ${
                        isHiddenInPrint ? 'print:hidden' : ''
                      }`}
                      style={{ pageBreakAfter: 'always' }}
                    >
                      {/* Sub-Toolbar Khusus Lembar Formulir Ini (Print Satuan & Tambah Karyawan Cepat) */}
                      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 print:hidden">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                            #{formIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            Formulir Tanggal: <span className="text-indigo-600">{docDateDisplay}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            ({dateRecords.length} orang tercatat)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenAddEmployee(dateIso)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Tambah ke Tanggal Ini
                          </button>

                          <button
                            onClick={() => handlePrintDocument(dateIso)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 transition-colors"
                            title="Hanya cetak formulir tanggal ini saja"
                          >
                            <Printer className="w-3 h-3 text-indigo-600" />
                            Print Satuan
                          </button>
                        </div>
                      </div>

                      {/* ================= HEADER DOKUMEN RESMI (FOTO 2) ================= */}
                      <div className="border border-black overflow-hidden mb-4">
                        <div className="grid grid-cols-12 divide-x divide-black text-center text-xs">
                          {/* Logo Kolom */}
                          <div className="col-span-2 p-2 flex flex-col items-center justify-center gap-1.5 bg-white">
                            <img
                              src={TBP_HEADER_LOGO_BASE64}
                              alt="TBP Logo"
                              className="h-10 object-contain"
                            />
                            <div className="text-[10px] font-bold text-emerald-700 tracking-wider">TBP</div>
                          </div>

                          {/* Formulir Judul */}
                          <div className="col-span-4 p-2 flex flex-col items-center justify-center bg-white">
                            <div className="text-xs font-bold tracking-wider uppercase text-slate-800">
                              FORMULIR
                            </div>
                            <div className="text-sm font-black tracking-wide text-slate-950 uppercase mt-1 leading-tight">
                              REKAP PENGAJUAN IZIN TIDAK FINGER
                            </div>
                          </div>

                          {/* Meta Table Dokumen */}
                          <div className="col-span-6 text-[11px] bg-white divide-y divide-black">
                            <div className="grid grid-cols-12 divide-x divide-black">
                              <div className="col-span-3 p-1 font-semibold text-left">No. Dokumen</div>
                              <div className="col-span-3 p-1 font-bold text-left">{docHeaderMeta.docNumber}</div>
                              <div className="col-span-3 p-1 font-semibold text-left">Tanggal Efektif</div>
                              <div className="col-span-3 p-1 text-left font-bold">: {docHeaderMeta.effectiveDate}</div>
                            </div>

                            <div className="grid grid-cols-12 divide-x divide-black">
                              <div className="col-span-3 p-1 font-semibold text-left">Tanggal Berlaku</div>
                              <div className="col-span-3 p-1 text-left">{docHeaderMeta.validDate}</div>
                              <div className="col-span-3 p-1 font-semibold text-left">Tgl/Bln/Thn</div>
                              <div className="col-span-3 p-1 text-left font-bold text-indigo-900">: {docDateDisplay}</div>
                            </div>

                            <div className="grid grid-cols-12 divide-x divide-black">
                              <div className="col-span-3 p-1 font-semibold text-left">Halaman</div>
                              <div className="col-span-1 p-1 text-left">1 dari 1</div>
                              <div className="col-span-1 p-1 font-semibold text-left">Revisi</div>
                              <div className="col-span-1 p-1 text-left">{docHeaderMeta.revision}</div>
                              <div className="col-span-3 p-1 font-semibold text-left">Shift</div>
                              <div className="col-span-3 p-1 text-left font-bold">: {docHeaderMeta.shift}</div>
                            </div>

                            <div className="grid grid-cols-12 divide-x divide-black">
                              <div className="col-span-6 p-1 bg-slate-50"></div>
                              <div className="col-span-3 p-1 font-semibold text-left">Departemen</div>
                              <div className="col-span-3 p-1 text-left font-bold">: {docHeaderMeta.department}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ================= TABEL DATA FORMULIR RESMI ================= */}
                      <div className="border border-black overflow-hidden mb-6">
                        <table className="w-full text-xs text-center border-collapse">
                          <thead>
                            <tr className="bg-slate-200/90 text-black font-bold divide-x divide-black border-b border-black">
                              <th rowSpan={2} className="p-2 w-10">No</th>
                              <th rowSpan={2} className="p-2 w-28">NIK</th>
                              <th rowSpan={2} className="p-2 text-left min-w-[160px]">Nama</th>
                              <th rowSpan={2} className="p-2 w-16">Jam Masuk</th>
                              <th rowSpan={2} className="p-2 w-16">Jam Pulang</th>
                              <th colSpan={8} className="p-1.5 uppercase tracking-wide bg-slate-300">Alasan</th>
                              <th rowSpan={2} className="p-2 w-28">Tanda tangan</th>
                              <th rowSpan={2} className="p-2 w-14 print:hidden bg-slate-100">Aksi</th>
                            </tr>
                            <tr className="bg-slate-100 text-black font-semibold divide-x divide-black border-b border-black text-[10px] leading-tight">
                              <th className="p-1 w-20">Kendala Transport</th>
                              <th className="p-1 w-20">Pindah Area Kerja</th>
                              <th className="p-1 w-20">Penugasan Kerja</th>
                              <th className="p-1 w-16">Mesin Rusak</th>
                              <th className="p-1 w-20">Tidak / Belum Terdaftar</th>
                              <th className="p-1 w-16">Kendala Sidik Jari</th>
                              <th className="p-1 w-16">Masalah Jaringan</th>
                              <th className="p-1 min-w-[90px]">Lainnya</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black text-black">
                            {dateRecords.map((item, rowIdx) => {
                              const isKendalaTransport = item.alasanKategori === 'Kendala Transport';
                              const isPindahArea = item.alasanKategori === 'Pindah Area Kerja';
                              const isPenugasan = item.alasanKategori === 'Penugasan Kerja';
                              const isMesinRusak = item.alasanKategori === 'Mesin Rusak';
                              const isBelumTerdaftar = item.alasanKategori === 'Tidak / Belum Terdaftar';
                              const isSidikJari = item.alasanKategori === 'Kendala Sidik Jari';
                              const isMasalahJaringan = item.alasanKategori === 'Masalah Jaringan';

                              let lainnyaText = '';
                              if (
                                !isKendalaTransport &&
                                !isPindahArea &&
                                !isPenugasan &&
                                !isMesinRusak &&
                                !isBelumTerdaftar &&
                                !isSidikJari &&
                                !isMasalahJaringan
                              ) {
                                lainnyaText = item.keteranganLain || item.alasanKategori || 'Lupa Finger';
                              }

                              const itemKey = String(item.sheetRowId || item.id);

                              return (
                                <tr key={itemKey} className="divide-x divide-black hover:bg-slate-50 group">
                                  <td className="p-1.5 text-center font-medium">{rowIdx + 1}</td>
                                  <td className="p-1.5 font-mono text-[11px] text-center">{item.nik}</td>
                                  <td className="p-1.5 text-left font-medium">{item.name}</td>
                                  <td className="p-1.5 text-center font-mono">{item.jamMasuk}</td>
                                  <td className="p-1.5 text-center font-mono">{item.jamPulang}</td>

                                  <td className="p-1 text-center font-bold">{isKendalaTransport ? '✔' : ''}</td>
                                  <td className="p-1 text-center font-bold">{isPindahArea ? '✔' : ''}</td>
                                  <td className="p-1 text-center font-bold">{isPenugasan ? '✔' : ''}</td>
                                  <td className="p-1 text-center font-bold">{isMesinRusak ? '✔' : ''}</td>
                                  <td className="p-1 text-center font-bold">{isBelumTerdaftar ? '✔' : ''}</td>
                                  <td className="p-1 text-center font-bold">{isSidikJari ? '✔' : ''}</td>
                                  <td className="p-1 text-center font-bold">{isMasalahJaringan ? '✔' : ''}</td>

                                  <td className="p-1 text-center text-[10px] italic">
                                    {lainnyaText || '-'}
                                  </td>

                                  <td className="p-1 text-center text-[10px] text-slate-400">
                                    {item.tandaTangan ? (
                                      <span className="font-semibold text-emerald-700">✔ Signed</span>
                                    ) : (
                                      <div className="h-6" />
                                    )}
                                  </td>

                                  {/* Aksi Edit & Hapus (Hanya muncul di layar web, disembunyikan saat dicetak) */}
                                  <td className="p-1 text-center print:hidden">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditEmployee(dateIso, item)}
                                        className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                                        title="Edit Baris Karyawan"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEmployeeRow(dateIso, itemKey, item.name)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                        title="Hapus dari Formulir"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {Array.from({ length: Math.max(0, 5 - dateRecords.length) }).map((_, padIdx) => (
                              <tr key={`pad-${padIdx}`} className="divide-x divide-black text-transparent select-none h-6">
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1">.</td>
                                <td className="p-1 print:hidden">.</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* ================= TANDA TANGAN PERSETUJUAN (FOTO 2) ================= */}
                      <div className="grid grid-cols-12 border border-black divide-x divide-black text-center text-xs text-black max-w-2xl">
                        <div className="col-span-4 flex flex-col justify-between p-3 h-32">
                          <div className="font-semibold text-left text-[11px]">Diajukan Oleh,</div>
                          <div>
                            <div className="font-bold underline text-xs">{docHeaderMeta.spvName}</div>
                            <div className="text-[11px] text-slate-700 mt-0.5">{docHeaderMeta.spvTitle}</div>
                          </div>
                        </div>

                        <div className="col-span-4 flex flex-col justify-between p-3 h-32">
                          <div className="font-semibold text-left text-[11px]">Disetujui Oleh,</div>
                          <div>
                            <div className="font-bold underline text-xs">{docHeaderMeta.deptHeadName}</div>
                            <div className="text-[11px] text-slate-700 mt-0.5">{docHeaderMeta.deptHeadTitle}</div>
                          </div>
                        </div>

                        <div className="col-span-4 flex flex-col justify-between p-3 h-32">
                          <div className="font-semibold text-left text-[11px]">&nbsp;</div>
                          <div>
                            <div className="font-bold underline text-xs">&nbsp;</div>
                            <div className="text-[11px] text-slate-700 mt-0.5">{docHeaderMeta.hrDeptTitle}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Form #{formIdx + 1} - Tanggal: {docDateDisplay} - Dokumen: {docHeaderMeta.docNumber}</span>
                        <span className="print:hidden">PrepLab Portal Resmi</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ====================================================================== */}
        {/* SUB-TAB 2: DAFTAR KARYAWAN YANG PERLU DIBUAT FORM (#VALUE! GOOGLE SHEET) */}
        {/* ====================================================================== */}
        {formSubTab === 'need_form_view' && (
          <div className="space-y-4">
            {/* Header & Filter Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 shadow-2xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Daftar Karyawan yang Perlu Dibuat Form
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                        #VALUE! Google Sheet
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Daftar insiden karyawan pada Google Sheet yang menghasilkan error formula (#VALUE!) dan memerlukan penerbitan formulir izin tidak finger
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => fetchData(true)}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    title="Sinkronkan data langsung dari Google Sheet Rekap Finger (#VALUE!) di Folder Administrasi"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Menyinkronkan...' : 'Sinkron Google Sheet'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => tbpFileInputRef.current?.click()}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    title="Import file Excel Absensi TBP Comben (#VALUE!)"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Import TBP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => gpsFileInputRef.current?.click()}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    title="Import file Excel Absensi GPS Comben (#VALUE!)"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Import GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportValueRecords}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel ({filteredValueRecords.length})</span>
                  </button>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari NIK / Nama..."
                    value={valSearchQuery}
                    onChange={e => {
                      setValSearchQuery(e.target.value);
                      setValCurrentPage(1);
                    }}
                    className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>

                {/* Filter PT */}
                <select
                  value={valSelectedPt}
                  onChange={e => {
                    setValSelectedPt(e.target.value);
                    setValCurrentPage(1);
                  }}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">Semua Perusahaan (PT)</option>
                  <option value="TBP">PT TBP</option>
                  <option value="GPS">PT GPS</option>
                </select>

                {/* Filter Shift Roster */}
                <select
                  value={valSelectedShift}
                  onChange={e => {
                    setValSelectedShift(e.target.value);
                    setValCurrentPage(1);
                  }}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">Semua Shift Roster</option>
                  <option value="Shift A">Shift A</option>
                  <option value="Shift B">Shift B</option>
                  <option value="Nonshift">Nonshift</option>
                </select>

                {/* Filter Tanggal */}
                <select
                  value={valSelectedDate}
                  onChange={e => {
                    setValSelectedDate(e.target.value);
                    setValCurrentPage(1);
                  }}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">Semua Tanggal ({uniqueDates.length} Tanggal)</option>
                  {uniqueDates.map(d => (
                    <option key={d.iso} value={d.iso}>
                      {formatToIndoDateDDMMMYYYY(d.iso)} ({d.count} kasus)
                    </option>
                  ))}
                </select>

                {/* Filter Kategori Alasan */}
                <select
                  value={valSelectedReason}
                  onChange={e => {
                    setValSelectedReason(e.target.value);
                    setValCurrentPage(1);
                  }}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">Semua Alasan Kendala</option>
                  {FINGER_REASON_COLUMNS.map(col => (
                    <option key={col.key} value={col.key}>{col.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold select-none">
                      <th className="px-3 py-3 text-center w-12">No</th>
                      <th className="px-3 py-3">NIK</th>
                      <th className="px-3 py-3">Nama Karyawan</th>
                      <th className="px-3 py-3 text-center">PT</th>
                      <th className="px-3 py-3 text-center">Shift Roster</th>
                      <th className="px-3 py-3">Tanggal Kejadian</th>
                      <th className="px-3 py-3 text-center">Scan Masuk</th>
                      <th className="px-3 py-3 text-center">Scan Pulang</th>
                      <th className="px-3 py-3 text-center">Status Sheet</th>
                      <th className="px-3 py-3">Kategori Kendala</th>
                      <th className="px-3 py-3 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedValueRecords.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                          <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada data karyawan yang sesuai filter.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Ubah kata kunci pencarian atau setel ulang filter.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedValueRecords.map((item, idx) => {
                        const rowNumber = (valCurrentPage - 1) * valPageSize + idx + 1;
                        const rosterShift = empShiftMap.get(item.nik.toUpperCase().trim()) || item.shift || 'Nonshift';

                        return (
                          <tr
                            key={item.sheetRowId || `val-row-${idx}`}
                            className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                          >
                            <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                              {rowNumber}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                              {item.nik}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.pt === 'TBP'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {item.pt}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                rosterShift === 'Shift A'
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300'
                                  : rosterShift === 'Shift B'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {rosterShift}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {formatToIndoDateDDMMMYYYY(item.tanggal)}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300 font-medium">
                              {item.jamMasuk !== '-' ? item.jamMasuk : <span className="text-rose-500 font-bold">MISS</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300 font-medium">
                              {item.jamPulang !== '-' ? item.jamPulang : <span className="text-rose-500 font-bold">MISS</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300">
                                #VALUE!
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {item.alasanKategori}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormFilterDate(item.tanggal);
                                  setFormSubTab('form_view');
                                  toast.success(`Membuka formulir tanggal ${formatToIndoDateDDMMMYYYY(item.tanggal)} untuk ${item.name}`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-2xs"
                                title={`Buka formulir tanggal ${formatToIndoDateDDMMMYYYY(item.tanggal)}`}
                              >
                                <FileText className="w-3 h-3 text-indigo-600" />
                                <span>Buka di Form</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {filteredValueRecords.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    Menampilkan <b>{Math.min((valCurrentPage - 1) * valPageSize + 1, filteredValueRecords.length)}</b> -{' '}
                    <b>{Math.min(valCurrentPage * valPageSize, filteredValueRecords.length)}</b> dari{' '}
                    <b>{filteredValueRecords.length}</b> data (#VALUE!)
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setValCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={valCurrentPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                      Sebelumnya
                    </button>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Halaman {valCurrentPage} dari {valTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setValCurrentPage(p => Math.min(p + 1, valTotalPages))}
                      disabled={valCurrentPage === valTotalPages}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      Berikutnya
                      <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

            {/* ====================================================================== */}
            {/* MODAL 1: TAMBAH / EDIT KARYAWAN PADA FORMULIR                         */}
            {/* ====================================================================== */}
            {employeeModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        {editingItemId ? 'Edit Data Karyawan pada Form' : 'Tambah Karyawan ke Form Tidak Finger'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setEmployeeModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                    {/* Autocomplete Pencarian Karyawan (Hanya saat Tambah Baru) */}
                    {!editingItemId && (
                      <div className="space-y-1 relative">
                        <label className="font-semibold text-slate-700 flex items-center gap-1">
                          <Search className="w-3.5 h-3.5 text-teal-600" />
                          Cari Karyawan Otomatis (Autocomplete Nama / NIK)
                        </label>
                        <input
                          type="text"
                          placeholder="Ketik NIK atau Nama karyawan..."
                          value={empSearchKeyword}
                          onChange={e => {
                            setEmpSearchKeyword(e.target.value);
                            setShowEmpSuggestions(true);
                          }}
                          onFocus={() => setShowEmpSuggestions(true)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                        />
                        {showEmpSuggestions && filteredSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {filteredSuggestions.map(s => (
                              <button
                                key={s.nik}
                                type="button"
                                onClick={() => {
                                  setEmpFormNik(s.nik);
                                  setEmpFormName(s.name);
                                  setEmpFormPt(s.pt);
                                  setShowEmpSuggestions(false);
                                  setEmpSearchKeyword('');
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-teal-50 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{s.name}</div>
                                  <div className="text-[10px] font-mono text-slate-500">{s.nik}</div>
                                </div>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {s.pt}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tanggal Formulir Target */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Tanggal Formulir</label>
                      <input
                        type="date"
                        value={editingTargetDate}
                        onChange={e => setEditingTargetDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                    </div>

                    {/* NIK & Nama */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">NIK *</label>
                        <input
                          type="text"
                          placeholder="e.g. M04026000067"
                          value={empFormNik}
                          onChange={e => setEmpFormNik(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Nama Karyawan *</label>
                        <input
                          type="text"
                          placeholder="Nama lengkap..."
                          value={empFormName}
                          onChange={e => setEmpFormName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                        />
                      </div>
                    </div>

                    {/* PT, Jam Masuk, Jam Pulang */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">PT</label>
                        <select
                          value={empFormPt}
                          onChange={e => setEmpFormPt(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                          <option value="TBP">TBP</option>
                          <option value="GPS">GPS</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Jam Masuk</label>
                        <input
                          type="text"
                          placeholder="06:54 atau -"
                          value={empFormJamMasuk}
                          onChange={e => setEmpFormJamMasuk(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white text-center font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Jam Pulang</label>
                        <input
                          type="text"
                          placeholder="19:01 atau -"
                          value={empFormJamPulang}
                          onChange={e => setEmpFormJamPulang(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white text-center font-mono"
                        />
                      </div>
                    </div>

                    {/* Kategori Alasan */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Kategori Alasan Tidak Finger</label>
                      <select
                        value={empFormReason}
                        onChange={e => setEmpFormReason(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                      >
                        {FORM_REASON_COLUMNS.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    {/* Keterangan Lainnya */}
                    {empFormReason === 'Lainnya' && (
                      <div className="space-y-1 animate-in fade-in">
                        <label className="font-semibold text-slate-700">Tuliskan Keterangan Alasan Lainnya</label>
                        <input
                          type="text"
                          placeholder="e.g. Lupa Finger Masuk, Dinas Luar, dsb."
                          value={empFormLainnya}
                          onChange={e => setEmpFormLainnya(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                        />
                      </div>
                    )}

                    {/* Status Tanda Tangan */}
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="empFormSigned"
                        checked={empFormSigned}
                        onChange={e => setEmpFormSigned(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                      />
                      <label htmlFor="empFormSigned" className="font-semibold text-slate-700 cursor-pointer">
                        Sudah Ditandatangani Karyawan (Beri Tanda Signed)
                      </label>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEmployeeModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEmployee}
                      className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
                    >
                      {editingItemId ? 'Simpan Perubahan' : 'Tambahkan Karyawan'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================================== */}
            {/* MODAL 2: EDIT HEADER & PENGESAHAN DOKUMEN TBP-FR-HR-10                */}
            {/* ====================================================================== */}
            {metaModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800">
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        Edit Metadata Dokumen &amp; Penandatangan
                      </h3>
                    </div>
                    <button
                      onClick={() => setMetaModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                    <div className="font-bold text-slate-900 border-b pb-1 text-[11px] uppercase tracking-wide">
                      1. Informasi Header Formulir Resmi
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">No. Dokumen</label>
                        <input
                          type="text"
                          value={metaFormDocNumber}
                          onChange={e => setMetaFormDocNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Tanggal Efektif</label>
                        <input
                          type="text"
                          value={metaFormEffectiveDate}
                          onChange={e => setMetaFormEffectiveDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Tanggal Berlaku</label>
                        <input
                          type="text"
                          value={metaFormValidDate}
                          onChange={e => setMetaFormValidDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Revisi</label>
                        <input
                          type="text"
                          value={metaFormRevision}
                          onChange={e => setMetaFormRevision(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Shift</label>
                        <input
                          type="text"
                          value={metaFormShift}
                          onChange={e => setMetaFormShift(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Departemen</label>
                      <input
                        type="text"
                        value={metaFormDepartment}
                        onChange={e => setMetaFormDepartment(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                      />
                    </div>

                    <div className="font-bold text-slate-900 border-b pb-1 pt-2 text-[11px] uppercase tracking-wide">
                      2. Blok Tanda Tangan &amp; Pengesahan
                    </div>

                    {/* Diajukan Oleh */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Nama Pengaju (SPV/Sptd)</label>
                        <input
                          type="text"
                          value={metaFormSpvName}
                          onChange={e => setMetaFormSpvName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Jabatan Pengaju</label>
                        <input
                          type="text"
                          value={metaFormSpvTitle}
                          onChange={e => setMetaFormSpvTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>

                    {/* Disetujui Oleh */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Nama Penyetuju (Dept Head)</label>
                        <input
                          type="text"
                          value={metaFormDeptHeadName}
                          onChange={e => setMetaFormDeptHeadName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Jabatan Penyetuju</label>
                        <input
                          type="text"
                          value={metaFormDeptHeadTitle}
                          onChange={e => setMetaFormDeptHeadTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setMetaModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveHeaderMeta}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                    >
                      Simpan Pengaturan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB 3: DIAGRAM ANALITIK (VISUALISASI STATISTIK REKAPAN FINGER) */}
        {/* ====================================================================== */}
        {activeTab === 'diagram' && (
          <div className="space-y-6">
            {/* ── 1. TOOLBAR KONTROL PERIODE (PERSIS MODUL REKAP IZIN KARYAWAN) ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
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
                      onClick={() => setDiagramViewMode(tab.id as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        diagramViewMode === tab.id
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
                  {diagramViewMode === 'week' && (
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={prevDiagramWeek}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        title="Minggu Sebelumnya"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2 min-w-[200px] text-center font-mono">
                        {formatToIndoDateDDMMMYYYY(diagramWeekStartStr)} s/d {formatToIndoDateDDMMMYYYY(diagramWeekEndStr)}
                      </span>
                      <button
                        type="button"
                        onClick={nextDiagramWeek}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        title="Minggu Berikutnya"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {diagramViewMode === 'month' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Pilih Bulan:</span>
                      <select
                        value={diagramMonthStr}
                        onChange={e => setDiagramMonthStr(e.target.value)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-hidden"
                      >
                        {availableDiagramMonths.map(m => (
                          <option key={m} value={m}>
                            Bulan {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {diagramViewMode === 'year' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Pilih Tahun:</span>
                      <select
                        value={diagramYearStr}
                        onChange={e => setDiagramYearStr(e.target.value)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-hidden"
                      >
                        {availableDiagramYears.map(y => (
                          <option key={y} value={y}>
                            Tahun {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {periodFilteredRecords.length} Kasus Tercatat
                  </div>
                </div>
              </div>

              {/* KPI Mini Metric Cards Periode */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750">
                  <div className="text-[11px] font-medium text-slate-500">Kasus Periode Ini</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{diagramStats.total}</div>
                  <div className="text-[10px] text-slate-400">Total ketidakhadiran finger</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750">
                  <div className="text-[11px] font-medium text-slate-500">Personel Terkendala</div>
                  <div className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-0.5">{diagramStats.uniquePersonnel}</div>
                  <div className="text-[10px] text-slate-400">Karyawan terdampak</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750">
                  <div className="text-[11px] font-medium text-slate-500">Shift A / B / Nonshift</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {diagramStats.shiftA} <span className="text-xs text-slate-400 font-normal">/</span> {diagramStats.shiftB} <span className="text-xs text-slate-400 font-normal">/</span> {diagramStats.nonshift}
                  </div>
                  <div className="text-[10px] text-slate-400">Shift A / Shift B / Nonshift</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750">
                  <div className="text-[11px] font-medium text-slate-500">Perusahaan TBP / GPS</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {diagramStats.tbp} <span className="text-xs text-slate-400 font-normal">/</span> {diagramStats.gps}
                  </div>
                  <div className="text-[10px] text-slate-400">Komposisi entitas</div>
                </div>
              </div>
            </div>

            {/* ── 2. DIAGRAM VISUALISASI UTAMA ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart Alasan Kendala Finger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-teal-600" />
                      Distribusi Alasan &amp; Kendala Finger ({diagramViewMode.toUpperCase()})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Frekuensi jenis kendala pada periode terpilih</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                    {Object.keys(diagramStats.reasonCounts).length} Kategori
                  </span>
                </div>

                <div className="h-72 w-full">
                  {Object.keys(diagramStats.reasonCounts).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                      <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                      Tidak ada catatan kendala finger pada periode ini.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(diagramStats.reasonCounts).map(([name, count]) => ({ name, count }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b833" />
                        <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={90} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '12px',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Bar dataKey="count" name="Jumlah Kasus" radius={[0, 6, 6, 0]}>
                          {Object.entries(diagramStats.reasonCounts).map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={['#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][index % 6]}
                            />
                          ))}
                          <LabelList dataKey="count" position="right" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#475569' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart Tren Tanggal Kejadian */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      Tren Kasus Kejadian ({diagramViewMode.toUpperCase()})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Jumlah insiden tidak finger per tanggal pada periode ini</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    {diagramStats.dateChartData.length} Tanggal Aktif
                  </span>
                </div>

                <div className="h-72 w-full">
                  {diagramStats.dateChartData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                      <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                      Tidak ada data kasus pada periode ini.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={diagramStats.dateChartData}
                        margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} angle={-30} textAnchor="end" />
                        <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '12px',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Bar dataKey="count" name="Kasus Tidak Finger" fill="#0d9488" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="count" position="top" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#0d9488' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* ── 3. SECTION DAFTAR RINCIAN KARYAWAN (PERSIS MODUL REKAP IZIN KARYAWAN) ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span>Daftar Rincian Karyawan Tidak Finger ({diagramTableRecords.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Referensi daftar personil tidak finger untuk periode {diagramViewMode === 'week' ? 'Mingguan' : diagramViewMode === 'month' ? 'Bulanan' : diagramViewMode === 'year' ? 'Tahunan' : 'Semua Riwayat'}
                  </p>
                </div>

                {/* Quick table search & filter buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari personil di list..."
                      value={diagramSearchTable}
                      onChange={e => setDiagramSearchTable(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <select
                    value={diagramFilterReason}
                    onChange={e => setDiagramFilterReason(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:outline-hidden"
                  >
                    <option value="ALL">Semua Kategori Alasan</option>
                    {FORM_REASON_COLUMNS.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-3">Karyawan</th>
                      <th className="py-2.5 px-3">Tanggal Kejadian</th>
                      <th className="py-2.5 px-3">Alasan / Kendala</th>
                      <th className="py-2.5 px-3 text-center">Shift</th>
                      <th className="py-2.5 px-3 text-center">Pengesahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {diagramTableRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          Tidak ada personil yang sesuai dengan filter pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      diagramTableRecords.map((item, idx) => (
                        <tr key={String(item.sheetRowId || item.id) + '-' + idx} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                          <td className="py-2.5 px-3 text-center font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{item.nik} • <span className="font-bold text-teal-600">{item.pt}</span></div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300 font-mono">
                            {formatToIndoDateDDMMMYYYY(item.tanggal || item.tanggalDoc || item.tanggalDisplay)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {item.alasanKategori}
                            </span>
                            {item.keteranganLain && (
                              <div className="text-[10px] text-slate-500 italic mt-0.5">{item.keteranganLain}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {item.schedule === 'N' ? 'Malam (N)' : `Siang (${item.schedule})`}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.tandaTangan ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Signed
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
