import React, { useMemo, useRef, useState } from 'react';
import {
  Utensils, ArrowLeft, ChevronLeft, ChevronRight, Plus, Copy, Download, Search, Trash2, Edit3, Loader2, X, Users, FileSpreadsheet, Upload, RefreshCw, ArrowLeftRight, Package, Eye, EyeOff, SlidersHorizontal, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input, Select, Button } from './ui';
import { todayWit } from '../utils/training-import';
import { parseMealOrderSheet, type ParsedMealOrderRow } from '../utils/meal-order-import';
import { isTuesdayWednesdaySaturday, mealChoicePatch } from '../utils/meal-roster-sync';
import { BungkusRecapSheet, buildBungkusRecap, printBungkusRecap, recapTitle } from './meal-bungkus-recap';

// ===== Orderan Makanan harian =====
// Kolom mengikuti sheet order makan: Pagi/Sahur, Siang, Sore (Kantin & Lapangan), Takjil & Malam (Lapangan),
// lalu kolom 1 (B.Pagi) & 1 (B.Sore), Status, Keterangan (Belum Lapor) & Catatan. Kantin ditandai 'K', Lapangan berisi jumlah porsi.

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
  sahurKantin: string | null;
  sahurLapangan: string | null;
  siangKantin: string | null;
  siangLapangan: string | null;
  soreKantin: string | null;
  soreLapangan: string | null;
  takjilLapangan: string | null;
  malamLapangan: string | null;
  batchPagi: string | null; // kolom "1 (B.Pagi)" — jumlah
  batchSore: string | null; // kolom "1 (B.Sore)" — jumlah
  status: string | null;
  keteranganLapor: string | null; // "Keterangan (Belum Lapor)"
  catatan: string | null; // mis. DINAS / PHK
  pilihanPagi: string | null; // pilihan Catatan 'kantin' | 'lapangan' — berlaku seterusnya
  pilihanSore: string | null;
}
type BatchKey = 'batchPagi' | 'batchSore';
interface MealPayload { date: string; data: MealOrder[]; dates: { date: string; count: number }[]; access: { canManage: boolean } }

type KantinKey = 'pagiKantin' | 'sahurKantin' | 'siangKantin' | 'soreKantin';
type LapanganKey = 'pagiLapangan' | 'sahurLapangan' | 'siangLapangan' | 'soreLapangan' | 'takjilLapangan' | 'malamLapangan';
type MealCellKey = KantinKey | LapanganKey;
type Company = 'TBP' | 'GPS';
const COMPANIES: Company[] = ['TBP', 'GPS'];

// Grup kolom makan (urut sesuai sheet)
const MEAL_GROUPS: { label: string; cells: { key: MealCellKey; label: string; kind: 'kantin' | 'lapangan' }[] }[] = [
  { label: 'Pagi', cells: [{ key: 'pagiKantin', label: 'Kantin', kind: 'kantin' }, { key: 'pagiLapangan', label: 'Lapangan', kind: 'lapangan' }] },
  { label: 'Sahur', cells: [{ key: 'sahurKantin', label: 'Kantin', kind: 'kantin' }, { key: 'sahurLapangan', label: 'Lapangan', kind: 'lapangan' }] },
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
  { key: 'status', label: 'Status' },
  { key: 'keteranganLapor', label: 'Keterangan (Belum Lapor)', placeholder: 'mis. Belum Lapor 1' },
  { key: 'catatan', label: 'Catatan', placeholder: 'mis. DINAS / PHK' },
];

type FormState = Record<string, string>;
const emptyForm = (): FormState => ({ nik: '', nama: '', shiftKerja: 'Nonshift' });

interface Props { inspectorNik?: string; inspectorName?: string; onBack?: () => void }

