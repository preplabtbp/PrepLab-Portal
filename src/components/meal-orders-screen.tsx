import React, { useMemo, useState } from 'react';
import {
  Utensils, ArrowLeft, ChevronLeft, ChevronRight, Plus, Copy, Download, Search, Trash2, Edit3, Loader2, X, CheckCircle2, Users, FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input, Select, Button } from './ui';
import { todayWit } from '../utils/training-import';

// ===== Orderan Makanan harian =====
// Kolom mengikuti sheet order makan: Pagi/Sahur, Siang, Sore (Kantin & Lapangan), Takjil & Malam (Lapangan),
// lalu konfirmasi Batch Pagi & Batch Sore. Kantin ditandai 'K', Lapangan berisi jumlah porsi.

interface MealOrder {
  id: number;
  orderDate: string;
  sortNo: number | null;
  nik: string;
  nama: string;
  statusMess: string | null;
  pt: string | null;
  shift: string | null;
  section: string | null;
  statusKerja: string | null;
  sahur: string | null;
  tidakPuasa: string | null;
  tempatTinggal: string | null;
  shiftKerja: string | null;
  pagiKantin: string | null;
  pagiLapangan: string | null;
  siangKantin: string | null;
  siangLapangan: string | null;
  soreKantin: string | null;
  soreLapangan: string | null;
  takjilLapangan: string | null;
  malamLapangan: string | null;
  konfirmasiPagi: boolean | null;
  konfirmasiSore: boolean | null;
}
interface MealPayload { date: string; data: MealOrder[]; dates: { date: string; count: number }[]; access: { canManage: boolean } }

type KantinKey = 'pagiKantin' | 'siangKantin' | 'soreKantin';
type LapanganKey = 'pagiLapangan' | 'siangLapangan' | 'soreLapangan' | 'takjilLapangan' | 'malamLapangan';
type MealCellKey = KantinKey | LapanganKey;

