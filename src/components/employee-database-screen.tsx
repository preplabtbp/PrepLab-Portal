import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Search, User, MapPin, Briefcase, Calendar, Phone, Activity, 
  FileText, BarChart3, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, Fingerprint, 
  Users, X, Database, RefreshCw, FileSpreadsheet, UploadCloud, Camera, Pencil, 
  Plus, Edit3, ShieldAlert, Scale, Gavel, Clock, AlertOctagon, Info, ShieldCheck,
  HeartHandshake, CalendarRange, Trophy, Award, Trash2, StickyNote, Check
} from 'lucide-react';
import { Card, Input, Button } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { EmployeeImportModal } from './EmployeeImportModal';
import { EmployeeEditModal } from './EmployeeEditModal';
import { AddAttendanceEntryModal } from './AddAttendanceEntryModal';
import { TimeRangeFetchModal } from './TimeRangeFetchModal';
import { toast } from 'sonner';
import { formatAvatarUrl } from '../lib/avatarUtils';
import { getEmployeeTenureInfo } from '../lib/tenureUtils';
import { compareEmployeesByJabatan } from '../lib/jabatanHierarchy';

export function isResignedOrNonActiveStatus(empOrStatus: any): boolean {
  if (!empOrStatus) return false;
  const status = typeof empOrStatus === 'string'
    ? empOrStatus
    : (empOrStatus.statusKaryawan || empOrStatus.status_karyawan || empOrStatus.status || empOrStatus['Status Karyawan'] || empOrStatus['Status'] || '');
  const s = String(status).trim().toUpperCase();
  if (
    s.includes('RESIGN') ||
    s.includes('PHK') ||
    s.includes('MUTASI') ||
    s.includes('SPPHK') ||
    s.includes('KELUAR') ||
    s.includes('INACTIVE') ||
    s.includes('NONAKTIF') ||
    s.includes('NON AKTIF')
  ) {
    return true;
  }
  const sec = typeof empOrStatus === 'object' ? String(empOrStatus.section || empOrStatus.bagian || '').trim().toUpperCase() : '';
  if (sec.includes('#N/A')) return true;
  return false;
}

const INDO_MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDO_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, ags: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, september: 9, sept: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

export function formatTtlDate(dateStr?: string | null): string {
  if (!dateStr || dateStr === '-' || dateStr === '#N/A' || dateStr === '0') return '-';
  const clean = String(dateStr).trim();
  if (!clean) return '-';

  const pad2 = (n: number) => String(n).padStart(2, '0');

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${pad2(d)} ${INDO_MONTHS_FULL[m - 1]} ${y}`;
    }
  }

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${pad2(d)} ${INDO_MONTHS_FULL[m - 1]} ${y}`;
    }
  }

  // Format: DD-Month-YY or DD-Month-YYYY (e.g. "21-Aug-80", "21-Agu-1980", "21 Aug 1980")
  const textMonthMatch = clean.match(/^(\d{1,2})[\s\-_/]+([a-zA-Z]+)[\s\-_/]+(\d{2,4})$/);
  if (textMonthMatch) {
    const d = parseInt(textMonthMatch[1], 10);
    const monthKey = textMonthMatch[2].toLowerCase();
    let y = parseInt(textMonthMatch[3], 10);
    if (y < 100) {
      y = y <= 30 ? 2000 + y : 1900 + y;
    }
    const m = MONTH_MAP[monthKey];
    if (m && d >= 1 && d <= 31) {
      return `${pad2(d)} ${INDO_MONTHS_FULL[m - 1]} ${y}`;
    }
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = parsed.getDate();
    const m = parsed.getMonth();
    const y = parsed.getFullYear();
    return `${pad2(d)} ${INDO_MONTHS_FULL[m]} ${y}`;
  }

  return clean;
}

