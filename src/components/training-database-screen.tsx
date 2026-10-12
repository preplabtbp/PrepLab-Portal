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
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Input, Select, Textarea, Button } from './ui';

export interface TrainingRecord {
  id: number;
  no: number | null;
  nik: string;
  nama: string;
  jabatan: string | null;
  gol: string | null;
  shift: string | null;
  hazid: string | null;
  jsa: string | null;
  iutOtt: string | null;
  iai: string | null;
  bfa: string | null;
  notes: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

type TrainingKey = 'hazid' | 'jsa' | 'iutOtt' | 'iai' | 'bfa';

// Kolom training sesuai file Training_SAP.csv
const TRAININGS: { key: TrainingKey; label: string; desc: string }[] = [
  { key: 'hazid', label: 'HAZID', desc: 'Hazard Identification' },
  { key: 'jsa', label: 'JSA', desc: 'Job Safety Analysis' },
  { key: 'iutOtt', label: 'IUT OTT', desc: 'IUT OTT' },
  { key: 'iai', label: 'IAI', desc: 'IAI' },
  { key: 'bfa', label: 'BFA', desc: 'Basic First Aid' },
];

const GOL_OPTIONS = ['II', 'III', 'IV', 'V'];
const SHIFT_OPTIONS = ['A', 'B', 'Nonshift'];
const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatTrainingDate(val: string | null): string {
  if (!val) return '';
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return val;
  return `${m[3]} ${MONTHS_SHORT[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

const completedCount = (r: TrainingRecord) => TRAININGS.filter(t => !!r[t.key]).length;

interface EmployeeMaster {
  nik: string;
  name: string;
  jabatan?: string;
}

interface FormState {
  no: string;
  nik: string;
  nama: string;
  jabatan: string;
  gol: string;
  shift: string;
  hazid: string;
  jsa: string;
  iutOtt: string;
  iai: string;
  bfa: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  no: '', nik: '', nama: '', jabatan: '', gol: 'II', shift: 'Nonshift',
  hazid: '', jsa: '', iutOtt: '', iai: '', bfa: '', notes: '',
};

// Peta header file sumber -> field (case-insensitive, abaikan spasi/simbol)
const HEADER_MAP: Record<string, keyof FormState> = {
  no: 'no', nik: 'nik', nama: 'nama', name: 'nama', jabatan: 'jabatan', gol: 'gol', golongan: 'gol', shift: 'shift',
  hazid: 'hazid', jsa: 'jsa', iutott: 'iutOtt', iai: 'iai', bfa: 'bfa', catatan: 'notes', notes: 'notes',
};

function mapImportRows(rawRows: Record<string, unknown>[]) {
  return rawRows
    .map(raw => {
      const row: Record<string, unknown> = {};
      Object.entries(raw).forEach(([header, value]) => {
        const field = HEADER_MAP[header.toLowerCase().replace(/[^a-z]/g, '')];
        if (!field) return;
        // Serial tanggal Excel bisa berupa pecahan — bulatkan agar terbaca server
        row[field] = typeof value === 'number' && value > 30000 ? Math.round(value) : value;
      });
      return row;
    })
    .filter(r => String(r.nik || '').trim() && String(r.nama || '').trim());
}

interface TrainingDatabaseScreenProps {
  inspectorNik?: string;
  inspectorName?: string;
  onBack?: () => void;
}

export function TrainingDatabaseScreen({ inspectorNik = '', inspectorName = '', onBack }: TrainingDatabaseScreenProps) {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [developerNiks, setDeveloperNiks] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [golFilter, setGolFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LENGKAP' | 'BELUM'>('ALL');
  const [missingFilter, setMissingFilter] = useState<TrainingKey | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingRecord | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/training-records');
      const json = await res.json();
      if (json.status === 'success') {
        setRecords(json.data || []);
      } else {
        toast.error(json.message || 'Gagal memuat Database Training');
      }
    } catch (err) {
      console.error('Failed to load training records:', err);
      toast.error('Gagal memuat Database Training');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setEmployees(data); })
      .catch(() => {});
    fetch('/api/developers')
      .then(res => res.json())
      .then(json => {
        const list = Array.isArray(json) ? json : (json?.data || []);
        setDeveloperNiks(list.map((d: any) => String(d.nik || '').toUpperCase()));
      })
      .catch(() => {});
  }, []);

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

  const stats = useMemo(() => {
    const total = records.length;
    const lengkap = records.filter(r => completedCount(r) === TRAININGS.length).length;
    const coverage = TRAININGS.map(t => ({ ...t, done: records.filter(r => !!r[t.key]).length }));
    let latest = '';
    records.forEach(r => TRAININGS.forEach(t => {
      const v = r[t.key];
      if (v && v > latest) latest = v;
    }));
    return { total, lengkap, belum: total - lengkap, coverage, latest };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter(r => {
      if (q && ![r.nama, r.nik, r.jabatan].some(v => String(v || '').toLowerCase().includes(q))) return false;
      if (golFilter !== 'ALL' && (r.gol || '') !== golFilter) return false;
      if (shiftFilter !== 'ALL' && (r.shift || '').toLowerCase() !== shiftFilter.toLowerCase()) return false;
      const done = completedCount(r);
      if (statusFilter === 'LENGKAP' && done !== TRAININGS.length) return false;
      if (statusFilter === 'BELUM' && done === TRAININGS.length) return false;
      if (missingFilter && r[missingFilter]) return false;
      return true;
    });
  }, [records, searchQuery, golFilter, shiftFilter, statusFilter, missingFilter]);

  const hasActiveFilter = !!searchQuery || golFilter !== 'ALL' || shiftFilter !== 'ALL' || statusFilter !== 'ALL' || !!missingFilter;

  const resetFilters = () => {
    setSearchQuery('');
    setGolFilter('ALL');
    setShiftFilter('ALL');
    setStatusFilter('ALL');
    setMissingFilter(null);
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (r: TrainingRecord) => {
    setEditingRecord(r);
    setForm({
      no: r.no != null ? String(r.no) : '',
      nik: r.nik,
      nama: r.nama,
      jabatan: r.jabatan || '',
      gol: r.gol || '',
      shift: r.shift || '',
      hazid: r.hazid || '',
      jsa: r.jsa || '',
      iutOtt: r.iutOtt || '',
      iai: r.iai || '',
      bfa: r.bfa || '',
      notes: r.notes || '',
    });
    setIsModalOpen(true);
  };

  const updateForm = (field: keyof FormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Isi otomatis nama & jabatan dari Database Karyawan saat NIK cocok
      if (field === 'nik' && !editingRecord) {
        const emp = employees.find(e => String(e.nik || '').toUpperCase() === value.trim().toUpperCase());
        if (emp) {
          next.nama = prev.nama || emp.name || '';
          next.jabatan = prev.jabatan || emp.jabatan || '';
        }
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
        body: JSON.stringify({ ...form, updatedBy: inspectorName || inspectorNik }),
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
      const res = await fetch(`/api/training-records/${deleteTarget.id}`, { method: 'DELETE' });
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

  const handleImportFile = async (file: File) => {
    try {
      setIsImporting(true);
      let rawRows: Record<string, unknown>[] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
        rawRows = parsed.data;
      } else {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' });
      }
      const rows = mapImportRows(rawRows);
      if (rows.length === 0) {
        toast.error('Tidak ada baris valid. Pastikan file memiliki kolom NIK dan NAMA.');
        return;
      }
      const res = await fetch('/api/training-records/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, updatedBy: inspectorName || inspectorNik }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        toast.error(json.message || 'Import gagal');
        return;
      }
      toast.success(json.message);
      fetchRecords();
    } catch (err: any) {
      console.error('Import training failed:', err);
      toast.error(err.message || 'Import gagal');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = () => {
    const header = ['NO', 'NIK', 'NAMA', 'Jabatan', 'GOL', 'SHIFT', ...TRAININGS.map(t => t.label)];
    const rows = filteredRecords.map(r => [
      r.no ?? '', r.nik, r.nama, r.jabatan || '', r.gol || '', r.shift || '',
      ...TRAININGS.map(t => r[t.key] || ''),
    ]);
    const csv = Papa.unparse([header, ...rows]);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Database_Training_SAP_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DateCell = ({ value }: { value: string | null }) => value ? (
    <span className="font-mono text-[11px] font-bold text-slate-900 whitespace-nowrap">{formatTrainingDate(value)}</span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">Belum</span>
  );

  const StatusBadge = ({ r }: { r: TrainingRecord }) => {
    const done = completedCount(r);
    const full = done === TRAININGS.length;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${full ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
        {full ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        {done}/{TRAININGS.length}
      </span>
    );
  };

  const selectClass = 'px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer';

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
              </div>
              <p className="text-xs font-semibold text-slate-700">Rekap training SAP: HAZID, JSA, IUT OTT, IAI & BFA per karyawan</p>
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
                  title="Import / perbarui data dari file CSV atau Excel (format Training_SAP)"
                >
                  {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-700" /> : <Upload className="w-3.5 h-3.5 text-indigo-700" />}
                  <span className="hidden sm:inline">Import CSV/Excel</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
                />
              </>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer shadow-2xs text-slate-950"
              title="Ekspor data (sesuai filter) ke CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Personel', value: stats.total, sub: 'Terdaftar di database training', icon: <Users className="w-4 h-4" />, tone: 'indigo' },
            { label: 'Training Lengkap', value: stats.lengkap, sub: `${stats.total ? Math.round((stats.lengkap / stats.total) * 100) : 0}% sudah 5/5 training`, icon: <CheckCircle2 className="w-4 h-4" />, tone: 'emerald' },
            { label: 'Belum Lengkap', value: stats.belum, sub: 'Masih ada training yang kosong', icon: <AlertCircle className="w-4 h-4" />, tone: 'amber' },
            { label: 'Training Terakhir', value: stats.latest ? formatTrainingDate(stats.latest) : '-', sub: 'Tanggal training terbaru', icon: <CalendarCheck className="w-4 h-4" />, tone: 'violet' },
          ].map(card => (
            <div
              key={card.label}
              className="p-4 rounded-2xl border shadow-xs"
              style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  card.tone === 'emerald' ? 'bg-emerald-500/10 text-emerald-700'
                  : card.tone === 'amber' ? 'bg-amber-500/10 text-amber-700'
                  : card.tone === 'violet' ? 'bg-violet-500/10 text-violet-700'
                  : 'bg-indigo-500/10 text-indigo-700'
                }`}>{card.icon}</div>
              </div>
              <div className={`mt-2 font-black font-mono tracking-tight text-slate-950 ${typeof card.value === 'number' ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'}`}>
                {card.value}
              </div>
              <p className="text-[10px] text-slate-600 font-semibold mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Cakupan per Jenis Training (klik untuk filter yang belum) */}
        <div
          className="p-4 rounded-2xl border shadow-xs"
          style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Cakupan per Training</h3>
            <span className="text-[10px] font-semibold text-slate-500">Klik untuk melihat yang belum</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {stats.coverage.map(c => {
              const pct = stats.total ? Math.round((c.done / stats.total) * 100) : 0;
              const active = missingFilter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setMissingFilter(active ? null : c.key)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${active ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-300/40' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'}`}
                  title={`${c.desc}: ${stats.total - c.done} personel belum`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-950">{c.label}</span>
                    <span className="text-[10px] font-mono font-black text-slate-700">{c.done}/{stats.total}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className={`mt-1.5 text-[10px] font-bold ${stats.total - c.done > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {stats.total - c.done > 0 ? `${stats.total - c.done} belum` : 'Semua lengkap'}
                  </p>
                </button>
              );
            })}
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
              placeholder="Cari nama, NIK, atau jabatan..."
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
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={selectClass}>
              <option value="ALL">Semua Status</option>
              <option value="LENGKAP">Lengkap (5/5)</option>
              <option value="BELUM">Belum Lengkap</option>
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
          {missingFilter && <> · belum <span className="font-black text-rose-700">{TRAININGS.find(t => t.key === missingFilter)?.label}</span></>}
        </p>

