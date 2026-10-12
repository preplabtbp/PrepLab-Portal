import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Download,
  Upload,
  RotateCcw,
  Edit3,
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  HardHat,
  ClipboardCheck,
  Clock,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Input, Select, Textarea, Button } from './ui';
import {
  SAP_TRAININGS,
  K3_TRAININGS,
  isBfaExempt,
  parseTrainingSheet,
  type ParsedTrainingSheet,
  type TrainingProgram,
  type SapDateKey,
  type K3DateKey,
  type K3StatusKey,
} from '../utils/training-import';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface TrainingRecord {
  id: number;
  no: number | null;
  noK3: number | null;
  nik: string;
  nama: string;
  jabatan: string | null;
  gol: string | null;
  shift: string | null;
  bagian: string | null;
  pt: string | null;
  inSap: boolean | null;
  inK3: boolean | null;
  hazid: string | null;
  jsa: string | null;
  iutOtt: string | null;
  iai: string | null;
  bfa: string | null;
  wah: string | null;
  wahStatus: string | null;
  loto: string | null;
  lotoStatus: string | null;
  confinedSpace: string | null;
  confinedSpaceStatus: string | null;
  fireFighting: string | null;
  fireFightingStatus: string | null;
  notes: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const GOL_OPTIONS = ['I', 'II', 'III', 'IV', 'V'];
const SHIFT_OPTIONS = ['A', 'B', 'Nonshift'];
const PT_OPTIONS = ['TBP', 'GPS'];
const K3_STATUS_OPTIONS = ['PASS', 'Pending', 'FAIL'];
const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const CHART_COLORS = ['#4f46e5', '#0d9488', '#d97706', '#db2777', '#7c3aed'];
const MONTHLY_CHART_MAX_MONTHS = 18;
const TAB_STORAGE_KEY = 'training_db_active_tab';

function formatTrainingDate(val: string | null): string {
  if (!val) return '';
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return val;
  return `${m[3]} ${MONTHS_SHORT[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

// ===== Pengelompokan Jabatan =====
// Satukan variasi penulisan (spasi, "Laboratorium"/"Lab" → "Laboratory") agar satu jabatan = satu kelompok
function normalizeJabatan(jabatan: string | null): string {
  const s = String(jabatan || '').replace(/\s+/g, ' ').trim();
  if (!s) return 'Tanpa Jabatan';
  return s
    .replace(/\bLaboratorium\b/gi, 'Laboratory')
    .replace(/\bLab\b/gi, 'Laboratory')
    .replace(/\s*,\s*/g, ', ');
}

const JABATAN_RANKS: [RegExp, number][] = [
  [/manager/i, 1],
  [/superintendent/i, 2],
  [/supervisor/i, 3],
  [/specialist/i, 4],
  [/officer/i, 5],
  [/foreman/i, 6],
  [/admin|staff/i, 7],
  [/crew/i, 8],
];
const jabatanRank = (jabatan: string) => JABATAN_RANKS.find(([re]) => re.test(jabatan))?.[1] ?? 9;

// ===== Aturan Training SAP =====
// GOL IV & V tidak wajib BFA, sehingga target mereka 4 training
const sapRequiredKeys = (r: TrainingRecord): SapDateKey[] =>
  SAP_TRAININGS.map(t => t.key).filter(k => !(k === 'bfa' && isBfaExempt(r.gol)));
const sapDoneCount = (r: TrainingRecord) => sapRequiredKeys(r).filter(k => !!r[k]).length;
const isSapComplete = (r: TrainingRecord) => sapDoneCount(r) === sapRequiredKeys(r).length;

// ===== Aturan Training K3 =====
type K3State = 'PASS' | 'Pending' | 'FAIL' | 'none';
function k3State(r: TrainingRecord, key: K3DateKey, statusKey: K3StatusKey): K3State {
  const status = r[statusKey];
  if (status === 'Pending') return 'Pending';
  if (status === 'FAIL') return 'FAIL';
  if (r[key] || status === 'PASS') return 'PASS';
  return 'none';
}
const k3PassCount = (r: TrainingRecord) => K3_TRAININGS.filter(t => k3State(r, t.key, t.statusKey) === 'PASS').length;
const k3HasPending = (r: TrainingRecord) => K3_TRAININGS.some(t => k3State(r, t.key, t.statusKey) === 'Pending');

interface EmployeeMaster {
  nik: string;
  name: string;
  jabatan?: string;
  section?: string;
  pt?: string;
}

type FormState = Record<string, string>;

const EMPTY_FORM: FormState = {
  no: '', nik: '', nama: '', jabatan: '', gol: 'II', shift: 'Nonshift', bagian: '', pt: '', notes: '',
  hazid: '', jsa: '', iutOtt: '', iai: '', bfa: '',
  wah: '', wahStatus: '', loto: '', lotoStatus: '', confinedSpace: '', confinedSpaceStatus: '', fireFighting: '', fireFightingStatus: '',
};

interface TrainingDatabaseScreenProps {
  inspectorNik?: string;
  inspectorName?: string;
  onBack?: () => void;
}

const TRAINING_QUERY_KEY = ['training-records'];

async function fetchTrainingRecords(): Promise<TrainingRecord[]> {
  const res = await fetch('/api/training-records');
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal memuat Database Training');
  return json.data || [];
}

export function TrainingDatabaseScreen({ inspectorNik = '', inspectorName = '', onBack }: TrainingDatabaseScreenProps) {
  const queryClient = useQueryClient();
  // Data di-cache TanStack Query: kunjungan ulang tampil instan, lalu diperbarui di background
  const { data: records = [], isLoading, isFetching, error: loadError } = useQuery({
    queryKey: TRAINING_QUERY_KEY,
    queryFn: fetchTrainingRecords,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const [developerNiks, setDeveloperNiks] = useState<string[]>([]);

  const [program, setProgram] = useState<TrainingProgram>(() => {
    try { return localStorage.getItem(TAB_STORAGE_KEY) === 'k3' ? 'k3' : 'sap'; } catch { return 'sap'; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [golFilter, setGolFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [bagianFilter, setBagianFilter] = useState('ALL');
  const [ptFilter, setPtFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [missingFilter, setMissingFilter] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'status' | 'monthly'>('status');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingRecord | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<(ParsedTrainingSheet & { fileName: string }) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const programLabel = program === 'sap' ? 'Training SAP' : 'Training K3';

  const fetchRecords = () => queryClient.invalidateQueries({ queryKey: TRAINING_QUERY_KEY });

  useEffect(() => {
    if (loadError) toast.error((loadError as Error).message);
  }, [loadError]);

  // Master karyawan hanya untuk isi otomatis di form — dimuat saat form dibuka saja
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-master-lite'],
    queryFn: async (): Promise<EmployeeMaster[]> => {
      const res = await fetch('/api/employees');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isModalOpen,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(json => {
        const list = Array.isArray(json) ? json : (json?.data || []);
        setDeveloperNiks(list.map((d: any) => String(d.nik || '').toUpperCase()));
      })
      .catch(() => {});
  }, []);

  const switchProgram = (p: TrainingProgram) => {
    setProgram(p);
    setStatusFilter('ALL');
    setMissingFilter(null);
    try { localStorage.setItem(TAB_STORAGE_KEY, p); } catch {}
  };

  // Hak kelola: Developer & Section Administration (sama dengan Database Karyawan)
  const canManage = useMemo(() => {
    const cleanNik = inspectorNik.trim().toUpperCase();
    if (HARDCODED_DEVS.includes(cleanNik) || developerNiks.includes(cleanNik)) return true;
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      const fields = [p.section, p.department, p.jabatan, p.role].map((v: any) => String(v || '').toLowerCase());
      return fields.some(f => f.includes('admin') || f.includes('developer'));
    } catch {
      return false;
    }
  }, [inspectorNik, developerNiks]);

  const programRecords = useMemo(
    () => records.filter(r => (program === 'sap' ? r.inSap : r.inK3)),
    [records, program]
  );

  const programCounts = useMemo(() => ({
    sap: records.filter(r => r.inSap).length,
    k3: records.filter(r => r.inK3).length,
  }), [records]);

  const bagianOptions = useMemo(
    () => Array.from(new Set(programRecords.map(r => r.bagian).filter(Boolean) as string[])).sort(),
    [programRecords]
  );
  const hasPtData = useMemo(() => programRecords.some(r => r.pt), [programRecords]);

  // ===== Ringkasan & cakupan per training =====
  const stats = useMemo(() => {
    const total = programRecords.length;
    let latest = '';
    const allDateKeys = program === 'sap' ? SAP_TRAININGS.map(t => t.key) : K3_TRAININGS.map(t => t.key);
    programRecords.forEach(r => allDateKeys.forEach(k => {
      const v = r[k];
      if (v && v > latest) latest = v;
    }));

    if (program === 'sap') {
      const lengkap = programRecords.filter(isSapComplete).length;
      const coverage = SAP_TRAININGS.map(t => {
        const required = programRecords.filter(r => sapRequiredKeys(r).includes(t.key));
        return {
          key: t.key as string,
          label: t.label,
          desc: t.desc,
          done: required.filter(r => !!r[t.key]).length,
          pending: 0,
          target: required.length,
          exempt: total - required.length,
        };
      });
      return { total, latest, coverage, cardA: lengkap, cardB: total - lengkap };
    }

    const coverage = K3_TRAININGS.map(t => {
      const states = programRecords.map(r => k3State(r, t.key, t.statusKey));
      return {
        key: t.key as string,
        label: t.label,
        desc: t.desc,
        done: states.filter(s => s === 'PASS').length,
        pending: states.filter(s => s === 'Pending').length,
        target: total,
        exempt: 0,
      };
    });
    const sudahTraining = programRecords.filter(r => k3PassCount(r) > 0).length;
    const pending = programRecords.filter(k3HasPending).length;
    return { total, latest, coverage, cardA: sudahTraining, cardB: pending };
  }, [programRecords, program]);

  // ===== Diagram status per training (batang bertumpuk) =====
  const statusChartData = useMemo(() => {
    if (stats.total === 0) return null;
    const datasets = [
      { label: program === 'sap' ? 'Sudah' : 'PASS', data: stats.coverage.map(c => c.done), backgroundColor: '#10b981' },
      ...(program === 'k3' ? [{ label: 'Pending', data: stats.coverage.map(c => c.pending), backgroundColor: '#f59e0b' }] : []),
      { label: 'Belum', data: stats.coverage.map(c => c.target - c.done - c.pending), backgroundColor: '#f43f5e' },
      ...(program === 'sap' ? [{ label: 'Tidak Wajib (GOL IV/V)', data: stats.coverage.map(c => c.exempt), backgroundColor: '#cbd5e1' }] : []),
    ];
    return {
      labels: stats.coverage.map(c => c.label),
      datasets: datasets.map(d => ({ ...d, borderRadius: 4, maxBarThickness: 56 })),
    };
  }, [stats, program]);

  // ===== Diagram jumlah training per bulan (batang bertumpuk per jenis training) =====
  const monthlyChartData = useMemo(() => {
    const trainings = program === 'sap'
      ? SAP_TRAININGS.map(t => ({ key: t.key as string, label: t.label, done: (r: TrainingRecord) => r[t.key] }))
      : K3_TRAININGS.map(t => ({
          key: t.key as string,
          label: t.label,
          done: (r: TrainingRecord) => (k3State(r, t.key, t.statusKey) === 'PASS' ? r[t.key] : null),
        }));

    const monthsByTraining = trainings.map(t => {
      const counts: Record<string, number> = {};
      programRecords.forEach(r => {
        const d = t.done(r);
        if (d) counts[d.slice(0, 7)] = (counts[d.slice(0, 7)] || 0) + 1;
      });
      return counts;
    });
    const allMonths = monthsByTraining.flatMap(c => Object.keys(c)).sort();
    if (allMonths.length === 0) return null;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = allMonths[allMonths.length - 1] > currentMonth ? allMonths[allMonths.length - 1] : currentMonth;
    const months: string[] = [];
    let [y, m] = allMonths[0].split('-').map(Number);
    while (`${y}-${String(m).padStart(2, '0')}` <= endMonth) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    // Tampilkan maksimal 18 bulan terakhir agar batang tetap terbaca
    const shown = months.slice(-MONTHLY_CHART_MAX_MONTHS);

    return {
      labels: shown.map(mo => `${MONTHS_SHORT[Number(mo.slice(5, 7)) - 1]} ${mo.slice(2, 4)}`),
      truncated: months.length > shown.length,
      datasets: trainings.map((t, i) => ({
        label: t.label,
        data: shown.map(mo => monthsByTraining[i][mo] || 0),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderRadius: 3,
        maxBarThickness: 28,
      })),
    };
  }, [programRecords, program]);

  // ===== Filter tabel =====
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return programRecords.filter(r => {
      if (q && ![r.nama, r.nik, r.jabatan, r.bagian].some(v => String(v || '').toLowerCase().includes(q))) return false;
      if (golFilter !== 'ALL' && (r.gol || '') !== golFilter) return false;
      if (shiftFilter !== 'ALL' && (r.shift || '').toLowerCase() !== shiftFilter.toLowerCase()) return false;
      if (bagianFilter !== 'ALL' && (r.bagian || '') !== bagianFilter) return false;
      if (ptFilter !== 'ALL' && (r.pt || '') !== ptFilter) return false;

      if (program === 'sap') {
        if (statusFilter === 'LENGKAP' && !isSapComplete(r)) return false;
        if (statusFilter === 'BELUM' && isSapComplete(r)) return false;
        if (missingFilter) {
          const key = missingFilter as SapDateKey;
          if (!sapRequiredKeys(r).includes(key) || r[key]) return false;
        }
      } else {
        if (statusFilter === 'PENDING' && !k3HasPending(r)) return false;
        if (statusFilter === 'SUDAH' && k3PassCount(r) === 0) return false;
        if (statusFilter === 'BELUM' && (k3PassCount(r) > 0 || k3HasPending(r))) return false;
        if (missingFilter) {
          const t = K3_TRAININGS.find(x => x.key === missingFilter);
          if (t && k3State(r, t.key, t.statusKey) === 'PASS') return false;
        }
      }
      return true;
    });
  }, [programRecords, program, searchQuery, golFilter, shiftFilter, bagianFilter, ptFilter, statusFilter, missingFilter]);

  // Kelompokkan per jabatan (urut hierarki), nomor diurutkan ulang dari 1 di tiap kelompok
  const jabatanGroups = useMemo(() => {
    const map = new Map<string, TrainingRecord[]>();
    filteredRecords.forEach(r => {
      const key = normalizeJabatan(r.jabatan);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries())
      .map(([jabatan, rows]) => ({ jabatan, rows: [...rows].sort((a, b) => a.nama.localeCompare(b.nama, 'id')) }))
      .sort((a, b) => jabatanRank(a.jabatan) - jabatanRank(b.jabatan) || a.jabatan.localeCompare(b.jabatan, 'id'));
  }, [filteredRecords]);

  // No, NIK, Nama, GOL, Shift, Status (+ Bagian & PT di K3) + kolom training + Aksi
  const tableColSpan = 6 + (program === 'k3' ? 2 : 0)
    + (program === 'sap' ? SAP_TRAININGS.length : K3_TRAININGS.length) + (canManage ? 1 : 0);

  const hasActiveFilter = !!searchQuery || golFilter !== 'ALL' || shiftFilter !== 'ALL' || bagianFilter !== 'ALL'
    || ptFilter !== 'ALL' || statusFilter !== 'ALL' || !!missingFilter;

  const resetFilters = () => {
    setSearchQuery('');
    setGolFilter('ALL');
    setShiftFilter('ALL');
    setBagianFilter('ALL');
    setPtFilter('ALL');
    setStatusFilter('ALL');
    setMissingFilter(null);
  };

  // ===== CRUD =====
  const openCreateModal = () => {
    setEditingRecord(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (r: TrainingRecord) => {
    setEditingRecord(r);
    const next: FormState = { ...EMPTY_FORM };
    Object.keys(EMPTY_FORM).forEach(k => {
      const v = (r as any)[k];
      next[k] = v == null ? '' : String(v);
    });
    next.no = String((program === 'sap' ? r.no : r.noK3) ?? '');
    setForm(next);
    setIsModalOpen(true);
  };

  const updateForm = (field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Isi otomatis profil dari Database Karyawan / data training lain saat NIK cocok
      if (field === 'nik' && !editingRecord) {
        const nikUpper = value.trim().toUpperCase();
        const known = records.find(r => r.nik === nikUpper);
        const emp = employees.find(e => String(e.nik || '').toUpperCase() === nikUpper);
        next.nama = prev.nama || known?.nama || emp?.name || '';
        next.jabatan = prev.jabatan || known?.jabatan || emp?.jabatan || '';
        next.bagian = prev.bagian || known?.bagian || '';
        next.pt = prev.pt || known?.pt || emp?.pt || '';
        if (known?.gol) next.gol = known.gol;
        if (known?.shift) next.shift = known.shift;
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nik.trim() || !form.nama.trim()) {
      toast.error('NIK dan Nama wajib diisi.');
      return;
    }
    try {
      setIsSaving(true);
      const url = editingRecord ? `/api/training-records/${editingRecord.id}` : '/api/training-records';
      const res = await fetch(url, {
        method: editingRecord ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, program, updatedBy: inspectorName || inspectorNik }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        toast.error(json.message || 'Gagal menyimpan data training');
        return;
      }
      toast.success(json.message);
      setIsModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan data training');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/training-records/${deleteTarget.id}?program=${program}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        toast.error(json.message || 'Gagal menghapus data training');
        return;
      }
      toast.success(json.message);
      setDeleteTarget(null);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus data training');
    }
  };

  // ===== Import CSV / Excel =====
  const handleImportFile = async (file: File) => {
    try {
      setIsImporting(true);
      let parsed: ParsedTrainingSheet | null = null;
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        parsed = parseTrainingSheet(Papa.parse<unknown[]>(text, { skipEmptyLines: true }).data);
      } else {
        // Library xlsx (~400KB) baru diunduh saat user benar-benar import Excel
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        // Pakai sheet pertama yang formatnya dikenali
        for (const name of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: '' });
          parsed = parseTrainingSheet(rows);
          if (parsed && parsed.records.length > 0) break;
        }
      }
      if (!parsed || parsed.records.length === 0) {
        toast.error('Format tidak dikenali. Pastikan ada kolom NIK, NAMA, dan kolom training (HAZID/JSA/... atau WAH/LOTO/...).');
        return;
      }
      setImportPreview({ ...parsed, fileName: file.name });
    } catch (err: any) {
      console.error('Import training failed:', err);
      toast.error(err.message || 'Gagal membaca file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    try {
      setIsImporting(true);
      const res = await fetch('/api/training-records/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: importPreview.records,
          programs: importPreview.programs,
          updatedBy: inspectorName || inspectorNik,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        toast.error(json.message || 'Import gagal');
        return;
      }
      toast.success(json.message);
      if (importPreview.programs.length === 1) switchProgram(importPreview.programs[0]);
      setImportPreview(null);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Import gagal');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCSV = () => {
    let header: string[];
    let rows: (string | number)[][];
    // Urutan ekspor mengikuti tampilan (dikelompokkan per jabatan), nomor berurutan dari 1
    const ordered = jabatanGroups.flatMap(g => g.rows.map(r => ({ r, jabatan: g.jabatan })));
    if (program === 'sap') {
      header = ['NO', 'NIK', 'NAMA', 'Jabatan', 'GOL', 'SHIFT', ...SAP_TRAININGS.map(t => t.label)];
      rows = ordered.map(({ r, jabatan }, i) => [
        i + 1, r.nik, r.nama, jabatan, r.gol || '', r.shift || '',
        ...SAP_TRAININGS.map(t => (t.key === 'bfa' && isBfaExempt(r.gol) && !r.bfa ? 'Tidak Wajib' : r[t.key] || '')),
      ]);
    } else {
      header = ['NO', 'NIK', 'NAMA KARYAWAN', 'Shift', 'BAGIAN', 'JABATAN', 'PT', 'GOL',
        ...K3_TRAININGS.flatMap(t => [t.label.toUpperCase(), 'Status'])];
      rows = ordered.map(({ r, jabatan }, i) => [
        i + 1, r.nik, r.nama, r.shift || '', r.bagian || '', jabatan, r.pt || '', r.gol || '',
        ...K3_TRAININGS.flatMap(t => [r[t.key] || '-', r[t.statusKey] || '-']),
      ]);
    }
    const csv = Papa.unparse([header, ...rows]);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Database_${program === 'sap' ? 'Training_SAP' : 'Training_K3'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Render helpers =====
  const renderSapCell = (r: TrainingRecord, key: SapDateKey) => {
    const value = r[key];
    if (value) return <span className="font-mono text-[11px] font-bold text-slate-900 whitespace-nowrap">{formatTrainingDate(value)}</span>;
    if (key === 'bfa' && isBfaExempt(r.gol)) {
      return <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap" title="GOL IV & V tidak wajib BFA">Tidak Wajib</span>;
    }
    return <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">Belum</span>;
  };

  const renderK3Cell = (r: TrainingRecord, key: K3DateKey, statusKey: K3StatusKey) => {
    const state = k3State(r, key, statusKey);
    if (state === 'none') return <span className="text-[11px] font-bold text-slate-300">-</span>;
    const tone = state === 'PASS'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : state === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
    return (
      <div className="inline-flex flex-col items-center gap-0.5">
        {r[key] && <span className="font-mono text-[11px] font-bold text-slate-900 whitespace-nowrap">{formatTrainingDate(r[key])}</span>}
        <span className={`inline-flex px-1.5 py-px rounded text-[9px] font-black border ${tone}`}>{state}</span>
      </div>
    );
  };

  const renderStatusBadge = (r: TrainingRecord) => {
    if (program === 'sap') {
      const done = sapDoneCount(r);
      const target = sapRequiredKeys(r).length;
      const full = done === target;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${full ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
          {full ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {done}/{target}
        </span>
      );
    }
    const pass = k3PassCount(r);
    const pending = k3HasPending(r);
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${
        pending ? 'bg-amber-50 text-amber-800 border-amber-200' : pass > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
      }`}>
        {pending ? <Clock className="w-3 h-3" /> : pass > 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        {pass} PASS{pending ? ' · Pending' : ''}
      </span>
    );
  };

  const selectClass = 'px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer';
  const cardStyle = { backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' };

  const kpiCards = program === 'sap'
    ? [
        { label: 'Total Personel', value: stats.total, sub: 'Peserta Training SAP', icon: <Users className="w-4 h-4" />, tone: 'bg-indigo-500/10 text-indigo-700' },
        { label: 'Training Lengkap', value: stats.cardA, sub: `${stats.total ? Math.round((stats.cardA / stats.total) * 100) : 0}% sudah memenuhi target`, icon: <CheckCircle2 className="w-4 h-4" />, tone: 'bg-emerald-500/10 text-emerald-700' },
        { label: 'Belum Lengkap', value: stats.cardB, sub: 'Masih ada training wajib kosong', icon: <AlertCircle className="w-4 h-4" />, tone: 'bg-amber-500/10 text-amber-700' },
        { label: 'Training Terakhir', value: stats.latest ? formatTrainingDate(stats.latest) : '-', sub: 'Tanggal training terbaru', icon: <CalendarCheck className="w-4 h-4" />, tone: 'bg-violet-500/10 text-violet-700' },
      ]
    : [
        { label: 'Total Personel', value: stats.total, sub: 'Peserta Training K3', icon: <Users className="w-4 h-4" />, tone: 'bg-indigo-500/10 text-indigo-700' },
        { label: 'Sudah Training', value: stats.cardA, sub: 'Minimal 1 training PASS', icon: <CheckCircle2 className="w-4 h-4" />, tone: 'bg-emerald-500/10 text-emerald-700' },
        { label: 'Status Pending', value: stats.cardB, sub: 'Menunggu hasil / sertifikat', icon: <Clock className="w-4 h-4" />, tone: 'bg-amber-500/10 text-amber-700' },
        { label: 'Training Terakhir', value: stats.latest ? formatTrainingDate(stats.latest) : '-', sub: 'Tanggal training terbaru', icon: <CalendarCheck className="w-4 h-4" />, tone: 'bg-violet-500/10 text-violet-700' },
      ];

  return (
    <div className="min-h-screen pb-16 transition-colors duration-200" style={{ backgroundColor: 'var(--bg-main, #f8fafc)' }}>
      {/* Header Toolbar */}
      <div
        className="sticky top-[57px] z-20 border-b backdrop-blur-md px-4 sm:px-6 py-3.5 transition-colors"
        style={{ backgroundColor: 'var(--header-bg, rgba(255, 255, 255, 0.95))', borderColor: 'var(--border-main, #cbd5e1)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950">Database Training</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-indigo-500/15 text-slate-950 border border-indigo-500/30">
                  {stats.total} Personel
                </span>
                {isFetching && !isLoading && (
                  <span title="Memperbarui data..."><Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /></span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-700">Rekap Training SAP & Training K3 per karyawan</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-300 bg-indigo-50/60 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer shadow-2xs text-slate-950 disabled:opacity-60"
                  title="Import data training dari Excel / CSV (format Training SAP atau Training K3 terdeteksi otomatis)"
                >
                  {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-700" /> : <Upload className="w-3.5 h-3.5 text-indigo-700" />}
                  <span className="hidden sm:inline">Import Excel/CSV</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
                />
              </>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer shadow-2xs text-slate-950"
              title="Ekspor data tab aktif (sesuai filter) ke CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Tab Program */}
        <div className="flex gap-2 p-1 rounded-2xl border w-full sm:w-fit" style={cardStyle}>
          {([
            { id: 'sap' as const, label: 'Training SAP', sub: 'HAZID · JSA · IUT OTT · IAI · BFA', icon: <ClipboardCheck className="w-4 h-4" /> },
            { id: 'k3' as const, label: 'Training K3', sub: 'WAH · LOTO · Confined Space · Fire Fighting', icon: <HardHat className="w-4 h-4" /> },
          ]).map(tab => {
            const active = program === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchProgram(tab.id)}
                className={`flex-1 sm:flex-none flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left transition-all cursor-pointer ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25' : 'hover:bg-slate-100 text-slate-800'}`}
              >
                {tab.icon}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black">{tab.label}</span>
                    <span className={`text-[10px] font-mono font-black px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>{programCounts[tab.id]}</span>
                  </div>
                  <p className={`hidden sm:block text-[10px] font-semibold truncate ${active ? 'text-indigo-100' : 'text-slate-500'}`}>{tab.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map(card => (
            <div key={card.label} className="p-4 rounded-2xl border shadow-xs" style={cardStyle}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.tone}`}>{card.icon}</div>
              </div>
              <div className={`mt-2 font-black font-mono tracking-tight text-slate-950 ${typeof card.value === 'number' ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'}`}>
                {card.value}
              </div>
              <p className="text-[10px] text-slate-600 font-semibold mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Diagram Training */}
          <div className="xl:col-span-3 p-4 rounded-2xl border shadow-xs" style={cardStyle}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Diagram {programLabel}</h3>
              </div>
              <div className="flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                {([['status', 'Status per Training'], ['monthly', 'Tren per Bulan']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${chartMode === mode ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              {(chartMode === 'status' ? statusChartData : monthlyChartData) ? (
                <Bar
                  data={(chartMode === 'status' ? statusChartData : monthlyChartData)!}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11, weight: 'bold' } } },
                      tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} orang` } },
                    },
                    scales: {
                      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, maxRotation: 0, autoSkip: true } },
                      y: { stacked: true, beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, title: { display: true, text: 'Jumlah personel', font: { size: 10 } } },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-500">Belum ada data untuk ditampilkan</div>
              )}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">
              {chartMode === 'status'
                ? 'Jumlah personel per status untuk setiap jenis training.'
                : `Jumlah personel yang training per bulan${monthlyChartData?.truncated ? ` (${MONTHLY_CHART_MAX_MONTHS} bulan terakhir)` : ''}.`}
              {program === 'k3' && chartMode === 'monthly' && ' Hanya status PASS yang dihitung.'}
            </p>
          </div>

          {/* Cakupan per Jenis Training */}
          <div className="xl:col-span-2 p-4 rounded-2xl border shadow-xs" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Cakupan per Training</h3>
              <span className="text-[10px] font-semibold text-slate-500">Klik untuk melihat yang belum</span>
            </div>
            <div className="space-y-2">
              {stats.coverage.map(c => {
                const pct = c.target ? Math.round((c.done / c.target) * 100) : 0;
                const pendingPct = c.target ? Math.round((c.pending / c.target) * 100) : 0;
                const missing = c.target - c.done;
                const active = missingFilter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setMissingFilter(active ? null : c.key)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${active ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-300/40' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'}`}
                    title={c.desc}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-950">{c.label}</span>
                      <span className="text-[10px] font-mono font-black text-slate-700">{c.done}/{c.target} · {pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden flex">
                      <div className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                      {pendingPct > 0 && <div className="h-full bg-amber-400" style={{ width: `${pendingPct}%` }} />}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-2.5 text-[10px] font-bold">
                      <span className={missing > 0 ? 'text-rose-700' : 'text-emerald-700'}>{missing > 0 ? `${missing} belum` : 'Semua lengkap'}</span>
                      {c.pending > 0 && <span className="text-amber-700">{c.pending} pending</span>}
                      {c.exempt > 0 && <span className="text-slate-500">{c.exempt} tidak wajib (GOL IV/V)</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIK, jabatan, atau bagian..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-base sm:text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={golFilter} onChange={e => setGolFilter(e.target.value)} className={selectClass}>
              <option value="ALL">Semua GOL</option>
              {GOL_OPTIONS.map(g => <option key={g} value={g}>GOL {g}</option>)}
            </select>
            <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} className={selectClass}>
              <option value="ALL">Semua Shift</option>
              {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s === 'Nonshift' ? 'Nonshift' : `Shift ${s}`}</option>)}
            </select>
            {bagianOptions.length > 0 && (
              <select value={bagianFilter} onChange={e => setBagianFilter(e.target.value)} className={selectClass}>
                <option value="ALL">Semua Bagian</option>
                {bagianOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            {hasPtData && (
              <select value={ptFilter} onChange={e => setPtFilter(e.target.value)} className={selectClass}>
                <option value="ALL">Semua PT</option>
                {PT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
              <option value="ALL">Semua Status</option>
              {program === 'sap' ? (
                <>
                  <option value="LENGKAP">Lengkap</option>
                  <option value="BELUM">Belum Lengkap</option>
                </>
              ) : (
                <>
                  <option value="SUDAH">Sudah Training (PASS)</option>
                  <option value="PENDING">Ada Pending</option>
                  <option value="BELUM">Belum Training</option>
                </>
              )}
            </select>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] font-semibold text-slate-600 -mt-2">
          Menampilkan <span className="font-black text-slate-900">{filteredRecords.length}</span> dari {stats.total} personel
          {missingFilter && <> · belum <span className="font-black text-rose-700">{stats.coverage.find(c => c.key === missingFilter)?.label}</span></>}
          {program === 'sap' && <> · BFA tidak wajib untuk GOL IV & V</>}
        </p>

        {/* Data */}
        {isLoading ? (
          <div className="rounded-2xl border shadow-xs p-3 space-y-2" style={cardStyle} aria-busy="true" aria-label="Memuat Database Training">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.09 }} />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <p className="text-sm font-bold text-slate-900 mb-1">Data tidak ditemukan</p>
            <p className="text-xs text-slate-600">{programRecords.length === 0 ? `Belum ada data ${programLabel}.` : 'Coba ubah kata kunci atau filter.'}</p>
          </div>
        ) : (
          <>
            {/* Tabel (desktop / tablet) */}
            <div className="hidden md:block rounded-2xl border shadow-xs overflow-hidden" style={cardStyle}>
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      <th className="px-3 py-2.5 text-center">No</th>
                      <th className="px-3 py-2.5">NIK</th>
                      <th className="px-3 py-2.5">Nama</th>
                      {program === 'k3' && <th className="px-3 py-2.5">Bagian</th>}
                      {program === 'k3' && <th className="px-3 py-2.5 text-center">PT</th>}
                      <th className="px-3 py-2.5 text-center">GOL</th>
                      <th className="px-3 py-2.5 text-center">Shift</th>
                      {(program === 'sap' ? SAP_TRAININGS : K3_TRAININGS).map(t => (
                        <th key={t.key} className="px-3 py-2.5 text-center whitespace-nowrap" title={t.desc}>{t.label}</th>
                      ))}
                      <th className="px-3 py-2.5 text-center">Status</th>
                      {canManage && <th className="px-3 py-2.5 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {jabatanGroups.map(group => (
                      <React.Fragment key={group.jabatan}>
                        <tr className="bg-indigo-50/80 border-t-2 border-indigo-200">
                          <td colSpan={tableColSpan} className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-indigo-950">{group.jabatan}</span>
                              <span className="px-2 py-px rounded-full text-[10px] font-mono font-black bg-indigo-600 text-white">{group.rows.length}</span>
                            </div>
                          </td>
                        </tr>
                    {group.rows.map((r, idx) => (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-indigo-50/40 transition-colors">
                        <td className="px-3 py-2 text-center text-[11px] font-mono font-bold text-slate-600">{idx + 1}</td>
                        <td className="px-3 py-2 text-[11px] font-mono font-bold text-slate-800 whitespace-nowrap">{r.nik}</td>
                        <td className="px-3 py-2 text-xs font-black text-slate-950 min-w-[170px]">{r.nama}</td>
                        {program === 'k3' && <td className="px-3 py-2 text-[11px] font-semibold text-slate-700 whitespace-nowrap">{r.bagian || '-'}</td>}
                        {program === 'k3' && <td className="px-3 py-2 text-center text-[11px] font-black text-slate-800">{r.pt || '-'}</td>}
                        <td className="px-3 py-2 text-center text-[11px] font-black text-slate-800">{r.gol || '-'}</td>
                        <td className="px-3 py-2 text-center text-[11px] font-bold text-slate-800 whitespace-nowrap">{r.shift || '-'}</td>
                        {program === 'sap'
                          ? SAP_TRAININGS.map(t => <td key={t.key} className="px-3 py-2 text-center">{renderSapCell(r, t.key)}</td>)
                          : K3_TRAININGS.map(t => <td key={t.key} className="px-3 py-2 text-center">{renderK3Cell(r, t.key, t.statusKey)}</td>)}
                        <td className="px-3 py-2 text-center">{renderStatusBadge(r)}</td>
                        {canManage && (
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => openEditModal(r)} className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-700 cursor-pointer" title="Edit">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer" title="Hapus">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kartu (mobile) */}
            <div className="md:hidden space-y-4">
              {jabatanGroups.map(group => (
              <div key={group.jabatan} className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-black text-indigo-950">{group.jabatan}</span>
                  <span className="px-2 py-px rounded-full text-[10px] font-mono font-black bg-indigo-600 text-white">{group.rows.length}</span>
                </div>
              {group.rows.map((r, idx) => (
                <div key={r.id} className="p-3.5 rounded-2xl border shadow-xs" style={cardStyle}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950 leading-tight"><span className="font-mono text-slate-500 mr-1">{idx + 1}.</span>{r.nama}</p>
                      <p className="text-[11px] font-mono font-bold text-slate-600 mt-0.5">{r.nik}{r.pt ? ` · ${r.pt}` : ''}</p>
                      <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                        {r.jabatan || '-'} · GOL {r.gol || '-'} · {r.shift || '-'}{program === 'k3' && r.bagian ? ` · ${r.bagian}` : ''}
                      </p>
                    </div>
                    {renderStatusBadge(r)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {program === 'sap'
                      ? SAP_TRAININGS.map(t => (
                          <div key={t.key} className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-600">{t.label}</span>
                            {renderSapCell(r, t.key)}
                          </div>
                        ))
                      : K3_TRAININGS.map(t => (
                          <div key={t.key} className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-600">{t.label}</span>
                            {renderK3Cell(r, t.key, t.statusKey)}
                          </div>
                        ))}
                  </div>
                  {canManage && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold cursor-pointer">
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}
              </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSave} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border" style={cardStyle}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={cardStyle}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center">
                  <GraduationCap className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-950">{editingRecord ? 'Edit Data Training' : 'Tambah Data Training'}</h3>
                  <p className="text-[11px] font-semibold text-slate-500">{programLabel}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Input label="NIK *" value={form.nik} onChange={e => updateForm('nik', e.target.value)} list="training-employee-niks" placeholder="Contoh: 04D24000042" required />
                <Input label="Nama *" value={form.nama} onChange={e => updateForm('nama', e.target.value)} required />
                <Input label="Jabatan" value={form.jabatan} onChange={e => updateForm('jabatan', e.target.value)} containerClassName="sm:col-span-2" />
                <Select label="GOL" value={form.gol} onChange={e => updateForm('gol', e.target.value)}>
                  <option value="">-</option>
                  {GOL_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </Select>
                <Select label="Shift" value={form.shift} onChange={e => updateForm('shift', e.target.value)}>
                  <option value="">-</option>
                  {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Input label="Bagian" value={form.bagian} onChange={e => updateForm('bagian', e.target.value)} placeholder="Contoh: Laboratory" />
                <Select label="PT" value={form.pt} onChange={e => updateForm('pt', e.target.value)}>
                  <option value="">-</option>
                  {PT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
                <Input label="No. Urut" type="number" min={1} value={form.no} onChange={e => updateForm('no', e.target.value)} placeholder="Otomatis jika kosong" />
              </div>
              <datalist id="training-employee-niks">
                {employees.map(emp => <option key={emp.nik} value={emp.nik}>{emp.name}</option>)}
              </datalist>

              <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2 mt-1">Tanggal {programLabel}</p>
              {program === 'sap' ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                    {SAP_TRAININGS.map(t => (
                      <Input
                        key={t.key}
                        label={t.key === 'bfa' && isBfaExempt(form.gol) ? 'BFA (tidak wajib)' : t.label}
                        type="date"
                        value={form[t.key]}
                        onChange={e => updateForm(t.key, e.target.value)}
                        title={t.desc}
                      />
                    ))}
                  </div>
                  {isBfaExempt(form.gol) && (
                    <p className="-mt-2 mb-3 text-[11px] font-semibold text-slate-500">GOL {form.gol} tidak wajib mengikuti Basic First Aid (BFA).</p>
                  )}
                </>
              ) : (
                <div className="space-y-1">
                  {K3_TRAININGS.map(t => (
                    <div key={t.key} className="grid grid-cols-2 gap-x-4">
                      <Input label={t.label} type="date" value={form[t.key]} onChange={e => updateForm(t.key, e.target.value)} title={t.desc} />
                      <Select label={`Status ${t.label}`} value={form[t.statusKey]} onChange={e => updateForm(t.statusKey, e.target.value)}>
                        <option value="">-</option>
                        {K3_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </div>
                  ))}
                </div>
              )}
              <Textarea label="Catatan" rows={2} value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Opsional" />
            </div>

            <div className="sticky bottom-0 flex gap-2.5 px-5 py-4 border-t" style={cardStyle}>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-xs font-bold">Batal</Button>
              <Button type="submit" disabled={isSaving} className="flex-1 py-2.5 text-xs font-bold">
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingRecord ? 'Simpan Perubahan' : 'Tambah Data'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Konfirmasi Import */}
      {importPreview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl shadow-2xl border p-6" style={cardStyle}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-950">Konfirmasi Import</h3>
                <p className="text-[11px] font-semibold text-slate-500 truncate">{importPreview.fileName}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-600">Format terdeteksi</span>
                <span className="font-black text-slate-950">{importPreview.programs.map(p => (p === 'sap' ? 'Training SAP' : 'Training K3')).join(' + ')}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-600">Baris valid</span>
                <span className="font-black text-slate-950">{importPreview.records.length} karyawan</span>
              </div>
              {importPreview.skipped > 0 && (
                <div className="flex justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="font-semibold text-amber-800">Dilewati (tanpa NIK/Nama)</span>
                  <span className="font-black text-amber-900">{importPreview.skipped} baris</span>
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] font-semibold text-slate-600">
              Data dicocokkan berdasarkan NIK: karyawan yang sudah ada akan diperbarui tanggal & status trainingnya, NIK baru akan ditambahkan.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button variant="secondary" onClick={() => setImportPreview(null)} disabled={isImporting} className="flex-1 py-2.5 text-xs font-bold">Batal</Button>
              <Button onClick={confirmImport} disabled={isImporting} className="flex-1 py-2.5 text-xs font-bold">
                {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Import {importPreview.records.length} Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl shadow-2xl border p-6 text-center" style={cardStyle}>
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-950 mb-1">Hapus dari {programLabel}?</h3>
            <p className="text-xs text-slate-600 mb-5">
              Data {programLabel} <span className="font-black text-slate-900">{deleteTarget.nama}</span> ({deleteTarget.nik}) akan dihapus.
              {(program === 'sap' ? deleteTarget.inK3 : deleteTarget.inSap) && ' Data di program training lainnya tetap tersimpan.'}
            </p>
            <div className="flex gap-2.5">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-xs font-bold">Batal</Button>
              <Button variant="danger" onClick={handleDelete} className="flex-1 py-2.5 text-xs font-bold">Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingDatabaseScreen;
