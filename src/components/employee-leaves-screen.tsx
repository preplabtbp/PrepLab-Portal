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
  Check, 
  X, 
  Download, 
  Paperclip, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  ChevronDown, 
  Building2, 
  Layers, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Sparkles, 
  Info, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Database,
  Printer,
  FileDown,
  Pencil,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { renderToStaticMarkup } from 'react-dom/server';
import { toast } from 'sonner';
import { EmployeeLeavesAnalyticsChart } from './employee-leaves-analytics-chart';

export type DownloadScopeType = 'filtered' | 'today' | 'last_7_days' | 'this_month' | 'all';


// Helper: Normalisasi Golongan ke angka 1 - 5
export function parseGolonganLevel(val: any, jabatan?: string): number {
  const s = String(val || '').trim().toUpperCase();
  if (s === '5' || s === 'V' || (s.includes('V') && !s.includes('IV'))) return 5;
  if (s === '4' || s === 'IV' || s.includes('IV')) return 4;
  if (s === '3' || s === 'III' || s.includes('III')) return 3;
  if (s === '2' || s === 'II' || s.includes('II')) return 2;
  if (s === '1' || s === 'I' || s.includes('I')) return 1;

  // Fallback analisa nama jabatan
  const j = String(jabatan || '').toLowerCase();
  if (j.includes('manager') || j.includes('head') || j.includes('superintendent') || j.includes('spt')) return 5;
  if (j.includes('spv') || j.includes('supervisor')) return 3;
  if (j.includes('foreman') || j.includes('group leader') || j.includes('lead hand') || j.includes('leader')) return 2;
  return 1;
}

// Helper: Cek kesamaan Section dengan fleksibilitas sinonim (Preparasi/Preparation, dll)
export function isSameSection(secA?: string, secB?: string): boolean {
  if (!secA || !secB) return true;
  const a = String(secA).toLowerCase().trim();
  const b = String(secB).toLowerCase().trim();
  if (a === b) return true;
  if ((a.includes('prep') || a.includes('preparasi')) && (b.includes('prep') || b.includes('preparasi'))) return true;
  if ((a.includes('lab') || a.includes('laboratorium')) && (b.includes('lab') || b.includes('laboratorium'))) return true;
  if ((a.includes('admin') || a.includes('administrasi')) && (b.includes('admin') || b.includes('administrasi'))) return true;
  if (a.includes('maint') && b.includes('maint')) return true;
  if (a.includes('inv') && b.includes('inv')) return true;
  if ((a.includes('qa') || a.includes('quality')) && (b.includes('qa') || b.includes('quality'))) return true;
  return false;
}

// Helper: Cek apakah tanggal izin sudah melewati hari ini (Site Kawasi / Halmahera WIT UTC+9)
export const getTodayWitDate = (): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jayapura' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export const isLeaveExpired = (item: { awalAbsensi?: string; akhirAbsensi?: string }, todayStr: string): boolean => {
  const endDate = item.akhirAbsensi || item.awalAbsensi || '';
  if (!endDate) return false;
  const match = endDate.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) {
    return match[0] < todayStr;
  }
  return false;
};

// Helper: Cek apakah izin telah lewat 2 hari dan keterangan belum "Izin Selesai"
export const checkLeaveOverdue2Days = (item: { awalAbsensi?: string; createdAt?: string; acc?: string }, todayStr: string): boolean => {
  const status = String(item.acc || '').trim().toLowerCase();
  if (status === 'izin selesai' || status.includes('selesai')) {
    return false;
  }
  const dateStr = item.awalAbsensi || (item.createdAt ? String(item.createdAt).slice(0, 10) : '');
  if (!dateStr) return false;
  try {
    const dStart = new Date(dateStr);
    const dToday = new Date(todayStr);
    if (isNaN(dStart.getTime()) || isNaN(dToday.getTime())) return false;
    dStart.setHours(0, 0, 0, 0);
    dToday.setHours(0, 0, 0, 0);
    const diffMs = dToday.getTime() - dStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 2;
  } catch {
    return false;
  }
};

const INDO_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Format tanggal ke standar Indonesia [$-id-id] dd-mmm-yyyy (contoh: 19-Okt-2026)
 */
export function formatLeaveDateIndo(val?: any): string {
  if (!val || val === '-' || val === '#N/A' || val === '0' || String(val).toLowerCase() === 'null') {
    return '-';
  }
  const pad2 = (n: number) => String(n).padStart(2, '0');

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '-';
    return `${pad2(val.getDate())}-${INDO_MONTHS_SHORT[val.getMonth()]}-${val.getFullYear()}`;
  }

  const clean = String(val).trim();
  if (!clean) return '-';

  // Excel serial number (e.g. 45000)
  if (/^\d{5}$/.test(clean)) {
    const num = Number(clean);
    if (num >= 25569 && num <= 65000) {
      const dObj = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(dObj.getTime())) {
        return `${pad2(dObj.getDate())}-${INDO_MONTHS_SHORT[dObj.getMonth()]}-${dObj.getFullYear()}`;
      }
    }
  }

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${pad2(d)}-${INDO_MONTHS_SHORT[m - 1]}-${y}`;
    }
  }

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${pad2(d)}-${INDO_MONTHS_SHORT[m - 1]}-${y}`;
    }
  }

  // Format: DD-MMM-YYYY (e.g. 19-Okt-2026 or 19-Oct-2026)
  const dMmmYMatch = clean.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2,4})/);
  if (dMmmYMatch) {
    const d = parseInt(dMmmYMatch[1], 10);
    const mStr = dMmmYMatch[2].toLowerCase().slice(0, 3);
    let y = parseInt(dMmmYMatch[3], 10);
    if (y < 100) y = y <= 40 ? 2000 + y : 1900 + y;
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
      jul: 6, agu: 7, ags: 7, aug: 7, sep: 8, okt: 9, oct: 9,
      nov: 10, des: 11, dec: 11
    };
    const mIdx = monthMap[mStr];
    if (mIdx !== undefined && d >= 1 && d <= 31) {
      return `${pad2(d)}-${INDO_MONTHS_SHORT[mIdx]}-${y}`;
    }
  }

  // Fallback try Date parse
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return `${pad2(parsed.getDate())}-${INDO_MONTHS_SHORT[parsed.getMonth()]}-${parsed.getFullYear()}`;
  }

  return clean;
}

/**
 * Konversi tanggal ke format ISO YYYY-MM-DD untuk input date HTML5
 */
export function toIsoDate(val?: any): string {
  if (!val) return '';
  const clean = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) return clean.slice(0, 10);

  // Excel serial number
  if (/^\d{5}$/.test(clean)) {
    const num = Number(clean);
    if (num >= 25569 && num <= 65000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
  }

  // YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // DD-MMM-YYYY (e.g. 19-Okt-2026)
  const dMmmY = clean.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{4})/);
  if (dMmmY) {
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05', jun: '06',
      jul: '07', agu: '08', ags: '08', aug: '08', sep: '09', okt: '10', oct: '10',
      nov: '11', des: '12', dec: '12'
    };
    const mStr = dMmmY[2].toLowerCase().slice(0, 3);
    const mNum = monthMap[mStr] || '01';
    return `${dMmmY[3]}-${mNum}-${dMmmY[1].padStart(2, '0')}`;
  }

  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
}


export interface EmployeeLeaveItem {
  id: string | number;
  sheetRowId?: string;
  source: 'google_sheet' | 'web';
  timestamp?: string;
  nik: string;
  name: string;
  jabatan: string;
  section: string;
  penempatan: string;
  tempatTinggal?: string;
  gol?: string;
  shift: string;
  jamShift: string;
  awalAbsensi: string;
  akhirAbsensi: string;
  lamanyaIzin: string;
  jumlah: number;
  alasanAbsensi: string;
  pengawasMengetahui: string;
  lampiran: string;
  acc: string;
  accBy?: string;
  accAt?: string;
  catatan?: string;
  createdAt: string;
  updatedAt?: string;
}

interface EmployeeLeavesScreenProps {
  userProfile?: any;
  inspectorName?: string;
  inspectorNik?: string;
  userPt?: string;
  onNav?: (tab: string) => void;
  onBack?: () => void;
}