        {/* Data */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            Memuat Database Training...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <p className="text-sm font-bold text-slate-900 mb-1">Data tidak ditemukan</p>
            <p className="text-xs text-slate-600">{records.length === 0 ? 'Belum ada data training.' : 'Coba ubah kata kunci atau filter.'}</p>
          </div>
        ) : (
          <>
            {/* Tabel (desktop / tablet) */}
            <div
              className="hidden md:block rounded-2xl border shadow-xs overflow-hidden"
              style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
            >
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      <th className="px-3 py-2.5 text-center">No</th>
                      <th className="px-3 py-2.5">NIK</th>
                      <th className="px-3 py-2.5">Nama</th>
                      <th className="px-3 py-2.5">Jabatan</th>
                      <th className="px-3 py-2.5 text-center">GOL</th>
                      <th className="px-3 py-2.5 text-center">Shift</th>
                      {TRAININGS.map(t => (
                        <th key={t.key} className="px-3 py-2.5 text-center whitespace-nowrap" title={t.desc}>{t.label}</th>
                      ))}
                      <th className="px-3 py-2.5 text-center">Status</th>
                      {canManage && <th className="px-3 py-2.5 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(r => (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-indigo-50/40 transition-colors">
                        <td className="px-3 py-2 text-center text-[11px] font-mono font-bold text-slate-600">{r.no ?? '-'}</td>
                        <td className="px-3 py-2 text-[11px] font-mono font-bold text-slate-800 whitespace-nowrap">{r.nik}</td>
                        <td className="px-3 py-2 text-xs font-black text-slate-950 min-w-[180px]">{r.nama}</td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-slate-700 min-w-[180px]">{r.jabatan || '-'}</td>
                        <td className="px-3 py-2 text-center text-[11px] font-black text-slate-800">{r.gol || '-'}</td>
                        <td className="px-3 py-2 text-center text-[11px] font-bold text-slate-800 whitespace-nowrap">{r.shift || '-'}</td>
                        {TRAININGS.map(t => (
                          <td key={t.key} className="px-3 py-2 text-center"><DateCell value={r[t.key]} /></td>
                        ))}
                        <td className="px-3 py-2 text-center"><StatusBadge r={r} /></td>
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
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kartu (mobile) */}
            <div className="md:hidden space-y-2.5">
              {filteredRecords.map(r => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-2xl border shadow-xs"
                  style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950 leading-tight">{r.nama}</p>
                      <p className="text-[11px] font-mono font-bold text-slate-600 mt-0.5">{r.nik}</p>
                      <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{r.jabatan || '-'} · GOL {r.gol || '-'} · {r.shift || '-'}</p>
                    </div>
                    <StatusBadge r={r} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {TRAININGS.map(t => (
                      <div key={t.key} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-600">{t.label}</span>
                        <DateCell value={r[t.key]} />
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
          </>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border"
            style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center">
                  <GraduationCap className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-950">{editingRecord ? 'Edit Data Training' : 'Tambah Data Training'}</h3>
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
                <Input label="No. Urut" type="number" min={1} value={form.no} onChange={e => updateForm('no', e.target.value)} placeholder="Otomatis jika kosong" />
              </div>
              <datalist id="training-employee-niks">
                {employees.map(emp => <option key={emp.nik} value={emp.nik}>{emp.name}</option>)}
              </datalist>

              <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2 mt-1">Tanggal Training</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                {TRAININGS.map(t => (
                  <Input key={t.key} label={t.label} type="date" value={form[t.key]} onChange={e => updateForm(t.key, e.target.value)} title={t.desc} />
                ))}
              </div>
              <Textarea label="Catatan" rows={2} value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Opsional" />
            </div>

            <div className="sticky bottom-0 flex gap-2.5 px-5 py-4 border-t" style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-xs font-bold">Batal</Button>
              <Button type="submit" disabled={isSaving} className="flex-1 py-2.5 text-xs font-bold">
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingRecord ? 'Simpan Perubahan' : 'Tambah Data'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl shadow-2xl border p-6 text-center" style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}>
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-950 mb-1">Hapus Data Training?</h3>
            <p className="text-xs text-slate-600 mb-5">
              Data training <span className="font-black text-slate-900">{deleteTarget.nama}</span> ({deleteTarget.nik}) akan dihapus permanen.
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
