import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList, RefreshCw, Download, Search, ArrowLeft, Table2, Users, BarChart3, Pencil, X, Save,
  RotateCcw, CheckCircle2, CircleDashed, Palmtree, ShieldCheck, ClipboardCheck, CalendarDays, ImageDown, Clock
} from 'lucide-react';
import { SafetyModuleSwitch } from './SafetyModuleSwitch';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { formatAvatarUrl, handleAvatarError } from '../lib/avatarUtils';
import { PageHeader } from './PageHeader';
import { Select } from './ui';
import { GroupReportScreen, getKtaObligation } from './GroupReportScreen';
import { SafetyRekapDiagram } from './SafetyRekapDiagram';
import { getISOWeek, getISOWeekYear, getISOWeekRange } from '../utils/iso-week';

interface SafetyRekapScreenProps {
  inspectorNik: string;
  inspectorName: string;
  inspectorRole?: string;
  inspectorSection?: string;
  onBack?: () => void;
}

const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Personil yang dikecualikan dari rekap (sama dengan filter di modul SAP)
const EXCLUDED_NIKS = ['04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719'];
const EDITOR_NIKS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'preplabadmin'];

// Nilai sel tanggal: 'YYYY-MM-DD', '√' (sudah tanpa tanggal), '' (wajib tapi belum), null (tidak wajib → sel gelap)
type DateVal = string | null;

// Status ketidakhadiran: personil dengan status ini tidak dihitung dalam target mingguan
type Absence = 'CUTI' | 'IZIN' | 'DINAS' | 'RESIGN' | 'NEW_HIRE';

const ABSENCE_OPTIONS: Record<Absence, {
  label: string; screen: string; chip: string; print: string; printText: string; excel: string;
}> = {
  CUTI: {
    label: 'Cuti', excel: 'CUTI',
    screen: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
    chip: 'bg-violet-100 text-violet-800 ring-violet-300 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-500/40',
    print: '#E9D5FF', printText: '#5B21B6'
  },
  IZIN: {
    label: 'Izin', excel: 'IZIN',
    screen: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
    chip: 'bg-yellow-100 text-yellow-800 ring-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-200 dark:ring-yellow-500/40',
    print: '#FEF08A', printText: '#854D0E'
  },
  DINAS: {
    label: 'Dinas Luar', excel: 'DINAS LUAR',
    screen: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
    chip: 'bg-orange-100 text-orange-800 ring-orange-300 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-500/40',
    print: '#FED7AA', printText: '#9A3412'
  },
  RESIGN: {
    label: 'Resign', excel: 'RESIGN',
    screen: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    chip: 'bg-red-100 text-red-800 ring-red-300 dark:bg-red-500/20 dark:text-red-200 dark:ring-red-500/40',
    print: '#FECACA', printText: '#991B1B'
  },
  NEW_HIRE: {
    label: 'New Hire', excel: 'NEW HIRE',
    screen: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    chip: 'bg-sky-100 text-sky-800 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/40',
    print: '#BAE6FD', printText: '#075985'
  }
};
const ABSENCE_KEYS = Object.keys(ABSENCE_OPTIONS) as Absence[];

interface RekapValues {
  absence: Absence | null;
  isCuti: boolean; // true bila absence terisi (dikecualikan dari target)
  ktaDone: boolean;
  tglKta: DateVal;
  tglTta1: DateVal;
  tglTta2: DateVal;
  inspeksiDone: boolean;
  keteranganInspeksi: string;
  tglInspeksi: DateVal;
}

interface RekapRow extends RekapValues {
  nik: string;
  name: string;
  jabatan: string;
  auto: RekapValues;
  edit?: any;
  ktaLate: boolean;      // salah satu tanggal KTA/TTA jatuh di Kamis/Jumat
  inspeksiLate: boolean; // tanggal inspeksi jatuh di Kamis/Jumat
}

type StatusFilter = 'ALL' | 'BELUM' | 'LENGKAP' | 'TERLAMBAT' | 'CUTI';

function toIsoDate(ts: any): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShortDate(v: DateVal): string {
  if (!v || v === '√') return v || '';
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return v;
  return `${d}-${MONTHS_SHORT[m - 1]}-${String(y).slice(-2)}`;
}

function isValidEmployee(emp: any): boolean {
  const rawNik = (emp.nik || '').toString().trim().toUpperCase();
  const rawName = (emp.name || '').toString().trim();
  const rawSection = (emp.section || '').toString().trim();
  const rawStatus = (emp.statusKaryawan || '').toString().trim().toUpperCase();
  const rawJabatan = (emp.jabatan || '').toString().trim().toLowerCase();
  const rawGol = (emp.gol || '').toString().trim().toUpperCase();
  const rawJobGrade = (emp.jobGrade || '').toString().trim().toUpperCase();

  // Eksklusi Mutlak Golongan I (Crew / Operator / Non-Staff)
  if (rawNik === 'M0201250032') return false; // Imran Sebualamo (Crew Gol I)
  if (rawJabatan.includes('crew') || rawJabatan.includes('operator')) return false;
  if (
    rawGol === 'I' || rawGol === '1' || rawGol.startsWith('I.') || rawGol.startsWith('1.') ||
    rawGol.startsWith('I-') || rawGol.startsWith('1-') || rawGol === 'IA' || rawGol === 'IB' ||
    rawJobGrade.startsWith('S1') || rawJobGrade.startsWith('1.')
  ) {
    return false;
  }

  if (!rawNik || rawNik.includes('#N/A') || rawNik.toUpperCase() === 'N/A' || rawName.includes('#N/A')) return false;
  if (rawSection.includes('#N/A') || rawSection.toUpperCase() === 'N/A') return false;
  if (rawStatus.includes('RESIGN') || rawStatus.includes('PHK') || rawStatus.includes('KELUAR') || rawStatus.includes('INACTIVE')) return false;
  if (EXCLUDED_NIKS.includes(rawNik)) return false;
  const nikLower = rawNik.toLowerCase();
  const nameLower = rawName.toLowerCase();
  if (
    nikLower.includes('demo') || nameLower.includes('demo') || nameLower.includes('staging') ||
    nameLower.includes('test') || nikLower.includes('admin') || nameLower.includes('admin')
  ) return false;
  return true;
}

// Urutan jabatan: Manager → Superintendent → Supervisor → Foreman → lainnya
function jabatanRank(jabatan: string): number {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('manager')) return 0;
  if (j.includes('superintendent')) return 1;
  if (j.includes('supervisor')) return 2;
  if (j.includes('foreman')) return 3;
  return 4;
}

export interface Period { start: Date; end: Date }

