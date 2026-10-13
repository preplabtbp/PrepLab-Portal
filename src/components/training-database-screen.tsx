import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Award,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Input, Select, Textarea, Button } from './ui';
import {
  SAP_TRAININGS,
  K3_TRAININGS,
  sapRequiredKeys as sapRequiredKeysForGol,
  k3RequiredKeys as k3RequiredKeysFor,
  K3_RULES,
  parseTrainingSheet,
  guessTrainingFromFileName,
  ALL_TRAININGS,
  trainingValidity,
  todayWit,
  TRAINING_WARNING_MONTHS,
  TRAINING_EXPIRY_MONTHS,
  POP_KETERANGAN,
  masaKerjaFromDoh,
  popAttendedPra,
  popAttendedPop,
  popPassedPom,
  type PopData,
  type PopKeterangan,
  type TrainingKey,
  type ParsedTrainingSheet,
  type TrainingProgram,
  type SapDateKey,
  type SapStatusKey,
  type SapDetails,
  type K3DateKey,
  type K3StatusKey,
} from '../utils/training-import';
import type { Plugin } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// Opsi plugin label batang kustom (lihat barPercentLabels)
declare module 'chart.js' {
  interface PluginOptionsByType<TType extends import('chart.js').ChartType> {
    barPercentLabels?: { mode?: 'percent' | 'count' };
  }
}

// Palet dashboard (teal gelap sebagai warna utama, kuning & coral sebagai aksen)
const DASH = {
  bg: '#eef1f0',
  brand: '#0f5b52',
  brandSoft: '#e3f0ed',
  yellow: '#f5c451',
  coral: '#f08a6c',
  mint: '#4fd1c1',
  ink: '#0f172a',
};

// Warna status: WARNING kuning, EXPIRED merah, Belum merah muda, Tidak Wajib abu-abu
const CHART_WARNING = '#facc15';
const CHART_EXPIRED = '#dc2626';
const CHART_BELUM = '#fda4af';
const LIGHT_CHART_COLORS = new Set([CHART_WARNING, CHART_BELUM, '#cbd5e1', '#60a5fa']);
const STATUS_BADGE: Record<string, string> = {
  PASS: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  EXPIRED: 'bg-red-600 text-white border-red-700',
  FAIL: 'bg-rose-50 text-rose-700 border-rose-200',
  Pending: 'bg-sky-50 text-sky-800 border-sky-200',
};

// Plugin: label persentase di ujung batang pencapaian (dataset pertama) pada diagram horizontal
const achievementLabels: Plugin<'bar'> = {
  id: 'achievementLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const ds = chart.data.datasets[0];
    if (!ds || !chart.isDatasetVisible(0)) return;
    ctx.save();
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach((bar: any, idx) => {
      const pct = Number(ds.data[idx]) || 0;
      const { x, y, base } = bar.getProps(['x', 'y', 'base'], true);
      const label = `${pct}%`;
      // Di dalam batang bila cukup lebar, selain itu tepat setelah ujung batang
      if (x - base > 44) {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(label, x - 6, y);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 6, y);
      }
    });
    ctx.restore();
  },
};

// Plugin: jumlah orang di ujung batang horizontal (diagram jumlah peserta)
const countEndLabels: Plugin<'bar'> = {
  id: 'countEndLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const ds = chart.data.datasets[0];
    if (!ds) return;
    ctx.save();
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    chart.getDatasetMeta(0).data.forEach((bar: any, idx) => {
      const { x, y } = bar.getProps(['x', 'y'], true);
      ctx.fillText(`${Number(ds.data[idx]) || 0} orang`, x + 6, y);
    });
    ctx.restore();
  },
};

const achievementColor = (pct: number) => (pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#f43f5e');

// Plugin: tulis label di tengah setiap segmen batang — persentase terhadap total batang (default),
// atau jumlah orang bila options.plugins.barPercentLabels.mode = 'count' (training tanpa target / masa berlaku)
const barPercentLabels: Plugin<'bar'> = {
  id: 'barPercentLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    const countMode = chart.options.plugins?.barPercentLabels?.mode === 'count';
    const visible = data.datasets.map((_, i) => chart.isDatasetVisible(i));
    const totals = (data.labels || []).map((_, idx) =>
      data.datasets.reduce((sum, ds, i) => sum + (visible[i] ? Number(ds.data[idx]) || 0 : 0), 0));
    ctx.save();
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    data.datasets.forEach((ds, i) => {
      if (!visible[i]) return;
      chart.getDatasetMeta(i).data.forEach((bar: any, idx) => {
        const value = Number(ds.data[idx]) || 0;
        const total = totals[idx];
        if (!value || !total) return;
        const { x, y, base, width } = bar.getProps(['x', 'y', 'base', 'width'], true);
        const height = Math.abs(base - y);
        if (height < 13 || width < 18) return; // segmen terlalu kecil untuk label
        const bg = String(ds.backgroundColor || '');
        ctx.fillStyle = LIGHT_CHART_COLORS.has(bg) ? '#1e293b' : '#ffffff';
        ctx.fillText(countMode ? String(value) : `${Math.round((value / total) * 100)}%`, x, (y + base) / 2);
      });
    });
    ctx.restore();
  },
};

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
  inPop: boolean | null;
  noPop: number | null;
  popData: PopData | null;
  hazid: string | null;
  jsa: string | null;
  iutOtt: string | null;
  iai: string | null;
  bfa: string | null;
  bs: string | null;
  hazidStatus: string | null;
  jsaStatus: string | null;
  iutOttStatus: string | null;
  iaiStatus: string | null;
  bfaStatus: string | null;
  bsStatus: string | null;
  sapDetails: SapDetails | null;
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
// WARNING / EXPIRED dihitung otomatis dari tanggal training, sehingga form hanya menyimpan hasil (PASS / FAIL)
const SAP_STATUS_OPTIONS = ['PASS', 'FAIL'];
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
// Wajib per GOL: GOL I → BFA & BS; GOL IV/V → HAZID, JSA, IUT OTT, IAI; lainnya → HAZID, JSA, IUT OTT, IAI, BFA
const sapRequiredKeys = (r: TrainingRecord): SapDateKey[] => sapRequiredKeysForGol(r.gol);
const sapGolRule = (gol: string | null) => {
  const keys = sapRequiredKeysForGol(gol);
  return SAP_TRAININGS.filter(t => keys.includes(t.key)).map(t => t.label).join(', ');
};

// done = sudah & berlaku, warning = berlaku tapi hampir habis, expired/failed = ada tanggal tapi tidak berlaku,
// none = belum training, exempt = tidak wajib & belum ada data
type SapState = 'done' | 'warning' | 'expired' | 'failed' | 'none' | 'exempt';
// Masa berlaku dihitung dari tanggal training: ≥ 1 th 6 bln → warning, ≥ 2 th → expired
const TODAY = todayWit();
function sapState(r: TrainingRecord, key: SapDateKey, statusKey: SapStatusKey): SapState {
  const status = r[statusKey];
  if (status === 'FAIL') return 'failed';
  const date = r[key];
  if (date) {
    const v = trainingValidity(date, TODAY).state;
    return v === 'expired' ? 'expired' : v === 'warning' ? 'warning' : 'done';
  }
  if (status === 'EXPIRED') return 'expired';
  return sapRequiredKeys(r).includes(key) ? 'none' : 'exempt';
}
const sapIsValid = (s: SapState) => s === 'done' || s === 'warning';
const sapDoneCount = (r: TrainingRecord) =>
  sapRequiredKeys(r).filter(k => sapIsValid(sapState(r, k, SAP_TRAININGS.find(t => t.key === k)!.statusKey))).length;
const isSapComplete = (r: TrainingRecord) => sapDoneCount(r) === sapRequiredKeys(r).length;
const sapHasState = (r: TrainingRecord, states: SapState[]) => SAP_TRAININGS.some(t => states.includes(sapState(r, t.key, t.statusKey)));

// ===== Aturan Training K3 =====
// Tidak ada masa berlaku (WARNING / EXPIRED). Wajib per section & GOL I–III (lihat K3_RULES):
// WAH → Preparation & Maintenance · LOTO & Confined Space → Maintenance · Fire Fighting → semua kecuali QA, Administration & Inventory Control
type K3State = 'PASS' | 'Pending' | 'FAIL' | 'none' | 'exempt';
const k3RequiredFor = (r: TrainingRecord): K3DateKey[] => k3RequiredKeysFor(r.bagian, r.gol);
function k3State(r: TrainingRecord, key: K3DateKey, statusKey: K3StatusKey): K3State {
  const status = r[statusKey];
  if (status === 'Pending') return 'Pending';
  if (status === 'FAIL') return 'FAIL';
  if (r[key] || status === 'PASS') return 'PASS';
  return k3RequiredFor(r).includes(key) ? 'none' : 'exempt';
}
const k3IsValid = (s: K3State) => s === 'PASS';
const k3PassCount = (r: TrainingRecord) => K3_TRAININGS.filter(t => k3IsValid(k3State(r, t.key, t.statusKey))).length;
const k3HasPending = (r: TrainingRecord) => K3_TRAININGS.some(t => k3State(r, t.key, t.statusKey) === 'Pending');
// Training K3 wajib yang sudah diikuti (PASS)
const k3DoneCount = (r: TrainingRecord) =>
  k3RequiredFor(r).filter(k => k3IsValid(k3State(r, k, K3_TRAININGS.find(t => t.key === k)!.statusKey))).length;
