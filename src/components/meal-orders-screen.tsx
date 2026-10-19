import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Utensils, ArrowLeft, ChevronLeft, ChevronRight, Plus, Copy, Download, Search, Trash2, Edit3, Loader2, X, Users, FileSpreadsheet, Upload, RefreshCw, ArrowLeftRight, Package, Truck, BarChart3, Eye, EyeOff, SlidersHorizontal, ChevronDown, ChevronUp, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input, Select, Button } from './ui';
import { todayWit } from '../utils/training-import';
import { parseMealOrderSheet, type ParsedMealOrderRow, type MealImportField } from '../utils/meal-order-import';
import { isTuesdayWednesdaySaturday, mealChoicePatch, computeMealOrderByRoster, isCatatanDisabledForEmployee, type CatatanOption, type MealPreference, type MealChoice } from '../utils/meal-roster-sync';
import { BungkusRecapSheet, buildBungkusRecap, downloadBungkusRecapPdf, recapTitle, type RecapBlock } from './meal-bungkus-recap';
import { mealCounts, bungkusCount, MEAL_SLOT_BY_GROUP, type MealSlot } from '../utils/meal-bungkus-counts';
import { MealBungkusStats } from './meal-bungkus-stats';
import { MealBungkusRecipientsTable } from './meal-bungkus-recipients';
import { EmployeeProfileExcelImportModal } from './EmployeeProfileExcelImportModal';

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
// Hitungan bungkus per baris (mealCounts / bungkusCount) dari src/utils/meal-bungkus-counts.ts — dipakai juga oleh Rekapan Bungkusan di server

// Filter tabel dari klik kartu ringkasan
type CardFilter = { company: Company | 'all'; kind: 'karyawan' | 'slot' | 'total' | 'belumLapor'; slot?: MealSlot; label: string };

const cellTotal = (rows: MealOrder[], key: MealCellKey, kind: 'kantin' | 'lapangan') =>
  rows.reduce((s, r) => s + (kind === 'kantin' ? (String(r[key] || '').trim() ? 1 : 0) : portions(r[key])), 0);

const PROFILE_FIELDS: { key: keyof MealOrder; label: string; placeholder?: string }[] = [
  { key: 'statusMess', label: 'Status Mess', placeholder: 'CR / Mess' },
  { key: 'pt', label: 'PT' },
  { key: 'shift', label: 'Shift' },
  { key: 'section', label: 'Section' },
  { key: 'sahur', label: 'Keterangan: Sahur', placeholder: '-' },
  { key: 'tidakPuasa', label: 'Keterangan: Tidak Puasa', placeholder: '-' },
  { key: 'tempatTinggal', label: 'Residence', placeholder: 'mis. Nirwana' },
  { key: 'status', label: 'Status' },
  { key: 'keteranganLapor', label: 'Keterangan (Belum Lapor)', placeholder: 'mis. Belum Lapor 1' },
  { key: 'catatan', label: 'Catatan', placeholder: 'mis. DINAS / PHK' },
];

type FormState = Record<string, string>;
const emptyForm = (): FormState => ({ nik: '', nama: '', shiftKerja: 'Nonshift' });

interface Props { inspectorNik?: string; inspectorName?: string; onBack?: () => void }

// Gaya dasar modul Orderan Makanan — satu sumber agar tombol, panel, kartu & input seragam
const UI = {
  panel: 'rounded-2xl bg-white border border-slate-200/80 shadow-sm',
  btn: 'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  btnPrimary: 'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-700 text-white text-xs font-semibold shadow-sm hover:bg-emerald-800 transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
  iconBtn: 'h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer',
  input: 'h-10 rounded-lg border border-slate-200 bg-white text-sm sm:text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-600/15',
  stat: 'rounded-xl bg-white border border-slate-200/80 px-3 py-3 text-center shadow-sm',
  statLabel: 'text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1',
  statValue: 'mt-1 text-2xl font-bold tabular-nums text-slate-900',
  statHint: 'mt-0.5 text-[10px] text-slate-500 truncate',
} as const;

// Scrollbar horizontal mengambang: menempel di bawah layar selama tabel terlihat, sinkron dua arah dengan tabel
function FloatingScrollbar({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scroll: 0, client: 0 });
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const measure = () => setSize({ scroll: el.scrollWidth, client: el.clientWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const onScroll = () => { if (barRef.current && barRef.current.scrollLeft !== el.scrollLeft) barRef.current.scrollLeft = el.scrollLeft; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', onScroll); };
  }, [targetRef]);
  if (size.scroll <= size.client + 1) return null;
  return (
    <div
      ref={barRef}
      onScroll={e => { const el = targetRef.current; if (el && el.scrollLeft !== e.currentTarget.scrollLeft) el.scrollLeft = e.currentTarget.scrollLeft; }}
      className="hidden md:block sticky bottom-3 z-30 -mt-1 overflow-x-auto overflow-y-hidden h-4 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.12)]"
      title="Geser tabel ke kiri / kanan"
    >
      <div style={{ width: size.scroll, height: 1 }} />
    </div>
  );
}