// Parse tanggal; 'YYYY-MM-DD' dibaca sebagai tanggal lokal (bukan UTC)
function parseLocalDate(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function inPeriod(v: any, period: Period): boolean {
  const d = parseLocalDate(v);
  return !!d && d >= period.start && d <= period.end;
}

// Ambil tanggal pertama yang masuk periode week; null bila semua di luar periode
function pickInPeriod(period: Period, ...candidates: any[]): any {
  return candidates.find(c => inPeriod(c, period)) ?? null;
}

// Penyelesaian pada hari Kamis / Jumat dalam periode week dianggap terlambat
const LATE_WEEKDAYS = [4, 5];
function isLateDate(v: DateVal): boolean {
  if (!v || v === '√') return false;
  const d = parseLocalDate(v);
  return !!d && LATE_WEEKDAYS.includes(d.getDay());
}

// Tentukan kolom KTA / TTA 1 / TTA 2 berdasarkan kewajiban & laporan yang tanggalnya masuk periode week
function buildKtaCells(emp: any, period: Period): Pick<RekapValues, 'ktaDone' | 'tglKta' | 'tglTta1' | 'tglTta2'> {
  const obligation = emp.obligation || getKtaObligation(emp.nik, emp.jabatan, emp.section);
  const cd = emp.checkDetails || {};
  const isManual = emp.isManualOverride && emp.status === 'SUDAH';

  type Sub = { type: 'KTA' | 'TTA'; ts: any };
  const typeOf = (label: any): 'KTA' | 'TTA' => (String(label || 'KTA').toUpperCase().includes('TTA') ? 'TTA' : 'KTA');
  let subs: Sub[] = [];
  if (Array.isArray(emp.reports) && emp.reports.length > 0) {
    subs = emp.reports.map((r: any) => ({ type: typeOf(r.reportType), ts: pickInPeriod(period, r.date, r.timestamp) }));
  } else {
    if (cd.check1Done && cd.check1Label) subs.push({ type: typeOf(cd.check1Label), ts: pickInPeriod(period, cd.check1Timestamp, emp.completedAt) });
    if (cd.check2Done && cd.check2Label) subs.push({ type: typeOf(cd.check2Label), ts: pickInPeriod(period, cd.check2Timestamp, emp.completedAt) });
  }
  // Laporan dengan tanggal di luar periode week otomatis diabaikan
  subs = subs.filter(s => s.ts !== null);
  subs.sort((a, b) => (parseLocalDate(a.ts)?.getTime() || 0) - (parseLocalDate(b.ts)?.getTime() || 0));

  const ktaSub = subs.find(s => s.type === 'KTA');
  const ttaSubs = subs.filter(s => s.type === 'TTA');

  // Hitung ulang status dari laporan dalam periode (aturan sama dengan server /api/rekap-kta)
  let isDone = isManual;
  if (!isDone) {
    if (obligation.type === '1_KTA_OR_TTA') isDone = subs.length >= 1;
    else if (obligation.type === '1_KTA_AND_1_TTA') isDone = (!!ktaSub && ttaSubs.length >= 1) || subs.length >= 2;
    else isDone = subs.length >= 2;
  }

  let needKta = false, needTta1 = false, needTta2 = false;
  if (obligation.type === '1_KTA_AND_1_TTA') {
    const viaTwoTta = isDone && !ktaSub && ttaSubs.length >= 2;
    needKta = !viaTwoTta;
    needTta1 = true;
    needTta2 = viaTwoTta;
  } else if (obligation.type === '2_TTA') {
    needTta1 = true;
    needTta2 = true;
  } else if (!isDone) {
    // 1_KTA_OR_TTA: cukup salah satu
    needKta = true;
    needTta1 = true;
  } else if (subs.length === 0) {
    needKta = true;
  }

  const cell = (sub: Sub | undefined, required: boolean): DateVal => {
    if (sub) return toIsoDate(parseLocalDate(sub.ts)) || '√';
    if (required) return isManual ? '√' : '';
    return null;
  };

  return {
    ktaDone: isDone,
    tglKta: cell(ktaSub, needKta),
    tglTta1: cell(ttaSubs[0], needTta1),
    tglTta2: cell(ttaSubs[1], needTta2)
  };
}

// Data edit tersimpan → nilai efektif. Tanggal: null = otomatis, '-' = tidak wajib, '' = kosong.
// Tanggal manual di luar periode week juga otomatis dikosongkan.
function applyEdit(auto: RekapValues, edit: any, period: Period): RekapValues {
  if (!edit) return auto;
  const date = (stored: any, fallback: DateVal): DateVal => {
    if (stored === null || stored === undefined) return fallback;
    if (stored === '-') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(stored) && !inPeriod(stored, period)) return '';
    return stored;
  };
  const bool = (stored: any, fallback: boolean) => (typeof stored === 'boolean' ? stored : fallback);
  // absenceStatus: null = otomatis (data lama is_cuti tetap dihormati), '' = hadir, selain itu status
  let absence: Absence | null = auto.absence;
  if (edit.absenceStatus === '') absence = null;
  else if (edit.absenceStatus && ABSENCE_KEYS.includes(edit.absenceStatus)) absence = edit.absenceStatus;
  else if (typeof edit.isCuti === 'boolean') absence = edit.isCuti ? 'CUTI' : null;
  return {
    absence,
    isCuti: absence !== null,
    ktaDone: bool(edit.ktaDone, auto.ktaDone),
    tglKta: date(edit.tglKta, auto.tglKta),
    tglTta1: date(edit.tglTta1, auto.tglTta1),
    tglTta2: date(edit.tglTta2, auto.tglTta2),
    inspeksiDone: bool(edit.inspeksiDone, auto.inspeksiDone),
    keteranganInspeksi: edit.keteranganInspeksi ?? auto.keteranganInspeksi,
    tglInspeksi: date(edit.tglInspeksi, auto.tglInspeksi)
  };
}

// Periode rekap Safety: Sabtu – Jumat berikutnya.
// Week N = Sabtu di minggu ISO N s/d Jumat di minggu ISO N+1 (contoh 2026: W42 = 17 – 23 Okt).
export function getRekapWeekRange(year: number, week: number): Period {
  const iso = getISOWeekRange(year, week);
  const start = new Date(iso.start);
  start.setDate(start.getDate() + 5);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Week rekap untuk suatu tanggal (Sabtu ikut week ISO yang sama, Senin–Jumat ikut week ISO sebelumnya)
export function getRekapWeek(date: Date): { week: number; year: number } {
  const d = new Date(date);
  d.setDate(d.getDate() - 5);
  return { week: getISOWeek(d), year: getISOWeekYear(d) };
}

// Gabungkan data rekap 2 minggu ISO yang beririsan dengan periode Sabtu – Jumat
function mergeRekapLists(lists: any[][]): any[] {
  const map = new Map<string, any>();
  lists.flat().forEach(emp => {
    const key = (emp.nik || emp.name || '').toString().trim().toUpperCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...emp, _sources: [emp] });
      return;
    }
    const reports = [...(prev.reports || []), ...(emp.reports || [])];
    const seen = new Set<string>();
    const manual = (e: any) => e.isManualOverride && e.status === 'SUDAH';
    const isSudah = (e: any) => e.status === 'SUDAH';
    const takeNew = (isSudah(emp) && !isSudah(prev)) || (manual(emp) && !manual(prev));
    map.set(key, {
      ...prev,
      ...(takeNew ? {
        status: emp.status,
        checkDetails: emp.checkDetails,
        completedAt: emp.completedAt,
        pdfTitle: emp.pdfTitle,
        ssUrl: emp.ssUrl,
        pdfUrl: emp.pdfUrl,
        isManualOverride: emp.isManualOverride,
      } : {}),
      reports: reports.filter(r => {
        const id = String(r.id ?? `${r.reportType}-${r.timestamp}`);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      }),
      _sources: [...prev._sources, emp]
    });
  });
  return Array.from(map.values());
}