const isK3Complete = (r: TrainingRecord) => k3DoneCount(r) === k3RequiredFor(r).length;
const k3BadgeOf = (s: K3State) =>
  s === 'none' ? { text: 'Belum', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
  : s === 'exempt' ? { text: 'Tidak Wajib', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
  : { text: s === 'PASS' ? 'Telah Mengikuti' : s, cls: STATUS_BADGE[s] };

// ===== Sertifikasi Pengawas Operasional (Pra POP / POP / POM) =====
// Tidak ada masa berlaku — dihitung jumlah karyawan yang telah mengikuti tiap tahap
const POP_STAGES = [
  { key: 'praPop', label: 'Pra POP', desc: 'Pra Pengawas Operasional Pertama', attended: (p?: PopData | null) => popAttendedPra(p) },
  { key: 'pop', label: 'POP', desc: 'Pengawas Operasional Pertama', attended: (p?: PopData | null) => popAttendedPop(p) },
  { key: 'pom', label: 'POM', desc: 'Pengawas Operasional Madya', attended: (p?: PopData | null) => popPassedPom(p) },
] as const;
const POP_KETERANGAN_STYLE: Record<PopKeterangan, string> = {
  PASS: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  MASA_KERJA: 'bg-amber-50 text-amber-800 border-amber-200',
  IJAZAH: 'bg-rose-50 text-rose-700 border-rose-200',
  TIDAK_WAJIB: 'bg-slate-100 text-slate-600 border-slate-200',
};
const POP_KETERANGAN_COLOR: Record<PopKeterangan, string> = {
  PASS: '#10b981', MASA_KERJA: '#f59e0b', IJAZAH: '#f43f5e', TIDAK_WAJIB: '#94a3b8',
};
const popMasaKerja = (p?: PopData | null) => (p?.doh ? masaKerjaFromDoh(p.doh, TODAY) : p?.masaKerja || null);

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
  hazid: '', jsa: '', iutOtt: '', iai: '', bfa: '', bs: '',
  hazidStatus: '', jsaStatus: '', iutOttStatus: '', iaiStatus: '', bfaStatus: '', bsStatus: '',
  wah: '', wahStatus: '', loto: '', lotoStatus: '', confinedSpace: '', confinedSpaceStatus: '', fireFighting: '', fireFightingStatus: '',
  // Sertifikasi POP (disimpan sebagai popData)
  pop_doh: '', pop_praPop: '', pop_praPopIns: '', pop_praPopPre: '', pop_praPopPost: '', pop_praPopResult: '',
  pop_popBatch: '', pop_pendidikan: '', pop_tahunLulus: '', pop_pengalamanTambang: '', pop_popKeterangan: '',
  pop_pom: '', pop_pomKeterangan: '',
};
const POP_FORM_KEYS = ['doh', 'praPop', 'praPopIns', 'praPopPre', 'praPopPost', 'praPopResult', 'popBatch', 'pendidikan',
  'tahunLulus', 'pengalamanTambang', 'popKeterangan', 'pom', 'pomKeterangan'] as const;

const PROGRAM_LABEL: Record<TrainingProgram, string> = { sap: 'Training SAP', k3: 'Training K3', pop: 'Sertifikasi POP/POM' };
const PROGRAM_FLAG_KEY = { sap: 'inSap', k3: 'inK3', pop: 'inPop' } as const;
const PROGRAM_NO_KEY = { sap: 'no', k3: 'noK3', pop: 'noPop' } as const;

// Modul dipisah 2: Training Internal (SAP & K3) dan Training External (Pra POP, POP & POM) — tampilan sama
export type TrainingScope = 'internal' | 'external';
const SCOPE_PROGRAMS: Record<TrainingScope, TrainingProgram[]> = { internal: ['sap', 'k3'], external: ['pop'] };
const SCOPE_META: Record<TrainingScope, { title: string; sub: string }> = {
  internal: { title: 'Training Internal', sub: 'Rekap Training SAP & K3' },
  external: { title: 'Training External', sub: 'Rekap Sertifikasi Pra POP, POP & POM' },
};
const inScope = (r: TrainingRecord, scope: TrainingScope) => SCOPE_PROGRAMS[scope].some(p => !!r[PROGRAM_FLAG_KEY[p]]);

interface TrainingDatabaseScreenProps {
  inspectorNik?: string;
  inspectorName?: string;
  onBack?: () => void;
  scope?: TrainingScope;
}

const TRAINING_QUERY_KEY = ['training-records'];

// Hak akses ditentukan server: viewAll (Developer / Section Administrasi / Manager / Superintendent),
// canManage (Developer / Section Administrasi). Selain itu server hanya mengirim data milik sendiri.
interface TrainingAccess { viewAll: boolean; canManage: boolean; nik: string }
interface TrainingPayload { records: TrainingRecord[]; access: TrainingAccess }
const EMPTY_RECORDS: TrainingRecord[] = [];

async function fetchTrainingRecords(): Promise<TrainingPayload> {
  const res = await fetch('/api/training-records');
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal memuat Database Training');
  return {
    records: json.data || [],
    access: { viewAll: !!json.access?.viewAll, canManage: !!json.access?.canManage, nik: json.access?.nik || '' },
  };
}

// ===== Komponen tampilan dashboard =====
function DashCard({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-[26px] bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-white dark:border-slate-800 p-4 sm:p-5 min-w-0 ${className}`}>
      {children}
    </div>
  );
}

function DashTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h3>
        {sub && <p className="text-[11px] font-medium text-slate-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// Ring progres (seperti kartu "Traffic Effectives")
function ProgressRing({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <div className="relative w-[76px] h-[76px]">
        <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="#eef1f0" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-slate-100">{value}%</span>
      </div>
      <span className="text-[11px] font-semibold text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

// Batang mini tren bulanan (seperti grafik kecil di kartu iklan)
function SparkBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[3px] h-9" aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className="w-[6px] rounded-full" style={{ height: `${Math.max(14, (v / max) * 100)}%`, backgroundColor: color, opacity: v ? 1 : 0.25 }} />
      ))}
    </div>
  );
}

// ===== Tampilan "Training Saya" — untuk karyawan tanpa akses penuh (hanya data milik sendiri) =====
const SAP_STATE_META: Record<SapState, { label: string; cls: string }> = {
  done: { label: 'Berlaku', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  warning: { label: 'WARNING', cls: STATUS_BADGE.WARNING },
  expired: { label: 'EXPIRED', cls: STATUS_BADGE.EXPIRED },
  failed: { label: 'FAILED', cls: STATUS_BADGE.FAIL },
  none: { label: 'Belum', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  exempt: { label: 'Tidak Wajib', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function MyTrainingSection({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[26px] bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: DASH.brandSoft, color: DASH.brand }}>{icon}</div>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-950 leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] font-semibold text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </section>
  );
}

function MyTrainingRow({ label, desc, right, sub }: { label: string; desc?: string; right: React.ReactNode; sub?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-black text-slate-900 leading-tight">{label}</p>
        {desc && <p className="text-[11px] font-semibold text-slate-500 truncate">{desc}</p>}
        {sub && <p className="text-[11px] font-semibold text-slate-600 mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0 text-right">{right}</div>
    </li>
  );
}

function MyTrainingView({ record, name, onBack, scope }: { record: TrainingRecord | null; name: string; onBack?: () => void; scope: TrainingScope }) {
  return (
    <div className="min-h-screen pb-24 transition-colors duration-200" style={{ backgroundColor: DASH.bg }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Profil */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 cursor-pointer active:scale-95" title="Kembali">
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
          )}
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: DASH.brand }}>
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950">{SCOPE_META[scope].title} Saya</h1>
            <p className="text-xs font-semibold text-slate-600 truncate">{record?.nama || name}</p>
          </div>
        </div>

        {!record || !inScope(record, scope) ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <GraduationCap className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-900 mb-1">Data {SCOPE_META[scope].title.toLowerCase()} Anda belum tercatat</p>
            <p className="text-xs text-slate-600">Hubungi Admin Preparation & Laboratory untuk pembaruan data training.</p>
          </div>
        ) : (
          <>
            <TrainingAchievementDetail record={record} scope={scope} />

            <p className="text-[11px] font-semibold text-slate-500 px-1">
              Ada data yang tidak sesuai? Hubungi Admin Preparation & Laboratory untuk pembaruan.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ===== Pencapaian training per orang (dipakai "Training Saya" & hasil pencarian di Overview) =====
function personAchievement(r: TrainingRecord, scope?: TrainingScope) {
  let parts: { id: TrainingProgram; label: string; done: number; total: number }[] = [];
  if (r.inSap) parts.push({ id: 'sap', label: 'SAP', done: sapDoneCount(r), total: sapRequiredKeys(r).length });
  if (r.inK3 && k3RequiredFor(r).length) parts.push({ id: 'k3', label: 'K3', done: k3DoneCount(r), total: k3RequiredFor(r).length });
  if (r.inPop) parts.push({ id: 'pop', label: 'POP/POM', done: POP_STAGES.filter(s => s.attended(r.popData)).length, total: POP_STAGES.length });
  if (scope) parts = parts.filter(p => SCOPE_PROGRAMS[scope].includes(p.id));
  const done = parts.reduce((s, p) => s + p.done, 0);
  const total = parts.reduce((s, p) => s + p.total, 0);
  return { parts, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
const pctColor = (pct: number) => (pct >= 100 ? DASH.brand : pct >= 60 ? '#d4a017' : DASH.coral);

function TrainingAchievementDetail({ record, scope }: { record: TrainingRecord; scope?: TrainingScope }) {
  const show = (p: TrainingProgram) => !scope || SCOPE_PROGRAMS[scope].includes(p);
  const badge = (text: string, cls: string) => (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap ${cls}`}>{text}</span>
  );
  const required = sapRequiredKeys(record);
  const sapValid = sapDoneCount(record);
  const p = record.popData;
  return (
    <>
            <div className="rounded-[26px] bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 grid grid-cols-2 gap-3">
              {[
                ['NIK', record.nik],
                ['Jabatan', record.jabatan || '-'],
                ['GOL / Shift', `${record.gol || '-'} · ${record.shift || '-'}`],
                ['PT / Bagian', `${record.pt || '-'}${record.bagian ? ` · ${record.bagian}` : ''}`],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{k}</p>
                  <p className="text-xs font-bold text-slate-900 break-words">{v}</p>
                </div>
              ))}
            </div>

            {record.inSap && show('sap') && (
              <MyTrainingSection
                title="Training SAP"
                subtitle={`${sapValid}/${required.length} training wajib berlaku · berlaku 2 tahun`}
                icon={<ClipboardCheck className="w-4 h-4" />}
              >
                {SAP_TRAININGS.map(t => {
                  const state = sapState(record, t.key, t.statusKey);
                  const date = record[t.key];
                  const expiry = date ? trainingValidity(date, TODAY).expiryDate : null;
                  const meta = SAP_STATE_META[state];
                  return (
                    <MyTrainingRow
                      key={t.key}
                      label={t.label}
                      desc={t.desc}
                      sub={date ? `${formatTrainingDate(date)} · ${state === 'expired' ? 'expired sejak' : 'berlaku s/d'} ${formatTrainingDate(expiry)}` : undefined}
                      right={badge(meta.label, meta.cls)}
                    />
                  );
                })}
              </MyTrainingSection>
            )}

            {record.inK3 && show('k3') && (
              <MyTrainingSection
                title="Training K3"
                subtitle={`${k3DoneCount(record)}/${k3RequiredFor(record).length} training wajib diikuti · tanpa masa berlaku`}
                icon={<HardHat className="w-4 h-4" />}
              >
                {K3_TRAININGS.map(t => {
                  const state = k3State(record, t.key, t.statusKey);
                  const b = k3BadgeOf(state);
                  return (
                    <MyTrainingRow
                      key={t.key}
                      label={t.label}
                      desc={t.desc}
                      sub={record[t.key] ? formatTrainingDate(record[t.key]) : state === 'exempt' ? `Wajib: ${K3_RULES[t.key]}` : undefined}
                      right={badge(b.text, b.cls)}
                    />
                  );
                })}
              </MyTrainingSection>
            )}

            {record.inPop && show('pop') && (
              <MyTrainingSection title="Sertifikasi POP/POM" subtitle={`Masa kerja ${popMasaKerja(p) || '-'}`} icon={<Award className="w-4 h-4" />}>
                <MyTrainingRow
                  label="Pra POP"
                  desc="Pra Pengawas Operasional Pertama"
                  sub={popAttendedPra(p)
                    ? [p?.praPop && formatTrainingDate(p.praPop), p?.praPopPre != null && `Pre ${p.praPopPre}`, p?.praPopPost != null && `Post ${p.praPopPost}`].filter(Boolean).join(' · ')
                    : undefined}
                  right={popAttendedPra(p) ? badge(p?.praPopResult || 'Telah Mengikuti', STATUS_BADGE.PASS) : badge('Belum', 'bg-slate-100 text-slate-500 border-slate-200')}
                />
                <MyTrainingRow
                  label="POP"
                  desc="Pengawas Operasional Pertama"
                  right={p?.popBatch ? badge(p.popBatch, 'bg-violet-50 text-violet-800 border-violet-200') : badge('Belum', 'bg-slate-100 text-slate-500 border-slate-200')}
                />
                <MyTrainingRow
                  label="Keterangan POP"
                  sub={[p?.pendidikan, p?.tahunLulus && `Lulus ${p.tahunLulus}`].filter(Boolean).join(' · ') || undefined}
                  right={p?.popKeterangan && POP_KETERANGAN[p.popKeterangan as PopKeterangan]
                    ? badge(POP_KETERANGAN[p.popKeterangan as PopKeterangan].label, POP_KETERANGAN_STYLE[p.popKeterangan as PopKeterangan])
                    : <span className="text-xs font-bold text-slate-400">-</span>}
                />
                <MyTrainingRow
                  label="POM"
                  desc="Pengawas Operasional Madya"
                  right={popPassedPom(p) ? badge('PASS', STATUS_BADGE.PASS) : badge('Belum', 'bg-slate-100 text-slate-500 border-slate-200')}
                />
              </MyTrainingSection>
            )}
    </>
  );
}

// ===== Dashboard per orang: kartu-kartu di samping Overview berganti ke data training karyawan terpilih =====
const SAP_STATE_COLOR: Record<SapState, string> = {
  done: DASH.brand, warning: DASH.yellow, expired: DASH.coral, failed: '#dc2626', none: '#cbd5e1', exempt: '#e2e8f0',
};

type PersonTrainingRow = { program: string; label: string; desc?: string; date: string | null; until: string | null; badge: { text: string; cls: string }; ok: boolean };
function personTrainingRows(r: TrainingRecord, scope?: TrainingScope): PersonTrainingRow[] {
  const rows: PersonTrainingRow[] = [];
  const belum = 'bg-slate-100 text-slate-500 border-slate-200';
  const show = (p: TrainingProgram) => !scope || SCOPE_PROGRAMS[scope].includes(p);
  if (r.inSap && show('sap')) {
    SAP_TRAININGS.forEach(t => {
      const state = sapState(r, t.key, t.statusKey);
      const date = r[t.key];
      rows.push({
        program: 'SAP', label: t.label, desc: t.desc, date,
        until: date ? trainingValidity(date, TODAY).expiryDate : null,
        badge: { text: SAP_STATE_META[state].label, cls: SAP_STATE_META[state].cls },
        ok: sapIsValid(state),
      });
    });
  }
  if (r.inK3 && show('k3')) {
    K3_TRAININGS.forEach(t => {
      const state = k3State(r, t.key, t.statusKey);
      rows.push({
        program: 'K3', label: t.label, desc: t.desc, date: r[t.key], until: null,
        badge: k3BadgeOf(state),
        ok: k3IsValid(state),
      });
    });
  }
  if (r.inPop && show('pop')) {
    POP_STAGES.forEach(s => {
      const ok = s.attended(r.popData);
      rows.push({
        program: 'POP/POM', label: s.label, desc: s.desc,
        date: s.key === 'praPop' ? r.popData?.praPop ?? null : null, until: null,
        badge: ok ? { text: s.key === 'pop' && r.popData?.popBatch ? r.popData.popBatch : 'Telah Mengikuti', cls: STATUS_BADGE.PASS } : { text: 'Belum', cls: belum },
        ok,
      });
    });
  }
  return rows;
}