export function formatShortDate(val?: any): string {
  if (val === null || val === undefined) return '-';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '-';
    const d = String(val.getDate()).padStart(2, '0');
    const m = INDO_MONTHS_SHORT[val.getMonth()] || 'Jan';
    const y = val.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const clean = String(val).trim();
  if (!clean || clean === '-' || clean === '#N/A' || clean === '0' || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') {
    return '-';
  }

  const pad2 = (n: number) => String(n).padStart(2, '0');

  // Excel serial number (e.g. 44562 ~ 2022)
  if (/^\d{5}$/.test(clean)) {
    const num = Number(clean);
    if (num >= 25569 && num <= 60000) {
      const dObj = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(dObj.getTime())) {
        return `${pad2(dObj.getDate())}-${INDO_MONTHS_SHORT[dObj.getMonth()]}-${dObj.getFullYear()}`;
      }
    }
  }

  // Format: YYYY-MM-DD or YYYY/MM/DD (optionally followed by time or T...)
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

  // Format: DD-MM-YY or DD/MM/YY
  const dmyShortMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (dmyShortMatch) {
    const d = parseInt(dmyShortMatch[1], 10);
    const m = parseInt(dmyShortMatch[2], 10);
    let y = parseInt(dmyShortMatch[3], 10);
    y = y <= 35 ? 2000 + y : 1900 + y;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${pad2(d)}-${INDO_MONTHS_SHORT[m - 1]}-${y}`;
    }
  }

  // Format: DD-Month-YY or DD-Month-YYYY or DD Month YYYY (e.g. "21-Aug-80", "21-Agu-1980", "21 Aug 1980", "01-Jan-2024")
  const textMonthMatch = clean.match(/^(\d{1,2})[\s\-_/]+([a-zA-Z]+)[\s\-_/]+(\d{2,4})/);
  if (textMonthMatch) {
    const d = parseInt(textMonthMatch[1], 10);
    const monthKey = textMonthMatch[2].toLowerCase();
    let y = parseInt(textMonthMatch[3], 10);
    if (y < 100) {
      y = y <= 35 ? 2000 + y : 1900 + y;
    }
    const m = MONTH_MAP[monthKey];
    if (m && d >= 1 && d <= 31) {
      return `${pad2(d)}-${INDO_MONTHS_SHORT[m - 1]}-${y}`;
    }
  }

  // Fallback: Native Date Parse
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
    const d = parsed.getDate();
    const m = parsed.getMonth();
    const y = parsed.getFullYear();
    return `${pad2(d)}-${INDO_MONTHS_SHORT[m]}-${y}`;
  }

  return clean;
}

export function normalizeDepartmentOrSection(raw?: string): string {
  const s = (raw || '').toLowerCase().trim();
  if (!s) return 'Preparation';
  if (s.includes('qa') || s.includes('quality')) return 'Quality Assurance';
  if (s.includes('maint') || s.includes('pemeliharaan') || s.includes('bengkel') || s.includes('teknisi')) return 'Maintenance';
  if (s.includes('inv') || s.includes('inventory') || s.includes('gudang') || s.includes('logistic')) return 'Inventory Control';
  if (s.includes('admin') || s.includes('adm') || s.includes('finance') || s.includes('hr')) return 'Administration';
  if (s.includes('lab') || s.includes('laboratorium') || s.includes('kimia') || s.includes('xrf')) return 'Laboratory';
  if (s.includes('prep') || s.includes('preparasi') || s.includes('sample') || s.includes('crush') || s.includes('crew')) return 'Preparation';
  return 'Preparation';
}

export function EmployeeDatabaseScreen({ inspectorNik, onBack }: { inspectorNik: string, onBack?: () => void }) {
  const cacheKey = `preplab_emp_db_${inspectorNik || 'all'}`;

  // Instant hydration dari cache lokal agar langsung tampil seketika (0ms wait)
  const [employees, setEmployees] = useState<any[]>(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey) || localStorage.getItem('preplab_emp_db_all');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey) || localStorage.getItem('preplab_emp_db_all');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });

  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'job' | 'personal' | 'attendance' | 'reasons' | 'counseling'>('job');
  const [editModalMode, setEditModalMode] = useState<'edit' | 'add'>('edit');
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<any | null>(null);
  const [tenureDropdownPeriod, setTenureDropdownPeriod] = useState<'sekarang' | 'sebelumnya'>('sekarang');
  const [isAddAttendanceModalOpen, setIsAddAttendanceModalOpen] = useState(false);
  const [selectedAddCategory, setSelectedAddCategory] = useState<string>('tanggalIzin');
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [developerList, setDeveloperList] = useState<any[]>([]);

  // States & handlers untuk Catatan Karyawan & Achievements Dashboard
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAddAchievementModalOpen, setIsAddAchievementModalOpen] = useState(false);
  const [newAchievementTitle, setNewAchievementTitle] = useState('');
  const [newAchievementCategory, setNewAchievementCategory] = useState('Kinerja & Prestasi');
  const [newAchievementDate, setNewAchievementDate] = useState('');
  const [newAchievementDesc, setNewAchievementDesc] = useState('');
  const [newAchievementNotes, setNewAchievementNotes] = useState('');
  const [isSavingAchievement, setIsSavingAchievement] = useState(false);

  useEffect(() => {
    if (selectedEmployee) {
      setNoteContent(selectedEmployee.catatan || '');
      setIsEditingNotes(false);
    }
  }, [selectedEmployee?.nik]);

  const achievementList = useMemo(() => {
    if (!selectedEmployee?.achievements) return [];
    const raw = Array.isArray(selectedEmployee.achievements) ? selectedEmployee.achievements : [];
    return raw.map((item: any, idx: number) => ({
      id: item.id || `ach_${idx}`,
      title: item.title || item['Judul Achievement'] || item['judul'] || item['achievement'] || '-',
      category: item.category || item['Kategori'] || item['kategori'] || 'Prestasi',
      date: item.date || item['Tanggal Dicapai'] || item['tanggal'] || '',
      description: item.description || item['Keterangan'] || item['keterangan'] || '',
      notes: item.notes || item['Catatan'] || item['catatan'] || ''
    }));
  }, [selectedEmployee?.achievements]);

  const handleSaveNotes = async () => {
    if (!selectedEmployee?.nik) return;
    if (!canEditCatatan) {
      toast.error('Hanya Developer, Section Manager, Superintendent, dan Admin yang dapat mengedit catatan.');
      return;
    }
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.nik}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify({
          catatan: noteContent,
          editorNik: inspectorNik
        })
      });
      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal menyimpan catatan');
      }
      setSelectedEmployee((prev: any) => prev ? ({ ...prev, catatan: noteContent }) : null);
      setEmployees((prev: any[]) => prev.map(e => e.nik === selectedEmployee.nik ? { ...e, catatan: noteContent } : e));
      setIsEditingNotes(false);
      toast.success('Catatan karyawan berhasil disimpan');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan catatan');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee?.nik) return;
    if (!newAchievementTitle.trim()) {
      toast.error('Judul achievement wajib diisi');
      return;
    }
    setIsSavingAchievement(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.nik}/achievements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify({
          title: newAchievementTitle.trim(),
          category: newAchievementCategory,
          date: newAchievementDate.trim(),
          description: newAchievementDesc.trim(),
          notes: newAchievementNotes.trim(),
          editorNik: inspectorNik
        })
      });
      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal menambahkan achievement');
      }
      const added = data.achievement;
      const updatedList = [added, ...(Array.isArray(selectedEmployee.achievements) ? selectedEmployee.achievements : [])];
      setSelectedEmployee((prev: any) => prev ? ({ ...prev, achievements: updatedList }) : null);
      setEmployees((prev: any[]) => prev.map(e => e.nik === selectedEmployee.nik ? { ...e, achievements: updatedList } : e));
      setIsAddAchievementModalOpen(false);
      setNewAchievementTitle('');
      setNewAchievementDate('');
      setNewAchievementDesc('');
      setNewAchievementNotes('');
      toast.success('Achievement berhasil ditambahkan');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan achievement');
    } finally {
      setIsSavingAchievement(false);
    }
  };

  const handleDeleteAchievement = async (achId: any) => {
    if (!selectedEmployee?.nik) return;
    if (!confirm('Apakah Anda yakin ingin menghapus achievement ini?')) return;
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.nik}/achievements/${achId}`, {
        method: 'DELETE',
        headers: {
          'x-user-nik': inspectorNik
        }
      });
      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal menghapus achievement');
      }
      const updatedList = (Array.isArray(selectedEmployee.achievements) ? selectedEmployee.achievements : [])
        .filter((a: any) => String(a.id) !== String(achId) && a.title !== achId);
      setSelectedEmployee((prev: any) => prev ? ({ ...prev, achievements: updatedList }) : null);
      setEmployees((prev: any[]) => prev.map(e => e.nik === selectedEmployee.nik ? { ...e, achievements: updatedList } : e));
      toast.success('Achievement berhasil dihapus');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus achievement');
    }
  };

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(json => {
        const list = Array.isArray(json) ? json : (json?.data || []);
        setDeveloperList(list);
      })
      .catch(() => {});
  }, []);

  // Deteksi lingkungan Local Host (akses lokal komputer pengembang)
  const isLocalHostEnv = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const h = (window.location.hostname || '').toLowerCase();
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '::1' ||
      h.startsWith('192.168.') ||
      h.startsWith('10.') ||
      h.startsWith('172.') ||
      window.location.port === '3000' ||
      window.location.port === '5173'
    );
  }, []);

  // Pengecekan Section Administration atau Developer
  const isSectionAdmin = useMemo(() => {
    const cleanNik = (inspectorNik || '').trim().toUpperCase();
    const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
    if (HARDCODED_DEVS.includes(cleanNik)) return true;
    if (developerList.some(d => (d.nik || '').toUpperCase() === cleanNik)) return true;

    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        const sec = (p.section || '').toLowerCase();
        const dept = (p.department || '').toLowerCase();
        const jab = (p.jabatan || '').toLowerCase();
        const role = (p.role || '').toLowerCase();
        if (
          sec.includes('administrasi') || sec.includes('administration') || sec.includes('admin') ||
          dept.includes('administrasi') || dept.includes('administration') || dept.includes('admin') ||
          jab.includes('admin') || role.includes('admin') || role.includes('developer')
        ) {
          return true;
        }
      }
    } catch {}

    const me = employees.find(e => (e.nik || '').toUpperCase() === cleanNik);
    if (me) {
      const sec = (me.section || '').toLowerCase();
      const dept = (me.department || '').toLowerCase();
      const jab = (me.jabatan || '').toLowerCase();
      if (
        sec.includes('administrasi') || sec.includes('administration') || sec.includes('admin') ||
        dept.includes('administrasi') || dept.includes('administration') || dept.includes('admin') ||
        jab.includes('admin')
      ) {
        return true;
      }
    }

    return false;
  }, [inspectorNik, developerList, employees]);

  const isMeetingRoom = useMemo(() => {
    const nik = (inspectorNik || '').toUpperCase().trim();
    return nik === 'MEETINGROOM' || nik === 'MEETING' || nik.includes('MEETING');
  }, [inspectorNik]);

  // Hak akses Edit & Tambah Data Karyawan:
  // HANYA jika user adalah Section Admin
  const canManageDatabase = useMemo(() => {
    return isSectionAdmin;
  }, [isSectionAdmin]);

  // Hak akses Edit Catatan Karyawan di Dashboard:
  // HANYA Developer, Section Manager, Superintendent, dan Admin
  const canEditCatatan = useMemo(() => {
    const cleanNik = (inspectorNik || '').trim().toUpperCase();
    const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];

    // 1. Cek Developer Whitelist & Developer Table
    if (HARDCODED_DEVS.includes(cleanNik)) return true;
    if (developerList.some(d => (d.nik || '').toUpperCase() === cleanNik)) return true;

    // 2. Cek Profile LocalStorage
    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        const jab = (p.jabatan || '').toLowerCase();
        const role = (p.role || '').toLowerCase();
        const sec = (p.section || '').toLowerCase();
        const dept = (p.department || '').toLowerCase();

        // Developer
        if (role.includes('developer') || jab.includes('developer')) return true;

        // Section Manager & Superintendent
        if (
          jab.includes('section manager') ||
          jab.includes('manager') ||
          jab.includes('superintendent') ||
          jab.includes('spt') ||
          jab.includes('head')
        ) return true;

        // Admin
        if (
          sec.includes('administrasi') || sec.includes('administration') || sec.includes('admin') ||
          dept.includes('administrasi') || dept.includes('administration') || dept.includes('admin') ||
          jab.includes('admin') || role.includes('admin')
        ) return true;
      }
    } catch {}

    // 3. Cek Data Karyawan
    const me = employees.find(e => (e.nik || '').toUpperCase() === cleanNik);
    if (me) {
      const jab = (me.jabatan || '').toLowerCase();
      const sec = (me.section || '').toLowerCase();
      const dept = (me.department || '').toLowerCase();

      // Developer
      if (jab.includes('developer')) return true;

      // Section Manager & Superintendent
      if (
        jab.includes('section manager') ||
        jab.includes('manager') ||
        jab.includes('superintendent') ||
        jab.includes('spt') ||
        jab.includes('head')
      ) return true;

      // Admin
      if (
        sec.includes('administrasi') || sec.includes('administration') || sec.includes('admin') ||
        dept.includes('administrasi') || dept.includes('administration') || dept.includes('admin') ||
        jab.includes('admin')
      ) return true;
    }

    // 4. Fallback jika user adalah Section Admin
    if (isSectionAdmin) return true;

    return false;
  }, [inspectorNik, developerList, employees, isSectionAdmin]);

  // Penentuan Badge Tanda Peran User di Awal Masuk Modul
  const userRoleBadge = useMemo(() => {
    const cleanNik = (inspectorNik || '').trim().toUpperCase();
    const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];

    // 1. Cek jika Developer Whitelist
    if (HARDCODED_DEVS.includes(cleanNik) || developerList.some(d => (d.nik || '').toUpperCase() === cleanNik)) {
      return { label: 'Developer', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' };
    }

    let isDev = false;
    let isAdmin = false;
    let isMgr = false;

    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        const sec = (p.section || '').toLowerCase();
        const dept = (p.department || '').toLowerCase();
        const jab = (p.jabatan || '').toLowerCase();
        const role = (p.role || '').toLowerCase();

        if (role.includes('developer') || jab.includes('developer')) isDev = true;
        if (
          sec.includes('administrasi') || sec.includes('administration') || sec.includes('admin') ||
          dept.includes('administrasi') || dept.includes('administration') || dept.includes('admin') ||
          jab.includes('admin') || role.includes('admin')
        ) isAdmin = true;
        if (
          jab.includes('section manager') || jab.includes('manager') || jab.includes('superintendent') || jab.includes('head') || jab.includes('spt')
        ) isMgr = true;
      }
    } catch {}

    const me = employees.find(e => (e.nik || '').toUpperCase() === cleanNik);
    if (me) {
      const sec = (me.section || '').toLowerCase();
      const dept = (me.department || '').toLowerCase();
      const jab = (me.jabatan || '').toLowerCase();

      if (jab.includes('developer')) isDev = true;
      if (
        sec.includes('administrasi') || sec.includes('administration') || sec.includes('admin') ||
        dept.includes('administrasi') || dept.includes('administration') || dept.includes('admin') ||
        jab.includes('admin')
      ) isAdmin = true;
      if (
        jab.includes('section manager') || jab.includes('manager') || jab.includes('superintendent') || jab.includes('head') || jab.includes('spt')
      ) isMgr = true;
    }

    if (isDev) {
      return { label: 'Developer', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' };
    }
    if (isAdmin) {
      return { label: 'Admin', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    }
    if (isMgr) {
      return { label: 'Manager', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' };
    }

    return { label: 'User', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  }, [inspectorNik, developerList, employees]);

  const fetchEmployees = async (silent = false) => {
    if (!silent && employees.length === 0) {
      setLoading(true);
    }
    try {
      let url = inspectorNik ? `/api/employees/hierarchy/${encodeURIComponent(inspectorNik)}` : `/api/employees`;
      let res = await fetch(url);
      if (!res.ok && isMeetingRoom) {
        res = await fetch('/api/employees');
      }
      if (!res.ok) throw new Error("Gagal mengambil data karyawan");
      const data = await res.json();
      const list = data.status === 'success' ? (data.data || []) : (Array.isArray(data) ? data : []);
      if (list.length > 0) {
        setEmployees(list);
        try {
          const cacheStr = JSON.stringify(list);
          sessionStorage.setItem(cacheKey, cacheStr);
          localStorage.setItem(cacheKey, cacheStr);
          localStorage.setItem('preplab_emp_db_all', cacheStr);
        } catch {}
      }
    } catch (err: any) {
      if (employees.length === 0) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Jalankan revalidasi data di background secara instan
    fetchEmployees(employees.length > 0);
  }, [inspectorNik, isMeetingRoom]);

  // Kalkulasi data masa kerja jabatan (Sekarang, Sebelumnya, Total)
  const tenureInfo = useMemo(() => {
    return getEmployeeTenureInfo(selectedEmployee);
  }, [selectedEmployee]);

  useEffect(() => {
    setTenureDropdownPeriod('sekarang');
  }, [selectedEmployee?.nik]);

  const [activeStatDetail, setActiveStatDetail] = useState<'permanent' | 'kontrak' | 'izin' | 'spdk' | 'active' | null>(null);
  const [statDetailSearch, setStatDetailSearch] = useState('');
  const [ptFilter, setPtFilter] = useState<'ALL' | 'TBP' | 'GTS'>('ALL');

  // Deteksi role Section Manager & PT Viewer
  const isSectionManager = useMemo(() => {
    if (canManageDatabase) return true;
    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        const jab = (p.jabatan || '').toLowerCase();
        if (jab.includes('section manager') || jab.includes('manager') || jab.includes('superintendent') || jab.includes('head') || jab.includes('spt')) return true;
      }
    } catch {}
    const cleanNik = (inspectorNik || '').toUpperCase();
    const me = employees.find(e => (e.nik || '').toUpperCase() === cleanNik);
    if (me) {
      const jab = (me.jabatan || '').toLowerCase();
      if (jab.includes('section manager') || jab.includes('manager') || jab.includes('superintendent') || jab.includes('head') || jab.includes('spt')) return true;
    }
    return false;
  }, [inspectorNik, employees, canManageDatabase]);

  const viewerPt = useMemo(() => {
    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if ((p.pt || '').toUpperCase() === 'GTS' || (p.nik || '').startsWith('03') || (p.nik || '').startsWith('M03')) return 'GTS';
      }
    } catch {}
    const cleanNik = (inspectorNik || '').toUpperCase();
    if (cleanNik.startsWith('03') || cleanNik.startsWith('M03')) return 'GTS';
    return 'TBP';
  }, [inspectorNik]);

  const isGtsEmp = (e: any) => {
    if (!e) return false;
    const ptStr = (e.pt || '').toString().trim().toUpperCase();
    const nikStr = (e.nik || '').toString().trim().toUpperCase();
    const secStr = (e.section || '').toString().trim().toUpperCase();
    return ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03') || secStr.includes('GTS');
  };

  // Aturan Akses:
  // - Akun GTS hanya bisa diakses oleh Karyawan GTS dan Section Manager TBP (atau Manager/Admin)
  // - Akun TBP hanya bisa diakses oleh Karyawan TBP dan Section Manager GTS (atau Manager/Admin)
  const scopedEmployees = useMemo(() => {
    let baseList = employees;
    if (isSectionManager) {
      if (ptFilter === 'GTS') baseList = employees.filter(e => isGtsEmp(e));
      else if (ptFilter === 'TBP') baseList = employees.filter(e => !isGtsEmp(e));
    } else if (viewerPt === 'GTS') {
      baseList = employees.filter(e => isGtsEmp(e));
    } else {
      baseList = employees.filter(e => !isGtsEmp(e));
    }

    // Sesuai permintaan Foto 2: Karyawan berstatus Resign / Mutasi GTS / PHK / SPPHK tidak dimasukkan ke dalam daftar
    return baseList.filter(e => !isResignedOrNonActiveStatus(e));
  }, [employees, isSectionManager, ptFilter, viewerPt]);

  // 1. Data & List Karyawan Aktif (Diurutkan sesuai Hirarki Jabatan Resmi)
  const activeEmployeesList = useMemo(() => {
    return scopedEmployees.filter(e => {
      if (isResignedOrNonActiveStatus(e)) return false;
      const st = String(e.statusKaryawan || e.status_karyawan || e.status || e['Status Karyawan'] || e['Status'] || '').toUpperCase().trim();
      return st === 'ACTIVE' || st === 'AKTIF' || st.startsWith('ACTIVE') || st.startsWith('AKTIF');
    }).sort(compareEmployeesByJabatan);
  }, [scopedEmployees]);
  const activeEmployeesCount = activeEmployeesList.length;

  // 2. Data & List Karyawan Permanent / PKWTT (Diurutkan sesuai Hirarki Jabatan Resmi)
  const permanentEmployeesList = useMemo(() => {
    return scopedEmployees.filter(e => {
      if (isResignedOrNonActiveStatus(e)) return false;
      const sk = (e.statusKontrak || '').toLowerCase().trim();
      const skaryawan = (e.statusKaryawan || '').toLowerCase().trim();
      const tp = (e.tanggalPermanent || '').trim();
      return sk.includes('pkwtt') || sk.includes('permanent') || sk.includes('tetap') ||
             skaryawan.includes('pkwtt') || skaryawan.includes('permanent') || skaryawan.includes('tetap') ||
             (tp && tp !== '-' && tp !== '0');
    }).sort(compareEmployeesByJabatan);
  }, [scopedEmployees]);
  const permanentEmployeesCount = permanentEmployeesList.length;

  // 3. Data & List Karyawan Kontrak / PKWT (Diurutkan sesuai Hirarki Jabatan Resmi)
  const contractEmployeesList = useMemo(() => {
    return scopedEmployees.filter(e => {
      if (isResignedOrNonActiveStatus(e)) return false;
      const sk = (e.statusKontrak || '').toLowerCase().trim();
      const skaryawan = (e.statusKaryawan || '').toLowerCase().trim();
      const tp = (e.tanggalPermanent || '').trim();
      const isPerm = sk.includes('pkwtt') || sk.includes('permanent') || sk.includes('tetap') ||
                     skaryawan.includes('pkwtt') || skaryawan.includes('permanent') || skaryawan.includes('tetap') ||
                     (Boolean(tp) && tp !== '-' && tp !== '0');
      if (isPerm) return false;
      return sk.includes('kontrak') || sk.includes('pkwt') || skaryawan.includes('kontrak') || skaryawan.includes('pkwt') || !isPerm;
    }).sort(compareEmployeesByJabatan);
  }, [scopedEmployees]);
  const contractEmployeesCount = contractEmployeesList.length;

  // 3. Data & List Jumlah Izin Karyawan pada Bulan Berjalan (Urut dari terbanyak sampai terkecil)
  const monthlyIzinData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    const isCurrentMonthDate = (dateStr: string) => {
      if (!dateStr) return false;
      const clean = String(dateStr).toLowerCase().trim();
      const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (isoMatch) {
        const m = parseInt(isoMatch[2], 10);
        const y = parseInt(isoMatch[1], 10);
        return m === currentMonth && (y === currentYear || y === currentYear % 100);
      }
      const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
      if (dmyMatch) {
        const m = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);
        return m === currentMonth && (y === currentYear || y === currentYear % 100 || isNaN(y));
      }
      if (clean.includes('okt') || clean.includes('oct')) return currentMonth === 10;
      if (clean.includes('jan')) return currentMonth === 1;
      if (clean.includes('feb')) return currentMonth === 2;
      if (clean.includes('mar')) return currentMonth === 3;
      if (clean.includes('apr')) return currentMonth === 4;
      if (clean.includes('mei') || clean.includes('may')) return currentMonth === 5;
      if (clean.includes('jun')) return currentMonth === 6;
      if (clean.includes('jul')) return currentMonth === 7;
      if (clean.includes('agu') || clean.includes('aug')) return currentMonth === 8;
      if (clean.includes('sep')) return currentMonth === 9;
      if (clean.includes('nov')) return currentMonth === 11;
      if (clean.includes('des') || clean.includes('dec')) return currentMonth === 12;
      return false;
    };

    const parseDates = (raw?: any) => {
      if (!raw) return [];
      return String(raw)
        .split(/[\r\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean);
    };

    const parseReasons = (raw?: any) => {
      if (!raw) return [];
      return String(raw)
        .split(/[\r\n;]+/)
        .map(s => s.trim())
        .filter(Boolean);
    };

    const list: Array<{
      employee: any;
      totalIzinBulanIni: number;
      dates: string[];
      reasons: string[];
    }> = [];

    let grandTotalIzin = 0;

    scopedEmployees.forEach(emp => {
      const att26 = emp.attendance2026 || emp.attendance?.['2026'] || emp.attendance?.[2026] || emp.attendanceData?.['2026'] || {};

      let matchingDates: string[] = [];
      let reasons: string[] = [];
      let count = 0;

      // 1. Details array jika tersedia
      if (Array.isArray(att26.details) && att26.details.length > 0) {
        const monthDetails = att26.details.filter((d: any) => {
          if (!d || !d.date) return false;
          const isIzin = (d.type || d.kategori || '').toLowerCase().includes('izin') || (d.category || '').toLowerCase().includes('izin');
          if (!isIzin) return false;
          const dObj = new Date(d.date);
          return !isNaN(dObj.getTime()) && (dObj.getMonth() + 1) === currentMonth && dObj.getFullYear() === currentYear;
        });
        if (monthDetails.length > 0) {
          count = monthDetails.length;
          matchingDates = monthDetails.map((d: any) => d.date);
          reasons = monthDetails.map((d: any) => d.keterangan || d.alasan || d.reason).filter(Boolean);
        }
      }

      // 2. Parse string tanggal dari tanggalIzin dan tanggalIzinKhusus
      if (count === 0) {
        const regularDates = parseDates(att26.tanggalIzin || att26.tanggal_izin);
        const khususDates = parseDates(att26.tanggalIzinKhusus || att26.tanggal_izin_khusus);
        const allDates = [...regularDates, ...khususDates];
        const filtered = allDates.filter(isCurrentMonthDate);
        if (filtered.length > 0) {
          count = filtered.length;
          matchingDates = filtered;
        }

        const regularReasons = parseReasons(att26.alasanIzin || att26.alasan_izin);
        const khususReasons = parseReasons(att26.alasanIzinKhusus || att26.alasan_izin_khusus);
        reasons = [...regularReasons, ...khususReasons];
      }

      // 3. Fallback breakdown jika data terstruktur bulanan tersedia
      if (count === 0) {
        const monthlyBreakdown = att26.monthlyIzin || att26.izinPerBulan;
        if (monthlyBreakdown && typeof monthlyBreakdown === 'object') {
          const c = Number(monthlyBreakdown[currentMonth] || monthlyBreakdown[String(currentMonth)] || 0);
          if (c > 0) count = c;
        }
      }

      if (count > 0) {
        grandTotalIzin += count;
        list.push({
          employee: emp,
          totalIzinBulanIni: count,
          dates: matchingDates,
          reasons: reasons
        });
      }
    });

    // Urutkan dari yang terbanyak sampai yang terkecil
    list.sort((a, b) => b.totalIzinBulanIni - a.totalIzinBulanIni);

    return {
      grandTotal: grandTotalIzin,
      list
    };
  }, [scopedEmployees]);

  // 4. Data & List SPDK & Sanksi yang Masih Aktif
  const activeSpdkData = useMemo(() => {
    const MONTH_MAP: Record<string, number> = {
      jan: 0, januari: 0, january: 0,
      feb: 1, februari: 1, february: 1,
      mar: 2, maret: 2, march: 2,
      apr: 3, april: 3,
      mei: 4, may: 4,
      jun: 5, juni: 5, june: 5,
      jul: 6, juli: 6, july: 6,
      agu: 7, ags: 7, agustus: 7, aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      okt: 9, oktober: 9, oct: 9, october: 9,
      nov: 10, november: 10,
      des: 11, desember: 11, dec: 11, december: 11
    };

    const parseSanctionDate = (val?: any): Date | null => {
      if (!val) return null;
      const str = String(val).trim().split(/[\r\n,;]+/)[0].trim();
      if (!str || str === '-' || str === '#N/A' || str === '0') return null;

      const dMmmY = str.match(/^(\d{1,2})[-\s/]([a-zA-Z]+)[-\s/](\d{2,4})$/);
      if (dMmmY) {
        const day = parseInt(dMmmY[1], 10);
        const mStr = dMmmY[2].toLowerCase();
        let year = parseInt(dMmmY[3], 10);
        if (year < 100) year += 2000;
        const month = MONTH_MAP[mStr];
        if (month !== undefined && !isNaN(day) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }

      const ymd = str.match(/^(\d{4})[-\s/](\d{1,2})[-\s/](\d{1,2})$/);
      if (ymd) {
        const year = parseInt(ymd[1], 10);
        const month = parseInt(ymd[2], 10) - 1;
        const day = parseInt(ymd[3], 10);
        return new Date(year, month, day);
      }

      const dmy = str.match(/^(\d{1,2})[-\s/](\d{1,2})[-\s/](\d{2,4})$/);
      if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1;
        let year = parseInt(dmy[3], 10);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
      }

      if (/\d{4}/.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    const now = new Date();
    const result: Array<{
      employee: any;
      jenisSanksi: string;
      tanggalSanksi: string;
      masaBerlaku: string;
      kategori: string;
      alasan: string;
      levelBadgeBg: string;
      levelColor: string;
    }> = [];

    scopedEmployees.forEach(emp => {
      const c = emp.counselingSpdk || emp.counseling || {};
      const st = String(c.st || '').trim();
      const sp1 = String(c.sp1 || c.sp_1 || '').trim();
      const sp2 = String(c.sp2 || c.sp_2 || '').trim();
      const sp3 = String(c.sp3 || c.sp_3 || '').trim();
      const sppt = String(c.sppt || c.sp_pt || '').trim();
      const phk = String(c.phk || '').trim();
      const totalSp = String(c.totalSp || c.total_sp || '').trim();
      const pernahSpdk = String(c.pernahTerlibatSpdk || c.pernah_terlibat_spdk || '').toLowerCase().trim();
      const statusSanksi = String(c.statusSanksi || c.status_sanksi || '').toLowerCase().trim();

      const hasSpMajor = (sp1 && sp1 !== '-' && sp1 !== '0') || 
                         (sp2 && sp2 !== '-' && sp2 !== '0') || 
                         (sp3 && sp3 !== '-' && sp3 !== '0') || 
                         (sppt && sppt !== '-' && sppt !== '0');
      const hasSt = (st && st !== '-' && st !== '0');
      const hasPhk = (phk && phk !== '-' && phk !== '0');
      const hasAnySp = hasSpMajor || hasSt || hasPhk || (Number(totalSp) > 0) || pernahSpdk.includes('ya');

      if (!hasAnySp) return;

      // Status explicit check
      if (statusSanksi.includes('selesai') || statusSanksi.includes('pemutihan') || statusSanksi.includes('kadaluarsa') || statusSanksi.includes('expired') || statusSanksi === 'aman') {
        return;
      }

      // Tentukan tanggal dan masa berlaku sanksi
      const dateStr = [sppt, sp3, sp2, sp1, st, c.tanggalSp, c.tanggal_sp, c.bulanKonseling, c.bulan_konseling, c.masaBerlakuSanksi, c.masa_berlaku_sanksi]
        .find(s => s && s !== '-' && s !== '0' && (s.includes('-') || s.includes('/') || /[a-zA-Z]{3,}/.test(s))) || '-';

      let isExpired = false;
      let calculatedMasaBerlaku = c.masaBerlakuSanksi || c.masa_berlaku_sanksi || '';

      if (dateStr && dateStr !== '-') {
        const baseDate = parseSanctionDate(dateStr);
        if (baseDate) {
          const durationMonths = hasSpMajor ? 6 : 3;
          const expiryDate = new Date(baseDate.getTime());
          expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
          if (now > expiryDate) {
            isExpired = true;
          }
          if (!calculatedMasaBerlaku) {
            calculatedMasaBerlaku = `Aktif s/d ${formatShortDate(expiryDate)}`;
          }
        }
      }

      if (isExpired && !hasPhk) return;

      // Determine label & color
      let jenisSanksi = 'Sanksi Disiplin';
      let levelBadgeBg = 'bg-amber-500';
      let levelColor = 'text-amber-800 bg-amber-50 border-amber-200';

      if (hasPhk) {
        jenisSanksi = 'PHK';
        levelBadgeBg = 'bg-rose-900';
        levelColor = 'text-rose-900 bg-rose-100 border-rose-300';
      } else if (sppt && sppt !== '-' && sppt !== '0') {
        jenisSanksi = 'SPPT';
        levelBadgeBg = 'bg-rose-600';
        levelColor = 'text-rose-800 bg-rose-50 border-rose-200';
      } else if (sp3 && sp3 !== '-' && sp3 !== '0') {
        jenisSanksi = 'SP III';
        levelBadgeBg = 'bg-rose-600';
        levelColor = 'text-rose-800 bg-rose-50 border-rose-200';
      } else if (sp2 && sp2 !== '-' && sp2 !== '0') {
        jenisSanksi = 'SP II';
        levelBadgeBg = 'bg-orange-600';
        levelColor = 'text-orange-800 bg-orange-50 border-orange-200';
      } else if (sp1 && sp1 !== '-' && sp1 !== '0') {
        jenisSanksi = 'SP I';
        levelBadgeBg = 'bg-amber-600';
        levelColor = 'text-amber-800 bg-amber-50 border-amber-200';
      } else if (hasSt) {
        jenisSanksi = 'Surat Teguran (ST)';
        levelBadgeBg = 'bg-yellow-600';
        levelColor = 'text-yellow-800 bg-yellow-50 border-yellow-200';
      } else if (pernahSpdk.includes('ya')) {
        jenisSanksi = 'Insiden SPDK';
        levelBadgeBg = 'bg-purple-600';
        levelColor = 'text-purple-800 bg-purple-50 border-purple-200';
      }

      const alasan = c.alasanSp || c.alasan_sp || c.kronologiSpdk || c.kronologi_spdk || c.tindakanSpdk || c.tindakan_spdk || '-';
      const kategori = c.kategoriSpdk || c.kategori_spdk || '-';

      result.push({
        employee: emp,
        jenisSanksi,
        tanggalSanksi: dateStr !== '-' ? formatShortDate(dateStr) : (c.bulanKonseling || '-'),
        masaBerlaku: calculatedMasaBerlaku || 'Aktif',
        kategori,
        alasan,
        levelBadgeBg,
        levelColor
      });
    });

    // Urutkan sanksi SPDK berdasarkan hirarki jabatan resmi
    result.sort((a, b) => compareEmployeesByJabatan(a.employee, b.employee));

    return result;
  }, [scopedEmployees]);



  const handleManualSync = async () => {
    if (!canManageDatabase) {
      toast.error('Akses ditolak: Hanya Section Administration atau Developer yang dapat menyinkronkan database karyawan.');
      return;
    }
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/roster/sync', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify({ editorNik: inspectorNik })
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({ type: 'success', message: data.message || 'Sinkronisasi database berhasil!' });
        await fetchEmployees();
      } else {
        setSyncFeedback({ type: 'error', message: data.message || 'Gagal sinkronisasi data dari Google Sheets' });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', message: 'Koneksi gagal: ' + e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageDatabase) {
      toast.error('Akses ditolak: Hanya Section Administration atau Developer yang dapat mengubah foto karyawan di database.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file || !selectedEmployee) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap pilih file gambar (JPG, PNG, WebP)');
      return;
    }

    setIsUploadingPhoto(true);
    toast.loading('Mengompresi & memperbarui foto...', { id: 'emp-avatar-upload' });

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 320;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Gagal memproses kanvas foto');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

            const res = await fetch('/api/employees/photo', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-user-nik': inspectorNik
              },
              body: JSON.stringify({ 
                nik: selectedEmployee.nik, 
                photo: compressedDataUrl,
                editorNik: inspectorNik
              })
            });
            const resData = await res.json();
            if (resData.status === 'success') {
              setSelectedEmployee((prev: any) => ({ ...prev, photo: compressedDataUrl }));
              setEmployees((prev: any[]) => prev.map(emp => emp.nik === selectedEmployee.nik ? { ...emp, photo: compressedDataUrl } : emp));
              toast.success(`Foto karyawan ${selectedEmployee.name || ''} berhasil diperbarui di database!`, { id: 'emp-avatar-upload' });
            } else {
              throw new Error(resData.message || 'Gagal menyimpan foto ke server');
            }
          } catch (uploadErr: any) {
            toast.error('Gagal mengunggah foto: ' + uploadErr.message, { id: 'emp-avatar-upload' });
          } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingPhoto(false);
      toast.error('Gagal memproses gambar: ' + err.message, { id: 'emp-avatar-upload' });
    }
  };

  const activeSections = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      const norm = normalizeDepartmentOrSection(e.department || e.section);
      if (norm) set.add(norm);
    });
    return Array.from(set);
  }, [employees]);

  const filteredSearch = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase().trim();
    return scopedEmployees.filter(e => {
      const name = (e.name || e.nama || '').toLowerCase();
      const nik = (e.nik || '').toLowerCase();
      const jabatan = (e.jabatan || '').toLowerCase();
      const sec = (e.section || e.department || '').toLowerCase();
      return name.includes(term) || nik.includes(term) || jabatan.includes(term) || sec.includes(term);
    }).sort(compareEmployeesByJabatan).slice(0, 30);
  }, [scopedEmployees, searchTerm]);

  if (loading) {
    return (
      <div className="flex-1 p-4 w-full max-w-full px-4 md:px-8 w-full h-full bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#22a7b8] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500">Memuat database karyawan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 w-full max-w-full px-4 md:px-8 w-full h-full bg-transparent flex items-center justify-center text-center">
        <div>
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={onBack}>Kembali</Button>
        </div>
      </div>
    );
  }

  // The Search Input Component that we will share across states
  const renderSearchBar = (isSmall: boolean) => (
    <div 
      className={`relative z-50 ${isSmall ? 'w-64 sm:w-80 md:w-96' : 'w-full max-w-xl mx-auto'}`}
    >
      <div className="relative">
        <Input
          type="text"
          placeholder="Ketik NIK atau Nama..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full rounded-2xl shadow-sm border-slate-200 focus:ring-4 focus:ring-[#22a7b8]/20 focus:border-[#22a7b8] bg-white
            ${isSmall ? 'pl-10 py-2 text-sm' : 'pl-12 py-6 text-lg'}`}
        />
        <Search className={`absolute text-slate-400 ${isSmall ? 'left-3 w-4 h-4 top-1/2 -translate-y-1/2' : 'left-4 w-6 h-6 top-1/2 -translate-y-1/2'}`} />
        
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className={`absolute text-slate-400 hover:text-slate-600 ${isSmall ? 'right-3 top-1/2 -translate-y-1/2' : 'right-4 top-1/2 -translate-y-1/2'}`}
          >
            <X className={isSmall ? "w-4 h-4" : "w-5 h-5"} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {searchTerm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden
              ${isSmall ? 'right-0 w-[320px] sm:w-[400px]' : 'left-0 right-0'}`}
          >
            {filteredSearch.length > 0 ? (
              <ul className="py-2 max-h-[60vh] overflow-y-auto">
                {filteredSearch.map(emp => (
                  <li key={emp.nik}>
                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center transition-colors border-b border-slate-50 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-3 overflow-hidden bg-[#e6f7f9] text-[#22a7b8] font-bold border border-[#a2e0e8]">
                        {emp.photo ? (
                          <img 
                            src={formatAvatarUrl(emp.photo)} 
                            alt={emp.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{emp.name?.charAt(0) || '?'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 truncate">{emp.name}</h4>
                        <p className="text-sm text-slate-500 truncate">{emp.nik} • {emp.jabatan || 'Tanpa Jabatan'}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p>Karyawan tidak ditemukan</p>
                <p className="text-sm mt-1">Pastikan NIK atau nama sudah diketik dengan benar.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-white overflow-hidden relative">
      {/* Top Navigation */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-xs min-h-[64px]">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => selectedEmployee ? setSelectedEmployee(null) : (onBack && onBack())} className="mr-1">
            <ArrowLeft className="w-5 h-5 mr-1" />
            {selectedEmployee ? 'Kembali' : 'Tutup'}
          </Button>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-[#f09b13] text-white font-bold text-xs uppercase tracking-wider shadow-xs hidden sm:inline-block">
              Manpower
            </span>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
              Database Karyawan
            </h1>
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-2xs ${userRoleBadge.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${userRoleBadge.dot}`}></span>
              {userRoleBadge.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!selectedEmployee && canManageDatabase && (
            <>
              <Button
                onClick={() => {
                  setEditModalMode('add');
                  setSelectedEmployeeForEdit(null);
                  setEditModalTab('job');
                  setIsEditModalOpen(true);
                }}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 rounded-xl text-xs font-bold px-3 py-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Tambah data karyawan baru ke database (Khusus Section Admin Local Host)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Karyawan</span>
              </Button>
              <Button
                onClick={() => setIsTimeRangeModalOpen(true)}
                size="sm"
                className="bg-white hover:bg-slate-50 text-[#135e69] border border-[#a2e0e8] flex items-center gap-1.5 rounded-xl text-xs font-bold px-3 py-1.5 shadow-xs transition-all cursor-pointer"
              >
                <CalendarRange className="w-3.5 h-3.5 text-[#22a7b8]" />
                <span>Tarik Data Time Range</span>
              </Button>

              <Button
                onClick={() => setIsImportModalOpen(true)}
                size="sm"
                className="bg-white hover:bg-slate-50 text-[#135e69] border border-[#a2e0e8] flex items-center gap-1.5 rounded-xl text-xs font-bold px-3 py-1.5 shadow-xs transition-all cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#22a7b8]" />
                <span>Import CSV / Excel</span>
              </Button>

              <Button
                onClick={handleManualSync}
                disabled={isSyncing}
                size="sm"
                className="bg-[#22a7b8] hover:bg-[#1b8f9e] text-white flex items-center gap-1.5 rounded-xl text-xs font-semibold px-3 py-1.5 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Menyinkronkan...' : 'Sinkron Google Sheets'}
              </Button>
            </>
          )}

          {/* General Search Bar in Header when in Profile Mode */}
          {selectedEmployee && renderSearchBar(true)}
        </div>
      </div>

      {syncFeedback && (
        <div className={`p-3 mx-4 mt-3 rounded-xl text-xs flex items-center justify-between gap-2 shadow-sm ${
          syncFeedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{syncFeedback.message}</span>
          </div>
          <button 
            onClick={() => setSyncFeedback(null)} 
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      <div className={`flex-1 ${selectedEmployee ? 'overflow-hidden h-[calc(100vh-64px)]' : 'overflow-y-auto'}`}>
        {!selectedEmployee ? (
          /* SEARCH MODE - ENTERPRISE HERO (CLEAN WHITE) */
          <div className="w-full min-h-full flex flex-col relative overflow-hidden bg-white">
            {/* Enterprise Clean White Background with subtle soft ambient light */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/80 to-[#f0fdfa] z-0">
              {/* Subtle Grid overlay */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTksOTQsMTA1LDAuMDQpIi8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)] z-0"></div>
              {/* Soft glowing orbs */}
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#22a7b8]/10 rounded-full blur-3xl -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#f09b13]/10 rounded-full blur-3xl translate-y-1/2"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full pt-10 md:pt-28 px-4 pb-20 flex-1 flex flex-col items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8 w-full flex flex-col items-center"
              >
                {/* Harita Nickel Official Logo */}
                <div className="mb-3.5 group">
                  <img 
                    src="/harita-nickel-logo.png" 
                    alt="Harita Nickel" 
                    className="h-14 sm:h-16 md:h-20 w-auto object-contain filter drop-shadow-sm hover:scale-105 transition-transform duration-300 select-none"
                  />
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f09b13] text-white text-xs font-extrabold uppercase tracking-wider mb-4 shadow-md ring-2 ring-[#f09b13]/20">
                  <Database className="w-3.5 h-3.5" />
                  <span>Manpower</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 md:mb-4 tracking-tight">
                  Laboratory Administration
                </h2>
                <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto font-normal leading-relaxed px-2">
                  Manpower Attendance &amp; Database Directory. Ketik NIK atau nama untuk menelusuri profil karyawan, melacak kehadiran, dan memantau riwayat jabatan secara real-time.
                </p>
                {isMeetingRoom && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mode Meeting Room • Akses Penuh Seluruh Karyawan ({employees.length} Data)</span>
                  </div>
                )}
              </motion.div>

              {/* Big Search Bar */}
              <div className="w-full max-w-2xl mb-10 md:mb-12 relative group px-2 md:px-0">
                <div className="absolute inset-0 bg-[#22a7b8]/15 blur-xl rounded-full transition-opacity group-hover:opacity-100 opacity-60"></div>
                {renderSearchBar(false)}
              </div>

              {/* Quick Stats Dashboard with Interactive Detail Drawers */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-4xl px-2 space-y-4"
              >
                {/* PT Universe Switcher for Section Manager & Admin */}
                {isSectionManager && (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="bg-slate-100/95 p-1 rounded-2xl border border-slate-200/90 flex items-center gap-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPtFilter('ALL')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          ptFilter === 'ALL'
                            ? 'bg-white text-slate-800 shadow-xs ring-1 ring-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>Semua PT</span>
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono font-bold">
                          {employees.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPtFilter('TBP')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          ptFilter === 'TBP'
                            ? 'bg-[#135e69] text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>TBP &amp; GPS</span>
                        <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          ptFilter === 'TBP' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                        }`}>
                          {employees.filter(e => !isGtsEmp(e)).length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPtFilter('GTS')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          ptFilter === 'GTS'
                            ? 'bg-[#f09b13] text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>PT GTS</span>
                        <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          ptFilter === 'GTS' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                        }`}>
                          {employees.filter(e => isGtsEmp(e)).length}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 w-full">
                  {/* Card 1: Total Data */}
                  <div className="bg-white/95 backdrop-blur-md rounded-xl md:rounded-2xl p-3.5 md:p-4 border border-slate-200/90 text-center shadow-xs transition-all">
                    <div className="text-slate-500 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1">Total Data</div>
                    <div className="text-2xl md:text-3xl font-black text-[#104b50]">{scopedEmployees.length}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Master Database</div>
                  </div>

                  {/* Card 2: Karyawan Aktif */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStatDetail(prev => prev === 'active' ? null : 'active');
                      setStatDetailSearch('');
                    }}
                    className={`bg-white/95 backdrop-blur-md rounded-xl md:rounded-2xl p-3.5 md:p-4 border text-center transition-all shadow-xs cursor-pointer group text-left sm:text-center ${
                      activeStatDetail === 'active'
                        ? 'border-[#f09b13] ring-2 ring-[#f09b13]/30 shadow-md bg-amber-50/40'
                        : 'border-slate-200/90 hover:border-[#f09b13]/60 hover:shadow-md'
                    }`}
                  >
                    <div className="text-[#c77d07] text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1">
                      <span>Karyawan Aktif</span>
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-slate-800">{activeEmployeesCount}</div>
                    <div className="text-[10px] text-amber-600/80 font-semibold mt-0.5 group-hover:underline">
                      {activeStatDetail === 'active' ? '▲ Tutup Rincian' : '▼ Klik Lihat Daftar'}
                    </div>
                  </button>

                  {/* Card 3: Karyawan Permanent */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStatDetail(prev => prev === 'permanent' ? null : 'permanent');
                      setStatDetailSearch('');
                    }}
                    className={`bg-white/95 backdrop-blur-md rounded-xl md:rounded-2xl p-3.5 md:p-4 border text-center transition-all shadow-xs cursor-pointer group ${
                      activeStatDetail === 'permanent'
                        ? 'border-teal-500 ring-2 ring-teal-500/30 shadow-md bg-teal-50/40'
                        : 'border-slate-200/90 hover:border-teal-400 hover:shadow-md'
                    }`}
                  >
                    <div className="text-teal-700 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1">
                      Karyawan Permanent
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-teal-700">
                      {permanentEmployeesCount}
                    </div>
                    <div className="text-[10px] text-teal-600/80 font-semibold mt-0.5 group-hover:underline">
                      {activeStatDetail === 'permanent' ? '▲ Tutup Rincian' : '▼ Klik Lihat Nama'}
                    </div>
                  </button>

                  {/* Card 4: Karyawan Kontrak */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStatDetail(prev => prev === 'kontrak' ? null : 'kontrak');
                      setStatDetailSearch('');
                    }}
                    className={`bg-white/95 backdrop-blur-md rounded-xl md:rounded-2xl p-3.5 md:p-4 border text-center transition-all shadow-xs cursor-pointer group ${
                      activeStatDetail === 'kontrak'
                        ? 'border-sky-500 ring-2 ring-sky-500/30 shadow-md bg-sky-50/40'
                        : 'border-slate-200/90 hover:border-sky-400 hover:shadow-md'
                    }`}
                  >
                    <div className="text-sky-700 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1">
                      Karyawan Kontrak
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-sky-700">
                      {contractEmployeesCount}
                    </div>
                    <div className="text-[10px] text-sky-600/80 font-semibold mt-0.5 group-hover:underline">
                      {activeStatDetail === 'kontrak' ? '▲ Tutup Rincian' : '▼ Klik Lihat Nama'}
                    </div>
                  </button>

                  {/* Card 4: Jumlah Izin Karyawan */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStatDetail(prev => prev === 'izin' ? null : 'izin');
                      setStatDetailSearch('');
                    }}
                    className={`bg-white/95 backdrop-blur-md rounded-xl md:rounded-2xl p-3.5 md:p-4 border text-center transition-all shadow-xs cursor-pointer group ${
                      activeStatDetail === 'izin'
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-md bg-indigo-50/40'
                        : 'border-slate-200/90 hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div className="text-indigo-700 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1">
                      Jumlah Izin
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-indigo-800">
                      {monthlyIzinData.grandTotal}
                    </div>
                    <div className="text-[10px] text-indigo-600/80 font-semibold mt-0.5 group-hover:underline">
                      {activeStatDetail === 'izin' ? '▲ Tutup Rincian' : '▼ Bulan Ini (Urut)'}
                    </div>
                  </button>

                  {/* Card 5: SPDK & Sanksi (Aktif) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStatDetail(prev => prev === 'spdk' ? null : 'spdk');
                      setStatDetailSearch('');
                    }}
                    className={`bg-white/95 backdrop-blur-md rounded-xl md:rounded-2xl p-3.5 md:p-4 border text-center transition-all shadow-xs cursor-pointer group col-span-2 sm:col-span-1 ${
                      activeStatDetail === 'spdk'
                        ? 'border-purple-600 ring-2 ring-purple-500/30 shadow-md bg-purple-50/40'
                        : 'border-purple-200 hover:border-purple-400 hover:shadow-md'
                    }`}
                  >
                    <div className="text-purple-700 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1">
                      SPDK &amp; Sanksi (Aktif)
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-purple-800">
                      {activeSpdkData.length}
                    </div>
                    <div className="text-[10px] text-purple-600/80 font-semibold mt-0.5 group-hover:underline">
                      {activeStatDetail === 'spdk' ? '▲ Tutup Rincian' : '▼ Klik Lihat Detail'}
                    </div>
                  </button>
                </div>

                {/* EXPANDABLE DETAIL DRAWER / LIST ACCORDION */}
                <AnimatePresence>
                  {activeStatDetail && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, scale: 0.98 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl p-4 sm:p-5 relative mt-2">
                        {/* Header Drawer */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                          <div className="flex items-center gap-2.5">
                            {activeStatDetail === 'permanent' && (
                              <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                                <Briefcase className="w-5 h-5" />
                              </div>
                            )}
                            {activeStatDetail === 'kontrak' && (
                              <div className="p-2 rounded-xl bg-sky-100 text-sky-800">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            {activeStatDetail === 'izin' && (
                              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
                                <Calendar className="w-5 h-5" />
                              </div>
                            )}
                            {activeStatDetail === 'spdk' && (
                              <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                                <Scale className="w-5 h-5" />
                              </div>
                            )}
                            {activeStatDetail === 'active' && (
                              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                                <Users className="w-5 h-5" />
                              </div>
                            )}

                            <div>
                              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                {activeStatDetail === 'permanent' && 'Daftar Karyawan Permanent (PKWTT)'}
                                {activeStatDetail === 'kontrak' && 'Daftar Karyawan Kontrak (PKWT)'}
                                {activeStatDetail === 'izin' && 'Daftar Karyawan Izin Bulan Berjalan'}
                                {activeStatDetail === 'spdk' && 'Daftar Karyawan dengan Sanksi & SPDK Aktif'}
                                {activeStatDetail === 'active' && 'Daftar Seluruh Karyawan Aktif'}
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {activeStatDetail === 'permanent' && `${permanentEmployeesCount} Karyawan`}
                                  {activeStatDetail === 'kontrak' && `${contractEmployeesCount} Karyawan`}
                                  {activeStatDetail === 'izin' && `${monthlyIzinData.list.length} Orang (${monthlyIzinData.grandTotal} Hari)`}
                                  {activeStatDetail === 'spdk' && `${activeSpdkData.length} Kasus Aktif`}
                                  {activeStatDetail === 'active' && `${activeEmployeesCount} Karyawan`}
                                </span>
                              </h3>
                              <p className="text-xs text-slate-500">
                                {activeStatDetail === 'permanent' && 'Diurutkan sesuai tingkatan hirarki jabatan resmi. Klik baris untuk profil lengkap.'}
                                {activeStatDetail === 'kontrak' && 'Diurutkan sesuai tingkatan hirarki jabatan resmi. Klik baris untuk profil lengkap.'}
                                {activeStatDetail === 'izin' && 'Diurutkan dari frekuensi izin terbanyak ke terkecil pada bulan berjalan.'}
                                {activeStatDetail === 'spdk' && 'Menampilkan sanksi disiplin dan SPDK yang masih berlaku saat ini.'}
                                {activeStatDetail === 'active' && 'Diurutkan sesuai tingkatan hirarki jabatan resmi.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Filter input */}
                            <div className="relative w-full sm:w-56">
                              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={statDetailSearch}
                                onChange={e => setStatDetailSearch(e.target.value)}
                                placeholder="Cari nama / NIK..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveStatDetail(null)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="Tutup"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* LIST CONTENT */}
                        <div className="mt-3">
                          {/* 1. KARYAWAN PERMANENT (GROUPED BY JABATAN) */}
                          {activeStatDetail === 'permanent' && (() => {
                            const filtered = permanentEmployeesList.filter(e => {
                              const q = statDetailSearch.toLowerCase().trim();
                              if (!q) return true;
                              return (e.name || '').toLowerCase().includes(q) ||
                                     (e.nik || '').toLowerCase().includes(q) ||
                                     (e.jabatan || '').toLowerCase().includes(q) ||
                                     (e.department || '').toLowerCase().includes(q);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="py-8 text-center text-xs text-slate-400">
                                  Tidak ada data karyawan permanent yang sesuai pencarian.
                                </div>
                              );
                            }

                            // Group by jabatan level
                            const jabatanLevels = [
                              { key: 'manager', label: 'Manager', color: 'bg-violet-100 text-violet-800 border-violet-200' },
                              { key: 'superintendent', label: 'Superintendent', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                              { key: 'supervisor', label: 'Supervisor', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
                              { key: 'foreman', label: 'Foreman', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                              { key: 'admin', label: 'Admin / Staff', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                              { key: 'crew', label: 'Crew / Operator', color: 'bg-slate-100 text-slate-700 border-slate-200' },
                              { key: 'other', label: 'Lainnya', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                            ];

                            const getJabatanGroup = (jabatan: string) => {
                              const j = (jabatan || '').toLowerCase();
                              if (j.includes('manager')) return 'manager';
                              if (j.includes('superintendent') || j.includes('spt')) return 'superintendent';
                              if (j.includes('supervisor') || j.includes('specialist')) return 'supervisor';
                              if (j.includes('foreman')) return 'foreman';
                              if (j.includes('admin') || j.includes('staff') || j.includes('officer')) return 'admin';
                              if (j.includes('crew') || j.includes('operator') || j.includes('technician') || j.includes('helper')) return 'crew';
                              return 'other';
                            };

                            const grouped: Record<string, any[]> = {};
                            filtered.forEach(emp => {
                              const grp = getJabatanGroup(emp.jabatan);
                              if (!grouped[grp]) grouped[grp] = [];
                              grouped[grp].push(emp);
                            });

                            return (
                              <div className="max-h-80 md:max-h-96 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                {jabatanLevels.filter(lv => grouped[lv.key] && grouped[lv.key].length > 0).map(lv => {
                                  const members = grouped[lv.key];
                                  return (
                                    <details key={lv.key} open className="group/jab">
                                      <summary className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer select-none border ${lv.color} hover:shadow-sm transition-all`}>
                                        <span className="text-xs font-extrabold flex-1">{lv.label}</span>
                                        <span className="text-[11px] font-black bg-white/60 px-2 py-0.5 rounded-lg border border-black/5">{members.length} Orang</span>
                                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open/jab:rotate-180" />
                                      </summary>
                                      <div className="mt-1 ml-3 pl-3 border-l-2 border-teal-100 space-y-0.5">
                                        {members.map((emp, idx) => (
                                          <div
                                            key={emp.nik || idx}
                                            onClick={() => setSelectedEmployee(emp)}
                                            className="p-2 rounded-xl hover:bg-teal-50/60 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="w-8 h-8 rounded-lg bg-teal-100/70 border border-teal-200 flex items-center justify-center shrink-0 overflow-hidden font-bold text-teal-800 text-[10px]">
                                                {emp.photo ? (
                                                  <img src={formatAvatarUrl(emp.photo)} alt={emp.name} className="w-full h-full object-cover" />
                                                ) : (
                                                  (emp.name || 'P').charAt(0).toUpperCase()
                                                )}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800 group-hover:text-teal-700 truncate flex items-center gap-1.5">
                                                  <span>{emp.name}</span>
                                                  <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">{emp.nik}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate mt-0.5">{emp.jabatan || '-'}</div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-lg shadow-2xs">PKWTT</span>
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 transition-colors" />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* 2. KARYAWAN KONTRAK (GROUPED BY JABATAN) */}
                          {activeStatDetail === 'kontrak' && (() => {
                            const filtered = contractEmployeesList.filter(e => {
                              const q = statDetailSearch.toLowerCase().trim();
                              if (!q) return true;
                              return (e.name || '').toLowerCase().includes(q) ||
                                     (e.nik || '').toLowerCase().includes(q) ||
                                     (e.jabatan || '').toLowerCase().includes(q) ||
                                     (e.department || '').toLowerCase().includes(q);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="py-8 text-center text-xs text-slate-400">
                                  Tidak ada data karyawan kontrak yang sesuai pencarian.
                                </div>
                              );
                            }

                            const jabatanLevels = [
                              { key: 'manager', label: 'Manager', color: 'bg-violet-100 text-violet-800 border-violet-200' },
                              { key: 'superintendent', label: 'Superintendent', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                              { key: 'supervisor', label: 'Supervisor', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
                              { key: 'foreman', label: 'Foreman', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                              { key: 'admin', label: 'Admin / Staff', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                              { key: 'crew', label: 'Crew / Operator', color: 'bg-slate-100 text-slate-700 border-slate-200' },
                              { key: 'other', label: 'Lainnya', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                            ];

                            const getJabatanGroup = (jabatan: string) => {
                              const j = (jabatan || '').toLowerCase();
                              if (j.includes('manager')) return 'manager';
                              if (j.includes('superintendent') || j.includes('spt')) return 'superintendent';
                              if (j.includes('supervisor') || j.includes('specialist')) return 'supervisor';
                              if (j.includes('foreman')) return 'foreman';
                              if (j.includes('admin') || j.includes('staff') || j.includes('officer')) return 'admin';
                              if (j.includes('crew') || j.includes('operator') || j.includes('technician') || j.includes('helper')) return 'crew';
                              return 'other';
                            };

                            const grouped: Record<string, any[]> = {};
                            filtered.forEach(emp => {
                              const grp = getJabatanGroup(emp.jabatan);
                              if (!grouped[grp]) grouped[grp] = [];
                              grouped[grp].push(emp);
                            });

                            return (
                              <div className="max-h-80 md:max-h-96 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                {jabatanLevels.filter(lv => grouped[lv.key] && grouped[lv.key].length > 0).map(lv => {
                                  const members = grouped[lv.key];
                                  return (
                                    <details key={lv.key} open className="group/jab">
                                      <summary className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer select-none border ${lv.color} hover:shadow-sm transition-all`}>
                                        <span className="text-xs font-extrabold flex-1">{lv.label}</span>
                                        <span className="text-[11px] font-black bg-white/60 px-2 py-0.5 rounded-lg border border-black/5">{members.length} Orang</span>
                                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open/jab:rotate-180" />
                                      </summary>
                                      <div className="mt-1 ml-3 pl-3 border-l-2 border-sky-100 space-y-0.5">
                                        {members.map((emp, idx) => (
                                          <div
                                            key={emp.nik || idx}
                                            onClick={() => setSelectedEmployee(emp)}
                                            className="p-2 rounded-xl hover:bg-sky-50/60 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="w-8 h-8 rounded-lg bg-sky-100/70 border border-sky-200 flex items-center justify-center shrink-0 overflow-hidden font-bold text-sky-800 text-[10px]">
                                                {emp.photo ? (
                                                  <img src={formatAvatarUrl(emp.photo)} alt={emp.name} className="w-full h-full object-cover" />
                                                ) : (
                                                  (emp.name || 'K').charAt(0).toUpperCase()
                                                )}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800 group-hover:text-sky-700 truncate flex items-center gap-1.5">
                                                  <span>{emp.name}</span>
                                                  <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">{emp.nik}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate mt-0.5">{emp.jabatan || '-'}</div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="text-[10px] font-extrabold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-lg shadow-2xs">PKWT</span>
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-600 transition-colors" />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* 2. JUMLAH IZIN KARYAWAN (URUT DARI TERBANYAK KE TERKECIL) */}
                          {activeStatDetail === 'izin' && (() => {
                            const filtered = monthlyIzinData.list.filter(item => {
                              const q = statDetailSearch.toLowerCase().trim();
                              if (!q) return true;
                              return (item.employee.name || '').toLowerCase().includes(q) ||
                                     (item.employee.nik || '').toLowerCase().includes(q) ||
                                     (item.employee.jabatan || '').toLowerCase().includes(q);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="py-8 text-center text-xs text-slate-400">
                                  Tidak ada data izin karyawan pada bulan berjalan yang sesuai pencarian.
                                </div>
                              );
                            }

                            return (
                              <div className="max-h-80 md:max-h-96 overflow-y-auto custom-scrollbar pr-1 divide-y divide-slate-100">
                                {filtered.map((item, idx) => {
                                  const emp = item.employee;
                                  return (
                                    <div
                                      key={emp.nik || idx}
                                      onClick={() => setSelectedEmployee(emp)}
                                      className="p-2.5 rounded-xl hover:bg-indigo-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        {/* Bad Habit Badge */}
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
                                          idx === 0 ? 'bg-red-500 text-white shadow-md ring-2 ring-red-300 animate-pulse' :
                                          idx === 1 ? 'bg-orange-400 text-white shadow-sm ring-1 ring-orange-200' :
                                          idx === 2 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                                          'bg-slate-100 text-slate-500'
                                        }`}>
                                          {idx === 0 ? '🚨' : idx === 1 ? '⚠️' : idx === 2 ? '🔻' : <span className="text-[10px] font-bold">{idx + 1}</span>}
                                        </div>

                                        <div className="w-9 h-9 rounded-xl bg-indigo-100/70 border border-indigo-200 flex items-center justify-center shrink-0 overflow-hidden font-bold text-indigo-800 text-xs">
                                          {emp.photo ? (
                                            <img src={formatAvatarUrl(emp.photo)} alt={emp.name} className="w-full h-full object-cover" />
                                          ) : (
                                            (emp.name || 'I').charAt(0).toUpperCase()
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 truncate flex items-center gap-1.5">
                                            <span>{emp.name}</span>
                                            <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                              {emp.nik}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                            <span>{emp.jabatan || '-'}</span>
                                            <span>•</span>
                                            <span>{emp.department || emp.section || '-'}</span>
                                          </div>
                                          {item.reasons.length > 0 && (
                                            <div className="text-[10px] text-slate-500 italic truncate mt-0.5 max-w-md">
                                              Alasan: {item.reasons.join(', ')}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        {item.dates.length > 0 && (
                                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg hidden md:inline-block max-w-[140px] truncate" title={item.dates.join(', ')}>
                                            {item.dates.join(', ')}
                                          </span>
                                        )}
                                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl shadow-2xs">
                                          {item.totalIzinBulanIni} Hari Izin
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* 3. SPDK & SANKSI (AKTIF) */}
                          {activeStatDetail === 'spdk' && (() => {
                            const filtered = activeSpdkData.filter(item => {
                              const q = statDetailSearch.toLowerCase().trim();
                              if (!q) return true;
                              return (item.employee.name || '').toLowerCase().includes(q) ||
                                     (item.employee.nik || '').toLowerCase().includes(q) ||
                                     (item.jenisSanksi || '').toLowerCase().includes(q) ||
                                     (item.alasan || '').toLowerCase().includes(q);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="py-8 text-center text-xs text-slate-400">
                                  Tidak ada karyawan dengan sanksi SPDK aktif yang sesuai pencarian.
                                </div>
                              );
                            }

                            return (
                              <div className="max-h-80 md:max-h-96 overflow-y-auto custom-scrollbar pr-1 divide-y divide-slate-100">
                                {filtered.map((item, idx) => {
                                  const emp = item.employee;
                                  return (
                                    <div
                                      key={emp.nik || idx}
                                      onClick={() => setSelectedEmployee(emp)}
                                      className="p-3 rounded-xl hover:bg-purple-50/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
                                    >
                                      <div className="flex items-start gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-purple-100/80 border border-purple-200 flex items-center justify-center shrink-0 overflow-hidden font-bold text-purple-800 text-xs mt-0.5">
                                          {emp.photo ? (
                                            <img src={formatAvatarUrl(emp.photo)} alt={emp.name} className="w-full h-full object-cover" />
                                          ) : (
                                            (emp.name || 'S').charAt(0).toUpperCase()
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-slate-800 group-hover:text-purple-700 truncate flex items-center gap-1.5 flex-wrap">
                                            <span>{emp.name}</span>
                                            <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                              {emp.nik}
                                            </span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border shadow-2xs ${item.levelColor}`}>
                                              {item.jenisSanksi}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                            <span>{emp.jabatan || '-'}</span>
                                            <span>•</span>
                                            <span>{emp.department || emp.section || '-'}</span>
                                          </div>
                                          {item.alasan && item.alasan !== '-' && (
                                            <div className="text-[11px] text-rose-700/90 font-medium bg-rose-50/60 border border-rose-100 rounded-lg p-1.5 mt-1.5 max-w-xl">
                                              <span className="font-bold">Keterangan:</span> {item.alasan}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                        <div className="text-right">
                                          <div className="text-[11px] font-bold font-mono text-slate-700">
                                            Tgl: {formatShortDate(item.tanggalSanksi)}
                                          </div>
                                          <div className="text-[10px] text-purple-600 font-semibold mt-0.5">
                                            {item.masaBerlaku}
                                          </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* 4. KARYAWAN AKTIF (GROUPED BY JABATAN) */}
                          {activeStatDetail === 'active' && (() => {
                            const filtered = activeEmployeesList.filter(e => {
                              const q = statDetailSearch.toLowerCase().trim();
                              if (!q) return true;
                              return (e.name || '').toLowerCase().includes(q) ||
                                     (e.nik || '').toLowerCase().includes(q) ||
                                     (e.jabatan || '').toLowerCase().includes(q);
                            });

                            const jabatanLevels = [
                              { key: 'manager', label: 'Manager', color: 'bg-violet-100 text-violet-800 border-violet-200' },
                              { key: 'superintendent', label: 'Superintendent', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                              { key: 'supervisor', label: 'Supervisor', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
                              { key: 'foreman', label: 'Foreman', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                              { key: 'admin', label: 'Admin / Staff', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                              { key: 'crew', label: 'Crew / Operator', color: 'bg-slate-100 text-slate-700 border-slate-200' },
                              { key: 'other', label: 'Lainnya', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                            ];

                            const getJabatanGroup = (jabatan: string) => {
                              const j = (jabatan || '').toLowerCase();
                              if (j.includes('manager')) return 'manager';
                              if (j.includes('superintendent') || j.includes('spt')) return 'superintendent';
                              if (j.includes('supervisor') || j.includes('specialist')) return 'supervisor';
                              if (j.includes('foreman')) return 'foreman';
                              if (j.includes('admin') || j.includes('staff') || j.includes('officer')) return 'admin';
                              if (j.includes('crew') || j.includes('operator') || j.includes('technician') || j.includes('helper')) return 'crew';
                              return 'other';
                            };

                            const grouped: Record<string, any[]> = {};
                            filtered.forEach(emp => {
                              const grp = getJabatanGroup(emp.jabatan);
                              if (!grouped[grp]) grouped[grp] = [];
                              grouped[grp].push(emp);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="py-8 text-center text-xs text-slate-400">
                                  Tidak ada data karyawan aktif yang sesuai pencarian.
                                </div>
                              );
                            }

                            return (
                              <div className="max-h-80 md:max-h-96 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                {jabatanLevels.filter(lv => grouped[lv.key] && grouped[lv.key].length > 0).map(lv => {
                                  const members = grouped[lv.key];
                                  return (
                                    <details key={lv.key} open className="group/jab">
                                      <summary className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer select-none border ${lv.color} hover:shadow-sm transition-all`}>
                                        <span className="text-xs font-extrabold flex-1">{lv.label}</span>
                                        <span className="text-[11px] font-black bg-white/60 px-2 py-0.5 rounded-lg border border-black/5">{members.length} Orang</span>
                                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open/jab:rotate-180" />
                                      </summary>
                                      <div className="mt-1 ml-3 pl-3 border-l-2 border-amber-100 space-y-0.5">
                                        {members.map((emp, idx) => (
                                          <div
                                            key={emp.nik || idx}
                                            onClick={() => setSelectedEmployee(emp)}
                                            className="p-2 rounded-xl hover:bg-amber-50/60 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="w-8 h-8 rounded-lg bg-amber-100/70 border border-amber-200 flex items-center justify-center shrink-0 overflow-hidden font-bold text-amber-800 text-[10px]">
                                                {emp.photo ? (
                                                  <img src={formatAvatarUrl(emp.photo)} alt={emp.name} className="w-full h-full object-cover" />
                                                ) : (
                                                  (emp.name || 'A').charAt(0).toUpperCase()
                                                )}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700 truncate flex items-center gap-1.5">
                                                  <span>{emp.name}</span>
                                                  <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">{emp.nik}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate mt-0.5">{emp.jabatan || '-'}</div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-lg">Aktif</span>
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        ) : (
          /* PROFILE MODE (HARMONIOUS PASTEL GREEN CANVAS WITH FLOATING EXECUTIVE CARDS) */
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col lg:flex-row h-full w-full p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-[#f4faf5] via-[#edf6f0] to-[#e6f3eb] gap-4 lg:gap-6 overflow-hidden relative"
          >
            {/* SIDEBAR (Profile Info) - LUXURY EXECUTIVE PASTEL GREEN CARD */}
            <div className="lg:w-80 xl:w-92 h-full max-h-full bg-gradient-to-br from-[#eaf6ee] via-[#dff2e5] to-[#cfead7] text-slate-800 shrink-0 shadow-xl shadow-emerald-950/5 rounded-3xl z-10 p-5 lg:p-6 flex flex-col items-center relative overflow-hidden border border-emerald-300/60 ring-1 ring-emerald-500/10 transition-all">
              {/* Decorative Ambient Depth Lights */}
              <div className="absolute -top-20 -left-20 w-44 h-44 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-teal-300/25 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col items-center text-center mb-3.5 w-full shrink-0 relative z-10">
                <div className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-3xl bg-white/90 border-2 border-emerald-300/70 overflow-hidden flex items-center justify-center shrink-0 shadow-md relative ring-4 ring-emerald-200/50 ring-offset-2 ring-offset-[#dff2e5] group mx-auto">
                  {selectedEmployee.photo ? (
                    <img 
                      src={formatAvatarUrl(selectedEmployee.photo)} 
                      alt={selectedEmployee.name} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="w-16 h-16 lg:w-20 lg:h-20 text-emerald-700/60 drop-shadow-sm" />
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-xs text-white z-20">
                      <RefreshCw className="w-6 h-6 animate-spin text-white mb-1.5" />
                      <span>Mengunggah...</span>
                    </div>
                  )}
                </div>

                {canManageDatabase && (
                  <>
                    <input 
                      type="file" 
                      ref={photoInputRef} 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload} 
                    />
                    <div className="flex items-center gap-2 mt-3 flex-wrap justify-center w-full">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white active:scale-95 text-emerald-900 flex items-center gap-1.5 transition-all shadow-xs border border-emerald-300/60 backdrop-blur-md cursor-pointer"
                        title="Perbarui atau unggah foto karyawan di database"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{selectedEmployee.photo ? 'Ganti Foto' : 'Unggah Foto'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditModalMode('edit');
                          setSelectedEmployeeForEdit(selectedEmployee);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }}
                        className="text-[11px] font-bold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/15 border border-amber-300/40 cursor-pointer"
                        title="Edit data lengkap profil karyawan ini"
                      >
                        <Pencil className="w-3.5 h-3.5 text-white" />
                        <span>Edit Data</span>
                      </button>
                    </div>
                  </>
                )}

                <h2 className="text-lg lg:text-xl font-black mt-3 mb-1 leading-tight text-emerald-950 drop-shadow-xs text-center w-full tracking-tight">
                  {selectedEmployee.name}
                </h2>
                <div className="w-full flex justify-center">
                  <p className="text-emerald-900 inline-flex items-center bg-white/85 backdrop-blur-md px-3 py-0.5 rounded-full text-[11px] font-black shadow-xs border border-emerald-300/60 font-mono tracking-wider">
                    <Fingerprint className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    NIK: {selectedEmployee.nik}
                  </p>
                </div>
              </div>

              {/* Detail Profil Sidebar */}
              <div className="w-full flex-1 overflow-y-auto pr-1 space-y-2 text-slate-800 divide-y divide-emerald-200/60 custom-scrollbar-pastel text-left relative z-10">
                <div className="pt-2 first:pt-0">
                  <p className="text-emerald-700 text-[10px] font-extrabold mb-0.5 uppercase tracking-wider">Jabatan</p>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">{selectedEmployee.jabatan || '-'}</p>
                </div>
                
                <div className="pt-2">
                  <p className="text-emerald-700 text-[10px] font-extrabold mb-0.5 uppercase tracking-wider">Perusahaan</p>
                  <p className="font-bold text-slate-900 text-xs">{selectedEmployee.pt || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-white/70 hover:bg-white/95 p-2.5 rounded-2xl border border-emerald-200/70 transition-colors shadow-2xs backdrop-blur-xs">
                    <p className="text-emerald-700 text-[10px] font-extrabold mb-0.5 uppercase tracking-wider">Job Grade</p>
                    <p className="font-extrabold text-slate-900 text-xs">{selectedEmployee.jobGrade || '-'}</p>
                  </div>
                  <div className="bg-white/70 hover:bg-white/95 p-2.5 rounded-2xl border border-emerald-200/70 transition-colors shadow-2xs backdrop-blur-xs">
                    <p className="text-emerald-700 text-[10px] font-extrabold mb-0.5 uppercase tracking-wider">Golongan</p>
                    <p className="font-extrabold text-slate-900 text-xs">{selectedEmployee.gol || '-'}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-emerald-700 text-[10px] font-extrabold mb-0.5 uppercase tracking-wider">Bagian (Section)</p>
                  <p className="font-bold text-slate-900 text-xs">{selectedEmployee.section || selectedEmployee.department || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-white/70 hover:bg-white/95 p-2.5 rounded-2xl border border-emerald-200/70 transition-colors shadow-2xs backdrop-blur-xs">
                    <p className="text-emerald-700 text-[10px] font-extrabold mb-0.5 uppercase tracking-wider">DOH Awal</p>
                    <p className="font-bold text-slate-900 text-xs font-mono">{formatShortDate(selectedEmployee.tanggalAwalBergabung)}</p>
                  </div>
                  <div className="bg-white/70 hover:bg-white/95 p-2.5 rounded-2xl border border-emerald-200/70 transition-colors shadow-2xs backdrop-blur-xs">
                    <p className="text-emerald-700 text-[10px] font-extrabold mb-0.5 uppercase tracking-wider">Tgl Jabatan Baru</p>
                    <p className="font-bold text-slate-900 text-xs font-mono">{formatShortDate(selectedEmployee.tanggalJabatanBaru)}</p>
                  </div>
                </div>

                {/* MASA KERJA JABATAN DENGAN DROPDOWN LIST */}
                <div className="pt-2.5 pb-1 space-y-1.5">
                  <div className="bg-white/80 hover:bg-white/95 p-3 rounded-2xl border border-emerald-300/70 transition-all shadow-xs backdrop-blur-xs">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                          Masa Kerja Jabatan
                        </span>
                      </div>

                      {/* Drop Down List: Sekarang vs Sebelumnya */}
                      <div className="relative">
                        <select
                          value={tenureDropdownPeriod}
                          onChange={(e) => setTenureDropdownPeriod(e.target.value as 'sekarang' | 'sebelumnya')}
                          className="bg-emerald-50 hover:bg-white text-emerald-950 text-[10.5px] font-extrabold pl-2.5 pr-6 py-0.5 rounded-lg border border-emerald-300/80 cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                          title="Pilih masa kerja jabatan sekarang atau sebelumnya"
                        >
                          <option value="sekarang">Sekarang</option>
                          <option value="sebelumnya">Sebelumnya</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-emerald-700 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Nilai Masa Kerja Jabatan */}
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                        {tenureInfo[tenureDropdownPeriod].value}
                      </p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-2xs ${
                        tenureDropdownPeriod === 'sekarang'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                          : 'bg-amber-100 text-amber-800 border border-amber-300/60'
                      }`}>
                        {tenureDropdownPeriod === 'sekarang' ? 'Jabatan Sekarang' : 'Jabatan Sebelumnya'}
                      </span>
                    </div>

                    {/* Keterangan */}
                    <div className="mt-2 text-[9.5px] text-emerald-900 leading-tight flex items-start gap-1.5 font-medium bg-emerald-50/70 p-2 rounded-xl border border-emerald-200/80">
                      <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-emerald-950 mr-1">
                          Keterangan {tenureDropdownPeriod === 'sekarang' ? 'Sekarang:' : 'Sebelumnya:'}
                        </strong>
                        {tenureInfo[tenureDropdownPeriod].keterangan}
                      </span>
                    </div>

                    {/* Informasi Total Masa Kerja */}
                    <div className="mt-2 pt-2 border-t border-emerald-200/80 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-700 font-medium">Masa Kerja Total (DOH):</span>
                      <span className="font-extrabold text-slate-900 font-mono">{tenureInfo.total.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT AREA (CLEAN EXECUTIVE WHITE CANVAS ON PASTEL GREEN BACKDROP) */}
            <div className="flex-1 h-full max-h-full p-5 sm:p-6 lg:p-8 overflow-y-auto bg-white/70 backdrop-blur-xs rounded-3xl shadow-xs border border-emerald-200/60 pb-24 ring-1 ring-emerald-500/5 transition-all custom-scrollbar">
              
              {/* HEADER W/ SPONSOR & EDIT BUTTON */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="bg-teal-50 text-teal-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-teal-200">
                      {selectedEmployee.pt || 'PT TBP'}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {selectedEmployee.section || selectedEmployee.department || 'Preparation & Laboratory'}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{selectedEmployee.name}</h1>
                  <p className="text-slate-600 font-semibold text-sm sm:text-base mt-0.5">{selectedEmployee.jabatan || 'Karyawan'}</p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  {canManageDatabase && (
                    <>
                      <Button
                        onClick={() => {
                          setEditModalMode('edit');
                          setSelectedEmployeeForEdit(selectedEmployee);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }}
                        size="sm"
                        className="bg-teal-50 hover:bg-teal-100 text-teal-800 flex items-center gap-1.5 rounded-xl text-xs font-bold px-4 py-2.5 shadow-2xs border border-teal-200 active:scale-95 transition-all cursor-pointer"
                        title="Edit data karyawan ini"
                      >
                        <Pencil className="w-3.5 h-3.5 text-teal-600" />
                        <span>Edit Data Karyawan</span>
                      </Button>

                      <Button
                        onClick={() => {
                          setEditModalMode('add');
                          setSelectedEmployeeForEdit(null);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 rounded-xl text-xs font-bold px-4 py-2.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                        title="Tambah karyawan baru"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Karyawan</span>
                      </Button>
                    </>
                  )}
                  
                  <div className="p-3.5 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white shadow-xs border border-amber-200/80 rounded-2xl flex items-center gap-3 min-w-[200px]">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest leading-none mb-1">HR Sponsor</p>
                      <p className="font-black text-slate-800 text-sm leading-tight">{selectedEmployee.sponsor || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                {/* STATUS & KEHADIRAN CARDS (SOFT PASTEL PALETTE & DIRECTLY EDITABLE) */}
                <div className="xl:col-span-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Status & Kehadiran</span>
                    </h3>
                    {canManageDatabase && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditModalMode('edit');
                          setSelectedEmployeeForEdit(selectedEmployee);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 text-emerald-800 border border-emerald-200/80 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Edit Status & Kehadiran Karyawan"
                      >
                        <Pencil className="w-3 h-3 text-emerald-600" />
                        <span>Edit Status</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Status Karyawan */}
                    <div 
                      onClick={() => {
                        if (canManageDatabase) {
                          setEditModalMode('edit');
                          setSelectedEmployeeForEdit(selectedEmployee);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }
                      }}
                      className={`bg-gradient-to-br from-[#eaf7ee] via-[#def2e3] to-[#d2ebd9] rounded-2xl p-4 text-emerald-950 shadow-2xs border border-emerald-300/70 transition-all hover:-translate-y-0.5 hover:shadow-sm ${canManageDatabase ? 'cursor-pointer group' : ''}`}
                      title={canManageDatabase ? "Klik untuk mengedit Status & Kehadiran" : undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-emerald-800 text-[10px] uppercase font-black tracking-wider">Status Karyawan</p>
                        <div className="flex items-center gap-1.5">
                          {canManageDatabase && <Pencil className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                      </div>
                      <p className="font-black text-xl text-emerald-950 tracking-tight">{selectedEmployee.statusKaryawan || '-'}</p>
                    </div>

                    {/* Status Kontrak */}
                    <div 
                      onClick={() => {
                        if (canManageDatabase) {
                          setEditModalMode('edit');
                          setSelectedEmployeeForEdit(selectedEmployee);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }
                      }}
                      className={`bg-gradient-to-br from-[#fef7ee] via-[#fdefdf] to-[#fce3cc] rounded-2xl p-4 text-amber-950 shadow-2xs border border-amber-300/70 transition-all hover:-translate-y-0.5 hover:shadow-sm ${canManageDatabase ? 'cursor-pointer group' : ''}`}
                      title={canManageDatabase ? "Klik untuk mengedit Status & Kehadiran" : undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-amber-800 text-[10px] uppercase font-black tracking-wider">Status Kontrak</p>
                        {canManageDatabase && <Pencil className="w-3 h-3 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      <p className="font-black text-xl text-amber-950 tracking-tight">{selectedEmployee.statusKontrak || '-'}</p>
                    </div>

                    {/* Tgl Efektif Tidak Bekerja (Conditional) */}
                    {selectedEmployee.tanggalEfektifTidakBekerja && (
                      <div 
                        onClick={() => {
                          if (canManageDatabase) {
                            setEditModalMode('edit');
                            setSelectedEmployeeForEdit(selectedEmployee);
                            setEditModalTab('job');
                            setIsEditModalOpen(true);
                          }
                        }}
                        className={`col-span-2 bg-gradient-to-br from-[#fff1f3] via-[#ffe4e8] to-[#ffd8df] rounded-2xl p-4 text-rose-950 shadow-2xs border border-rose-300/70 flex justify-between items-center transition-all hover:-translate-y-0.5 hover:shadow-sm ${canManageDatabase ? 'cursor-pointer group' : ''}`}
                        title={canManageDatabase ? "Klik untuk mengedit Status & Kehadiran" : undefined}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-rose-800 text-[10px] uppercase font-black tracking-wider">Tgl Efektif Tidak Bekerja</p>
                            {canManageDatabase && <Pencil className="w-3 h-3 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                          <p className="font-black text-base font-mono text-rose-950">{formatShortDate(selectedEmployee.tanggalEfektifTidakBekerja)}</p>
                        </div>
                        <Calendar className="w-6 h-6 text-rose-400" />
                      </div>
                    )}

                    {/* Sisa Cuti (CT) */}
                    <div 
                      onClick={() => {
                        if (canManageDatabase) {
                          setEditModalMode('edit');
                          setSelectedEmployeeForEdit(selectedEmployee);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }
                      }}
                      className={`bg-gradient-to-br from-[#edf9fb] via-[#e1f4f7] to-[#d3eef2] rounded-2xl p-4 text-teal-950 shadow-2xs border border-teal-300/70 transition-all hover:-translate-y-0.5 hover:shadow-sm ${canManageDatabase ? 'cursor-pointer group' : ''}`}
                      title={canManageDatabase ? "Klik untuk mengedit Status & Kehadiran" : undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-teal-800 text-[10px] uppercase font-black tracking-wider">Sisa Cuti (CT)</p>
                        {canManageDatabase && <Pencil className="w-3 h-3 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      <p className="font-black text-2xl text-teal-950 tracking-tight">{selectedEmployee.sisaCt || '-'}</p>
                    </div>

                    {/* Jatuh Tempo CT */}
                    <div 
                      onClick={() => {
                        if (canManageDatabase) {
                          setEditModalMode('edit');
                          setSelectedEmployeeForEdit(selectedEmployee);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }
                      }}
                      className={`bg-gradient-to-br from-[#f1f4fe] via-[#e5ecfc] to-[#dae4f9] rounded-2xl p-4 text-indigo-950 shadow-2xs border border-indigo-300/70 transition-all hover:-translate-y-0.5 hover:shadow-sm ${canManageDatabase ? 'cursor-pointer group' : ''}`}
                      title={canManageDatabase ? "Klik untuk mengedit Status & Kehadiran" : undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-indigo-800 text-[10px] uppercase font-black tracking-wider">Jatuh Tempo CT</p>
                        {canManageDatabase && <Pencil className="w-3 h-3 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      <p className="font-black text-sm sm:text-base text-indigo-950 font-mono tracking-tight">{formatShortDate(selectedEmployee.jatuhTempoCt)}</p>
                    </div>

                    {/* Tanggal Permanen */}
                    <div 
                      onClick={() => {
                        if (canManageDatabase) {
                          setEditModalMode('edit');
                          setSelectedEmployeeForEdit(selectedEmployee);
                          setEditModalTab('job');
                          setIsEditModalOpen(true);
                        }
                      }}
                      className={`col-span-2 bg-gradient-to-br from-[#f0f7ff] via-[#e5f0fe] to-[#d6e7fd] rounded-2xl p-4 text-blue-950 shadow-2xs border border-blue-300/70 flex justify-between items-center transition-all hover:-translate-y-0.5 hover:shadow-sm ${canManageDatabase ? 'cursor-pointer group' : ''}`}
                      title={canManageDatabase ? "Klik untuk mengedit Status & Kehadiran" : undefined}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-blue-800 text-[10px] uppercase font-black tracking-wider">Tanggal Permanen</p>
                          {canManageDatabase && <Pencil className="w-3 h-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                        <p className="font-black text-base text-blue-950 font-mono">{formatShortDate(selectedEmployee.tanggalPermanent)}</p>
                      </div>
                      <Calendar className="w-7 h-7 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* REKAP ABSENSI */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 2026 */}
                    <Card className="p-5 shadow-xs border border-slate-200/80 bg-white rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center">
                          <BarChart3 className="w-4 h-4 mr-2 text-teal-600" />
                          Rekap Absensi 2026
                        </h4>
                        {(selectedEmployee.attendance2026?.sakitSite > 0 || selectedEmployee.attendance2026?.sakitLuar > 0) && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            SS: {selectedEmployee.attendance2026.sakitSite} | SL: {selectedEmployee.attendance2026.sakitLuar}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2.5 rounded-xl bg-teal-50/70 border border-teal-200/80">
                          <p className="text-[10px] md:text-xs uppercase font-extrabold text-teal-800 mb-1">Izin</p>
                          <p className="font-black text-lg text-slate-900">{selectedEmployee.attendance2026?.izin ?? 0}</p>
                        </div>
                        <div className="text-center p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/80">
                          <p className="text-[10px] md:text-xs uppercase font-extrabold text-sky-800 mb-1">I.Khusus</p>
                          <p className="font-black text-lg text-slate-900">{selectedEmployee.attendance2026?.izinKhusus ?? 0}</p>
                        </div>
                        <div className="text-center p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                          <p className="text-[10px] md:text-xs uppercase font-extrabold text-amber-800 mb-1">Sakit</p>
                          <p className="font-black text-lg text-amber-900">{selectedEmployee.attendance2026?.sakit ?? 0}</p>
                        </div>
                        <div className="text-center p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
                          <p className="text-[10px] md:text-xs uppercase font-extrabold text-rose-700 mb-1">Alpa</p>
                          <p className="font-black text-lg text-rose-700">{selectedEmployee.attendance2026?.alpa ?? 0}</p>
                        </div>
                      </div>
                    </Card>

                    {/* 2025 */}
                    <Card className="p-5 shadow-xs border border-slate-200/80 bg-white rounded-2xl opacity-90">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-600 text-sm flex items-center">
                          <BarChart3 className="w-4 h-4 mr-2 text-slate-400" />
                          Rekap Absensi 2025
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Arsip</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">Izin</p>
                          <p className="font-bold text-base text-slate-700">{selectedEmployee.attendance2025?.izin ?? 0}</p>
                        </div>
                        <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">I.Khusus</p>
                          <p className="font-bold text-base text-slate-700">{selectedEmployee.attendance2025?.izinKhusus ?? 0}</p>
                        </div>
                        <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">Sakit</p>
                          <p className="font-bold text-base text-slate-700">{selectedEmployee.attendance2025?.sakit ?? 0}</p>
                        </div>
                        <div className="text-center p-2.5 rounded-xl bg-rose-50/60 border border-rose-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-rose-500 mb-1">Alpa</p>
                          <p className="font-bold text-base text-rose-600">{selectedEmployee.attendance2025?.alpa ?? 0}</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* CATATAN & LIST ACHIEVEMENTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1: Catatan Karyawan */}
                    <Card className="p-5 shadow-xs border border-slate-200/80 bg-white rounded-2xl flex flex-col justify-between min-h-[220px]">
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                              <StickyNote className="w-4 h-4" />
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-800 tracking-tight">Catatan Karyawan</h4>
                          </div>
                          {canEditCatatan && !isEditingNotes && (
                            <button
                              type="button"
                              onClick={() => {
                                setNoteContent(selectedEmployee.catatan || '');
                                setIsEditingNotes(true);
                              }}
                              className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-amber-200"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit Catatan</span>
                            </button>
                          )}
                        </div>

                        {isEditingNotes ? (
                          <div className="pt-3 flex-1 flex flex-col space-y-2">
                            <textarea
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                              placeholder="Tuliskan catatan di sini..."
                              className="w-full flex-1 min-h-[120px] p-2 text-[13px] md:text-sm italic font-medium text-slate-800 placeholder:text-slate-400 bg-transparent border-0 border-b-2 border-amber-400 focus:outline-none focus:border-amber-600 resize-none leading-relaxed"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isSavingNotes}
                                onClick={() => {
                                  setNoteContent(selectedEmployee.catatan || '');
                                  setIsEditingNotes(false);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                disabled={isSavingNotes}
                                onClick={handleSaveNotes}
                                className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {isSavingNotes ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Simpan</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              if (canEditCatatan) {
                                setNoteContent(selectedEmployee.catatan || '');
                                setIsEditingNotes(true);
                              }
                            }}
                            className={`py-3 flex-1 flex flex-col justify-center min-h-[140px] max-h-[170px] overflow-y-auto custom-scrollbar ${
                              canEditCatatan ? 'cursor-pointer group' : ''
                            }`}
                            title={canEditCatatan ? 'Klik untuk mengubah catatan' : undefined}
                          >
                            {selectedEmployee.catatan ? (
                              <div className="pl-3.5 border-l-2 border-amber-400">
                                <p className="italic text-[13px] md:text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap select-text">
                                  "{selectedEmployee.catatan}"
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center py-6">
                                <p className="italic text-sm text-slate-400 font-medium">
                                  {canEditCatatan ? 'Belum ada catatan. Klik di sini untuk menambahkan catatan...' : 'Tidak ada catatan.'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Card 2: List Achievements */}
                    <Card className="p-5 shadow-xs border border-slate-200/80 bg-white rounded-2xl flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                              <Trophy className="w-4 h-4 text-amber-500" />
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-800 tracking-tight">List Achievements</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {achievementList.length}
                            </span>
                          </div>
                          {canManageDatabase && (
                            <button
                              type="button"
                              onClick={() => setIsAddAchievementModalOpen(true)}
                              className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100/70 hover:bg-amber-100 transition-all cursor-pointer border border-amber-300"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah</span>
                            </button>
                          )}
                        </div>

                        <div className="max-h-[160px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                          {achievementList.length > 0 ? (
                            achievementList.map((ach: any, idx: number) => (
                              <div
                                key={ach.id || idx}
                                className="p-3 rounded-xl bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-white border border-amber-200/70 hover:border-amber-300 transition-all group relative"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
                                      <Award className="w-3.5 h-3.5" />
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="font-bold text-xs text-slate-900 truncate">{ach.title}</h5>
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                          {ach.category}
                                        </span>
                                      </div>
                                      {ach.description && (
                                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                                          {ach.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                        {ach.date && (
                                          <span className="font-mono text-slate-500 flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5" /> {formatShortDate(ach.date)}
                                          </span>
                                        )}
                                        {ach.notes && (
                                          <span className="italic text-slate-500 truncate max-w-[180px]">
                                            • {ach.notes}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {canManageDatabase && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAchievement(ach.id)}
                                      title="Hapus achievement"
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="h-full min-h-[110px] flex flex-col items-center justify-center text-center text-slate-400">
                              <Trophy className="w-6 h-6 mb-1 text-slate-300" />
                              <p className="text-xs font-medium">Belum ada achievement/prestasi tercatat</p>
                              {canManageDatabase && (
                                <p className="text-[10px] text-amber-600 mt-0.5">Import sheet Achievements atau klik '+ Tambah'</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              {/* DATA DIRI & ALAMAT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 shadow-xs border border-slate-200/80 bg-white rounded-2xl">
                  <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center">
                    <User className="w-5 h-5 mr-2 text-teal-600" />
                    Data Diri (Umum)
                  </h3>
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider col-span-1">NIK KTP</p>
                      <p className="text-sm font-bold text-slate-900 col-span-2 font-mono">{selectedEmployee.ktp || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider col-span-1">TTL</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">
                        {selectedEmployee.tempatLahir && selectedEmployee.tempatLahir !== '-'
                          ? `${selectedEmployee.tempatLahir}, ${formatTtlDate(selectedEmployee.tanggalLahir)}`
                          : formatTtlDate(selectedEmployee.tanggalLahir)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider col-span-1">Nomor Telp.</p>
                      <p className="text-sm font-bold text-slate-900 col-span-2 font-mono">{selectedEmployee.phone || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider col-span-1">Kel. Kandung</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.keluargaKandung || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider col-span-1">Telp Kel.</p>
                      <p className="text-sm font-bold text-slate-900 col-span-2 font-mono">{selectedEmployee.phoneKeluarga || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider col-span-1">Org Terdekat</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.orangTerdekat || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pb-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider col-span-1">Telp Darurat</p>
                      <p className="text-sm font-bold text-slate-900 col-span-2 font-mono">{selectedEmployee.phoneDarurat || '-'}</p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-6">
                  <Card className="p-6 shadow-xs border border-slate-200/80 bg-white rounded-2xl h-full flex flex-col">
                    <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-teal-600" />
                      Alamat KTP & Domisili
                    </h3>
                    <div className="space-y-4 flex-1">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sesuai KTP</p>
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                          {selectedEmployee.alamatKtp || 'Tidak ada data alamat KTP.'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Domisili (Tinggal)</p>
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                          {selectedEmployee.alamatDomisili || 'Tidak ada data domisili.'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* SECTION: HISTORI ABSENSI & ALASAN */}
              {(() => {
                const att26 = selectedEmployee.attendance2026 || selectedEmployee.attendance?.['2026'] || selectedEmployee.attendance?.[2026] || selectedEmployee.attendanceData?.['2026'] || selectedEmployee.attendanceData?.[2026] || {};
                const parseDateList = (val?: any) => {
                  if (!val) return [];
                  const rawList = Array.isArray(val) ? val : String(val).split(/[\r\n,;]+/);
                  return rawList
                    .map(s => String(s).trim())
                    .filter(s => s && s !== '-' && s !== '#N/A' && s !== '0')
                    .map(s => formatShortDate(s));
                };
                const parseReasonList = (val?: any) => {
                  if (!val) return [];
                  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
                  return String(val)
                    .split(/\r?\n/)
                    .map(s => s.trim())
                    .filter(s => s && s !== '-' && s !== '#N/A');
                };

                const izinDates = parseDateList(att26.tanggalIzin || att26.tanggal_izin);
                const izinKhususDates = parseDateList(att26.tanggalIzinKhusus || att26.tanggal_izin_khusus);
                const sakitSiteDates = parseDateList(att26.tanggalSakitSite || att26.tanggal_sakit_site);
                const sakitLuarDates = parseDateList(att26.tanggalSakitLuar || att26.tanggal_sakit_luar);
                const alpaDates = parseDateList(
                  att26.tanggalAlpa || 
                  att26.tanggalAlpha || 
                  att26.tanggal_alpa || 
                  att26.tanggal_alpha || 
                  att26.alpaTanggal || 
                  att26.alphaTanggal ||
                  (typeof att26.alpa === 'string' && (att26.alpa.includes('-') || att26.alpa.includes('/') || att26.alpa.includes('\n') || /[a-z]/i.test(att26.alpa)) ? att26.alpa : '') ||
                  (typeof att26.alpha === 'string' && (att26.alpha.includes('-') || att26.alpha.includes('/') || att26.alpha.includes('\n') || /[a-z]/i.test(att26.alpha)) ? att26.alpha : '')
                );

                const maxRows = Math.max(
                  izinDates.length,
                  izinKhususDates.length,
                  sakitSiteDates.length,
                  sakitLuarDates.length,
                  alpaDates.length
                );

                const alasanIzinItems = parseReasonList(att26.alasanIzin);
                const alasanIzinKhususItems = parseReasonList(att26.alasanIzinKhusus);
                const rawAlasanSakitSite = parseReasonList(att26.alasanSakitSite);
                const rawAlasanSakitLuar = parseReasonList(att26.alasanSakitLuar);
                const rawLegacySakit = parseReasonList(att26.alasanSakit);
                
                const alasanSakitSiteItems = rawAlasanSakitSite.length > 0
                  ? rawAlasanSakitSite
                  : (att26.alasanSakitSite ? [String(att26.alasanSakitSite)] : rawLegacySakit.filter(r => /site|ss|klinik/i.test(r)));

                const alasanSakitLuarItems = rawAlasanSakitLuar.length > 0
                  ? rawAlasanSakitLuar
                  : (att26.alasanSakitLuar ? [String(att26.alasanSakitLuar)] : rawLegacySakit.filter(r => /luar|sl|rs|rumah sakit|dokter luar/i.test(r)));

                return (
                  <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-[#22a7b8]" />
                        Tanggal Absensi 2026 & Alasan
                      </h3>
                      {canManageDatabase && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAddCategory('tanggalIzin');
                              setIsAddAttendanceModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#135e69] border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#22a7b8]" />
                            <span>+ Tambah Absensi / Alasan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit Rekap</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                      <Card className="xl:col-span-7 p-0 overflow-hidden border-slate-200/60 shadow-sm flex flex-col max-h-[380px]">
                        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[320px] custom-scrollbar">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                              <tr>
                                <th className="px-4 py-3 font-bold text-[#135e69] whitespace-nowrap bg-slate-50">Tanggal Izin</th>
                                <th className="px-4 py-3 font-bold text-[#22a7b8] whitespace-nowrap bg-slate-50">Izin Khusus</th>
                                <th className="px-4 py-3 font-bold text-amber-700 whitespace-nowrap bg-slate-50">Sakit Site (SS)</th>
                                <th className="px-4 py-3 font-bold text-amber-600 whitespace-nowrap bg-slate-50">Sakit Luar (SL)</th>
                                <th className="px-4 py-3 font-bold text-rose-600 whitespace-nowrap bg-slate-50">Alpa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {maxRows === 0 ? (
                                <tr className="border-b border-slate-50 bg-slate-50/30">
                                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400 font-medium">
                                    Belum ada catatan rincian tanggal absensi untuk tahun 2026
                                  </td>
                                </tr>
                              ) : (
                                Array.from({ length: maxRows }).map((_, idx) => (
                                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                      {izinDates[idx] ? (
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-[#e6f7f9] text-[#135e69] border border-[#a2e0e8]">
                                          {izinDates[idx]}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                      {izinKhususDates[idx] ? (
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-[#e6f7f9] text-[#22a7b8] border border-[#a2e0e8]">
                                          {izinKhususDates[idx]}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                      {sakitSiteDates[idx] ? (
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                          {sakitSiteDates[idx]}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                      {sakitLuarDates[idx] ? (
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                          {sakitLuarDates[idx]}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                      {alpaDates[idx] ? (
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                          {alpaDates[idx]}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {canManageDatabase && (
                          <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs px-4">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Total {maxRows} baris rincian tanggal
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAddCategory('tanggalIzin');
                                setIsAddAttendanceModalOpen(true);
                              }}
                              className="text-xs font-bold text-[#135e69] hover:text-[#22a7b8] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Tambah Tanggal Izin / Sakit</span>
                            </button>
                          </div>
                        )}
                      </Card>

                      <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* 1. Alasan Izin */}
                        <Card className="p-3.5 shadow-sm border-slate-200/60 bg-white flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#22a7b8]"></span>
                                <span className="text-[#135e69]">Alasan Izin</span>
                              </p>
                              <div className="flex items-center gap-1.5">
                                {canManageDatabase && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAddCategory('alasanIzin');
                                      setIsAddAttendanceModalOpen(true);
                                    }}
                                    className="w-5 h-5 rounded-md bg-teal-50 hover:bg-teal-100 text-[#135e69] flex items-center justify-center transition-colors cursor-pointer"
                                    title="Tambah Alasan Izin"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
                                {alasanIzinItems.length > 0 && (
                                  <span className="text-[10px] bg-[#e6f7f9] text-[#135e69] border border-[#a2e0e8] px-2 py-0.5 rounded-full font-bold">
                                    {alasanIzinItems.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-50/80 p-2.5 rounded-xl text-sm border border-slate-100 min-h-[75px] max-h-36 overflow-y-auto">
                              {alasanIzinItems.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {alasanIzinItems.map((reason, i) => (
                                    <li key={i} className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-2 rounded-lg border border-slate-200/60 shadow-xs">
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Tidak ada catatan alasan izin.</p>
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* 2. Alasan Izin Khusus */}
                        <Card className="p-3.5 shadow-sm border-slate-200/60 bg-white flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#135e69]"></span>
                                <span className="text-[#135e69]">Alasan Izin Khusus</span>
                              </p>
                              <div className="flex items-center gap-1.5">
                                {canManageDatabase && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAddCategory('alasanIzinKhusus');
                                      setIsAddAttendanceModalOpen(true);
                                    }}
                                    className="w-5 h-5 rounded-md bg-teal-50 hover:bg-teal-100 text-[#135e69] flex items-center justify-center transition-colors cursor-pointer"
                                    title="Tambah Alasan Izin Khusus"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
                                {alasanIzinKhususItems.length > 0 && (
                                  <span className="text-[10px] bg-[#e6f7f9] text-[#135e69] border border-[#a2e0e8] px-2 py-0.5 rounded-full font-bold">
                                    {alasanIzinKhususItems.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-50/80 p-2.5 rounded-xl text-sm border border-slate-100 min-h-[75px] max-h-36 overflow-y-auto">
                              {alasanIzinKhususItems.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {alasanIzinKhususItems.map((reason, i) => (
                                    <li key={i} className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-2 rounded-lg border border-slate-200/60 shadow-xs">
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Tidak ada catatan alasan izin khusus.</p>
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* 3. Alasan Sakit Site (SS) */}
                        <Card className="p-3.5 shadow-sm border-slate-200/60 bg-white flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span className="text-amber-900">Alasan Sakit Site (SS)</span>
                              </p>
                              <div className="flex items-center gap-1.5">
                                {canManageDatabase && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAddCategory('alasanSakitSite');
                                      setIsAddAttendanceModalOpen(true);
                                    }}
                                    className="w-5 h-5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Tambah Alasan Sakit Site"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
                                {alasanSakitSiteItems.length > 0 && (
                                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                    {alasanSakitSiteItems.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-50/80 p-2.5 rounded-xl text-sm border border-slate-100 min-h-[75px] max-h-36 overflow-y-auto">
                              {alasanSakitSiteItems.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {alasanSakitSiteItems.map((reason, i) => (
                                    <li key={i} className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-2 rounded-lg border border-slate-200/60 shadow-xs">
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Tidak ada catatan alasan sakit site.</p>
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* 4. Alasan Sakit Luar (SL) */}
                        <Card className="p-3.5 shadow-sm border-slate-200/60 bg-white flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                <span className="text-amber-800">Alasan Sakit Luar (SL)</span>
                              </p>
                              <div className="flex items-center gap-1.5">
                                {canManageDatabase && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAddCategory('alasanSakitLuar');
                                      setIsAddAttendanceModalOpen(true);
                                    }}
                                    className="w-5 h-5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Tambah Alasan Sakit Luar"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
                                {alasanSakitLuarItems.length > 0 && (
                                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                    {alasanSakitLuarItems.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-50/80 p-2.5 rounded-xl text-sm border border-slate-100 min-h-[75px] max-h-36 overflow-y-auto">
                              {alasanSakitLuarItems.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {alasanSakitLuarItems.map((reason, i) => (
                                    <li key={i} className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-2 rounded-lg border border-slate-200/60 shadow-xs">
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Tidak ada catatan alasan sakit luar.</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* DIAGRAM ABSENSI KARYAWAN 2026 */}
              {(() => {
                const att26 = selectedEmployee.attendance2026 || {};
                const sisaCuti = Number(selectedEmployee.sisaCt) || 0;
                const izin = (Number(att26.izin) || 0) + (Number(att26.izinKhusus) || 0);
                const sakit = Number(att26.sakit) || 0;
                const alpa = Number(att26.alpa) || 0;

                const ESTIMASI_HARI_KERJA = 260;
                const totalAbsen = izin + sakit + alpa;
                const estimasiHadir = Math.max(0, ESTIMASI_HARI_KERJA - totalAbsen);
                const pctHadir = Math.min(100, Math.max(0, Math.round((estimasiHadir / ESTIMASI_HARI_KERJA) * 100)));
                const pctCuti = Math.min(100, Math.max(0, Math.round((sisaCuti / 12) * 100)));
                const pctIzin = Math.min(100, Math.round((izin / ESTIMASI_HARI_KERJA) * 100));
                const pctSakit = Math.min(100, Math.round((sakit / ESTIMASI_HARI_KERJA) * 100));
                const pctAlpa = Math.min(100, Math.round((alpa / ESTIMASI_HARI_KERJA) * 100));

                return (
                  <Card className="p-6 shadow-sm border-slate-200/60 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-[#22a7b8]" />
                        Diagram Absensi Karyawan 2026
                      </h3>
                      <div className="text-xs text-slate-500 font-medium">
                        Kehadiran: <span className="font-bold text-[#135e69]">{pctHadir}%</span> (Est. {estimasiHadir} Hari)
                      </div>
                    </div>

                    <div className="h-56 flex items-end justify-around px-4 pb-4 border-b border-slate-200 gap-2">
                      {/* Sisa Cuti */}
                      <div className="flex flex-col items-center flex-1 max-w-[80px] group">
                        <span className="text-[11px] font-bold text-[#135e69] mb-1 group-hover:scale-110 transition-transform">
                          {sisaCuti} Hari ({pctCuti}%)
                        </span>
                        <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                          <div 
                            className="w-full bg-[#22a7b8] rounded-t-lg transition-all duration-500 group-hover:brightness-95" 
                            style={{ height: `${Math.max(8, pctCuti)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold mt-2 text-slate-700">%Cuti</span>
                      </div>

                      {/* Kehadiran */}
                      <div className="flex flex-col items-center flex-1 max-w-[80px] group">
                        <span className="text-[11px] font-bold text-[#c77d07] mb-1 group-hover:scale-110 transition-transform">
                          {pctHadir}%
                        </span>
                        <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                          <div 
                            className="w-full bg-[#f09b13] rounded-t-lg transition-all duration-500 group-hover:brightness-95" 
                            style={{ height: `${Math.max(8, pctHadir)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold mt-2 text-slate-700">%Hadir</span>
                      </div>

                      {/* Izin */}
                      <div className="flex flex-col items-center flex-1 max-w-[80px] group">
                        <span className="text-[11px] font-bold text-slate-600 mb-1 group-hover:scale-110 transition-transform">
                          {izin} Hari ({pctIzin}%)
                        </span>
                        <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                          <div 
                            className="w-full bg-slate-400 rounded-t-lg transition-all duration-500 group-hover:brightness-95" 
                            style={{ height: `${Math.max(8, pctIzin)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold mt-2 text-slate-700">%Izin</span>
                      </div>

                      {/* Sakit */}
                      <div className="flex flex-col items-center flex-1 max-w-[80px] group">
                        <span className="text-[11px] font-bold text-amber-700 mb-1 group-hover:scale-110 transition-transform">
                          {sakit} Hari ({pctSakit}%)
                        </span>
                        <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                          <div 
                            className="w-full bg-amber-500 rounded-t-lg transition-all duration-500 group-hover:brightness-95" 
                            style={{ height: `${Math.max(8, pctSakit)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold mt-2 text-slate-700">%Sakit</span>
                      </div>

                      {/* Alpha */}
                      <div className="flex flex-col items-center flex-1 max-w-[80px] group">
                        <span className="text-[11px] font-bold text-rose-600 mb-1 group-hover:scale-110 transition-transform">
                          {alpa} Hari ({pctAlpa}%)
                        </span>
                        <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                          <div 
                            className="w-full bg-rose-500 rounded-t-lg transition-all duration-500 group-hover:brightness-95" 
                            style={{ height: `${Math.max(8, pctAlpa)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold mt-2 text-slate-700">%Alpha</span>
                      </div>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-4 italic">
                      * Diagram Absensi Laboratorium (Palet Cyan #22A7B8 &amp; Ochre #F09B13)
                    </p>
                  </Card>
                );
              })()}

              {/* SECTION: DATA KONSELING, SANKSI DISIPLIN & SPDK */}
              {(() => {
                const cData = selectedEmployee.counselingSpdk || (selectedEmployee as any).counseling || {};
                const totalSpNum = parseInt(String(cData.totalSp || cData.total_sp || '0').trim(), 10) || 0;
                
                const rawMasaBerlaku = cData.masaBerlakuSanksi || cData.masa_berlaku_sanksi || cData.masaBerlaku || cData.masa_berlaku || cData.periodeBerlaku || cData.periode_berlaku || cData.tanggalBerlaku || cData.tanggal_berlaku || '';
                const rawMasaPemulihan1 = cData.masaPemulihan1 || cData.masa_pemulihan_1 || cData.masaPemulihanI || cData.pemulihan1 || cData.pemulihanI || cData.pemulihan_1 || cData.pemulihan_i || '';
                const rawMasaPemulihan2 = cData.masaPemulihan2 || cData.masa_pemulihan_2 || cData.masaPemulihanIi || cData.pemulihan2 || cData.pemulihanIi || cData.pemulihan_2 || cData.pemulihan_ii || '';
                const alasanKonseling = cData.alasanKonseling || cData.alasan_konseling || cData.alasanPembinaan || cData.alasan_pembinaan || '';
                const alasanSp = cData.alasanSp || cData.alasan_sp || cData.alasanSuratPeringatan || cData.alasan_surat_peringatan || cData.alasan || cData.alasanSanksi || cData.alasan_sanksi || cData.alasanPelanggaran || cData.alasan_pelanggaran || '';
                const keterangan = cData.keterangan || cData.keterangan_sp || cData.keteranganSp || cData.catatan || '';
                const pernahSpSebelumnya = cData.pernahSpSebelumnya || cData.pernah_sp_sebelumnya || cData.pernahSp || cData.pernah_sp || 'Tidak';
                const pernahTerlibatSpdk = cData.pernahTerlibatSpdk || cData.pernah_terlibat_spdk || cData.spdk || 'Tidak';
                const kategoriSpdk = cData.kategoriSpdk || cData.kategori_spdk || cData.kategoriSanksiSpdk || cData.kategori_sanksi_spdk || cData.kategori || cData.kategoriSanksi || '';
                const tindakanSpdk = cData.tindakanSpdk || cData.tindakan_spdk || cData.tindakanDisiplinSpdk || cData.tindakan_disiplin_spdk || cData.tindakan || cData.tindakanDisiplin || '';
                const kronologiSpdk = cData.kronologiSpdk || cData.kronologi_spdk || cData.kronologiKejadianSpdk || cData.kronologi_kejadian_spdk || cData.kronologi || cData.kronologiKejadian || '';
                const bulanKonseling = cData.bulanKonseling || cData.bulan_konseling || cData.bulan || '';
                const totalSpDisplay = cData.totalSp || cData.total_sp || '';

                const k1 = cData.konseling1 || cData.konseling_1 || '';
                const k2 = cData.konseling2 || cData.konseling_2 || '';
                const k3 = cData.konseling3 || cData.konseling_3 || '';
                const st = cData.st || '';
                const sp1 = cData.sp1 || cData.sp_1 || '';
                const sp2 = cData.sp2 || cData.sp_2 || '';
                const sp3 = cData.sp3 || cData.sp_3 || '';
                const sppt = cData.sppt || cData.sp_pt || '';
                const tanggalSp = cData.tanggalSp || cData.tanggal_sp || '';
                const phk = cData.phk || '';

                // Deteksi apakah personil memiliki catatan SP (SP 1, 2, 3, SPPT, ST)
                const hasSpMajor = Boolean(
                  (sp1 && sp1 !== '-' && sp1 !== '0') || 
                  (sp2 && sp2 !== '-' && sp2 !== '0') || 
                  (sp3 && sp3 !== '-' && sp3 !== '0') || 
                  (sppt && sppt !== '-' && sppt !== '0')
                );
                const hasSt = Boolean(st && st !== '-' && st !== '0');
                const hasPhk = Boolean(phk && phk !== '-' && phk !== '0');
                const hasCounseling = Boolean(
                  (k1 && k1 !== '-' && k1 !== '0') || 
                  (k2 && k2 !== '-' && k2 !== '0') || 
                  (k3 && k3 !== '-' && k3 !== '0')
                );
                const hasAnySp = hasSpMajor || hasSt || hasPhk || (totalSpNum > 0);

                // Otomatis SP 1, 2, 3 dan SPPT masuk dalam kategori SPDK
                const isSpdkInvolved = String(pernahTerlibatSpdk || '').toLowerCase().includes('ya') || hasAnySp;

                // Date Parsing & Duration Calculation Helper
                const INDO_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                const MONTH_MAP: Record<string, number> = {
                  jan: 0, januari: 0, january: 0,
                  feb: 1, februari: 1, february: 1,
                  mar: 2, maret: 2, march: 2,
                  apr: 3, april: 3,
                  mei: 4, may: 4,
                  jun: 5, juni: 5, june: 5,
                  jul: 6, juli: 6, july: 6,
                  agu: 7, ags: 7, agustus: 7, aug: 7, august: 7,
                  sep: 8, sept: 8, september: 8,
                  okt: 9, oktober: 9, oct: 9, october: 9,
                  nov: 10, november: 10,
                  des: 11, desember: 11, dec: 11, december: 11
                };

                const isDateLike = (s?: any): boolean => {
                  if (!s) return false;
                  const str = String(s).trim();
                  if (!str || str === '-' || str === '#N/A' || str === '0' || /^\d{1,2}$/.test(str) || /^(ya|tidak|ok|v|x|true|false)$/i.test(str)) return false;
                  return str.includes('-') || str.includes('/') || /[a-zA-Z]{3,}/.test(str);
                };

                const parseSanctionDate = (val?: any): Date | null => {
                  if (!val) return null;
                  const str = String(val).trim().split(/[\r\n,;]+/)[0].trim();
                  if (!isDateLike(str)) return null;

                  const dMmmY = str.match(/^(\d{1,2})[-\s/]([a-zA-Z]+)[-\s/](\d{2,4})$/);
                  if (dMmmY) {
                    const day = parseInt(dMmmY[1], 10);
                    const mStr = dMmmY[2].toLowerCase();
                    let year = parseInt(dMmmY[3], 10);
                    if (year < 100) year += 2000;
                    const month = MONTH_MAP[mStr];
                    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
                      return new Date(year, month, day);
                    }
                  }

                  const ymd = str.match(/^(\d{4})[-\s/](\d{1,2})[-\s/](\d{1,2})$/);
                  if (ymd) {
                    const year = parseInt(ymd[1], 10);
                    const month = parseInt(ymd[2], 10) - 1;
                    const day = parseInt(ymd[3], 10);
                    return new Date(year, month, day);
                  }

                  const dmy = str.match(/^(\d{1,2})[-\s/](\d{1,2})[-\s/](\d{2,4})$/);
                  if (dmy) {
                    const day = parseInt(dmy[1], 10);
                    const month = parseInt(dmy[2], 10) - 1;
                    let year = parseInt(dmy[3], 10);
                    if (year < 100) year += 2000;
                    return new Date(year, month, day);
                  }

                  const mY = str.match(/^([a-zA-Z]+)[-\s/](\d{4})$/);
                  if (mY) {
                    const month = MONTH_MAP[mY[1].toLowerCase()];
                    const year = parseInt(mY[2], 10);
                    if (month !== undefined && !isNaN(year)) {
                      return new Date(year, month, 1);
                    }
                  }

                  if (/\d{4}/.test(str)) {
                    const d = new Date(str);
                    return isNaN(d.getTime()) ? null : d;
                  }
                  return null;
                };

                const formatIndoDateStr = (d: Date): string => {
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = INDO_MONTHS_SHORT[d.getMonth()] || 'Jan';
                  const year = d.getFullYear();
                  return `${day}-${month}-${year}`;
                };

                // Identifikasi tanggal sanksi utama yang valid
                const spMajorDateStr = [sppt, sp3, sp2, sp1].find(isDateLike) || (isDateLike(tanggalSp) ? tanggalSp : '') || (isDateLike(bulanKonseling) ? bulanKonseling : '');
                const stDateStr = (isDateLike(st) ? st : '') || (isDateLike(tanggalSp) ? tanggalSp : '') || (isDateLike(bulanKonseling) ? bulanKonseling : '');
                const counselingDateStr = [k3, k2, k1].find(isDateLike) || (isDateLike(bulanKonseling) ? bulanKonseling : '') || (isDateLike(tanggalSp) ? tanggalSp : '');

                // Aturan Masa Aktif:
                // 1. SP 1 - SPPT = 6 Bulan dari sanksi keluar (+3 Bln Evaluasi, +6 Bln Pemutihan)
                // 2. ST / Surat Teguran = 3 Bulan dari sanksi keluar (+45 Hari / 1.5 Bln Evaluasi, +3 Bln Pemutihan)
                // 3. Konseling = 3 Bulan (+1.5 Bln Evaluasi, +3 Bln Selesai)
                let calculatedMasaBerlaku = '';
                let calculatedPemulihan1 = '';
                let calculatedPemulihan2 = '';

                if (hasSpMajor && spMajorDateStr) {
                  const baseDate = parseSanctionDate(spMajorDateStr);
                  if (baseDate) {
                    const evalDate = new Date(baseDate.getTime());
                    evalDate.setMonth(evalDate.getMonth() + 3);
                    const endDate = new Date(baseDate.getTime());
                    endDate.setMonth(endDate.getMonth() + 6);

                    calculatedMasaBerlaku = `${formatShortDate(baseDate)} s/d ${formatShortDate(endDate)} (6 Bulan)`;
                    calculatedPemulihan1 = `${formatShortDate(evalDate)} (Evaluasi Disiplin)`;
                    calculatedPemulihan2 = `${formatShortDate(endDate)} (Pemutihan Status)`;
                  } else {
                    calculatedMasaBerlaku = `${formatShortDate(spMajorDateStr)} (Masa Aktif 6 Bulan)`;
                    calculatedPemulihan1 = `${formatShortDate(spMajorDateStr)} + 3 Bulan`;
                    calculatedPemulihan2 = `${formatShortDate(spMajorDateStr)} + 6 Bulan`;
                  }
                } else if (hasSt && stDateStr) {
                  const baseDate = parseSanctionDate(stDateStr);
                  if (baseDate) {
                    const evalDate = new Date(baseDate.getTime());
                    evalDate.setDate(evalDate.getDate() + 45);
                    const endDate = new Date(baseDate.getTime());
                    endDate.setMonth(endDate.getMonth() + 3);

                    calculatedMasaBerlaku = `${formatShortDate(baseDate)} s/d ${formatShortDate(endDate)} (3 Bulan)`;
                    calculatedPemulihan1 = `${formatShortDate(evalDate)} (Evaluasi Disiplin)`;
                    calculatedPemulihan2 = `${formatShortDate(endDate)} (Pemutihan Status)`;
                  } else {
                    calculatedMasaBerlaku = `${formatShortDate(stDateStr)} (Masa Aktif 3 Bulan)`;
                    calculatedPemulihan1 = `${formatShortDate(stDateStr)} + 45 Hari`;
                    calculatedPemulihan2 = `${formatShortDate(stDateStr)} + 3 Bulan`;
                  }
                } else if (hasCounseling && counselingDateStr) {
                  const baseDate = parseSanctionDate(counselingDateStr);
                  if (baseDate) {
                    const evalDate = new Date(baseDate.getTime());
                    evalDate.setDate(evalDate.getDate() + 45);
                    const endDate = new Date(baseDate.getTime());
                    endDate.setMonth(endDate.getMonth() + 3);

                    calculatedMasaBerlaku = `${formatShortDate(baseDate)} s/d ${formatShortDate(endDate)} (3 Bulan)`;
                    calculatedPemulihan1 = `${formatShortDate(evalDate)} (Evaluasi Pembinaan)`;
                    calculatedPemulihan2 = `${formatShortDate(endDate)} (Selesai Pembinaan)`;
                  } else {
                    calculatedMasaBerlaku = `${formatShortDate(counselingDateStr)} (Masa Berlaku 3 Bulan)`;
                    calculatedPemulihan1 = `${formatShortDate(counselingDateStr)} + 45 Hari`;
                    calculatedPemulihan2 = `${formatShortDate(counselingDateStr)} + 3 Bulan`;
                  }
                }

                // Tentukan Masa Berlaku Sanksi
                let masaBerlaku = calculatedMasaBerlaku || (rawMasaBerlaku && rawMasaBerlaku !== '-' ? rawMasaBerlaku : '');
                if (!masaBerlaku) {
                  if (hasAnySp) {
                    masaBerlaku = bulanKonseling ? `${bulanKonseling} (Sanksi Aktif)` : 'Sanksi Disiplin Aktif';
                  } else {
                    masaBerlaku = 'Tidak ada sanksi aktif';
                  }
                }

                const masaPemulihan1 = calculatedPemulihan1 || (rawMasaPemulihan1 && rawMasaPemulihan1 !== '-' ? rawMasaPemulihan1 : '-');
                const masaPemulihan2 = calculatedPemulihan2 || (rawMasaPemulihan2 && rawMasaPemulihan2 !== '-' ? rawMasaPemulihan2 : '-');

                // Otomatis tentukan Kategori SPDK berdasarkan tingkatan SP
                let effectiveKategoriSpdk = kategoriSpdk && kategoriSpdk !== '-' && kategoriSpdk.toLowerCase() !== 'tidak ada' ? kategoriSpdk : '';
                if (!effectiveKategoriSpdk && hasAnySp) {
                  if (sppt && sppt !== '-' && sppt !== '0') effectiveKategoriSpdk = 'Pelanggaran Disiplin Berat (SPPT - Surat Peringatan Pertama & Terakhir)';
                  else if (sp3 && sp3 !== '-' && sp3 !== '0') effectiveKategoriSpdk = 'Pelanggaran Disiplin Berat (SP III)';
                  else if (sp2 && sp2 !== '-' && sp2 !== '0') effectiveKategoriSpdk = 'Pelanggaran Disiplin Sedang (SP II)';
                  else if (sp1 && sp1 !== '-' && sp1 !== '0') effectiveKategoriSpdk = 'Pelanggaran Disiplin Kerja (SP I)';
                  else if (st && st !== '-' && st !== '0') effectiveKategoriSpdk = 'Pelanggaran Tata Tertib (Surat Teguran / ST)';
                  else if (phk && phk !== '-' && phk !== '0') effectiveKategoriSpdk = 'Pemutusan Hubungan Kerja (PHK)';
                }

                // Otomatis tentukan Tindakan Disiplin SPDK
                let effectiveTindakanSpdk = tindakanSpdk && tindakanSpdk !== '-' ? tindakanSpdk : '';
                if (!effectiveTindakanSpdk && hasAnySp) {
                  if (sppt && sppt !== '-' && sppt !== '0') effectiveTindakanSpdk = 'Penerbitan SPPT & Evaluasi Kerja';
                  else if (sp3 && sp3 !== '-' && sp3 !== '0') effectiveTindakanSpdk = 'Penerbitan SP III & Evaluasi Status';
                  else if (sp2 && sp2 !== '-' && sp2 !== '0') effectiveTindakanSpdk = 'Penerbitan SP II & Evaluasi Kedisiplinan';
                  else if (sp1 && sp1 !== '-' && sp1 !== '0') effectiveTindakanSpdk = 'Penerbitan SP I & Pembinaan Kedisiplinan';
                  else if (st && st !== '-' && st !== '0') effectiveTindakanSpdk = 'Pemberian Surat Teguran (ST) Tertulis';
                  else if (phk && phk !== '-' && phk !== '0') effectiveTindakanSpdk = 'Terminasi Hubungan Kerja (PHK)';
                }

                // Alasan Surat Peringatan: cantumkan dari alasanSp atau alasan SPDK yang aktif / kronologi SPDK
                const effectiveAlasanSp = (alasanSp && alasanSp !== '-') 
                  ? alasanSp 
                  : ((kronologiSpdk && kronologiSpdk !== '-') ? kronologiSpdk : '');

                // Kronologi Kejadian SPDK HANYA menampilkan alasan / kronologi sanksi SPDK (SP 1 - SPPT / ST), TIDAK boleh mengambil dari Alasan Konseling!
                const effectiveKronologiSpdk = (kronologiSpdk && kronologiSpdk !== '-' && kronologiSpdk.length > 3) 
                  ? kronologiSpdk 
                  : (alasanSp && alasanSp !== '-' ? alasanSp : '');

                // Determine sanction level (0 - 6)
                let severityLevel = 0;
                let levelLabel = 'Disiplin Baik (Aman)';
                let levelColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                let levelBadgeBg = 'bg-emerald-500';

                if (phk && phk !== '-' && phk !== '0') {
                  severityLevel = 6;
                  levelLabel = 'PHK (Pemutusan Hubungan Kerja)';
                  levelColor = 'text-rose-900 bg-rose-100 border-rose-300';
                  levelBadgeBg = 'bg-rose-700';
                } else if (sppt && sppt !== '-' && sppt !== '0') {
                  severityLevel = 5;
                  levelLabel = 'SPPT (Surat Peringatan Pertama & Terakhir)';
                  levelColor = 'text-rose-800 bg-rose-50 border-rose-200';
                  levelBadgeBg = 'bg-rose-600';
                } else if (sp3 && sp3 !== '-' && sp3 !== '0') {
                  severityLevel = 5;
                  levelLabel = 'Surat Peringatan III (SP III)';
                  levelColor = 'text-rose-800 bg-rose-50 border-rose-200';
                  levelBadgeBg = 'bg-rose-600';
                } else if (sp2 && sp2 !== '-' && sp2 !== '0') {
                  severityLevel = 4;
                  levelLabel = 'Surat Peringatan II (SP II)';
                  levelColor = 'text-orange-800 bg-orange-50 border-orange-200';
                  levelBadgeBg = 'bg-orange-600';
                } else if (sp1 && sp1 !== '-' && sp1 !== '0') {
                  severityLevel = 3;
                  levelLabel = 'Surat Peringatan I (SP I)';
                  levelColor = 'text-amber-800 bg-amber-50 border-amber-200';
                  levelBadgeBg = 'bg-amber-500';
                } else if (st && st !== '-' && st !== '0') {
                  severityLevel = 2;
                  levelLabel = 'Surat Teguran (ST)';
                  levelColor = 'text-yellow-800 bg-yellow-50 border-yellow-200';
                  levelBadgeBg = 'bg-yellow-500';
                } else if ((k1 && k1 !== '-' && k1 !== '0') || (k2 && k2 !== '-' && k2 !== '0') || (k3 && k3 !== '-' && k3 !== '0')) {
                  severityLevel = 1;
                  levelLabel = 'Dalam Pembinaan / Konseling';
                  levelColor = 'text-teal-800 bg-teal-50 border-teal-200';
                  levelBadgeBg = 'bg-teal-500';
                } else if (isSpdkInvolved || (kronologiSpdk && kronologiSpdk.length > 5)) {
                  severityLevel = 2;
                  levelLabel = 'Tercatat Insiden SPDK';
                  levelColor = 'text-purple-800 bg-purple-50 border-purple-200';
                  levelBadgeBg = 'bg-purple-600';
                }

                const levels = [
                  { level: 0, label: 'Aman', sub: 'Zero Sanction' },
                  { level: 1, label: 'Konseling', sub: 'Tahap I - III' },
                  { level: 2, label: 'ST', sub: 'Surat Teguran' },
                  { level: 3, label: 'SP I', sub: 'Peringatan I' },
                  { level: 4, label: 'SP II', sub: 'Peringatan II' },
                  { level: 5, label: 'SP III / SPPT', sub: 'Peringatan III / SPPT' },
                  { level: 6, label: 'PHK', sub: 'Terminasi' }
                ];

                const hasActiveSanction = severityLevel > 0;

                return (
                  <Card className="p-6 shadow-sm border-slate-200/60 bg-white">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <Scale className="w-5 h-5 text-purple-600" />
                          <span>Status Konseling, Sanksi Disiplin &amp; SPDK</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Rekap pembinaan konseling karyawan, penerbitan surat peringatan (ST/SP), dan penanganan pelanggaran disiplin kerja (SPDK).
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 shadow-2xs ${levelColor}`}>
                          {severityLevel === 0 ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-current animate-pulse" />
                          )}
                          <span>{levelLabel}</span>
                        </span>

                        {bulanKonseling && bulanKonseling !== '-' && (
                          <span className="px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold font-mono">
                            Bulan: {bulanKonseling}
                          </span>
                        )}

                        {canManageDatabase && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditModalTab('counseling');
                              setIsEditModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Pencil className="w-3.5 h-3.5 text-purple-600" />
                            <span>Edit Konseling &amp; SPDK</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DIAGRAM JENJANG SANKSI DISIPLIN (STEPPER GAUGE) */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-purple-50/20 to-slate-50 border border-slate-200/80 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          Diagram Tingkat Severity Sanksi Karyawan
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 font-mono">
                          Tingkat: {severityLevel} / 6
                        </span>
                      </div>

                      {/* Stepper Diagram */}
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
                        {levels.map((item) => {
                          const isActive = severityLevel === item.level;
                          const isPassed = severityLevel >= item.level && item.level > 0;
                          
                          let bgStep = 'bg-slate-100 border-slate-200 text-slate-400';
                          if (isActive) {
                            if (item.level === 0) bgStep = 'bg-emerald-500 border-emerald-600 text-white shadow-md ring-2 ring-emerald-300';
                            else if (item.level === 1) bgStep = 'bg-teal-500 border-teal-600 text-white shadow-md ring-2 ring-teal-300';
                            else if (item.level === 2) bgStep = 'bg-yellow-500 border-yellow-600 text-white shadow-md ring-2 ring-yellow-300';
                            else if (item.level === 3) bgStep = 'bg-amber-500 border-amber-600 text-white shadow-md ring-2 ring-amber-300';
                            else if (item.level === 4) bgStep = 'bg-orange-500 border-orange-600 text-white shadow-md ring-2 ring-orange-300';
                            else if (item.level === 5) bgStep = 'bg-rose-600 border-rose-700 text-white shadow-md ring-2 ring-rose-300 animate-pulse';
                            else if (item.level === 6) bgStep = 'bg-rose-900 border-rose-950 text-white shadow-md ring-2 ring-rose-500 animate-pulse';
                          } else if (isPassed) {
                            bgStep = 'bg-purple-100 border-purple-300 text-purple-800';
                          }

                          return (
                            <div key={item.level} className="flex flex-col items-center text-center">
                              <div className={`w-full py-2 px-1 rounded-xl border font-black text-[11px] sm:text-xs transition-all duration-300 flex flex-col items-center justify-center ${bgStep}`}>
                                <span>{item.label}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold mt-1 hidden sm:block">
                                {item.sub}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Disciplinary Level Description */}
                      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-purple-500 shrink-0" />
                          <span>
                            {severityLevel === 0 
                              ? 'Karyawan memiliki catatan disiplin bersih tanpa sanksi aktif.' 
                              : `Karyawan saat ini berada pada tingkatan status: ${levelLabel}.`}
                          </span>
                        </div>
                        {totalSpDisplay && (
                          <span className="font-mono font-bold text-slate-700">
                            Total Catatan SP: <span className="text-rose-600">{totalSpDisplay}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* TABEL RINCIAN TANGGAL SURAT PERINGATAN, ST & KONSELING (PERSIS SEPERTI TABEL TANGGAL ABSENSI) */}
                    {(() => {
                      const parseSanctionDateList = (val?: any): string[] => {
                        if (!val) return [];
                        const rawList = Array.isArray(val) ? val : String(val).split(/[\r\n,;]+/);
                        return rawList
                          .map(s => String(s).trim())
                          .filter(s => s && s !== '-' && s !== '0' && s !== '#N/A')
                          .map(s => formatShortDate(s));
                      };

                      const k1Dates = parseSanctionDateList(k1);
                      const k2Dates = parseSanctionDateList(k2);
                      const k3Dates = parseSanctionDateList(k3);
                      const stDates = parseSanctionDateList(st);
                      const sp1Dates = parseSanctionDateList(sp1);
                      const sp2Dates = parseSanctionDateList(sp2);
                      const sp3Dates = parseSanctionDateList(sp3);
                      const spptDates = parseSanctionDateList(sppt);

                      if (tanggalSp && isDateLike(tanggalSp)) {
                        const spDatesList = parseSanctionDateList(tanggalSp);
                        if (sppt && (sppt === '1' || sppt === 'Ya' || spptDates.length === 0)) spptDates.push(...spDatesList);
                        else if (sp3 && (sp3 === '1' || sp3 === 'Ya' || sp3Dates.length === 0)) sp3Dates.push(...spDatesList);
                        else if (sp2 && (sp2 === '1' || sp2 === 'Ya' || sp2Dates.length === 0)) sp2Dates.push(...spDatesList);
                        else if (sp1 && (sp1 === '1' || sp1 === 'Ya' || sp1Dates.length === 0)) sp1Dates.push(...spDatesList);
                        else if (st && (st === '1' || st === 'Ya' || stDates.length === 0)) stDates.push(...spDatesList);
                      }

                      const maxSanctionRows = Math.max(
                        k1Dates.length,
                        k2Dates.length,
                        k3Dates.length,
                        stDates.length,
                        sp1Dates.length,
                        sp2Dates.length,
                        sp3Dates.length,
                        spptDates.length
                      );

                      return (
                        <Card className="p-0 overflow-hidden border-slate-200/60 shadow-sm flex flex-col mb-6 bg-white rounded-2xl max-h-[360px]">
                          <div className="overflow-x-auto overflow-y-auto max-h-[300px] custom-scrollbar">
                            <table className="w-full text-sm text-left border-collapse">
                              <thead className="text-xs uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                                <tr>
                                  <th className="px-4 py-3 font-bold text-[#135e69] whitespace-nowrap bg-slate-50">Konseling I</th>
                                  <th className="px-4 py-3 font-bold text-[#135e69] whitespace-nowrap bg-slate-50">Konseling II</th>
                                  <th className="px-4 py-3 font-bold text-[#135e69] whitespace-nowrap bg-slate-50">Konseling III</th>
                                  <th className="px-4 py-3 font-bold text-yellow-700 whitespace-nowrap bg-slate-50">Surat Teguran (ST)</th>
                                  <th className="px-4 py-3 font-bold text-amber-700 whitespace-nowrap bg-slate-50">SP I</th>
                                  <th className="px-4 py-3 font-bold text-orange-700 whitespace-nowrap bg-slate-50">SP II</th>
                                  <th className="px-4 py-3 font-bold text-rose-700 whitespace-nowrap bg-slate-50">SP III</th>
                                  <th className="px-4 py-3 font-bold text-rose-900 whitespace-nowrap bg-slate-50">SPPT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {maxSanctionRows === 0 ? (
                                  <tr className="border-b border-slate-50 bg-slate-50/30">
                                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400 font-medium">
                                      Belum ada catatan rincian tanggal surat peringatan (ST/SP) atau konseling.
                                    </td>
                                  </tr>
                                ) : (
                                  Array.from({ length: maxSanctionRows }).map((_, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                        {k1Dates[idx] ? (
                                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-[#e6f7f9] text-[#135e69] border border-[#a2e0e8]">
                                            {k1Dates[idx]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                        {k2Dates[idx] ? (
                                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-[#e6f7f9] text-[#135e69] border border-[#a2e0e8]">
                                            {k2Dates[idx]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                        {k3Dates[idx] ? (
                                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-[#e6f7f9] text-[#135e69] border border-[#a2e0e8]">
                                            {k3Dates[idx]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                        {stDates[idx] ? (
                                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200">
                                            {stDates[idx]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                        {sp1Dates[idx] ? (
                                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                            {sp1Dates[idx]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                        {sp2Dates[idx] ? (
                                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-orange-50 text-orange-800 border border-orange-200">
                                            {sp2Dates[idx]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                        {sp3Dates[idx] ? (
                                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                            {sp3Dates[idx]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                        {spptDates[idx] ? (
                                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-100 text-rose-950 border border-rose-300 font-bold">
                                            {spptDates[idx]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs px-4">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Total {maxSanctionRows} baris rincian tanggal sanksi &amp; pembinaan
                            </span>
                            {canManageDatabase && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditModalTab('counseling');
                                  setIsEditModalOpen(true);
                                }}
                                className="text-xs font-bold text-[#135e69] hover:text-[#22a7b8] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Edit Tanggal Sanksi / SP</span>
                              </button>
                            )}
                          </div>
                        </Card>
                      );
                    })()}

                    {/* GRID ALASAN KONSELING & SP & SPDK */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Kolom Kiri: Alasan Konseling & Surat Peringatan */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Gavel className="w-4 h-4 text-[#22a7b8]" />
                            Alasan Surat Peringatan &amp; Pembinaan
                          </h4>

                          <div className="space-y-3">
                            {/* Alasan Konseling / Pembinaan */}
                            <div>
                              <p className="text-[11px] font-bold text-teal-800 uppercase mb-1 flex items-center gap-1">
                                <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
                                Alasan Konseling / Pembinaan:
                              </p>
                              <p className="text-xs text-teal-950 bg-teal-50/70 p-3 rounded-xl border border-teal-200/80 leading-relaxed font-medium">
                                {alasanKonseling || 'Tidak ada catatan alasan konseling/pembinaan.'}
                              </p>
                            </div>

                            {/* Alasan Surat Peringatan */}
                            <div>
                              <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Alasan Surat Peringatan:</p>
                              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                                {effectiveAlasanSp || 'Tidak ada catatan alasan surat peringatan.'}
                              </p>
                            </div>

                            {keterangan && keterangan !== '-' && (
                              <div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Keterangan Tambahan:</p>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                                  {keterangan}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                              <span>Pernah SP/ST Sebelumnya:</span>
                              <span className={`font-bold px-2 py-0.5 rounded-md ${
                                String(pernahSpSebelumnya || '').toLowerCase().includes('ya') || hasAnySp
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {pernahSpSebelumnya && pernahSpSebelumnya !== 'Tidak' ? pernahSpSebelumnya : (hasAnySp ? 'Ya' : 'Tidak')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Kolom Kanan: Detail SPDK & Kronologi Kejadian */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                          <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center justify-between border-b border-purple-100 pb-2">
                            <span className="flex items-center gap-1.5">
                              <AlertOctagon className="w-4 h-4 text-purple-600" />
                              Sanksi Pelanggaran Disiplin Kerja (SPDK)
                            </span>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                              isSpdkInvolved
                                ? 'bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isSpdkInvolved ? 'TERLIBAT SPDK' : 'TIDAK TERLIBAT'}
                            </span>
                          </h4>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                              <span className="text-[10px] text-purple-700 font-bold block uppercase">Kategori SPDK</span>
                              <span className="font-bold text-slate-800 mt-1 block leading-snug">
                                {effectiveKategoriSpdk || 'Tidak Ada'}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                              <span className="text-[10px] text-purple-700 font-bold block uppercase">Tindakan Disiplin</span>
                              <span className="font-bold text-slate-800 mt-1 block leading-snug">
                                {effectiveTindakanSpdk || '-'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Kronologi Kejadian SPDK:</p>
                            <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed min-h-[100px] max-h-48 overflow-y-auto">
                              {effectiveKronologiSpdk && effectiveKronologiSpdk !== '-' ? (
                                <p className="font-medium whitespace-pre-line text-slate-800">
                                  {effectiveKronologiSpdk}
                                </p>
                              ) : (
                                <p className="text-slate-400 italic">
                                  Tidak ada catatan riwayat kronologi kejadian pelanggaran disiplin (SPDK) untuk karyawan ini.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}

            </div>
          </motion.div>
        )}
      </div>

      {/* Modal Import Data Karyawan (CSV & Excel) */}
      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchEmployees();
        }}
        inspectorNik={inspectorNik}
      />

      {/* Modal Edit & Tambah Data Karyawan (Khusus Section Admin Local Host) */}
      <EmployeeEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEmployeeForEdit(null);
        }}
        employee={editModalMode === 'add' ? (selectedEmployeeForEdit || {}) : selectedEmployee}
        mode={editModalMode}
        inspectorNik={inspectorNik}
        initialTab={editModalTab}
        onSuccess={(saved) => {
          if (editModalMode === 'add') {
            setSelectedEmployee(saved);
            setEmployees(prev => {
              const next = [saved, ...prev.filter(e => e.nik !== saved.nik)];
              try {
                const cacheStr = JSON.stringify(next);
                localStorage.setItem(cacheKey, cacheStr);
                sessionStorage.setItem(cacheKey, cacheStr);
              } catch {}
              return next;
            });
          } else {
            setSelectedEmployee(saved);
            setEmployees(prev => {
              const next = prev.map(e => e.nik === saved.nik ? saved : e);
              try {
                const cacheStr = JSON.stringify(next);
                localStorage.setItem(cacheKey, cacheStr);
                sessionStorage.setItem(cacheKey, cacheStr);
              } catch {}
              return next;
            });
          }
        }}
      />

      {/* Modal Tambah Catatan / Tanggal Absensi Cepat (Khusus Administration) */}
      <AddAttendanceEntryModal
        isOpen={isAddAttendanceModalOpen}
        onClose={() => setIsAddAttendanceModalOpen(false)}
        employee={selectedEmployee}
        inspectorNik={inspectorNik}
        defaultCategory={selectedAddCategory}
        onSuccess={(updated) => {
          setSelectedEmployee(updated);
          setEmployees(prev => {
            const next = prev.map(e => e.nik === updated.nik ? updated : e);
            try {
              const cacheStr = JSON.stringify(next);
              localStorage.setItem(cacheKey, cacheStr);
              sessionStorage.setItem(cacheKey, cacheStr);
            } catch {}
            return next;
          });
        }}
      />

      {/* Modal Penarikan Data Time Range */}
      <TimeRangeFetchModal
        isOpen={isTimeRangeModalOpen}
        onClose={() => setIsTimeRangeModalOpen(false)}
        inspectorNik={inspectorNik}
        employees={scopedEmployees}
        onSuccess={async () => {
          await fetchEmployees();
        }}
        isSectionManager={isSectionManager}
      />

      {/* Modal Tambah Achievement (Khusus Section Admin di Local Host) */}
      {isAddAchievementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl border border-amber-200 shadow-2xl overflow-hidden flex flex-col text-slate-900"
          >
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 via-orange-50/40 to-white">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md">
                  <Trophy className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Tambah Achievement Karyawan
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedEmployee?.name} ({selectedEmployee?.nik})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAchievementModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAchievement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Judul Achievement / Prestasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAchievementTitle}
                  onChange={(e) => setNewAchievementTitle(e.target.value)}
                  placeholder="Contoh: Best Safety Performance Q1, Inovasi Kaizen Lab"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={newAchievementCategory}
                    onChange={(e) => setNewAchievementCategory(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
                  >
                    <option value="K3 & Keselamatan">K3 & Keselamatan</option>
                    <option value="Inovasi & Improvement">Inovasi & Improvement</option>
                    <option value="Disiplin & Produktivitas">Disiplin & Produktivitas</option>
                    <option value="Kinerja & Prestasi">Kinerja & Prestasi</option>
                    <option value="Sertifikasi & Pelatihan">Sertifikasi & Pelatihan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tanggal Dicapai
                  </label>
                  <input
                    type="text"
                    value={newAchievementDate}
                    onChange={(e) => setNewAchievementDate(e.target.value)}
                    placeholder="Contoh: 15-Mar-2026 atau 2026-03-15"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Keterangan / Deskripsi Pencapaian
                </label>
                <textarea
                  rows={2}
                  value={newAchievementDesc}
                  onChange={(e) => setNewAchievementDesc(e.target.value)}
                  placeholder="Contoh: Zero incident dan kepatuhan APD 100% di area preparation..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={newAchievementNotes}
                  onChange={(e) => setNewAchievementNotes(e.target.value)}
                  placeholder="Contoh: Konsisten dalam implementasi 5S harian"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddAchievementModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAchievement}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingAchievement ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Achievement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