function buildWeekOptions(year: number, currentWeek: number) {
  const options: { value: string; label: string }[] = [];
  const start = Math.max(1, currentWeek - 8);
  const end = Math.min(53, currentWeek + 1);
  for (let w = end; w >= start; w--) {
    const { start: s, end: e } = getRekapWeekRange(year, w);
    options.push({
      value: `W${w}`,
      label: `Week ${w} (${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} - ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]})${w === currentWeek ? ' [Aktif]' : ''}`
    });
  }
  return options;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

// Untuk ekspor PNG: foto Google Drive diambil lewat proxy same-origin agar kanvas tidak terblokir CORS
export function photoForCapture(url?: string): string {
  if (!url) return '';
  const s = url.trim();
  if (s.startsWith('data:') || s.startsWith('/api/')) return s;
  const m = s.match(/\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && (s.includes('drive.google.com') || s.includes('googleusercontent.com'))) return `/api/employees/photo/${m[1]}`;
  return formatAvatarUrl(s);
}

export function EmployeeAvatar({ name, photo, className = 'w-8 h-8 text-[11px]' }: { name: string; photo?: string; className?: string }) {
  const src = formatAvatarUrl(photo);
  return (
    <div className={`relative shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-100 font-black flex items-center justify-center ring-2 ring-[var(--card-bg)] ${className}`}>
      {initials(name)}
      {src && (
        <img src={src} alt={name} loading="lazy" onError={handleAvatarError} className="absolute inset-0 w-full h-full object-cover" />
      )}
    </div>
  );
}

interface RekapSummary {
  total: number; cuti: number; kta: number; insp: number; absence: Record<Absence, number>;
  lengkap: number; belum: number; ktaPct: number; inspPct: number;
  ktaLate: number; inspLate: number;
}

// Ringkasan gaya Excel: ADA (√) / status ketidakhadiran (warna pastel) / TIDAK ADA KTA/TTA/INSPEKSI
function SummaryRows({ summary, variant }: { summary: RekapSummary; variant: 'screen' | 'print' }) {
  const items: { label: string; kta: number; insp: number; cls: string; style?: React.CSSProperties }[] = [
    { label: 'ADA (√)', kta: summary.kta, insp: summary.insp, cls: variant === 'print' ? 'bg-white text-slate-900' : 'bg-[var(--card-bg)] text-[var(--text-main)]' },
    { label: 'TERLAMBAT (KAMIS / JUMAT)', kta: summary.ktaLate, insp: summary.inspLate, cls: '', style: { backgroundColor: '#FCA5A5', color: '#7F1D1D' } },
    ...ABSENCE_KEYS.map(k => ({
      label: ABSENCE_OPTIONS[k].excel, kta: summary.absence[k], insp: summary.absence[k], cls: '',
      style: { backgroundColor: ABSENCE_OPTIONS[k].print, color: ABSENCE_OPTIONS[k].printText }
    })),
    { label: 'TIDAK ADA KTA/TTA / INSPEKSI', kta: summary.total - summary.kta, insp: summary.total - summary.insp, cls: 'bg-rose-600 text-white' }
  ];
  const border = variant === 'print' ? 'border-slate-400' : 'border-[var(--border-main)]';
  return (
    <table className={`w-full border-collapse text-sm ${variant === 'print' ? 'text-slate-900' : 'text-[var(--text-main)]'}`}>
      <thead>
        <tr className={variant === 'print' ? 'bg-slate-200' : 'bg-slate-100 dark:bg-slate-800'}>
          <th className={`border ${border} px-3 py-1.5 text-left text-[11px] uppercase tracking-wider`}>Ringkasan</th>
          <th className={`border ${border} px-3 py-1.5 w-1/4 text-[11px] uppercase tracking-wider`}>KTA / TTA</th>
          <th className={`border ${border} px-3 py-1.5 w-1/4 text-[11px] uppercase tracking-wider`}>Inspeksi</th>
        </tr>
      </thead>
      <tbody>
        {items.map(it => (
          <tr key={it.label}>
            <td className={`border ${border} px-3 py-1.5 font-bold text-center ${it.cls}`} style={it.style}>{it.label}</td>
            <td className={`border ${border} px-3 py-1.5 text-center font-black tabular-nums`}>{it.kta}</td>
            <td className={`border ${border} px-3 py-1.5 text-center font-black tabular-nums`}>{it.insp}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Lembar laporan untuk ekspor PNG (warna tetap terang, tidak terpengaruh tema)
const RekapReportSheet = React.forwardRef<HTMLDivElement, {
  rows: RekapRow[]; photoMap: Map<string, string>; summary: RekapSummary;
  reportMonth: string; rangeLabel: string; week: string;
}>(({ rows, photoMap, summary, reportMonth, rangeLabel, week }, ref) => {
  const th = 'border border-slate-400 bg-slate-200 px-2 py-2 text-[11px] font-bold uppercase text-slate-800';
  const td = 'border border-slate-300 px-2 py-1.5 text-[12px] text-slate-900';
  const dateTd = (v: DateVal) => v === null
    ? <td className={`${td} bg-black`} />
    : isLateDate(v)
      ? <td className={`${td} text-center whitespace-nowrap font-bold`} style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}>{formatShortDate(v)}</td>
      : <td className={`${td} text-center whitespace-nowrap ${v === '' ? 'bg-rose-50' : ''}`}>{v === '√' ? '√' : formatShortDate(v)}</td>;
  const check = (done: boolean, late: boolean) => done && late ? (
    <td className={`${td} text-center font-bold`} style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}>
      <span className="text-base">√</span> <span className="text-[10px] uppercase">Terlambat</span>
    </td>
  ) : (
    <td className={`${td} text-center text-base font-bold ${done ? 'text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{done ? '√' : '✗'}</td>
  );
  return (
    <div ref={ref} style={{ width: 1700 }} className="bg-white p-8 font-sans">
      <div className="flex items-end justify-between border-b-4 border-slate-900 pb-3 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Prep & Lab · Safety Accountability Program</p>
          <h1 className="text-3xl font-black text-slate-900">Rekap KTA/TTA & Inspeksi Terencana</h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-900">{reportMonth}</p>
          <p className="text-sm font-semibold text-slate-600">{week} · {rangeLabel}</p>
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>No</th>
            <th className={`${th} text-left`}>Nama Karyawan</th>
            <th className={th}>NIK</th>
            <th className={`${th} text-left`}>Jabatan</th>
            <th className={th}>(KTA/TTA)</th>
            <th className={th}>Tanggal KTA</th>
            <th className={th}>Tanggal TTA 1</th>
            <th className={th}>Tanggal TTA 2</th>
            <th className={th}>(Inspeksi)</th>
            <th className={th}>Keterangan Inspeksi</th>
            <th className={th}>Tanggal Inspeksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const photo = photoForCapture(photoMap.get(r.nik.trim().toUpperCase()));
            return (
              <tr key={r.nik} className={i % 2 ? 'bg-sky-50/70' : 'bg-white'}>
                <td className={`${td} text-center`}>{i + 1}</td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden bg-slate-200 text-slate-600 text-[11px] font-black flex items-center justify-center">
                      {initials(r.name)}
                      {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                    </div>
                    <span className="font-semibold">{r.name}</span>
                  </div>
                </td>
                <td className={`${td} text-center font-mono`}>{r.nik}</td>
                <td className={td}>{r.jabatan}</td>
                {r.absence ? (
                  <td colSpan={7} className={`${td} text-center font-bold tracking-wide`} style={{ backgroundColor: ABSENCE_OPTIONS[r.absence].print, color: ABSENCE_OPTIONS[r.absence].printText }}>
                    {ABSENCE_OPTIONS[r.absence].excel}
                  </td>
                ) : (
                  <>
                    {check(r.ktaDone, r.ktaLate)}
                    {dateTd(r.tglKta)}
                    {dateTd(r.tglTta1)}
                    {dateTd(r.tglTta2)}
                    {check(r.inspeksiDone, r.inspeksiLate)}
                    <td className={`${td} text-center`}>{r.keteranganInspeksi}</td>
                    {dateTd(r.tglInspeksi)}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-5 w-[900px]">
        <SummaryRows summary={summary} variant="print" />
      </div>
      <p className="mt-4 text-[11px] text-slate-500">
        Diekspor dari PrepLab Portal · {new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
      </p>
    </div>
  );
});
RekapReportSheet.displayName = 'RekapReportSheet';

// ─── Dialog edit baris ────────────────────────────────────────────────────────

type DateMode = 'date' | 'empty' | 'na';

function dateToForm(v: DateVal): { mode: DateMode; date: string } {
  if (v === null) return { mode: 'na', date: '' };
  if (v === '' ) return { mode: 'empty', date: '' };
  return { mode: 'date', date: v === '√' ? '' : v };
}

function DateField({ label, value, onChange, min, max }: { label: string; value: { mode: DateMode; date: string }; onChange: (v: { mode: DateMode; date: string }) => void; min?: string; max?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</label>
      <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)]">
        {([['date', 'Tanggal'], ['empty', 'Belum'], ['na', 'Tdk Wajib']] as const).map(([m, l]) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ ...value, mode: m })}
            className={`py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${value.mode === m ? 'bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {value.mode === 'date' && (
        <input
          type="date"
          min={min}
          max={max}
          value={value.date}
          onChange={e => onChange({ mode: 'date', date: e.target.value })}
          className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
      )}
    </div>
  );
}

function StatusToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</label>
      <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)]">
        {[true, false].map(v => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
              value === v
                ? v ? 'bg-emerald-600 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {v ? 'Lengkap' : 'Belum'}
          </button>
        ))}
      </div>
    </div>
  );
}

interface EditDialogProps {
  row: RekapRow;
  week: string;
  year: number;
  editorNik: string;
  editorName: string;
  onClose: () => void;
  onSaved: () => void;
  period: Period;
}