export function MealOrdersScreen({ inspectorNik = '', onBack }: Props) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => todayWit());
  const [view, setView] = useState<'orders' | 'recap'>('orders');
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; row?: MealOrder } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MealOrder | null>(null);

  // Pengaturan visibilitas kolom & header
  const [columnVisibility, setColumnVisibility] = useState<{
    profile: boolean;     // Status Mess, PT, Shift, Section, Status Kerja, Tempat Tinggal
    ramadan: boolean;     // Keterangan Sahur, Tidak Puasa, Takjil
    batches: boolean;     // 1 (B.Pagi) & 1 (B.Sore)
    statusNotes: boolean; // Status, Belum Lapor, Catatan
    summary: boolean;     // Ringkasan Total Card di atas tabel
  }>(() => {
    try {
      const saved = localStorage.getItem('preplab_meal_column_vis');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          profile: parsed.profile ?? true,
          ramadan: parsed.ramadan ?? false,
          batches: parsed.batches ?? true,
          statusNotes: parsed.statusNotes ?? true,
          summary: parsed.summary ?? true,
        };
      }
    } catch (e) {}
    return {
      profile: true,
      ramadan: false,
      batches: true,
      statusNotes: true,
      summary: true,
    };
  });

  const [showColMenu, setShowColMenu] = useState(false);

  const updateColVisibility = (patch: Partial<typeof columnVisibility>) => {
    setColumnVisibility(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('preplab_meal_column_vis', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const activeMealGroups = useMemo(() => {
    // Sahur & Takjil hanya saat mode Puasa
    if (columnVisibility.ramadan) return MEAL_GROUPS;
    return MEAL_GROUPS.filter(g => g.label !== 'Takjil' && g.label !== 'Sahur');
  }, [columnVisibility.ramadan]);

  const activeMealCells = useMemo(() => {
    return activeMealGroups.flatMap(g => g.cells.map(c => ({ ...c, group: g.label })));
  }, [activeMealGroups]);

  const leadingColSpan = useMemo(() => {
    return 4 + (columnVisibility.profile ? 6 : 0) + (columnVisibility.ramadan ? 2 : 0);
  }, [columnVisibility.profile, columnVisibility.ramadan]);

  const handleSyncRoster = async () => {
    if (!canManage) return;
    setSyncingRoster(true);
    try {
      const res = await fetch('/api/meal-orders/sync-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal menyinkronkan dengan Roster');
      toast.success(json.message || `Berhasil menyinkronkan ${json.synced} orderan dari Roster & Cuti`);
      queryClient.invalidateQueries({ queryKey: ['meal-orders'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncingRoster(false);
    }
  };

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

  // Master karyawan untuk isi otomatis form & golongan di Rekapan Bungkusan (dimuat saat dibutuhkan)
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-master-lite'],
    queryFn: async (): Promise<any[]> => { const r = await fetch('/api/employees'); const j = await r.json(); return Array.isArray(j) ? j : []; },
    enabled: !!modal || view === 'recap',
    staleTime: 10 * 60 * 1000,
  });
  const recapBlocks = useMemo(() => (view === 'recap' ? buildBungkusRecap(rows, employees) : []), [view, rows, employees]);

  const sections = useMemo(() => Array.from(new Set(rows.map(r => r.section).filter(Boolean) as string[])).sort(), [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (sectionFilter === 'ALL' || r.section === sectionFilter)
      && (!q || [r.nama, r.nik, r.section, r.tempatTinggal].some(v => String(v || '').toLowerCase().includes(q))));
  }, [rows, search, sectionFilter]);

  const totals = useMemo(() => Object.fromEntries(activeMealCells.map(c => [c.key, cellTotal(filtered, c.key, c.kind)])) as Record<MealCellKey, number>, [filtered, activeMealCells]);
  // Total kolom "1 (B.Pagi)" & "1 (B.Sore)" + jumlah yang belum lapor
  const confirmed = useMemo(() => ({
    pagi: filtered.reduce((s, r) => s + portions(r.batchPagi), 0),
    sore: filtered.reduce((s, r) => s + portions(r.batchSore), 0),
    belumLapor: filtered.filter(r => r.keteranganLapor && r.keteranganLapor.trim() !== '-').length,
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
      // Hanya kolom form
      const keys = ['nik', 'nama', 'shiftKerja', 'batchPagi', 'batchSore', ...PROFILE_FIELDS.map(f => f.key as string), ...MEAL_CELLS.map(c => c.key as string)];
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

  // ===== Import sheet order makan (CSV / Excel) =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{ fileName: string; date: string; rows: ParsedMealOrderRow[] } | null>(null);

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      let table: unknown[][] = [];
      if (/\.csv$/i.test(file.name)) {
        const Papa = (await import('papaparse')).default;
        table = Papa.parse<unknown[]>(await file.text(), { skipEmptyLines: true }).data;
      } else {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        // Sheet pertama yang formatnya dikenali
        for (const name of wb.SheetNames) {
          const t = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: '' });
          if (parseMealOrderSheet(t)?.rows.length) { table = t; break; }
        }
      }
      const parsed = parseMealOrderSheet(table);
      if (!parsed || parsed.rows.length === 0) throw new Error('Format sheet tidak dikenali — pastikan ada kolom NAMA KARYAWAN & NIK');
      setImportPreview({ fileName: file.name, date: parsed.date || date, rows: parsed.rows });
    } catch (e: any) {
      toast.error(e.message || 'Gagal membaca file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const res = await fetch('/api/meal-orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderDate: importPreview.date, rows: importPreview.rows }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal import');
      toast.success(`${json.saved} karyawan diimport ke ${dayName(importPreview.date)}, ${longDate(importPreview.date)}`);
      setDate(importPreview.date);
      setImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ['meal-orders'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
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
      if (canManage) {
        toast.success(json.pulled
          ? `${json.pulled} perubahan dari Google Sheets disimpan ke portal`
          : 'Google Sheets "Meal Order" diperbarui');
        if (json.pulled) queryClient.invalidateQueries({ queryKey: ['meal-orders'] });
      }
      if (win) win.location.href = json.url; else window.open(json.url, '_blank', 'noopener');
    } catch (e: any) {
      win?.close();
      toast.error(e.message);
    } finally {
      setSyncingSheet(false);
    }
  };

  // Export per perusahaan (kolom PT): No, NIK, Nama, Shift, Jenis Meal, Status, Kantin (Pagi/Siang/Sore), Bungkusan (Pagi/Siang/Sore/Malam)
  const companyRows = (company: Company) => filtered.filter(r => String(r.pt || '').toUpperCase().includes(company));
  const exportCompany = async (company: Company) => {
    const list = companyRows(company);
    if (list.length === 0) { toast.error(`Tidak ada karyawan ${company} untuk diexport`); return; }
    const XLSX = await import('xlsx');
    const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
    const kantinKeys: KantinKey[] = ['pagiKantin', 'siangKantin', 'soreKantin'];
    // Sahur & Takjil hanya ditampilkan bila ada porsinya (mis. bulan puasa)
    const withTakjil = list.some(r => portions(r.takjilLapangan) > 0);
    const withSahur = list.some(r => portions(r.sahurLapangan) > 0);
    const bungkusCols: { key: LapanganKey; label: string }[] = [
      { key: 'pagiLapangan', label: 'Pagi' },
      ...(withSahur ? [{ key: 'sahurLapangan' as LapanganKey, label: 'Sahur' }] : []),
      { key: 'siangLapangan', label: 'Siang' }, { key: 'soreLapangan', label: 'Sore' },
      ...(withTakjil ? [{ key: 'takjilLapangan' as LapanganKey, label: 'Takjil' }] : []),
      { key: 'malamLapangan', label: 'Malam' },
    ];
    const fixed = ['No', 'NIK', 'Nama', 'Shift', 'Jenis Meal', 'Status'];
    const header1 = [...fixed, 'Kantin', '', '', 'Bungkusan', ...bungkusCols.slice(1).map(() => '')];
    const header2 = [...fixed.map(() => ''), 'Pagi', 'Siang', 'Sore', ...bungkusCols.map(c => c.label)];
    const body = list.map((r, i) => {
      const kantin = kantinKeys.map(k => (String(r[k] || '').trim() ? 1 : 0));
      const bungkus = bungkusCols.map(c => portions(r[c.key]));
      const jenisMeal = kantin.some(Boolean) || !bungkus.some(Boolean) ? 'Kantin' : 'Bungkusan';
      // Hanya status tidak hadir yang dikenal; isian lain (mis. tempat tinggal "Kampung Kawasi") → On Duty
      const absent = String(r.statusKerja || '').trim().match(/^(cuti|izin|sakit|off|cs|dinas)\b/i);
      return [
        // Shift hanya Siang / Malam / Longshift: Nonshift, Cuti, Cuti Site, dll. → Siang
        i + 1, r.nik, r.nama, /malam/i.test(r.shiftKerja || '') ? 'Malam' : /long/i.test(r.shiftKerja || '') ? 'Longshift' : 'Siang', jenisMeal,
        absent ? (absent[1].toUpperCase() === 'CS' ? 'CS' : titleCase(absent[1])) : 'On Duty', ...kantin, ...bungkus,
      ];
    });
    const sum = (c: number) => body.reduce((s, row) => s + (Number(row[c]) || 0), 0);
    const totalRow = ['', '', 'TOTAL', '', '', '', ...header2.slice(fixed.length).map((_, i) => sum(fixed.length + i))];
    const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...body, totalRow]);
    const lastCol = header1.length - 1;
    ws['!merges'] = [
      ...fixed.map((_, c) => ({ s: { r: 0, c }, e: { r: 1, c } })),
      { s: { r: 0, c: fixed.length }, e: { r: 0, c: fixed.length + 2 } },
      { s: { r: 0, c: fixed.length + 3 }, e: { r: 0, c: lastCol } },
    ];
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: body.length + 1, c: lastCol } }) };
    ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 34 }, { wch: 9 }, { wch: 12 }, { wch: 10 }, ...header2.slice(fixed.length).map(() => ({ wch: 7 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Meal ${company}`);
    XLSX.writeFile(wb, `Orderan_Makanan_${company}_${date}.xlsx`);
  };

  // ===== Render sel =====
  const thBase = 'px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-700 border border-emerald-200/70 bg-emerald-50 whitespace-nowrap';
  const tdBase = 'px-2 py-1.5 text-xs border border-slate-200 whitespace-nowrap';

  const renderMealCell = (r: MealOrder, key: MealCellKey, kind: 'kantin' | 'lapangan') => {
    const v = r[key] || '';
    if (kind === 'kantin') {
      const handleToggleKantin = () => {
        if (!canManage) return;
        if (v) {
          // Matikan Kantin
          const patch: Partial<MealOrder> = { [key]: null };
          if (key === 'pagiKantin') patch.batchPagi = null;
          if (key === 'soreKantin') patch.batchSore = null;
          saveCell(r, patch);
        } else {
          // Aktifkan Kantin, otomatis matikan Lapangan di slot waktu yang sama
          const isNirwana = (r.tempatTinggal || '').toLowerCase().includes('nirwana');
          const isNR = (r.statusMess || '').toUpperCase() === 'NR';
          const kantinVal = isNirwana && isNR ? '1' : 'K';
          const patch: Partial<MealOrder> = { [key]: kantinVal };
          if (key === 'pagiKantin') { patch.pagiLapangan = null; patch.batchPagi = isNirwana ? '1' : null; }
          if (key === 'sahurKantin') { patch.sahurLapangan = null; }
          if (key === 'siangKantin') { patch.siangLapangan = null; }
          if (key === 'soreKantin') { patch.soreLapangan = null; patch.batchSore = isNirwana ? '1' : null; }
          saveCell(r, patch);
        }
      };

      return (
        <button
          type="button"
          disabled={!canManage}
          onClick={handleToggleKantin}
          className={`w-full h-7 rounded-md text-xs font-black transition-colors ${v ? 'bg-sky-100 text-sky-800' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'} ${canManage ? 'cursor-pointer hover:ring-2 hover:ring-sky-300' : 'cursor-default'}`}
          title={canManage ? 'Klik untuk pilih Kantin (K)' : undefined}
        >
          {v || '·'}
        </button>
      );
    }
    return renderNumberCell(r, key as LapanganKey, 'amber', 'Jumlah porsi lapangan');
  };

  // Sel angka yang bisa langsung diketik (porsi Lapangan, kolom 1 (B.Pagi) / 1 (B.Sore))
  const renderNumberCell = (r: MealOrder, key: LapanganKey | BatchKey, tone: 'amber' | 'emerald', label: string) => {
    const v = r[key] || '';
    const filled = tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (!canManage) return <span className="block text-center text-xs font-black text-slate-900">{v}</span>;
    return (
      <input
        type="number"
        min={0}
        inputMode="numeric"
        defaultValue={v}
        key={`${r.id}-${key}-${v}`}
        onBlur={e => {
          const nv = e.target.value.trim();
          if (nv !== v) {
            const patch: Partial<MealOrder> = { [key]: nv || null };
            // Jika porsi Lapangan diisi > 0, otomatis kosongkan Kantin di waktu yang sama agar tidak dobel
            if (nv && portions(nv) > 0) {
              if (key === 'pagiLapangan') {
                patch.pagiKantin = null;
                patch.batchPagi = null;
              }
              if (key === 'sahurLapangan') {
                patch.sahurKantin = null;
              }
              if (key === 'siangLapangan') {
                patch.siangKantin = null;
              }
              if (key === 'soreLapangan') {
                const sm = (r.statusMess || '').toUpperCase();
                const isCR = sm === 'CR' || sm === 'MESS';
                const isDayShift = r.shiftKerja === 'SIANG' || r.shiftKerja === 'Nonshift' || r.shiftKerja === 'LONGSHIFT';
                if (isTuesdayWednesdaySaturday(date) && isCR && isDayShift) {
                  toast.info(`Catatan: Hari ${dayName(date)} untuk karyawan Mess CR jadwal sore adalah Kantin.`);
                }
                patch.soreKantin = null;
                patch.batchSore = null;
              }
            }
            saveCell(r, patch);
          }
        }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className={`w-14 h-7 rounded-md text-center text-xs font-black border ${v ? filled : 'border-transparent hover:border-slate-200 text-slate-900'} focus:outline-none focus:ring-2 ${tone === 'amber' ? 'focus:ring-amber-300' : 'focus:ring-emerald-300'}`}
        aria-label={label}
      />
    );
  };

  const renderConfirm = (r: MealOrder, key: BatchKey) =>
    renderNumberCell(r, key, 'emerald', key === 'batchPagi' ? '1 (B.Pagi)' : '1 (B.Sore)');

  const switchMealType = (r: MealOrder, time: 'pagi' | 'sore') => {
    if (!canManage) return;
    const kantinKey: KantinKey = time === 'pagi' ? 'pagiKantin' : 'soreKantin';
    const lapanganKey: LapanganKey = time === 'pagi' ? 'pagiLapangan' : 'soreLapangan';
    const batchKey: BatchKey = time === 'pagi' ? 'batchPagi' : 'batchSore';
    const isNirwana = (r.tempatTinggal || '').toLowerCase().includes('nirwana');

    const hasKantin = Boolean(r[kantinKey]);
    const hasLapangan = portions(r[lapanganKey]) > 0;

    if (hasKantin) {
      // Pindah ke Lapangan
      const sm = (r.statusMess || '').toUpperCase();
      const isCR = sm === 'CR' || sm === 'MESS';
      const isDayShift = r.shiftKerja === 'SIANG' || r.shiftKerja === 'Nonshift' || r.shiftKerja === 'LONGSHIFT';
      if (time === 'sore' && isTuesdayWednesdaySaturday(date) && isCR && isDayShift) {
        toast.info(`Catatan: Hari ${dayName(date)} untuk Mess CR jadwal sore adalah Kantin.`);
      }
      saveCell(r, {
        [kantinKey]: null,
        [lapanganKey]: '1',
        [batchKey]: null,
      });
      toast.success(`${r.nama}: ${time.toUpperCase()} diganti ke Bungkusan Lapangan`);
    } else {
      // Pindah ke Kantin
      const isNR = (r.statusMess || '').toUpperCase() === 'NR';
      const kantinVal = isNirwana && isNR ? '1' : 'K';
      saveCell(r, {
        [kantinKey]: kantinVal,
        [lapanganKey]: null,
        [batchKey]: isNirwana ? '1' : null,
      });
      toast.success(`${r.nama}: ${time.toUpperCase()} diganti ke Kantin`);
    }
  };

  // Pilihan Kantin & Bungkusan via dropdown di kolom Catatan (Pagi & Sore)
  const mealChoiceSlots = (r: MealOrder): ('pagi' | 'sore')[] => {
    const sm = (r.statusMess || '').toUpperCase();
    const isCR = ['CR', 'MESS'].includes(sm);
    const isNirwana = (r.tempatTinggal || '').toLowerCase().includes('nirwana');
    const sk = (r.statusKerja || '').toLowerCase();
    const isInactive = sk.includes('cuti') || sk.includes('off') || sk.includes('resign') || sk.includes('phk');
    if ((!isCR && !isNirwana) || isInactive) return [];
    return ['pagi', 'sore'];
  };

  // Pilihan disimpan (pilihanPagi / pilihanSore) → dipakai seterusnya saat sinkron tanggal lain, kecuali shift Malam
  const setMealChoice = (r: MealOrder, time: 'pagi' | 'sore', choice: 'kantin' | 'lapangan') => {
    const label = time === 'pagi' ? 'Pagi' : 'Sore';
    const pilihan: Partial<MealOrder> = time === 'pagi' ? { pilihanPagi: choice } : { pilihanSore: choice };
    if (choice === 'lapangan' && time === 'sore' && isTuesdayWednesdaySaturday(date) && ['CR', 'MESS'].includes((r.statusMess || '').toUpperCase())) {
      toast.info(`Catatan: Hari ${dayName(date)} untuk Mess CR jadwal sore biasanya Kantin.`);
    }
    saveCell(r, { ...mealChoicePatch(r, time, choice), ...pilihan });
    toast.success(`${r.nama}: ${label} ${choice === 'kantin' ? 'Kantin' : 'Bungkusan'} — berlaku seterusnya (kecuali shift Malam)`);
  };

  // Ganti Shift manual: Malam → Pagi & Sore kembali Kantin; Siang / Nonshift / Longshift → ikut pilihan Catatan
  const changeShiftKerja = (r: MealOrder, shiftKerja: string | null) => {
    const patch: Partial<MealOrder> = { shiftKerja };
    if (mealChoiceSlots(r).length > 0) {
      const isMalam = shiftKerja === 'MALAM';
      for (const time of ['pagi', 'sore'] as const) {
        const saved = (time === 'pagi' ? r.pilihanPagi : r.pilihanSore) as 'kantin' | 'lapangan' | null;
        if (isMalam || saved) Object.assign(patch, mealChoicePatch(r, time, isMalam ? 'kantin' : saved!));
      }
    }
    saveCell(r, patch);
  };

  const renderMealChoices = (r: MealOrder) => {
    const slots = mealChoiceSlots(r);
    if (slots.length === 0) return null;
    // Shift Malam: pilihan Catatan mati — Pagi & Sore otomatis Kantin
    const isMalam = r.shiftKerja === 'MALAM';
    return (
      <div className="flex items-center gap-1 shrink-0">
        {slots.map(time => {
          const value = portions(r[time === 'pagi' ? 'pagiLapangan' : 'soreLapangan']) > 0 ? 'lapangan' : 'kantin';
          const label = time === 'pagi' ? 'Pagi' : 'Sore';
          return canManage ? (
            <select
              key={time}
              value={value}
              disabled={isMalam}
              onChange={e => setMealChoice(r, time, e.target.value as 'kantin' | 'lapangan')}
              className={`rounded-md text-xs font-semibold px-1.5 py-1 focus:outline-none border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isMalam ? '' : 'cursor-pointer'} ${
                value === 'kantin'
                  ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
              title={isMalam ? 'Shift Malam: pilihan tidak berlaku — Pagi & Sore otomatis Kantin' : `Pilih ${label}: ${label} Kantin atau ${label} Bungkusan (berlaku seterusnya)`}
            >
              <option value="kantin">{label} Kantin</option>
              <option value="lapangan">{label} Bungkusan</option>
            </select>
          ) : (
            <span
              key={time}
              className={`text-[11px] px-1.5 py-0.5 rounded font-semibold border ${
                value === 'kantin' ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {label} {value === 'kantin' ? 'Kantin' : 'Bungkusan'}
            </span>
          );
        })}
      </div>
    );
  };

  const isCRRow = (r: MealOrder) => ['CR', 'MESS'].includes(String(r.statusMess || '').trim().toUpperCase());

  const summaryCards = useMemo(() => {
    return activeMealGroups.map(g => {
      let lap = 0;
      let bungkusKantin = 0;
      let makanKantin = 0;

      if (g.label === 'Pagi / Sahur') {
        lap = filtered.reduce((s, r) => s + portions(r.pagiLapangan), 0);
        bungkusKantin = filtered.reduce((s, r) => {
          if (isCRRow(r)) return s;
          return s + (portions(r.batchPagi) || (r.pagiKantin === '1' ? 1 : 0));
        }, 0);
        makanKantin = filtered.reduce((s, r) => s + (isCRRow(r) && r.pagiKantin ? 1 : 0), 0);
      } else if (g.label === 'Siang') {
        lap = filtered.reduce((s, r) => s + portions(r.siangLapangan), 0);
        bungkusKantin = filtered.reduce((s, r) => {
          if (isCRRow(r)) return s;
          return s + (r.siangKantin && r.siangKantin !== '-' ? 1 : 0);
        }, 0);
        makanKantin = filtered.reduce((s, r) => s + (isCRRow(r) && r.siangKantin ? 1 : 0), 0);
      } else if (g.label === 'Sore') {
        lap = filtered.reduce((s, r) => s + portions(r.soreLapangan), 0);
        bungkusKantin = filtered.reduce((s, r) => {
          if (isCRRow(r)) return s;
          return s + (portions(r.batchSore) || (r.soreKantin === '1' ? 1 : 0));
        }, 0);
        makanKantin = filtered.reduce((s, r) => s + (isCRRow(r) && r.soreKantin ? 1 : 0), 0);
      } else if (g.label === 'Takjil') {
        lap = filtered.reduce((s, r) => s + portions(r.takjilLapangan), 0);
      } else if (g.label === 'Malam') {
        lap = filtered.reduce((s, r) => s + portions(r.malamLapangan), 0);
      }

      const totalBungkus = lap + bungkusKantin;

      const details: string[] = [];
      if (bungkusKantin > 0) {
        details.push(`B. Lapangan ${lap}`);
        details.push(`B. Kantin ${bungkusKantin}`);
      } else {
        details.push(`B. Lapangan ${lap}`);
      }
      if (makanKantin > 0) {
        details.push(`Kantin ${makanKantin}`);
      }

      return {
        label: g.label,
        value: totalBungkus,
        detail: details.join(' · '),
      };
    });
  }, [activeMealGroups, filtered]);

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
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Order harian Pagi, Sahur, Siang, Sore, Takjil & Malam · Sinkron otomatis dengan Roster & Cuti</p>
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
            {canManage && (
              <button
                type="button"
                onClick={handleSyncRoster}
                disabled={syncingRoster}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 cursor-pointer disabled:opacity-60 active:scale-95 transition-all shadow-sm"
                title='Sinkronkan orderan makanan tanggal ini langsung dari Google Sheets "Database Rooster Prep & Lab" (Rooster_Staff & Rooster_Crew)'
              >
                {syncingRoster ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <RefreshCw className="w-4 h-4 text-indigo-600" />} Sinkron Roster
              </button>
            )}
            {COMPANIES.map(company => {
              const count = companyRows(company).length;
              return (
                <button
                  key={company}
                  type="button"
                  onClick={() => exportCompany(company)}
                  disabled={count === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  title={`Export Excel orderan karyawan ${company} (${count} orang)`}
                >
                  <Download className="w-4 h-4" /> Export {company}
                </button>
              );
            })}
            {canManage && <button
              type="button"
              onClick={openGoogleSheet}
              disabled={syncingSheet}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer disabled:opacity-60"
              title='Sinkron & buka Google Sheets "Meal Order" (folder Administration) — hanya Section Administrasi yang bisa mengedit'
            >
              {syncingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Google Sheets
            </button>}
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
                  title="Import sheet Orderan Makanan (Excel / CSV)"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
                <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer active:scale-95">
                  <Plus className="w-4 h-4" /> Tambah Karyawan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab: Orderan Makanan / Rekapan Bungkusan */}
        <div className="flex items-center gap-1 rounded-full bg-white p-1 w-fit shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {([['orders', 'Orderan Makanan', Utensils], ['recap', 'Rekapan Bungkusan', Package]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-colors ${view === key ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {view === 'recap' && (
          <div className="rounded-3xl bg-white p-3 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">Rekapan Bungkusan · {dayName(date)}, {longDate(date)}</p>
                <p className="text-[11px] text-slate-500">Dihitung otomatis dari porsi Lapangan & kolom 1 (B.Pagi)/1 (B.Sore). Gol IV-V yang pesan bungkusan Pagi/Siang/Sore tampil sebagai Kotakan.</p>
              </div>
              <button
                type="button"
                onClick={() => { if (!printBungkusRecap(date, recapBlocks)) toast.error('Popup diblokir browser — izinkan popup untuk download PDF'); }}
                disabled={rows.length === 0 || employeesLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                title="Buka dialog cetak — pilih 'Simpan sebagai PDF'"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            {isLoading || employeesLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}</div>
            ) : rows.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-300">Belum ada orderan untuk {dayName(date)}, {longDate(date)}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <BungkusRecapSheet title={recapTitle(date)} blocks={recapBlocks} />
              </div>
            )}
          </div>
        )}

        {view === 'orders' && <>
        {/* Ringkasan total per waktu makan */}
        {columnVisibility.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" />Karyawan</p>
              <p className="text-2xl font-semibold text-slate-900">{filtered.length}</p>
              <p className="text-[10px] text-slate-500">{dayName(date)}, {longDate(date)}</p>
            </div>
            {summaryCards.map(c => (
              <div key={c.label} className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" title={`${c.label}: Total ${c.value} Bungkusan (${c.detail})`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{c.label}</p>
                <p className="text-2xl font-semibold text-slate-900">{c.value} <span className="text-xs font-normal text-slate-400">bungkus</span></p>
                <p className="text-[10px] text-slate-500 truncate" title={c.detail}>{c.detail}</p>
              </div>
            ))}
            {columnVisibility.batches && (
              <div className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">1 (B.Pagi) · 1 (B.Sore)</p>
                <p className="text-2xl font-semibold text-emerald-700">{confirmed.pagi}<span className="text-sm text-slate-400"> · {confirmed.sore}</span></p>
                <p className="text-[10px] text-slate-500">total {dayName(date)}</p>
              </div>
            )}
            {columnVisibility.statusNotes && (
              <div className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Belum Lapor</p>
                <p className={`text-2xl font-semibold ${confirmed.belumLapor ? 'text-rose-600' : 'text-slate-900'}`}>{confirmed.belumLapor}</p>
                <p className="text-[10px] text-slate-500">karyawan</p>
              </div>
            )}
          </div>
        )}

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

            {/* Quick toggle: Info Profil */}
            <button
              type="button"
              onClick={() => updateColVisibility({ profile: !columnVisibility.profile })}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full border text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
                columnVisibility.profile
                  ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
              title={columnVisibility.profile ? 'Sembunyikan kolom info profil (Status Mess, PT, Shift, Section, Status Kerja, Tempat Tinggal)' : 'Tampilkan kolom info profil'}
            >
              {columnVisibility.profile ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{columnVisibility.profile ? 'Sembunyikan Profil' : 'Tampilkan Profil'}</span>
            </button>

            {/* Menu Popover: Atur Kolom */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowColMenu(v => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
                  showColMenu ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Atur Kolom</span>
                {showColMenu ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showColMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColMenu(false)} />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white p-3 shadow-xl border border-slate-200 z-40 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">Visibilitas Kolom & Tampilan</p>
                      <button type="button" onClick={() => setShowColMenu(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                        <div>
                          <p className="font-semibold text-slate-800">Info Profil Karyawan</p>
                          <p className="text-[10px] text-slate-500">Mess, PT, Shift, Section, Status Kerja, Tempat Tinggal</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={columnVisibility.profile}
                          onChange={e => updateColVisibility({ profile: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                        <div>
                          <p className="font-semibold text-slate-800">Kolom Puasa / Ramadhan</p>
                          <p className="text-[10px] text-slate-500">Keterangan Sahur, Tidak Puasa, Takjil</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={columnVisibility.ramadan}
                          onChange={e => updateColVisibility({ ramadan: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                        <div>
                          <p className="font-semibold text-slate-800">Kolom 1 (B.Pagi) & 1 (B.Sore)</p>
                          <p className="text-[10px] text-slate-500">Rekap konfirmasi bungkusan pagi & sore</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={columnVisibility.batches}
                          onChange={e => updateColVisibility({ batches: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                        <div>
                          <p className="font-semibold text-slate-800">Status, Lapor & Catatan</p>
                          <p className="text-[10px] text-slate-500">Status, Belum Lapor, dan Catatan samping</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={columnVisibility.statusNotes}
                          onChange={e => updateColVisibility({ statusNotes: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                        <div>
                          <p className="font-semibold text-slate-800">Kartu Ringkasan Atas</p>
                          <p className="text-[10px] text-slate-500">Kartu total porsi di atas tabel</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={columnVisibility.summary}
                          onChange={e => updateColVisibility({ summary: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => updateColVisibility({ profile: true, ramadan: true, batches: true, statusNotes: true, summary: true })}
                        className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                      >
                        Tampilkan Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => updateColVisibility({ profile: false, ramadan: false, batches: true, statusNotes: true, summary: true })}
                        className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-semibold cursor-pointer"
                      >
                        Fokus Orderan
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Indikator kolom tersembunyi */}
          {(!columnVisibility.profile || !columnVisibility.ramadan || !columnVisibility.batches || !columnVisibility.statusNotes) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
              <span className="font-semibold text-slate-500">Kolom disembunyikan:</span>
              {!columnVisibility.profile && (
                <button
                  type="button"
                  onClick={() => updateColVisibility({ profile: true })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 cursor-pointer"
                  title="Klik untuk menampilkan info profil"
                >
                  <Eye className="w-3 h-3 text-slate-400" />
                  Profil Karyawan (6 kolom)
                </button>
              )}
              {!columnVisibility.ramadan && (
                <button
                  type="button"
                  onClick={() => updateColVisibility({ ramadan: true })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 cursor-pointer"
                  title="Klik untuk menampilkan kolom puasa"
                >
                  <Eye className="w-3 h-3 text-slate-400" />
                  Puasa (Sahur/Takjil)
                </button>
              )}
              {!columnVisibility.batches && (
                <button
                  type="button"
                  onClick={() => updateColVisibility({ batches: true })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 cursor-pointer"
                  title="Klik untuk menampilkan kolom 1(B.Pagi) & 1(B.Sore)"
                >
                  <Eye className="w-3 h-3 text-slate-400" />
                  1 (B.Pagi) / 1 (B.Sore)
                </button>
              )}
              {!columnVisibility.statusNotes && (
                <button
                  type="button"
                  onClick={() => updateColVisibility({ statusNotes: true })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 cursor-pointer"
                  title="Klik untuk menampilkan status & catatan"
                >
                  <Eye className="w-3 h-3 text-slate-400" />
                  Status & Catatan
                </button>
              )}
              <button
                type="button"
                onClick={() => updateColVisibility({ profile: true, ramadan: true, batches: true, statusNotes: true })}
                className="ml-auto text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                Tampilkan Semua Kolom
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300">
              <Utensils className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-900 mb-1">Belum ada orderan untuk {dayName(date)}, {longDate(date)}</p>
              {(data?.dates?.length ?? 0) > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 w-full">Tanggal yang sudah ada orderannya:</span>
                  {data!.dates.slice(0, 5).map(d => {
                    const ds = String(d.date).slice(0, 10);
                    return (
                      <button key={ds} type="button" onClick={() => setDate(ds)} className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer">
                        {dayName(ds)}, {longDate(ds)} · {d.count}
                      </button>
                    );
                  })}
                </div>
              )}
              {canManage ? (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  <Button onClick={handleSyncRoster} disabled={syncingRoster} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                    {syncingRoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span className="ml-1.5">Sinkronkan dari Roster & Cuti</span>
                  </Button>
                  {previousDate && (
                    <Button variant="outline" onClick={copyFromPrevious} disabled={copying} className="text-xs">
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
                      {columnVisibility.profile && (
                        <>
                          <th rowSpan={2} className={thBase}>
                            <div className="flex items-center justify-between gap-1">
                              <span>Status Mess</span>
                              <button
                                type="button"
                                onClick={() => updateColVisibility({ profile: false })}
                                title="Sembunyikan kolom info profil"
                                className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 cursor-pointer"
                              >
                                <EyeOff className="w-3 h-3" />
                              </button>
                            </div>
                          </th>
                          <th rowSpan={2} className={thBase}>PT</th>
                          <th rowSpan={2} className={thBase}>Shift</th>
                          <th rowSpan={2} className={thBase}>Section</th>
                          <th rowSpan={2} className={thBase}>Status Kerja</th>
                        </>
                      )}
                      {columnVisibility.ramadan && (
                        <th colSpan={2} className={`${thBase} text-center`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Keterangan</span>
                            <button
                              type="button"
                              onClick={() => updateColVisibility({ ramadan: false })}
                              title="Sembunyikan kolom puasa"
                              className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 cursor-pointer"
                            >
                              <EyeOff className="w-3 h-3" />
                            </button>
                          </div>
                        </th>
                      )}
                      {columnVisibility.profile && (
                        <th rowSpan={2} className={thBase}>Tempat Tinggal</th>
                      )}
                      <th rowSpan={2} className={`${thBase} text-center`}>Shift<br />(Siang/Malam)</th>
                      {activeMealGroups.map(g => (
                        <th key={g.label} colSpan={g.cells.length} className={`${thBase} text-center bg-amber-50 border-amber-200/70`}>
                          {g.label}
                        </th>
                      ))}
                      {columnVisibility.batches && (
                        <>
                          <th className={`${thBase} text-center bg-yellow-200 border-yellow-300`}>
                            <div className="flex items-center justify-between gap-1">
                              <span>{dayName(date)}</span>
                              <button
                                type="button"
                                onClick={() => updateColVisibility({ batches: false })}
                                title="Sembunyikan kolom 1 (B.Pagi) & 1 (B.Sore)"
                                className="p-0.5 rounded text-slate-500 hover:text-rose-700 hover:bg-yellow-300/60 cursor-pointer"
                              >
                                <EyeOff className="w-3 h-3" />
                              </button>
                            </div>
                          </th>
                          <th className={`${thBase} text-center bg-yellow-200 border-yellow-300`}>{longDate(date)}</th>
                        </>
                      )}
                      {columnVisibility.statusNotes && (
                        <>
                          <th rowSpan={2} className={thBase}>
                            <div className="flex items-center justify-between gap-1">
                              <span>Status</span>
                              <button
                                type="button"
                                onClick={() => updateColVisibility({ statusNotes: false })}
                                title="Sembunyikan kolom status & catatan"
                                className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 cursor-pointer"
                              >
                                <EyeOff className="w-3 h-3" />
                              </button>
                            </div>
                          </th>
                          <th rowSpan={2} className={thBase}>Keterangan<br />(Belum Lapor)</th>
                          <th rowSpan={2} className={thBase}>Catatan</th>
                        </>
                      )}
                      {canManage && <th rowSpan={2} className={thBase} />}
                    </tr>
                    <tr>
                      {columnVisibility.ramadan && (
                        <>
                          <th className={`${thBase} text-center`}>Sahur</th>
                          <th className={`${thBase} text-center`}>Tidak Puasa</th>
                        </>
                      )}
                      {activeMealCells.map(c => (
                        <th key={c.key} className={`${thBase} text-center bg-amber-50 border-amber-200/70`}>
                          {c.label}
                        </th>
                      ))}
                      {columnVisibility.batches && (
                        <>
                          <th className={`${thBase} text-center`}>1 (B.Pagi)</th>
                          <th className={`${thBase} text-center`}>1 (B. Sore)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className={`${tdBase} text-center text-slate-500`}>{i + 1}</td>
                        <td className={`${tdBase} sticky left-0 bg-white font-bold text-slate-900`}>{r.nama}</td>
                        <td className={`${tdBase} font-mono text-slate-700`}>{r.nik}</td>
                        {columnVisibility.profile && (
                          <>
                            <td className={`${tdBase} text-center`}>{r.statusMess || '-'}</td>
                            <td className={`${tdBase} text-center`}>{r.pt || '-'}</td>
                            <td className={tdBase}>{r.shift || '-'}</td>
                            <td className={tdBase}>{r.section || '-'}</td>
                            <td className={`${tdBase} text-center`}>{r.statusKerja || '-'}</td>
                          </>
                        )}
                        {columnVisibility.ramadan && (
                          <>
                            <td className={`${tdBase} text-center`}>{r.sahur || '-'}</td>
                            <td className={`${tdBase} text-center`}>{r.tidakPuasa || '-'}</td>
                          </>
                        )}
                        {columnVisibility.profile && (
                          <td className={`${tdBase} text-center`}>{r.tempatTinggal || '-'}</td>
                        )}
                        <td className={`${tdBase} text-center p-1`}>
                          {canManage ? (
                            <select
                              value={r.shiftKerja || ''}
                              onChange={e => changeShiftKerja(r, e.target.value || null)}
                              className="w-full rounded-md bg-emerald-100 text-emerald-900 text-xs font-semibold px-1 py-1 cursor-pointer focus:outline-none"
                            >
                              <option value="">-</option>
                              <option value="SIANG">SIANG</option>
                              <option value="MALAM">MALAM</option>
                              <option value="LONGSHIFT">LONGSHIFT</option>
                              <option value="Nonshift">Nonshift</option>
                            </select>
                          ) : <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-semibold">{r.shiftKerja || '-'}</span>}
                        </td>
                        {activeMealCells.map(c => (
                          <td key={c.key} className={`${tdBase} text-center p-1`}>{renderMealCell(r, c.key, c.kind)}</td>
                        ))}
                        {columnVisibility.batches && (
                          <>
                            <td className={`${tdBase} bg-slate-50 p-1 text-center`}>{renderConfirm(r, 'batchPagi')}</td>
                            <td className={`${tdBase} bg-slate-50 p-1 text-center`}>{renderConfirm(r, 'batchSore')}</td>
                          </>
                        )}
                        {columnVisibility.statusNotes && (
                          <>
                            <td className={tdBase}>{r.status || ''}</td>
                            <td className={`${tdBase} text-center p-1`}>
                              {canManage ? (
                                <select
                                  value={r.keteranganLapor && r.keteranganLapor !== '-' ? 'Belum Lapor' : '-'}
                                  onChange={e => {
                                    const val = e.target.value === '-' ? null : e.target.value;
                                    saveCell(r, { keteranganLapor: val });
                                  }}
                                  className={`rounded-md text-xs font-semibold px-2 py-1 cursor-pointer focus:outline-none transition-all ${
                                    r.keteranganLapor && r.keteranganLapor !== '-'
                                      ? 'bg-rose-100 text-rose-700 font-bold border border-rose-300 hover:bg-rose-200'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                  title="Pilih Keterangan Belum Lapor"
                                >
                                  <option value="-">-</option>
                                  <option value="Belum Lapor">Belum Lapor</option>
                                  {r.keteranganLapor && r.keteranganLapor !== '-' && r.keteranganLapor !== 'Belum Lapor' && (
                                    <option value={r.keteranganLapor}>{r.keteranganLapor}</option>
                                  )}
                                </select>
                              ) : (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                                  r.keteranganLapor && r.keteranganLapor !== '-'
                                    ? 'text-rose-700 font-bold bg-rose-100 border border-rose-200'
                                    : 'text-slate-400'
                                }`}>
                                  {r.keteranganLapor && r.keteranganLapor !== '-' ? r.keteranganLapor : '-'}
                                </span>
                              )}
                            </td>
                            <td className={`${tdBase} font-semibold text-slate-700 p-1`}>
                              <div className="flex items-center gap-1.5">{renderMealChoices(r)}{r.catatan || ''}</div>
                            </td>
                          </>
                        )}
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
                      <td colSpan={leadingColSpan} className={`${tdBase} text-right text-[11px] uppercase tracking-wider text-slate-700`}>Total Order</td>
                      {activeMealCells.map(c => <td key={c.key} className={`${tdBase} text-center text-slate-900`}>{totals[c.key] || '-'}</td>)}
                      {columnVisibility.batches && (
                        <>
                          <td className={`${tdBase} text-center text-emerald-700`}>{confirmed.pagi}</td>
                          <td className={`${tdBase} text-center text-emerald-700`}>{confirmed.sore}</td>
                        </>
                      )}
                      {columnVisibility.statusNotes && (
                        <>
                          <td className={tdBase} />
                          <td className={`${tdBase} text-rose-600`}>{confirmed.belumLapor ? `${confirmed.belumLapor} belum lapor` : ''}</td>
                          <td className={tdBase} />
                        </>
                      )}
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
                    <div className="grid grid-cols-5 gap-1.5" style={{ gridTemplateColumns: `repeat(${activeMealGroups.length}, minmax(0, 1fr))` }}>
                      {activeMealGroups.map(g => (
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
                    {columnVisibility.batches && (
                      <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                        <span className="flex items-center gap-1">B.Pagi {renderConfirm(r, 'batchPagi')}</span>
                        <span className="flex items-center gap-1">B.Sore {renderConfirm(r, 'batchSore')}</span>
                        {columnVisibility.statusNotes && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-500">Lapor:</span>
                            {canManage ? (
                              <select
                                value={r.keteranganLapor && r.keteranganLapor !== '-' ? 'Belum Lapor' : '-'}
                                onChange={e => {
                                  const val = e.target.value === '-' ? null : e.target.value;
                                  saveCell(r, { keteranganLapor: val });
                                }}
                                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                                  r.keteranganLapor && r.keteranganLapor !== '-' ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <option value="-">-</option>
                                <option value="Belum Lapor">Belum Lapor</option>
                              </select>
                            ) : (
                              <span className={r.keteranganLapor && r.keteranganLapor !== '-' ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                {r.keteranganLapor && r.keteranganLapor !== '-' ? r.keteranganLapor : '-'}
                              </span>
                            )}
                            {renderMealChoices(r)}
                            {r.catatan && <span className="text-slate-600 font-medium truncate">· {r.catatan}</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {filtered.length === 0 && <p className="text-center text-xs text-slate-500 py-6">Tidak ada karyawan yang cocok dengan pencarian.</p>}
            </>
          )}
        </div>
        </>}
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
                f.key === 'keteranganLapor' ? (
                  <Select
                    key={f.key}
                    label={f.label}
                    value={form.keteranganLapor && form.keteranganLapor !== '-' ? 'Belum Lapor' : ''}
                    onChange={e => updateForm('keteranganLapor', e.target.value)}
                  >
                    <option value="">-</option>
                    <option value="Belum Lapor">Belum Lapor</option>
                  </Select>
                ) : (
                  <Input key={f.key} label={f.label} value={form[f.key] || ''} onChange={e => updateForm(f.key, e.target.value)} placeholder={f.placeholder} />
                )
              ))}
              <Select label="Shift (Siang/Malam/Longshift)" value={form.shiftKerja || ''} onChange={e => updateForm('shiftKerja', e.target.value)}>
                <option value="">-</option>
                <option value="SIANG">SIANG</option>
                <option value="MALAM">MALAM</option>
                <option value="LONGSHIFT">LONGSHIFT</option>
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
              <Input label="1 (B.Pagi)" type="number" min={0} value={form.batchPagi || ''} onChange={e => updateForm('batchPagi', e.target.value)} />
              <Input label="1 (B.Sore)" type="number" min={0} value={form.batchSore || ''} onChange={e => updateForm('batchSore', e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
              <Button onClick={submitForm} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pratinjau import */}
      {importPreview && (
        <div className="fixed inset-0 z-[80] bg-slate-950/50 flex items-center justify-center p-4" onClick={() => !importing && setImportPreview(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-900 mb-1">Import Orderan Makanan</h3>
            <p className="text-xs text-slate-600 mb-3 truncate">{importPreview.fileName}</p>
            <div className="rounded-2xl bg-slate-50 p-3 space-y-1 text-xs text-slate-700 mb-3">
              <p><b>{importPreview.rows.length}</b> karyawan terbaca</p>
              <p>
                1 (B.Pagi): <b>{importPreview.rows.reduce((s, r) => s + portions(r.batchPagi), 0)}</b> ·
                1 (B.Sore): <b>{importPreview.rows.reduce((s, r) => s + portions(r.batchSore), 0)}</b> ·
                Belum lapor: <b>{importPreview.rows.filter(r => r.keteranganLapor).length}</b>
              </p>
            </div>
            <Input label="Tanggal order" type="date" value={importPreview.date} onChange={e => e.target.value && setImportPreview(p => (p ? { ...p, date: e.target.value } : p))} />
            <p className="text-[11px] text-slate-500 mt-1">
              {dayName(importPreview.date)}, {longDate(importPreview.date)} — karyawan yang sudah ada di tanggal ini akan diperbarui sesuai file.
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" onClick={() => setImportPreview(null)} disabled={importing}>Batal</Button>
              <Button onClick={confirmImport} disabled={importing}>{importing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Import ${importPreview.rows.length} Data`}</Button>
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