export function MealOrdersScreen({ inspectorNik = '', onBack }: Props) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => todayWit());
  // orders = Orderan Makanan · recipients = Daftar Penerima Bungkusan · recap = List Pengiriman Ke GA · stats = Rekapan Bungkusan
  const [view, setView] = useState<'orders' | 'recipients' | 'recap' | 'stats'>('orders');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableAnchorRef = useRef<HTMLDivElement>(null);
  const [cardFilter, setCardFilter] = useState<CardFilter | null>(null);
  useEffect(() => { setCardFilter(null); }, [date]);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; row?: MealOrder } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MealOrder | null>(null);
  const [isProfileImportOpen, setIsProfileImportOpen] = useState(false);

  // Pengaturan visibilitas kolom & header
  const [columnVisibility, setColumnVisibility] = useState<{
    profile: boolean;     // Status Mess, PT, Shift, Section, Residence
    ramadan: boolean;     // Keterangan Sahur, Tidak Puasa, Takjil
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
          statusNotes: parsed.statusNotes ?? true,
          summary: parsed.summary ?? true,
        };
      }
    } catch (e) {}
    return {
      profile: true,
      ramadan: false,
      statusNotes: true,
      summary: true,
    };
  });

  const [showColMenu, setShowColMenu] = useState(false);
  const [summaryCompanyView, setSummaryCompanyView] = useState<'split' | 'TBP' | 'GPS' | 'all'>('split');

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
    return 4 + (columnVisibility.profile ? 5 : 0) + (columnVisibility.ramadan ? 2 : 0);
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
  const rawRows = data?.data ?? [];
  const isRowBelumLapor = (r: { keteranganLapor?: string | null }) => {
    const v = String(r.keteranganLapor || '').trim();
    return v === 'Belum Lapor' || /belum\s*lapor/i.test(v);
  };

  // Selama status "Belum Lapor" aktif dan belum dimatikan, seluruh orderan makanan, batch, dan catatan dijamin tetap kosong
  const rows = useMemo(() => {
    return rawRows.map(r => {
      if (isRowBelumLapor(r)) {
        return {
          ...r,
          keteranganLapor: 'Belum Lapor',
          pagiKantin: null,
          pagiLapangan: null,
          sahurKantin: null,
          sahurLapangan: null,
          siangKantin: null,
          siangLapangan: null,
          soreKantin: null,
          soreLapangan: null,
          takjilLapangan: null,
          malamLapangan: null,
          batchPagi: null,
          batchSore: null,
          catatan: null,
        };
      }
      return r;
    });
  }, [rawRows]);
  const canManage = !!data?.access?.canManage;

  // Master karyawan untuk isi otomatis form, golongan di Rekapan, & pemetaan PT TBP/GPS
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-master-lite'],
    queryFn: async (): Promise<any[]> => { const r = await fetch('/api/employees'); const j = await r.json(); return Array.isArray(j) ? j : []; },
    enabled: true,
    staleTime: 10 * 60 * 1000,
  });
  const recapBlocks = useMemo(() => (view === 'recap' ? buildBungkusRecap(rows, employees, date) : []), [view, rows, employees, date]);
  const [recapCustomBlocks, setRecapCustomBlocks] = useState<RecapBlock[] | null>(null);

  // Reset custom rekapan jika tanggal berganti
  useEffect(() => {
    setRecapCustomBlocks(null);
  }, [date]);

  const activeRecapBlocks = recapCustomBlocks ?? recapBlocks;

  const sections = useMemo(() => Array.from(new Set(rows.map(r => r.section).filter(Boolean) as string[])).sort(), [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (sectionFilter === 'ALL' || r.section === sectionFilter)
      && (!q || [r.nama, r.nik, r.section, r.tempatTinggal].some(v => String(v || '').toLowerCase().includes(q))));
  }, [rows, search, sectionFilter]);

  // Tanggal sebelumnya yang punya data → sumber "Salin"
  const previousDate = useMemo(() => (data?.dates || []).map(d => String(d.date).slice(0, 10)).find(d => d < date) || null, [data, date]);

  // ===== Ubah data =====
  const patchLocal = (id: number, patch: Partial<MealOrder>) =>
    queryClient.setQueryData<MealPayload>(queryKey, old => old ? { ...old, data: old.data.map(r => (r.id === id ? { ...r, ...patch } : r)) } : old);

  const saveCell = async (row: MealOrder, patch: Partial<MealOrder>) => {
    if (!canManage) return;

    // Jika row berstatus Belum Lapor dan aksi ini bukan mematikan status Belum Lapor:
    // seluruh porsi makanan, batch, dan catatan dijamin tetap kosong
    if (isRowBelumLapor(row) && patch.keteranganLapor === undefined) {
      patch.pagiKantin = null;
      patch.pagiLapangan = null;
      patch.sahurKantin = null;
      patch.sahurLapangan = null;
      patch.siangKantin = null;
      patch.siangLapangan = null;
      patch.soreKantin = null;
      patch.soreLapangan = null;
      patch.takjilLapangan = null;
      patch.malamLapangan = null;
      patch.batchPagi = null;
      patch.batchSore = null;
      patch.catatan = null;
    }

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
    if (key === 'shiftKerja' && value) {
      const sUpper = value.toUpperCase();
      let rosterCode = 'D';
      let canonicalShift = 'Siang';
      if (sUpper === 'CUTI SITE' || sUpper === 'CS') { rosterCode = 'CS'; canonicalShift = 'Cuti Site'; }
      else if (sUpper === 'IZIN') { rosterCode = 'I'; canonicalShift = 'Izin'; }
      else if (sUpper === 'OFF') { rosterCode = 'OFF'; canonicalShift = 'OFF'; }
      else if (sUpper === 'SAKIT' || sUpper === 'SS') { rosterCode = 'SS'; canonicalShift = 'Sakit'; }
      else if (sUpper === 'CUTI') { rosterCode = 'CUTI'; canonicalShift = 'CUTI'; }
      else if (sUpper === 'MALAM') { rosterCode = 'N'; canonicalShift = 'Malam'; }
      else if (sUpper === 'LONGSHIFT') { rosterCode = 'LS'; canonicalShift = 'Longshift'; }
      else if (sUpper === 'NONSHIFT') { rosterCode = 'D'; canonicalShift = 'Nonshift'; }
      else if (sUpper === 'SIANG') { rosterCode = 'D'; canonicalShift = 'Siang'; }

      const empLike = {
        nik: next.nik,
        name: next.nama,
        nama: next.nama,
        statusMess: next.statusMess,
        pt: next.pt,
        shift: next.shift,
        section: next.section,
        tempatTinggal: next.tempatTinggal,
        keteranganLapor: next.keteranganLapor,
      };
      const pref: MealPreference = {
        pagi: (modal?.row?.pilihanPagi as MealChoice) || null,
        sore: (modal?.row?.pilihanSore as MealChoice) || null,
      };
      const computed = computeMealOrderByRoster(empLike, rosterCode, date, pref);
      next.shiftKerja = canonicalShift;
      next.statusKerja = computed.statusKerja || '-';
      next.status = computed.status || '';
      next.pagiKantin = computed.pagiKantin || '';
      next.pagiLapangan = computed.pagiLapangan || '';
      next.siangKantin = computed.siangKantin || '';
      next.siangLapangan = computed.siangLapangan || '';
      next.soreKantin = computed.soreKantin || '';
      next.soreLapangan = computed.soreLapangan || '';
      next.malamLapangan = computed.malamLapangan || '';
      next.batchPagi = computed.batchPagi || '';
      next.batchSore = computed.batchSore || '';
      next.catatan = computed.catatan || '';
    }
    return next;
  });

  const submitForm = async () => {
    if (!modal) return;
    if (!form.nik?.trim() || !form.nama?.trim()) { toast.error('NIK dan Nama wajib diisi'); return; }
    setSaving(true);
    try {
      // Hanya kolom form
      const isBL = form.keteranganLapor === 'Belum Lapor' || /belum\s*lapor/i.test(String(form.keteranganLapor || ''));
      const keys = ['nik', 'nama', 'shiftKerja', 'batchPagi', 'batchSore', ...PROFILE_FIELDS.map(f => f.key as string), ...MEAL_CELLS.map(c => c.key as string)];
      const body: Record<string, unknown> = { ...Object.fromEntries(keys.map(k => [k, form[k] ?? ''])), orderDate: date };

      // Jika Belum Lapor dipilih aktif, seluruh porsi makan, batch, dan catatan wajib dikosongkan
      if (isBL) {
        body.keteranganLapor = 'Belum Lapor';
        body.pagiKantin = null;
        body.pagiLapangan = null;
        body.sahurKantin = null;
        body.sahurLapangan = null;
        body.siangKantin = null;
        body.siangLapangan = null;
        body.soreKantin = null;
        body.soreLapangan = null;
        body.takjilLapangan = null;
        body.malamLapangan = null;
        body.batchPagi = null;
        body.batchSore = null;
        body.catatan = null;
      }

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
  const [importPreview, setImportPreview] = useState<{ fileName: string; date: string; rows: ParsedMealOrderRow[]; fields: MealImportField[] } | null>(null);

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
      setImportPreview({ fileName: file.name, date: parsed.date || date, rows: parsed.rows, fields: parsed.fields });
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
        body: JSON.stringify({ orderDate: importPreview.date, rows: importPreview.rows, fields: importPreview.fields }),
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
  const companyRows = (company: Company) => filtered.filter(r => getRowCompany(r) === company);
  const exportCompany = async (company: Company) => {
    const list = companyRows(company);
    if (list.length === 0) { toast.error(`Tidak ada karyawan ${company} untuk diexport`); return; }
    const XLSX = await import('xlsx');
    const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
    // Kantin = makan di kantin (Mess CR); Bungkusan = Bungkus Lapangan + Bungkus Kantin (NR) — sama dengan kartu ringkasan modul
    const kantinSlots: MealSlot[] = ['pagi', 'siang', 'sore'];
    const bungkusOf = (r: MealOrder, slot: MealSlot) => { const c = mealCounts(r, slot); return c.lapangan + c.bungkusKantin; };
    // Sahur & Takjil hanya ditampilkan bila ada bungkusnya (mis. bulan puasa)
    const withTakjil = list.some(r => bungkusOf(r, 'takjil') > 0);
    const withSahur = list.some(r => bungkusOf(r, 'sahur') > 0);
    const bungkusCols: { slot: MealSlot; label: string }[] = [
      { slot: 'pagi', label: 'Pagi' },
      ...(withSahur ? [{ slot: 'sahur' as MealSlot, label: 'Sahur' }] : []),
      { slot: 'siang', label: 'Siang' }, { slot: 'sore', label: 'Sore' },
      ...(withTakjil ? [{ slot: 'takjil' as MealSlot, label: 'Takjil' }] : []),
      { slot: 'malam', label: 'Malam' },
    ];
    const fixed = ['No', 'NIK', 'Nama', 'Shift', 'Jenis Meal', 'Status'];
    const header1 = [...fixed, 'Kantin', '', '', 'Bungkusan', ...bungkusCols.slice(1).map(() => '')];
    const header2 = [...fixed.map(() => ''), 'Pagi', 'Siang', 'Sore', ...bungkusCols.map(c => c.label)];
    const body = list.map((r, i) => {
      const kantin = kantinSlots.map(s => mealCounts(r, s).makanKantin);
      const bungkus = bungkusCols.map(c => bungkusOf(r, c.slot));
      const jenisMeal = kantin.some(Boolean) || !bungkus.some(Boolean) ? 'Kantin' : 'Bungkusan';
      // Status CS (Cuti Site) dianggap tetap On Duty di site, tidak ditaruh CS lagi di kolom Status
      const sk = String(r.statusKerja || '').trim();
      const st = String(r.status || '').trim();
      const sh = String(r.shiftKerja || '').trim();
      const isCutiSite = sk.toUpperCase() === 'CS' || /cuti\s*site/i.test(sk) ||
                         st.toUpperCase() === 'CS' || /cuti\s*site/i.test(st) ||
                         sh.toUpperCase() === 'CS' || /cuti\s*site/i.test(sh);

      let statusExport = 'On Duty';
      if (!isCutiSite) {
        const absent = sk.match(/^(cuti|izin|sakit|off|dinas)\b/i) ||
                       st.match(/^(cuti|izin|sakit|off|dinas)\b/i) ||
                       sh.match(/^(cuti|izin|sakit|off|dinas)\b/i);
        if (absent) {
          statusExport = titleCase(absent[1]);
        }
      }

      return [
        // Shift hanya Siang / Malam / Longshift: Nonshift, Cuti, Cuti Site, dll. → Siang
        i + 1, r.nik, r.nama, /malam/i.test(r.shiftKerja || '') ? 'Malam' : /long/i.test(r.shiftKerja || '') ? 'Longshift' : 'Siang', jenisMeal,
        statusExport, ...kantin, ...bungkus,
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

  // ===== Status Kehadiran Styling (Cuti = Ungu, Izin = Kuning, Alpa = Merah) =====
  const getAttendanceStatusKind = (r: MealOrder): 'cuti' | 'izin' | 'alpa' | null => {
    const sk = String(r.statusKerja || '').trim().toLowerCase();
    const st = String(r.status || '').trim().toLowerCase();
    const cat = String(r.catatan || '').trim().toLowerCase();

    const sh = String(r.shiftKerja || '').trim().toLowerCase();
    if (sk.includes('cuti') || st.includes('cuti') || cat.includes('cuti') || sh.includes('cuti') || r.pagiKantin === 'C') {
      return 'cuti';
    }
    if (sk === 'izin' || sk.includes('izin') || st === 'izin' || st.includes('izin') || cat.includes('izin') || sh.includes('izin') || sk === 'i' || st === 'i') {
      return 'izin';
    }
    if (sk === 'alpa' || sk.includes('alpa') || st === 'alpa' || st.includes('alpa') || cat.includes('alpa') || sk === 'a' || st === 'a') {
      return 'alpa';
    }
    return null;
  };

  const getShiftBadgeStyle = (shift: string | null | undefined) => {
    const s = String(shift || '').trim().toUpperCase();
    if (s === 'CUTI') return 'bg-purple-100 text-purple-900 border-purple-300';
    if (s === 'CUTI SITE' || s === 'CS') return 'bg-indigo-100 text-indigo-900 border-indigo-300';
    if (s === 'IZIN') return 'bg-amber-100 text-amber-900 border-amber-300';
    if (s === 'OFF') return 'bg-slate-200 text-slate-800 border-slate-300';
    if (s === 'MALAM') return 'bg-blue-100 text-blue-900 border-blue-300';
    if (s === 'LONGSHIFT') return 'bg-orange-100 text-orange-900 border-orange-300';
    if (s === 'NONSHIFT') return 'bg-teal-100 text-teal-900 border-teal-300';
    if (s === 'SIANG') return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getStatusBadgeKind = (text: string | null | undefined): 'cuti' | 'izin' | 'alpa' | null => {
    const s = String(text || '').trim().toLowerCase();
    if (s.includes('cuti')) return 'cuti';
    if (s.includes('izin') || s === 'i') return 'izin';
    if (s.includes('alpa') || s === 'a') return 'alpa';
    return null;
  };

  const renderStatusBadge = (val: string | null | undefined, fallbackKind?: 'cuti' | 'izin' | 'alpa' | null) => {
    const text = String(val || '').trim();
    if (!text || text === '-') return <span className="text-slate-400">-</span>;
    const kind = getStatusBadgeKind(text) || fallbackKind;
    if (kind === 'cuti') {
      return <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">{text}</span>;
    }
    if (kind === 'izin') {
      return <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">{text}</span>;
    }
    if (kind === 'alpa') {
      return <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">{text}</span>;
    }
    return <span>{text}</span>;
  };

  // ===== Render sel =====
  const thBase = 'px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-center align-middle text-slate-600 border border-slate-200 bg-slate-50 whitespace-nowrap';
  const thSticky1 = `${thBase} sticky top-0 z-20`;
  const thSticky2 = `${thBase} sticky top-[32px] z-20`; // = tinggi baris header 1 (py-2 + leading 15px + border)
  const tdBase = 'px-2.5 py-2 text-xs text-slate-700 text-center align-middle border border-slate-100 whitespace-nowrap';

  const renderMealCell = (r: MealOrder, key: MealCellKey, kind: 'kantin' | 'lapangan') => {
    const isBL = isRowBelumLapor(r);
    const v = isBL ? '' : (r[key] || '');
    if (kind === 'kantin') {
      const handleToggleKantin = () => {
        if (!canManage || isBL) return;
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

      const isCutiCell = v === 'C';
      const cellBg = isBL
        ? 'text-slate-300 bg-slate-50/60'
        : isCutiCell
        ? 'bg-purple-100 text-purple-800 border border-purple-300'
        : v ? 'bg-sky-100 text-sky-800' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100';

      return (
        <button
          type="button"
          disabled={!canManage || isCutiCell || isBL}
          onClick={handleToggleKantin}
          className={`w-full h-7 rounded-md text-xs font-black transition-colors ${cellBg} ${canManage && !isCutiCell && !isBL ? 'cursor-pointer hover:ring-2 hover:ring-sky-300' : 'cursor-not-allowed opacity-60'}`}
          title={isBL ? 'Status "Belum Lapor" aktif — matikan status Belum Lapor terlebih dahulu agar orderan dapat diisi' : isCutiCell ? 'Karyawan Cuti' : canManage ? 'Klik untuk pilih Kantin (K)' : undefined}
        >
          {v || '·'}
        </button>
      );
    }
    return renderNumberCell(r, key as LapanganKey, 'amber', 'Jumlah porsi lapangan');
  };

  // Sel angka yang bisa langsung diketik (porsi Lapangan, kolom 1 (B.Pagi) / 1 (B.Sore))
  const renderNumberCell = (r: MealOrder, key: LapanganKey | BatchKey, tone: 'amber' | 'emerald', label: string) => {
    const isBL = isRowBelumLapor(r);
    const v = isBL ? '' : (r[key] || '');
    const filled = tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (!canManage || isBL) {
      return (
        <span
          className="block text-center text-xs font-black text-slate-400 cursor-not-allowed"
          title={isBL ? 'Status "Belum Lapor" aktif — matikan status Belum Lapor terlebih dahulu agar orderan dapat diisi' : undefined}
        >
          {v || '·'}
        </span>
      );
    }
    const sm = (r.statusMess || '').toUpperCase();
    const isCR = sm === 'CR' || sm === 'MESS';
    const isLockedSore = key === 'soreLapangan' && isTuesdayWednesdaySaturday(date) && isCR;

    if (isLockedSore) {
      return (
        <span
          className="block text-center text-xs font-black text-slate-300 cursor-not-allowed select-none"
          title={`Hari ${dayName(date)}: Karyawan Status Mess CR tidak ada Bungkusan Sore (wajib Kantin dan tidak bisa diganti).`}
        >
          -
        </span>
      );
    }

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
                if (isLockedSore) {
                  toast.error(`Hari ${dayName(date)} untuk Status Mess CR wajib Kantin dan tidak bisa Bungkusan Sore.`);
                  e.target.value = '';
                  return;
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


  const switchMealType = (r: MealOrder, time: 'pagi' | 'sore') => {
    if (!canManage || isRowBelumLapor(r)) return;
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
      if (time === 'sore' && isTuesdayWednesdaySaturday(date) && isCR) {
        toast.error(`Hari ${dayName(date)} untuk Status Mess CR tidak ada Bungkusan Sore (wajib Kantin dan tidak dapat diganti).`);
        return;
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
    const sm = (r.statusMess || '').toUpperCase();
    const isCR = ['CR', 'MESS'].includes(sm);
    if (choice === 'lapangan' && time === 'sore' && isTuesdayWednesdaySaturday(date) && isCR) {
      toast.error(`Hari ${dayName(date)} untuk Status Mess CR tidak ada Bungkusan Sore (wajib Kantin dan tidak dapat diganti).`);
      return;
    }
    const label = time === 'pagi' ? 'Pagi' : 'Sore';
    const pilihan: Partial<MealOrder> = time === 'pagi' ? { pilihanPagi: choice } : { pilihanSore: choice };
    saveCell(r, { ...mealChoicePatch(r, time, choice), ...pilihan });
    toast.success(`${r.nama}: ${label} ${choice === 'kantin' ? 'Kantin' : 'Bungkusan'} — berlaku seterusnya (kecuali shift Malam)`);
  };

  // Ganti Shift manual: mengkalkulasi ulang meal order sesuai aturan CSV tabel acuan operasional
  const changeShiftKerja = (r: MealOrder, shiftKerja: string | null) => {
    // Jika status "Belum Lapor" masih aktif: shift tetap diperbarui namun seluruh orderan makanan WAJIB TETAP KOSONG
    if (isRowBelumLapor(r)) {
      const patch: Partial<MealOrder> = {
        shiftKerja: shiftKerja || null,
        keteranganLapor: 'Belum Lapor',
        pagiKantin: null,
        pagiLapangan: null,
        sahurKantin: null,
        sahurLapangan: null,
        siangKantin: null,
        siangLapangan: null,
        soreKantin: null,
        soreLapangan: null,
        takjilLapangan: null,
        malamLapangan: null,
        batchPagi: null,
        batchSore: null,
        catatan: null,
      };
      saveCell(r, patch);
      toast.info(`${r.nama}: Shift diubah ke "${shiftKerja || '-'}", namun orderan makanan tetap kosong karena status "Belum Lapor" masih aktif.`);
      return;
    }

    const sUpper = String(shiftKerja || '').toUpperCase();
    let rosterCode = 'D';
    let canonicalShift = 'Siang';
    if (sUpper === 'CUTI SITE' || sUpper === 'CS') { rosterCode = 'CS'; canonicalShift = 'Cuti Site'; }
    else if (sUpper === 'IZIN') { rosterCode = 'I'; canonicalShift = 'Izin'; }
    else if (sUpper === 'OFF') { rosterCode = 'OFF'; canonicalShift = 'OFF'; }
    else if (sUpper === 'SAKIT' || sUpper === 'SS') { rosterCode = 'SS'; canonicalShift = 'Sakit'; }
    else if (sUpper === 'CUTI') { rosterCode = 'CUTI'; canonicalShift = 'CUTI'; }
    else if (sUpper === 'MALAM') { rosterCode = 'N'; canonicalShift = 'Malam'; }
    else if (sUpper === 'LONGSHIFT') { rosterCode = 'LS'; canonicalShift = 'Longshift'; }
    else if (sUpper === 'NONSHIFT') { rosterCode = 'D'; canonicalShift = 'Nonshift'; }
    else if (sUpper === 'SIANG') { rosterCode = 'D'; canonicalShift = 'Siang'; }
    else if (!shiftKerja) { rosterCode = '-'; canonicalShift = ''; }
    else { rosterCode = shiftKerja; canonicalShift = shiftKerja; }

    const pref: MealPreference = {
      pagi: (r.pilihanPagi as MealChoice) || null,
      sore: (r.pilihanSore as MealChoice) || null,
    };
    const currentCat = String(r.catatan || '').trim();
    if (currentCat === 'Bungkusan Pagi') {
      pref.pagi = 'lapangan';
      pref.sore = 'kantin';
    } else if (currentCat === 'Bungkusan Sore') {
      pref.pagi = 'kantin';
      pref.sore = 'lapangan';
    } else if (currentCat === 'Bungkusan Pagi dan Bungkusan Sore') {
      pref.pagi = 'lapangan';
      pref.sore = 'lapangan';
    } else if (currentCat === '-') {
      pref.pagi = 'kantin';
      pref.sore = 'kantin';
    }

    const computed = computeMealOrderByRoster(r, rosterCode, date, pref);
    computed.shiftKerja = canonicalShift || null;

    const patch: Partial<MealOrder> = {
      shiftKerja: computed.shiftKerja,
      statusKerja: computed.statusKerja,
      status: computed.status,
      pagiKantin: computed.pagiKantin,
      pagiLapangan: computed.pagiLapangan,
      siangKantin: computed.siangKantin,
      siangLapangan: computed.siangLapangan,
      soreKantin: computed.soreKantin,
      soreLapangan: computed.soreLapangan,
      malamLapangan: computed.malamLapangan,
      batchPagi: computed.batchPagi,
      batchSore: computed.batchSore,
      catatan: computed.catatan,
    };
    saveCell(r, patch);
    toast.success(`${r.nama}: Shift diubah ke "${canonicalShift || '-'}", orderan makanan diperbarui.`);
  };

  const isKawasiRow = (r: MealOrder) => `${r.tempatTinggal || ''}`.toLowerCase().includes('kawasi');

  const getRowCatatanValue = (r: MealOrder): CatatanOption => {
    if (isCatatanDisabledForEmployee(r)) return '-';
    const sm = (r.statusMess || '').toUpperCase();
    const isCR = sm === 'CR' || sm === 'MESS';
    const isLockedSore = isTuesdayWednesdaySaturday(date) && isCR;

    const c = String(r.catatan || '').trim();
    if (c === 'Bungkusan Pagi dan Bungkusan Sore') return isLockedSore ? 'Bungkusan Pagi' : c;
    if (c === 'Bungkusan Pagi') return c;
    if (c === 'Bungkusan Sore') return isLockedSore ? '-' : c;
    // Deteksi fallback dari porsi lapangan
    const p = portions(r.pagiLapangan) > 0;
    const s = portions(r.soreLapangan) > 0 && String(r.shiftKerja || '').toUpperCase() !== 'LONGSHIFT';
    if (p && s && !isLockedSore) return 'Bungkusan Pagi dan Bungkusan Sore';
    if (p) return 'Bungkusan Pagi';
    if (s && !isLockedSore) return 'Bungkusan Sore';
    return '-';
  };

  const handleSelectCatatan = (r: MealOrder, val: string) => {
    if (!canManage) return;
    if (isCatatanDisabledForEmployee(r)) {
      toast.info(isKawasiRow(r)
        ? 'Karyawan Kampung Kawasi: Matikan Catatan ini atau tidak bisa di Pilih.'
        : `Matikan Catatan ini atau tidak bisa di Pilih (${r.shiftKerja || r.status || 'Tidak Bertugas'})`
      );
      return;
    }
    const sm = String(r.statusMess || '').trim().toUpperCase();
    const isCR = sm === 'CR' || sm === 'MESS';
    const isLockedSore = isTuesdayWednesdaySaturday(date) && isCR;

    if (isLockedSore && (val === 'Bungkusan Sore' || val === 'Bungkusan Pagi dan Bungkusan Sore')) {
      toast.error(`Hari ${dayName(date)} untuk Status Mess CR tidak ada Bungkusan Sore (wajib Kantin dan tidak dapat diganti).`);
      return;
    }
    const isNR = sm === 'NR';
    const isNirwana = `${r.tempatTinggal || ''}`.toLowerCase().includes('nirwana');
    const kantinVal = isNR && isNirwana ? '1' : 'K';
    const isLS = String(r.shiftKerja || '').toUpperCase() === 'LONGSHIFT';

    const patch: Partial<MealOrder> = {
      catatan: val === '-' ? '-' : val,
    };

    if (val === 'Bungkusan Pagi') {
      patch.pilihanPagi = 'lapangan';
      patch.pilihanSore = 'kantin';
      patch.pagiLapangan = '1';
      patch.pagiKantin = null;
      patch.batchPagi = null;
      if (!isLS) {
        patch.soreKantin = kantinVal;
        patch.soreLapangan = null;
        patch.batchSore = isNR && isNirwana ? '1' : null;
      }
    } else if (val === 'Bungkusan Sore') {
      patch.pilihanPagi = 'kantin';
      patch.pilihanSore = 'lapangan';
      patch.pagiKantin = kantinVal;
      patch.pagiLapangan = null;
      patch.batchPagi = isNR && isNirwana ? '1' : null;
      patch.soreLapangan = '1';
      patch.soreKantin = null;
      patch.batchSore = null;
    } else if (val === 'Bungkusan Pagi dan Bungkusan Sore') {
      patch.pilihanPagi = 'lapangan';
      patch.pilihanSore = 'lapangan';
      patch.pagiLapangan = '1';
      patch.pagiKantin = null;
      patch.batchPagi = null;
      patch.soreLapangan = '1';
      patch.soreKantin = null;
      patch.batchSore = null;
    } else {
      // '-' (Kantin default)
      patch.pilihanPagi = 'kantin';
      patch.pilihanSore = 'kantin';
      patch.pagiKantin = kantinVal;
      patch.pagiLapangan = null;
      patch.batchPagi = isNR && isNirwana ? '1' : null;
      if (!isLS) {
        patch.soreKantin = kantinVal;
        patch.soreLapangan = null;
        patch.batchSore = isNR && isNirwana ? '1' : null;
      }
    }

    saveCell(r, patch);
    toast.success(`${r.nama}: Catatan diubah ke "${val}"`);
  };

  const handleToggleBelumLapor = (r: MealOrder, rawVal: string) => {
    if (!canManage) return;
    const isBelumLapor = rawVal === 'Belum Lapor';

    if (isBelumLapor) {
      // Jika Belum Lapor aktif: seluruh orderan makanan KOSONG sampai status Belum Lapor dimatikan
      const patch: Partial<MealOrder> = {
        keteranganLapor: 'Belum Lapor',
        pagiKantin: null,
        pagiLapangan: null,
        sahurKantin: null,
        sahurLapangan: null,
        siangKantin: null,
        siangLapangan: null,
        soreKantin: null,
        soreLapangan: null,
        takjilLapangan: null,
        malamLapangan: null,
        batchPagi: null,
        batchSore: null,
        catatan: null,
      };
      saveCell(r, patch);
      toast.info(`${r.nama}: Status "Belum Lapor" aktif — seluruh orderan makanan dikosongkan.`);
    } else {
      // Belum Lapor dimatikan: kembali ke roster kerja tanggal tsb (mis. roster N → Malam) — dihitung di server dari
      // sheet "Database Rooster Prep & Lab" agar memakai kode roster asli, bukan tebakan dari kolom Shift
      clearBelumLapor(r);
    }
  };

  const clearBelumLapor = async (r: MealOrder) => {
    patchLocal(r.id, { keteranganLapor: null });
    try {
      const res = await fetch(`/api/meal-orders/${r.id}/clear-belum-lapor`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal mematikan Belum Lapor');
      patchLocal(r.id, json.data);
      const shift = json.data?.shiftKerja ? ` · ${json.data.shiftKerja === 'MALAM' ? 'Malam' : json.data.shiftKerja === 'LONGSHIFT' ? 'Longshift' : json.data.shiftKerja}` : '';
      toast.success(json.rosterCode
        ? `${r.nama}: Belum Lapor dimatikan — kembali ke roster ${json.rosterCode}${shift}`
        : `${r.nama}: Belum Lapor dimatikan — kode roster tanggal ini tidak ditemukan, orderan dihitung sebagai hari kerja biasa`);
    } catch (e: any) {
      patchLocal(r.id, { keteranganLapor: r.keteranganLapor });
      toast.error(e.message);
    }
  };

  const renderCatatanCell = (r: MealOrder) => {
    const isKawasi = isKawasiRow(r);
    const isBelumLapor = r.keteranganLapor === 'Belum Lapor';
    const isDisabled = isCatatanDisabledForEmployee(r) || isBelumLapor || !canManage;

    const currentVal = getRowCatatanValue(r);
    const rawCatatan = String(r.catatan || '').trim();
    const isCustomCatatan = rawCatatan && !['-', 'Bungkusan Pagi', 'Bungkusan Sore', 'Bungkusan Pagi dan Bungkusan Sore'].includes(rawCatatan);

    const disabledTitle = isBelumLapor
      ? 'Belum Lapor: Matikan status Belum Lapor terlebih dahulu agar orderan & catatan aktif'
      : isKawasi
      ? 'Matikan Catatan ini atau tidak bisa di Pilih (Kampung Kawasi)'
      : !canManage
      ? 'Hanya Admin yang dapat mengubah Catatan'
      : `Matikan Catatan ini atau tidak bisa di Pilih (${r.shiftKerja || r.status || 'Tidak Bertugas'})`;

    const badgeStyle = currentVal === 'Bungkusan Pagi dan Bungkusan Sore'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
      : currentVal === 'Bungkusan Pagi'
      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
      : currentVal === 'Bungkusan Sore'
      ? 'bg-orange-50 text-orange-900 border-orange-300 font-bold'
      : 'bg-white text-slate-600 border-slate-200';

    if (isDisabled) {
      return (
        <div className="flex items-center justify-center gap-1" title={disabledTitle}>
          <span className="inline-block px-2 py-0.5 rounded text-xs text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed">
            {isCustomCatatan ? rawCatatan : '-'}
          </span>
          {isCustomCatatan && <span className="text-[11px] text-slate-500 font-medium">{rawCatatan}</span>}
        </div>
      );
    }

    const sm = String(r.statusMess || '').trim().toUpperCase();
    const isCR = sm === 'CR' || sm === 'MESS';
    const isLockedSore = isTuesdayWednesdaySaturday(date) && isCR;

    return (
      <div className="flex items-center justify-center gap-1">
        <select
          value={currentVal}
          onChange={e => handleSelectCatatan(r, e.target.value)}
          className={`rounded-md text-xs px-2 py-1 focus:outline-none border transition-colors cursor-pointer ${badgeStyle}`}
          title="Pilih Catatan: Bungkusan Pagi / Bungkusan Sore / Bungkusan Pagi dan Bungkusan Sore"
        >
          <option value="-">-</option>
          <option value="Bungkusan Pagi">Bungkusan Pagi</option>
          {!isLockedSore && <option value="Bungkusan Sore">Bungkusan Sore</option>}
          {!isLockedSore && <option value="Bungkusan Pagi dan Bungkusan Sore">Bungkusan Pagi dan Bungkusan Sore</option>}
          {isCustomCatatan && <option value={rawCatatan}>{rawCatatan}</option>}
        </select>
        {isCustomCatatan && <span className="text-[11px] text-slate-500 font-medium">{rawCatatan}</span>}
      </div>
    );
  };


  const empByNikMap = useMemo(() => {
    return new Map<string, any>(employees.map((e: any) => [String(e.nik || '').trim().toUpperCase(), e]));
  }, [employees]);

  const getRowCompany = useMemo(() => {
    return (r: MealOrder): Company => {
      const ptStr = String(r.pt || '').trim().toUpperCase();
      if (ptStr.includes('GPS')) return 'GPS';
      if (ptStr.includes('TBP')) return 'TBP';
      const emp = empByNikMap.get(String(r.nik || '').trim().toUpperCase());
      const empPt = String(emp?.pt || emp?.company || '').trim().toUpperCase();
      if (empPt.includes('GPS')) return 'GPS';
      return 'TBP';
    };
  }, [empByNikMap]);

  const buildSummaryCards = (list: MealOrder[]) => {
    return activeMealGroups.map(g => {
      const slot = MEAL_SLOT_BY_GROUP[g.label];
      const sum = (k: keyof ReturnType<typeof mealCounts>) => (slot ? list.reduce((s, r) => s + mealCounts(r, slot)[k], 0) : 0);
      const lap = sum('lapangan');
      const bungkusKantin = sum('bungkusKantin');
      const makanKantin = sum('makanKantin');

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
  };

  const getConfirmedSummary = (list: MealOrder[]) => ({
    pagi: list.reduce((s, r) => s + portions(r.batchPagi), 0),
    sore: list.reduce((s, r) => s + portions(r.batchSore), 0),
    belumLapor: list.filter(r => r.keteranganLapor && r.keteranganLapor.trim() !== '-').length,
  });

  const tbpFiltered = useMemo(() => filtered.filter(r => getRowCompany(r) === 'TBP'), [filtered, getRowCompany]);
  const gpsFiltered = useMemo(() => filtered.filter(r => getRowCompany(r) === 'GPS'), [filtered, getRowCompany]);

  const summaryCardsAll = useMemo(() => buildSummaryCards(filtered), [activeMealGroups, filtered]);
  const summaryCardsTbp = useMemo(() => buildSummaryCards(tbpFiltered), [activeMealGroups, tbpFiltered]);
  const summaryCardsGps = useMemo(() => buildSummaryCards(gpsFiltered), [activeMealGroups, gpsFiltered]);

  // Kartu Total Bungkusan: jumlah bungkus semua waktu makan (Pagi, Sahur, Siang, Sore, Takjil, Malam)
  const renderTotalBungkusCard = (cards: { label: string; value: number }[], scope: string) => {
    const total = cards.reduce((s, c) => s + c.value, 0);
    const detail = cards.filter(c => c.value > 0).map(c => `${c.label} ${c.value}`).join(' · ') || 'Belum ada bungkusan';
    return (
      <div className="rounded-xl bg-emerald-700 border border-emerald-800 px-3 py-3 text-center shadow-sm" title={`${scope}: Total ${total} Bungkusan (${detail})`}>
        <p className={`${UI.statLabel} !text-emerald-100`}><Package className="w-3 h-3" />Total Bungkusan</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-white">{total} <span className="text-xs font-normal text-emerald-100">bungkus</span></p>
        <p className="mt-0.5 text-[10px] text-emerald-100 truncate" title={detail}>{detail}</p>
      </div>
    );
  };

  // Klik kartu → tabel di bawah hanya menampilkan karyawan yang dihitung kartu tsb (klik lagi = tampilkan semua)
  const isActiveCard = (f: CardFilter) => !!cardFilter && cardFilter.company === f.company && cardFilter.kind === f.kind && cardFilter.slot === f.slot;
  const pickCard = (f: CardFilter) => {
    const next = isActiveCard(f) ? null : f;
    setCardFilter(next);
    if (next) setTimeout(() => tableAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const cardBtn = (f: CardFilter, base: string = UI.stat) =>
    `${base} w-full cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${isActiveCard(f) ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`;

  // Satu baris kartu ringkasan (dipakai TBP, GPS & Gabungan) agar tampilannya identik
  const renderSummaryRow = (opts: {
    key: string; company: Company | 'all'; title: string; dot: string; scope: string;
    list: MealOrder[]; cards: { label: string; value: number; detail: string }[];
    confirmed: { pagi: number; sore: number; belumLapor: number };
  }) => {
    const f = (kind: CardFilter['kind'], label: string, slot?: MealSlot): CardFilter => ({ company: opts.company, kind, slot, label: `${opts.scope} · ${label}` });
    const totalCard = f('total', 'Total Bungkusan');
    return (
      <div key={opts.key} className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className={`w-2 h-2 rounded-full ${opts.dot}`} />
          <span className="text-xs font-semibold text-slate-800">{opts.title}</span>
          <span className="text-xs text-slate-400">· {opts.list.length} karyawan · klik kartu untuk melihat daftar karyawan</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
          <button type="button" onClick={() => pickCard(f('karyawan', 'Semua Karyawan'))} className={cardBtn(f('karyawan', ''))} title="Tampilkan semua karyawan di tabel">
            <p className={UI.statLabel}><Users className="w-3 h-3" />Karyawan</p>
            <p className={UI.statValue}>{opts.list.length}</p>
            <p className={UI.statHint}>{dayName(date)}, {longDate(date)}</p>
          </button>
          {opts.cards.map(c => {
            const slot = MEAL_SLOT_BY_GROUP[c.label];
            const cf = f('slot', `Bungkusan ${c.label}`, slot);
            return (
              <button type="button" key={`${opts.key}-${c.label}`} onClick={() => pickCard(cf)} className={cardBtn(cf)} title={`${opts.scope} ${c.label}: Total ${c.value} Bungkusan (${c.detail}) — klik untuk melihat karyawannya`}>
                <p className={UI.statLabel}>{c.label}</p>
                <p className={UI.statValue}>{c.value} <span className="text-xs font-normal text-slate-400">bungkus</span></p>
                <p className={UI.statHint} title={c.detail}>{c.detail}</p>
              </button>
            );
          })}
          <button type="button" onClick={() => pickCard(totalCard)} className={`w-full cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md rounded-xl focus:outline-none ${isActiveCard(totalCard) ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
            {renderTotalBungkusCard(opts.cards, opts.scope)}
          </button>
          {columnVisibility.statusNotes && (() => {
            const cf = f('belumLapor', 'Belum Lapor');
            return (
              <button type="button" onClick={() => pickCard(cf)} className={cardBtn(cf)} title="Klik untuk melihat karyawan yang belum lapor">
                <p className={UI.statLabel}>Belum Lapor</p>
                <p className={`${UI.statValue} ${opts.confirmed.belumLapor ? '!text-rose-600' : ''}`}>{opts.confirmed.belumLapor}</p>
                <p className={UI.statHint}>karyawan</p>
              </button>
            );
          })()}
        </div>
      </div>
    );
  };

  // Baris tabel: semua hasil pencarian/section, atau hanya karyawan dari kartu ringkasan yang diklik
  const activeSlots = useMemo(() => activeMealGroups.map(g => MEAL_SLOT_BY_GROUP[g.label]).filter(Boolean) as MealSlot[], [activeMealGroups]);
  const tableRows = useMemo(() => {
    if (!cardFilter) return filtered;
    return filtered.filter(r => {
      if (cardFilter.company !== 'all' && getRowCompany(r) !== cardFilter.company) return false;
      switch (cardFilter.kind) {
        case 'slot': return !!cardFilter.slot && bungkusCount(r, cardFilter.slot) > 0;
        case 'total': return activeSlots.some(s => bungkusCount(r, s) > 0);
        case 'belumLapor': return !!r.keteranganLapor && r.keteranganLapor.trim() !== '-';
        default: return true;
      }
    });
  }, [filtered, cardFilter, getRowCompany, activeSlots]);
  const tableTotals = useMemo(() => Object.fromEntries(activeMealCells.map(c => [c.key, cellTotal(tableRows, c.key, c.kind)])) as Record<MealCellKey, number>, [tableRows, activeMealCells]);
  const tableConfirmed = useMemo(() => getConfirmedSummary(tableRows), [tableRows]);
  // Jumlah bungkus kartu terpilih untuk karyawan yang tampil (bila kartu waktu makan / total)
  const cardFilterBungkus = useMemo(() => {
    if (!cardFilter) return 0;
    if (cardFilter.kind === 'slot' && cardFilter.slot) return tableRows.reduce((s, r) => s + bungkusCount(r, cardFilter.slot!), 0);
    if (cardFilter.kind === 'total') return tableRows.reduce((s, r) => s + activeSlots.reduce((a, sl) => a + bungkusCount(r, sl), 0), 0);
    return 0;
  }, [cardFilter, tableRows, activeSlots]);

  const confirmedAll = useMemo(() => getConfirmedSummary(filtered), [filtered]);
  const confirmedTbp = useMemo(() => getConfirmedSummary(tbpFiltered), [tbpFiltered]);
  const confirmedGps = useMemo(() => getConfirmedSummary(gpsFiltered), [gpsFiltered]);

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      <div className="w-full max-w-[2200px] mx-auto px-3 sm:px-4 lg:px-5 py-3 sm:py-5 space-y-4">
        {/* Header: judul + tanggal | aksi */}
        <div className={`${UI.panel} px-4 sm:px-5 py-4 space-y-4`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {onBack && (
                <button type="button" onClick={onBack} className={UI.iconBtn} title="Kembali">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm"><Utensils className="w-5 h-5" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">Orderan Makanan</h1>
                  {isFetching && !isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                </div>
                <p className="text-xs text-slate-500">Order harian Pagi, Siang, Sore & Malam · sinkron dengan Roster & Cuti</p>
              </div>
            </div>

            {/* Navigasi tanggal */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <button type="button" onClick={() => setDate(d => shiftDate(d, -1))} className="h-10 w-10 flex items-center justify-center rounded-l-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 cursor-pointer" title="Hari sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
                <div className="px-3 text-center leading-tight border-x border-slate-200 min-w-[140px]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{dayName(date)}</p>
                  <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer" />
                </div>
                <button type="button" onClick={() => setDate(d => shiftDate(d, 1))} className="h-10 w-10 flex items-center justify-center rounded-r-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 cursor-pointer" title="Hari berikutnya"><ChevronRight className="w-4 h-4" /></button>
              </div>
              {date !== todayWit() && (
                <button type="button" onClick={() => setDate(todayWit())} className={UI.btn}>Hari ini</button>
              )}
            </div>
          </div>

          {/* Toolbar aksi: Data | Export | Tambah */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={handleSyncRoster}
                  disabled={syncingRoster}
                  className={UI.btn}
                  title='Sinkronkan orderan makanan tanggal ini langsung dari Google Sheets "Database Rooster Prep & Lab" (Rooster_Staff & Rooster_Crew)'
                >
                  {syncingRoster ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <RefreshCw className="w-4 h-4 text-indigo-600" />} Sinkron Roster
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className={UI.btn}
                  title="Import sheet Orderan Makanan (Excel / CSV)"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-500" />} Import
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
                <button
                  type="button"
                  onClick={() => setIsProfileImportOpen(true)}
                  className={`${UI.btn} bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-800 border-emerald-300 font-bold shadow-xs`}
                  title="Import Excel untuk memperbarui Profil Karyawan (PT, Status Mess, Shift, Section, Tempat Tinggal)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Perbarui Profil Karyawan</span>
                </button>
                <button
                  type="button"
                  onClick={openGoogleSheet}
                  disabled={syncingSheet}
                  className={UI.btn}
                  title='Sinkron & buka Google Sheets "Meal Order" (folder Administration) — hanya Section Administrasi yang bisa mengedit'
                >
                  {syncingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />} Google Sheets
                </button>
                <span className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />
              </>
            )}
            {COMPANIES.map(company => {
              const count = companyRows(company).length;
              return (
                <button
                  key={company}
                  type="button"
                  onClick={() => exportCompany(company)}
                  disabled={count === 0}
                  className={UI.btn}
                  title={`Export Excel orderan karyawan ${company} (${count} orang)`}
                >
                  <Download className="w-4 h-4 text-slate-500" /> Export {company}
                </button>
              );
            })}
            {canManage && (
              <button type="button" onClick={openCreate} className={`${UI.btnPrimary} sm:ml-auto`}>
                <Plus className="w-4 h-4" /> Tambah Karyawan
              </button>
            )}
          </div>
        </div>

        {/* Tab: Orderan Makanan / Daftar Penerima Bungkusan / List Pengiriman Ke GA / Rekapan Bungkusan */}
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {([
            ['orders', 'Orderan Makanan', Utensils],
            ['recipients', 'Daftar Penerima Bungkusan', Users],
            ['recap', 'List Pengiriman Ke GA', Truck],
            ['stats', 'Rekapan Bungkusan', BarChart3]
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${view === key ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {view === 'recipients' && (
          <MealBungkusRecipientsTable date={date} rows={rows} />
        )}

        {view === 'stats' && (
          <MealBungkusStats date={date} onOpenDate={d => { setDate(d); setView('orders'); }} />
        )}

        {view === 'recap' && (
          <div className={`${UI.panel} p-4 sm:p-5 space-y-4 min-w-0`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-900">List Pengiriman Ke GA <span className="font-medium text-slate-400">· {dayName(date)}, {longDate(date)}</span></p>
                <p className="text-xs text-slate-500 mt-0.5">Dihitung otomatis dari porsi Lapangan & Bungkus Kantin NR. Gol IV-V yang pesan bungkusan Pagi/Siang/Sore tampil sebagai Kotakan.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setDownloadingPdf(true);
                  try {
                    await downloadBungkusRecapPdf(date, activeRecapBlocks);
                  } catch (e: any) {
                    toast.error(`Gagal membuat PDF: ${e?.message || e}`);
                  } finally {
                    setDownloadingPdf(false);
                  }
                }}
                disabled={rows.length === 0 || employeesLoading || downloadingPdf}
                className={`${UI.btnPrimary} shrink-0`}
                title="Download file PDF List Pengiriman Ke GA (A4 landscape)"
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
              </button>
            </div>
            {isLoading || employeesLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}</div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Belum ada orderan untuk {dayName(date)}, {longDate(date)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Rekapan muncul otomatis setelah orderan tanggal ini terisi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <BungkusRecapSheet
                  title={recapTitle(date)}
                  blocks={activeRecapBlocks}
                  onChangeBlocks={setRecapCustomBlocks}
                  canManage={canManage}
                  onReset={() => setRecapCustomBlocks(null)}
                />
              </div>
            )}
          </div>
        )}

        {view === 'orders' && <>
        {/* Ringkasan bungkusan per perusahaan (TBP & GPS dipisahkan / gabungan) */}
        {columnVisibility.summary && (
          <div className={`${UI.panel} p-4 sm:p-5 space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Ringkasan Bungkusan</p>
                <p className="text-xs text-slate-500">{dayName(date)}, {longDate(date)}</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {([
                  ['split', 'Pisahkan (TBP & GPS)', 'Tampilkan terpisah: PT TBP dan PT GPS masing-masing baris kartu tersendiri'],
                  ['TBP', `PT TBP (${tbpFiltered.length})`, 'Hanya ringkasan PT Trimegah Bangun Persada'],
                  ['GPS', `PT GPS (${gpsFiltered.length})`, 'Hanya ringkasan PT Gane Permai Sentosa'],
                  ['all', `Gabungan (${filtered.length})`, 'Total gabungan semua karyawan'],
                ] as const).map(([key, label, title]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSummaryCompanyView(key)}
                    className={`h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      summaryCompanyView === key ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title={title}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {(summaryCompanyView === 'split' || summaryCompanyView === 'TBP') && renderSummaryRow({
              key: 'tbp', company: 'TBP', title: 'PT Trimegah Bangun Persada (TBP)', dot: 'bg-blue-600', scope: 'TBP',
              list: tbpFiltered, cards: summaryCardsTbp, confirmed: confirmedTbp,
            })}
            {(summaryCompanyView === 'split' || summaryCompanyView === 'GPS') && renderSummaryRow({
              key: 'gps', company: 'GPS', title: 'PT Gane Permai Sentosa (GPS)', dot: 'bg-emerald-600', scope: 'GPS',
              list: gpsFiltered, cards: summaryCardsGps, confirmed: confirmedGps,
            })}
            {summaryCompanyView === 'all' && renderSummaryRow({
              key: 'all', company: 'all', title: 'Total Gabungan (TBP & GPS)', dot: 'bg-slate-600', scope: 'Total Gabungan',
              list: filtered, cards: summaryCardsAll, confirmed: confirmedAll,
            })}
          </div>
        )}

        {/* Tabel */}
        <div ref={tableAnchorRef} className={`${UI.panel} p-4 sm:p-5 space-y-4 min-w-0 scroll-mt-4`}>
          {/* Filter dari kartu ringkasan */}
          {cardFilter && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <span className="text-emerald-900">Menampilkan <b>{cardFilter.label}</b></span>
                <span className="text-emerald-700">· {tableRows.length} karyawan{cardFilterBungkus ? ` · ${cardFilterBungkus} bungkus` : ''}</span>
              </div>
              <button type="button" onClick={() => setCardFilter(null)} className={`${UI.btn} !h-8 !border-emerald-300 !text-emerald-800 shrink-0`}>
                <X className="w-3.5 h-3.5" /> Tampilkan semua karyawan
              </button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, NIK, section, residence..."
                className={`${UI.input} w-full pl-9 pr-3`}
              />
            </div>
            <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className={`${UI.input} px-3 font-semibold cursor-pointer`}>
              <option value="ALL">Semua Section</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Quick toggle: Info Profil */}
            <button
              type="button"
              onClick={() => updateColVisibility({ profile: !columnVisibility.profile })}
              className={`${UI.btn} !h-10 shrink-0 ${columnVisibility.profile ? '' : '!border-emerald-300 !bg-emerald-50 !text-emerald-800'}`}
              title={columnVisibility.profile ? 'Sembunyikan kolom info profil (Status Mess, PT, Shift, Section, Residence)' : 'Tampilkan kolom info profil'}
            >
              {columnVisibility.profile ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{columnVisibility.profile ? 'Sembunyikan Profil' : 'Tampilkan Profil'}</span>
            </button>

            {/* Menu Popover: Atur Kolom */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowColMenu(v => !v)}
                className={`${UI.btn} !h-10 ${showColMenu ? '!border-emerald-500 !bg-emerald-50 !text-emerald-800' : ''}`}
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
                          <p className="text-[10px] text-slate-500">Mess, PT, Shift, Section, Residence</p>
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
                        onClick={() => updateColVisibility({ profile: true, ramadan: true, statusNotes: true, summary: true })}
                        className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                      >
                        Tampilkan Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => updateColVisibility({ profile: false, ramadan: false, statusNotes: true, summary: true })}
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

          {/* Indikator status kehadiran (Cuti Ungu, Izin Kuning, Alpa Merah) */}
          <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">Status Kehadiran:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-600" /> Cuti (Ungu)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Izin (Kuning)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Alpa (Merah)
            </span>
          </div>

          {/* Indikator kolom tersembunyi */}
          {(!columnVisibility.profile || !columnVisibility.ramadan || !columnVisibility.statusNotes) && (
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
                onClick={() => updateColVisibility({ profile: true, ramadan: true, statusNotes: true })}
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

              {/* Desktop / tablet: tabel seperti sheet dengan Freeze Pane Header & Kolom */}
              <div
                ref={tableScrollRef}
                className="hidden md:block overflow-auto max-h-[74vh] min-h-[460px] rounded-xl border border-slate-200 bg-white shadow-xs relative [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
              >
                <table className="w-full border-collapse text-center">
                  <thead className="sticky top-0 z-20 bg-emerald-50 shadow-sm">
                    <tr>
                      <th rowSpan={2} className={`${thBase} sticky top-0 left-0 z-40 w-12 min-w-[48px] max-w-[48px] bg-emerald-50 text-center shadow-[1px_0_0_0_#a7f3d0]`}>No</th>
                      <th rowSpan={2} className={`${thBase} sticky top-0 left-[48px] z-40 min-w-[200px] bg-emerald-50 text-left shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]`}>Nama Karyawan</th>
                      <th rowSpan={2} className={thSticky1}>NIK</th>
                      {columnVisibility.profile && (
                        <>
                          <th rowSpan={2} className={thSticky1}>
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
                          <th rowSpan={2} className={thSticky1} title="PT / Perusahaan (Terkunci: hanya dapat dirubah via Edit Manual atau Import Perbarui Profil Karyawan)">
                            <div className="flex items-center justify-center gap-1">
                              <span>PT</span>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            </div>
                          </th>
                          <th rowSpan={2} className={thSticky1}>Shift</th>
                          <th rowSpan={2} className={thSticky1}>Section</th>
                        </>
                      )}
                      {columnVisibility.ramadan && (
                        <th colSpan={2} className={`${thSticky1} text-center`}>
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
                        <th rowSpan={2} className={thSticky1}>Residence</th>
                      )}
                      <th rowSpan={2} className={`${thSticky1} text-center`}>Shift<br />(Siang/Malam)</th>
                      {activeMealGroups.map(g => (
                        <th key={g.label} colSpan={g.cells.length} className={`${thSticky1} text-center !bg-slate-100 !text-slate-700`}>
                          {g.label}
                        </th>
                      ))}
                      {columnVisibility.statusNotes && (
                        <>
                          <th rowSpan={2} className={thSticky1}>
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
                          <th rowSpan={2} className={thSticky1}>Keterangan<br />(Belum Lapor)</th>
                          <th rowSpan={2} className={thSticky1}>Catatan</th>
                        </>
                      )}
                      {canManage && <th rowSpan={2} className={thSticky1} />}
                    </tr>
                    <tr>
                      {columnVisibility.ramadan && (
                        <>
                          <th className={`${thSticky2} text-center`}>Sahur</th>
                          <th className={`${thSticky2} text-center`}>Tidak Puasa</th>
                        </>
                      )}
                      {activeMealCells.map(c => (
                        <th key={c.key} className={`${thSticky2} text-center !bg-slate-100/70`}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r, i) => {
                      const attKind = getAttendanceStatusKind(r);
                      const rowBg = attKind === 'cuti'
                        ? 'bg-purple-50/50 hover:bg-purple-100/60'
                        : attKind === 'izin'
                        ? 'bg-amber-50/60 hover:bg-amber-100/70'
                        : attKind === 'alpa'
                        ? 'bg-rose-50/60 hover:bg-rose-100/70'
                        : 'hover:bg-slate-50/70';

                      const stickyNamaBg = attKind === 'cuti'
                        ? 'bg-[#faf5ff] text-purple-950 font-bold'
                        : attKind === 'izin'
                        ? 'bg-[#fffbeb] text-amber-950 font-bold'
                        : attKind === 'alpa'
                        ? 'bg-[#fff1f2] text-rose-950 font-bold'
                        : 'bg-white text-slate-900 font-bold';

                      const stickyNoBg = attKind === 'cuti'
                        ? 'bg-[#faf5ff] text-purple-900 font-semibold'
                        : attKind === 'izin'
                        ? 'bg-[#fffbeb] text-amber-900 font-semibold'
                        : attKind === 'alpa'
                        ? 'bg-[#fff1f2] text-rose-900 font-semibold'
                        : 'bg-white text-slate-500 font-semibold';

                      return (
                      <tr key={r.id} className={`${rowBg} transition-colors`}>
                        <td className={`${tdBase} sticky left-0 z-10 w-12 min-w-[48px] max-w-[48px] ${stickyNoBg} text-center shadow-[1px_0_0_0_#e2e8f0]`}>{i + 1}</td>
                        <td className={`${tdBase} sticky left-[48px] z-10 min-w-[200px] ${stickyNamaBg} text-left shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]`}>{r.nama}</td>
                        <td className={`${tdBase} font-mono text-slate-700`}>{r.nik}</td>
                        {columnVisibility.profile && (
                          <>
                            <td className={`${tdBase} text-center`}>{r.statusMess || '-'}</td>
                            <td className={`${tdBase} text-center`} title="PT / Perusahaan (Terkunci)">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                String(r.pt || '').toUpperCase().includes('GPS')
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}>
                                {r.pt || '-'}
                              </span>
                            </td>
                            <td className={tdBase}>{r.shift || '-'}</td>
                            <td className={tdBase}>{r.section || '-'}</td>
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
                              value={
                                !r.shiftKerja ? '' :
                                ['SIANG', 'Siang'].includes(r.shiftKerja) ? 'Siang' :
                                ['MALAM', 'Malam'].includes(r.shiftKerja) ? 'Malam' :
                                ['NONSHIFT', 'Nonshift'].includes(r.shiftKerja) ? 'Nonshift' :
                                ['LONGSHIFT', 'Longshift'].includes(r.shiftKerja) ? 'Longshift' :
                                r.shiftKerja
                              }
                              onChange={e => changeShiftKerja(r, e.target.value || null)}
                              className={`w-full rounded-md text-xs font-semibold px-1 py-1 cursor-pointer focus:outline-none border transition-colors ${getShiftBadgeStyle(r.shiftKerja)}`}
                            >
                              <option value="">-</option>
                              <option value="Nonshift">Nonshift</option>
                              <option value="Siang">Siang</option>
                              <option value="Malam">Malam</option>
                              <option value="Longshift">Longshift</option>
                              <option value="OFF">OFF</option>
                              <option value="CUTI">CUTI</option>
                              <option value="Cuti Site">Cuti Site</option>
                              <option value="Izin">Izin</option>
                              {r.shiftKerja && !['', 'Nonshift', 'Siang', 'Malam', 'Longshift', 'OFF', 'CUTI', 'Cuti Site', 'Izin', 'SIANG', 'MALAM', 'LONGSHIFT'].includes(r.shiftKerja) && (
                                <option value={r.shiftKerja}>{r.shiftKerja}</option>
                              )}
                            </select>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded-md font-semibold text-xs border ${getShiftBadgeStyle(r.shiftKerja)}`}>
                              {r.shiftKerja || '-'}
                            </span>
                          )}
                        </td>
                        {activeMealCells.map(c => (
                          <td key={c.key} className={`${tdBase} text-center p-1`}>{renderMealCell(r, c.key, c.kind)}</td>
                        ))}
                        {columnVisibility.statusNotes && (
                          <>
                            <td className={`${tdBase} text-center`}>{renderStatusBadge(r.status, attKind)}</td>
                            <td className={`${tdBase} text-center p-1`}>
                              {canManage ? (
                                <select
                                  value={r.keteranganLapor && r.keteranganLapor !== '-' ? 'Belum Lapor' : '-'}
                                  onChange={e => handleToggleBelumLapor(r, e.target.value)}
                                  className={`rounded-md text-xs font-semibold px-2 py-1 cursor-pointer focus:outline-none transition-all ${
                                    r.keteranganLapor && r.keteranganLapor !== '-'
                                      ? 'bg-rose-100 text-rose-700 font-bold border border-rose-300 hover:bg-rose-200'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                  title="Pilih Keterangan Belum Lapor (jika Belum Lapor aktif, orderan makan otomatis kosong)"
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
                              {renderCatatanCell(r)}
                            </td>
                          </>
                        )}
                        {canManage && (
                          <td className={`${tdBase} p-1`}>
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => openEdit(r)} className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                      <td colSpan={leadingColSpan} className={`${tdBase} text-[11px] uppercase tracking-wider text-slate-700`}>Total Order</td>
                      {activeMealCells.map(c => <td key={c.key} className={`${tdBase} text-center text-slate-900`}>{tableTotals[c.key] || '-'}</td>)}
                      {columnVisibility.statusNotes && (
                        <>
                          <td className={tdBase} />
                          <td className={`${tdBase} text-rose-600`}>{tableConfirmed.belumLapor ? `${tableConfirmed.belumLapor} belum lapor` : ''}</td>
                          <td className={tdBase} />
                        </>
                      )}
                      {canManage && <td className={tdBase} />}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <FloatingScrollbar targetRef={tableScrollRef} />

              {/* HP: kartu per karyawan */}
              <div className="md:hidden space-y-2">
                {tableRows.map((r, i) => {
                  const attKind = getAttendanceStatusKind(r);
                  const cardBorder = attKind === 'cuti'
                    ? 'border-purple-300 bg-purple-50/30'
                    : attKind === 'izin'
                    ? 'border-amber-300 bg-amber-50/30'
                    : attKind === 'alpa'
                    ? 'border-rose-300 bg-rose-50/30'
                    : 'border-slate-200 bg-white';

                  return (
                  <div key={r.id} className={`rounded-2xl border ${cardBorder} p-3 space-y-2 transition-colors`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{i + 1}. {r.nama}</p>
                          {attKind && renderStatusBadge(attKind.toUpperCase(), attKind)}
                        </div>
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
                    {columnVisibility.statusNotes && (
                      <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-500">Lapor:</span>
                            {canManage ? (
                              <select
                                value={r.keteranganLapor && r.keteranganLapor !== '-' ? 'Belum Lapor' : '-'}
                                onChange={e => handleToggleBelumLapor(r, e.target.value)}
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
                            {renderCatatanCell(r)}
                          </div>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
              {tableRows.length === 0 && <p className="text-center text-xs text-slate-500 py-6">{cardFilter ? `Tidak ada karyawan untuk ${cardFilter.label}.` : 'Tidak ada karyawan yang cocok dengan pencarian.'}</p>}
            </>
          )}
        </div>
        </>}
      </div>

      {/* Modal tambah / edit */}
      {modal && (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !saving && setModal(null)}>
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">{modal.mode === 'create' ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}</div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{modal.mode === 'create' ? 'Tambah Karyawan ke Order' : 'Edit Order Karyawan'}</h3>
                  <p className="text-xs text-slate-500">{dayName(date)}, {longDate(date)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setModal(null)} className={UI.iconBtn} title="Tutup"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Profil Karyawan</p>
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
                ) : f.key === 'catatan' ? (
                  <Select
                    key={f.key}
                    label={f.label}
                    disabled={isCatatanDisabledForEmployee(form)}
                    value={isCatatanDisabledForEmployee(form) ? '' : (form.catatan || '')}
                    onChange={e => updateForm('catatan', e.target.value)}
                  >
                    <option value="">-</option>
                    {!isCatatanDisabledForEmployee(form) && (
                      <>
                        <option value="Bungkusan Pagi">Bungkusan Pagi</option>
                        {!(isTuesdayWednesdaySaturday(date) && ['CR', 'MESS'].includes(String(form.statusMess || '').trim().toUpperCase())) && (
                          <>
                            <option value="Bungkusan Sore">Bungkusan Sore</option>
                            <option value="Bungkusan Pagi dan Bungkusan Sore">Bungkusan Pagi dan Bungkusan Sore</option>
                          </>
                        )}
                      </>
                    )}
                  </Select>
                ) : f.key === 'soreLapangan' && isTuesdayWednesdaySaturday(date) && ['CR', 'MESS'].includes(String(form.statusMess || '').trim().toUpperCase()) ? (
                  <Input key={f.key} label={f.label} value="Kantin (Terkunci)" disabled />
                ) : (
                  <Input key={f.key} label={f.label} value={form[f.key] || ''} onChange={e => updateForm(f.key, e.target.value)} placeholder={f.placeholder} />
                )
              ))}
              <Select label="Shift / Status Kehadiran" value={form.shiftKerja || ''} onChange={e => updateForm('shiftKerja', e.target.value)}>
                <option value="">-</option>
                <option value="Nonshift">Nonshift</option>
                <option value="SIANG">Siang</option>
                <option value="MALAM">Malam</option>
                <option value="LONGSHIFT">Longshift</option>
                <option value="OFF">OFF</option>
                <option value="CUTI">CUTI</option>
                <option value="Cuti Site">Cuti Site</option>
                <option value="Izin">Izin</option>
              </Select>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-5 pt-4 mb-2 border-t border-slate-100">Order Makan</p>
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
            </div>
            <div className="sticky bottom-0 flex gap-2 justify-end px-5 py-3 bg-slate-50 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
              <Button onClick={submitForm} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pratinjau import */}
      {importPreview && (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !importing && setImportPreview(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Upload className="w-4 h-4" /></div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">Import Orderan Makanan</h3>
                <p className="text-xs text-slate-500 truncate">{importPreview.fileName}</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1 text-xs text-slate-700 mb-3">
              <p><b>{importPreview.rows.length}</b> karyawan terbaca · <b>{importPreview.fields.length}</b> kolom disinkronkan</p>
              <p className="text-[11px] text-slate-500">Hanya kolom yang ada di file yang menimpa orderan — kolom lain tetap seperti semula.</p>
              <p>Belum lapor: <b>{importPreview.rows.filter(r => r.keteranganLapor).length}</b></p>
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
        <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3"><Trash2 className="w-5 h-5" /></div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Hapus dari order?</h3>
            <p className="text-xs text-slate-600 mb-5"><b>{deleteTarget.nama}</b> akan dihapus dari orderan {dayName(date)}, {longDate(date)}. Tanggal lain tidak terpengaruh.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
              <Button variant="danger" onClick={confirmDelete}>Hapus</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Perbarui Profil Karyawan (Format Excel) */}
      <EmployeeProfileExcelImportModal
        isOpen={isProfileImportOpen}
        onClose={() => setIsProfileImportOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['meal-orders'] });
          queryClient.invalidateQueries({ queryKey: ['employees-master-lite'] });
        }}
      />
    </div>
  );
}
