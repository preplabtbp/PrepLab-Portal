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
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Input, Select, Textarea, Button } from './ui';
import {
  SAP_TRAININGS,
  K3_TRAININGS,
  sapRequiredKeys as sapRequiredKeysForGol,
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Opsi plugin label batang kustom (lihat barPercentLabels)
declare module 'chart.js' {
  interface PluginOptionsByType<TType extends import('chart.js').ChartType> {
    barPercentLabels?: { mode?: 'percent' | 'count' };
  }
}

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
// Tidak ada masa berlaku (WARNING / EXPIRED) — cukup dihitung siapa yang telah mengikuti
type K3State = 'PASS' | 'Pending' | 'FAIL' | 'none';
function k3State(r: TrainingRecord, key: K3DateKey, statusKey: K3StatusKey): K3State {
  const status = r[statusKey];
  if (status === 'Pending') return 'Pending';
  if (status === 'FAIL') return 'FAIL';
  if (r[key] || status === 'PASS') return 'PASS';
  return 'none';
}
const k3IsValid = (s: K3State) => s === 'PASS';
const k3PassCount = (r: TrainingRecord) => K3_TRAININGS.filter(t => k3IsValid(k3State(r, t.key, t.statusKey))).length;
const k3HasPending = (r: TrainingRecord) => K3_TRAININGS.some(t => k3State(r, t.key, t.statusKey) === 'Pending');

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

interface TrainingDatabaseScreenProps {
  inspectorNik?: string;
  inspectorName?: string;
  onBack?: () => void;
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
    <section className="rounded-2xl border shadow-xs overflow-hidden" style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center shrink-0">{icon}</div>
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

function MyTrainingView({ record, name, onBack }: { record: TrainingRecord | null; name: string; onBack?: () => void }) {
  const badge = (text: string, cls: string) => (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap ${cls}`}>{text}</span>
  );
  const required = record ? sapRequiredKeys(record) : [];
  const sapValid = record ? sapDoneCount(record) : 0;
  const p = record?.popData;

  return (
    <div className="min-h-screen pb-24 transition-colors duration-200" style={{ backgroundColor: 'var(--bg-main, #f8fafc)' }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Profil */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 cursor-pointer active:scale-95" title="Kembali">
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950">Training Saya</h1>
            <p className="text-xs font-semibold text-slate-600 truncate">{record?.nama || name}</p>
          </div>
        </div>

        {!record ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <GraduationCap className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-900 mb-1">Data training Anda belum tercatat</p>
            <p className="text-xs text-slate-600">Hubungi Admin Preparation & Laboratory untuk pembaruan data training.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border shadow-xs p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}>
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

            {record.inSap && (
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

            {record.inK3 && (
              <MyTrainingSection title="Training K3" subtitle="Tanpa masa berlaku" icon={<HardHat className="w-4 h-4" />}>
                {K3_TRAININGS.map(t => {
                  const state = k3State(record, t.key, t.statusKey);
                  return (
                    <MyTrainingRow
                      key={t.key}
                      label={t.label}
                      desc={t.desc}
                      sub={record[t.key] ? formatTrainingDate(record[t.key]) : undefined}
                      right={state === 'none'
                        ? badge('Belum', 'bg-slate-100 text-slate-500 border-slate-200')
                        : badge(state === 'PASS' ? 'Telah Mengikuti' : state, STATUS_BADGE[state])}
                    />
                  );
                })}
              </MyTrainingSection>
            )}

            {record.inPop && (
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

            <p className="text-[11px] font-semibold text-slate-500 px-1">
              Ada data yang tidak sesuai? Hubungi Admin Preparation & Laboratory untuk pembaruan.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function TrainingDatabaseScreen({ inspectorNik = '', inspectorName = '', onBack }: TrainingDatabaseScreenProps) {
  const queryClient = useQueryClient();
  // Data di-cache TanStack Query: kunjungan ulang tampil instan, lalu diperbarui di background
  // Cache per akun (NIK) agar data akses penuh tidak pernah tampil ke akun lain di perangkat yang sama
  const { data: payload, isLoading, isFetching, error: loadError } = useQuery({
    queryKey: [...TRAINING_QUERY_KEY, inspectorNik.trim().toUpperCase()],
    queryFn: fetchTrainingRecords,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const records = payload?.records ?? EMPTY_RECORDS;
  const access: TrainingAccess = payload?.access ?? { viewAll: false, canManage: false, nik: '' };

  const [program, setProgram] = useState<TrainingProgram>(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      return saved === 'k3' || saved === 'pop' ? saved : 'sap';
    } catch { return 'sap'; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [golFilter, setGolFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [bagianFilter, setBagianFilter] = useState('ALL');
  const [ptFilter, setPtFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [missingFilter, setMissingFilter] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'status' | 'monthly'>('status');
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
  const countOnly = program !== 'sap';

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
    setProgram(p);
    setStatusFilter('ALL');
    setMissingFilter(null);
    try { localStorage.setItem(TAB_STORAGE_KEY, p); } catch {}
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
      const states = programRecords.map(r => k3State(r, t.key, t.statusKey));
      return {
        key: t.key as string,
        label: t.label,
        desc: t.desc,
        done: states.filter(k3IsValid).length,
        warning: 0,
        expired: states.filter(s => s === 'FAIL').length,
        pending: states.filter(s => s === 'Pending').length,
        target: total,
        exempt: 0,
      };
    });
    const sudahTraining = programRecords.filter(r => k3PassCount(r) > 0).length;
    const pending = programRecords.filter(k3HasPending).length;
    return { total, latest, coverage, cardA: sudahTraining, cardB: pending };
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

  // ===== Jumlah karyawan yang telah mengikuti (Training K3 & Sertifikasi POP — tanpa target/masa berlaku) =====
  const participation = useMemo(() => {
    const k3People = records.filter(r => r.inK3);
    const popPeople = records.filter(r => r.inPop);
    const rows = [
      ...K3_TRAININGS.map(t => ({
        label: t.label, group: 'Training K3',
        count: k3People.filter(r => k3IsValid(k3State(r, t.key, t.statusKey))).length,
        pending: k3People.filter(r => k3State(r, t.key, t.statusKey) === 'Pending').length,
      })),
      ...POP_STAGES.map(s => ({ label: s.label, group: 'Sertifikasi POP', count: popPeople.filter(r => s.attended(r.popData)).length, pending: 0 })),
    ];
    if (k3People.length === 0 && popPeople.length === 0) return null;
    return {
      rows,
      chart: {
        labels: rows.map(r => r.label),
        datasets: [
          { label: 'Telah mengikuti', data: rows.map(r => r.count), backgroundColor: rows.map(r => (r.group === 'Training K3' ? '#0d9488' : '#7c3aed')), borderRadius: 4, barThickness: 16 },
        ],
      },
    };
  }, [records]);

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
        if (statusFilter === 'SUDAH' && k3PassCount(r) === 0) return false;
        if (statusFilter === 'BELUM' && (k3PassCount(r) > 0 || k3HasPending(r))) return false;
        if (missingFilter) {
          // Klik kartu cakupan → tampilkan yang TELAH mengikuti training tsb
          const t = K3_TRAININGS.find(x => x.key === missingFilter);
          if (t && !k3IsValid(k3State(r, t.key, t.statusKey))) return false;
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
    if (state === 'none') return <span className="text-[11px] font-bold text-slate-300">-</span>;
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
    : program === 'k3'
    ? [
        { label: 'Total Personel', value: stats.total, sub: 'Peserta Training K3', icon: <Users className="w-4 h-4" />, tone: 'bg-indigo-500/10 text-indigo-700' },
        { label: 'Sudah Training', value: stats.cardA, sub: 'Minimal 1 training PASS', icon: <CheckCircle2 className="w-4 h-4" />, tone: 'bg-emerald-500/10 text-emerald-700' },
        { label: 'Status Pending', value: stats.cardB, sub: 'Menunggu hasil / sertifikat', icon: <Clock className="w-4 h-4" />, tone: 'bg-amber-500/10 text-amber-700' },
        { label: 'Training Terakhir', value: stats.latest ? formatTrainingDate(stats.latest) : '-', sub: 'Tanggal training terbaru', icon: <CalendarCheck className="w-4 h-4" />, tone: 'bg-violet-500/10 text-violet-700' },
      ]
    : [
        { label: 'Total Personel', value: stats.total, sub: 'Terdata Sertifikasi POP/POM', icon: <Users className="w-4 h-4" />, tone: 'bg-indigo-500/10 text-indigo-700' },
        { label: 'Telah Pra POP', value: stats.coverage[0]?.done ?? 0, sub: 'Mengikuti Pra Pengawas Operasional', icon: <ClipboardCheck className="w-4 h-4" />, tone: 'bg-sky-500/10 text-sky-700' },
        { label: 'Telah POP', value: stats.cardA, sub: `${stats.coverage[2]?.done ?? 0} orang lulus POM`, icon: <Award className="w-4 h-4" />, tone: 'bg-violet-500/10 text-violet-700' },
        { label: 'Memenuhi Syarat POP', value: stats.cardB, sub: 'Pendidikan & masa kerja terpenuhi', icon: <CheckCircle2 className="w-4 h-4" />, tone: 'bg-emerald-500/10 text-emerald-700' },
      ];

  // Hak akses belum diketahui → tampilkan kerangka saja (data akses penuh tidak boleh berkedip ke akun biasa)
  if (!payload) {
    return (
      <div className="min-h-screen px-3 sm:px-6 py-5" style={{ backgroundColor: 'var(--bg-main, #f8fafc)' }}>
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
    const own = records.find(r => r.nik === access.nik) ?? records[0] ?? null;
    return <MyTrainingView record={own} name={inspectorName} onBack={onBack} />;
  }

  return (
    <div className="min-h-screen pb-16 transition-colors duration-200" style={{ backgroundColor: 'var(--bg-main, #f8fafc)' }}>
      {/* Header Toolbar */}
      <div
        className="md:sticky md:top-[57px] z-20 border-b backdrop-blur-md px-3 sm:px-6 py-3 sm:py-3.5 transition-colors"
        style={{ backgroundColor: 'var(--header-bg, rgba(255, 255, 255, 0.95))', borderColor: 'var(--border-main, #cbd5e1)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
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
              <p className="hidden sm:block text-xs font-semibold text-slate-700">Rekap Training SAP, Training K3 & Sertifikasi POP/POM per karyawan</p>
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* Di HP diagram disembunyikan dulu agar daftar karyawan cepat terjangkau (tombol "Tampilkan Diagram") */}
        <div className={`${showCharts ? 'grid' : 'hidden'} md:grid grid-cols-1 xl:grid-cols-2 gap-4`}>
        {/* Diagram Pencapaian Training SAP (%) */}
        {achievement && (
          <div className="p-4 rounded-2xl border shadow-xs" style={cardStyle}>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Pencapaian Training SAP</h3>
                  <p className="text-[10px] font-semibold text-slate-500">Persentase personel wajib yang training-nya masih berlaku</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono leading-none" style={{ color: achievementColor(achievement.totalPct) }}>
                  {achievement.totalPct}%
                </div>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Total pencapaian</p>
              </div>
            </div>
            <div style={{ height: achievement.rows.length * 26 + 20 }}>
              <Bar
                data={achievement.chart}
                plugins={[achievementLabels]}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      filter: item => item.datasetIndex === 0,
                      callbacks: {
                        label: ctx => {
                          const row = achievement.rows[ctx.dataIndex];
                          return ` ${row.pct}% — ${row.done} dari ${row.target} personel`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: { stacked: true, min: 0, max: 100, ticks: { callback: v => `${v}%`, font: { size: 10 }, stepSize: 25 }, grid: { color: '#f1f5f9' } },
                    y: {
                      stacked: true,
                      grid: { display: false },
                      ticks: { font: ctx => ({ size: 11, weight: ctx.index === achievement.rows.length - 1 ? 'bold' : 'normal' }) },
                    },
                  },
                }}
              />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />≥ 90%
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-3 mr-1" />70–89%
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 ml-3 mr-1" />&lt; 70%
              <span className="ml-3">· Dihitung dari personel yang wajib (per GOL).</span>
            </p>
          </div>
        )}

        {/* Jumlah Karyawan yang Telah Mengikuti (Training K3 & Sertifikasi POP — tanpa masa berlaku) */}
        {participation && (
          <div className="p-4 rounded-2xl border shadow-xs" style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-teal-600" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Jumlah Karyawan Telah Mengikuti</h3>
                <p className="text-[10px] font-semibold text-slate-500">Training K3 & Sertifikasi POP/POM — tanpa masa berlaku</p>
              </div>
            </div>
            <div style={{ height: participation.rows.length * 26 + 20 }}>
              <Bar
                data={participation.chart}
                plugins={[countEndLabels]}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: ctx => {
                          const row = participation.rows[ctx.dataIndex];
                          return ` ${row.count} orang telah mengikuti${row.pending ? ` · ${row.pending} pending` : ''}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: { beginAtZero: true, grace: '12%', ticks: { precision: 0, font: { size: 10 } }, grid: { color: '#f1f5f9' } },
                    y: { grid: { display: false }, ticks: { font: { size: 11 } } },
                  },
                }}
              />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-600 mr-1" />Training K3
              <span className="inline-block w-2 h-2 rounded-full bg-violet-600 ml-3 mr-1" />Sertifikasi POP/POM
            </p>
          </div>
        )}
        </div>

        {/* Tab Program */}
        {/* HP: 3 tab sejajar dengan label ringkas; desktop: label lengkap + keterangan */}
        <div className="grid grid-cols-3 sm:flex gap-1 sm:gap-2 p-1 rounded-2xl border w-full sm:w-fit" style={cardStyle}>
          {([
            { id: 'sap' as const, label: 'Training SAP', short: 'SAP', sub: 'HAZID · JSA · IUT OTT · IAI · BFA · Basic Safety', icon: <ClipboardCheck className="w-4 h-4 shrink-0" /> },
            { id: 'k3' as const, label: 'Training K3', short: 'K3', sub: 'WAH · LOTO · Confined Space · Fire Fighting', icon: <HardHat className="w-4 h-4 shrink-0" /> },
            { id: 'pop' as const, label: 'Sertifikasi POP/POM', short: 'POP/POM', sub: 'Pra POP · POP · POM · Kualifikasi', icon: <Award className="w-4 h-4 shrink-0" /> },
          ]).map(tab => {
            const active = program === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchProgram(tab.id)}
                className={`flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2.5 px-2 sm:px-3.5 py-2 rounded-xl text-center sm:text-left transition-all cursor-pointer ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25' : 'hover:bg-slate-100 text-slate-800'}`}
              >
                {tab.icon}
                <div className="min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="text-xs font-black sm:hidden">{tab.short}</span>
                    <span className="text-xs font-black hidden sm:inline">{tab.label}</span>
                    <span className={`text-[10px] font-mono font-black px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>{programCounts[tab.id]}</span>
                  </div>
                  <p className={`hidden sm:block text-[10px] font-semibold truncate ${active ? 'text-indigo-100' : 'text-slate-500'}`}>{tab.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {kpiCards.map(card => (
            <div key={card.label} className="p-3 sm:p-4 rounded-2xl border shadow-xs min-w-0" style={cardStyle}>
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-900 leading-tight">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${card.tone}`}>{card.icon}</div>
              </div>
              <div className={`mt-1.5 sm:mt-2 font-black font-mono tracking-tight text-slate-950 ${typeof card.value === 'number' ? 'text-xl sm:text-3xl' : 'text-sm sm:text-lg'}`}>
                {card.value}
              </div>
              <p className="text-[10px] text-slate-600 font-semibold mt-1 leading-snug">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* HP: tombol buka/tutup diagram & cakupan */}
        <button
          type="button"
          onClick={() => setShowCharts(v => !v)}
          className="md:hidden w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border shadow-xs text-xs font-black text-slate-800 cursor-pointer active:scale-[0.99]"
          style={cardStyle}
          aria-expanded={showCharts}
        >
          <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-600" />{showCharts ? 'Sembunyikan Diagram & Cakupan' : 'Tampilkan Diagram & Cakupan'}</span>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showCharts ? 'rotate-180' : ''}`} />
        </button>

        <div className={`${showCharts ? 'grid' : 'hidden'} md:grid grid-cols-1 xl:grid-cols-5 gap-4`}>
          {/* Diagram Training */}
          <div className="xl:col-span-3 p-4 rounded-2xl border shadow-xs min-w-0" style={cardStyle}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
                  plugins={[barPercentLabels]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      // K3 & POP: tampilkan jumlah orang (bukan persentase) pada diagram status
                      barPercentLabels: { mode: countOnly && chartMode === 'status' ? 'count' : 'percent' },
                      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11, weight: 'bold' } } },
                      tooltip: {
                        callbacks: {
                          label: ctx => {
                            const total = ctx.chart.data.datasets.reduce((s, ds, i) =>
                              s + (ctx.chart.isDatasetVisible(i) ? Number(ds.data[ctx.dataIndex]) || 0 : 0), 0);
                            const pct = total ? Math.round((ctx.parsed.y / total) * 100) : 0;
                            return ` ${ctx.dataset.label}: ${ctx.parsed.y} orang (${pct}%)`;
                          },
                        },
                      },
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
                ? countOnly
                  ? 'Jumlah karyawan yang telah mengikuti tiap training (tanpa masa berlaku).'
                  : 'Jumlah personel per status untuk setiap jenis training; angka di batang = persentase dari seluruh personel.'
                : `Jumlah personel yang training per bulan${monthlyChartData?.truncated ? ` (${MONTHLY_CHART_MAX_MONTHS} bulan terakhir)` : ''}; angka di batang = porsi tiap training pada bulan tsb.`}
              {program === 'k3' && chartMode === 'monthly' && ' Hanya status PASS yang dihitung.'}
              {program === 'pop' && chartMode === 'monthly' && ' Berdasarkan tanggal Pra POP.'}
            </p>
          </div>

          {/* Cakupan per Jenis Training */}
          <div className="xl:col-span-2 p-4 rounded-2xl border shadow-xs" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">{countOnly ? 'Jumlah Peserta per Training' : 'Cakupan per Training'}</h3>
              <span className="text-[10px] font-semibold text-slate-500">{countOnly ? 'Klik untuk melihat pesertanya' : 'Klik untuk melihat yang belum'}</span>
            </div>
            <div className="space-y-2">
              {countOnly && stats.coverage.map(c => {
                // K3 & POP: cukup jumlah karyawan yang telah mengikuti
                const active = missingFilter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setMissingFilter(active ? null : c.key)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${active ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-300/40' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'}`}
                    title={c.desc}
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-black text-slate-950">{c.label}</span>
                      <span className="block text-[10px] font-semibold text-slate-500 truncate">{c.desc}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-lg font-black font-mono leading-none text-slate-950">{c.done}</span>
                      <span className="block text-[10px] font-bold text-slate-500">
                        orang{c.pending > 0 ? ` · ${c.pending} pending` : ''}{c.expired > 0 ? ` · ${c.expired} fail` : ''}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* POP: komposisi kualifikasi (Keterangan POP) — klik untuk filter */}
              {program === 'pop' && (
                <div className="pt-2 mt-1 border-t border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">Kualifikasi POP</p>
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
                          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${active ? 'ring-2 ring-indigo-300/50 border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: POP_KETERANGAN_COLOR[k] }} />
                            <span className="text-[10px] font-bold text-slate-800 truncate">{POP_KETERANGAN[k].label}</span>
                          </span>
                          <span className="text-xs font-black font-mono text-slate-950">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!countOnly && stats.coverage.map(c => {
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
                      <span className={missing > 0 ? 'text-rose-700' : 'text-emerald-700'}>{missing > 0 ? `${missing} belum berlaku` : 'Semua lengkap'}</span>
                      {c.expired > 0 && <span className="text-red-700">{c.expired} expired/fail</span>}
                      {c.warning > 0 && <span className="text-yellow-700">{c.warning} warning</span>}
                      {c.pending > 0 && <span className="text-amber-700">{c.pending} pending</span>}
                      {c.exempt > 0 && <span className="text-slate-500">{c.exempt} tidak wajib</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIK, jabatan..."
                className="w-full pl-9 pr-3 py-2.5 md:py-2 rounded-xl border border-slate-300 bg-white text-base sm:text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            {/* HP: filter lanjutan dilipat di balik tombol */}
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`md:hidden relative inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-black cursor-pointer ${showFilters ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-white text-slate-800'}`}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          </div>
          <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center [&>select]:w-full md:[&>select]:w-auto`}>
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
                  <option value="SUDAH">Sudah Training (PASS)</option>
                  <option value="PENDING">Ada Pending</option>
                  <option value="BELUM">Belum Training</option>
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
                className="col-span-2 md:col-span-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] font-semibold text-slate-600 -mt-2">
          Menampilkan <span className="font-black text-slate-900">{filteredRecords.length}</span> dari {stats.total} personel
          {missingFilter && (countOnly
            ? <> · telah mengikuti <span className="font-black text-teal-700">{stats.coverage.find(c => c.key === missingFilter)?.label}</span></>
            : <> · belum <span className="font-black text-rose-700">{stats.coverage.find(c => c.key === missingFilter)?.label}</span></>)}
          {/* Keterangan aturan: lengkap di desktop, diringkas di HP */}
          {program === 'sap' && <span className="hidden md:inline">
            {' · '}Wajib: GOL I → BFA & Basic Safety; GOL II–III → HAZID, JSA, IUT OTT, IAI, BFA; GOL IV–V → tanpa BFA
            {' · '}Masa berlaku: <span className="font-black text-yellow-700">WARNING</span> ≥ {(TRAINING_WARNING_MONTHS / 12).toLocaleString('id-ID')} th, <span className="font-black text-red-700">EXPIRED</span> ≥ {(TRAINING_EXPIRY_MONTHS / 12).toLocaleString('id-ID')} th sejak tanggal training
          </span>}
          {program === 'sap' && <span className="md:hidden"> · <span className="font-black text-yellow-700">WARNING</span> ≥ 1,5 th · <span className="font-black text-red-700">EXPIRED</span> ≥ 2 th</span>}
          {countOnly && <span className="hidden md:inline"> · Tanpa masa berlaku — dihitung jumlah karyawan yang telah mengikuti</span>}
          {program === 'pop' && <span className="hidden md:inline"> · Masa kerja dihitung otomatis dari DOH</span>}
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
                    {program === 'pop' ? (
                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-700">
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
                    )}
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
                      <Input label={t.label} type="date" value={form[t.key]} onChange={e => updateForm(t.key, e.target.value)} title={t.desc} />
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
