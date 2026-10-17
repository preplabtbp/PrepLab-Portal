import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  CalendarRange, RefreshCw, ImageDown, Search, ArrowLeft, Moon, Sun, Clock, CheckCircle2,
  CircleDashed, Palmtree, UserX, StickyNote, FlaskConical, Wrench, Layers, Boxes, Users, AlertCircle,
  ChevronLeft, ChevronRight, RotateCcw, Shuffle, Pencil, Maximize2, Minimize2, Plus, X, Trash2, AlertTriangle,
  Table2, FileSpreadsheet, CalendarDays, CopyPlus, Save, UserCheck
} from 'lucide-react';
import { Select } from './ui';
import { toPng } from 'html-to-image';
import { SafetyModuleSwitch } from './SafetyModuleSwitch';
import { PageHeader } from './PageHeader';
import { INSPECTION_29_AGENDAS, matchTicketToAgenda, InspectionAgendaItem } from '../utils/inspection-pic-matcher';
import { getISOWeek, getISOWeekYear } from '../utils/iso-week';
import {
  PlanMember, ShiftGroup, ruleError, shiftMismatch, agendaShortName
} from '../utils/inspection-schedule-rules';
import { getRekapWeek, getRekapWeekRange, EmployeeAvatar, photoForCapture, initials } from './safety-rekap-screen';

interface InspectionScheduleScreenProps {
  inspectorNik: string;
  inspectorName: string;
  onBack?: () => void;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ─── Kategori area (warna kartu sesuai legenda jadwal) ──────────────────────

type Category = 'PREP' | 'LAB' | 'MAINT' | 'OTHER';

const CATEGORY: Record<Category, {
  label: string; icon: React.ReactNode;
  head: string; accent: string; dot: string; print: string; printBorder: string;
}> = {
  PREP: {
    label: 'Preparasi', icon: <Layers className="w-4 h-4" />,
    head: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
    accent: 'border-t-emerald-500', dot: 'bg-emerald-400', print: '#E2EFDA', printBorder: '#A9D08E'
  },
  LAB: {
    label: 'Laboratory', icon: <FlaskConical className="w-4 h-4" />,
    head: 'bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200',
    accent: 'border-t-blue-500', dot: 'bg-blue-400', print: '#DDEBF7', printBorder: '#9BC2E6'
  },
  MAINT: {
    label: 'Maintenance', icon: <Wrench className="w-4 h-4" />,
    head: 'bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200',
    accent: 'border-t-rose-400', dot: 'bg-rose-300', print: '#FCE4D6', printBorder: '#F4B084'
  },
  OTHER: {
    label: 'Lain-lain', icon: <Boxes className="w-4 h-4" />,
    head: 'bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200',
    accent: 'border-t-amber-400', dot: 'bg-amber-300', print: '#FFF2CC', printBorder: '#FFD966'
  }
};
const CATEGORY_ORDER: Category[] = ['PREP', 'LAB', 'MAINT', 'OTHER'];

// Pemetaan 29 agenda (id dari inspection-pic-matcher) ke kategori area
const AGENDA_CATEGORY: Record<number, Category> = {
  1: 'MAINT', 2: 'MAINT', 3: 'MAINT', 4: 'MAINT', 18: 'MAINT',
  5: 'LAB', 6: 'LAB', 10: 'LAB', 11: 'LAB', 12: 'LAB', 13: 'LAB', 14: 'LAB', 15: 'LAB', 16: 'LAB',
  9: 'PREP', 19: 'PREP', 20: 'PREP', 21: 'PREP', 22: 'PREP', 23: 'PREP', 24: 'PREP', 25: 'PREP', 28: 'PREP', 29: 'PREP',
  7: 'OTHER', 8: 'OTHER', 17: 'OTHER', 26: 'OTHER', 27: 'OTHER'
};

const NON_ACTIVE_PATTERN = /resign|dinas|mutasi|sakit|new\s*hire/i;

const NOTES = [
  'Jadwal inspeksi disesuaikan dengan waktu masing-masing tim.',
  'Inspeksi dilakukan secara bersama-sama dengan anggota timnya.',
  'Pengumpulan form inspeksi paling lambat hari Kamis di ruang admin.'
];

// ─── Tipe data ──────────────────────────────────────────────────────────────

interface Member {
  no: number;
  name: string;
  jabatan: string;
  shift: string;
  roleIndex: number;
  isCompleted: boolean;
  completedAt?: string | null;
  key?: string; // kunci PlanMember (jadwal portal)
  plan?: PlanMember;
  warnings?: MemberWarning[];
}

interface MemberWarning { level: 'error' | 'warn'; text: string }

interface InspectionPlan {
  id: number; year: number; week: number;
  members: PlanMember[]; // draft penyusun
  agendaShifts: Record<string, ShiftGroup> | null;
  source: string | null;
  updatedByName: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  publishedByName: string | null;
}

type PlanHistory = Record<string, Record<string, number>>;

const planKey = (m: { nik?: string; name?: string }) => (m.nik || m.name || '').trim().toUpperCase();

function shiftLabelOf(m: PlanMember) {
  const group = m.shiftGroup === 'Malam' ? 'Malam' : m.shiftGroup === 'Siang' ? 'Siang' : 'Nonshift';
  return m.team === 'A' || m.team === 'B' ? `Shift ${m.team} (${group})` : group;
}

// Peringatan: inspeksi sama 1 / 2 minggu sebelumnya, aturan Gol & Section, shift tidak sesuai
function memberWarnings(
  history: PlanHistory, agendaId: number | null | undefined, ident: { nik?: string; name: string },
  plan?: PlanMember, agendaShift?: ShiftGroup | null
): MemberWarning[] {
  if (!agendaId) return [];
  const list: MemberWarning[] = [];
  const ago = history[planKey(ident)]?.[agendaId] ?? history[ident.name.trim().toUpperCase()]?.[agendaId];
  if (ago) list.push({ level: 'warn', text: `Sudah melakukan inspeksi yang sama ${ago} minggu lalu` });
  if (plan) {
    const err = ruleError(plan, agendaId);
    if (err) list.push({ level: 'error', text: err });
    const mismatch = agendaShift ? shiftMismatch(plan, agendaShift) : null;
    if (mismatch) list.push({ level: 'warn', text: mismatch });
  }
  return list;
}

interface AgendaCard {
  key: string;
  title: string;
  agenda: InspectionAgendaItem | null;
  category: Category;
  members: Member[];
  shift: 'Malam' | 'Siang' | 'Nonshift' | null;
}

function shiftGroup(shift: string): 'Malam' | 'Siang' | 'Nonshift' {
  const s = (shift || '').toLowerCase();
  if (s.includes('malam')) return 'Malam';
  if (s.includes('siang')) return 'Siang';
  return 'Nonshift';
}

function findAgenda(title: string): InspectionAgendaItem | null {
  const t = title.trim().toLowerCase();
  return INSPECTION_29_AGENDAS.find(a => a.name.toLowerCase() === t) || matchTicketToAgenda({ category: title });
}


function formatShort(ts?: string | null) {
  if (!ts) return '';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// Pilihan week sama persis dengan modul Rekap KTA/TTA & Inspeksi (periode Sabtu – Jumat)
function buildWeekOptions(year: number, currentWeek: number) {
  const options: { value: string; label: string }[] = [];
  for (let w = Math.min(53, currentWeek + 1); w >= Math.max(1, currentWeek - 8); w--) {
    const { start: s, end: e } = getRekapWeekRange(year, w);
    options.push({
      value: `W${w}`,
      label: `Week ${w} (${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} - ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]})${w === currentWeek ? ' [Aktif]' : ''}`
    });
  }
  return options;
}

// ─── Lembar PNG (warna kategori tetap seperti jadwal Excel) ─────────────────

// Warna aksen cetak per kategori (garis atas kartu & judul bagian)
const PRINT_ACCENT: Record<Category, string> = { PREP: '#548235', LAB: '#2F75B5', MAINT: '#C65911', OTHER: '#BF8F00' };

const ScheduleSheet = React.forwardRef<HTMLDivElement, {
  week: number; periodLabel: string; sourceLabel: string;
  cards: AgendaCard[]; cuti: Member[]; nonActive: { name: string; note: string }[];
  photoOf: (name: string) => string | undefined;
}>(({ week, periodLabel, sourceLabel, cards, cuti, nonActive, photoOf }, ref) => {
  const assigned = cards.filter(c => c.members.length > 0);
  const people = assigned.reduce((n, c) => n + c.members.length, 0);
  const malam = cards.filter(c => c.shift === 'Malam').length;
  const groups = CATEGORY_ORDER.map(k => ({ key: k, cards: cards.filter(c => c.category === k) })).filter(g => g.cards.length);

  const shiftPill = (shift: AgendaCard['shift']) => {
    const cfg = shift === 'Malam' ? { bg: '#3730A3', fg: '#FFFFFF', icon: <Moon className="w-3 h-3" /> }
      : shift === 'Siang' ? { bg: '#FBBF24', fg: '#451A03', icon: <Sun className="w-3 h-3" /> }
        : { bg: '#64748B', fg: '#FFFFFF', icon: <Clock className="w-3 h-3" /> };
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: cfg.bg, color: cfg.fg }}>
        {cfg.icon} {shift ? `Shift ${shift}` : 'Shift -'}
      </span>
    );
  };