// Grup kolom makan (urut sesuai sheet)
const MEAL_GROUPS: { label: string; cells: { key: MealCellKey; label: string; kind: 'kantin' | 'lapangan' }[] }[] = [
  { label: 'Pagi / Sahur', cells: [{ key: 'pagiKantin', label: 'Kantin', kind: 'kantin' }, { key: 'pagiLapangan', label: 'Lapangan', kind: 'lapangan' }] },
  { label: 'Siang', cells: [{ key: 'siangKantin', label: 'Kantin', kind: 'kantin' }, { key: 'siangLapangan', label: 'Lapangan', kind: 'lapangan' }] },
  { label: 'Sore', cells: [{ key: 'soreKantin', label: 'Kantin', kind: 'kantin' }, { key: 'soreLapangan', label: 'Lapangan', kind: 'lapangan' }] },
  { label: 'Takjil', cells: [{ key: 'takjilLapangan', label: 'Lapangan', kind: 'lapangan' }] },
  { label: 'Malam', cells: [{ key: 'malamLapangan', label: 'Lapangan', kind: 'lapangan' }] },
];
const MEAL_CELLS = MEAL_GROUPS.flatMap(g => g.cells.map(c => ({ ...c, group: g.label })));

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const parseYmd = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)); };
const dayName = (d: string) => DAYS[parseYmd(d).getUTCDay()];
const longDate = (d: string) => { const x = parseYmd(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
const shiftDate = (d: string, days: number) => { const x = parseYmd(d); x.setUTCDate(x.getUTCDate() + days); return x.toISOString().slice(0, 10); };

const portions = (v: string | null | undefined) => { const n = Number(String(v || '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };
const cellTotal = (rows: MealOrder[], key: MealCellKey, kind: 'kantin' | 'lapangan') =>
  rows.reduce((s, r) => s + (kind === 'kantin' ? (String(r[key] || '').trim() ? 1 : 0) : portions(r[key])), 0);

const PROFILE_FIELDS: { key: keyof MealOrder; label: string; placeholder?: string }[] = [
  { key: 'statusMess', label: 'Status Mess', placeholder: 'CR / Mess' },
  { key: 'pt', label: 'PT' },
  { key: 'shift', label: 'Shift' },
  { key: 'section', label: 'Section' },
  { key: 'statusKerja', label: 'Status Kerja Karyawan', placeholder: 'mis. Cuti / Dinas / -' },
  { key: 'sahur', label: 'Keterangan: Sahur', placeholder: '-' },
  { key: 'tidakPuasa', label: 'Keterangan: Tidak Puasa', placeholder: '-' },
  { key: 'tempatTinggal', label: 'Tempat Tinggal', placeholder: 'mis. Nirwana' },
];

type FormState = Record<string, string>;
const emptyForm = (): FormState => ({ nik: '', nama: '', shiftKerja: 'Nonshift' });

interface Props { inspectorNik?: string; inspectorName?: string; onBack?: () => void }

export function MealOrdersScreen({ inspectorNik = '', onBack }: Props) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => todayWit());
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; row?: MealOrder } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MealOrder | null>(null);

  const queryKey = ['meal-orders', inspectorNik.trim().toUpperCase(), date];
  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async (): Promise<MealPayload> => {
      const res = await fetch(`/api/meal-orders?date=${date}`);
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal memuat Orderan Makanan');
      return json;
    },
    staleTime: 30 * 1000,
  });
  const rows = data?.data ?? [];
  const canManage = !!data?.access?.canManage;

  // Master karyawan untuk isi otomatis form (dimuat saat form dibuka)
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-master-lite'],
    queryFn: async (): Promise<any[]> => { const r = await fetch('/api/employees'); const j = await r.json(); return Array.isArray(j) ? j : []; },
    enabled: !!modal,
    staleTime: 10 * 60 * 1000,
  });

  const sections = useMemo(() => Array.from(new Set(rows.map(r => r.section).filter(Boolean) as string[])).sort(), [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (sectionFilter === 'ALL' || r.section === sectionFilter)
      && (!q || [r.nama, r.nik, r.section, r.tempatTinggal].some(v => String(v || '').toLowerCase().includes(q))));
  }, [rows, search, sectionFilter]);

  const totals = useMemo(() => Object.fromEntries(MEAL_CELLS.map(c => [c.key, cellTotal(filtered, c.key, c.kind)])) as Record<MealCellKey, number>, [filtered]);
  const confirmed = useMemo(() => ({
    pagi: filtered.filter(r => r.konfirmasiPagi).length,
    sore: filtered.filter(r => r.konfirmasiSore).length,
  }), [filtered]);
  // Tanggal sebelumnya yang punya data → sumber "Salin"
  const previousDate = useMemo(() => (data?.dates || []).map(d => String(d.date).slice(0, 10)).find(d => d < date) || null, [data, date]);

  // ===== Ubah data =====
  const patchLocal = (id: number, patch: Partial<MealOrder>) =>
    queryClient.setQueryData<MealPayload>(queryKey, old => old ? { ...old, data: old.data.map(r => (r.id === id ? { ...r, ...patch } : r)) } : old);

  const saveCell = async (row: MealOrder, patch: Partial<MealOrder>) => {
    if (!canManage) return;
    const before: Partial<MealOrder> = Object.fromEntries(Object.keys(patch).map(k => [k, row[k as keyof MealOrder]]));
    patchLocal(row.id, patch);
    try {
      const res = await fetch(`/api/meal-orders/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal menyimpan');
    } catch (e: any) {
      patchLocal(row.id, before);
      toast.error(e.message);
    }
  };

  const openCreate = () => { setForm(emptyForm()); setModal({ mode: 'create' }); };
  const openEdit = (row: MealOrder) => {
    setForm(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v == null ? '' : String(v)])));
    setModal({ mode: 'edit', row });
  };
  const updateForm = (key: string, value: string) => setForm(prev => {
    const next = { ...prev, [key]: value };
    if (key === 'nik' && modal?.mode === 'create') {
      const emp = employees.find(e => String(e.nik || '').toUpperCase() === value.trim().toUpperCase());
      if (emp) {
        next.nama = prev.nama || emp.name || '';
        next.statusMess = prev.statusMess || emp.statusMess || '';
        next.pt = prev.pt || emp.pt || '';
        next.shift = prev.shift || emp.shift || '';
        next.section = prev.section || emp.section || '';
      }
    }
    return next;
  });

  const submitForm = async () => {
    if (!modal) return;
    if (!form.nik?.trim() || !form.nama?.trim()) { toast.error('NIK dan Nama wajib diisi'); return; }
    setSaving(true);
    try {
      // Hanya kolom form (konfirmasi batch diubah lewat centang di tabel)
      const keys = ['nik', 'nama', 'shiftKerja', ...PROFILE_FIELDS.map(f => f.key as string), ...MEAL_CELLS.map(c => c.key as string)];
      const body: Record<string, unknown> = { ...Object.fromEntries(keys.map(k => [k, form[k] ?? ''])), orderDate: date };
      const res = modal.mode === 'create'
        ? await fetch('/api/meal-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(`/api/meal-orders/${modal.row!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal menyimpan');
      toast.success(modal.mode === 'create' ? 'Karyawan ditambahkan ke order' : 'Data order diperbarui');
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ['meal-orders'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const copyFromPrevious = async () => {
    if (!previousDate) return;
    setCopying(true);
    try {
      const res = await fetch('/api/meal-orders/copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: previousDate, to: date }) });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal menyalin');
      toast.success(`${json.inserted} karyawan disalin dari ${dayName(previousDate)}, ${longDate(previousDate)}${json.skipped ? ` · ${json.skipped} sudah ada` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['meal-orders'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCopying(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/meal-orders/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal menghapus');
      toast.success(`${deleteTarget.nama} dihapus dari order`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['meal-orders'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Google Sheets "Meal Order" di folder Administration: admin → sinkron dulu lalu buka; lainnya → buka saja
  const [syncingSheet, setSyncingSheet] = useState(false);
  const openGoogleSheet = async () => {
    const win = window.open('', '_blank'); // dibuka sebelum await agar tidak diblokir popup blocker
    setSyncingSheet(true);
    try {
      const res = canManage
        ? await fetch('/api/meal-orders/sync-sheet', { method: 'POST' })
        : await fetch('/api/meal-orders/sheet');
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal membuka Google Sheets');
      if (!json.url) throw new Error('Google Sheets "Meal Order" belum dibuat oleh Admin');
      if (canManage) toast.success('Google Sheets "Meal Order" diperbarui');
      if (win) win.location.href = json.url; else window.open(json.url, '_blank', 'noopener');
    } catch (e: any) {
      win?.close();
      toast.error(e.message);
    } finally {
      setSyncingSheet(false);
    }
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const header1 = ['NO', 'NAMA KARYAWAN', 'NIK', 'Status Mess', 'PT', 'Shift', 'Section', 'Status Kerja Karyawan', 'Keterangan', '', 'Tempat Tinggal', 'Shift (SIANG/MALAM)',
      ...MEAL_GROUPS.flatMap(g => g.cells.map((_, i) => (i === 0 ? g.label : ''))), dayName(date), longDate(date)];
    const header2 = ['', '', '', '', '', '', '', '', 'Sahur', 'Tidak Puasa', '', '', ...MEAL_CELLS.map(c => c.label), '1 (B.Pagi)', '1 (B.Sore)'];
    const body = filtered.map((r, i) => [
      i + 1, r.nama, r.nik, r.statusMess || '', r.pt || '', r.shift || '', r.section || '', r.statusKerja || '-', r.sahur || '-', r.tidakPuasa || '-',
      r.tempatTinggal || '', r.shiftKerja || '', ...MEAL_CELLS.map(c => r[c.key] || ''), r.konfirmasiPagi ? '✓' : '', r.konfirmasiSore ? '✓' : '',
    ]);
    const totalRow = ['', 'TOTAL', '', '', '', '', '', '', '', '', '', '', ...MEAL_CELLS.map(c => totals[c.key] || ''), confirmed.pagi, confirmed.sore];
    const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...body, totalRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orderan Makanan');
    XLSX.writeFile(wb, `Orderan_Makanan_${date}.xlsx`);
  };

  // ===== Render sel =====
  const thBase = 'px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-700 border border-emerald-200/70 bg-emerald-50 whitespace-nowrap';
  const tdBase = 'px-2 py-1.5 text-xs border border-slate-200 whitespace-nowrap';

  const renderMealCell = (r: MealOrder, key: MealCellKey, kind: 'kantin' | 'lapangan') => {
    const v = r[key] || '';
    if (kind === 'kantin') {
      return (
        <button
          type="button"
          disabled={!canManage}
          onClick={() => saveCell(r, { [key]: v ? null : 'K' } as Partial<MealOrder>)}
          className={`w-full h-7 rounded-md text-xs font-black ${v ? 'bg-sky-100 text-sky-800' : 'text-slate-300'} ${canManage ? 'cursor-pointer hover:ring-2 hover:ring-sky-300' : 'cursor-default'}`}
          title={canManage ? 'Klik untuk tandai / hapus Kantin (K)' : undefined}
        >
          {v || '·'}
        </button>
      );
    }
    if (!canManage) return <span className="block text-center text-xs font-black text-slate-900">{v}</span>;
    return (
      <input
        type="number"
        min={0}
        inputMode="numeric"
        defaultValue={v}
        key={`${r.id}-${key}-${v}`}
        onBlur={e => { const nv = e.target.value.trim(); if (nv !== v) saveCell(r, { [key]: nv || null } as Partial<MealOrder>); }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className={`w-14 h-7 rounded-md text-center text-xs font-black border ${v ? 'bg-amber-50 border-amber-200 text-amber-900' : 'border-transparent hover:border-slate-200 text-slate-900'} focus:outline-none focus:ring-2 focus:ring-amber-300`}
        aria-label="Jumlah porsi lapangan"
      />
    );
  };

  const renderConfirm = (r: MealOrder, key: 'konfirmasiPagi' | 'konfirmasiSore') => (
    <button
      type="button"
      disabled={!canManage}
      onClick={() => saveCell(r, { [key]: !r[key] } as Partial<MealOrder>)}
      className={`mx-auto w-7 h-7 rounded-md flex items-center justify-center ${r[key] ? 'text-emerald-600' : 'text-slate-300'} ${canManage ? 'cursor-pointer hover:bg-emerald-50' : 'cursor-default'}`}
      title={key === 'konfirmasiPagi' ? 'Konfirmasi Batch Pagi' : 'Konfirmasi Batch Sore'}
    >
      {r[key] ? <CheckCircle2 className="w-5 h-5" /> : <span className="w-4 h-4 rounded border-2 border-slate-300" />}
    </button>
  );

  const summaryCards = [
    ...MEAL_GROUPS.map(g => ({
      label: g.label,
      value: g.cells.reduce((s, c) => s + totals[c.key], 0),
      detail: g.cells.map(c => `${c.label} ${totals[c.key]}`).join(' · '),
    })),
  ];

  return (
    <div className="min-h-screen pb-24 bg-[#f3f6f4]">
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="rounded-3xl bg-white px-3 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button type="button" onClick={onBack} className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 cursor-pointer active:scale-95" title="Kembali">
                <ArrowLeft className="w-4 h-4 text-slate-700" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0"><Utensils className="w-5 h-5" /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">Orderan Makanan</h1>
                {isFetching && !isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Order harian Pagi/Sahur, Siang, Sore, Takjil & Malam · Kantin (K) & Lapangan</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
              <button type="button" onClick={() => setDate(d => shiftDate(d, -1))} className="p-1.5 rounded-full hover:bg-white cursor-pointer" title="Hari sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
              <div className="px-2 text-center leading-tight">
                <p className="text-[10px] font-black uppercase text-emerald-700">{dayName(date)}</p>
                <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer" />
              </div>
              <button type="button" onClick={() => setDate(d => shiftDate(d, 1))} className="p-1.5 rounded-full hover:bg-white cursor-pointer" title="Hari berikutnya"><ChevronRight className="w-4 h-4" /></button>
            </div>
            {date !== todayWit() && (
              <button type="button" onClick={() => setDate(todayWit())} className="px-3 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Hari ini</button>
            )}
            <button type="button" onClick={exportExcel} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              type="button"
              onClick={openGoogleSheet}
              disabled={syncingSheet}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer disabled:opacity-60"
              title={canManage ? 'Perbarui & buka Google Sheets "Meal Order" (folder Administration)' : 'Buka Google Sheets "Meal Order"'}
            >
              {syncingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Google Sheets
            </button>
            {canManage && (
              <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer active:scale-95">
                <Plus className="w-4 h-4" /> Tambah Karyawan
              </button>
            )}
          </div>
        </div>

        {/* Ringkasan total per waktu makan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" />Karyawan</p>
            <p className="text-2xl font-semibold text-slate-900">{filtered.length}</p>
            <p className="text-[10px] text-slate-500">{dayName(date)}, {longDate(date)}</p>
          </div>
          {summaryCards.map(c => (
            <div key={c.label} className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{c.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{c.value}</p>
              <p className="text-[10px] text-slate-500 truncate">{c.detail}</p>
            </div>
          ))}
          <div className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Batch Pagi</p>
            <p className="text-2xl font-semibold text-emerald-700">{confirmed.pagi}<span className="text-sm text-slate-400">/{filtered.length}</span></p>
            <p className="text-[10px] text-slate-500">terkonfirmasi</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Batch Sore</p>
            <p className="text-2xl font-semibold text-emerald-700">{confirmed.sore}<span className="text-sm text-slate-400">/{filtered.length}</span></p>
            <p className="text-[10px] text-slate-500">terkonfirmasi</p>
          </div>
        </div>

        {/* Tabel */}
        <div className="rounded-3xl bg-white p-3 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, NIK, section, tempat tinggal..."
                className="w-full pl-10 pr-3 py-2.5 rounded-full bg-slate-50 border border-slate-100 text-base sm:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
            <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="px-3 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold cursor-pointer">
              <option value="ALL">Semua Section</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300">
              <Utensils className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-900 mb-1">Belum ada orderan untuk {dayName(date)}, {longDate(date)}</p>
              {canManage ? (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {previousDate && (
                    <Button onClick={copyFromPrevious} disabled={copying} className="text-xs">
                      {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      <span className="ml-1.5">Salin dari {dayName(previousDate)}, {longDate(previousDate)}</span>
                    </Button>
                  )}
                  <Button variant="outline" onClick={openCreate} className="text-xs"><Plus className="w-4 h-4" /><span className="ml-1.5">Tambah Karyawan</span></Button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Orderan akan diisi oleh Admin.</p>
              )}
            </div>
          ) : (
            <>
              {canManage && previousDate && (
                <button type="button" onClick={copyFromPrevious} disabled={copying} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer disabled:opacity-50">
                  {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  Tambahkan karyawan yang belum ada dari {dayName(previousDate)}, {longDate(previousDate)}
                </button>
              )}

              {/* Desktop / tablet: tabel seperti sheet */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th rowSpan={2} className={`${thBase} text-center`}>No</th>
                      <th rowSpan={2} className={`${thBase} sticky left-0 z-20 min-w-[200px]`}>Nama Karyawan</th>
                      <th rowSpan={2} className={thBase}>NIK</th>
                      <th rowSpan={2} className={thBase}>Status Mess</th>
                      <th rowSpan={2} className={thBase}>PT</th>
                      <th rowSpan={2} className={thBase}>Shift</th>
                      <th rowSpan={2} className={thBase}>Section</th>
                      <th rowSpan={2} className={thBase}>Status Kerja</th>
                      <th colSpan={2} className={`${thBase} text-center`}>Keterangan</th>
                      <th rowSpan={2} className={thBase}>Tempat Tinggal</th>
                      <th rowSpan={2} className={`${thBase} text-center`}>Shift<br />(Siang/Malam)</th>
                      {MEAL_GROUPS.map(g => <th key={g.label} colSpan={g.cells.length} className={`${thBase} text-center bg-amber-50 border-amber-200/70`}>{g.label}</th>)}
                      <th className={`${thBase} text-center bg-yellow-200 border-yellow-300`}>{dayName(date)}</th>
                      <th className={`${thBase} text-center bg-yellow-200 border-yellow-300`}>{longDate(date)}</th>
                      {canManage && <th rowSpan={2} className={thBase} />}
                    </tr>
                    <tr>
                      <th className={`${thBase} text-center`}>Sahur</th>
                      <th className={`${thBase} text-center`}>Tidak Puasa</th>
                      {MEAL_CELLS.map(c => <th key={c.key} className={`${thBase} text-center bg-amber-50 border-amber-200/70`}>{c.label}</th>)}
                      <th className={`${thBase} text-center`}>1 (B.Pagi)</th>
                      <th className={`${thBase} text-center`}>1 (B.Sore)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className={`${tdBase} text-center text-slate-500`}>{i + 1}</td>
                        <td className={`${tdBase} sticky left-0 bg-white font-bold text-slate-900`}>{r.nama}</td>
                        <td className={`${tdBase} font-mono text-slate-700`}>{r.nik}</td>
                        <td className={`${tdBase} text-center`}>{r.statusMess || '-'}</td>
                        <td className={`${tdBase} text-center`}>{r.pt || '-'}</td>
                        <td className={tdBase}>{r.shift || '-'}</td>
                        <td className={tdBase}>{r.section || '-'}</td>
                        <td className={`${tdBase} text-center`}>{r.statusKerja || '-'}</td>
                        <td className={`${tdBase} text-center`}>{r.sahur || '-'}</td>
                        <td className={`${tdBase} text-center`}>{r.tidakPuasa || '-'}</td>
                        <td className={`${tdBase} text-center`}>{r.tempatTinggal || '-'}</td>
                        <td className={`${tdBase} text-center p-1`}>
                          {canManage ? (
                            <select
                              value={r.shiftKerja || ''}
                              onChange={e => saveCell(r, { shiftKerja: e.target.value || null })}
                              className="w-full rounded-md bg-emerald-100 text-emerald-900 text-xs font-semibold px-1 py-1 cursor-pointer focus:outline-none"
                            >
                              <option value="">-</option>
                              <option value="SIANG">SIANG</option>
                              <option value="MALAM">MALAM</option>
                              <option value="Nonshift">Nonshift</option>
                            </select>
                          ) : <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-semibold">{r.shiftKerja || '-'}</span>}
                        </td>
                        {MEAL_CELLS.map(c => <td key={c.key} className={`${tdBase} text-center p-1`}>{renderMealCell(r, c.key, c.kind)}</td>)}
                        <td className={`${tdBase} bg-slate-50 p-1`}>{renderConfirm(r, 'konfirmasiPagi')}</td>
                        <td className={`${tdBase} bg-slate-50 p-1`}>{renderConfirm(r, 'konfirmasiSore')}</td>
                        {canManage && (
                          <td className={`${tdBase} p-1`}>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => openEdit(r)} className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={12} className={`${tdBase} text-right text-[11px] uppercase tracking-wider text-slate-700`}>Total Order</td>
                      {MEAL_CELLS.map(c => <td key={c.key} className={`${tdBase} text-center text-slate-900`}>{totals[c.key] || '-'}</td>)}
                      <td className={`${tdBase} text-center text-emerald-700`}>{confirmed.pagi}</td>
                      <td className={`${tdBase} text-center text-emerald-700`}>{confirmed.sore}</td>
                      {canManage && <td className={tdBase} />}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* HP: kartu per karyawan */}
              <div className="md:hidden space-y-2">
                {filtered.map((r, i) => (
                  <div key={r.id} className="rounded-2xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{i + 1}. {r.nama}</p>
                        <p className="text-[11px] text-slate-500">{r.nik} · {r.pt || '-'} · {r.section || '-'}</p>
                        <p className="text-[11px] text-slate-500">{r.tempatTinggal || '-'} · Mess {r.statusMess || '-'} · <span className="font-semibold text-emerald-700">{r.shiftKerja || '-'}</span></p>
                      </div>
                      {canManage && (
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => openEdit(r)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"><Edit3 className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {MEAL_GROUPS.map(g => (
                        <div key={g.label} className="rounded-xl bg-amber-50/60 p-1.5 text-center">
                          <p className="text-[9px] font-black uppercase text-slate-600 truncate">{g.label.replace(' / ', '/')}</p>
                          {g.cells.map(c => (
                            <div key={c.key} className="mt-1">
                              <p className="text-[8px] text-slate-400">{c.label}</p>
                              {renderMealCell(r, c.key, c.kind)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1">B.Pagi {renderConfirm(r, 'konfirmasiPagi')}</span>
                      <span className="flex items-center gap-1">B.Sore {renderConfirm(r, 'konfirmasiSore')}</span>
                    </div>
                  </div>
                ))}
              </div>
              {filtered.length === 0 && <p className="text-center text-xs text-slate-500 py-6">Tidak ada karyawan yang cocok dengan pencarian.</p>}
            </>
          )}
        </div>
      </div>

      {/* Modal tambah / edit */}
      {modal && (
        <div className="fixed inset-0 z-[80] bg-slate-950/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !saving && setModal(null)}>
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">{modal.mode === 'create' ? 'Tambah Karyawan ke Order' : 'Edit Order Karyawan'}</h3>
                <p className="text-xs text-slate-500">{dayName(date)}, {longDate(date)}</p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="p-2 rounded-full hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <Input label="NIK" value={form.nik || ''} onChange={e => updateForm('nik', e.target.value)} disabled={modal.mode === 'edit'} placeholder="Ketik NIK — profil terisi otomatis" />
              <Input label="Nama Karyawan" value={form.nama || ''} onChange={e => updateForm('nama', e.target.value)} />
              {PROFILE_FIELDS.map(f => (
                <Input key={f.key} label={f.label} value={form[f.key] || ''} onChange={e => updateForm(f.key, e.target.value)} placeholder={f.placeholder} />
              ))}
              <Select label="Shift (Siang/Malam)" value={form.shiftKerja || ''} onChange={e => updateForm('shiftKerja', e.target.value)}>
                <option value="">-</option>
                <option value="SIANG">SIANG</option>
                <option value="MALAM">MALAM</option>
                <option value="Nonshift">Nonshift</option>
              </Select>
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 mt-4 mb-2">Order Makan</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
              {MEAL_CELLS.map(c => c.kind === 'kantin' ? (
                <Select key={c.key} label={`${c.group} · ${c.label}`} value={form[c.key] || ''} onChange={e => updateForm(c.key, e.target.value)}>
                  <option value="">-</option>
                  <option value="K">K (Kantin)</option>
                </Select>
              ) : (
                <Input key={c.key} label={`${c.group} · ${c.label}`} type="number" min={0} value={form[c.key] || ''} onChange={e => updateForm(c.key, e.target.value)} placeholder="Porsi" />
              ))}
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
              <Button onClick={submitForm} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] bg-slate-950/50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-900 mb-1">Hapus dari order?</h3>
            <p className="text-xs text-slate-600 mb-4"><b>{deleteTarget.nama}</b> akan dihapus dari orderan {dayName(date)}, {longDate(date)}. Tanggal lain tidak terpengaruh.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
              <Button variant="danger" onClick={confirmDelete}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
