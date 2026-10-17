import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  CalendarRange, RefreshCw, ImageDown, Search, ArrowLeft, Moon, Sun, Clock, CheckCircle2,
  CircleDashed, Palmtree, UserX, StickyNote, FlaskConical, Wrench, Layers, Boxes, Users, AlertCircle
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { PageHeader } from './PageHeader';
import { INSPECTION_29_AGENDAS, matchTicketToAgenda, InspectionAgendaItem } from '../utils/inspection-pic-matcher';
import { getISOWeek } from '../utils/iso-week';
import { getRekapWeek, getRekapWeekRange, EmployeeAvatar, photoForCapture, initials } from './safety-rekap-screen';

interface InspectionScheduleScreenProps {
  inspectorNik: string;
  inspectorName: string;
  onBack?: () => void;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

function formatDdMmYyyy(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function formatShort(ts?: string | null) {
  if (!ts) return '';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// ─── Lembar PNG (warna tetap seperti jadwal Excel) ──────────────────────────

const ScheduleSheet = React.forwardRef<HTMLDivElement, {
  title: string; cards: AgendaCard[]; cuti: Member[]; nonActive: { name: string; note: string }[];
  photoOf: (name: string) => string | undefined;
}>(({ title, cards, cuti, nonActive, photoOf }, ref) => {
  const cutiCols = 4;
  const perCol = Math.max(8, Math.ceil(cuti.length / cutiCols));
  return (
    <div ref={ref} style={{ width: 1800 }} className="bg-white p-6 font-sans text-slate-900">
      <div className="text-center py-3 mb-5 font-black text-2xl tracking-wide" style={{ backgroundColor: '#FFFF00', border: '2px solid #000' }}>
        {title}
      </div>
      <div className="grid grid-cols-5 gap-4">
        {cards.map(c => {
          const cat = CATEGORY[c.category];
          return (
            <div key={c.key} className="flex flex-col" style={{ border: '2px solid #1f2937' }}>
              <div className="px-2 py-1.5 text-center font-bold text-[13px] leading-snug" style={{ backgroundColor: cat.print }}>{c.title}</div>
              <div className="px-2 py-1 text-center font-bold text-[13px]" style={{ backgroundColor: cat.print, borderTop: `1px solid ${cat.printBorder}` }}>
                {c.shift ? `Shift ${c.shift}` : '-'}
              </div>
              <div className="px-2 py-1.5 space-y-1 min-h-[74px]">
                {c.members.length === 0 && <p className="text-[12px] italic text-slate-400">Belum ada petugas</p>}
                {c.members.map((m, i) => {
                  const photo = photoForCapture(photoOf(m.name));
                  return (
                    <div key={m.name} className="flex items-center gap-2 text-[13px]">
                      <span className="w-4 text-right">{i + 1}</span>
                      <div className="relative w-6 h-6 shrink-0 rounded-full overflow-hidden bg-slate-200 text-[9px] font-black flex items-center justify-center">
                        {initials(m.name)}
                        {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                      </div>
                      <span className="flex-1">{m.name}</span>
                      {m.isCompleted && <span className="text-[11px] font-bold" style={{ color: '#15803D' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex flex-col justify-center px-4 py-3 rounded-2xl" style={{ border: '2px solid #1f2937' }}>
          <p className="text-[13px] font-bold mb-2">Ket. Warna Table/Kotak Jadwal Inspeksi :</p>
          {CATEGORY_ORDER.map(k => (
            <div key={k} className="flex items-center gap-3 text-base font-bold">
              <span className="w-8 h-5 rounded" style={{ backgroundColor: CATEGORY[k].print, border: '1px solid #64748b' }} />
              = {CATEGORY[k].label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-[13px] italic">
        <p className="font-bold not-italic">Note</p>
        {NOTES.map((n, i) => <p key={n}>{i + 1}. {n}</p>)}
      </div>

      <div className="mt-3 flex gap-6 items-start">
        <div className="flex-1">
          <p className="font-black italic text-lg mb-1">Daftar Karyawan Yang Cuti untuk Pengisian KTA/TTA & Inspeksi :</p>
          <div className="grid grid-cols-4" style={{ border: '2px solid #1f2937' }}>
            {Array.from({ length: cutiCols }).map((_, col) => (
              <div key={col}>
                {Array.from({ length: perCol }).map((__, row) => {
                  const idx = col * perCol + row;
                  return (
                    <div key={row} className="flex text-[13px] font-semibold" style={{ borderBottom: '1px solid #94a3b8', borderRight: '1px solid #94a3b8' }}>
                      <span className="w-8 text-center" style={{ borderRight: '1px solid #94a3b8' }}>{idx + 1}</span>
                      <span className="px-1.5 flex-1 truncate">{cuti[idx]?.name || ' '}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="w-[320px]">
          <p className="font-bold italic text-[12px] mb-1 text-right">Daftar Karyawan yang Resign/Dinas/Mutasi/Sakit/New Hire :</p>
          <div style={{ border: '2px solid #1f2937' }}>
            {Array.from({ length: Math.max(8, nonActive.length) }).map((_, i) => (
              <div key={i} className="flex text-[13px] font-semibold" style={{ borderBottom: '1px solid #94a3b8' }}>
                <span className="w-8 text-center" style={{ borderRight: '1px solid #94a3b8' }}>{nonActive[i] ? i + 1 : ' '}</span>
                <span className="px-1.5 flex-1 truncate">{nonActive[i] ? `${nonActive[i].name}${nonActive[i].note ? ` (${nonActive[i].note})` : ''}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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
  photoOf: (name: string) => string | undefined;
}>(({ rows, dates, filterLabel, onsiteCount, photoOf }, ref) => {
  const th = 'border border-slate-400 bg-slate-200 px-2 py-2 text-[11px] font-bold uppercase text-slate-800';
  const td = 'border border-slate-300 px-2 py-1.5 text-[12px] text-slate-900';
  const chip = (code: string, cat: LeaveCat) => (
    <span className="inline-block min-w-[44px] px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ backgroundColor: LEAVE_PRINT[cat].bg, color: LEAVE_PRINT[cat].fg }}>{code || '-'}</span>
  );
  const perCat = LEAVE_FILTERS.map(k => ({ k, n: rows.filter(r => r.days.some(d => d.category === k)).length }));
  return (
    <div ref={ref} style={{ width: 1400 }} className="bg-white p-8 font-sans text-slate-900">
      <div className="flex items-end justify-between border-b-4 border-slate-900 pb-3 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Prep & Lab · Jadwal Inspeksi</p>
          <h1 className="text-3xl font-black">Kontrol Cuti Karyawan</h1>
          <p className="text-sm text-slate-600 mt-0.5">Filter: {filterLabel} · Sumber: Database Roster Prep & Lab</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black">Senin – Rabu</p>
          <p className="text-sm font-semibold text-slate-600">{formatIsoLong(dates[0])} – {formatIsoLong(dates[2])}</p>
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
            {dates.map(d => {
              const [y, m, dd] = d.split('-').map(Number);
              return <th key={d} className={th}>{DAY_NAMES[new Date(y, m - 1, dd).getDay()]}<br /><span className="font-medium normal-case">{dd} {MONTHS_SHORT[m - 1]}</span></th>;
            })}
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
                {r.days.map(d => <td key={d.date} className={`${td} text-center`}>{chip(d.code, d.category)}</td>)}
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

function LeaveControlPanel({ period, photoOf }: { period: { start: Date }; photoOf: (name: string) => string | undefined }) {
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
              Roster Senin – Rabu ({formatIsoLong(dates[0])} – {formatIsoLong(dates[2])}) · sumber: Database Roster Prep & Lab
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
          <LeaveSheet ref={captureRef} rows={visible} dates={dates} filterLabel={filter === 'ALL' ? 'Semua Tidak Onsite' : LEAVE_STYLE[filter].label} onsiteCount={onsiteCount} photoOf={photoOf} />
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
              {dates.map(d => {
                const [y, m, dd] = d.split('-').map(Number);
                return (
                  <th key={d} className={`${th} text-center border-l border-l-[var(--border-main)]`}>
                    {DAY_NAMES[new Date(y, m - 1, dd).getDay()]}<span className="block font-medium normal-case tracking-normal text-[10px] opacity-70">{dd} {MONTHS_SHORT[m - 1]}</span>
                  </th>
                );
              })}
              <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Awal Cuti / TRV</th>
              <th className={`${th} text-center`}>Akhir Cuti / TRV</th>
              <th className={`${th} text-center`}>Kembali Onsite</th>
              <th className={`${th} text-center`}>Hari</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Membaca roster dari Google Sheet...</td></tr>
            ) : error ? (
              <tr><td colSpan={10} className="px-3 py-12 text-center text-sm text-rose-600 dark:text-rose-400"><AlertCircle className="w-4 h-4 inline mr-1.5" />{error}</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]">Tidak ada karyawan yang cocok.</td></tr>
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
                {r.days.map(d => (
                  <td key={d.date} className={`${td} text-center border-l border-l-[var(--border-main)]`}>{codeChip(d.code, d.category)}</td>
                ))}
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

// ─── Layar utama ────────────────────────────────────────────────────────────

export function InspectionScheduleScreen({ inspectorNik, inspectorName, onBack }: InspectionScheduleScreenProps) {
  const today = useMemo(() => new Date(), []);
  const { week: currentWeek, year: currentYear } = useMemo(() => getRekapWeek(today), [today]);
  // Google Sheet jadwal hanya menyimpan jadwal minggu berjalan (sheet "CurrentWeek"),
  // jadi layar ini selalu menampilkan week aktif (periode Sabtu – Jumat).
  const selectedWeek = currentWeek;
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

  const period = useMemo(() => getRekapWeekRange(currentYear, selectedWeek), [currentYear, selectedWeek]);
  const sheetTitle = `JADWAL INSPEKSI PREPARASI - LAB WEEK ${selectedWeek} ( ${formatDdMmYyyy(period.start)} - ${formatDdMmYyyy(period.end)} )`;

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
      // Status selesai dihitung server per minggu ISO; gunakan minggu ISO Senin–Jumat dari periode Sabtu–Jumat
      const isoTag = `W${getISOWeek(getRekapWeekRange(currentYear, week).end)}`;
      const res = await fetch(`/api/inspection-schedule?sheet=CurrentWeek&week=${isoTag}${refresh ? '&refresh=true' : ''}`);
      const json = res.ok ? await res.json() : null;
      const data: any[] = json?.data || [];
      setSchedule(data);
      setAgendaShifts(json?.agendaShifts || []);
      setSheetName(data.length ? 'CurrentWeek' : '');
      if (!data.length) setLoadError(json?.error ? 'Gagal membaca jadwal dari Google Sheet.' : 'Jadwal minggu ini belum tersedia di Google Sheet.');
    } catch (err: any) {
      console.error('Gagal memuat jadwal inspeksi:', err);
      setSchedule([]);
      setLoadError('Gagal memuat jadwal inspeksi dari server.');
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => { fetchSchedule(selectedWeek); }, [selectedWeek, fetchSchedule]);

  // Susun 29 kartu agenda + agenda tambahan yang tidak dikenali
  const { cards, cuti, nonActive } = useMemo(() => {
    const byAgenda = new Map<number, Member[]>();
    const extra = new Map<string, Member[]>();
    const cutiList: Member[] = [];
    const nonActiveList: { name: string; note: string }[] = [];

    schedule.forEach((s: any) => {
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
      const fromSheet = sheetShift.get(agenda ? agenda.id : title.trim().toLowerCase());
      const shift = fromSheet ? shiftGroup(fromSheet) : sorted.length ? shiftGroup(sorted[0].shift) : null;
      return { key, title, agenda, category, members: sorted, shift };
    };

    const list: AgendaCard[] = [
      ...INSPECTION_29_AGENDAS.map(a => toCard(`a${a.id}`, a.name, a, AGENDA_CATEGORY[a.id] || 'OTHER', byAgenda.get(a.id) || [])),
      ...Array.from(extra.entries()).map(([title, members]) => toCard(`x-${title}`, title, null, 'OTHER', members))
    ];
    list.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || (a.agenda?.id ?? 99) - (b.agenda?.id ?? 99));
    return { cards: list, cuti: cutiList.sort((a, b) => a.name.localeCompare(b.name)), nonActive: nonActiveList };
  }, [schedule, agendaShifts]);

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
          ) : c.members.map(m => (
            <div key={m.name} className="flex items-center gap-2.5">
              <EmployeeAvatar name={m.name} photo={photoOf(m.name)} className="w-8 h-8 text-[10px]" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--text-main)] truncate">{m.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  {m.roleIndex === 1 ? 'Inspektor Utama' : 'Pendamping'}{m.jabatan ? ` · ${m.jabatan}` : ''}
                </p>
              </div>
              {m.isCompleted && (
                <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400" title="Laporan inspeksi sudah terkirim">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {formatShort(m.completedAt)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const groupedVisible = CATEGORY_ORDER
    .map(k => ({ key: k, cards: visibleCards.filter(c => c.category === k) }))
    .filter(g => g.cards.length > 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full px-2 sm:px-4 lg:px-6">
      <PageHeader
        title="Jadwal Inspeksi"
        description="Jadwal inspeksi terencana mingguan Preparasi & Laboratorium (periode Sabtu – Jumat)"
        icon={<CalendarRange />}
      >
        {onBack && (
          <button onClick={onBack} className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        )}
      </PageHeader>

      {/* Banner minggu */}
      <div className="rounded-2xl overflow-hidden border border-yellow-300 dark:border-yellow-500/40 shadow-sm">
        <div className="bg-gradient-to-r from-yellow-300 via-yellow-200 to-amber-200 dark:from-yellow-500/25 dark:via-yellow-500/15 dark:to-amber-500/15 px-4 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-900/70 dark:text-yellow-200/70">Jadwal Inspeksi Preparasi – Lab</p>
          <h2 className="text-base sm:text-xl font-black text-yellow-950 dark:text-yellow-100">
            WEEK {selectedWeek} <span className="font-bold">({formatDdMmYyyy(period.start)} – {formatDdMmYyyy(period.end)})</span>
          </h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-3 shadow-sm flex flex-col xl:flex-row xl:items-center gap-2">
        <div className="h-10 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] whitespace-nowrap">
          <CalendarRange className="w-4 h-4 text-[var(--primary)]" /> Week {selectedWeek} [Aktif]
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari agenda atau nama petugas..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchSchedule(selectedWeek, true)}
            disabled={loading}
            className="h-10 flex-1 xl:flex-none px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
          </button>
          <button
            onClick={handleDownloadPng}
            disabled={loading || exportingPng || schedule.length === 0}
            className="h-10 flex-1 xl:flex-none px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
          >
            {exportingPng ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />} Download PNG
          </button>
        </div>
      </div>

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
        {sheetName && <span className="ml-auto text-[11px] text-[var(--text-muted)]">Sumber: Google Sheet "{sheetName}"</span>}
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
          <p className="text-xs text-[var(--text-muted)] mt-1">Tekan Segarkan setelah Google Sheet jadwal diperbarui.</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
                {g.cards.map(renderCard)}
              </div>
            </section>
          ))}
          {groupedVisible.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">Tidak ada agenda yang cocok dengan pencarian.</p>
          )}
        </div>
      )}

      {/* Kontrol cuti dari Database Roster (Senin – Rabu) */}
      <LeaveControlPanel period={period} photoOf={photoOf} />

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

      {/* Lembar tersembunyi untuk ekspor PNG */}
      {exportingPng && (
        <div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
          <ScheduleSheet ref={captureRef} title={sheetTitle} cards={cards} cuti={cuti} nonActive={nonActive} photoOf={photoOf} />
        </div>
      )}
    </div>
  );
}