  const avatar = (name: string, size: string) => {
    const photo = photoForCapture(photoOf(name));
    return (
      <div className={`relative ${size} shrink-0 rounded-full overflow-hidden bg-slate-200 text-slate-600 text-[9px] font-black flex items-center justify-center`}>
        {initials(name)}
        {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      </div>
    );
  };

  return (
    <div ref={ref} style={{ width: 1800 }} className="bg-white p-8 font-sans text-slate-900">
      {/* Kop */}
      <div className="flex items-end justify-between border-b-4 border-slate-900 pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Departemen Preparation & Laboratory · K3 Inspeksi Terencana</p>
          <h1 className="text-[30px] leading-tight font-black">Jadwal Inspeksi Mingguan Preparasi & Laboratorium</h1>
          <p className="text-sm text-slate-600 mt-1">29 agenda inspeksi K3 terencana · Periode Sabtu – Jumat · Sumber: {sourceLabel}</p>
        </div>
        <div className="text-right shrink-0 pl-6">
          <div className="inline-block px-4 py-1.5 rounded-lg text-2xl font-black" style={{ backgroundColor: '#FFE600', color: '#111827' }}>WEEK {week}</div>
          <p className="text-sm font-semibold text-slate-600 mt-1 whitespace-nowrap">Periode {periodLabel}</p>
        </div>
      </div>

      {/* Ringkasan & legenda */}
      <div className="flex flex-wrap items-center gap-2 mt-4 mb-5">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">Agenda terjadwal: {assigned.length}/{cards.length}</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Petugas: {people} orang</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}>Agenda Shift Malam: {malam}</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>Agenda Shift Siang: {cards.length - malam}</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }}>Cuti: {cuti.length}</span>
        <div className="ml-auto flex items-center gap-4">
          {CATEGORY_ORDER.map(k => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="w-4 h-4 rounded" style={{ backgroundColor: CATEGORY[k].print, border: `2px solid ${PRINT_ACCENT[k]}` }} /> {CATEGORY[k].label}
            </span>
          ))}
        </div>
      </div>

      {/* Agenda per area */}
      <div className="space-y-5">
        {groups.map(g => (
          <div key={g.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: PRINT_ACCENT[g.key] }} />
              <h2 className="text-sm font-black uppercase tracking-[0.15em]" style={{ color: PRINT_ACCENT[g.key] }}>{CATEGORY[g.key].label}</h2>
              <span className="text-xs font-semibold text-slate-400">{g.cards.length} agenda</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-5 gap-3">
              {g.cards.map(c => (
                <div key={c.key} className="flex flex-col rounded-xl overflow-hidden border border-slate-300" style={{ borderTop: `4px solid ${PRINT_ACCENT[c.category]}` }}>
                  <div className="px-3 pt-2 pb-2" style={{ backgroundColor: CATEGORY[c.category].print }}>
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-[12.5px] font-bold leading-snug">{c.title}</p>
                      {c.agenda && <span className="shrink-0 text-[10px] font-black text-slate-500">#{c.agenda.id}</span>}
                    </div>
                    <div className="mt-1.5">{shiftPill(c.shift)}</div>
                  </div>
                  <div className="flex-1 px-3 py-2 space-y-1.5 min-h-[64px]">
                    {c.members.length === 0 && <p className="text-[11px] italic text-slate-400">Belum ada petugas</p>}
                    {c.members.map(m => (
                      <div key={m.name} className="flex items-center gap-2">
                        {avatar(m.name, 'w-7 h-7')}
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-semibold leading-tight">{m.name}</p>
                          <p className="text-[10px] text-slate-500 leading-tight">{m.roleIndex === 1 ? 'Inspektor Utama' : 'Pendamping'}</p>
                        </div>
                        {m.isCompleted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>✓ Selesai</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cuti, non-aktif & catatan */}
      <div className="mt-6 grid grid-cols-[1fr_340px] gap-5 items-start">
        <div className="rounded-xl border border-slate-300 overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: '#EDE9FE' }}>
            <p className="text-sm font-black" style={{ color: '#5B21B6' }}>Daftar Karyawan Cuti untuk Pengisian KTA/TTA & Inspeksi</p>
            <span className="text-xs font-bold" style={{ color: '#5B21B6' }}>{cuti.length} orang</span>
          </div>
          {cuti.length === 0 ? (
            <p className="px-4 py-3 text-xs italic text-slate-400">Tidak ada karyawan cuti.</p>
          ) : (
            <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 px-4 py-3">
              {cuti.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2 text-[12px] min-w-0">
                  <span className="w-5 text-right text-slate-400 tabular-nums">{i + 1}</span>
                  {avatar(m.name, 'w-5 h-5')}
                  <span className="font-semibold truncate">{m.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-300 overflow-hidden">
            <p className="px-4 py-2 text-sm font-black" style={{ backgroundColor: '#FFE4E6', color: '#9F1239' }}>Resign / Dinas / Mutasi / Sakit / New Hire</p>
            <div className="px-4 py-2.5 space-y-1">
              {nonActive.length === 0
                ? <p className="text-xs italic text-slate-400">Tidak ada.</p>
                : nonActive.map((n, i) => <p key={n.name} className="text-[12px] font-semibold">{i + 1}. {n.name}{n.note ? <span className="text-slate-500 font-normal capitalize"> ({n.note})</span> : null}</p>)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-300 px-4 py-2.5">
            <p className="text-sm font-black mb-1">Catatan</p>
            <ol className="list-decimal pl-4 space-y-0.5 text-[12px] text-slate-600">
              {NOTES.map(n => <li key={n}>{n}</li>)}
            </ol>
          </div>
        </div>
      </div>

      <p className="mt-5 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between gap-6">
        <span>Agenda Shift Malam diisi karyawan roster N; Shift Siang diisi karyawan roster D / Nonshift. ✓ Selesai = laporan inspeksi sudah terkirim.</span>
        <span className="whitespace-nowrap">Diekspor dari PrepLab Portal · {new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
      </p>
    </div>
  );
});
ScheduleSheet.displayName = 'ScheduleSheet';

// ─── Kontrol Cuti (roster Senin – Rabu) ─────────────────────────────────────

type LeaveCat = 'CUTI' | 'TRV' | 'IZIN' | 'SS' | 'SL' | 'DINAS' | 'ONSITE' | 'LAINNYA' | 'KOSONG';

const LEAVE_STYLE: Record<LeaveCat, { label: string; cls: string }> = {
  CUTI: { label: 'Cuti', cls: 'bg-violet-100 text-violet-800 ring-violet-300 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-500/40' },
  TRV: { label: 'TRV', cls: 'bg-sky-100 text-sky-800 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/40' },
  IZIN: { label: 'Izin', cls: 'bg-yellow-100 text-yellow-800 ring-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-200 dark:ring-yellow-500/40' },
  SS: { label: 'SS', cls: 'bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-500/40' },
  SL: { label: 'SL', cls: 'bg-pink-100 text-pink-800 ring-pink-300 dark:bg-pink-500/20 dark:text-pink-200 dark:ring-pink-500/40' },
  DINAS: { label: 'Dinas Luar', cls: 'bg-orange-100 text-orange-800 ring-orange-300 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-500/40' },
  ONSITE: { label: 'Onsite', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/40' },
  LAINNYA: { label: 'Lainnya', cls: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-500/20 dark:text-slate-200 dark:ring-slate-500/40' },
  KOSONG: { label: '-', cls: 'bg-transparent text-[var(--text-muted)] ring-[var(--border-main)]' }
};
const LEAVE_FILTERS: LeaveCat[] = ['CUTI', 'TRV', 'IZIN', 'SS', 'SL', 'DINAS'];

interface LeaveRow {
  nik: string; name: string; jabatan: string; section: string;
  category: LeaveCat;
  days: { date: string; code: string; category: LeaveCat }[];
  leaveStart: string; leaveEnd: string; returnDate: string | null; returnCode: string | null; totalDays: number;
}

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatIsoLong(iso?: string | null) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

// Warna cetak (tetap terang) per kategori untuk ekspor PNG
const LEAVE_PRINT: Record<LeaveCat, { bg: string; fg: string }> = {
  CUTI: { bg: '#EDE9FE', fg: '#5B21B6' },
  TRV: { bg: '#E0F2FE', fg: '#075985' },
  IZIN: { bg: '#FEF9C3', fg: '#854D0E' },
  SS: { bg: '#FFE4E6', fg: '#9F1239' },
  SL: { bg: '#FCE7F3', fg: '#9D174D' },
  DINAS: { bg: '#FFEDD5', fg: '#9A3412' },
  ONSITE: { bg: '#D1FAE5', fg: '#065F46' },
  LAINNYA: { bg: '#F1F5F9', fg: '#334155' },
  KOSONG: { bg: '#FFFFFF', fg: '#94A3B8' }
};

const LeaveSheet = React.forwardRef<HTMLDivElement, {
  rows: LeaveRow[]; dates: string[]; filterLabel: string; onsiteCount: number;
  week: number; periodLabel: string;
  photoOf: (name: string) => string | undefined;
}>(({ rows, dates, filterLabel, onsiteCount, week, periodLabel, photoOf }, ref) => {
  const th = 'border border-slate-400 bg-slate-200 px-2 py-2 text-[11px] font-bold uppercase text-slate-800';
  const td = 'border border-slate-300 px-2 py-1.5 text-[12px] text-slate-900';
  const perCat = LEAVE_FILTERS.map(k => ({ k, n: rows.filter(r => r.days.some(d => d.category === k)).length }));
  return (
    <div ref={ref} style={{ width: 1400 }} className="bg-white p-8 font-sans text-slate-900">
      <div className="flex items-end justify-between border-b-4 border-slate-900 pb-3 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Departemen Preparation & Laboratory · Kontrol Kehadiran Karyawan</p>
          <h1 className="text-[26px] leading-tight font-black">Daftar Karyawan Dept. Prep & Lab yang Cuti, Izin, Dinas Luar, Resign &amp; New Hire</h1>
          <p className="text-sm text-slate-600 mt-1">
            Karyawan Gol II – V · Filter: {filterLabel} · Acuan roster Senin – Rabu ({formatIsoLong(dates[0])} – {formatIsoLong(dates[2])}) · Sumber: Database Roster Prep & Lab
          </p>
        </div>
        <div className="text-right shrink-0 pl-6">
          <p className="text-xl font-black">Week {week}</p>
          <p className="text-sm font-semibold text-slate-600 whitespace-nowrap">Periode {periodLabel}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">Tidak Onsite: {rows.length}</span>
        {perCat.filter(p => p.n > 0).map(p => (
          <span key={p.k} className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: LEAVE_PRINT[p.k].bg, color: LEAVE_PRINT[p.k].fg }}>
            {LEAVE_STYLE[p.k].label}: {p.n}
          </span>
        ))}
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: LEAVE_PRINT.ONSITE.bg, color: LEAVE_PRINT.ONSITE.fg }}>Onsite penuh Sen–Rab: {onsiteCount}</span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>No</th>
            <th className={`${th} text-left`}>Nama Karyawan</th>
            <th className={th}>NIK</th>
            <th className={`${th} text-left`}>Jabatan</th>
            <th className={th}>Awal Cuti / TRV</th>
            <th className={th}>Akhir Cuti / TRV</th>
            <th className={th}>Kembali Onsite</th>
            <th className={th}>Hari</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const photo = photoForCapture(photoOf(r.name));
            return (
              <tr key={r.nik} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                <td className={`${td} text-center`}>{i + 1}</td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 shrink-0 rounded-full overflow-hidden bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center">
                      {initials(r.name)}
                      {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                    </div>
                    <span className="font-semibold">{r.name}</span>
                  </div>
                </td>
                <td className={`${td} text-center font-mono`}>{r.nik}</td>
                <td className={td}>{r.jabatan}</td>
                <td className={`${td} text-center font-semibold whitespace-nowrap`}>{formatIsoLong(r.leaveStart)}</td>
                <td className={`${td} text-center font-semibold whitespace-nowrap`}>{formatIsoLong(r.leaveEnd)}</td>
                <td className={`${td} text-center whitespace-nowrap`}>{r.returnDate ? `${formatIsoLong(r.returnDate)} (${r.returnCode})` : 'Belum terjadwal'}</td>
                <td className={`${td} text-center font-bold`}>{r.totalDays}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-4 text-[11px] text-slate-500">
        Awal = hari pertama berturut-turut tidak onsite; Akhir = hari terakhir sebelum roster kembali ke D / N / OFF / LS.
        · Diekspor dari PrepLab Portal {new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
      </p>
    </div>
  );
});
LeaveSheet.displayName = 'LeaveSheet';

function LeaveControlPanel({ period, week, periodLabel, photoOf }: {
  period: { start: Date }; week: number; periodLabel: string; photoOf: (name: string) => string | undefined;
}) {
  // Senin, Selasa, Rabu di dalam periode Sabtu – Jumat
  const dates = useMemo(() => [2, 3, 4].map(offset => {
    const d = new Date(period.start);
    d.setDate(d.getDate() + offset);
    return isoLocal(d);
  }), [period.start]);

  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [onsiteCount, setOnsiteCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<LeaveCat | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/roster/leave-control?dates=${dates.join(',')}${refresh ? '&refresh=true' : ''}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Gagal membaca roster');
      setRows(json.data || []);
      setOnsiteCount(json.onsiteCount || 0);
    } catch (err: any) {
      setRows([]);
      setError(err.message || 'Gagal membaca roster');
    } finally {
      setLoading(false);
    }
  }, [dates]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    // Per orang: dihitung pada kategori X bila salah satu hari Senin–Rabu berkode X
    const c: Partial<Record<LeaveCat, number>> = {};
    rows.forEach(r => new Set(r.days.map(d => d.category)).forEach(cat => { c[cat] = (c[cat] || 0) + 1; }));
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (filter === 'ALL' || r.days.some(d => d.category === filter)) &&
      (!q || r.name.toLowerCase().includes(q) || r.nik.toLowerCase().includes(q) || r.jabatan.toLowerCase().includes(q))
    );
  }, [rows, filter, search]);

  const [exporting, setExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleDownloadPng = async () => {
    setExporting(true);
    const toastId = toast.loading('Menyiapkan gambar kontrol cuti...');
    try {
      await new Promise(r => setTimeout(r, 100));
      const node = captureRef.current;
      if (!node) throw new Error('Lembar belum siap');
      await Promise.all(Array.from(node.querySelectorAll('img')).map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => { img.style.display = 'none'; res(); }; })
      ));
      const dataUrl = await toPng(node, {
        pixelRatio: 2, backgroundColor: '#FFFFFF', cacheBust: true,
        imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      });
      const link = document.createElement('a');
      link.download = `Kontrol_Cuti_${dates[0]}_sd_${dates[2]}${filter === 'ALL' ? '' : `_${LEAVE_STYLE[filter].label.replace(/\s+/g, '_')}`}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Gambar kontrol cuti berhasil diunduh (PNG)', { id: toastId });
    } catch (err: any) {
      console.error('Export PNG kontrol cuti error:', err);
      toast.error('Gagal mengunduh PNG: ' + (err?.message || 'kesalahan rendering'), { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const codeChip = (code: string, cat: LeaveCat) => (
    <span className={`inline-flex min-w-[46px] justify-center px-2 py-0.5 rounded-md ring-1 ring-inset text-[11px] font-bold ${LEAVE_STYLE[cat].cls}`} title={LEAVE_STYLE[cat].label}>
      {code || '-'}
    </span>
  );

  const th = 'px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-[var(--border-main)] whitespace-nowrap';
  const td = 'px-3 py-2 border-b border-[var(--border-main)] text-[13px] align-middle';

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-3 lg:mr-auto">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[var(--text-main)] leading-tight">Kontrol Cuti Karyawan</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Gol II – V · Roster Senin – Rabu ({formatIsoLong(dates[0])} – {formatIsoLong(dates[2])}) · sumber: Database Roster Prep & Lab
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama / NIK / jabatan..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="h-9 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="Ambil ulang dari Google Sheet roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
          </button>
          <button
            onClick={handleDownloadPng}
            disabled={loading || exporting || visible.length === 0}
            className="h-9 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60 whitespace-nowrap"
            title="Download daftar cuti (sesuai filter & pencarian) sebagai PNG"
          >
            {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />} PNG
          </button>
        </div>
      </div>

      {/* Lembar tersembunyi untuk ekspor PNG */}
      {exporting && (
        <div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
          <LeaveSheet ref={captureRef} rows={visible} dates={dates} filterLabel={filter === 'ALL' ? 'Semua Tidak Onsite' : LEAVE_STYLE[filter].label} onsiteCount={onsiteCount} week={week} periodLabel={periodLabel} photoOf={photoOf} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-[var(--border-main)] bg-[var(--input-bg)]/50">
        <button
          onClick={() => setFilter('ALL')}
          className={`h-7 px-3 rounded-full text-xs font-semibold cursor-pointer ${filter === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'}`}
        >
          Tidak Onsite <span className="opacity-70">{rows.length}</span>
        </button>
        {LEAVE_FILTERS.map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`h-7 px-3 rounded-full text-xs font-semibold ring-1 ring-inset cursor-pointer transition-opacity ${LEAVE_STYLE[k].cls} ${filter === k ? 'ring-2 shadow-sm' : 'opacity-80 hover:opacity-100'}`}
          >
            {LEAVE_STYLE[k].label} <span className="opacity-70">{counts[k] || 0}</span>
          </button>
        ))}
        <span className={`ml-auto inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold ring-1 ring-inset ${LEAVE_STYLE.ONSITE.cls}`}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Onsite penuh Sen–Rab: {onsiteCount}
        </span>
      </div>

      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[var(--text-main)]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${th} w-10 text-center`}>No</th>
              <th className={`${th} text-left`}>Nama / NIK</th>
              <th className={`${th} text-left`}>Jabatan</th>
              <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Awal Cuti / TRV</th>
              <th className={`${th} text-center`}>Akhir Cuti / TRV</th>
              <th className={`${th} text-center`}>Kembali Onsite</th>
              <th className={`${th} text-center`}>Hari</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Membaca roster dari Google Sheet...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-rose-600 dark:text-rose-400"><AlertCircle className="w-4 h-4 inline mr-1.5" />{error}</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]">Tidak ada karyawan yang cocok.</td></tr>
            ) : visible.map((r, i) => (
              <tr key={r.nik} className="hover:bg-[var(--input-bg)]/70 transition-colors">
                <td className={`${td} text-center text-[var(--text-muted)] tabular-nums`}>{i + 1}</td>
                <td className={td}>
                  <div className="flex items-center gap-2.5 min-w-[200px]">
                    <EmployeeAvatar name={r.name} photo={photoOf(r.name)} className="w-8 h-8 text-[10px]" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight truncate">{r.name}</p>
                      <p className="text-[11px] font-mono text-[var(--text-muted)]">{r.nik}</p>
                    </div>
                  </div>
                </td>
                <td className={`${td} text-[var(--text-muted)] min-w-[170px]`}>{r.jabatan}</td>
                <td className={`${td} text-center whitespace-nowrap font-semibold border-l border-l-[var(--border-main)]`}>{formatIsoLong(r.leaveStart)}</td>
                <td className={`${td} text-center whitespace-nowrap font-semibold`}>{formatIsoLong(r.leaveEnd)}</td>
                <td className={`${td} text-center whitespace-nowrap`}>
                  {r.returnDate ? (
                    <span className="inline-flex items-center gap-1.5">
                      {formatIsoLong(r.returnDate)} {r.returnCode && codeChip(r.returnCode, 'ONSITE')}
                    </span>
                  ) : <span className="text-[var(--text-muted)] italic">Belum terjadwal</span>}
                </td>
                <td className={`${td} text-center tabular-nums font-bold`}>{r.totalDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2.5 border-t border-[var(--border-main)] text-[11px] text-[var(--text-muted)]">
        Awal = hari pertama berturut-turut tidak onsite (TRV/C/CT/CE/I/dll.); Akhir = hari terakhir sebelum roster kembali ke D / N / OFF / LS.
      </p>
    </section>
  );
}

// ─── Edit manual petugas (per karyawan / per agenda) ────────────────────────

type EditTarget = { kind: 'member'; key: string } | { kind: 'agenda'; agendaId: number };

function PlanEditModal({ target, members, agendaShifts, history, photoOf, onClose, onApply }: {
  target: EditTarget; members: PlanMember[]; agendaShifts: Record<string, ShiftGroup>; history: PlanHistory;
  photoOf: (name: string) => string | undefined;
  onClose: () => void;
  onApply: (key: string, agendaId: number | null, role: 'utama' | 'pendamping') => Promise<boolean>;
}) {
  const fixedMember = target.kind === 'member' ? members.find(m => planKey(m) === target.key) || null : null;
  const [personKey, setPersonKey] = useState(fixedMember ? planKey(fixedMember) : '');
  const [agendaId, setAgendaId] = useState<number | null>(target.kind === 'agenda' ? target.agendaId : fixedMember?.agendaId ?? null);
  const [role, setRole] = useState<'utama' | 'pendamping'>(fixedMember?.roleIndex === 1 ? 'utama' : 'pendamping');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const person = members.find(m => planKey(m) === personKey) || null;
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter(m => !m.isCuti && (!q || m.name.toLowerCase().includes(q) || m.jabatan.toLowerCase().includes(q)))
      .sort((a, b) => Number(!!a.agendaId) - Number(!!b.agendaId) || a.name.localeCompare(b.name));
  }, [members, query]);

  const error = person && agendaId ? ruleError(person, agendaId) : null;
  const warnings = person && agendaId
    ? memberWarnings(history, agendaId, person, person, agendaShifts[agendaId] || null).filter(w => w.level === 'warn')
    : [];

  const submit = async () => {
    if (!person) return;
    setSaving(true);
    try {
      if (await onApply(planKey(person), agendaId, role)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-main)]">
          <Pencil className="w-4 h-4 text-[var(--primary)]" />
          <h3 className="flex-1 text-sm font-black text-[var(--text-main)]">
            {target.kind === 'member' ? 'Edit Jadwal Karyawan' : `Tambah Petugas · ${agendaShortName(target.agendaId)}`}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--input-bg)] flex items-center justify-center cursor-pointer text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {target.kind === 'agenda' && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Pilih karyawan</p>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cari nama / jabatan..."
                className="w-full h-9 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border-main)] divide-y divide-[var(--border-main)]">
                {candidates.map(m => {
                  const k = planKey(m);
                  const blocked = ruleError(m, target.agendaId);
                  return (
                    <button
                      key={k}
                      disabled={!!blocked}
                      onClick={() => { setPersonKey(k); setRole('pendamping'); }}
                      title={blocked || undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${personKey === k ? 'bg-[var(--primary)]/10' : 'hover:bg-[var(--input-bg)]'}`}
                    >
                      <EmployeeAvatar name={m.name} photo={photoOf(m.name)} className="w-7 h-7 text-[9px]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[var(--text-main)] truncate">{m.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          Gol {m.gol || '-'} · {m.section || '-'} · {shiftLabelOf(m)} · {m.agendaId ? agendaShortName(m.agendaId) : 'Belum dijadwalkan'}
                        </p>
                      </div>
                      {blocked && <span className="text-[10px] font-bold text-rose-500 shrink-0">Dilarang</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {person && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--input-bg)]">
              <EmployeeAvatar name={person.name} photo={photoOf(person.name)} className="w-10 h-10 text-[11px]" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-main)] truncate">{person.name}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{person.jabatan}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Gol {person.gol || '-'} · {person.section || '-'} · {shiftLabelOf(person)}{person.codes?.length ? ` · Roster Sen–Rab: ${person.codes.join(' / ')}` : ''}
                </p>
              </div>
            </div>
          )}

          {target.kind === 'member' && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Agenda inspeksi</p>
              <Select value={agendaId ? String(agendaId) : ''} onChange={e => setAgendaId(e.target.value ? parseInt(e.target.value, 10) : null)}>
                <option value="">— Tidak dijadwalkan —</option>
                {(['Siang', 'Malam'] as ShiftGroup[]).map(g => (
                  <optgroup key={g} label={`Shift ${g}${g === 'Siang' ? ' + Nonshift' : ''}`}>
                    {INSPECTION_29_AGENDAS.filter(a => (agendaShifts[a.id] || 'Siang') === g).map(a => {
                      const blocked = person ? ruleError(person, a.id) : null;
                      return <option key={a.id} value={a.id} disabled={!!blocked}>#{a.id} {a.name}{blocked ? ' (dilarang)' : ''}</option>;
                    })}
                  </optgroup>
                ))}
              </Select>
            </div>
          )}

          {agendaId && person && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Peran</p>
              <div className="flex gap-2">
                {(['utama', 'pendamping'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 h-9 rounded-xl text-xs font-bold border cursor-pointer ${role === r ? 'bg-[var(--primary)] text-white border-transparent' : 'border-[var(--border-main)] text-[var(--text-main)] bg-[var(--input-bg)]'}`}
                  >
                    {r === 'utama' ? 'Inspektor Utama' : 'Pendamping'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</p>
          )}
          {warnings.map(w => (
            <p key={w.text} className="flex items-start gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400"><AlertTriangle className="w-4 h-4 shrink-0" /> {w.text}</p>
          ))}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[var(--border-main)]">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--border-main)] text-[var(--text-main)] text-sm font-bold cursor-pointer">Batal</button>
          <button
            onClick={submit}
            disabled={!person || !!error || saving}
            className="flex-1 h-10 rounded-xl bg-[var(--primary)] text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rekap jadwal per karyawan (tampilan seperti roster per week) ───────────

interface RekapRow {
  nik: string; name: string; jabatan: string; section: string; gol: string; team: string;
  cells: Record<string, { agendaId: number | null; roleIndex: number; isCuti: boolean; shiftGroup: string | null }>;
}

function ScheduleRekapPanel({ year, currentWeek, photoOf }: { year: number; currentWeek: number; photoOf: (name: string) => string | undefined }) {
  const [from, setFrom] = useState(Math.max(1, currentWeek - 7));
  const [to, setTo] = useState(Math.min(53, currentWeek + 1));
  const [weeks, setWeeks] = useState<{ week: number; start: string; end: string; hasPlan: boolean }[]>([]);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inspection-plan/rekap?year=${year}&from=${from}&to=${to}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Gagal memuat rekap');
      setWeeks(json.weeks || []);
      setRows(json.rows || []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat rekap jadwal');
    } finally {
      setLoading(false);
    }
  }, [year, from, to]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter(r => r.name.toLowerCase().includes(q) || r.jabatan.toLowerCase().includes(q) || r.section.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const weekLabel = (w: { start: string; end: string }) => {
    const [, sm, sd] = w.start.split('-').map(Number);
    const [, em, ed] = w.end.split('-').map(Number);
    return sm === em ? `${sd}–${ed} ${MONTHS_SHORT[em - 1]}` : `${sd} ${MONTHS_SHORT[sm - 1]}–${ed} ${MONTHS_SHORT[em - 1]}`;
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = visible.map((r, i) => {
      const row: Record<string, string | number> = { No: i + 1, Nama: r.name, NIK: r.nik, Jabatan: r.jabatan, Section: r.section, Gol: r.gol };
      weeks.forEach(w => {
        const c = r.cells[w.week];
        row[`Week ${w.week} (${weekLabel(w)})`] = !c ? '' : c.isCuti ? 'Cuti' : c.agendaId ? `${agendaShortName(c.agendaId)}${c.roleIndex > 1 ? ' (Pendamping)' : ''}` : '-';
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Jadwal Inspeksi');
    XLSX.writeFile(wb, `Rekap_Jadwal_Inspeksi_W${from}-W${to}_${year}.xlsx`);
  };

  const weekOpts = Array.from({ length: 53 }, (_, i) => i + 1);
  const th = 'px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-[var(--border-main)] whitespace-nowrap';

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-3 lg:mr-auto">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center"><Table2 className="w-5 h-5" /></div>
          <div>
            <h3 className="text-base font-black text-[var(--text-main)] leading-tight">Rekap Jadwal Inspeksi per Karyawan</h3>
            <p className="text-xs text-[var(--text-muted)]">Agenda tiap karyawan per week (periode Sabtu – Jumat) · sumber: jadwal portal</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
            <CalendarDays className="w-4 h-4" /> Week
            <select value={from} onChange={e => { const v = parseInt(e.target.value, 10); setFrom(v); if (v > to) setTo(v); }} className="h-9 px-2 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-sm">
              {weekOpts.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            s/d
            <select value={to} onChange={e => { const v = parseInt(e.target.value, 10); setTo(v); if (v < from) setFrom(v); }} className="h-9 px-2 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-sm">
              {weekOpts.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..." className="w-full h-9 pl-9 pr-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <button onClick={load} disabled={loading} className="h-9 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
          </button>
          <button onClick={exportExcel} disabled={!visible.length} className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[75vh]">
        <table className="min-w-full border-separate border-spacing-0 text-[var(--text-main)]">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className={`${th} w-10 text-center`}>No</th>
              <th className={`${th} text-left sticky left-0 z-30 min-w-[230px]`}>Karyawan</th>
              {weeks.map(w => (
                <th key={w.week} className={`${th} text-center border-l border-l-[var(--border-main)] min-w-[150px] ${w.week === currentWeek ? 'bg-yellow-100 dark:bg-yellow-500/20' : ''}`}>
                  Week {w.week}
                  <span className="block font-medium normal-case tracking-normal text-[10px] opacity-70">{weekLabel(w)}{!w.hasPlan ? ' · belum ada' : ''}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={weeks.length + 2} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Memuat rekap...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={weeks.length + 2} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]">Belum ada jadwal portal pada rentang week ini. Gunakan tombol Acak / Edit di tab Jadwal Mingguan.</td></tr>
            ) : visible.map((r, i) => (
              <tr key={r.nik || r.name} className="hover:bg-[var(--input-bg)]/70">
                <td className="px-2 py-1.5 border-b border-[var(--border-main)] text-center text-[11px] text-[var(--text-muted)] tabular-nums">{i + 1}</td>
                <td className="px-2 py-1.5 border-b border-[var(--border-main)] sticky left-0 z-10 bg-[var(--card-bg)]">
                  <div className="flex items-center gap-2">
                    <EmployeeAvatar name={r.name} photo={photoOf(r.name)} className="w-7 h-7 text-[9px]" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold leading-tight truncate max-w-[180px]">{r.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">Gol {r.gol || '-'} · {r.jabatan}</p>
                    </div>
                  </div>
                </td>
                {weeks.map((w, wi) => {
                  const c = r.cells[w.week];
                  const prev = [weeks[wi - 1], weeks[wi - 2]].filter(Boolean).some(pw => c?.agendaId && r.cells[pw.week]?.agendaId === c.agendaId);
                  const cat = c?.agendaId ? CATEGORY[AGENDA_CATEGORY[c.agendaId] || 'OTHER'] : null;
                  return (
                    <td key={w.week} className="px-1.5 py-1.5 border-b border-l border-[var(--border-main)] text-center align-middle">
                      {!c ? (
                        <span className="text-[11px] text-[var(--text-muted)]">{w.hasPlan ? '-' : ''}</span>
                      ) : c.isCuti ? (
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ring-1 ring-inset ${LEAVE_STYLE.CUTI.cls}`}>Cuti</span>
                      ) : c.agendaId && cat ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold leading-tight ${cat.head} ${prev ? 'ring-2 ring-amber-400' : ''}`}
                          title={`${agendaShortName(c.agendaId)} · ${c.roleIndex === 1 ? 'Utama' : 'Pendamping'} · Shift ${c.shiftGroup || '-'}${prev ? ' · berulang dari week sebelumnya' : ''}`}
                        >
                          {c.shiftGroup === 'Malam' ? <Moon className="w-3 h-3 shrink-0" /> : <Sun className="w-3 h-3 shrink-0" />}
                          <span className="text-left">{agendaShortName(c.agendaId)}{c.roleIndex > 1 ? <span className="opacity-60"> · P</span> : null}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2.5 border-t border-[var(--border-main)] text-[11px] text-[var(--text-muted)] flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1"><Sun className="w-3 h-3" /> Shift Siang / Nonshift</span>
        <span className="inline-flex items-center gap-1"><Moon className="w-3 h-3" /> Shift Malam</span>
        <span>· P = Pendamping</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded ring-2 ring-amber-400" /> Inspeksi sama dengan 1–2 week sebelumnya</span>
      </p>
    </section>
  );
}

// ─── Tampilan karyawan perseorangan (hanya jadwal milik sendiri) ────────────

function PersonalSchedulePanel({ state, week, name, photoOf }: {
  state: { loading: boolean; available: boolean; isPublished: boolean; data: any | null; error?: string };
  week: number; name: string; photoOf: (name: string) => string | undefined;
}) {
  const box = 'bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-sm';
  if (state.loading) {
    return <div className={`${box} py-16 text-center text-sm text-[var(--text-muted)]`}><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Memuat jadwal Anda...</div>;
  }
  const empty = (title: string, desc: string, icon: React.ReactNode) => (
    <div className={`${box} py-14 px-4 text-center`}>
      <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--input-bg)] text-[var(--text-muted)] flex items-center justify-center">{icon}</div>
      <p className="mt-3 text-sm font-bold text-[var(--text-main)]">{title}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">{desc}</p>
    </div>
  );
  if (state.error) {
    return empty('Gagal memuat jadwal inspeksi', `${state.error}. Tekan Segarkan untuk mencoba lagi.`, <AlertCircle className="w-6 h-6 text-rose-500" />);
  }
  if (!state.available) {
    return empty(`Jadwal Week ${week} belum dipublikasikan`, 'Jadwal inspeksi minggu ini belum dipublikasikan oleh Administration. Silakan cek kembali nanti — Anda akan menerima notifikasi saat jadwal terbit.', <CalendarRange className="w-6 h-6" />);
  }
  const s = state.data;
  if (!s) {
    return empty('Anda tidak dijadwalkan inspeksi minggu ini', `Tidak ditemukan jadwal inspeksi atas nama ${name || 'Anda'} pada Week ${week}.`, <UserCheck className="w-6 h-6" />);
  }
  if (s.isCuti) {
    return empty('Anda tercatat cuti pada periode ini', 'Karyawan yang cuti tidak dijadwalkan inspeksi dan dikecualikan dari target KTA/TTA & Inspeksi minggu ini.', <Palmtree className="w-6 h-6" />);
  }
  const agenda = findAgenda(s.inspeksi || '');
  const cat = CATEGORY[agenda ? AGENDA_CATEGORY[agenda.id] || 'OTHER' : 'OTHER'];
  const shift = shiftGroup(s.shift || '');
  const partners: any[] = s.partners || [];
  return (
    <div className={`${box} overflow-hidden border-t-4 ${cat.accent}`}>
      <div className={`px-5 py-4 ${cat.head}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Jadwal Inspeksi Saya · Week {week}</p>
        <h3 className="text-lg font-black leading-snug mt-1">{s.inspeksi}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${shift === 'Malam' ? 'bg-indigo-600 text-white' : shift === 'Siang' ? 'bg-amber-400 text-amber-950' : 'bg-slate-500 text-white'}`}>
            {shift === 'Malam' ? <Moon className="w-3 h-3" /> : shift === 'Siang' ? <Sun className="w-3 h-3" /> : <Clock className="w-3 h-3" />} Shift {shift}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/70 dark:bg-black/20 text-[10px] font-bold uppercase">{s.roleIndex === 1 ? 'Inspektor Utama' : 'Pendamping'}</span>
          {s.isCompleted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase"><CheckCircle2 className="w-3 h-3" /> Selesai {formatShort(s.completedAt)}</span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/70 dark:bg-black/20 text-[10px] font-bold uppercase"><CircleDashed className="w-3 h-3" /> Belum dikirim</span>
          )}
          {!state.isPublished && <span className="px-2.5 py-0.5 rounded-full bg-white/70 dark:bg-black/20 text-[10px] font-bold uppercase">Sumber: Google Sheet</span>}
        </div>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Tim Inspeksi</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <EmployeeAvatar name={s.name} photo={photoOf(s.name)} className="w-9 h-9 text-[10px]" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[var(--text-main)] truncate">{s.name} <span className="text-[10px] font-semibold text-[var(--primary)]">(Anda)</span></p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{s.roleIndex === 1 ? 'Inspektor Utama' : 'Pendamping'}{s.jabatan ? ` · ${s.jabatan}` : ''}</p>
              </div>
            </div>
            {partners.map(p => (
              <div key={p.name} className="flex items-center gap-2.5">
                <EmployeeAvatar name={p.name} photo={photoOf(p.name)} className="w-9 h-9 text-[10px]" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-main)] truncate">{p.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{p.roleIndex === 1 ? 'Inspektor Utama' : 'Pendamping'}{p.jabatan ? ` · ${p.jabatan}` : ''}</p>
                </div>
              </div>
            ))}
            {partners.length === 0 && <p className="text-xs italic text-[var(--text-muted)]">Tidak ada pendamping — inspeksi dilakukan sendiri.</p>}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Catatan</p>
          <ol className="space-y-1.5 text-[13px] text-[var(--text-muted)] list-decimal pl-4">
            {NOTES.map(n => <li key={n}>{n}</li>)}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ─── Layar utama ────────────────────────────────────────────────────────────

export function InspectionScheduleScreen({ inspectorNik, inspectorName, onBack }: InspectionScheduleScreenProps) {
  const today = useMemo(() => new Date(), []);
  const { week: currentWeek, year: currentYear } = useMemo(() => getRekapWeek(today), [today]);
  // Week & periode mengikuti modul Rekap KTA/TTA (Sabtu – Jumat). Google Sheet jadwal hanya menyimpan
  // jadwal minggu berjalan (sheet "CurrentWeek"), jadi kartu agenda hanya tersedia untuk week aktif;
  // Kontrol Cuti (roster) tersedia untuk semua week.
  const weekOptions = useMemo(() => buildWeekOptions(currentYear, currentWeek), [currentYear, currentWeek]);
  const minWeek = Math.max(1, currentWeek - 8);
  const maxWeek = Math.min(53, currentWeek + 1);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const isActiveWeek = selectedWeek === currentWeek;
  const [schedule, setSchedule] = useState<any[]>([]);
  const [agendaShifts, setAgendaShifts] = useState<{ no: number; agenda: string; shift: string }[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<Category | 'ALL'>('ALL');
  const [photoByName, setPhotoByName] = useState<Map<string, string>>(new Map());
  const [exportingPng, setExportingPng] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'jadwal' | 'rekap'>('jadwal');
  const [fullscreen, setFullscreen] = useState(false);
  const [plan, setPlan] = useState<InspectionPlan | null>(null);
  const [history, setHistory] = useState<PlanHistory>({});
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState('');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [cutiConflicts, setCutiConflicts] = useState<string[]>([]);
  const [publishState, setPublishState] = useState({ isPublished: false, hasUnpublishedChanges: false });
  // Tampilan karyawan perseorangan (bukan Administration / Developer / Manager)
  const [personal, setPersonal] = useState<{ loading: boolean; available: boolean; isPublished: boolean; data: any | null; error?: string }>({ loading: true, available: false, isPublished: false, data: null });
  // Pesan bila jadwal portal gagal dimuat (database bermasalah) → mode cadangan Google Sheet
  const [degraded, setDegraded] = useState('');
  const canEditRef = useRef(false);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const period = useMemo(() => getRekapWeekRange(currentYear, selectedWeek), [currentYear, selectedWeek]);
  // Label periode sama dengan modul Rekap KTA/TTA, mis. "17 - 23 Oktober 2026"
  const rangeLabel = useMemo(() => {
    const s = period.start, e = period.end;
    const startPart = s.getMonth() === e.getMonth() ? `${s.getDate()}` : `${s.getDate()} ${MONTHS_FULL[s.getMonth()]}`;
    return `${startPart} - ${e.getDate()} ${MONTHS_FULL[e.getMonth()]} ${e.getFullYear()}`;
  }, [period]);

  // Foto karyawan dari modul Database Karyawan (jadwal hanya memuat nama)
  useEffect(() => {
    fetch('/api/employees?includeInactive=1&all=true')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const list: any[] = data?.status === 'success' ? (data.data || []) : (Array.isArray(data) ? data : []);
        const map = new Map<string, string>();
        list.forEach(emp => {
          const name = (emp.name || '').toString().trim().toLowerCase();
          if (name && emp.photo) map.set(name, emp.photo);
        });
        setPhotoByName(map);
      })
      .catch(err => console.error('Gagal memuat foto karyawan:', err));
  }, []);

  const photoOf = useCallback((name: string) => photoByName.get(name.trim().toLowerCase()), [photoByName]);

  const fetchSchedule = useCallback(async (week: number, refresh = false) => {
    setLoading(true);
    setLoadError('');
    try {
      // Status selesai dihitung server per minggu ISO; gunakan minggu ISO Senin–Jumat dari periode Sabtu–Jumat.
      // Bila ada jadwal portal untuk minggu tsb, server mengembalikannya sebagai pengganti sheet "CurrentWeek".
      const periodEnd = getRekapWeekRange(currentYear, week).end;
      const isoTag = `W${getISOWeek(periodEnd)}`;
      const res = await fetch(`/api/inspection-schedule?sheet=CurrentWeek&week=${isoTag}&year=${getISOWeekYear(periodEnd)}${refresh ? '&refresh=true' : ''}`);
      const json = res.ok ? await res.json() : null;
      const data: any[] = json?.data || [];
      setSchedule(data);
      setAgendaShifts(json?.agendaShifts || []);
      setSheetName(data.length ? (json?.source === 'portal' ? 'Portal' : 'CurrentWeek') : '');
      if (!data.length) setLoadError(json?.error ? 'Gagal membaca jadwal dari Google Sheet.' : 'Jadwal minggu ini belum tersedia di Google Sheet.');
    } catch (err: any) {
      console.error('Gagal memuat jadwal inspeksi:', err);
      setSchedule([]);
      setLoadError('Gagal memuat jadwal inspeksi dari server.');
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  const loadWeek = useCallback(async (week: number, refresh = false) => {
    let found: InspectionPlan | null = null;
    let editor = false;
    let published = false;
    let failure = '';
    try {
      const res = await fetch(`/api/inspection-plan?year=${currentYear}&week=${week}`);
      const json = await res.json().catch(() => null);
      if (json?.success) {
        found = json.plan || null;
        editor = !!json.canEdit;
        published = !!json.isPublished;
        setHistory(json.history || {});
        setCutiConflicts(json.cutiConflicts || []);
        setPublishState({ isPublished: published, hasUnpublishedChanges: !!json.hasUnpublishedChanges });
      } else {
        failure = json?.message || `Server membalas ${res.status}`;
      }
    } catch (err: any) {
      failure = err?.message || 'Koneksi ke server terputus';
    }
    // Gagal memuat jadwal portal (mis. database penuh/offline): tetap tampilkan jadwal Google Sheet week aktif
    // (hanya-baca) dengan banner peringatan; hak akses terakhir dipertahankan, tidak diturunkan diam-diam
    if (failure) {
      console.error('Gagal memuat jadwal portal:', failure);
      editor = canEditRef.current;
      setPublishState({ isPublished: false, hasUnpublishedChanges: false });
      setCutiConflicts([]);
    }
    setDegraded(failure);
    canEditRef.current = editor;
    setCanEdit(editor);
    setPlan(found);

    // Karyawan biasa: hanya jadwal dirinya (versi terpublikasi, atau Google Sheet untuk week aktif)
    if (!editor) {
      setSchedule([]);
      setPersonal({ loading: true, available: published || week === currentWeek, isPublished: published, data: null });
      if (!published && week !== currentWeek) {
        setPersonal({ loading: false, available: false, isPublished: false, data: null });
        return;
      }
      try {
        const periodEnd = getRekapWeekRange(currentYear, week).end;
        const res = await fetch(`/api/inspection-schedule?sheet=CurrentWeek&week=W${getISOWeek(periodEnd)}&year=${getISOWeekYear(periodEnd)}&nik=${encodeURIComponent(inspectorNik || '')}&name=${encodeURIComponent(inspectorName || '')}${refresh ? '&refresh=true' : ''}`);
        const json = await res.json().catch(() => null);
        if (!json || (json.success === false && json.error)) {
          // Server gagal (bukan "tidak dijadwalkan") → tampilkan error yang jelas
          const raw = String(json?.error || `Server membalas ${res.status}`);
          const msg = /connection slots|too many clients/i.test(raw) ? 'Database sedang penuh (batas koneksi server tercapai)'
            : /Failed query/i.test(raw) ? 'Database sedang bermasalah' : raw;
          setPersonal({ loading: false, available: true, isPublished: published, data: null, error: msg });
        } else {
          setPersonal({ loading: false, available: true, isPublished: published, data: json.found ? json.schedule : null });
        }
      } catch {
        setPersonal({ loading: false, available: true, isPublished: published, data: null });
      }
      return;
    }

    if (found || week === currentWeek) {
      await fetchSchedule(week, refresh);
    } else {
      setSchedule([]);
      setAgendaShifts([]);
      setSheetName('');
      setLoadError(`Jadwal agenda Week ${week} belum tersedia — Google Sheet jadwal hanya menyimpan jadwal week aktif (Week ${currentWeek}).`);
    }
  }, [currentYear, currentWeek, inspectorNik, inspectorName, fetchSchedule]);

  useEffect(() => { loadWeek(selectedWeek); }, [selectedWeek, loadWeek]);

  const planRequest = async (label: string, url: string, init: RequestInit, successMsg: string) => {
    setBusy(label);
    const toastId = toast.loading(`${label}...`);
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || `${label} gagal`);
      toast.success(successMsg, { id: toastId });
      await loadWeek(selectedWeek);
      return true;
    } catch (err: any) {
      toast.error(err.message || `${label} gagal`, { id: toastId });
      return false;
    } finally {
      setBusy('');
    }
  };

  const handleRandomize = (scope: 'ALL' | ShiftGroup) => {
    const label = scope === 'ALL' ? 'semua shift' : scope === 'Malam' ? 'Shift Malam' : 'Shift Siang + Nonshift';
    if (plan && !window.confirm(`Acak ulang petugas ${label} untuk Week ${selectedWeek}? Penempatan ${label} saat ini akan diganti.`)) return;
    planRequest('Mengacak jadwal', '/api/inspection-plan/randomize', {
      method: 'POST', body: JSON.stringify({ year: currentYear, week: selectedWeek, scope })
    }, `Jadwal ${label} berhasil diacak dari Database Roster`);
  };

  const handleCopyFromSheet = () => planRequest('Menyalin jadwal Google Sheet', '/api/inspection-plan/from-sheet', {
    method: 'POST', body: JSON.stringify({ year: currentYear, week: selectedWeek })
  }, 'Jadwal Google Sheet disalin ke portal — sekarang bisa diedit');

  // Publikasikan draft (seperti "Simpan & Publikasikan" di P5M Schedule Builder)
  const handlePublish = () => {
    const errors = warningList.filter(w => w.level === 'error').length;
    const first = !publishState.isPublished;
    const msg = first
      ? `Publikasikan jadwal inspeksi Week ${selectedWeek}? Jadwal akan terlihat oleh karyawan dan notifikasi dikirim ke setiap petugas.`
      : `Publikasikan perubahan jadwal Week ${selectedWeek}? Notifikasi pembaruan hanya dikirim ke karyawan yang penempatannya berubah.`;
    if (!window.confirm(errors ? `${msg}\n\nPerhatian: masih ada ${errors} pelanggaran aturan (merah) di jadwal.` : msg)) return;
    planRequest(first ? 'Mempublikasikan jadwal' : 'Mempublikasikan perubahan', '/api/inspection-plan/publish', {
      method: 'POST', body: JSON.stringify({ year: currentYear, week: selectedWeek })
    }, first ? 'Jadwal inspeksi dipublikasikan & notifikasi terkirim ke petugas' : 'Perubahan jadwal dipublikasikan & dikirim ke karyawan terkait');
  };

  const handleDeletePlan = () => {
    if (!window.confirm(`Hapus jadwal portal Week ${selectedWeek} (draft & versi terpublikasi)? Karyawan kembali melihat jadwal Google Sheet.`)) return;
    planRequest('Menghapus jadwal portal', `/api/inspection-plan?year=${currentYear}&week=${selectedWeek}`, { method: 'DELETE' }, 'Jadwal portal dihapus');
  };

  const applyEdit = async (key: string, agendaId: number | null, role: 'utama' | 'pendamping') => {
    if (!plan) return false;
    const members = plan.members.map(m => ({ ...m }));
    const target = members.find(m => planKey(m) === key);
    if (!target) return false;
    const err = agendaId ? ruleError(target, agendaId) : null;
    if (err) { toast.error(err); return false; }
    target.agendaId = agendaId;
    // Server menomori ulang peran per agenda berdasarkan urutan roleIndex
    target.roleIndex = role === 'utama' ? 0 : 999;
    return planRequest('Menyimpan jadwal', '/api/inspection-plan', {
      method: 'PUT', body: JSON.stringify({ year: currentYear, week: selectedWeek, members })
    }, `Jadwal ${target.name} diperbarui`);
  };

  // Keluarkan petugas yang menurut roster cuti pada periode ini → masuk daftar cuti
  const handleRemoveCuti = () => {
    if (!plan || !cutiConflicts.length) return;
    const conflict = new Set(cutiConflicts);
    const members = plan.members.map(m => conflict.has(planKey(m)) ? { ...m, isCuti: true, agendaId: null, roleIndex: 1, shiftGroup: null } : m);
    planRequest('Mengeluarkan karyawan cuti', '/api/inspection-plan', {
      method: 'PUT', body: JSON.stringify({ year: currentYear, week: selectedWeek, members })
    }, `${conflict.size} karyawan cuti dikeluarkan dari jadwal`);
  };

  const requestEdit = (t: EditTarget) => {
    if (plan) { setEditTarget(t); return; }
    if (window.confirm('Jadwal minggu ini masih dari Google Sheet. Salin ke portal agar bisa diedit per karyawan?')) handleCopyFromSheet();
  };

  // Susun 29 kartu agenda + agenda tambahan yang tidak dikenali
  const { cards, cuti, nonActive, unassigned } = useMemo(() => {
    const byAgenda = new Map<number, Member[]>();
    const extra = new Map<string, Member[]>();
    const cutiList: Member[] = [];
    const nonActiveList: { name: string; note: string }[] = [];
    const unassignedList: Member[] = [];
    const planShifts = plan?.agendaShifts || null;

    if (plan) {
      // Jadwal portal: data lengkap dari roster; status selesai dari /api/inspection-schedule
      const done = new Map(schedule.map((s: any) => [`${(s.name || '').trim().toLowerCase()}|${(s.inspeksi || '').trim().toLowerCase()}`, s]));
      plan.members.forEach((pm, i) => {
        const inspeksi = pm.agendaId ? INSPECTION_29_AGENDAS.find(a => a.id === pm.agendaId)?.name || '' : '';
        const s: any = done.get(`${pm.name.trim().toLowerCase()}|${inspeksi.toLowerCase()}`);
        const member: Member = {
          no: i + 1, name: pm.name, jabatan: pm.jabatan, shift: shiftLabelOf(pm), roleIndex: pm.roleIndex,
          isCompleted: !!s?.isCompleted, completedAt: s?.completedAt, key: planKey(pm), plan: pm,
          warnings: [
            ...(pm.agendaId && !pm.isCuti && cutiConflicts.includes(planKey(pm)) ? [{ level: 'error' as const, text: 'Cuti pada periode ini (Database Roster) — tidak boleh dijadwalkan' }] : []),
            ...memberWarnings(history, pm.agendaId, pm, pm, pm.agendaId ? planShifts?.[pm.agendaId] : null)
          ]
        };
        if (pm.isCuti) cutiList.push(member);
        else if (pm.agendaId) byAgenda.set(pm.agendaId, [...(byAgenda.get(pm.agendaId) || []), member]);
        else unassignedList.push(member);
      });
    } else schedule.forEach((s: any) => {
      const member: Member = {
        no: s.no, name: s.name, jabatan: s.jabatan || '', shift: s.shift || '',
        roleIndex: s.roleIndex || 1, isCompleted: !!s.isCompleted, completedAt: s.completedAt
      };
      const text = (s.inspeksi || '').trim();
      if (s.isCuti) { cutiList.push(member); return; }
      if (NON_ACTIVE_PATTERN.test(text) || NON_ACTIVE_PATTERN.test(s.jabatan || '')) {
        nonActiveList.push({ name: s.name, note: text.match(NON_ACTIVE_PATTERN)?.[0] || '' });
        return;
      }
      if (!text) return;
      const agenda = findAgenda(text);
      if (agenda) {
        member.warnings = memberWarnings(history, agenda.id, { name: s.name });
        byAgenda.set(agenda.id, [...(byAgenda.get(agenda.id) || []), member]);
      } else {
        extra.set(text, [...(extra.get(text) || []), member]);
      }
    });

    // Shift per agenda dari kolom "Jadwal Inspeksi (Baru)"; fallback ke shift petugas utama
    const sheetShift = new Map<number | string, string>();
    agendaShifts.forEach(a => {
      const matched = findAgenda(a.agenda);
      if (a.shift) sheetShift.set(matched ? matched.id : a.agenda.trim().toLowerCase(), a.shift);
    });
    const toCard = (key: string, title: string, agenda: InspectionAgendaItem | null, category: Category, members: Member[]): AgendaCard => {
      const sorted = [...members].sort((a, b) => a.roleIndex - b.roleIndex);
      const fromSheet = (agenda && planShifts?.[agenda.id]) || sheetShift.get(agenda ? agenda.id : title.trim().toLowerCase());
      const shift = fromSheet ? shiftGroup(fromSheet) : sorted.length ? shiftGroup(sorted[0].shift) : null;
      return { key, title, agenda, category, members: sorted, shift };
    };

    const list: AgendaCard[] = [
      ...INSPECTION_29_AGENDAS.map(a => toCard(`a${a.id}`, a.name, a, AGENDA_CATEGORY[a.id] || 'OTHER', byAgenda.get(a.id) || [])),
      ...Array.from(extra.entries()).map(([title, members]) => toCard(`x-${title}`, title, null, 'OTHER', members))
    ];
    list.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || (a.agenda?.id ?? 99) - (b.agenda?.id ?? 99));
    return {
      cards: list, cuti: cutiList.sort((a, b) => a.name.localeCompare(b.name)), nonActive: nonActiveList,
      unassigned: unassignedList.sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [schedule, agendaShifts, plan, history, cutiConflicts]);

  // Daftar peringatan (inspeksi berulang, aturan Gol/Section, shift) untuk banner ringkasan
  const warningList = useMemo(() => cards.flatMap(c => c.members.flatMap(m =>
    (m.warnings || []).map(w => ({ ...w, name: m.name, agenda: c.agenda ? agendaShortName(c.agenda.id) : c.title }))
  )), [cards]);

  const stats = useMemo(() => {
    const assigned = cards.filter(c => c.members.length > 0);
    const done = assigned.filter(c => c.members.some(m => m.isCompleted));
    const people = assigned.reduce((n, c) => n + c.members.length, 0);
    return {
      agendas: cards.length, assigned: assigned.length, done: done.length, people,
      donePct: assigned.length ? Math.round((done.length / assigned.length) * 100) : 0
    };
  }, [cards]);

  const myName = inspectorName.trim().toLowerCase();
  const myCard = useMemo(() => cards.find(c => c.members.some(m => m.name.trim().toLowerCase() === myName)), [cards, myName]);

  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter(c => {
      if (catFilter !== 'ALL' && c.category !== catFilter) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.members.some(m => m.name.toLowerCase().includes(q));
    });
  }, [cards, catFilter, search]);

  const handleDownloadPng = async () => {
    setExportingPng(true);
    const toastId = toast.loading('Menyiapkan gambar jadwal...');
    try {
      await new Promise(r => setTimeout(r, 100));
      const node = captureRef.current;
      if (!node) throw new Error('Lembar jadwal belum siap');
      await Promise.all(Array.from(node.querySelectorAll('img')).map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => { img.style.display = 'none'; res(); }; })
      ));
      const dataUrl = await toPng(node, {
        pixelRatio: 2, backgroundColor: '#FFFFFF', cacheBust: true,
        imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      });
      const link = document.createElement('a');
      link.download = `Jadwal_Inspeksi_Week_${selectedWeek}_${currentYear}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Gambar jadwal berhasil diunduh (PNG)', { id: toastId });
    } catch (err: any) {
      console.error('Export PNG jadwal error:', err);
      toast.error('Gagal mengunduh PNG: ' + (err?.message || 'kesalahan rendering'), { id: toastId });
    } finally {
      setExportingPng(false);
    }
  };

  const shiftBadge = (shift: AgendaCard['shift']) => {
    if (!shift) return null;
    const cfg = shift === 'Malam'
      ? { icon: <Moon className="w-3 h-3" />, cls: 'bg-indigo-600 text-white' }
      : shift === 'Siang'
        ? { icon: <Sun className="w-3 h-3" />, cls: 'bg-amber-400 text-amber-950' }
        : { icon: <Clock className="w-3 h-3" />, cls: 'bg-slate-500 text-white' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>
        {cfg.icon} Shift {shift}
      </span>
    );
  };

  const renderCard = (c: AgendaCard) => {
    const cat = CATEGORY[c.category];
    const isDone = c.members.some(m => m.isCompleted);
    const isMine = c === myCard;
    return (
      <div
        key={c.key}
        className={`flex flex-col bg-[var(--card-bg)] border border-[var(--border-main)] border-t-4 ${cat.accent} rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md ${isMine ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg-main)]' : ''}`}
      >
        <div className={`px-4 pt-3 pb-2.5 ${cat.head}`}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-bold leading-snug">{c.title}</h3>
            {c.agenda && <span className="shrink-0 text-[10px] font-black opacity-60">#{c.agenda.id}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {shiftBadge(c.shift)}
            {c.members.length > 0 && (
              isDone ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">
                  <CheckCircle2 className="w-3 h-3" /> Selesai
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/20 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">
                  <CircleDashed className="w-3 h-3" /> Belum
                </span>
              )
            )}
            {isMine && <span className="px-2 py-0.5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold uppercase">Jadwal Anda</span>}
          </div>
        </div>
        <div className="flex-1 px-4 py-3 space-y-2.5">
          {c.members.length === 0 ? (
            <p className="flex items-center gap-1.5 text-xs italic text-[var(--text-muted)]">
              <AlertCircle className="w-3.5 h-3.5" /> Belum ada petugas dijadwalkan
            </p>
          ) : c.members.map(m => {
            const hasError = m.warnings?.some(w => w.level === 'error');
            return (
              <div key={m.name} className="group/m">
                <div className="flex items-center gap-2.5">
                  <EmployeeAvatar name={m.name} photo={photoOf(m.name)} className="w-8 h-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--text-main)] truncate">{m.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {m.roleIndex === 1 ? 'Inspektor Utama' : 'Pendamping'}{m.plan ? ` · Gol ${m.plan.gol || '-'} · ${m.shift}` : m.jabatan ? ` · ${m.jabatan}` : ''}
                    </p>
                  </div>
                  {!!m.warnings?.length && (
                    <span className={`shrink-0 ${hasError ? 'text-rose-500' : 'text-amber-500'}`} title={m.warnings.map(w => w.text).join('\n')}>
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  )}
                  {m.isCompleted && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400" title="Laporan inspeksi sudah terkirim">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {formatShort(m.completedAt)}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => requestEdit({ kind: 'member', key: m.key || m.name.trim().toUpperCase() })}
                      className="shrink-0 w-7 h-7 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--input-bg)] flex items-center justify-center cursor-pointer opacity-60 group-hover/m:opacity-100"
                      title="Edit jadwal karyawan ini"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {!!m.warnings?.length && (
                  <div className="ml-10 mt-1 space-y-0.5">
                    {m.warnings.map(w => (
                      <p key={w.text} className={`text-[10px] font-semibold leading-tight ${w.level === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>{w.text}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {canEdit && c.agenda && (
          <button
            onClick={() => requestEdit({ kind: 'agenda', agendaId: c.agenda!.id })}
            className="mx-4 mb-3 h-8 rounded-xl border border-dashed border-[var(--border-main)] text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah petugas
          </button>
        )}
      </div>
    );
  };

  const groupedVisible = CATEGORY_ORDER
    .map(k => ({ key: k, cards: visibleCards.filter(c => c.category === k) }))
    .filter(g => g.cards.length > 0);

  return (
    <div className={fullscreen
      ? 'fixed inset-0 z-[60] overflow-y-auto bg-[var(--bg-main)] space-y-4 p-3 sm:p-4 pb-10'
      : 'space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full px-2 sm:px-4 lg:px-6'}
    >
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-x-3 gap-y-2"><SafetyModuleSwitch active="jadwal" /> Jadwal Inspeksi</span>}
        description="Jadwal inspeksi terencana mingguan Preparasi & Laboratorium (periode Sabtu – Jumat)"
        icon={<CalendarRange />}
      >
        <button
          onClick={() => setFullscreen(f => !f)}
          className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          title={fullscreen ? 'Keluar layar penuh (Esc)' : 'Tampilan layar penuh'}
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />} {fullscreen ? 'Keluar' : 'Layar Penuh'}
        </button>
        {onBack && !fullscreen && (
          <button onClick={onBack} className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        )}
      </PageHeader>

      {/* Tab: jadwal mingguan / rekap per karyawan */}
      <div className="inline-flex p-1 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-main)] shadow-sm">
        {([
          { k: 'jadwal', label: 'Jadwal Mingguan', icon: <CalendarRange className="w-4 h-4" /> },
          { k: 'rekap', label: 'Rekap per Karyawan', icon: <Table2 className="w-4 h-4" /> }
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${tab === t.k ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'rekap' ? (
        <ScheduleRekapPanel year={currentYear} currentWeek={currentWeek} photoOf={photoOf} />
      ) : (<>
      {degraded && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-rose-800 dark:text-rose-200">Jadwal portal tidak dapat dimuat</p>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {degraded}. Sementara ditampilkan jadwal Google Sheet (week aktif, hanya-baca); acak, edit & publikasi tidak tersedia sampai koneksi pulih.
            </p>
          </div>
          <button
            onClick={() => loadWeek(selectedWeek, true)}
            className="h-8 px-3 shrink-0 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
          </button>
        </div>
      )}

      {/* Banner minggu */}
      <div className="rounded-2xl overflow-hidden border border-yellow-300 dark:border-yellow-500/40 shadow-sm">
        <div className="bg-gradient-to-r from-yellow-300 via-yellow-200 to-amber-200 dark:from-yellow-500/25 dark:via-yellow-500/15 dark:to-amber-500/15 px-4 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-900/70 dark:text-yellow-200/70">Jadwal Inspeksi Preparasi – Lab</p>
          <h2 className="text-base sm:text-xl font-black text-yellow-950 dark:text-yellow-100">
            WEEK {selectedWeek} <span className="font-bold">· {rangeLabel}</span>
          </h2>
          <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActiveWeek ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActiveWeek ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
            {isActiveWeek ? 'Periode Aktif' : `Arsip ${selectedWeek}`}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-3 shadow-sm flex flex-col xl:flex-row xl:items-center gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedWeek(w => Math.max(minWeek, w - 1))}
            disabled={selectedWeek <= minWeek}
            className="h-10 w-10 shrink-0 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-center cursor-pointer disabled:opacity-40"
            title="Week sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-64 [&>div]:mb-0">
            <Select value={`W${selectedWeek}`} onChange={e => setSelectedWeek(parseInt(e.target.value.replace(/\D/g, ''), 10))}>
              {weekOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <button
            onClick={() => setSelectedWeek(w => Math.min(maxWeek, w + 1))}
            disabled={selectedWeek >= maxWeek}
            className="h-10 w-10 shrink-0 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-center cursor-pointer disabled:opacity-40"
            title="Week berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isActiveWeek && (
            <button
              onClick={() => setSelectedWeek(currentWeek)}
              className="h-10 px-3 shrink-0 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Kembali ke week aktif"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Week Aktif
            </button>
          )}
        </div>
        {canEdit ? (
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari agenda atau nama petugas..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>
        ) : <div className="flex-1" />}
        <div className="flex gap-2">
          <button
            onClick={() => loadWeek(selectedWeek, true)}
            disabled={loading}
            className="h-10 flex-1 xl:flex-none px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
          </button>
          {canEdit && (
            <button
              onClick={handleDownloadPng}
              disabled={loading || exportingPng || schedule.length === 0}
              className="h-10 flex-1 xl:flex-none px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {exportingPng ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />} Download PNG
            </button>
          )}
        </div>
      </div>

      {!canEdit ? (
        <PersonalSchedulePanel state={personal} week={selectedWeek} name={inspectorName} photoOf={photoOf} />
      ) : (<>

      {/* Penyusun jadwal: acak per shift dari Database Roster & sumber jadwal */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-3 shadow-sm flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="flex items-center gap-3 xl:mr-auto min-w-0">
          <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${plan ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
            <Shuffle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-[var(--text-main)] flex flex-wrap items-center gap-2">
              {plan ? 'Jadwal Portal' : 'Jadwal Google Sheet'}
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--input-bg)] text-[var(--text-muted)]">
                {plan ? (plan.source === 'random' ? 'Hasil acak' : 'Edit manual') : 'CurrentWeek'}
              </span>
              {plan && (
                !publishState.isPublished ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">Draft · belum terlihat karyawan</span>
                ) : publishState.hasUnpublishedChanges ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">Ada perubahan belum dipublikasikan</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"><CheckCircle2 className="w-3 h-3" /> Dipublikasikan</span>
                )
              )}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {plan
                ? `Diperbarui ${plan.updatedByName || '-'}${plan.updatedAt ? ` · ${new Date(plan.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}${plan.publishedAt ? ` · Dipublikasikan ${plan.publishedByName || '-'} ${new Date(plan.publishedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}`
                : 'Acak untuk menyusun jadwal dari Database Roster Prep & Lab (Gol II–V, roster Senin – Rabu)'}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleRandomize('ALL')} disabled={!!busy || !!degraded} className="h-9 px-3 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60" title="Acak ulang seluruh petugas (Malam & Siang + Nonshift)">
              <Shuffle className="w-3.5 h-3.5" /> Acak Semua
            </button>
            <button onClick={() => handleRandomize('Malam')} disabled={!!busy || !!degraded} className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60" title="Acak ulang petugas Shift Malam saja">
              <Moon className="w-3.5 h-3.5" /> Acak Shift Malam
            </button>
            <button onClick={() => handleRandomize('Siang')} disabled={!!busy || !!degraded} className="h-9 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60" title="Acak ulang petugas Shift Siang digabung Nonshift">
              <Sun className="w-3.5 h-3.5" /> Acak Siang + Nonshift
            </button>
            {!plan && isActiveWeek && schedule.length > 0 && (
              <button onClick={handleCopyFromSheet} disabled={!!busy || !!degraded} className="h-9 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60" title="Salin jadwal Google Sheet ke portal agar bisa diedit per karyawan">
                <CopyPlus className="w-3.5 h-3.5" /> Salin dari Sheet
              </button>
            )}
            {plan && (
              <button onClick={handleDeletePlan} disabled={!!busy || !!degraded} className="h-9 px-3 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60" title="Hapus jadwal portal, kembali ke Google Sheet">
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            )}
            {plan && (
              <button
                onClick={handlePublish}
                disabled={!!busy || !!degraded || (publishState.isPublished && !publishState.hasUnpublishedChanges)}
                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                title="Publikasikan jadwal ke karyawan & kirim notifikasi"
              >
                {busy.startsWith('Mempublikasikan') ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {!publishState.isPublished ? 'Simpan & Publikasikan' : publishState.hasUnpublishedChanges ? 'Publikasikan Perubahan' : 'Sudah Dipublikasikan'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Peringatan jadwal */}
      {warningList.length > 0 && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mr-auto">
              <AlertTriangle className="w-4 h-4" /> {warningList.length} peringatan jadwal
            </p>
            {canEdit && plan && cutiConflicts.length > 0 && (
              <button onClick={handleRemoveCuti} disabled={!!busy || !!degraded} className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
                <UserX className="w-3.5 h-3.5" /> Keluarkan {cutiConflicts.length} karyawan cuti
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-x-4 gap-y-1">
            {warningList.map((w, i) => (
              <p key={i} className={`text-[12px] ${w.level === 'error' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-800 dark:text-amber-200'}`}>
                <span className="font-bold">{w.name}</span> · {w.agenda}: {w.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Agenda Terjadwal</p>
          <p className="text-2xl font-black text-[var(--text-main)] mt-1">{stats.assigned}<span className="text-base text-[var(--text-muted)]">/{stats.agendas}</span></p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Target mingguan 29 agenda</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Agenda Selesai</p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats.donePct}%</p>
          </div>
          <p className="text-2xl font-black text-[var(--text-main)] mt-1">{stats.done}<span className="text-base text-[var(--text-muted)]">/{stats.assigned}</span></p>
          <div className="h-1.5 mt-2 rounded-full bg-[var(--input-bg)] overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.donePct}%` }} />
          </div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Petugas Inspeksi</p>
          <p className="text-2xl font-black text-[var(--text-main)] mt-1">{stats.people}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Orang dijadwalkan minggu ini</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Cuti / Non-Aktif</p>
          <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">{cuti.length + nonActive.length}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{cuti.length} cuti · {nonActive.length} resign/dinas/dll.</p>
        </div>
      </div>

      {/* Filter kategori (sekaligus legenda warna) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCatFilter('ALL')}
          className={`h-8 px-3 rounded-full text-xs font-semibold cursor-pointer transition-colors ${catFilter === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'}`}
        >
          Semua Area
        </button>
        {CATEGORY_ORDER.map(k => (
          <button
            key={k}
            onClick={() => setCatFilter(k)}
            className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${catFilter === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY[k].dot}`} /> {CATEGORY[k].label}
            <span className="opacity-60">{cards.filter(c => c.category === k).length}</span>
          </button>
        ))}
        {(plan || sheetName) && (
          <span className="ml-auto text-[11px] text-[var(--text-muted)]">
            Sumber: {plan ? `Jadwal Portal (${publishState.isPublished ? (publishState.hasUnpublishedChanges ? 'draft, ada perubahan' : 'terpublikasi') : 'draft'})` : `Google Sheet "${sheetName}"`}
          </span>
        )}
      </div>

      {/* Kartu agenda */}
      {loading && schedule.length === 0 ? (
        <div className="py-20 text-center text-sm text-[var(--text-muted)]">
          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Memuat jadwal Week {selectedWeek}...
        </div>
      ) : loadError ? (
        <div className="py-14 px-4 text-center bg-[var(--card-bg)] border border-dashed border-[var(--border-main)] rounded-2xl">
          <CalendarRange className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
          <p className="mt-3 text-sm font-semibold text-[var(--text-main)]">{loadError}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {isActiveWeek ? 'Tekan Segarkan setelah Google Sheet jadwal diperbarui.' : 'Kontrol Cuti di bawah tetap menampilkan roster week ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedVisible.map(g => (
            <section key={g.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${CATEGORY[g.key].head}`}>{CATEGORY[g.key].icon}</span>
                <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-main)]">{CATEGORY[g.key].label}</h3>
                <span className="text-xs text-[var(--text-muted)]">{g.cards.length} agenda</span>
                <div className="flex-1 h-px bg-[var(--border-main)]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 min-[1900px]:grid-cols-6 gap-3">
                {g.cards.map(renderCard)}
              </div>
            </section>
          ))}
          {groupedVisible.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">Tidak ada agenda yang cocok dengan pencarian.</p>
          )}
        </div>
      )}

      {/* Karyawan onsite yang belum mendapat agenda (jadwal portal) */}
      {plan && unassigned.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--text-main)] mb-3">
            <Users className="w-4 h-4 text-sky-500" /> Onsite, belum dijadwalkan
            <span className="px-1.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px]">{unassigned.length}</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(m => (
              <button
                key={m.key}
                onClick={() => canEdit && m.key && setEditTarget({ kind: 'member', key: m.key })}
                className={`inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[var(--input-bg)] text-xs font-semibold text-[var(--text-main)] ${canEdit ? 'cursor-pointer hover:ring-2 hover:ring-[var(--primary)]/40' : 'cursor-default'}`}
                title={canEdit ? 'Klik untuk menjadwalkan' : undefined}
              >
                <EmployeeAvatar name={m.name} photo={photoOf(m.name)} className="w-6 h-6 text-[9px]" />
                {m.name} <span className="opacity-60">· {m.shift}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Kontrol cuti dari Database Roster (Senin – Rabu) */}
      <LeaveControlPanel period={period} week={selectedWeek} periodLabel={rangeLabel} photoOf={photoOf} />

      {/* Catatan & daftar cuti */}
      {!loadError && schedule.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--text-main)] mb-2">
              <StickyNote className="w-4 h-4 text-amber-500" /> Catatan
            </h4>
            <ol className="space-y-1.5 text-[13px] text-[var(--text-muted)] list-decimal pl-4">
              {NOTES.map(n => <li key={n}>{n}</li>)}
            </ol>
          </div>
          <div className="xl:col-span-2 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--text-main)] mb-3">
              <Palmtree className="w-4 h-4 text-violet-500" /> Karyawan Cuti untuk Pengisian KTA/TTA & Inspeksi
              <span className="px-1.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px]">{cuti.length}</span>
            </h4>
            {cuti.length === 0 ? (
              <p className="text-xs italic text-[var(--text-muted)]">Tidak ada karyawan cuti minggu ini.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                {cuti.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-right text-[11px] tabular-nums text-[var(--text-muted)]">{i + 1}</span>
                    <EmployeeAvatar name={m.name} photo={photoOf(m.name)} className="w-6 h-6 text-[9px]" />
                    <span className="text-[13px] text-[var(--text-main)] truncate">{m.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-[var(--border-main)]">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--text-main)] mb-2">
                <UserX className="w-4 h-4 text-rose-500" /> Resign / Dinas / Mutasi / Sakit / New Hire
              </h4>
              {nonActive.length === 0 ? (
                <p className="text-xs italic text-[var(--text-muted)]">Tidak ada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nonActive.map(n => (
                    <span key={n.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                      <Users className="w-3 h-3" /> {n.name}{n.note ? <span className="opacity-70 capitalize">· {n.note}</span> : null}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </>)}
      </>)}

      {editTarget && plan && canEdit && (
        <PlanEditModal
          target={editTarget}
          members={plan.members}
          agendaShifts={plan.agendaShifts || {}}
          history={history}
          photoOf={photoOf}
          onClose={() => setEditTarget(null)}
          onApply={applyEdit}
        />
      )}

      {/* Lembar tersembunyi untuk ekspor PNG */}
      {exportingPng && (
        <div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
          <ScheduleSheet ref={captureRef} week={selectedWeek} periodLabel={rangeLabel} sourceLabel={plan ? 'Jadwal Portal (Database Roster Prep & Lab)' : 'Google Sheet Jadwal Inspeksi'} cards={cards} cuti={cuti} nonActive={nonActive} photoOf={photoOf} />
        </div>
      )}
    </div>
  );
}