function EditRowDialog({ row, week, year, editorNik, editorName, onClose, onSaved, period }: EditDialogProps) {
  const minDate = toIsoDate(period.start);
  const maxDate = toIsoDate(period.end);
  const [absence, setAbsence] = useState<Absence | null>(row.absence);
  const isCuti = absence !== null;
  const [ktaDone, setKtaDone] = useState(row.ktaDone);
  const [tglKta, setTglKta] = useState(dateToForm(row.tglKta));
  const [tglTta1, setTglTta1] = useState(dateToForm(row.tglTta1));
  const [tglTta2, setTglTta2] = useState(dateToForm(row.tglTta2));
  const [inspeksiDone, setInspeksiDone] = useState(row.inspeksiDone);
  const [keterangan, setKeterangan] = useState(row.keteranganInspeksi);
  const [tglInspeksi, setTglInspeksi] = useState(dateToForm(row.tglInspeksi));
  const [catatan, setCatatan] = useState<string>(row.edit?.catatan || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Simpan hanya nilai yang berbeda dari data otomatis (null = ikut otomatis)
  const diffDate = (form: { mode: DateMode; date: string }, auto: DateVal): string | null => {
    const autoForm = dateToForm(auto);
    if (form.mode === autoForm.mode && (form.mode !== 'date' || form.date === autoForm.date)) return null;
    if (form.mode === 'na') return '-';
    if (form.mode === 'empty') return '';
    return form.date || null;
  };
  const diffBool = (v: boolean, auto: boolean) => (v === auto ? null : v);

  const handleSave = async () => {
    if ([tglKta, tglTta1, tglTta2, tglInspeksi].some(f => f.mode === 'date' && !f.date)) {
      toast.error('Isi tanggal atau pilih "Belum" / "Tdk Wajib"');
      return;
    }
    if ([tglKta, tglTta1, tglTta2, tglInspeksi].some(f => f.mode === 'date' && f.date && !inPeriod(f.date, period))) {
      toast.error(`Tanggal harus berada dalam periode ${week} (${formatShortDate(minDate)} s/d ${formatShortDate(maxDate)})`);
      return;
    }
    setSaving(true);
    try {
      const a = row.auto;
      const res = await fetch('/api/safety-rekap/edits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week, year, nik: row.nik, name: row.name,
          // null = ikut otomatis, '' = hadir (wajib lapor)
          absenceStatus: absence === a.absence ? null : (absence ?? ''),
          ktaDone: diffBool(ktaDone, a.ktaDone),
          tglKta: diffDate(tglKta, a.tglKta),
          tglTta1: diffDate(tglTta1, a.tglTta1),
          tglTta2: diffDate(tglTta2, a.tglTta2),
          inspeksiDone: diffBool(inspeksiDone, a.inspeksiDone),
          keteranganInspeksi: keterangan.trim() === a.keteranganInspeksi.trim() ? null : keterangan.trim(),
          tglInspeksi: diffDate(tglInspeksi, a.tglInspeksi),
          catatan: catatan.trim() || null,
          editorNik, editorName
        })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menyimpan');
      toast.success(`Rekap ${row.name} berhasil diperbarui`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/safety-rekap/edits?week=${week}&year=${year}&nik=${encodeURIComponent(row.nik)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal mereset');
      toast.success(`Rekap ${row.name} dikembalikan ke data otomatis`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mereset data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[92dvh] flex flex-col bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-main)]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Edit Rekap · {week} {year}</p>
            <h3 className="text-base font-bold text-[var(--text-main)] truncate">{row.name}</h3>
            <p className="text-xs text-[var(--text-muted)] truncate">{row.nik} · {row.jabatan}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--input-bg)] cursor-pointer" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section className="space-y-2">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              <Palmtree className="w-4 h-4" /> Status Kehadiran Minggu Ini
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAbsence(null)}
                className={`h-8 px-3 rounded-full text-xs font-bold ring-1 ring-inset cursor-pointer transition-all ${
                  absence === null
                    ? 'bg-emerald-600 text-white ring-emerald-600 shadow-sm'
                    : 'bg-[var(--input-bg)] text-[var(--text-muted)] ring-[var(--border-main)] hover:text-[var(--text-main)]'
                }`}
              >
                Hadir (Wajib Lapor)
              </button>
              {ABSENCE_KEYS.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAbsence(k)}
                  className={`h-8 px-3 rounded-full text-xs font-bold ring-1 ring-inset cursor-pointer transition-all ${ABSENCE_OPTIONS[k].chip} ${
                    absence === k ? 'ring-2 shadow-sm scale-105' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {absence === k && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                  {ABSENCE_OPTIONS[k].label}
                </button>
              ))}
            </div>
            {isCuti && (
              <p className="text-[11px] text-[var(--text-muted)]">Personil berstatus {ABSENCE_OPTIONS[absence!].label} tidak dihitung dalam target mingguan.</p>
            )}
          </section>

          <fieldset disabled={isCuti} className={`space-y-5 ${isCuti ? 'opacity-40' : ''}`}>
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-4 h-4" /> Observasi KTA / TTA
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StatusToggle label="Status KTA/TTA" value={ktaDone} onChange={setKtaDone} />
                <DateField label="Tanggal KTA" value={tglKta} onChange={setTglKta} min={minDate} max={maxDate} />
                <DateField label="Tanggal TTA 1" value={tglTta1} onChange={setTglTta1} min={minDate} max={maxDate} />
                <DateField label="Tanggal TTA 2" value={tglTta2} onChange={setTglTta2} min={minDate} max={maxDate} />
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <ClipboardCheck className="w-4 h-4" /> Inspeksi Terencana
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StatusToggle label="Status Inspeksi" value={inspeksiDone} onChange={setInspeksiDone} />
                <DateField label="Tanggal Inspeksi" value={tglInspeksi} onChange={setTglInspeksi} min={minDate} max={maxDate} />
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Keterangan Inspeksi</label>
                  <input
                    value={keterangan}
                    onChange={e => setKeterangan(e.target.value)}
                    placeholder="Contoh: Inspeksi Umum Terencana Gudang Laboratorium"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>
              </div>
            </section>
          </fieldset>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Catatan Perubahan (opsional)</label>
            <textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              rows={2}
              placeholder="Alasan koreksi, mis. bukti dikirim via WhatsApp"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
            />
          </div>

          {row.edit && (
            <p className="text-[11px] text-[var(--text-muted)]">
              Terakhir diedit oleh <span className="font-semibold">{row.edit.updatedByName || row.edit.updatedByNik}</span>
              {row.edit.updatedAt ? ` · ${new Date(row.edit.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[var(--border-main)] bg-[var(--input-bg)]">
          {row.edit ? (
            <button
              onClick={handleReset}
              disabled={saving}
              className="h-9 px-3 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset ke Otomatis
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[var(--border-main)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-main)] cursor-pointer">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Direct Inline Popover/Editor Components ─────────────────────────────────

function InlineDatePopover({
  value,
  period,
  onSave,
  disabled
}: {
  value: DateVal;
  period: Period;
  onSave: (val: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const minDate = toIsoDate(period.start);
  const maxDate = toIsoDate(period.end);
  const form = dateToForm(value);
  const [dateVal, setDateVal] = useState(form.date || minDate);

  if (disabled) {
    if (value === null) return <span className="opacity-40">N/A</span>;
    if (value === '') return <span className="text-rose-400 font-bold">—</span>;
    return <span>{value === '√' ? '✓' : formatShortDate(value)}</span>;
  }

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer group"
        title="Klik untuk langsung ubah tanggal / status"
      >
        {value === null ? (
          <span className="text-[10px] opacity-40 font-mono">Tdk Wajib</span>
        ) : value === '' ? (
          <span className="text-rose-500 font-bold text-xs">—</span>
        ) : isLateDate(value) ? (
          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-[11px] shadow-2xs">
            {formatShortDate(value)}
          </span>
        ) : (
          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11.5px]">
            {value === '√' ? '✓ Selesai' : formatShortDate(value)}
          </span>
        )}
        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 text-slate-400 ml-0.5 transition-opacity" />
      </button>

      {open && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 w-52 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl space-y-2 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Ubah Tanggal</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Pilih Tanggal Periode:</label>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={dateVal}
              onChange={e => setDateVal(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => {
                onSave(dateVal);
                setOpen(false);
              }}
              className="w-full py-1 mt-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-colors"
            >
              Simpan Tanggal
            </button>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => {
                onSave('√');
                setOpen(false);
              }}
              className="py-1 px-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 text-center"
              title="Tandai Selesai (√)"
            >
              ✓ Selesai
            </button>
            <button
              type="button"
              onClick={() => {
                onSave('');
                setOpen(false);
              }}
              className="py-1 px-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200 text-center"
              title="Kosongkan (Belum)"
            >
              Belum
            </button>
            <button
              type="button"
              onClick={() => {
                onSave('-');
                setOpen(false);
              }}
              className="py-1 px-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-300 text-center"
              title="Tidak Wajib (-)"
            >
              Tdk Wajib
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineTextPopover({
  value,
  onSave,
  disabled
}: {
  value: string;
  onSave: (val: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [textVal, setTextVal] = useState(value || '');

  useEffect(() => {
    setTextVal(value || '');
  }, [value]);

  if (disabled) {
    return <span>{value || <span className="text-[var(--text-muted)] italic">Belum ada laporan</span>}</span>;
  }

  return (
    <div className="relative w-full" onClick={e => e.stopPropagation()}>
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer group flex items-center justify-between gap-1 p-1 -m-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        title="Klik untuk langsung edit keterangan inspeksi"
      >
        <span className="truncate max-w-[280px]">
          {value || <span className="text-[var(--text-muted)] italic">Belum ada laporan</span>}
        </span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 text-slate-400 shrink-0 transition-opacity" />
      </div>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1.5 w-72 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl space-y-2 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Edit Keterangan Inspeksi</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <textarea
            value={textVal}
            onChange={e => setTextVal(e.target.value)}
            placeholder="Contoh: Inspeksi Preparasi Wet Shift A"
            rows={2}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500 resize-none"
          />

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(textVal.trim());
                setOpen(false);
              }}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs"
            >
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineAbsencePopover({
  row,
  onSave,
  disabled
}: {
  row: RekapRow;
  onSave: (absenceStatus: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return (
      <div className="flex items-center justify-center gap-2 text-xs font-bold tracking-wide">
        <Palmtree className="w-4 h-4" /> {row.absence ? ABSENCE_OPTIONS[row.absence].excel : 'CUTI'}
        <span className="font-medium opacity-70">— tidak termasuk target minggu ini</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center gap-2 text-xs font-bold tracking-wide py-1 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer group"
        title="Klik untuk langsung ubah status cuti / kehadiran"
      >
        <Palmtree className="w-4 h-4" />
        <span>{row.absence ? ABSENCE_OPTIONS[row.absence].excel : 'CUTI'}</span>
        <span className="font-medium opacity-70">— tidak termasuk target minggu ini</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-70 ml-1 transition-opacity" />
      </button>

      {open && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 w-60 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl space-y-2 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Ubah Status Kehadiran</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onSave(''); // Hadir / Wajib
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200"
            >
              ✓ Hadir (Wajib Lapor)
            </button>

            {ABSENCE_KEYS.map(k => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  onSave(k);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                  row.absence === k 
                    ? 'bg-purple-100 text-purple-900 font-bold border border-purple-300' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {ABSENCE_OPTIONS[k].excel}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                onSave(null); // Otomatis
                setOpen(false);
              }}
              className="w-full text-center py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 pt-1 border-t border-slate-100"
            >
              Reset ke Otomatis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Layar utama ─────────────────────────────────────────────────────────────

export function SafetyRekapScreen({ inspectorNik, inspectorName, inspectorRole, inspectorSection, onBack }: SafetyRekapScreenProps) {
  const today = useMemo(() => new Date(), []);
  const currentYear = useMemo(() => getRekapWeek(today).year, [today]);
  const currentWeek = useMemo(() => getRekapWeek(today).week, [today]);
  const weekOptions = useMemo(() => buildWeekOptions(currentYear, currentWeek), [currentYear, currentWeek]);

  const [view, setView] = useState<'tabel' | 'diagram' | 'detail'>('tabel');
  const [selectedWeek, setSelectedWeek] = useState(`W${currentWeek}`);
  const [inspeksiData, setInspeksiData] = useState<{ rekapList: any[]; cutiList: any[] }>({ rekapList: [], cutiList: [] });
  const [ktaData, setKtaData] = useState<{ rekapList: any[]; cutiList: any[] }>({ rekapList: [], cutiList: [] });
  // Karyawan dari panel "Kontrol Cuti Karyawan" (modul Jadwal Inspeksi, roster Senin – Rabu periode)
  const [leaveList, setLeaveList] = useState<any[] | null>(null);
  const [activeInspectionSchedule, setActiveInspectionSchedule] = useState<any[] | null>(null);
  const [edits, setEdits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [editingRow, setEditingRow] = useState<RekapRow | null>(null);
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());
  const [exportingPng, setExportingPng] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  // Foto karyawan diambil dari modul Database Karyawan
  useEffect(() => {
    fetch('/api/employees?includeInactive=1&all=true')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const list: any[] = data?.status === 'success' ? (data.data || []) : (Array.isArray(data) ? data : []);
        const map = new Map<string, string>();
        list.forEach(emp => {
          const nik = (emp.nik || '').toString().trim().toUpperCase();
          if (nik && emp.photo) map.set(nik, emp.photo);
        });
        setPhotoMap(map);
      })
      .catch(err => console.error('Gagal memuat foto karyawan:', err));
  }, []);

  // Hak edit dari server (Section Administration, Developer & Manager); selain itu hanya data dirinya sendiri
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    fetch('/api/safety-access')
      .then(res => (res.ok ? res.json() : null))
      .then(data => setCanEdit(!!data?.canEdit))
      .catch(() => setCanEdit(false));
  }, [inspectorNik]);
  useEffect(() => {
    if (!canEdit && view !== 'tabel') setView('tabel');
  }, [canEdit, view]);

  const weekNum = parseInt(selectedWeek.replace(/\D/g, ''), 10) || currentWeek;
  const weekRange = useMemo(() => getRekapWeekRange(currentYear, weekNum), [currentYear, weekNum]);
  // Bulan laporan mengikuti hari Selasa (hari ke-4 dari periode Sabtu – Jumat)
  const reportMonth = useMemo(() => {
    const thu = new Date(weekRange.start);
    thu.setDate(thu.getDate() + 3);
    return `${MONTHS_FULL[thu.getMonth()]} ${thu.getFullYear()}`;
  }, [weekRange]);
  const rangeLabel = useMemo(() => {
    const s = weekRange.start, e = weekRange.end;
    const startPart = s.getMonth() === e.getMonth() ? `${s.getDate()}` : `${s.getDate()} ${MONTHS_FULL[s.getMonth()]}`;
    return `${startPart} - ${e.getDate()} ${MONTHS_FULL[e.getMonth()]} ${e.getFullYear()}`;
  }, [weekRange]);

    const [savingNik, setSavingNik] = useState<string | null>(null);

  const handleInlineSave = async (row: RekapRow, fieldUpdates: Partial<{
    absenceStatus: string | null;
    ktaDone: boolean | null;
    tglKta: string | null;
    tglTta1: string | null;
    tglTta2: string | null;
    inspeksiDone: boolean | null;
    keteranganInspeksi: string | null;
    tglInspeksi: string | null;
  }>) => {
    setSavingNik(row.nik);
    try {
      const a = row.auto;
      const currentEdit = row.edit || {};

      // Helper diffing
      const resolveDate = (newVal: string | null | undefined, curVal: DateVal, autoVal: DateVal) => {
        if (newVal !== undefined) return newVal;
        if (curVal === autoVal) return null;
        if (curVal === null) return '-';
        if (curVal === '') return '';
        return curVal;
      };

      const payload = {
        week: selectedWeek,
        year: currentYear,
        nik: row.nik,
        name: row.name,
        absenceStatus: fieldUpdates.absenceStatus !== undefined 
          ? fieldUpdates.absenceStatus 
          : (row.absence === a.absence ? null : (row.absence ?? '')),
        ktaDone: fieldUpdates.ktaDone !== undefined ? fieldUpdates.ktaDone : (row.ktaDone === a.ktaDone ? null : row.ktaDone),
        tglKta: resolveDate(fieldUpdates.tglKta, row.tglKta, a.tglKta),
        tglTta1: resolveDate(fieldUpdates.tglTta1, row.tglTta1, a.tglTta1),
        tglTta2: resolveDate(fieldUpdates.tglTta2, row.tglTta2, a.tglTta2),
        inspeksiDone: fieldUpdates.inspeksiDone !== undefined ? fieldUpdates.inspeksiDone : (row.inspeksiDone === a.inspeksiDone ? null : row.inspeksiDone),
        keteranganInspeksi: fieldUpdates.keteranganInspeksi !== undefined 
          ? fieldUpdates.keteranganInspeksi 
          : (row.keteranganInspeksi?.trim() === a.keteranganInspeksi?.trim() ? null : row.keteranganInspeksi?.trim()),
        tglInspeksi: resolveDate(fieldUpdates.tglInspeksi, row.tglInspeksi, a.tglInspeksi),
        editorNik: inspectorNik,
        editorName: inspectorName
      };

      const res = await fetch('/api/safety-rekap/edits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menyimpan');
      await fetchEdits(selectedWeek);
      toast.success(`Rekap ${row.name} berhasil diperbarui`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSavingNik(null);
    }
  };

  const fetchEdits = useCallback(async (week: string) => {
    try {
      const res = await fetch(`/api/safety-rekap/edits?week=${week}&year=${currentYear}`);
      setEdits(res.ok ? await res.json() : []);
    } catch {
      setEdits([]);
    }
  }, [currentYear]);

  const fetchData = useCallback(async (week: string, refresh = false) => {
    setLoading(true);
    try {
      // Server mengelompokkan data per minggu ISO (Senin – Minggu). Periode Sabtu – Jumat
      // beririsan dengan 2 minggu ISO: N (Sabtu–Minggu) dan N+1 (Senin–Jumat).
      const num = parseInt(week.replace(/\D/g, ''), 10);
      const isoWeeks = [`W${num}`, `W${getISOWeek(getRekapWeekRange(currentYear, num).end)}`];
      const suffix = refresh ? '&refresh=true' : '';
      // Senin, Selasa, Rabu periode Sabtu – Jumat (sama dengan Kontrol Cuti di modul Jadwal Inspeksi)
      const periodStart = getRekapWeekRange(currentYear, num).start;
      const leaveDates = [2, 3, 4].map(offset => {
        const d = new Date(periodStart);
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });
      const [responses, , leaveJson, schedJson] = await Promise.all([
        Promise.all(isoWeeks.flatMap(w => [
          fetch(`/api/rekap-inspeksi?week=${w}${suffix}`),
          fetch(`/api/rekap-kta?week=${w}${suffix}`)
        ])),
        fetchEdits(week),
        fetch(`/api/roster/leave-control?dates=${leaveDates.join(',')}${suffix}`)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`/api/inspection-schedule?sheet=CurrentWeek&week=${isoWeeks[1] || isoWeeks[0]}${suffix}`)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      ]);
      setLeaveList(leaveJson?.success ? (leaveJson.data || []) : null);
      setActiveInspectionSchedule(schedJson?.data || null);
      if (!leaveJson?.success) toast.error('Data Kontrol Cuti (roster) gagal dimuat — status cuti memakai data lama');
      const jsons = await Promise.all(responses.map(r => (r.ok ? r.json() : {})));
      const [inspA, ktaA, inspB, ktaB] = jsons as any[];
      // Status cuti/roster mengikuti minggu ISO N+1 (Senin – Jumat = mayoritas periode)
      setInspeksiData({ rekapList: mergeRekapLists([inspA.rekapList || [], inspB.rekapList || []]), cutiList: inspB.cutiList || [] });
      setKtaData({ rekapList: mergeRekapLists([ktaA.rekapList || [], ktaB.rekapList || []]), cutiList: ktaB.cutiList || [] });
      if (responses.some(r => !r.ok)) toast.error('Sebagian data rekap gagal dimuat');
    } catch (err) {
      console.error('Error fetching rekap safety:', err);
      toast.error('Gagal memuat rekap KTA/TTA & Inspeksi');
    } finally {
      setLoading(false);
    }
  }, [fetchEdits, currentYear]);

  useEffect(() => {
    if (view === 'tabel') fetchData(selectedWeek);
  }, [selectedWeek, view, fetchData]);

  const allRows = useMemo<RekapRow[]>(() => {
    const map = new Map<string, { nik: string; name: string; jabatan: string; auto: RekapValues }>();
    // force = status dari Kontrol Cuti Karyawan: selalu diikuti (tidak dibatalkan oleh laporan yang terkirim)
    const ensure = (emp: any, absence: Absence | null, force = false) => {
      const key = (emp.nik || '').toString().trim().toUpperCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          nik: emp.nik, name: emp.name || '-', jabatan: emp.jabatan || '-',
          auto: {
            absence, isCuti: absence !== null, ktaDone: false, tglKta: '', tglTta1: '', tglTta2: null,
            inspeksiDone: false, keteranganInspeksi: '', tglInspeksi: ''
          }
        };
        map.set(key, entry);
      }
      if (absence && (force || (!entry.auto.inspeksiDone && !entry.auto.ktaDone))) {
        entry.auto.isCuti = true;
        entry.auto.absence = absence;
      }
      return entry;
    };

    inspeksiData.rekapList.filter(isValidEmployee).forEach(merged => {
      const { auto } = ensure(merged, null);
      // Cek data dari tiap minggu ISO; Inspeksi hanya direkap ketika sudah lengkap dengan hasil screenshot
      for (const emp of (merged._sources || [merged])) {
        const cd = emp.checkDetails || {};
        const isManual = emp.isManualOverride && emp.status === 'SUDAH';
        const hasCompleteScreenshot = Boolean(cd.ssDone || cd.ssUrl || emp.ssUrl || isManual);
        const isComplete = (emp.status === 'SUDAH' || (cd.pdfDone && cd.ssDone)) && hasCompleteScreenshot;
        // Ambil tanggal dalam periode (prioritaskan tanggal bukti screenshot karena melengkapi inspeksi)
        const tgl = pickInPeriod(weekRange, cd.ssTimestamp, cd.pdfTimestamp, emp.completedAt);
        const done = isComplete && (isManual || tgl !== null);

        if (done) {
          auto.inspeksiDone = true;
          auto.keteranganInspeksi = emp.pdfTitle || cd.pdfTitle || 'Inspeksi Selesai';
          auto.tglInspeksi = tgl !== null ? toIsoDate(parseLocalDate(tgl)) : '√';
          break;
        }
      }
    });
    // SINKRONISASI MUTLAK DENGAN JADWAL INSPEKSI BERJALAN:
    // 1. 44 Petugas Aktif pada Jadwal Inspeksi HARUS masuk target wajib KTA/TTA & Inspeksi (isCuti = false)
    // 2. 19 Karyawan Cuti pada Jadwal Inspeksi HARUS berstatus Cuti (isCuti = true)
    const schedActiveKeys = new Set<string>();
    const schedActiveNames = new Set<string>();
    const schedCutiKeys = new Set<string>();
    const schedCutiNames = new Set<string>();

    if (activeInspectionSchedule && Array.isArray(activeInspectionSchedule) && activeInspectionSchedule.length > 0) {
      activeInspectionSchedule.forEach((item: any) => {
        const k = (item.nik || '').toString().trim().toUpperCase();
        const n = (item.name || '').toString().trim().toLowerCase();
        if (item.isCuti) {
          if (k) schedCutiKeys.add(k);
          if (n) schedCutiNames.add(n);
          ensure(item, 'CUTI', true);
        } else {
          if (k) schedActiveKeys.add(k);
          if (n) schedActiveNames.add(n);
          ensure(item, null, false);
        }
      });
    } else {
      // Fallback jika inspection-schedule belum termuat: gunakan rekapList & cutiList
      inspeksiData.rekapList.filter(isValidEmployee).forEach(emp => {
        if (emp.nik) schedActiveKeys.add(emp.nik.toString().trim().toUpperCase());
        if (emp.name) schedActiveNames.add(emp.name.toString().trim().toLowerCase());
        ensure(emp, null);
      });
      [...inspeksiData.cutiList, ...ktaData.cutiList].filter(isValidEmployee).forEach(emp => {
        if (emp.nik) schedCutiKeys.add(emp.nik.toString().trim().toUpperCase());
        if (emp.name) schedCutiNames.add(emp.name.toString().trim().toLowerCase());
        ensure(emp, 'CUTI', true);
      });
    }

    const isSchedActive = (nik?: string, name?: string) => {
      const k = (nik || '').toString().trim().toUpperCase();
      const n = (name || '').toString().trim().toLowerCase();
      if (k && schedActiveKeys.has(k)) return true;
      if (n && schedActiveNames.has(n)) return true;
      for (const sName of schedActiveNames) {
        if (n && (sName === n || n.includes(sName) || sName.includes(n))) return true;
      }
      return false;
    };

    const isSchedCuti = (nik?: string, name?: string) => {
      const k = (nik || '').toString().trim().toUpperCase();
      const n = (name || '').toString().trim().toLowerCase();
      if (k && schedCutiKeys.has(k)) return true;
      if (n && schedCutiNames.has(n)) return true;
      for (const sName of schedCutiNames) {
        if (n && (sName === n || n.includes(sName) || sName.includes(n))) return true;
      }
      return false;
    };

    // Gabungkan riwayat laporan KTA/TTA yang sudah masuk
    ktaData.rekapList.filter(isValidEmployee).forEach(emp => {
      const entry = ensure(emp, null);
      Object.assign(entry.auto, buildKtaCells(emp, weekRange));
    });

    // Terapkan status cuti resmi: selalu ikuti Jadwal Inspeksi
    for (const [key, entry] of map.entries()) {
      if (isSchedCuti(entry.nik, entry.name)) {
        // 19 ORANG CUTI PADA JADWAL INSPEKSI: SELALU CUTI
        entry.auto.isCuti = true;
        entry.auto.absence = 'CUTI';
      } else if (isSchedActive(entry.nik, entry.name)) {
        // 44 PETUGAS AKTIF PADA JADWAL INSPEKSI: WAJIB KTA/TTA & INSPEKSI
        entry.auto.isCuti = false;
        entry.auto.absence = null;
      }
    }

    // Pastikan seluruh 44 personil wajib memiliki perhitungan sel KTA/TTA
    for (const [, entry] of map.entries()) {
      if (!entry.auto.isCuti && !entry.auto.tglKta && !entry.auto.tglTta1) {
        Object.assign(entry.auto, buildKtaCells(entry, weekRange));
      }
    }

    const editMap = new Map(edits.map(e => [String(e.nik).trim().toUpperCase(), e]));
    const ownKey = (inspectorNik || '').trim().toUpperCase();
    return Array.from(map.entries())
      .filter(([key, e]) => {
        const j = (e.jabatan || '').toLowerCase();
        const n = (e.nik || key || '').toUpperCase();
        // Eksklusi mutlak Golongan I (Crew / Operator / Non-Staff) dari rekap KTA/TTA & Inspeksi
        if (n === 'M0201250032' || j.includes('crew') || j.includes('operator')) return false;
        return canEdit || key === ownKey;
      })
      .map(([key, e]) => {
        const edit = editMap.get(key);
        const v = applyEdit(e.auto, edit, weekRange);
        return {
          ...e, ...v, edit,
          ktaLate: v.ktaDone && [v.tglKta, v.tglTta1, v.tglTta2].some(isLateDate),
          inspeksiLate: v.inspeksiDone && isLateDate(v.tglInspeksi)
        };
      })
      .sort((a, b) => jabatanRank(a.jabatan) - jabatanRank(b.jabatan) || a.name.localeCompare(b.name));
  }, [inspeksiData, ktaData, leaveList, activeInspectionSchedule, edits, weekRange, canEdit, inspectorNik]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.nik || '').toLowerCase().includes(q) && !r.jabatan.toLowerCase().includes(q)) return false;
      if (statusFilter === 'CUTI') return r.isCuti;
      if (statusFilter === 'TERLAMBAT') return !r.isCuti && (r.ktaLate || r.inspeksiLate);
      if (statusFilter === 'LENGKAP') return !r.isCuti && r.ktaDone && r.inspeksiDone;
      if (statusFilter === 'BELUM') return !r.isCuti && (!r.ktaDone || !r.inspeksiDone);
      return true;
    });
  }, [allRows, search, statusFilter]);

  const summary = useMemo<RekapSummary>(() => {
    const active = allRows.filter(r => !r.isCuti);
    const kta = active.filter(r => r.ktaDone).length;
    const insp = active.filter(r => r.inspeksiDone).length;
    const absence = Object.fromEntries(ABSENCE_KEYS.map(k => [k, 0])) as Record<Absence, number>;
    allRows.forEach(r => { if (r.absence) absence[r.absence]++; });
    return {
      total: active.length,
      cuti: allRows.length - active.length,
      absence,
      kta, insp,
      lengkap: active.filter(r => r.ktaDone && r.inspeksiDone).length,
      belum: active.filter(r => !r.ktaDone || !r.inspeksiDone).length,
      ktaPct: active.length ? Math.round((kta / active.length) * 100) : 0,
      inspPct: active.length ? Math.round((insp / active.length) * 100) : 0,
      ktaLate: active.filter(r => r.ktaLate).length,
      inspLate: active.filter(r => r.inspeksiLate).length
    };
  }, [allRows]);

  const handleDownloadPng = async () => {
    setExportingPng(true);
    const toastId = toast.loading('Menyiapkan gambar rekap...');
    try {
      // Tunggu lembar laporan ter-render & foto selesai dimuat
      await new Promise(r => setTimeout(r, 100));
      const node = captureRef.current;
      if (!node) throw new Error('Lembar laporan belum siap');
      await Promise.all(Array.from(node.querySelectorAll('img')).map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => { img.style.display = 'none'; res(); }; })
      ));
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      });
      const link = document.createElement('a');
      link.download = `Rekap_KTA_TTA_Inspeksi_${selectedWeek}_${currentYear}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Gambar rekap berhasil diunduh (PNG)', { id: toastId });
    } catch (err: any) {
      console.error('Export PNG rekap error:', err);
      toast.error('Gagal mengunduh PNG: ' + (err?.message || 'kesalahan rendering'), { id: toastId });
    } finally {
      setExportingPng(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      const header = ['NO', 'Nama Karyawan', 'NIK', 'Jabatan', '(KTA/TTA)', 'TANGGAL KTA', 'TANGGAL TTA 1', 'TANGGAL TTA 2', '(INSPEKSI)', 'KETERANGAN INSPEKSI', 'TANGGAL INSPEKSI'];
      const absLabel = (r: RekapRow) => (r.absence ? ABSENCE_OPTIONS[r.absence].excel : '');
      const dateVal = (v: DateVal, r: RekapRow) =>
        (r.absence ? absLabel(r) : v === null ? '-' : `${formatShortDate(v)}${isLateDate(v) ? ' (TERLAMBAT)' : ''}`);
      const doneVal = (done: boolean, late: boolean) => (done ? (late ? '√ TERLAMBAT' : '√') : '');
      const aoa: any[][] = [
        [reportMonth],
        [rangeLabel],
        header,
        ...allRows.map((r, i) => [
          i + 1, r.name, r.nik, r.jabatan,
          r.absence ? absLabel(r) : doneVal(r.ktaDone, r.ktaLate),
          dateVal(r.tglKta, r), dateVal(r.tglTta1, r), dateVal(r.tglTta2, r),
          r.absence ? absLabel(r) : doneVal(r.inspeksiDone, r.inspeksiLate),
          r.absence ? absLabel(r) : r.keteranganInspeksi,
          r.isCuti ? '' : dateVal(r.tglInspeksi, r)
        ]),
        [],
        ['', 'RINGKASAN', '', '', 'KTA/TTA', '', '', '', 'INSPEKSI'],
        ['', 'ADA (√)', '', '', summary.kta, '', '', '', summary.insp],
        ['', 'TERLAMBAT (KAMIS/JUMAT)', '', '', summary.ktaLate, '', '', '', summary.inspLate],
        ...ABSENCE_KEYS.map(k => ['', ABSENCE_OPTIONS[k].excel, '', '', summary.absence[k], '', '', '', summary.absence[k]]),
        ['', 'TIDAK ADA KTA/TTA /INSPEKSI', '', '', summary.total - summary.kta, '', '', '', summary.total - summary.insp]
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } }
      ];
      ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 11 }, { wch: 55 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Rekap_${selectedWeek}`);
      const diagramAoa: any[][] = [
        ['REKAPITULASI DIAGRAM CAPAIAN K3 (KTA/TTA & INSPEKSI)'],
        [`Periode: ${selectedWeek} (${rangeLabel}) - Tahun ${currentYear}`],
        [],
        ['INDIKATOR KINERJA K3', 'TARGET PERSONIL', 'AKTUAL TERCAPAI', 'PERSENTASE (%)', 'STATUS CAPAIAN'],
        ['Hazard Report (KTA/TTA)', summary.total, summary.kta, `${summary.ktaPct}%`, summary.ktaPct >= 100 ? 'TERCAPAI 100%' : 'BELUM TERCAPAI'],
        ['Inspeksi Terencana', summary.total, summary.insp, `${summary.inspPct}%`, summary.inspPct >= 100 ? 'TERCAPAI 100%' : 'BELUM TERCAPAI'],
        ['Lengkap Keduanya (KTA & Insp)', summary.total, summary.lengkap, `${summary.total ? Math.round((summary.lengkap / summary.total) * 100) : 0}%`, '-'],
        [],
        ['RINCIAN KEPATUHAN WAKTU & KEHADIRAN', 'JUMLAH PERSONIL', 'PERSENTASE (%)'],
        ['Tepat Waktu (Sabtu - Rabu)', summary.total - summary.ktaLate, `${summary.total ? Math.round(((summary.total - summary.ktaLate) / summary.total) * 100) : 0}%`],
        ['Terlambat (Kamis - Jumat)', summary.ktaLate + summary.inspLate, '-'],
        ['Personil Cuti / Non-Target', summary.cuti, `${allRows.length ? Math.round((summary.cuti / allRows.length) * 100) : 0}%`]
      ];
      const wsDiagram = XLSX.utils.aoa_to_sheet(diagramAoa);
      wsDiagram['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsDiagram, 'Diagram');
      XLSX.writeFile(wb, `Rekap_KTA_TTA_Inspeksi_${selectedWeek}_${currentYear}.xlsx`);
      toast.success('File Excel berhasil diunduh');
    } catch (err) {
      console.error('Error exporting rekap safety:', err);
      toast.error('Gagal mengunduh file Excel');
    }
  };

  // ─── Cell renderers ───
  const td = 'px-3 py-2.5 border-b border-[var(--border-main)] text-[13px] align-middle';
  const naStyle: React.CSSProperties = {
    backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 6px, transparent 6px 12px)'
  };

  const statusBadge = (done: boolean, late = false) => done && late ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white ring-1 ring-inset ring-red-700 text-[11px] font-bold" title="Diselesaikan hari Kamis/Jumat">
      <Clock className="w-3.5 h-3.5" /> Terlambat
    </span>
  ) : done ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/25 text-[11px] font-bold">
      <CheckCircle2 className="w-3.5 h-3.5" /> Lengkap
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-inset ring-rose-500/25 text-[11px] font-bold">
      <CircleDashed className="w-3.5 h-3.5" /> Belum
    </span>
  );

  const dateCell = (v: DateVal, key: string) => {
    if (v === null) {
      return <td key={key} className={`${td} bg-slate-900 dark:bg-black border-l border-l-slate-800`} style={naStyle} title="Tidak wajib" />;
    }
    if (v === '') {
      return <td key={key} className={`${td} text-center border-l border-l-[var(--border-main)]`}><span className="text-rose-400 dark:text-rose-500 font-bold">—</span></td>;
    }
    if (isLateDate(v)) {
      return (
        <td key={key} className={`${td} text-center whitespace-nowrap tabular-nums font-bold border-l border-l-[var(--border-main)] bg-red-500 text-white dark:bg-red-600`} title="Terlambat — diselesaikan hari Kamis/Jumat">
          {formatShortDate(v)}
        </td>
      );
    }
    return (
      <td key={key} className={`${td} text-center whitespace-nowrap tabular-nums font-medium border-l border-l-[var(--border-main)]`}>
        {v === '√' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : formatShortDate(v)}
      </td>
    );
  };

  const filterChips: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'Semua', count: allRows.length },
    { id: 'BELUM', label: 'Belum Lengkap', count: summary.belum },
    { id: 'LENGKAP', label: 'Lengkap', count: summary.lengkap },
    { id: 'TERLAMBAT', label: 'Terlambat (Kamis/Jumat)', count: allRows.filter(r => !r.isCuti && (r.ktaLate || r.inspeksiLate)).length },
    { id: 'CUTI', label: 'Tidak Hadir / Non-Target', count: summary.cuti }
  ];

  const th = 'px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-[var(--border-main)] whitespace-nowrap';
  const colCount = canEdit ? 11 : 10;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full px-2 sm:px-4 lg:px-6">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-x-3 gap-y-2"><SafetyModuleSwitch active="rekap" /> Rekap KTA/TTA & Inspeksi</span>}
        description="Kepatuhan mingguan laporan observasi KTA/TTA dan inspeksi terencana Prep & Lab"
        icon={<ClipboardList />}
      >
        {onBack && (
          <button onClick={onBack} className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        )}
      </PageHeader>

      <div className="inline-grid grid-cols-3 gap-1 bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--border-main)]">
        {([
          { id: 'tabel', label: 'Tabel Rekap', icon: <Table2 className="w-3.5 h-3.5" /> },
          { id: 'diagram', label: 'Diagram', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'detail', label: 'Detail & Aksi Personil', icon: <Users className="w-3.5 h-3.5" /> }
        ] as const).filter(t => canEdit || t.id === 'tabel').map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              view === t.id ? 'bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {view === 'diagram' ? (
        <SafetyRekapDiagram
          year={currentYear}
          activeWeek={selectedWeek}
          activeWeekSummary={summary}
        />
      ) : view === 'detail' ? (
        <GroupReportScreen
          mode="rekap"
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          inspectorRole={inspectorRole}
          inspectorSection={inspectorSection}
          initialWeek={selectedWeek}
        />
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Personil Wajib</p>
              <p className="text-2xl font-black text-[var(--text-main)] mt-1">{summary.total}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{summary.lengkap} lengkap · {summary.belum} belum</p>
            </div>
            {[
              { label: 'KTA / TTA', done: summary.kta, pct: summary.ktaPct, bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
              { label: 'Inspeksi Terencana', done: summary.insp, pct: summary.inspPct, bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
            ].map(k => (
              <div key={k.label} className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{k.label}</p>
                  <p className={`text-sm font-black ${k.text}`}>{k.pct}%</p>
                </div>
                <p className="text-2xl font-black text-[var(--text-main)] mt-1">{k.done}<span className="text-base text-[var(--text-muted)] font-bold">/{summary.total}</span></p>
                <div className="h-1.5 mt-2 rounded-full bg-[var(--input-bg)] overflow-hidden">
                  <div className={`h-full rounded-full ${k.bar} transition-all duration-500`} style={{ width: `${k.pct}%` }} />
                </div>
              </div>
            ))}
            <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Tidak Hadir / Non-Target</p>
              <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">{summary.cuti}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {ABSENCE_KEYS.filter(k => summary.absence[k] > 0).map(k => (
                  <span key={k} className={`px-1.5 py-px rounded text-[10px] font-bold ${ABSENCE_OPTIONS[k].screen}`}>
                    {ABSENCE_OPTIONS[k].label} {summary.absence[k]}
                  </span>
                ))}
                {summary.cuti === 0 && <span className="text-[11px] text-[var(--text-muted)]">Tidak dihitung dalam target</span>}
              </div>
            </div>
          </div>

          {/* Tabel */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-3 p-3 sm:p-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-3 min-w-0 xl:mr-auto">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-[var(--text-main)] leading-tight">{reportMonth}</h2>
                  <p className="text-xs text-[var(--text-muted)]">{selectedWeek} · {rangeLabel}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="sm:w-64 [&>div]:mb-0">
                  <Select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                    {weekOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </div>
                <div className="relative sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama, NIK, jabatan..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchData(selectedWeek, true)}
                    disabled={loading}
                    className="h-10 flex-1 sm:flex-none px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                  </button>
                  <button
                    onClick={handleDownloadExcel}
                    disabled={loading || rows.length === 0}
                    className="h-10 flex-1 sm:flex-none px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button
                    onClick={handleDownloadPng}
                    disabled={loading || exportingPng || allRows.length === 0}
                    className="h-10 flex-1 sm:flex-none px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {exportingPng ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />} PNG
                  </button>
                </div>
              </div>
            </div>

            {/* Filter status */}
            <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-[var(--border-main)] bg-[var(--input-bg)]/50">
              {filterChips.map(c => (
                <button
                  key={c.id}
                  onClick={() => setStatusFilter(c.id)}
                  className={`h-7 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    statusFilter === c.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {c.label}
                  <span className={`px-1.5 rounded-full text-[10px] ${statusFilter === c.id ? 'bg-white/20 dark:bg-slate-900/15' : 'bg-[var(--input-bg)]'}`}>{c.count}</span>
                </button>
              ))}
              {!canEdit && (
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">Mode personal · hanya data Anda (edit: Administration, Developer & Manager)</span>
              )}
            </div>

            <div className="overflow-auto max-h-[72vh]">
              <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-[var(--text-main)]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th colSpan={3} className={`${th} text-left`}>Identitas Karyawan</th>
                    <th colSpan={4} className={`${th} text-center border-l border-l-[var(--border-main)] !text-amber-700 dark:!text-amber-400`}>
                      <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Observasi KTA / TTA</span>
                    </th>
                    <th colSpan={3} className={`${th} text-center border-l border-l-[var(--border-main)] !text-emerald-700 dark:!text-emerald-400`}>
                      <span className="inline-flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Inspeksi Terencana</span>
                    </th>
                    {canEdit && <th className={`${th} border-l border-l-[var(--border-main)]`} />}
                  </tr>
                  <tr>
                    <th className={`${th} w-12 text-center`}>No</th>
                    <th className={`${th} text-left`}>Nama / NIK</th>
                    <th className={`${th} text-left`}>Jabatan</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Status</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Tgl KTA</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Tgl TTA 1</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Tgl TTA 2</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Status</th>
                    <th className={`${th} text-left border-l border-l-[var(--border-main)]`}>Keterangan Inspeksi</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Tgl Inspeksi</th>
                    {canEdit && <th className={`${th} w-16 text-center border-l border-l-[var(--border-main)]`}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading && allRows.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="px-3 py-16 text-center text-sm text-[var(--text-muted)]">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Memuat rekap {selectedWeek}...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="px-3 py-16 text-center text-sm text-[var(--text-muted)]">Tidak ada data yang cocok untuk {selectedWeek}.</td>
                    </tr>
                  ) : rows.map((r, i) => (
                    <tr key={r.nik} className="group hover:bg-[var(--input-bg)]/70 transition-colors">
                      <td className={`${td} text-center text-[var(--text-muted)] tabular-nums`}>{i + 1}</td>
                      <td className={td}>
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <EmployeeAvatar name={r.name} photo={photoMap.get(r.nik.trim().toUpperCase())} className="w-9 h-9 text-[11px]" />
                          <div className="min-w-0">
                            <p className="font-semibold leading-tight flex items-center gap-1.5">
                              {r.name}
                              {r.edit && (
                                <span title={`Diedit oleh ${r.edit.updatedByName || r.edit.updatedByNik}${r.edit.catatan ? ` — ${r.edit.catatan}` : ''}`} className="inline-flex items-center gap-0.5 px-1.5 py-px rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase">
                                  <Pencil className="w-2.5 h-2.5" /> Edit
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] font-mono text-[var(--text-muted)]">{r.nik}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`${td} text-[var(--text-muted)] min-w-[180px]`}>{r.jabatan}</td>

                      {r.absence ? (
                        <td colSpan={7} className={`${td} border-l border-l-[var(--border-main)] ${ABSENCE_OPTIONS[r.absence].screen}`}>
                          <InlineAbsencePopover
                            row={r}
                            disabled={!canEdit}
                            onSave={(absenceStatus) => handleInlineSave(r, { absenceStatus })}
                          />
                        </td>
                      ) : (
                        <>
                          {/* STATUS KTA/TTA: Klik langsung untuk toggle status selesai */}
                          <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => handleInlineSave(r, { ktaDone: !r.ktaDone })}
                                className="cursor-pointer hover:opacity-80 active:scale-95 transition-transform"
                                title="Klik langsung untuk toggle Status KTA/TTA"
                              >
                                {statusBadge(r.ktaDone, r.ktaLate)}
                              </button>
                            ) : (
                              statusBadge(r.ktaDone, r.ktaLate)
                            )}
                          </td>

                          {/* TGL KTA: Klik langsung untuk ubah tanggal */}
                          <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>
                            <InlineDatePopover
                              value={r.tglKta}
                              period={weekRange}
                              disabled={!canEdit}
                              onSave={(tglKta) => handleInlineSave(r, { tglKta })}
                            />
                          </td>

                          {/* TGL TTA 1: Klik langsung untuk ubah tanggal */}
                          <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>
                            <InlineDatePopover
                              value={r.tglTta1}
                              period={weekRange}
                              disabled={!canEdit}
                              onSave={(tglTta1) => handleInlineSave(r, { tglTta1 })}
                            />
                          </td>

                          {/* TGL TTA 2: Klik langsung untuk ubah tanggal */}
                          <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>
                            <InlineDatePopover
                              value={r.tglTta2}
                              period={weekRange}
                              disabled={!canEdit}
                              onSave={(tglTta2) => handleInlineSave(r, { tglTta2 })}
                            />
                          </td>

                          {/* STATUS INSPEKSI: Klik langsung untuk toggle status selesai */}
                          <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => handleInlineSave(r, { inspeksiDone: !r.inspeksiDone })}
                                className="cursor-pointer hover:opacity-80 active:scale-95 transition-transform"
                                title="Klik langsung untuk toggle Status Inspeksi"
                              >
                                {statusBadge(r.inspeksiDone, r.inspeksiLate)}
                              </button>
                            ) : (
                              statusBadge(r.inspeksiDone, r.inspeksiLate)
                            )}
                          </td>

                          {/* KETERANGAN INSPEKSI: Klik langsung untuk edit teks */}
                          <td className={`${td} border-l border-l-[var(--border-main)] min-w-[260px]`}>
                            <InlineTextPopover
                              value={r.keteranganInspeksi}
                              disabled={!canEdit}
                              onSave={(keteranganInspeksi) => handleInlineSave(r, { keteranganInspeksi })}
                            />
                          </td>

                          {/* TGL INSPEKSI: Klik langsung untuk ubah tanggal */}
                          <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>
                            <InlineDatePopover
                              value={r.tglInspeksi}
                              period={weekRange}
                              disabled={!canEdit}
                              onSave={(tglInspeksi) => handleInlineSave(r, { tglInspeksi })}
                            />
                          </td>
                        </>
                      )}

                      {canEdit && (
                        <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>
                          <button
                            onClick={() => setEditingRow(r)}
                            className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 cursor-pointer transition-colors"
                            title={`Edit rekap ${r.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 border-t border-[var(--border-main)] text-[11px] text-[var(--text-muted)]">
              <span>Menampilkan <b className="text-[var(--text-main)]">{rows.length}</b> dari {allRows.length} personil</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-slate-900 inline-block rounded-sm" style={naStyle} /> Tidak wajib</span>
              <span className="flex items-center gap-1.5"><span className="text-rose-500 font-bold">—</span> Belum dipenuhi</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-red-500 inline-block rounded-sm" /> Terlambat (selesai Kamis/Jumat)</span>
              <span className="flex items-center gap-1.5"><Pencil className="w-3 h-3 text-amber-600" /> Dikoreksi manual</span>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-sm overflow-hidden p-3 sm:p-4">
            <SummaryRows summary={summary} variant="screen" />
          </div>

          {/* Lembar tersembunyi untuk ekspor PNG */}
          {exportingPng && (
            <div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
              <RekapReportSheet
                ref={captureRef}
                rows={allRows}
                photoMap={photoMap}
                summary={summary}
                reportMonth={reportMonth}
                rangeLabel={rangeLabel}
                week={selectedWeek}
              />
            </div>
          )}
        </>
      )}

      {editingRow && (
        <EditRowDialog
          row={editingRow}
          week={selectedWeek}
          year={currentYear}
          editorNik={inspectorNik}
          editorName={inspectorName}
          period={weekRange}
          onClose={() => setEditingRow(null)}
          onSaved={() => { setEditingRow(null); fetchEdits(selectedWeek); }}
        />
      )}
    </div>
  );
}