function PersonSapCard({ record, className }: { record: TrainingRecord; className: string }) {
  const rows = SAP_TRAININGS.map(t => ({ t, state: sapState(record, t.key, t.statusKey) }));
  const counts = (Object.keys(SAP_STATE_META) as SapState[])
    .map(s => ({ state: s, value: rows.filter(r => r.state === s).length }))
    .filter(c => c.value > 0);
  return (
    <DashCard className={className}>
      <DashTitle title="Status Training SAP" sub={record.inSap ? `GOL ${record.gol || '-'} · wajib: ${sapGolRule(record.gol)}` : 'Tidak terdaftar di Training SAP'} />
      {record.inSap ? (
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] shrink-0">
            <Doughnut
              data={{
                labels: counts.map(c => SAP_STATE_META[c.state].label),
                datasets: [{ data: counts.map(c => c.value), backgroundColor: counts.map(c => SAP_STATE_COLOR[c.state]), borderColor: '#ffffff', borderWidth: 3, hoverOffset: 6 }],
              }}
              options={{ cutout: '0%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
            />
          </div>
          <ul className="space-y-1.5 min-w-0 flex-1">
            {rows.map(({ t, state }) => (
              <li key={t.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SAP_STATE_COLOR[state] }} />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{t.label}</span>
                </span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border whitespace-nowrap ${SAP_STATE_META[state].cls}`}>{SAP_STATE_META[state].label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-500 py-6 text-center">Karyawan ini tidak memiliki kewajiban Training SAP.</p>
      )}
    </DashCard>
  );
}

// Pengganti kartu "Status Training SAP" di modul Training External: status tiap tahap Pra POP / POP / POM
function PersonPopCard({ record, className }: { record: TrainingRecord; className: string }) {
  const p = record.popData;
  const stages = POP_STAGES.map(s => ({ s, ok: s.attended(p) }));
  const done = stages.filter(x => x.ok).length;
  const ket = p?.popKeterangan && POP_KETERANGAN[p.popKeterangan as PopKeterangan] ? (p.popKeterangan as PopKeterangan) : null;
  return (
    <DashCard className={className}>
      <DashTitle title="Status Sertifikasi POP/POM" sub={record.inPop ? `Masa kerja ${popMasaKerja(p) || '-'}` : 'Tidak terdaftar di Sertifikasi POP/POM'} />
      {record.inPop ? (
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] shrink-0">
            <Doughnut
              data={{
                labels: ['Telah Mengikuti', 'Belum'],
                datasets: [{ data: [done, POP_STAGES.length - done], backgroundColor: [DASH.brand, '#cbd5e1'], borderColor: '#ffffff', borderWidth: 3, hoverOffset: 6 }],
              }}
              options={{ cutout: '0%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
            />
          </div>
          <ul className="space-y-1.5 min-w-0 flex-1">
            {stages.map(({ s, ok }) => (
              <li key={s.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ok ? DASH.brand : '#cbd5e1' }} />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{s.label}</span>
                </span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border whitespace-nowrap ${ok ? STATUS_BADGE.PASS : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{ok ? 'Telah Mengikuti' : 'Belum'}</span>
              </li>
            ))}
            {ket && (
              <li className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-600">Kualifikasi</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border whitespace-nowrap ${POP_KETERANGAN_STYLE[ket]}`}>{POP_KETERANGAN[ket].label}</span>
              </li>
            )}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-500 py-6 text-center">Karyawan ini belum tercatat di Sertifikasi POP/POM.</p>
      )}
    </DashCard>
  );
}