const SECTION_OPTIONS = [
  'ALL',
  'Preparation',
  'Laboratory',
  'Administration',
  'Maintenance',
  'Inventory Control',
  'Quality Assurance'
];

const SHIFT_OPTIONS = ['ALL', 'Shift A', 'Shift B', 'Nonshift'];
const ACC_OPTIONS = ['ALL', 'Pending', 'Disetujui', 'Ditolak'];
const SOURCE_OPTIONS = [
  { value: 'ALL', label: 'Semua Sumber' },
  { value: 'google_sheet', label: 'Google Sheet (PrepLab Cloud)' },
  { value: 'web', label: 'Web Portal' }
];

export function EmployeeLeavesScreen({
  userProfile,
  inspectorName = '',
  inspectorNik = '',
  onNav,
  onBack
}: EmployeeLeavesScreenProps) {
  // Deteksi navigasi kembali ke Labnote jika ada parameter URL 'returnTo'
  const returnToUrl = useMemo(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('returnTo');
    } catch {
      return null;
    }
  }, []);

  // 1. Pengecekan Hak Akses EDIT: Section Administration, Manager, Developer, Meeting Room
  const canEditLeaves = useMemo(() => {
    const cleanNik = (inspectorNik || '').trim().toUpperCase();
    const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
    if (HARDCODED_DEVS.includes(cleanNik)) return true;

    // Meeting Room
    if (cleanNik === 'MEETINGROOM' || cleanNik === 'MEETING' || cleanNik.includes('MEETING')) return true;

    // Cek Profile Prop
    if (userProfile) {
      const sec = (userProfile.section || '').toLowerCase();
      const dept = (userProfile.department || '').toLowerCase();
      const jab = (userProfile.jabatan || '').toLowerCase();
      const role = (userProfile.role || '').toLowerCase();
      
      // Developer
      if (role.includes('developer') || jab.includes('developer')) return true;

      // Section Administration
      if (
        sec.includes('administrasi') || sec.includes('administration') || sec.includes('admin') ||
        dept.includes('administrasi') || dept.includes('administration') || dept.includes('admin') ||
        jab.includes('admin') || role.includes('admin')
      ) return true;

      // Manager / Superintendent / Head
      if (
        jab.includes('manager') || jab.includes('superintendent') || jab.includes('spt') ||
        role.includes('manager') || jab.includes('head')
      ) return true;
    }

    // Cek localStorage 'p2h_inspector_profile'
    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        const sec = (p.section || '').toLowerCase();
        const dept = (p.department || '').toLowerCase();
        const jab = (p.jabatan || '').toLowerCase();
        const role = (p.role || '').toLowerCase();

        if (role.includes('developer') || jab.includes('developer')) return true;
        if (
          sec.includes('administrasi') || sec.includes('administration') || sec.includes('admin') ||
          dept.includes('administrasi') || dept.includes('administration') || dept.includes('admin') ||
          jab.includes('admin') || role.includes('admin')
        ) return true;
        if (
          jab.includes('manager') || jab.includes('superintendent') || jab.includes('spt') ||
          role.includes('manager') || jab.includes('head')
        ) return true;
      }
    } catch {}

    return false;
  }, [inspectorNik, userProfile]);

  // Alias untuk kompatibilitas
  const isSectionAdmin = canEditLeaves;

  // 2. Identifikasi Golongan & Section User yang sedang Login
  const { currentUserGolLevel, currentUserSection, userRoleTitle } = useMemo(() => {
    const cleanNik = (inspectorNik || '').trim().toUpperCase();
    const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
    
    // Default jika Developer / Meeting Room / Admin / Manager -> Level 5 (Akses Penuh)
    if (HARDCODED_DEVS.includes(cleanNik) || cleanNik.includes('MEETING')) {
      return { currentUserGolLevel: 5, currentUserSection: 'All', userRoleTitle: 'Developer / Meeting Room' };
    }

    let rawGol = userProfile?.gol || userProfile?.jobGrade || '';
    let rawSec = userProfile?.section || userProfile?.department || 'Preparation';
    let rawJab = userProfile?.jabatan || '';

    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (!rawGol) rawGol = p.gol || p.jobGrade || '';
        if (!rawSec) rawSec = p.section || p.department || 'Preparation';
        if (!rawJab) rawJab = p.jabatan || '';
      }
    } catch {}

    if (canEditLeaves) {
      return { currentUserGolLevel: 5, currentUserSection: rawSec || 'All', userRoleTitle: 'Section Admin / Manager' };
    }

    const golLevel = parseGolonganLevel(rawGol, rawJab);
    return {
      currentUserGolLevel: golLevel,
      currentUserSection: rawSec || 'Preparation',
      userRoleTitle: `Golongan ${golLevel === 1 ? 'I' : golLevel === 2 ? 'II' : golLevel === 3 ? 'III' : golLevel === 4 ? 'IV' : 'V'}`
    };
  }, [inspectorNik, userProfile, canEditLeaves]);
  const [leaves, setLeaves] = useState<EmployeeLeaveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [isLeaveStatsOpen, setIsLeaveStatsOpen] = useState(false);

  // Sheet Tabs: 'daftar' (Daftar Rekapan Izin) vs 'diagram' (Diagram & Analitik Manpower)
  const [activeSheet, setActiveSheet] = useState<'daftar' | 'diagram'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('tab') || params.get('sheet');
      if (s === 'diagram' || s === 'analytics') return 'diagram';
    } catch {}
    return 'daftar';
  });

  // Handler Inline Edit langsung pada tabel tanpa bantuan modal
  const handleInlineUpdate = async (id: string | number, field: string, value: any) => {
    // Update lokal terlebih dahulu agar UI responsif seketika
    setLeaves(prev => prev.map(item => {
      if (String(item.id) === String(id)) {
        return {
          ...item,
          [field]: value,
          ...(field === 'acc' ? { acc: value, accBy: inspectorName || userProfile?.name || 'Administrasi' } : {})
        };
      }
      return item;
    }));

    try {
      const res = await fetch(`/api/employee-leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: value,
          accBy: inspectorName || userProfile?.name || 'Administrasi'
        })
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toast.success(`Pembaruan tersimpan: ${field === 'acc' ? 'Keterangan ' + value : value}`);
      } else {
        toast.error(json.message || 'Gagal menyimpan perubahan ke server.');
      }
    } catch (err) {
      console.error('Error inline update:', err);
      toast.error('Terjadi kendala koneksi saat menyimpan perubahan.');
    }
  };

  // Toggle Diagram
  const [showDiagram, setShowDiagram] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterShift, setFilterShift] = useState('ALL');
  const [filterAcc, setFilterAcc] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Detail Modal
  const [selectedLeave, setSelectedLeave] = useState<EmployeeLeaveItem | null>(null);

  // Edit Modal State (Khusus Section Administrasi)
  const [editingLeave, setEditingLeave] = useState<EmployeeLeaveItem | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    nik: '',
    name: '',
    jabatan: '',
    section: '',
    penempatan: '',
    tempatTinggal: 'Nirwana (Mess)',
    shift: '',
    jamShift: '',
    awalAbsensi: '',
    akhirAbsensi: '',
    jumlah: 1,
    lamanyaIzin: '',
    alasanAbsensi: '',
    pengawasMengetahui: '',
    acc: '',
    catatan: ''
  });

  const openEditModal = (item: EmployeeLeaveItem) => {
    if (!isSectionAdmin) {
      toast.error('Hanya personil Section Administrasi yang memiliki hak akses untuk mengedit rekapan izin.');
      return;
    }
    setEditingLeave(item);
    setEditForm({
      nik: item.nik || '',
      name: item.name || '',
      jabatan: item.jabatan || '',
      section: item.section || 'Preparation',
      penempatan: item.penempatan || item.section || 'Preparation',
      tempatTinggal: item.tempatTinggal || 'Nirwana (Mess)',
      shift: item.shift || 'Nonshift',
      jamShift: item.jamShift || '',
      awalAbsensi: item.awalAbsensi || '',
      akhirAbsensi: item.akhirAbsensi || item.awalAbsensi || '',
      jumlah: item.jumlah || 1,
      lamanyaIzin: item.lamanyaIzin || `${item.jumlah || 1} Hari`,
      alasanAbsensi: item.alasanAbsensi || '',
      pengawasMengetahui: item.pengawasMengetahui || '-',
      acc: item.acc || 'Disetujui',
      catatan: item.catatan || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave) return;
    if (!isSectionAdmin) {
      toast.error('Akses ditolak: Hanya Section Administrasi yang berwenang mengubah data.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/employee-leaves/${editingLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          accBy: inspectorName || userProfile?.name || 'Administrasi'
        })
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toast.success(json.message || 'Data izin karyawan berhasil diperbarui oleh Administrasi!');
        // Update local state instantly
        setLeaves(prev => prev.map(item => {
          if (String(item.id) === String(editingLeave.id)) {
            return {
              ...item,
              ...editForm,
              accBy: inspectorName || userProfile?.name || item.accBy,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        }));
        setEditingLeave(null);
      } else {
        toast.error(json.message || 'Gagal menyimpan perubahan data izin.');
      }
    } catch (err: any) {
      console.error('Error saving leave edit:', err);
      toast.error('Terjadi kesalahan jaringan saat menyimpan perubahan.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Download Center Modal State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadScope, setDownloadScope] = useState<DownloadScopeType>('filtered');
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Fetch Rekapan Izin
  const fetchLeaves = async (silent = false, force = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (force) params.set('force', 'true');
      if (filterSection !== 'ALL') params.set('section', filterSection);
      if (filterShift !== 'ALL') params.set('shift', filterShift);
      if (filterAcc !== 'ALL') params.set('acc', filterAcc);
      if (filterSource !== 'ALL') params.set('source', filterSource);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);

      const res = await fetch(`/api/employee-leaves?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          setLeaves(json.data || []);
          setSummary(json.summary || null);
        }
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
      toast.error('Gagal memuat rekapan izin karyawan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [filterSection, filterShift, filterAcc, filterSource, filterStartDate, filterEndDate]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeaves(true);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close download dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Force Sync with Google Sheet
  const handleForceSync = async () => {
    setIsSyncing(true);
    toast.info('Menghubungkan ke Google Drive PrepLab Cloud...');
    try {
      const res = await fetch('/api/employee-leaves/sync-sheet', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toast.success(json.message || 'Berhasil menyinkronkan data Google Sheet!');
        // Paksa reload data terbaru dengan parameter force
        await fetchLeaves(true, true);
      } else {
        toast.error(json.message || 'Gagal menyinkronkan data Google Sheet.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat menyinkronkan Google Sheet.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle ACC / Approval
  const handleAccStatus = async (id: string | number, newStatus: string) => {
    try {
      const res = await fetch(`/api/employee-leaves/${id}/acc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acc: newStatus,
          accBy: inspectorName || 'Admin / Atasan'
        })
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toast.success(`Status perizinan berhasil diubah menjadi: ${newStatus}`);
        setLeaves(prev => prev.map(item => item.id === id ? { ...item, acc: newStatus, accBy: inspectorName } : item));
        if (selectedLeave && selectedLeave.id === id) {
          setSelectedLeave({ ...selectedLeave, acc: newStatus, accBy: inspectorName });
        }
      } else {
        toast.error(json.message || 'Gagal mengubah status');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan server saat memperbarui ACC.');
    }
  };

  // ==========================================
  // DAFTAR UNDUH & EKSPOR LAPORAN LENGKAP
  // ==========================================
  const getLeavesForScope = async (scope: DownloadScopeType): Promise<EmployeeLeaveItem[]> => {
    if (scope === 'filtered') return leaves;

    let allData = leaves;
    if (scope === 'all' || filterSection !== 'ALL' || filterShift !== 'ALL' || filterSource !== 'ALL' || searchQuery.trim() || filterStartDate || filterEndDate) {
      try {
        const res = await fetch('/api/employee-leaves');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data)) {
            allData = json.data;
          }
        }
      } catch (err) {
        console.warn('Gagal memuat seluruh data dari server:', err);
      }
    }

    if (scope === 'all') return allData;

    // Waktu lokal Site Kawasi (WIT / UTC+9)
    const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
    const monthStr = nowStr.slice(0, 7);

    if (scope === 'this_month') {
      return allData.filter(l => {
        const s = l.awalAbsensi || l.createdAt?.slice(0, 10);
        return s && s.startsWith(monthStr);
      });
    }
    if (scope === 'today') {
      return allData.filter(l => {
        const s = l.awalAbsensi || l.createdAt?.slice(0, 10);
        const e = l.akhirAbsensi || s;
        return s <= nowStr && e >= nowStr;
      });
    }
    if (scope === 'last_7_days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      const d7Str = d7.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
      return allData.filter(l => {
        const s = l.awalAbsensi || l.createdAt?.slice(0, 10);
        const e = l.akhirAbsensi || s;
        return s <= nowStr && e >= d7Str;
      });
    }
    return allData;
  };

  // 1. Ekspor ke Excel (.xlsx) dengan 2 sheet (Detail + Ringkasan)
  const handleExportExcel = async (scope: DownloadScopeType = 'filtered') => {
    setIsDownloading(true);
    toast.info('Menyiapkan berkas Excel (.xlsx)...');
    try {
      const dataset = await getLeavesForScope(scope);
    if (dataset.length === 0) {
      toast.info('Tidak ada data yang dapat diekspor untuk pilihan tersebut.');
      return;
    }

    // Sheet 1: Detail Rekapan Izin
    const exportRows = dataset.map((item, idx) => ({
      'No': idx + 1,
      'Tanggal Input': item.createdAt ? item.createdAt.slice(0, 10) : '-',
      'NIK Karyawan': item.nik,
      'Nama Lengkap': item.name,
      'Tempat Tinggal': item.tempatTinggal || '-',
      'Jabatan': item.jabatan,
      'Bagian / Section': item.penempatan || item.section,
      'Shift': item.shift,
      'Jam Kerja': item.jamShift || '-',
      'Mulai Izin': formatLeaveDateIndo(item.awalAbsensi) || item.awalAbsensi,
      'Tanggal Izin': formatLeaveDateIndo(item.awalAbsensi) || item.awalAbsensi,
      'Jumlah Izin': item.lamanyaIzin || `${item.jumlah || 1} Hari`,
      'Selesai Izin': formatLeaveDateIndo(item.akhirAbsensi) || item.akhirAbsensi,
      'Durasi Izin': item.lamanyaIzin || `${item.jumlah || 1} Hari`,
      'Alasan Izin': item.alasanAbsensi,
      'Pengawas Mengetahui (Gol II-V)': item.pengawasMengetahui || '-',
      'Status ACC': item.acc || 'Pending',
      'Status / Ket': isLeaveExpired(item, getTodayWitDate()) ? 'Izin Selesai' : (item.acc || 'Pending'),
      'Disetujui Oleh': item.accBy || '-',
      'Lampiran Link': item.lampiran || '-',
      'Sumber Data': item.source === 'google_sheet' ? 'Google Sheet PrepLab Cloud' : 'Web Portal'
    }));

    // Sheet 2: Ringkasan Statistik
    let sakitCount = 0;
    let keluargaCount = 0;
    let lainnyaCount = 0;
    let shiftACount = 0;
    let shiftBCount = 0;
    let nonshiftCount = 0;

    dataset.forEach(item => {
      const a = (item.alasanAbsensi || '').toLowerCase();
      if (a.includes('sakit') || a.includes('demam')) sakitCount++;
      else if (a.includes('keluarga') || a.includes('istri') || a.includes('anak')) keluargaCount++;
      else lainnyaCount++;

      const s = (item.shift || '').toUpperCase();
      if (s.includes('A')) shiftACount++;
      else if (s.includes('B')) shiftBCount++;
      else nonshiftCount++;
    });

    const summaryRows = [
      { 'Metrik Manpower': 'Total Catatan Izin', 'Jumlah': dataset.length, 'Keterangan': 'Total rekapan data' },
      { 'Metrik Manpower': 'Izin Sakit / Medis', 'Jumlah': sakitCount, 'Keterangan': 'Demam, flu, keluhan fisik' },
      { 'Metrik Manpower': 'Izin Urusan Keluarga', 'Jumlah': keluargaCount, 'Keterangan': 'Urusan rumah tangga' },
      { 'Metrik Manpower': 'Izin Lainnya / Pribadi', 'Jumlah': lainnyaCount, 'Keterangan': 'Pernikahan, duka, dll' },
      { 'Metrik Manpower': 'Shift A', 'Jumlah': shiftACount, 'Keterangan': 'Personil Shift A' },
      { 'Metrik Manpower': 'Shift B', 'Jumlah': shiftBCount, 'Keterangan': 'Personil Shift B' },
      { 'Metrik Manpower': 'Nonshift / Staff', 'Jumlah': nonshiftCount, 'Keterangan': 'Personil Nonshift' },
    ];

    const wsDetail = XLSX.utils.json_to_sheet(exportRows);
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

    // Auto Column Widths
    wsDetail['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 22 }, 
      { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
      { wch: 12 }, { wch: 35 }, { wch: 25 }, { wch: 12 }, { wch: 18 }, 
      { wch: 30 }, { wch: 24 }
    ];
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Daftar Izin');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Statistik');

    const fileName = `Daftar_Izin_Karyawan_PrepLab_${scope}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setIsDownloadMenuOpen(false);
    setIsDownloadModalOpen(false);
    toast.success(`Daftar izin berhasil diunduh: ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh Excel.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 2. Ekspor ke CSV (.csv) Standar
  const handleExportCsv = async (scope: DownloadScopeType = 'filtered') => {
    setIsDownloading(true);
    toast.info('Menyiapkan berkas CSV...');
    try {
      const dataset = await getLeavesForScope(scope);
    if (dataset.length === 0) {
      toast.info('Tidak ada data untuk diekspor ke CSV.');
      return;
    }

    const headers = [
      'No', 'Tanggal Input', 'NIK', 'Nama Karyawan', 'Jabatan', 'Bagian', 
      'Shift', 'Tanggal Izin', 'Jumlah Izin', 'Selesai Izin', 'Alasan Izin', 
      'Pengawas Mengetahui', 'Status ACC'
    ];

    const rows = dataset.map((item, idx) => [
      idx + 1,
      item.createdAt ? item.createdAt.slice(0, 10) : '',
      `"${item.nik}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.jabatan || '').replace(/"/g, '""')}"`,
      `"${(item.penempatan || item.section || '').replace(/"/g, '""')}"`,
      `"${item.shift || ''}"`,
      formatLeaveDateIndo(item.awalAbsensi) || item.awalAbsensi || '',
      `"${item.lamanyaIzin || `${item.jumlah || 1} Hari`}"`,
      formatLeaveDateIndo(item.akhirAbsensi) || item.akhirAbsensi || '',
      `"${(item.alasanAbsensi || '').replace(/"/g, '""')}"`,
      `"${(item.pengawasMengetahui || '').replace(/"/g, '""')}"`,
      `"${item.acc || 'Pending'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Izin_Karyawan_${scope}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsDownloadMenuOpen(false);
    setIsDownloadModalOpen(false);
    toast.success('Daftar izin berhasil diunduh dalam format CSV.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh CSV.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 3. Ekspor ke PDF Resmi Siap Cetak (.pdf)
  const handleExportPdf = async (scope: DownloadScopeType = 'filtered') => {
    const dataset = await getLeavesForScope(scope);
    if (dataset.length === 0) {
      toast.info('Tidak ada data untuk diekspor ke PDF.');
      return;
    }

    setIsGeneratingPdf(true);
    toast.info('Sedang menyusun dokumen PDF resmi daftar izin...');

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const now = new Date();
      const printDateStr = now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Buat container HTML cetak sementara
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;top:0;left:0;width:1200px;background:#ffffff;z-index:-9999;pointer-events:none;font-family:sans-serif;color:#1e293b;';

      // Ambil maksimal 40 baris pertama untuk PDF laporan eksekutif
      const displayRows = dataset.slice(0, 35);

      const printHtml = `
        <div style="padding: 32px; background: #ffffff;">
          <!-- KOP SURAT RESMI -->
          <div style="border-bottom: 3px double #2298A7; padding-bottom: 16px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h2 style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  PT TRIMEGAH BANGUN PERSADA Tbk
                </h2>
                <h3 style="font-size: 14px; font-weight: 700; color: #2298A7; margin: 4px 0 0 0;">
                  DIVISI PREPARATION & LABORATORY - PORTAL OPERASIONAL
                </h3>
                <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">
                  Site Kawasi, Pulau Obi, Halmahera Selatan, Maluku Utara
                </p>
              </div>
              <div style="text-align: right; font-size: 11px; color: #475569;">
                <div style="display: inline-block; padding: 4px 10px; background: #E8F6F8; border: 1px solid #2298A7; border-radius: 6px; font-weight: 700; color: #2298A7;">
                  FORMULIR REKAPAN RESMI
                </div>
                <div style="margin-top: 4px; font-weight: 600;">Tanggal Cetak: ${printDateStr}</div>
              </div>
            </div>
          </div>

          <!-- JUDUL LAPORAN -->
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 18px; font-weight: 900; margin: 0; color: #0f172a; text-transform: uppercase;">
              DAFTAR REKAPITULASI PERIZINAN KARYAWAN
            </h1>
            <p style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Lingkup: <strong>${scope === 'all' ? 'Seluruh Data' : scope === 'this_month' ? 'Bulan Ini' : scope === 'today' ? 'Hari Ini' : 'Hasil Filter'}</strong> &bull; Total Data: <strong>${dataset.length} Karyawan</strong>
            </p>
          </div>

          <!-- TABEL DAFTAR IZIN -->
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
            <thead>
              <tr style="background: #2298A7; color: #ffffff; text-align: left;">
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; width: 30px;">No</th>
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 85px;">NIK</th>
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 140px;">Nama Karyawan</th>
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 100px;">Bagian / Shift</th>
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 110px;">Tanggal Izin</th>
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 65px; text-align: center;">Jumlah Izin</th>
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1;">Alasan Izin</th>
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 120px;">Pengawas Mengetahui</th>
                <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 65px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows.map((r, i) => `
                <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${i + 1}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace;">${r.nik}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${r.name}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.penempatan || r.section}<br/><span style="color:#64748b; font-size: 9.5px;">${r.shift}</span></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 600;">${formatLeaveDateIndo(r.awalAbsensi)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${r.lamanyaIzin || `${r.jumlah || 1} Hr`}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.alasanAbsensi}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: 600;">${r.pengawasMengetahui || '-'}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${r.acc === 'Disetujui' ? '#15803d' : '#b45309'};">
                    ${r.acc || 'Pending'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${dataset.length > 35 ? `
            <div style="font-size: 10px; color: #64748b; margin-top: 8px; font-style: italic; text-align: right;">
              * Menampilkan 35 baris ringkasan pertama. Untuk data lengkap keseluruhan (${dataset.length} baris), gunakan format Excel (.xlsx).
            </div>
          ` : ''}

          <!-- BLOK PENGESAHAN TANDA TANGAN RESMI -->
          <div style="margin-top: 36px; display: flex; justify-content: space-between; page-break-inside: avoid;">
            <div style="text-align: center; width: 220px;">
              <p style="font-size: 11px; margin: 0; color: #475569;">Dicatat & Diperiksa Oleh:</p>
              <div style="height: 55px;"></div>
              <p style="font-size: 11.5px; font-weight: bold; margin: 0; text-decoration: underline;">${inspectorName || 'Admin Preparation & Lab'}</p>
              <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Admin / Staff HRD</p>
            </div>

            <div style="text-align: center; width: 220px;">
              <p style="font-size: 11px; margin: 0; color: #475569;">Mengetahui & Menyetujui:</p>
              <div style="height: 55px;"></div>
              <p style="font-size: 11.5px; font-weight: bold; margin: 0; text-decoration: underline;">Supervisor / Superintendent</p>
              <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Divisi Preparation & Laboratory</p>
            </div>
          </div>
        </div>
      `;

      host.innerHTML = printHtml;
      document.body.appendChild(host);

      const canvas = await html2canvas(host.firstElementChild as HTMLElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        windowWidth: 1200
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const margin = 10;
      const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;

      pdf.setProperties({
        title: `Daftar Rekapitulasi Izin Karyawan`,
        subject: 'Rekapan Izin Dept. Preparation & Laboratory',
        creator: 'PrepLab Portal'
      });

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin + (pageW - w) / 2, margin + (pageH - h) / 2, w, h, undefined, 'FAST');
      const filename = `Laporan_Resmi_Daftar_Izin_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
      document.body.removeChild(host);

      setIsDownloadMenuOpen(false);
      setIsDownloadModalOpen(false);
      toast.success(`Dokumen PDF resmi berhasil diunduh: ${filename}`);
    } catch (err: any) {
      console.error('Error creating PDF:', err);
      toast.error('Gagal membuat dokumen PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(leaves.length / itemsPerPage) || 1;
  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return leaves.slice(start, start + itemsPerPage);
  }, [leaves, currentPage]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterSection('ALL');
    setFilterShift('ALL');
    setFilterAcc('ALL');
    setFilterSource('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
    toast.info('Filter pencarian telah direset.');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-6 space-y-5 font-sans">
      
      {/* Banner Informasi Hak Akses View */}
      {currentUserGolLevel < 5 && !canEditLeaves && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {currentUserGolLevel === 2 ? 'II' : currentUserGolLevel === 3 ? 'III' : 'IV'}
            </div>
            <div>
              <div className="font-bold text-indigo-950 dark:text-indigo-200">
                Mode Tinjauan: {userRoleTitle} &bull; Section {currentUserSection}
              </div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                {currentUserGolLevel === 2 
                  ? 'Anda memiliki hak akses melihat rekapan perizinan khusus karyawan Golongan I dan Golongan II di section Anda.'
                  : 'Anda memiliki hak akses melihat rekapan perizinan khusus karyawan Golongan I, II, dan III di section Anda.'}
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 shrink-0">
            View Only
          </span>
        </div>
      )}

      {/* ==================================================== */}
      {/* TOP HEADER & ACTION BAR                             */}
      {/* ==================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {returnToUrl ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = returnToUrl;
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all mr-2 cursor-pointer animate-pulse"
                title="Kembali ke Modul Labnote Sebelumnya"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Labnote</span>
              </button>
            ) : onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 transition-colors mr-1 cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                Rekapan Izin Karyawan
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Data perizinan karyawan terintegrasi real-time dengan Google Sheet PrepLab Cloud
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tombol Isi Form Pelaporan Izin (Google Form) */}
          {onNav && (
            <button
              type="button"
              onClick={() => onNav('pelaporan-izin')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Isi Form Pelaporan Izin</span>
            </button>
          )}

          {/* Sync Google Sheet Button */}
          <button
            type="button"
            onClick={handleForceSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/25 font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sheet'}</span>
          </button>

          {/* Open Google Sheet link */}
          <a
            href="https://docs.google.com/spreadsheets/d/1yeRjyHjsWlEmy37xj4qnysMWUuzDIBUP0gg3nVR1Rys/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all"
            title="Buka file Google Sheet di Google Drive PrepLab Cloud"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka di Drive</span>
          </a>

          {/* ==================================================== */}
          {/* PUSAT UNDUHAN DAFTAR IZIN (DROPDOWN MENU LENGKAP)    */}
          {/* ==================================================== */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              type="button"
              onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#2298A7] hover:bg-[#1a8290] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Daftar Izin</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDownloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                    Pilih Format Unduhan Daftar Izin
                  </span>
                </div>

                {/* 1. Unduh Excel */}
                <button
                  type="button"
                  onClick={() => handleExportExcel('filtered')}
                  className="w-full p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                      Unduh Excel (.xlsx)
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      Tabel terformat rapi + Sheet ringkasan statistik
                    </p>
                  </div>
                </button>

                {/* 2. Unduh PDF Resmi */}
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => handleExportPdf('filtered')}
                  className="w-full p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left flex items-start gap-2.5 transition-colors cursor-pointer group disabled:opacity-60"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
                      {isGeneratingPdf ? 'Menyusun Dokumen...' : 'Unduh Laporan PDF Resmi'}
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      Format cetak resmi dengan kop surat & pengesahan
                    </p>
                  </div>
                </button>

                {/* 3. Unduh CSV */}
                <button
                  type="button"
                  onClick={() => handleExportCsv('filtered')}
                  className="w-full p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 text-left flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                      Unduh Format CSV (.csv)
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      Format data mentah untuk integrasi sistem
                    </p>
                  </div>
                </button>

                {/* 4. Kustomisasi & Opsi Lanjutan */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDownloadMenuOpen(false);
                      setIsDownloadModalOpen(true);
                    }}
                    className="w-full p-2 text-center text-[#2298A7] dark:text-teal-400 font-bold hover:underline"
                  >
                    Opsi Unduh Lanjutan (Pilih Periode)...
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SHEET TABS: DAFTAR IZIN vs DIAGRAM & ANALITIK        */}
      {/* ==================================================== */}
      <div className="p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSheet('daftar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSheet === 'daftar'
              ? 'bg-[#2298A7] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Daftar Izin Karyawan</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeSheet === 'daftar' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {leaves.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSheet('diagram')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSheet === 'diagram'
              ? 'bg-[#2298A7] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Diagram & Analitik Manpower</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeSheet === 'diagram' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            Grafik
          </span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* SHEET 2: DIAGRAM & ANALITIK MANPOWER                */}
      {/* ==================================================== */}
      {activeSheet === 'diagram' ? (
        <EmployeeLeavesAnalyticsChart leaves={leaves} defaultSection={filterSection} />
      ) : (
        <>
          {/* ==================================================== */}
          {/* CLOUD SYNC & STATS BANNER                           */}
          {/* ==================================================== */}
          {/* Dropdown Tipis Ringkasan & Analitik Rekap Izin */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-all duration-200">
            <div 
              onClick={() => setIsLeaveStatsOpen(prev => !prev)}
              className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      Ringkasan & Keterangan Rekap Izin
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {summary?.total || leaves.length} Total Izin
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {summary?.approvedCount || 0} Terverifikasi
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {summary?.sakitCount || 0} Sakit
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {isLeaveStatsOpen ? 'Klik untuk menutup ringkasan keterangan & kartu analitik' : 'Klik untuk melihat 5 kartu statistik rekap izin, sakit, keluarga & approval'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLeaveStatsOpen(prev => !prev);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                  isLeaveStatsOpen 
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title={isLeaveStatsOpen ? "Tutup Keterangan" : "Buka Keterangan & KPI"}
              >
                <span className="text-[11px]">{isLeaveStatsOpen ? 'Tutup' : 'Keterangan & KPI'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isLeaveStatsOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Konten 5 Kartu KPI (Hanya Muncul Ketika Diklik) */}
            {isLeaveStatsOpen && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* KPI 1: TOTAL IZIN */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Total Rekap Izin</span>
                      <Database className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {summary?.total || leaves.length}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {summary?.sheetTotalRows || 0} dari Sheet &bull; {summary?.webTotalRows || 0} dari Web
                    </p>
                  </div>

                  {/* KPI 2: IZIN SAKIT */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Izin Sakit / Medis</span>
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                      {summary?.sakitCount || 0}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Surat dokter & keluhan fisik</p>
                  </div>

                  {/* KPI 3: IZIN KELUARGA */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Izin Keluarga</span>
                      <Users className="w-4 h-4 text-sky-500" />
                    </div>
                    <p className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
                      {summary?.keluargaCount || 0}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Urusan rumah tangga & keluarga</p>
                  </div>

                  {/* KPI 4: VERIFIKASI / DISETUJUI */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Diketahui Pengawas</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {summary?.approvedCount || 0}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Gol II-V terkonfirmasi</p>
                  </div>

                  {/* KPI 5: PENDING ACC */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Status Pending</span>
                      <Clock className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                      {summary?.pendingCount || 0}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Perlu review pengawas</p>
                  </div>
                </div>
              </div>
            )}
          </div>

      {/* ==================================================== */}
      {/* FILTER & SEARCH PANEL                               */}
      {/* ==================================================== */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nama, NIK, Jabatan, Pengawas, atau Alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">Semua Bagian (Section)</option>
              {SECTION_OPTIONS.filter(s => s !== 'ALL').map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">Semua Shift</option>
              {SHIFT_OPTIONS.filter(s => s !== 'ALL').map(sh => (
                <option key={sh} value={sh}>{sh}</option>
              ))}
            </select>
          </div>

          {/* Sumber Data Filter */}
          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-slate-300"
            >
              {SOURCE_OPTIONS.map(src => (
                <option key={src.value} value={src.value}>{src.label}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* REKAPAN TABLE                                       */}
      {/* ==================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Table Action Bar: Count & Direct Download Buttons */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-[#2298A7]/15 text-[#2298A7] font-bold text-xs">
              {leaves.length} Data
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Daftar Izin Karyawan
              {summary?.total ? (
                <span className="font-normal text-slate-500 ml-1.5 text-[11px]">
                  (Total {summary.total} catatan PrepLab Cloud)
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 hidden md:inline mr-1">Unduh Cepat:</span>
            
            {/* Quick Excel */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleExportExcel('filtered')}
              title="Unduh data tabel saat ini ke format Excel (.xlsx)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            {/* Quick PDF */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => handleExportPdf('filtered')}
              title="Cetak & Unduh Laporan PDF Resmi dengan Kop Surat"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Printer className="w-3.5 h-3.5 text-rose-600" />
              <span>{isGeneratingPdf ? 'PDF...' : 'PDF Resmi'}</span>
            </button>

            {/* Quick CSV */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleExportCsv('filtered')}
              title="Unduh data ke format CSV"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <FileDown className="w-3.5 h-3.5 text-sky-600" />
              <span>CSV</span>
            </button>

            {/* Buka Pusat Unduhan */}
            <button
              type="button"
              onClick={() => setIsDownloadModalOpen(true)}
              title="Buka Pusat Unduhan & Daftar Berkas Rekapan Izin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2298A7] hover:bg-[#1a8290] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Daftar Unduh...</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-3.5 text-center w-12">No</th>
                <th className="py-3 px-3.5">Karyawan</th>
                <th className="py-3 px-3.5">Tempat Tinggal</th>
                <th className="py-3 px-3.5">Bagian & Shift</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Tanggal Izin</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Jumlah Izin</th>
                <th className="py-3 px-3.5">Alasan Izin</th>
                <th className="py-3 px-3.5">Pengawas Mengetahui</th>
                <th className="py-3 px-3.5 text-center">Bukti / Lampiran</th>
                <th className="py-3 px-3.5 text-center">Keterangan</th>
                <th className="py-3 px-3.5 text-center">Warning</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <span className="text-xs font-semibold">Memuat rekapan izin karyawan dari Google Sheet...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Tidak ada catatan izin yang cocok.</p>
                      <p className="text-xs text-slate-400">Coba ubah kata kunci atau bersihkan filter pencarian.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeaves.map((item, index) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  const isSheetSource = item.source === 'google_sheet';
                  const todayStr = getTodayWitDate();
                  const isOverdue2Days = checkLeaveOverdue2Days(item, todayStr);

                  return (
                    <tr 
                      key={item.id} 
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLeave(item)}
                    >
                      {/* No */}
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {rowNumber}
                      </td>

                      {/* Karyawan (Name & NIK) */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 dark:text-white leading-tight">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            {item.nik}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {item.jabatan}
                          </span>
                        </div>
                      </td>

                      {/* Tempat Tinggal - Inline Editable */}
                      <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <input
                            type="text"
                            defaultValue={item.tempatTinggal || ''}
                            key={`${item.id}-tt-${item.tempatTinggal}`}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (item.tempatTinggal || '')) {
                                handleInlineUpdate(item.id, 'tempatTinggal', val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="Isi tempat tinggal..."
                            className="w-full max-w-[140px] px-2 py-1 text-xs font-semibold rounded bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-200 outline-none transition-all"
                            title="Edit tempat tinggal langsung di tabel"
                          />
                        </div>
                      </td>

                      {/* Bagian & Shift - Inline Editable */}
                      <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.penempatan || item.section}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                          <select
                            value={item.shift || 'Shift A'}
                            onChange={(e) => handleInlineUpdate(item.id, 'shift', e.target.value)}
                            className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-200 dark:border-indigo-800 cursor-pointer focus:ring-1 focus:ring-indigo-500 outline-none"
                            title="Ubah shift langsung di tabel"
                          >
                            <option value="Shift A">Shift A</option>
                            <option value="Shift B">Shift B</option>
                            <option value="Nonshift">Nonshift</option>
                          </select>
                          {item.jamShift && (
                            <span className="text-slate-400 text-[10px]">&bull; {item.jamShift}</span>
                          )}
                        </div>
                      </td>

                      {/* Tanggal Izin - Format [$-id-id] dd-mmm-yyyy & Inline Editable */}
                      <td className="py-3 px-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-flex items-center group">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 text-slate-800 dark:text-slate-100 shadow-2xs transition-all cursor-pointer">
                            <Calendar className="w-3.5 h-3.5 text-[#135e69] dark:text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="tracking-wide">
                              {formatLeaveDateIndo(item.awalAbsensi)}
                            </span>
                          </div>
                          <input
                            type="date"
                            value={toIsoDate(item.awalAbsensi)}
                            key={`${item.id}-tgl-${item.awalAbsensi}`}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && val !== item.awalAbsensi) {
                                handleInlineUpdate(item.id, 'awalAbsensi', val);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            title="Klik untuk memilih / mengubah tanggal izin (dd-mmm-yyyy)"
                          />
                        </div>
                      </td>

                      {/* Jumlah Izin - Kolom Terpisah & Inline Editable */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <input
                            type="text"
                            defaultValue={item.lamanyaIzin || `${item.jumlah || 1} Hari`}
                            key={`${item.id}-dur-${item.lamanyaIzin}`}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== item.lamanyaIzin) {
                                handleInlineUpdate(item.id, 'lamanyaIzin', val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-16 px-1 py-0.5 text-xs font-bold text-center text-purple-700 dark:text-purple-300 rounded bg-white dark:bg-slate-800/90 border border-purple-200 dark:border-purple-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-400 outline-none transition-all"
                            title="Edit jumlah / durasi izin (contoh: 1 Hari, 2 Hari)"
                          />
                        </div>
                      </td>

                      {/* Alasan Izin - Inline Editable */}
                      <td className="py-3 px-3.5 max-w-xs" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          defaultValue={item.alasanAbsensi || ''}
                          key={`${item.id}-alasan-${item.alasanAbsensi}`}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (item.alasanAbsensi || '')) {
                              handleInlineUpdate(item.id, 'alasanAbsensi', val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="Ketik alasan izin..."
                          className="w-full px-2.5 py-1 text-xs font-medium rounded bg-slate-50/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/80 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-200 outline-none transition-all shadow-2xs"
                          title="Edit alasan izin langsung di tabel (Excel-style)"
                        />
                      </td>

                      {/* Pengawas Mengetahui - Inline Editable */}
                      <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                          <input
                            type="text"
                            defaultValue={item.pengawasMengetahui || ''}
                            key={`${item.id}-pm-${item.pengawasMengetahui}`}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (item.pengawasMengetahui || '')) {
                                handleInlineUpdate(item.id, 'pengawasMengetahui', val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="Pengawas..."
                            className="w-full max-w-[130px] px-2 py-1 text-xs font-semibold rounded bg-slate-50/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/80 dark:border-slate-700 focus:border-teal-500 text-slate-800 dark:text-slate-200 outline-none transition-all shadow-2xs"
                            title="Edit pengawas mengetahui langsung di tabel (Excel-style)"
                          />
                        </div>
                        {isSheetSource && (
                          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                            Google Sheet Verified
                          </span>
                        )}
                      </td>

                      {/* Bukti Lampiran */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.lampiran ? (
                          <a
                            href={item.lampiran}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold transition-colors"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Lihat Bukti</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Keterangan - Manual Dropdown Selector */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={item.acc || 'Pending'}
                          onChange={(e) => handleInlineUpdate(item.id, 'acc', e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border cursor-pointer outline-none transition-all shadow-2xs ${
                            item.acc === 'Izin Selesai'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                              : item.acc === 'Disetujui' || item.acc?.toLowerCase().includes('setuju')
                              ? 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700'
                              : item.acc === 'Ditolak'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
                              : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                          }`}
                          title="Ubah Keterangan izin secara manual"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Disetujui">Disetujui</option>
                          <option value="Izin Selesai">Izin Selesai</option>
                          <option value="Ditolak">Ditolak</option>
                        </select>
                      </td>

                      {/* Kolom Warning: Muncul jika belum 'Izin Selesai' dalam 2 hari dari tanggal izin */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {isOverdue2Days && item.acc !== 'Izin Selesai' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs whitespace-nowrap animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Izin telah lewat 2 Hari</span>
                          </span>
                        ) : item.acc === 'Izin Selesai' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selesai</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Aksi - Tanpa tombol Edit (Langsung edit di sel tabel) */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedLeave(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="Lihat Detail Izin"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick ACC if pending */}
                          {(!item.acc || item.acc === 'Pending') && (
                            <button
                              type="button"
                              onClick={() => handleAccStatus(item.id, 'Disetujui')}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-600 transition-colors cursor-pointer"
                              title="Setujui Izin"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ==================================================== */}
        {/* PAGINATION BAR                                      */}
        {/* ==================================================== */}
        <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{paginatedLeaves.length}</span> dari <span className="font-bold text-slate-800 dark:text-slate-200">{leaves.length}</span> total rekapan izin
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300">
              Halaman {currentPage} dari {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )}

﻿      {/* ==================================================== */}
      {/* MODAL PUSAT UNDUHAN DAFTAR IZIN (DAFTAR UNDUH)       */}
      {/* ==================================================== */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2298A7]/10 text-[#2298A7] flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Pusat Unduhan & Daftar Berkas Izin Karyawan
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Unduh langsung berkas rekapan siap pakai atau kustomisasi lingkup dokumen (Excel, PDF Resmi, CSV)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 text-xs overflow-y-auto">
              {/* SECTION 1: DAFTAR BERKAS REKAPAN SIAP UNDUH */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2298A7]"></span>
                    Daftar Berkas Rekapan Siap Unduh (1-Klik Unduh Cepat)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Klik format yang diinginkan</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-800/20">
                  {/* Item 1: Hari Ini */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Harian
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          Rekapan Izin Hari Ini (Tanggal Berjalan)
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Menampilkan seluruh personil yang sedang izin / tidak masuk pada hari ini.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportExcel('today')}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh Excel Hari Ini"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => handleExportPdf('today')}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh PDF Resmi Hari Ini"
                      >
                        <Printer className="w-3.5 h-3.5 text-rose-600" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportCsv('today')}
                        className="px-2.5 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh CSV Hari Ini"
                      >
                        <FileDown className="w-3.5 h-3.5 text-sky-600" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 2: 7 Hari Terakhir */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                          Mingguan
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          Rekapan Izin 7 Hari Terakhir (Senin - Minggu)
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Statistik pergerakan ketidakhadiran izin personil dalam satu minggu kerja.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportExcel('last_7_days')}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh Excel 7 Hari Terakhir"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => handleExportPdf('last_7_days')}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh PDF Resmi 7 Hari Terakhir"
                      >
                        <Printer className="w-3.5 h-3.5 text-rose-600" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportCsv('last_7_days')}
                        className="px-2.5 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh CSV 7 Hari Terakhir"
                      >
                        <FileDown className="w-3.5 h-3.5 text-sky-600" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 3: Bulan Ini */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          Bulanan
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          Rekapan Izin Bulan Berjalan
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Laporan lengkap absensi izin dari awal bulan ini hingga saat ini.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportExcel('this_month')}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh Excel Bulan Ini"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => handleExportPdf('this_month')}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh PDF Resmi Bulan Ini"
                      >
                        <Printer className="w-3.5 h-3.5 text-rose-600" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportCsv('this_month')}
                        className="px-2.5 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh CSV Bulan Ini"
                      >
                        <FileDown className="w-3.5 h-3.5 text-sky-600" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 4: Hasil Filter & Pencarian Saat Ini */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2298A7]/15 text-[#2298A7]">
                          Filter Aktif
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          Hasil Filter & Pencarian Tabel Saat Ini
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Menampilkan {leaves.length} baris data sesuai kriteria section, shift, atau pencarian Anda.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportExcel('filtered')}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh Excel Hasil Filter"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => handleExportPdf('filtered')}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh PDF Resmi Hasil Filter"
                      >
                        <Printer className="w-3.5 h-3.5 text-rose-600" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportCsv('filtered')}
                        className="px-2.5 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh CSV Hasil Filter"
                      >
                        <FileDown className="w-3.5 h-3.5 text-sky-600" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 5: Master Database Lengkap */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Master
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          Master Database Seluruh Catatan Izin (PrepLab Cloud)
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Seluruh {summary?.total || 1230}+ catatan rekapan izin dari Google Sheet & Portal Web tanpa filter.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportExcel('all')}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh Excel Master Database"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => handleExportPdf('all')}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh PDF Resmi Master Database"
                      >
                        <Printer className="w-3.5 h-3.5 text-rose-600" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleExportCsv('all')}
                        className="px-2.5 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh CSV Master Database"
                      >
                        <FileDown className="w-3.5 h-3.5 text-sky-600" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: KUSTOMISASI FORMAT DOKUMEN */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Atau Kustomisasi Lingkup dan Unduh Sekaligus:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all ${
                    downloadScope === 'filtered' 
                      ? 'border-[#2298A7] bg-[#E8F6F8] dark:bg-teal-950/40 font-bold text-[#2298A7]' 
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="scope" 
                      checked={downloadScope === 'filtered'} 
                      onChange={() => setDownloadScope('filtered')} 
                      className="sr-only"
                    />
                    <div className="text-[11px] font-bold">Filter Aktif</div>
                    <div className="text-[10px] text-slate-400 font-mono">{leaves.length} Baris</div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all ${
                    downloadScope === 'today' 
                      ? 'border-[#2298A7] bg-[#E8F6F8] dark:bg-teal-950/40 font-bold text-[#2298A7]' 
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="scope" 
                      checked={downloadScope === 'today'} 
                      onChange={() => setDownloadScope('today')} 
                      className="sr-only"
                    />
                    <div className="text-[11px] font-bold">Hari Ini</div>
                    <div className="text-[10px] text-slate-400">Harian</div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all ${
                    downloadScope === 'last_7_days' 
                      ? 'border-[#2298A7] bg-[#E8F6F8] dark:bg-teal-950/40 font-bold text-[#2298A7]' 
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="scope" 
                      checked={downloadScope === 'last_7_days'} 
                      onChange={() => setDownloadScope('last_7_days')} 
                      className="sr-only"
                    />
                    <div className="text-[11px] font-bold">7 Hari Terakhir</div>
                    <div className="text-[10px] text-slate-400">Mingguan</div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all ${
                    downloadScope === 'this_month' 
                      ? 'border-[#2298A7] bg-[#E8F6F8] dark:bg-teal-950/40 font-bold text-[#2298A7]' 
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="scope" 
                      checked={downloadScope === 'this_month'} 
                      onChange={() => setDownloadScope('this_month')} 
                      className="sr-only"
                    />
                    <div className="text-[11px] font-bold">Bulan Ini</div>
                    <div className="text-[10px] text-slate-400">Bulanan</div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all col-span-2 sm:col-span-2 ${
                    downloadScope === 'all' 
                      ? 'border-[#2298A7] bg-[#E8F6F8] dark:bg-teal-950/40 font-bold text-[#2298A7]' 
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="scope" 
                      checked={downloadScope === 'all'} 
                      onChange={() => setDownloadScope('all')} 
                      className="sr-only"
                    />
                    <div className="text-[11px] font-bold">Master Database (Seluruh Catatan)</div>
                    <div className="text-[10px] text-slate-400 font-mono">{summary?.total || leaves.length} Baris</div>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleExportExcel(downloadScope)}
                    className="p-3 rounded-2xl border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer font-bold disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>Unduh Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingPdf}
                    onClick={() => handleExportPdf(downloadScope)}
                    className="p-3 rounded-2xl border border-rose-300 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer font-bold disabled:opacity-50"
                  >
                    <Printer className="w-5 h-5 text-rose-600" />
                    <span>{isGeneratingPdf ? 'Menyusun...' : 'Unduh PDF Resmi'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleExportCsv(downloadScope)}
                    className="p-3 rounded-2xl border border-sky-300 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer font-bold disabled:opacity-50"
                  >
                    <FileDown className="w-5 h-5 text-sky-600" />
                    <span>Unduh CSV (.csv)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                Tip: Format Excel menyertakan 2 sheet lengkap dengan ringkasan statistik.
              </span>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* DETAIL MODAL                                        */}
      {/* ==================================================== */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Detail Pelaporan Izin Karyawan
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sumber: {selectedLeave.source === 'google_sheet' ? 'Google Sheet PrepLab Cloud' : 'Form Web Portal'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Profile Card */}
              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{selectedLeave.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{selectedLeave.nik} &bull; {selectedLeave.jabatan}</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#673ab7] dark:text-purple-300 font-bold text-xs">
                  {selectedLeave.lamanyaIzin || `${selectedLeave.jumlah || 1} Hari`}
                </span>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3 text-slate-600 dark:text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Penempatan / Bagian</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLeave.penempatan || selectedLeave.section}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Shift & Jam Kerja</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLeave.shift} ({selectedLeave.jamShift || 'Reguler'})</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Tanggal Izin</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formatLeaveDateIndo(selectedLeave.awalAbsensi)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Jumlah Izin</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{selectedLeave.lamanyaIzin || `${selectedLeave.jumlah || 1} Hari`}</span>
                </div>
              </div>

              {/* Alasan */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Alasan Izin Absensi:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-100 leading-relaxed text-xs">
                  {selectedLeave.alasanAbsensi}
                </p>
              </div>

              {/* Pengawas Mengetahui */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Pengawas Mengetahui (Gol II-V):</span>
                  <span className="font-black text-slate-900 dark:text-white text-xs">{selectedLeave.pengawasMengetahui || '-'}</span>
                </div>
                <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>

              {/* Lampiran Bukti */}
              {selectedLeave.lampiran && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block mb-2">Lampiran Bukti Izin:</span>
                  {selectedLeave.lampiran.startsWith('data:image') ? (
                    <img src={selectedLeave.lampiran} alt="Bukti Izin" className="w-full max-h-64 object-contain rounded-xl border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <a
                      href={selectedLeave.lampiran}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka File Dokumen Lampiran</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isSectionAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = selectedLeave;
                      setSelectedLeave(null);
                      openEditModal(cur);
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Edit data perizinan ini (Khusus Section Administrasi)"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Data Izin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAccStatus(selectedLeave.id, 'Disetujui')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Setujui</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAccStatus(selectedLeave.id, 'Ditolak')}
                  className="px-3 py-2 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 font-bold text-xs transition-colors"
                >
                  Tolak
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ==================================================== */}
      {/* MODAL EDIT DATA IZIN (KHUSUS SECTION ADMINISTRASI)   */}
      {/* ==================================================== */}
      {editingLeave && isSectionAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal Edit */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Edit Data Izin Karyawan
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Section Administrasi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Perubahan data perorangan akan tersimpan permanen di database portal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLeave(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body (Scrollable) */}
            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* NIK & Nama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    NIK ID Card
                  </label>
                  <input
                    type="text"
                    value={editForm.nik}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nik: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Karyawan
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Jabatan & Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={editForm.jabatan}
                    onChange={(e) => setEditForm(prev => ({ ...prev, jabatan: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bagian / Section
                  </label>
                  <select
                    value={editForm.section}
                    onChange={(e) => setEditForm(prev => ({ ...prev, section: e.target.value, penempatan: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="Preparation">Preparation</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Administration">Administration</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inventory Control">Inventory Control</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                  </select>
                </div>
              </div>

              {/* Tempat Tinggal */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tempat Tinggal
                </label>
                <select
                  value={editForm.tempatTinggal || 'Nirwana (Mess)'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tempatTinggal: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-semibold"
                >
                  <option value="Nirwana (Mess)">Nirwana (Mess)</option>
                  <option value="Kampung Kawasi (Ecovillage)">Kampung Kawasi (Ecovillage)</option>
                  <option value="Kampung Kawasi (Lama)">Kampung Kawasi (Lama)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Shift & Jam Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shift Karyawan
                  </label>
                  <select
                    value={editForm.shift}
                    onChange={(e) => setEditForm(prev => ({ ...prev, shift: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="Nonshift">Nonshift</option>
                    <option value="Shift A">Shift A</option>
                    <option value="Shift B">Shift B</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam / Shift Masuk Bekerja
                  </label>
                  <input
                    type="text"
                    value={editForm.jamShift}
                    onChange={(e) => setEditForm(prev => ({ ...prev, jamShift: e.target.value }))}
                    placeholder="Contoh: 07:00 - 15:30 atau Non Shift"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Tanggal Awal, Tanggal Akhir & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mulai Izin (Tanggal)
                  </label>
                  <input
                    type="date"
                    value={editForm.awalAbsensi}
                    onChange={(e) => {
                      const newAwal = e.target.value;
                      let newAkhir = editForm.akhirAbsensi || newAwal;
                      if (newAkhir < newAwal) newAkhir = newAwal;
                      let jml = 1;
                      try {
                        const d1 = new Date(newAwal).getTime();
                        const d2 = new Date(newAkhir).getTime();
                        jml = Math.max(1, Math.round((d2 - d1) / (1000 * 3600 * 24)) + 1);
                      } catch {}
                      setEditForm(prev => ({
                        ...prev,
                        awalAbsensi: newAwal,
                        akhirAbsensi: newAkhir,
                        jumlah: jml,
                        lamanyaIzin: `${jml} Hari`
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={editForm.akhirAbsensi}
                    onChange={(e) => {
                      const newAkhir = e.target.value;
                      const awal = editForm.awalAbsensi || newAkhir;
                      let jml = 1;
                      try {
                        const d1 = new Date(awal).getTime();
                        const d2 = new Date(newAkhir).getTime();
                        jml = Math.max(1, Math.round((d2 - d1) / (1000 * 3600 * 24)) + 1);
                      } catch {}
                      setEditForm(prev => ({
                        ...prev,
                        akhirAbsensi: newAkhir,
                        jumlah: jml,
                        lamanyaIzin: `${jml} Hari`
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Durasi (Hari)
                  </label>
                  <input
                    type="text"
                    value={editForm.lamanyaIzin}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lamanyaIzin: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Contoh: 1 Hari"
                  />
                </div>
              </div>

              {/* Alasan Izin */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Izin / Keterangan Absensi
                </label>
                <textarea
                  rows={2}
                  value={editForm.alasanAbsensi}
                  onChange={(e) => setEditForm(prev => ({ ...prev, alasanAbsensi: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Keterangan sakit, izin urusan keluarga, dll."
                  required
                />
              </div>

              {/* Pengawas Mengetahui & Status ACC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pengawas yang Mengetahui
                  </label>
                  <input
                    type="text"
                    value={editForm.pengawasMengetahui}
                    onChange={(e) => setEditForm(prev => ({ ...prev, pengawasMengetahui: e.target.value }))}
                    placeholder="Nama Pengawas Gol II - V"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Verifikasi / ACC
                  </label>
                  <select
                    value={editForm.acc}
                    onChange={(e) => setEditForm(prev => ({ ...prev, acc: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                  >
                    <option value="Disetujui">Disetujui</option>
                    <option value="Pending">Pending</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>

              {/* Catatan Khusus Administrasi */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Administrasi
                </label>
                <input
                  type="text"
                  value={editForm.catatan}
                  onChange={(e) => setEditForm(prev => ({ ...prev, catatan: e.target.value }))}
                  placeholder="Catatan internal section administrasi (opsional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Footer Actions Modal Edit */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLeave(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