function PersonRingsCard({ record, className, scope }: { record: TrainingRecord; className: string; scope: TrainingScope }) {
  const a = personAchievement(record, scope);
  return (
    <DashCard className={className}>
      <DashTitle title={scope === 'external' ? 'Pencapaian Sertifikasi' : 'Pencapaian Program'} sub={`${a.done}/${a.total} training terpenuhi · total ${a.pct}%`} />
      {scope === 'external' && record.inPop ? (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {POP_STAGES.map(s => {
            const ok = s.attended(record.popData);
            return <ProgressRing key={s.key} value={ok ? 100 : 0} color={ok ? DASH.brand : DASH.coral} label={`${s.label} · ${ok ? 'Sudah' : 'Belum'}`} />;
          })}
        </div>
      ) : a.parts.length ? (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {a.parts.map(p => {
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            return <ProgressRing key={p.id} value={pct} color={pctColor(pct)} label={`${p.label} · ${p.done}/${p.total}`} />;
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500 py-6 text-center">Belum terdaftar di program training.</p>
      )}
    </DashCard>
  );
}

function PersonProgramCards({ record, scope }: { record: TrainingRecord; scope: TrainingScope }) {
  const a = personAchievement(record, scope);
  const rows = personTrainingRows(record, scope);
  const icon = (id: TrainingProgram) => (id === 'sap' ? <ClipboardCheck className="w-4 h-4" /> : id === 'k3' ? <HardHat className="w-4 h-4" /> : <Award className="w-4 h-4" />);
  const programLabel: Record<TrainingProgram, string> = { sap: 'SAP', k3: 'K3', pop: 'POP/POM' };
  const all: { id: TrainingProgram; title: string }[] = ([
    { id: 'sap', title: 'Training SAP' }, { id: 'k3', title: 'Training K3' }, { id: 'pop', title: 'Sertifikasi POP/POM' },
  ] as { id: TrainingProgram; title: string }[]).filter(p => SCOPE_PROGRAMS[scope].includes(p.id));

  // Training External: satu kartu per tahap (Pra POP, POP, POM)
  if (scope === 'external') {
    const p = record.popData;
    const stageDate: Record<string, string | null | undefined> = { praPop: p?.praPop };
    const stageInfo: Record<string, string | null | undefined> = { praPop: p?.praPopResult, pop: p?.popBatch };
    return (
      <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-3 lg:gap-4">
        {POP_STAGES.map(s => {
          const ok = s.attended(p);
          return (
            <div key={s.key} className="rounded-[22px] lg:rounded-[26px] bg-white dark:bg-slate-900 p-3 lg:p-5 border-2 border-white dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: DASH.brandSoft, color: DASH.brand }}><Award className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <p className="text-[11px] lg:text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{s.label}</p>
                  <p className="hidden lg:block text-[11px] text-slate-500 truncate">{s.desc}</p>
                </div>
              </div>
              <div className="mt-2 lg:mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-lg lg:text-2xl font-semibold tracking-tight" style={{ color: ok ? DASH.brand : DASH.coral }}>{ok ? 'Sudah' : 'Belum'}</p>
                  <p className="text-[10px] lg:text-xs text-slate-500 truncate">{stageInfo[s.key] || (ok ? 'Telah mengikuti' : 'Belum mengikuti')}</p>
                </div>
                <div className="hidden lg:flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-500">Tanggal</span>
                  <span className="text-[11px] font-semibold text-slate-700">{stageDate[s.key] ? formatTrainingDate(stageDate[s.key]!) : '-'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 lg:gap-4">
      {all.map(p => {
        const part = a.parts.find(x => x.id === p.id);
        const latest = rows.filter(r => r.program === programLabel[p.id] && r.date).map(r => r.date!).sort().pop() || null;
        const pct = part && part.total ? Math.round((part.done / part.total) * 100) : 0;
        return (
          <div key={p.id} className="rounded-[22px] lg:rounded-[26px] bg-white dark:bg-slate-900 p-3 lg:p-5 border-2 border-white dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: DASH.brandSoft, color: DASH.brand }}>{icon(p.id)}</span>
              <p className="text-[11px] lg:text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{p.title}</p>
            </div>
            <div className="mt-2 lg:mt-4 flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl lg:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{part ? `${part.done}/${part.total}` : '-'}</p>
                <p className="text-[10px] lg:text-xs text-slate-500">{part ? `${pct}% terpenuhi` : 'Tidak terdaftar'}</p>
              </div>
              <div className="hidden lg:flex flex-col items-end gap-1">
                <span className="text-[10px] text-slate-500">Terakhir</span>
                <span className="text-[11px] font-semibold text-slate-700">{latest ? formatTrainingDate(latest) : '-'}</span>
              </div>
            </div>
            {part && (
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: DASH.brandSoft }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pctColor(pct) }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PersonTrainingTableCard({ record, className, scope }: { record: TrainingRecord; className: string; scope: TrainingScope }) {
  const rows = personTrainingRows(record, scope);
  return (
    <DashCard className={className}>
      <DashTitle title="Riwayat Training" sub={`${record.nama} · ${rows.filter(r => r.ok).length}/${rows.length} training terpenuhi`} />
      {rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs font-medium text-slate-500 py-10">Belum ada data training</div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-2 py-2 font-semibold">Program</th>
                <th className="px-2 py-2 font-semibold">Training</th>
                <th className="px-2 py-2 font-semibold whitespace-nowrap">Tgl Training</th>
                <th className="px-2 py-2 font-semibold whitespace-nowrap">Berlaku s/d</th>
                <th className="px-2 py-2 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map(r => (
                <tr key={`${r.program}-${r.label}`}>
                  <td className="px-2 py-2"><span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ backgroundColor: DASH.brandSoft, color: DASH.brand }}>{r.program}</span></td>
                  <td className="px-2 py-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{r.label}</p>
                    {r.desc && <p className="text-[10px] text-slate-500 hidden sm:block">{r.desc}</p>}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-700">{r.date ? formatTrainingDate(r.date) : '-'}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-700">{r.until ? formatTrainingDate(r.until) : '-'}</td>
                  <td className="px-2 py-2 text-right"><span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${r.badge.cls}`}>{r.badge.text}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashCard>
  );
}

// Panel pencapaian training satu karyawan (dibuka dari hasil pencarian Overview)
function PersonAchievementModal({ record, onClose, scope }: { record: TrainingRecord; onClose: () => void; scope: TrainingScope }) {
  const a = personAchievement(record, scope);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-[2px] p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] shadow-2xl"
        style={{ backgroundColor: DASH.bg }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Pencapaian training ${record.nama}`}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-5 py-3 text-white" style={{ backgroundColor: DASH.brand }}>
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white/70">Pencapaian Training</p>
            <h2 className="text-sm sm:text-base font-bold leading-tight truncate">{record.nama}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/15 cursor-pointer" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-5 space-y-4">
          <div className="rounded-[26px] bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 flex items-center gap-4">
            <ProgressRing value={a.pct} color={pctColor(a.pct)} label="Total" />
            <div className="flex-1 min-w-0 space-y-2.5">
              <p className="text-xs font-semibold text-slate-500">
                <span className="text-slate-900 font-bold">{a.done}/{a.total}</span> training terpenuhi
              </p>
              {a.parts.map(part => {
                const pct = part.total ? Math.round((part.done / part.total) * 100) : 0;
                return (
                  <div key={part.id}>
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                      <span className="text-slate-600">{part.label}</span>
                      <span className="text-slate-900">{part.done}/{part.total} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: DASH.brandSoft }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pctColor(pct) }} />
                    </div>
                  </div>
                );
              })}
              {a.parts.length === 0 && <p className="text-[11px] text-slate-500">Belum terdaftar di program training.</p>}
            </div>
          </div>
          <TrainingAchievementDetail record={record} scope={scope} />
        </div>
      </div>
    </div>
  );
}

export function TrainingDatabaseScreen({ inspectorNik = '', inspectorName = '', onBack, scope = 'internal' }: TrainingDatabaseScreenProps) {
  const queryClient = useQueryClient();
  // Data di-cache TanStack Query: kunjungan ulang tampil instan, lalu diperbarui di background
  // Cache per akun (NIK) agar data akses penuh tidak pernah tampil ke akun lain di perangkat yang sama
  const { data: payload, isLoading, isFetching, error: loadError } = useQuery({
    queryKey: [...TRAINING_QUERY_KEY, inspectorNik.trim().toUpperCase()],
    queryFn: fetchTrainingRecords,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const allRecords = payload?.records ?? EMPTY_RECORDS;
  // Hanya karyawan yang terdaftar di program modul ini (Internal: SAP/K3 · External: POP/POM)
  const records = useMemo(() => allRecords.filter(r => inScope(r, scope)), [allRecords, scope]);
  const access: TrainingAccess = payload?.access ?? { viewAll: false, canManage: false, nik: '' };
  const scopePrograms = SCOPE_PROGRAMS[scope];
  const isExternal = scope === 'external';

  const [program, setProgram] = useState<TrainingProgram>(() => {
    if (scope === 'external') return 'pop';
    try {
      return localStorage.getItem(TAB_STORAGE_KEY) === 'k3' ? 'k3' : 'sap';
    } catch { return 'sap'; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [personDetail, setPersonDetail] = useState<TrainingRecord | null>(null);
  const closePersonDetail = useCallback(() => setPersonDetail(null), []);
  // Karyawan terpilih dari pencarian Overview → kartu dashboard di sampingnya menampilkan data karyawan ini
  const [selectedNik, setSelectedNik] = useState<string | null>(null);
  const [golFilter, setGolFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [bagianFilter, setBagianFilter] = useState('ALL');
  const [ptFilter, setPtFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [missingFilter, setMissingFilter] = useState<string | null>(null);
  // Kartu analitik utama: pilihan tampilan diagram
  const [analyticsView, setAnalyticsView] = useState<'pencapaian' | 'peserta' | 'status' | 'tren'>('pencapaian');
  // Tampilan HP: diagram & filter lanjutan dilipat agar ringkas
  const [showCharts, setShowCharts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingRecord | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<(ParsedTrainingSheet & { fileName: string; sheetRows: unknown[][] }) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const programLabel = PROGRAM_LABEL[program];
  // K3 & POP tidak punya target/masa berlaku → tampilkan jumlah yang telah mengikuti saja
  // (K3 kini punya target wajib per section & GOL, tetap tanpa masa berlaku)
  const countOnly = program === 'pop';

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

  const switchProgram = (p: TrainingProgram) => {
    if (!scopePrograms.includes(p)) return;
    setProgram(p);
    setStatusFilter('ALL');
    setMissingFilter(null);
    if (!isExternal) try { localStorage.setItem(TAB_STORAGE_KEY, p); } catch {}
  };

  // Hak kelola (tambah / edit / import / hapus) ditentukan server: Developer & Section Administrasi
  const canManage = access.canManage;

  const programRecords = useMemo(
    () => records.filter(r => !!r[PROGRAM_FLAG_KEY[program]]),
    [records, program]
  );

  const programCounts = useMemo(() => ({
    sap: records.filter(r => r.inSap).length,
    k3: records.filter(r => r.inK3).length,
    pop: records.filter(r => r.inPop).length,
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
    if (program === 'pop') {
      programRecords.forEach(r => {
        const v = r.popData?.praPop;
        if (v && v > latest) latest = v;
      });
      // Jumlah yang telah mengikuti tiap tahap (tanpa target / masa berlaku)
      const coverage = POP_STAGES.map(s => ({
        key: s.key as string,
        label: s.label,
        desc: s.desc,
        done: programRecords.filter(r => s.attended(r.popData)).length,
        warning: 0,
        expired: 0,
        pending: 0,
        target: total,
        exempt: 0,
      }));
      const memenuhi = programRecords.filter(r => r.popData?.popKeterangan === 'PASS').length;
      return { total, latest, coverage, cardA: coverage[1].done, cardB: memenuhi };
    }
    const allDateKeys = program === 'sap' ? SAP_TRAININGS.map(t => t.key) : K3_TRAININGS.map(t => t.key);
    programRecords.forEach(r => allDateKeys.forEach(k => {
      const v = r[k];
      if (v && v > latest) latest = v;
    }));

    if (program === 'sap') {
      const lengkap = programRecords.filter(isSapComplete).length;
      const coverage = SAP_TRAININGS.map(t => {
        // Hanya personel yang WAJIB training ini yang dihitung ke target
        const states = programRecords
          .filter(r => sapRequiredKeys(r).includes(t.key))
          .map(r => sapState(r, t.key, t.statusKey));
        return {
          key: t.key as string,
          label: t.label,
          desc: t.desc,
          done: states.filter(sapIsValid).length, // termasuk WARNING (masih berlaku)
          warning: states.filter(s => s === 'warning').length,
          expired: states.filter(s => s === 'expired' || s === 'failed').length,
          pending: 0,
          target: states.length,
          exempt: total - states.length,
        };
      });
      return { total, latest, coverage, cardA: lengkap, cardB: total - lengkap };
    }

    const coverage = K3_TRAININGS.map(t => {
      // Hanya personel yang WAJIB training ini (section & GOL I–III) yang dihitung ke target
      const states = programRecords
        .filter(r => k3RequiredFor(r).includes(t.key))
        .map(r => k3State(r, t.key, t.statusKey));
      return {
        key: t.key as string,
        label: t.label,
        desc: `${t.desc} — wajib: ${K3_RULES[t.key]}`,
        done: states.filter(k3IsValid).length,
        warning: 0,
        expired: states.filter(s => s === 'FAIL').length,
        pending: states.filter(s => s === 'Pending').length,
        target: states.length,
        exempt: total - states.length,
      };
    });
    const wajib = programRecords.filter(r => k3RequiredFor(r).length > 0);
    const lengkap = wajib.filter(isK3Complete).length;
    return { total, latest, coverage, cardA: lengkap, cardB: wajib.length - lengkap };
  }, [programRecords, program]);

  // ===== Pencapaian Training SAP (%) — berlaku (PASS/WARNING) dibanding personel yang WAJIB (aturan per GOL) =====
  const achievement = useMemo(() => {
    const sapPeople = records.filter(r => r.inSap);
    const items = SAP_TRAININGS.map(t => {
      const required = sapPeople.filter(r => sapRequiredKeys(r).includes(t.key));
      return { label: t.label, program: 'SAP', done: required.filter(r => sapIsValid(sapState(r, t.key, t.statusKey))).length, target: required.length };
    }).filter(i => i.target > 0);
    if (items.length === 0) return null;
    const totalDone = items.reduce((s, i) => s + i.done, 0);
    const totalTarget = items.reduce((s, i) => s + i.target, 0);
    const rows = [...items, { label: 'TOTAL', program: 'Semua', done: totalDone, target: totalTarget }]
      .map(i => ({ ...i, pct: Math.round((i.done / i.target) * 100) }));
    return {
      rows,
      totalPct: rows[rows.length - 1].pct,
      chart: {
        labels: rows.map(r => r.label),
        datasets: [
          { label: 'Tercapai', data: rows.map(r => r.pct), backgroundColor: rows.map(r => achievementColor(r.pct)), borderRadius: 4, barThickness: 16 },
          { label: 'Belum', data: rows.map(r => 100 - r.pct), backgroundColor: '#e2e8f0', borderRadius: 4, barThickness: 16 },
        ],
      },
    };
  }, [records]);

  // ===== Data kartu dashboard: komposisi status SAP, ring per program, mini tren per program =====
  const dashboard = useMemo(() => {
    const sapPeople = records.filter(r => r.inSap);
    const k3People = records.filter(r => r.inK3);
    const popPeople = records.filter(r => r.inPop);

    // Komposisi status seluruh training SAP yang WAJIB (per item training)
    const pie = { done: 0, warning: 0, expired: 0, none: 0 };
    sapPeople.forEach(r => sapRequiredKeys(r).forEach(k => {
      const s = sapState(r, k, SAP_TRAININGS.find(t => t.key === k)!.statusKey);
      if (s === 'done') pie.done++;
      else if (s === 'warning') pie.warning++;
      else if (s === 'expired' || s === 'failed') pie.expired++;
      else if (s === 'none') pie.none++;
    }));

    const sapComplete = sapPeople.filter(isSapComplete).length;
    const sapWarningPeople = sapPeople.filter(r => sapHasState(r, ['warning'])).length;
    const sapExpiredPeople = sapPeople.filter(r => sapHasState(r, ['expired', 'failed'])).length;
    const k3Wajib = k3People.filter(r => k3RequiredFor(r).length > 0);
    const k3Complete = k3Wajib.filter(isK3Complete).length;
    const popWajib = popPeople.filter(r => r.popData?.popKeterangan !== 'TIDAK_WAJIB');
    const popDone = popWajib.filter(r => popAttendedPop(r.popData)).length;
    const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

    // Mini tren: jumlah training per bulan, 8 bulan terakhir
    const months: string[] = [];
    const [ty, tm] = TODAY.split('-').map(Number);
    for (let i = 7; i >= 0; i--) {
      const total = ty * 12 + (tm - 1) - i;
      months.push(`${Math.floor(total / 12)}-${String(total % 12 + 1).padStart(2, '0')}`);
    }
    const spark = (dates: (string | null | undefined)[]) => months.map(m => dates.filter(d => d && d.startsWith(m)).length);
    const latestOf = (dates: (string | null | undefined)[]) => dates.reduce<string>((acc, d) => (d && d > acc ? d : acc), '');
    const sapDates = sapPeople.flatMap(r => SAP_TRAININGS.map(t => (r[t.statusKey] === 'FAIL' ? null : r[t.key])));
    const k3Dates = k3People.flatMap(r => K3_TRAININGS.map(t => (k3State(r, t.key, t.statusKey) === 'PASS' ? r[t.key] : null)));
    const popDates = popPeople.map(r => r.popData?.praPop);

    const stageColor: Record<string, string> = { praPop: DASH.brand, pop: DASH.yellow, pom: DASH.mint };
    const stageCount = (s: typeof POP_STAGES[number]) => popPeople.filter(r => s.attended(r.popData)).length;
    // Kualifikasi POP (Training External) → pengganti komposisi status SAP
    const popPie = (Object.keys(POP_KETERANGAN) as PopKeterangan[]).map(k => ({
      label: POP_KETERANGAN[k].label, value: popPeople.filter(r => r.popData?.popKeterangan === k).length, color: POP_KETERANGAN_COLOR[k],
    }));

    return {
      pie,
      popPie,
      sap: { total: sapPeople.length, complete: sapComplete, warning: sapWarningPeople, expired: sapExpiredPeople, pct: pct(sapComplete, sapPeople.length) },
      pop: { total: popPeople.length, wajib: popWajib.length, done: popDone, pct: pct(popDone, popWajib.length), stages: POP_STAGES.map(s => ({ key: s.key, label: s.label, count: stageCount(s) })) },
      rings: isExternal
        ? POP_STAGES.map(s => ({ key: s.key as string, label: `${s.label} Diikuti`, value: pct(stageCount(s), popPeople.length), color: stageColor[s.key] }))
        : [
          { key: 'sap', label: 'SAP Lengkap', value: pct(sapComplete, sapPeople.length), color: DASH.brand },
          { key: 'k3', label: 'K3 Lengkap', value: pct(k3Complete, k3Wajib.length), color: DASH.yellow },
        ],
      programs: [
        { key: 'sap' as const, label: 'Training SAP', sub: '6 jenis training · berlaku 2 th', count: sapPeople.length, metric: `${sapComplete} lengkap`, spark: spark(sapDates), latest: latestOf(sapDates) },
        { key: 'k3' as const, label: 'Training K3', sub: 'WAH · LOTO · CS · Fire Fighting · per section', count: k3People.length, metric: `${k3Complete}/${k3Wajib.length} lengkap`, spark: spark(k3Dates), latest: latestOf(k3Dates) },
      ],
      // Training External: satu kartu per tahap sertifikasi
      stageCards: POP_STAGES.map(s => ({
        key: s.key as string, label: s.label, sub: s.desc, count: stageCount(s), total: popPeople.length,
        spark: s.key === 'praPop' ? spark(popDates) : null, latest: s.key === 'praPop' ? latestOf(popDates) : '',
      })),
    };
  }, [records, isExternal]);

  // ===== Jumlah karyawan yang telah mengikuti (Training K3 & Sertifikasi POP — tanpa target/masa berlaku) =====
  const participation = useMemo(() => {
    const k3People = records.filter(r => r.inK3);
    const popPeople = records.filter(r => r.inPop);
    const rows = isExternal
      ? POP_STAGES.map(s => ({ label: s.label, group: 'Sertifikasi POP', count: popPeople.filter(r => s.attended(r.popData)).length, pending: 0 }))
      : K3_TRAININGS.map(t => ({
        label: t.label, group: 'Training K3',
        count: k3People.filter(r => k3IsValid(k3State(r, t.key, t.statusKey))).length,
        pending: k3People.filter(r => k3State(r, t.key, t.statusKey) === 'Pending').length,
      }));
    if ((isExternal ? popPeople : k3People).length === 0) return null;
    return {
      rows,
      chart: {
        labels: rows.map(r => r.label),
        datasets: [
          { label: 'Telah mengikuti', data: rows.map(r => r.count), backgroundColor: rows.map(r => (r.group === 'Training K3' ? '#0d9488' : '#7c3aed')), borderRadius: 4, barThickness: 16 },
        ],
      },
    };
  }, [records, isExternal]);

  // ===== Diagram status per training (batang bertumpuk) =====
  const statusChartData = useMemo(() => {
    if (stats.total === 0) return null;
    const cov = stats.coverage;
    const datasets = program === 'sap'
      ? [
          { label: 'Berlaku', data: cov.map(c => c.done - c.warning), backgroundColor: '#10b981' },
          { label: 'Warning', data: cov.map(c => c.warning), backgroundColor: CHART_WARNING },
          { label: 'Expired / Failed', data: cov.map(c => c.expired), backgroundColor: CHART_EXPIRED },
          { label: 'Belum', data: cov.map(c => c.target - c.done - c.expired), backgroundColor: CHART_BELUM },
          { label: 'Tidak Wajib', data: cov.map(c => c.exempt), backgroundColor: '#cbd5e1' },
        ]
      : program === 'k3'
      ? [
          { label: 'Telah mengikuti', data: cov.map(c => c.done), backgroundColor: '#10b981' },
          { label: 'Pending', data: cov.map(c => c.pending), backgroundColor: '#60a5fa' },
          { label: 'FAIL', data: cov.map(c => c.expired), backgroundColor: CHART_EXPIRED },
          // Persentase dihitung dari yang WAJIB saja (Tidak Wajib tidak ikut dihitung)
          { label: 'Belum', data: cov.map(c => c.target - c.done - c.pending - c.expired), backgroundColor: CHART_BELUM },
        ]
      : [{ label: 'Telah mengikuti', data: cov.map(c => c.done), backgroundColor: '#7c3aed' }];
    return {
      labels: stats.coverage.map(c => c.label),
      datasets: datasets.map(d => ({ ...d, borderRadius: 4, maxBarThickness: 56 })),
    };
  }, [stats, program]);

  // ===== Diagram jumlah training per bulan (batang bertumpuk per jenis training) =====
  const monthlyChartData = useMemo(() => {
    const trainings: { key: string; label: string; done: (r: TrainingRecord) => string | null | undefined }[] = program === 'sap'
      ? SAP_TRAININGS.map(t => ({
          key: t.key as string,
          label: t.label,
          done: (r: TrainingRecord) => (r[t.statusKey] === 'FAIL' ? null : r[t.key]),
        }))
      : program === 'k3'
      ? K3_TRAININGS.map(t => ({
          key: t.key as string,
          label: t.label,
          done: (r: TrainingRecord) => (k3State(r, t.key, t.statusKey) === 'PASS' ? r[t.key] : null),
        }))
      : [{ key: 'praPop', label: 'Pra POP', done: (r: TrainingRecord) => r.popData?.praPop }];

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
        if (statusFilter === 'EXPIRED' && !sapHasState(r, ['expired', 'failed'])) return false;
        if (statusFilter === 'WARNING' && !sapHasState(r, ['warning'])) return false;
        if (missingFilter) {
          // Tampilkan yang wajib tapi belum berlaku (belum training / expired / failed)
          const t = SAP_TRAININGS.find(x => x.key === missingFilter)!;
          if (!sapRequiredKeys(r).includes(t.key) || sapIsValid(sapState(r, t.key, t.statusKey))) return false;
        }
      } else if (program === 'k3') {
        if (statusFilter === 'PENDING' && !k3HasPending(r)) return false;
        if (statusFilter === 'SUDAH' && (k3RequiredFor(r).length === 0 || !isK3Complete(r))) return false;
        if (statusFilter === 'BELUM' && (k3RequiredFor(r).length === 0 || isK3Complete(r))) return false;
        if (statusFilter === 'TIDAK_WAJIB' && k3RequiredFor(r).length > 0) return false;
        if (missingFilter) {
          // Klik kartu cakupan → tampilkan yang WAJIB tapi belum mengikuti training tsb
          const t = K3_TRAININGS.find(x => x.key === missingFilter);
          if (t && (!k3RequiredFor(r).includes(t.key) || k3IsValid(k3State(r, t.key, t.statusKey)))) return false;
        }
      } else {
        const p = r.popData;
        if (statusFilter !== 'ALL' && statusFilter in POP_KETERANGAN && p?.popKeterangan !== statusFilter) return false;
        if (statusFilter === 'BELUM_POP' && (popAttendedPop(p) || p?.popKeterangan === 'TIDAK_WAJIB')) return false;
        if (missingFilter) {
          const s = POP_STAGES.find(x => x.key === missingFilter);
          if (s && !s.attended(p)) return false;
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

  // SAP/K3: No, NIK, Nama, GOL, Shift, Status (+ Bagian & PT di K3) + kolom training + Aksi
  // POP   : No, NIK, Nama, PT, Masa Kerja, Pra POP, POP, Kualifikasi, Keterangan POP, POM + Aksi
  const tableColSpan = program === 'pop'
    ? 10 + (canManage ? 1 : 0)
    : 6 + (program === 'k3' ? 2 : 0) + (program === 'sap' ? SAP_TRAININGS.length : K3_TRAININGS.length) + (canManage ? 1 : 0);

  const activeFilterCount = [golFilter, shiftFilter, bagianFilter, ptFilter, statusFilter].filter(f => f !== 'ALL').length;
  // Hasil pencarian Overview: seluruh karyawan (lintas program) + pencapaian training masing-masing
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return records
      .filter(r => [r.nama, r.nik, r.jabatan, r.bagian].some(v => String(v || '').toLowerCase().includes(q)))
      .slice(0, 8)
      .map(r => ({ record: r, achievement: personAchievement(r, scope) }));
  }, [records, searchQuery, scope]);

  const selectedPerson = useMemo(() => (selectedNik ? records.find(r => r.nik === selectedNik) ?? null : null), [records, selectedNik]);
  const selectPerson = (r: TrainingRecord) => {
    setSelectedNik(r.nik);
    setSearchQuery(r.nama);
    setSearchOpen(false);
    setShowCharts(true);
  };
  const clearPerson = () => { setSelectedNik(null); setSearchQuery(''); setSearchOpen(false); };

  const hasActiveFilter = !!searchQuery || golFilter !== 'ALL' || shiftFilter !== 'ALL' || bagianFilter !== 'ALL'
    || ptFilter !== 'ALL' || statusFilter !== 'ALL' || !!missingFilter;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedNik(null);
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
      const v = k.startsWith('pop_') ? (r.popData as any)?.[k.slice(4)] : (r as any)[k];
      next[k] = v == null ? '' : String(v);
    });
    next.no = String(r[PROGRAM_NO_KEY[program]] ?? '');
    setForm(next);
    setIsModalOpen(true);
  };

  const updateForm = (field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Isi otomatis profil dari Database Karyawan / data training lain saat NIK cocok
      if (field === 'nik' && !editingRecord) {
        const nikUpper = value.trim().toUpperCase();
        const known = allRecords.find(r => r.nik === nikUpper);
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
        body: JSON.stringify({
          ...Object.fromEntries(Object.entries(form).filter(([k]) => !k.startsWith('pop_'))),
          // Data Sertifikasi POP dikirim sebagai satu objek popData
          ...(program === 'pop' ? { popData: Object.fromEntries(POP_FORM_KEYS.map(k => [k, form[`pop_${k}`] || null])) } : {}),
          program,
          updatedBy: inspectorName || inspectorNik,
        }),
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
      // File satu-training (mis. Basic_Safety.csv): jenis training ditebak dari nama file, bisa diganti di konfirmasi
      const guessed = guessTrainingFromFileName(file.name);
      let sheetRows: unknown[][] | null = null;
      let parsed: ParsedTrainingSheet | null = null;
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        sheetRows = Papa.parse<unknown[]>(text, { skipEmptyLines: true }).data;
        parsed = parseTrainingSheet(sheetRows, { singleTraining: guessed });
      } else {
        // Library xlsx (~400KB) baru diunduh saat user benar-benar import Excel
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        // Pakai sheet pertama yang formatnya dikenali
        for (const name of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: '' });
          const p = parseTrainingSheet(rows, { singleTraining: guessed });
          if (p && (p.records.length > 0 || p.singleTraining === null)) {
            sheetRows = rows;
            parsed = p;
            break;
          }
        }
      }
      const needsTrainingChoice = parsed?.singleTraining === null;
      if (!parsed || !sheetRows || (parsed.records.length === 0 && !needsTrainingChoice)) {
        toast.error('Format tidak dikenali. Pastikan ada kolom NIK, NAMA, dan kolom training (HAZID/JSA/... , WAH/LOTO/... atau Tanggal Training).');
        return;
      }
      setImportPreview({ ...parsed, fileName: file.name, sheetRows });
    } catch (err: any) {
      console.error('Import training failed:', err);
      toast.error(err.message || 'Gagal membaca file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Ganti jenis training untuk file satu-training → parse ulang dari baris mentah
  const chooseImportTraining = (key: TrainingKey) => {
    if (!importPreview) return;
    const reparsed = parseTrainingSheet(importPreview.sheetRows, { singleTraining: key });
    if (reparsed) setImportPreview({ ...importPreview, ...reparsed });
  };

  const confirmImport = async () => {
    if (!importPreview || importPreview.records.length === 0) return;
    try {
      setIsImporting(true);
      const res = await fetch('/api/training-records/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: importPreview.records,
          programs: importPreview.programs,
          singleTraining: importPreview.singleTraining ?? undefined,
          updatedBy: inspectorName || inspectorNik,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        toast.error(json.message || 'Import gagal');
        return;
      }
      toast.success(json.message);
      if (importPreview.programs.length === 1 && scopePrograms.includes(importPreview.programs[0])) switchProgram(importPreview.programs[0]);
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
      header = ['NO', 'NIK', 'NAMA', 'Jabatan', 'PT', 'GOL', 'SHIFT', ...SAP_TRAININGS.flatMap(t => [t.label, 'Status'])];
      rows = ordered.map(({ r, jabatan }, i) => [
        i + 1, r.nik, r.nama, jabatan, r.pt || '', r.gol || '', r.shift || '',
        ...SAP_TRAININGS.flatMap(t => {
          const state = sapState(r, t.key, t.statusKey);
          return [state === 'exempt' ? 'Tidak Wajib' : r[t.key] || '', r[t.statusKey] || (r[t.key] ? 'PASS' : '')];
        }),
      ]);
    } else if (program === 'k3') {
      header = ['NO', 'NIK', 'NAMA KARYAWAN', 'Shift', 'BAGIAN', 'JABATAN', 'PT', 'GOL',
        ...K3_TRAININGS.flatMap(t => [t.label.toUpperCase(), 'Status'])];
      rows = ordered.map(({ r, jabatan }, i) => [
        i + 1, r.nik, r.nama, r.shift || '', r.bagian || '', jabatan, r.pt || '', r.gol || '',
        ...K3_TRAININGS.flatMap(t => [r[t.key] || '-', r[t.statusKey] || '-']),
      ]);
    } else {
      header = ['NO', 'NIK', 'NAMA KARYAWAN', 'SECTION', 'JABATAN', 'PT', 'DOH', 'MASA KERJA',
        'TGL PRA POP', 'INSTRUKTUR', 'PRE TEST', 'POST TEST', 'HASIL PRA POP', 'BATCH POP',
        'PENDIDIKAN TERAKHIR', 'TAHUN LULUS', 'PENGALAMAN TAMBANG', 'KETERANGAN POP', 'POM', 'KETERANGAN POM'];
      rows = ordered.map(({ r, jabatan }, i) => {
        const p = r.popData || {};
        const ket = p.popKeterangan ? (POP_KETERANGAN[p.popKeterangan as PopKeterangan]?.label ?? p.popKeterangan) : '';
        return [
          i + 1, r.nik, r.nama, r.bagian || '', jabatan, r.pt || '', p.doh || '', popMasaKerja(p) || '',
          p.praPop || '', p.praPopIns || '', p.praPopPre ?? '', p.praPopPost ?? '', p.praPopResult || '', p.popBatch || '',
          p.pendidikan || '', p.tahunLulus || '', p.pengalamanTambang || '', ket, p.pom || '', p.pomKeterangan || '',
        ];
      });
    }
    const csv = Papa.unparse([header, ...rows]);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Database_${programLabel.replace(/[^A-Za-z0-9]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Render helpers =====
  const renderSapCell = (r: TrainingRecord, key: SapDateKey, statusKey: SapStatusKey) => {
    const state = sapState(r, key, statusKey);
    if (state === 'exempt') {
      return <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap" title={`GOL ${r.gol || '-'} wajib: ${sapGolRule(r.gol)}`}>Tidak Wajib</span>;
    }
    if (state === 'none') {
      return <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">Belum</span>;
    }
    // Tooltip: masa berlaku + instruktur & skor dari file Monitoring
    const d = r.sapDetails?.[key];
    const tip = [
      r[key] && `Berlaku s/d ${formatTrainingDate(trainingValidity(r[key]!, TODAY).expiryDate)}`,
      d?.ins && `Instruktur: ${d.ins}`, d?.pre != null && `Pre: ${d.pre}`, d?.post != null && `Post: ${d.post}`, d?.prak != null && `Praktik: ${d.prak}`,
    ].filter(Boolean).join(' · ') || undefined;
    const badge = state === 'warning' ? { text: 'WARNING', cls: STATUS_BADGE.WARNING }
      : state === 'expired' ? { text: 'EXPIRED', cls: STATUS_BADGE.EXPIRED }
      : state === 'failed' ? { text: 'FAILED', cls: STATUS_BADGE.FAIL }
      : null;
    return (
      <div className="inline-flex flex-col items-center gap-0.5" title={tip}>
        {r[key] && (
          <span className={`font-mono text-[11px] font-bold whitespace-nowrap ${state === 'expired' || state === 'failed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            {formatTrainingDate(r[key])}
          </span>
        )}
        {badge && <span className={`inline-flex px-1.5 py-px rounded text-[9px] font-black border ${badge.cls}`}>{badge.text}</span>}
      </div>
    );
  };

  const renderK3Cell = (r: TrainingRecord, key: K3DateKey, statusKey: K3StatusKey) => {
    const state = k3State(r, key, statusKey);
    if (state === 'exempt') {
      return <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap" title={`Wajib: ${K3_RULES[key]}`}>Tidak Wajib</span>;
    }
    if (state === 'none') return <span className="inline-flex px-1.5 py-px rounded text-[9px] font-black border bg-rose-50 text-rose-700 border-rose-200" title={`Wajib: ${K3_RULES[key]}`}>Belum</span>;
    const date = r[key];
    return (
      <div className="inline-flex flex-col items-center gap-0.5">
        {date && <span className={`font-mono text-[11px] font-bold whitespace-nowrap ${state === 'FAIL' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{formatTrainingDate(date)}</span>}
        <span className={`inline-flex px-1.5 py-px rounded text-[9px] font-black border ${STATUS_BADGE[state]}`}>{state}</span>
      </div>
    );
  };

  // ===== Render Sertifikasi POP =====
  const renderPopKeterangan = (ket: string | null | undefined) => {
    if (!ket) return <span className="text-[11px] font-bold text-slate-300">-</span>;
    const meta = POP_KETERANGAN[ket as PopKeterangan];
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap ${meta ? POP_KETERANGAN_STYLE[ket as PopKeterangan] : 'bg-slate-50 text-slate-700 border-slate-200'}`}
        title={meta?.desc}
      >
        {meta?.label ?? ket}
      </span>
    );
  };

  const renderPraPop = (p?: PopData | null) => {
    if (!popAttendedPra(p)) return <span className="text-[11px] font-bold text-slate-300">Belum</span>;
    const score = [p?.praPopPre != null && `Pre ${p.praPopPre}`, p?.praPopPost != null && `Post ${p.praPopPost}`].filter(Boolean).join(' · ');
    return (
      <div className="inline-flex flex-col items-center gap-0.5" title={p?.praPopIns ? `Instruktur: ${p.praPopIns}` : undefined}>
        {p?.praPop && <span className="font-mono text-[11px] font-bold text-slate-900 whitespace-nowrap">{formatTrainingDate(p.praPop)}</span>}
        {score && <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{score}</span>}
        {p?.praPopResult && <span className={`inline-flex px-1.5 py-px rounded text-[9px] font-black border ${STATUS_BADGE[p.praPopResult] || STATUS_BADGE.PASS}`}>{p.praPopResult}</span>}
      </div>
    );
  };

  const renderPopBatch = (p?: PopData | null) => p?.popBatch
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-violet-50 text-violet-800 border border-violet-200 whitespace-nowrap"><Award className="w-3 h-3" />{p.popBatch}</span>
    : <span className="text-[11px] font-bold text-slate-300">Belum</span>;

  const renderPom = (p?: PopData | null) => popPassedPom(p)
    ? <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black border ${STATUS_BADGE.PASS}`}>PASS</span>
    : p?.pom ? <span className="text-[11px] font-semibold text-slate-700">{p.pom}</span>
    : <span className="text-[11px] font-bold text-slate-300">-</span>;

  const renderKualifikasi = (p?: PopData | null) => {
    const parts = [p?.pendidikan, p?.tahunLulus && `Lulus ${p.tahunLulus}`].filter(Boolean).join(' · ');
    return (
      <div className="text-[11px] leading-tight">
        <span className="font-bold text-slate-800">{parts || '-'}</span>
        {p?.pengalamanTambang && <span className="block text-[10px] font-semibold text-slate-500">Pengalaman tambang {p.pengalamanTambang}</span>}
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
    // K3: training wajib (per section & GOL I–III) yang sudah diikuti
    const target = k3RequiredFor(r).length;
    if (target === 0) {
      return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">Tidak Wajib</span>;
    }
    const done = k3DoneCount(r);
    const pending = k3HasPending(r);
    const full = done === target;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${
        full ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : pending ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-amber-50 text-amber-800 border-amber-200'
      }`}>
        {full ? <CheckCircle2 className="w-3 h-3" /> : pending ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        {done}/{target}{pending && !full ? ' · Pending' : ''}
      </span>
    );
  };

  const selectClass = 'px-3 py-2 rounded-full border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600/20 cursor-pointer';
  const cardStyle = { backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' };

  // Hak akses belum diketahui → tampilkan kerangka saja (data akses penuh tidak boleh berkedip ke akun biasa)
  if (!payload) {
    return (
      <div className="min-h-screen px-3 sm:px-6 py-5" style={{ backgroundColor: DASH.bg }}>
        <div className="max-w-2xl mx-auto space-y-3" aria-busy="true" aria-label="Memuat Database Training">
          <div className="h-11 w-48 rounded-xl bg-slate-200 animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      </div>
    );
  }

  // Selain Developer / Section Administrasi / Manager / Superintendent: hanya data training milik sendiri
  if (!access.viewAll) {
    const own = allRecords.find(r => r.nik === access.nik) ?? allRecords[0] ?? null;
    return <MyTrainingView record={own} name={inspectorName} onBack={onBack} scope={scope} />;
  }

  const tableCardCls = 'rounded-[26px] bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-white dark:border-slate-800 p-3 sm:p-5 min-w-0';
  const pieTotal = dashboard.pie.done + dashboard.pie.warning + dashboard.pie.expired + dashboard.pie.none;
  const pieRows = [
    { label: 'Berlaku', value: dashboard.pie.done, color: DASH.brand },
    { label: 'Warning', value: dashboard.pie.warning, color: DASH.yellow },
    { label: 'Expired', value: dashboard.pie.expired, color: DASH.coral },
    { label: 'Belum', value: dashboard.pie.none, color: '#cbd5e1' },
  ];
  const analyticsOptions = [
    ...(isExternal ? [] : [{ id: 'pencapaian' as const, label: 'Pencapaian SAP (%)' }]),
    { id: 'peserta' as const, label: isExternal ? 'Jumlah Peserta Pra POP, POP & POM' : 'Jumlah Peserta K3' },
    { id: 'status' as const, label: `Status ${programLabel}` },
    { id: 'tren' as const, label: `Tren Bulanan ${programLabel}` },
  ];
  // Training External tidak punya "Pencapaian SAP" → default ke jumlah peserta
  const viewMode = isExternal && analyticsView === 'pencapaian' ? 'peserta' : analyticsView;
  const overviewPrograms = ([
    { id: 'sap' as const, icon: <ClipboardCheck className="w-4 h-4" />, title: 'Training SAP' },
    { id: 'k3' as const, icon: <HardHat className="w-4 h-4" />, title: 'Training K3' },
    { id: 'pop' as const, icon: <Award className="w-4 h-4" />, title: 'Sertifikasi POP/POM' },
  ]).filter(p => scopePrograms.includes(p.id));
  const summaryPieRows = isExternal ? dashboard.popPie : pieRows;
  const summaryPieTotal = summaryPieRows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="min-h-screen pb-16 transition-colors duration-200" style={{ backgroundColor: DASH.bg }}>
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-4">
        {/* ===== Top bar ===== */}
        <div className="rounded-[26px] bg-white dark:bg-slate-900 px-3 sm:px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button type="button" onClick={onBack} className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 cursor-pointer active:scale-95" title="Kembali">
                <ArrowLeft className="w-4 h-4 text-slate-700" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: DASH.brand }}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">{SCOPE_META[scope].title}</h1>
                {isFetching && !isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" aria-label="Memperbarui data" />}
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Halo, {inspectorName || 'Admin'} · {SCOPE_META[scope].sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-white font-semibold text-xs transition-all cursor-pointer active:scale-95 hover:opacity-90"
                  style={{ backgroundColor: DASH.brand }}
                >
                  <Plus className="w-4 h-4" />
                  Tambah Data
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer disabled:opacity-60"
                  title="Import data training dari Excel / CSV (format terdeteksi otomatis)"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import
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
          </div>
        </div>

        {/* ===== Baris 1: Overview · Status SAP · Ring program ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          <DashCard className="lg:col-span-4">
            <DashTitle title="Training Overview" />
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{records.length}</span>
                <span className="text-xs font-medium text-slate-500 leading-tight pb-1">Personel<br />Terdata</span>
              </div>
              <div className="flex items-center gap-1.5">
                {overviewPrograms.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => switchProgram(p.id)}
                    title={`${p.title} · ${programCounts[p.id]} personel`}
                    className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${program === p.id ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    style={program === p.id ? { backgroundColor: DASH.brand } : undefined}
                  >
                    {p.icon}
                  </button>
                ))}
              </div>
            </div>
            {!selectedPerson && (
              <p className="mt-3 text-xs font-semibold flex flex-wrap gap-x-3 gap-y-1">
                {isExternal ? (<>
                  {dashboard.pop.stages.map((s, i) => (
                    <span key={s.key} style={{ color: [DASH.brand, '#b7791f', '#0f8f80'][i] }}>{s.count} {s.label}</span>
                  ))}
                  <span className="text-slate-500">{dashboard.pop.pct}% POP wajib terpenuhi</span>
                </>) : (<>
                <span style={{ color: DASH.brand }}>{dashboard.sap.complete} Lengkap</span>
                <span className="text-yellow-600">{dashboard.sap.warning} Warning</span>
                <span style={{ color: DASH.coral }}>{dashboard.sap.expired} Expired</span>
                <span className="text-slate-500">{dashboard.sap.pct}% SAP terpenuhi</span>
                </>)}
              </p>
            )}
            <div className="relative mt-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); setSelectedNik(null); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setSearchOpen(false);
                  if (e.key === 'Enter' && searchMatches[0]) selectPerson(searchMatches[0].record);
                }}
                title={searchQuery}
                placeholder="Cari karyawan — lihat pencapaian training..."
                className="w-full pl-10 pr-9 py-2.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-base sm:text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearPerson}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {searchOpen && searchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                  {searchMatches.length === 0 ? (
                    <p className="px-4 py-3 text-xs font-medium text-slate-500">Karyawan tidak ditemukan</p>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {searchMatches.map(({ record: r, achievement: a }) => (
                        <li key={r.nik}>
                          <button
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => selectPerson(r)}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 break-words">{r.nama}</p>
                              <p className="text-[10px] font-medium text-slate-500 truncate">{r.nik} · {r.jabatan || '-'}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {a.parts.map(part => (
                                  <span
                                    key={part.id}
                                    className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                                    style={{ backgroundColor: DASH.brandSoft, color: part.done >= part.total ? DASH.brand : '#64748b' }}
                                  >
                                    {part.label} {part.done}/{part.total}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1 w-14">
                              <span className="text-sm font-bold" style={{ color: pctColor(a.pct) }}>{a.pct}%</span>
                              <span className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: DASH.brandSoft }}>
                                <span className="block h-full rounded-full" style={{ width: `${a.pct}%`, backgroundColor: pctColor(a.pct) }} />
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {selectedPerson && (() => {
              const a = personAchievement(selectedPerson, scope);
              return (
                <div className="mt-3 rounded-2xl p-3.5" style={{ backgroundColor: DASH.brandSoft }}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: DASH.brand }}>Karyawan Terpilih</p>
                      <p className="text-sm font-bold text-slate-900 leading-snug break-words">{selectedPerson.nama}</p>
                      <p className="text-[11px] font-medium text-slate-600 break-words">
                        {selectedPerson.nik} · {selectedPerson.jabatan || '-'} · GOL {selectedPerson.gol || '-'} · Shift {selectedPerson.shift || '-'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-semibold leading-none" style={{ color: pctColor(a.pct) }}>{a.pct}%</p>
                      <p className="text-[10px] text-slate-500 mt-1">{a.done}/{a.total} training</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPersonDetail(selectedPerson)}
                      className="flex-1 px-3 py-2 rounded-full text-[11px] font-semibold text-white cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: DASH.brand }}
                    >
                      Lihat Detail
                    </button>
                    <button
                      type="button"
                      onClick={clearPerson}
                      className="flex-1 px-3 py-2 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 cursor-pointer hover:bg-slate-50"
                    >
                      Kembali ke Semua Data
                    </button>
                  </div>
                </div>
              );
            })()}
            {personDetail && createPortal(
              <PersonAchievementModal record={personDetail} onClose={closePersonDetail} scope={scope} />,
              document.body,
            )}
          </DashCard>

          {selectedPerson ? (
            <>
              {isExternal
                ? <PersonPopCard record={selectedPerson} className={`lg:col-span-4 ${showCharts ? '' : 'hidden'} md:block`} />
                : <PersonSapCard record={selectedPerson} className={`lg:col-span-4 ${showCharts ? '' : 'hidden'} md:block`} />}
              <PersonRingsCard record={selectedPerson} scope={scope} className={`lg:col-span-4 ${showCharts ? '' : 'hidden'} md:block`} />
            </>
          ) : (<>
          <DashCard className={`lg:col-span-4 ${showCharts ? '' : 'hidden'} md:block`}>
            <DashTitle title={isExternal ? 'Kualifikasi POP' : 'Status Training SAP'} sub={isExternal ? 'Komposisi keterangan kualifikasi POP' : 'Seluruh training wajib (per GOL)'} />
            <div className="flex items-center gap-4">
              <div className="w-[120px] h-[120px] shrink-0">
                {summaryPieTotal > 0 && (
                  <Doughnut
                    data={{
                      labels: summaryPieRows.map(r => r.label),
                      datasets: [{ data: summaryPieRows.map(r => r.value), backgroundColor: summaryPieRows.map(r => r.color), borderColor: '#ffffff', borderWidth: 3, hoverOffset: 6 }],
                    }}
                    options={{
                      cutout: '0%',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round((Number(ctx.parsed) / summaryPieTotal) * 100)}%)` } },
                      },
                    }}
                  />
                )}
              </div>
              <ul className="space-y-2 min-w-0 flex-1">
                {summaryPieRows.map(r => (
                  <li key={r.label} className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: r.color }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">{r.label}</p>
                      <p className="text-[11px] text-slate-500">{r.value} {isExternal ? 'orang' : 'training'} · {summaryPieTotal ? Math.round((r.value / summaryPieTotal) * 100) : 0}%</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </DashCard>

          <DashCard className={`lg:col-span-4 ${showCharts ? '' : 'hidden'} md:block`}>
            <DashTitle
              title={isExternal ? 'Efektivitas Sertifikasi' : 'Efektivitas Program'}
              right={
                <div className="flex flex-wrap justify-end gap-x-2.5 gap-y-1 text-[10px] font-semibold text-slate-500">
                  {dashboard.rings.map(r => (
                    <span key={r.key} className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />{r.label.replace(' Diikuti', '').replace(' Lengkap', '')}</span>
                  ))}
                </div>
              }
            />
            <div className={`grid ${dashboard.rings.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 pt-1`}>
              {dashboard.rings.map(r => <ProgressRing key={r.key} value={r.value} color={r.color} label={r.label} />)}
            </div>
          </DashCard>
          </>)}
        </div>

        {/* HP: tombol buka/tutup diagram */}
        <button
          type="button"
          onClick={() => setShowCharts(v => !v)}
          className="md:hidden w-full flex items-center justify-between px-4 py-3 rounded-full bg-white text-xs font-semibold text-slate-800 cursor-pointer active:scale-[0.99] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          aria-expanded={showCharts}
        >
          <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" style={{ color: DASH.brand }} />{showCharts ? 'Sembunyikan Diagram & Analitik' : 'Tampilkan Diagram & Analitik'}</span>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showCharts ? 'rotate-180' : ''}`} />
        </button>

        {/* ===== Baris 2: Kartu program · Analitik ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          {selectedPerson ? (
            <>
              <PersonProgramCards record={selectedPerson} scope={scope} />
              <PersonTrainingTableCard record={selectedPerson} scope={scope} className={`lg:col-span-8 ${showCharts ? 'flex' : 'hidden'} md:flex flex-col`} />
            </>
          ) : (<>
          {isExternal ? (
          <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-3 lg:gap-4">
            {dashboard.stageCards.map(s => {
              const active = missingFilter === s.key;
              const pct = s.total ? Math.round((s.count / s.total) * 100) : 0;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setMissingFilter(active ? null : s.key)}
                  title={`Tampilkan yang telah mengikuti ${s.label}`}
                  className={`text-left rounded-[22px] lg:rounded-[26px] bg-white dark:bg-slate-900 p-3 lg:p-5 transition-all cursor-pointer border-2 ${active ? '' : 'border-white dark:border-slate-800 hover:border-slate-200'}`}
                  style={active ? { borderColor: DASH.brand } : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: DASH.brandSoft, color: DASH.brand }}>
                        <Award className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] lg:text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{s.label}</p>
                        <p className="hidden lg:block text-[11px] text-slate-500 truncate">{s.sub}</p>
                      </div>
                    </div>
                    {active && (
                      <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: DASH.brandSoft, color: DASH.brand }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DASH.brand }} />Filter
                      </span>
                    )}
                  </div>
                  <div className="mt-2 lg:mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-2xl lg:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{s.count}</p>
                      <p className="text-[10px] lg:text-xs text-slate-500">telah ikut · {pct}%</p>
                    </div>
                    <div className="hidden lg:flex flex-col items-end gap-1">
                      {s.spark ? <SparkBars values={s.spark} color={DASH.brand} /> : <span className="text-[10px] text-slate-500">dari {s.total} personel</span>}
                      {s.spark && <span className="text-[10px] text-slate-500">{s.latest ? formatTrainingDate(s.latest) : '-'}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          ) : (
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 lg:gap-4">
            {dashboard.programs.map(p => {
              const active = program === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => switchProgram(p.key)}
                  className={`text-left rounded-[22px] lg:rounded-[26px] bg-white dark:bg-slate-900 p-3 lg:p-5 transition-all cursor-pointer border-2 ${active ? '' : 'border-white dark:border-slate-800 hover:border-slate-200'}`}
                  style={active ? { borderColor: DASH.brand } : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: DASH.brandSoft, color: DASH.brand }}>
                        {p.key === 'sap' ? <ClipboardCheck className="w-4 h-4" /> : p.key === 'k3' ? <HardHat className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] lg:text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{p.label}</p>
                        <p className="hidden lg:block text-[11px] text-slate-500 truncate">{p.sub}</p>
                      </div>
                    </div>
                    {active && (
                      <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: DASH.brandSoft, color: DASH.brand }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DASH.brand }} />Aktif
                      </span>
                    )}
                  </div>
                  <div className="mt-2 lg:mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-2xl lg:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{p.count}</p>
                      <p className="text-[10px] lg:text-xs text-slate-500">{p.metric}</p>
                    </div>
                    <div className="hidden lg:flex flex-col items-end gap-1">
                      <SparkBars values={p.spark} color={DASH.brand} />
                      <span className="text-[10px] text-slate-500">{p.latest ? formatTrainingDate(p.latest) : '-'}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          )}

          <DashCard className={`lg:col-span-8 ${showCharts ? 'flex' : 'hidden'} md:flex flex-col`}>
            <DashTitle
              title="Analitik Training"
              sub={
                viewMode === 'pencapaian' && achievement ? `${achievement.totalPct}% total pencapaian Training SAP`
                : viewMode === 'peserta' ? 'Jumlah karyawan yang telah mengikuti — tanpa masa berlaku'
                : viewMode === 'status' ? (countOnly ? 'Jumlah peserta per training' : 'Komposisi status per training (persentase)')
                : `Jumlah training per bulan${monthlyChartData?.truncated ? ` (${MONTHLY_CHART_MAX_MONTHS} bulan terakhir)` : ''}`
              }
              right={
                <div className="relative">
                  <select
                    value={viewMode}
                    onChange={e => setAnalyticsView(e.target.value as typeof analyticsView)}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                  >
                    {analyticsOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              }
            />
            {/* Tinggi diagram mengikuti kolom kartu program di sebelahnya (min. 300px) */}
            <div className="relative flex-1 min-h-[300px]">
              <div className="absolute inset-0">
              {viewMode === 'pencapaian' && achievement && (
                <Bar
                  data={{
                    ...achievement.chart,
                    datasets: [
                      { ...achievement.chart.datasets[0], backgroundColor: achievement.rows.map(r => (r.pct >= 90 ? DASH.brand : r.pct >= 70 ? DASH.yellow : DASH.coral)), borderRadius: 999, barThickness: 14 },
                      { ...achievement.chart.datasets[1], backgroundColor: '#eef1f0', borderRadius: 999, barThickness: 14 },
                    ],
                  }}
                  plugins={[achievementLabels]}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        filter: item => item.datasetIndex === 0,
                        callbacks: { label: ctx => { const row = achievement.rows[ctx.dataIndex]; return ` ${row.pct}% — ${row.done} dari ${row.target} personel`; } },
                      },
                    },
                    scales: {
                      x: { stacked: true, min: 0, max: 100, ticks: { callback: v => `${v}%`, font: { size: 10 }, stepSize: 25 }, grid: { color: '#f1f5f9' }, border: { display: false } },
                      y: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: ctx => ({ size: 11, weight: ctx.index === achievement.rows.length - 1 ? 'bold' : 'normal' }) } },
                    },
                  }}
                />
              )}
              {viewMode === 'peserta' && participation && (
                <Bar
                  data={{
                    ...participation.chart,
                    datasets: [{ ...participation.chart.datasets[0], backgroundColor: participation.rows.map(r => (r.group === 'Training K3' ? DASH.brand : DASH.mint)), borderRadius: 999, barThickness: 14 }],
                  }}
                  plugins={[countEndLabels]}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: ctx => { const row = participation.rows[ctx.dataIndex]; return ` ${row.count} orang telah mengikuti${row.pending ? ` · ${row.pending} pending` : ''}`; } } },
                    },
                    scales: {
                      x: { beginAtZero: true, grace: '12%', ticks: { precision: 0, font: { size: 10 } }, grid: { color: '#f1f5f9' }, border: { display: false } },
                      y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } },
                    },
                  }}
                />
              )}
              {(viewMode === 'status' || viewMode === 'tren') && (viewMode === 'status' ? statusChartData : monthlyChartData) && (
                <Bar
                  data={(viewMode === 'status' ? statusChartData : monthlyChartData)!}
                  plugins={[barPercentLabels]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      barPercentLabels: { mode: countOnly && viewMode === 'status' ? 'count' : 'percent' },
                      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                      tooltip: {
                        callbacks: {
                          label: ctx => {
                            const total = ctx.chart.data.datasets.reduce((s, ds, i) => s + (ctx.chart.isDatasetVisible(i) ? Number(ds.data[ctx.dataIndex]) || 0 : 0), 0);
                            return ` ${ctx.dataset.label}: ${ctx.parsed.y} orang (${total ? Math.round((ctx.parsed.y / total) * 100) : 0}%)`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true } },
                      y: { stacked: true, beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { precision: 0, font: { size: 10 } } },
                    },
                  }}
                />
              )}
              {((viewMode === 'pencapaian' && !achievement) || (viewMode === 'peserta' && !participation)
                || (viewMode === 'status' && !statusChartData) || (viewMode === 'tren' && !monthlyChartData)) && (
                <div className="h-full flex items-center justify-center text-xs font-medium text-slate-500">Belum ada data untuk ditampilkan</div>
              )}
              </div>
            </div>
          </DashCard>
          </>)}
        </div>

        {/* ===== Baris 3: Cakupan · Daftar Karyawan ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
          <DashCard className={`lg:col-span-4 ${showCharts ? '' : 'hidden'} md:block`}>
            <DashTitle
              title={countOnly ? 'Jumlah Peserta per Training' : 'Cakupan per Training'}
              sub={countOnly ? 'Klik untuk melihat pesertanya' : program === 'k3' ? 'Wajib per section & GOL I–III · klik untuk melihat yang belum ikut' : 'Klik untuk melihat yang belum berlaku'}
            />
            <div className="space-y-2">
              {stats.coverage.map(c => {
                const active = missingFilter === c.key;
                const pct = c.target ? Math.round((c.done / c.target) * 100) : 0;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setMissingFilter(active ? null : c.key)}
                    title={c.desc}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer border ${active ? 'border-transparent' : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/60 dark:border-slate-700'}`}
                    style={active ? { backgroundColor: DASH.brandSoft, borderColor: DASH.brand } : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{c.label}</span>
                      <span className="text-[11px] font-semibold text-slate-600">
                        {countOnly ? `${c.done} orang` : `${c.done}/${c.target} · ${pct}%`}
                      </span>
                    </div>
                    {!countOnly && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? DASH.brand : pct >= 70 ? DASH.yellow : DASH.coral }} />
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-2.5 text-[10px] font-semibold text-slate-500">
                      {!countOnly && c.target - c.done > 0 && <span className="text-rose-600">{c.target - c.done} {program === 'k3' ? 'belum ikut' : 'belum berlaku'}</span>}
                      {c.warning > 0 && <span className="text-yellow-600">{c.warning} warning</span>}
                      {!countOnly && c.expired > 0 && <span className="text-red-600">{c.expired} expired/fail</span>}
                      {c.pending > 0 && <span className="text-sky-600">{c.pending} pending</span>}
                      {countOnly && c.expired > 0 && <span className="text-red-600">{c.expired} fail</span>}
                      {c.exempt > 0 && <span>{c.exempt} tidak wajib</span>}
                    </div>
                  </button>
                );
              })}

              {program === 'pop' && (
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Kualifikasi POP</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(POP_KETERANGAN) as PopKeterangan[]).map(k => {
                      const n = programRecords.filter(r => r.popData?.popKeterangan === k).length;
                      const active = statusFilter === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setStatusFilter(active ? 'ALL' : k)}
                          title={POP_KETERANGAN[k].desc}
                          className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-left cursor-pointer ${active ? 'border-transparent' : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100'}`}
                          style={active ? { backgroundColor: DASH.brandSoft, borderColor: DASH.brand } : undefined}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: POP_KETERANGAN_COLOR[k] }} />
                            <span className="text-[10px] font-semibold text-slate-800 truncate">{POP_KETERANGAN[k].label}</span>
                          </span>
                          <span className="text-xs font-bold text-slate-900">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </DashCard>

          <div className="lg:col-span-8 min-w-0">
          <div className={tableCardCls}>
            {/* Header tabel: judul · tab program · Filter · Export */}
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">Daftar Karyawan</h3>
                  <p className="text-[11px] font-medium text-slate-500 truncate">{programLabel} · dikelompokkan per jabatan</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFilters(v => !v)}
                    className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold cursor-pointer ${showFilters ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                    style={showFilters ? { backgroundColor: DASH.brand } : undefined}
                    aria-expanded={showFilters}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filter
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: DASH.coral }}>{activeFilterCount}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    title="Ekspor data tab aktif (sesuai filter) ke CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>

              {/* Tab program */}
              {!isExternal && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800">
                {([
                  { id: 'sap' as const, label: 'Training SAP', short: 'SAP' },
                  { id: 'k3' as const, label: 'Training K3', short: 'K3' },
                ]).map(tab => {
                  const active = program === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => switchProgram(tab.id)}
                      className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${active ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <span className="sm:hidden">{tab.short}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="text-[10px] font-bold px-1.5 rounded-full" style={active ? { backgroundColor: DASH.brandSoft, color: DASH.brand } : undefined}>{programCounts[tab.id]}</span>
                    </button>
                  );
                })}
              </div>
              )}

              {/* Filter lanjutan */}
              {showFilters && (
                <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2 [&>select]:w-full md:[&>select]:w-auto">
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
                        <option value="EXPIRED">Ada Expired / Failed</option>
                        <option value="WARNING">Ada Warning</option>
                      </>
                    ) : program === 'k3' ? (
                      <>
                        <option value="SUDAH">Lengkap (semua K3 wajib)</option>
                        <option value="BELUM">Belum Lengkap</option>
                        <option value="PENDING">Ada Pending</option>
                        <option value="TIDAK_WAJIB">Tidak Wajib K3</option>
                      </>
                    ) : (
                      <>
                        {(Object.keys(POP_KETERANGAN) as PopKeterangan[]).map(k => (
                          <option key={k} value={k}>{POP_KETERANGAN[k].label}</option>
                        ))}
                        <option value="BELUM_POP">Wajib, Belum Ikut POP</option>
                      </>
                    )}
                  </select>
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="col-span-2 md:col-span-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              )}

              <p className="text-[11px] font-medium text-slate-500">
                Menampilkan <span className="font-bold text-slate-900 dark:text-slate-100">{filteredRecords.length}</span> dari {stats.total} personel
                {searchQuery && <> · cari “<span className="font-semibold text-slate-700">{searchQuery}</span>”</>}
                {missingFilter && (countOnly
                  ? <> · telah mengikuti <span className="font-semibold" style={{ color: DASH.brand }}>{stats.coverage.find(c => c.key === missingFilter)?.label}</span></>
                  : <> · belum berlaku <span className="font-semibold text-rose-600">{stats.coverage.find(c => c.key === missingFilter)?.label}</span></>)}
                {program === 'sap' && <span className="hidden md:inline"> · <span className="font-semibold text-yellow-600">WARNING</span> ≥ {(TRAINING_WARNING_MONTHS / 12).toLocaleString('id-ID')} th · <span className="font-semibold text-red-600">EXPIRED</span> ≥ {(TRAINING_EXPIRY_MONTHS / 12).toLocaleString('id-ID')} th sejak tanggal training</span>}
                {countOnly && <span className="hidden md:inline"> · tanpa masa berlaku</span>}
              </p>
            </div>

        {/* Data */}
        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Memuat Database Training">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.09 }} />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
            <p className="text-sm font-bold text-slate-900 mb-1">Data tidak ditemukan</p>
            <p className="text-xs text-slate-600">{programRecords.length === 0 ? `Belum ada data ${programLabel}.` : 'Coba ubah kata kunci atau filter.'}</p>
          </div>
        ) : (
          <>
            {/* Tabel (desktop / tablet) */}
            <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                    {program === 'pop' ? (
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2.5 text-center">No</th>
                      <th className="px-3 py-2.5">NIK</th>
                      <th className="px-3 py-2.5">Nama</th>
                      <th className="px-3 py-2.5 text-center">PT</th>
                      <th className="px-3 py-2.5" title="Dihitung dari tanggal awal bergabung (DOH)">Masa Kerja</th>
                      <th className="px-3 py-2.5 text-center" title="Pra Pengawas Operasional Pertama">Pra POP</th>
                      <th className="px-3 py-2.5 text-center" title="Pengawas Operasional Pertama">POP</th>
                      <th className="px-3 py-2.5">Kualifikasi</th>
                      <th className="px-3 py-2.5 text-center">Keterangan POP</th>
                      <th className="px-3 py-2.5 text-center" title="Pengawas Operasional Madya">POM</th>
                      {canManage && <th className="px-3 py-2.5 text-center">Aksi</th>}
                    </tr>
                    ) : (
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
                    )}
                  </thead>
                  <tbody>
                    {jabatanGroups.map(group => (
                      <React.Fragment key={group.jabatan}>
                        <tr className="border-t border-slate-100" style={{ backgroundColor: DASH.brandSoft }}>
                          <td colSpan={tableColSpan} className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold" style={{ color: DASH.brand }}>{group.jabatan}</span>
                              <span className="px-2 py-px rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: DASH.brand }}>{group.rows.length}</span>
                            </div>
                          </td>
                        </tr>
                    {group.rows.map((r, idx) => (
                      <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2 text-center text-[11px] font-mono font-bold text-slate-600">{idx + 1}</td>
                        <td className="px-3 py-2 text-[11px] font-mono font-bold text-slate-800 whitespace-nowrap">{r.nik}</td>
                        <td className="px-3 py-2 text-xs font-black text-slate-950 min-w-[170px]">{r.nama}</td>
                        {program === 'pop' ? (
                          <>
                            <td className="px-3 py-2 text-center text-[11px] font-black text-slate-800">{r.pt || '-'}</td>
                            <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                              <span className="font-bold text-slate-800">{popMasaKerja(r.popData) || '-'}</span>
                              {r.popData?.doh && <span className="block text-[10px] font-semibold text-slate-500">DOH {formatTrainingDate(r.popData.doh)}</span>}
                            </td>
                            <td className="px-3 py-2 text-center">{renderPraPop(r.popData)}</td>
                            <td className="px-3 py-2 text-center">{renderPopBatch(r.popData)}</td>
                            <td className="px-3 py-2 min-w-[140px]">{renderKualifikasi(r.popData)}</td>
                            <td className="px-3 py-2 text-center">{renderPopKeterangan(r.popData?.popKeterangan)}</td>
                            <td className="px-3 py-2 text-center">{renderPom(r.popData)}</td>
                          </>
                        ) : (
                          <>
                        {program === 'k3' && <td className="px-3 py-2 text-[11px] font-semibold text-slate-700 whitespace-nowrap">{r.bagian || '-'}</td>}
                        {program === 'k3' && <td className="px-3 py-2 text-center text-[11px] font-black text-slate-800">{r.pt || '-'}</td>}
                        <td className="px-3 py-2 text-center text-[11px] font-black text-slate-800">{r.gol || '-'}</td>
                        <td className="px-3 py-2 text-center text-[11px] font-bold text-slate-800 whitespace-nowrap">{r.shift || '-'}</td>
                        {program === 'sap'
                          ? SAP_TRAININGS.map(t => <td key={t.key} className="px-3 py-2 text-center">{renderSapCell(r, t.key, t.statusKey)}</td>)
                          : K3_TRAININGS.map(t => <td key={t.key} className="px-3 py-2 text-center">{renderK3Cell(r, t.key, t.statusKey)}</td>)}
                        <td className="px-3 py-2 text-center">{renderStatusBadge(r)}</td>
                          </>
                        )}
                        {canManage && (
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => openEditModal(r)} className="p-1.5 rounded-full hover:bg-teal-50 text-teal-700 cursor-pointer" title="Edit">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-full hover:bg-rose-50 text-rose-600 cursor-pointer" title="Hapus">
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
                  <span className="text-xs font-bold" style={{ color: DASH.brand }}>{group.jabatan}</span>
                  <span className="px-2 py-px rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: DASH.brand }}>{group.rows.length}</span>
                </div>
              {group.rows.map((r, idx) => (
                <div key={r.id} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950 leading-tight"><span className="font-mono text-slate-500 mr-1">{idx + 1}.</span>{r.nama}</p>
                      <p className="text-[11px] font-mono font-bold text-slate-600 mt-0.5">{r.nik}{r.pt ? ` · ${r.pt}` : ''}</p>
                      <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                        {program === 'pop'
                          ? `${r.jabatan || '-'} · Masa kerja ${popMasaKerja(r.popData) || '-'}`
                          : `${r.jabatan || '-'} · GOL ${r.gol || '-'} · ${r.shift || '-'}${program === 'k3' && r.bagian ? ` · ${r.bagian}` : ''}`}
                      </p>
                    </div>
                    {program === 'pop' ? renderPopKeterangan(r.popData?.popKeterangan) : renderStatusBadge(r)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {program === 'pop' ? (
                      <>
                        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase text-slate-600">Pra POP</span>{renderPraPop(r.popData)}</div>
                        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase text-slate-600">POP</span>{renderPopBatch(r.popData)}</div>
                        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase text-slate-600">POM</span>{renderPom(r.popData)}</div>
                        <div className="col-span-2">{renderKualifikasi(r.popData)}</div>
                      </>
                    ) : program === 'sap'
                      ? SAP_TRAININGS.map(t => (
                          <div key={t.key} className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-600">{t.label}</span>
                            {renderSapCell(r, t.key, t.statusKey)}
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
                      <button type="button" onClick={() => openEditModal(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold cursor-pointer">
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold cursor-pointer">
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
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSave} className="w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl border" style={cardStyle}>
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

              <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2 mt-1">{program === 'pop' ? 'Data Sertifikasi POP/POM' : `Tanggal ${programLabel}`}</p>
              {program === 'sap' ? (
                <>
                  <p className="-mt-1 mb-2 text-[11px] font-semibold text-slate-500">
                    Wajib untuk GOL {form.gol || '-'}: <span className="font-black text-slate-700">{sapGolRule(form.gol)}</span>
                  </p>
                  <div className="space-y-1">
                    {SAP_TRAININGS.map(t => {
                      const required = sapRequiredKeysForGol(form.gol).includes(t.key);
                      return (
                        <div key={t.key} className="grid grid-cols-2 gap-x-4">
                          <Input label={required ? t.label : `${t.label} (tidak wajib)`} type="date" value={form[t.key]} onChange={e => updateForm(t.key, e.target.value)} title={t.desc} />
                          <Select label={`Status ${t.label}`} value={form[t.statusKey]} onChange={e => updateForm(t.statusKey, e.target.value)}>
                            <option value="">-</option>
                            {SAP_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : program === 'k3' ? (
                <div className="space-y-1">
                  {K3_TRAININGS.map(t => (
                    <div key={t.key} className="grid grid-cols-2 gap-x-4">
                      <Input
                        label={k3RequiredKeysFor(form.bagian, form.gol).includes(t.key) ? t.label : `${t.label} (tidak wajib)`}
                        type="date"
                        value={form[t.key]}
                        onChange={e => updateForm(t.key, e.target.value)}
                        title={`${t.desc} — wajib: ${K3_RULES[t.key]}`}
                      />
                      <Select label={`Status ${t.label}`} value={form[t.statusKey]} onChange={e => updateForm(t.statusKey, e.target.value)}>
                        <option value="">-</option>
                        {K3_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input label="Tanggal Awal Bergabung (DOH)" type="date" value={form.pop_doh} onChange={e => updateForm('pop_doh', e.target.value)} containerClassName="mb-0" />
                  <fieldset className="p-3 rounded-xl border border-slate-200">
                    <legend className="px-1 text-[11px] font-black uppercase tracking-wider text-slate-700">Pra POP</legend>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                      <Input label="Tanggal" type="date" value={form.pop_praPop} onChange={e => updateForm('pop_praPop', e.target.value)} />
                      <Input label="Instruktur" value={form.pop_praPopIns} onChange={e => updateForm('pop_praPopIns', e.target.value)} />
                      <Select label="Hasil" value={form.pop_praPopResult} onChange={e => updateForm('pop_praPopResult', e.target.value)}>
                        <option value="">-</option>
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                      </Select>
                      <Input label="Pre Test" type="number" min={0} max={100} value={form.pop_praPopPre} onChange={e => updateForm('pop_praPopPre', e.target.value)} />
                      <Input label="Post Test" type="number" min={0} max={100} value={form.pop_praPopPost} onChange={e => updateForm('pop_praPopPost', e.target.value)} />
                    </div>
                  </fieldset>
                  <fieldset className="p-3 rounded-xl border border-slate-200">
                    <legend className="px-1 text-[11px] font-black uppercase tracking-wider text-slate-700">POP & Kualifikasi</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      <Input label="Batch POP" value={form.pop_popBatch} onChange={e => updateForm('pop_popBatch', e.target.value)} placeholder="Contoh: Batch 2 (2026)" />
                      <Select label="Keterangan POP" value={form.pop_popKeterangan} onChange={e => updateForm('pop_popKeterangan', e.target.value)}>
                        <option value="">-</option>
                        {(Object.keys(POP_KETERANGAN) as PopKeterangan[]).map(k => <option key={k} value={k}>{POP_KETERANGAN[k].label}</option>)}
                      </Select>
                      <Input label="Pendidikan Terakhir" value={form.pop_pendidikan} onChange={e => updateForm('pop_pendidikan', e.target.value)} placeholder="SMA / D3 / S1 ..." />
                      <Input label="Tahun Lulus" value={form.pop_tahunLulus} onChange={e => updateForm('pop_tahunLulus', e.target.value)} placeholder="Contoh: 2018" />
                      <Input label="Pengalaman di Tambang Lain" value={form.pop_pengalamanTambang} onChange={e => updateForm('pop_pengalamanTambang', e.target.value)} placeholder="Contoh: 4 Tahun" containerClassName="sm:col-span-2" />
                    </div>
                  </fieldset>
                  <fieldset className="p-3 rounded-xl border border-slate-200">
                    <legend className="px-1 text-[11px] font-black uppercase tracking-wider text-slate-700">POM</legend>
                    <div className="grid grid-cols-2 gap-x-4">
                      <Input label="Batch / Catatan POM" value={form.pop_pom} onChange={e => updateForm('pop_pom', e.target.value)} />
                      <Select label="Keterangan POM" value={form.pop_pomKeterangan} onChange={e => updateForm('pop_pomKeterangan', e.target.value)}>
                        <option value="">-</option>
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                      </Select>
                    </div>
                  </fieldset>
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
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl border p-5 sm:p-6 pb-8 sm:pb-6" style={cardStyle}>
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
              {importPreview.singleTraining !== undefined ? (
                // File satu-training: pilih / konfirmasi jenis trainingnya
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                  <label className="block font-semibold text-indigo-900 mb-1.5">Jenis training di file ini</label>
                  <select
                    value={importPreview.singleTraining ?? ''}
                    onChange={e => chooseImportTraining(e.target.value as TrainingKey)}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white text-xs font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="" disabled>Pilih training...</option>
                    {ALL_TRAININGS.map(t => (
                      <option key={t.key} value={t.key}>{t.desc} — {t.program === 'sap' ? 'Training SAP' : 'Training K3'}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-600">Format terdeteksi</span>
                  <span className="font-black text-slate-950">{importPreview.programs.map(p => PROGRAM_LABEL[p]).join(' + ')}</span>
                </div>
              )}
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
              <Button onClick={confirmImport} disabled={isImporting || importPreview.records.length === 0} className="flex-1 py-2.5 text-xs font-bold">
                {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Import {importPreview.records.length} Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl border p-6 pb-8 sm:pb-6 text-center" style={cardStyle}>
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-950 mb-1">Hapus dari {programLabel}?</h3>
            <p className="text-xs text-slate-600 mb-5">
              Data {programLabel} <span className="font-black text-slate-900">{deleteTarget.nama}</span> ({deleteTarget.nik}) akan dihapus.
              {(Object.keys(PROGRAM_FLAG_KEY) as TrainingProgram[]).some(p => p !== program && deleteTarget[PROGRAM_FLAG_KEY[p]])
                && ' Data di program training lainnya tetap tersimpan.'}
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
