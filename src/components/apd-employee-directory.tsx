import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Users, Search, RefreshCw, FileSpreadsheet, ChevronDown, ChevronRight, Shield, ShieldCheck, ShieldAlert,
  CircleDashed, Briefcase, Layers, Crown, UserCog, HardHat, ClipboardList, Wrench, ArrowRight, ChevronsDownUp, ChevronsUpDown
} from 'lucide-react';
import { addMonths, isBefore, startOfDay, format } from 'date-fns';
import { formatAvatarUrl, handleAvatarError } from '../lib/avatarUtils';

// ── Daftar Karyawan (modul Distribusi & Pengambilan APD) ─────────────────────
// Seluruh karyawan aktif dari Database Karyawan, dikelompokkan per jabatan (sesuai database) dan
// diurutkan berdasarkan level jabatan, lengkap dengan ringkasan status pengambilan APD.

interface DirEmployee {
  nik: string; name: string; jabatan: string; section: string; department: string;
  gol: string; shift: string; pt: string; photo: string;
}

interface ApdSummary { ready: string[]; never: number; lastTaken: Date | null }

type LevelKey = 'MGR' | 'SPT' | 'SPV' | 'FRM' | 'STF' | 'CRW' | 'OTH';

const LEVELS: { key: LevelKey; label: string; short: string; test?: RegExp; icon: React.ReactNode; cls: string; dot: string }[] = [
  { key: 'MGR', label: 'Manajemen', short: 'Manager', test: /manager|head of|kepala/i, icon: <Crown className="w-4 h-4" />, cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30', dot: 'bg-amber-500' },
  { key: 'SPT', label: 'Superintendent', short: 'Superintendent', test: /superintendent/i, icon: <Briefcase className="w-4 h-4" />, cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/30', dot: 'bg-orange-500' },
  { key: 'SPV', label: 'Supervisor & Specialist', short: 'Supervisor', test: /supervisor|specialist|\bspv\b/i, icon: <UserCog className="w-4 h-4" />, cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-purple-500/30', dot: 'bg-purple-500' },
  { key: 'FRM', label: 'Foreman & Leader', short: 'Foreman', test: /foreman|leader|\blead\b/i, icon: <ClipboardList className="w-4 h-4" />, cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/30', dot: 'bg-sky-500' },
  { key: 'STF', label: 'Officer, Admin & Staff', short: 'Staff', test: /officer|admin|analyst|staff|clerk|engineer|technician|teknisi|chemist|sampler/i, icon: <Layers className="w-4 h-4" />, cls: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-teal-500/30', dot: 'bg-teal-500' },
  { key: 'CRW', label: 'Crew & Operator', short: 'Crew', test: /crew|operator|helper|driver/i, icon: <HardHat className="w-4 h-4" />, cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30', dot: 'bg-emerald-500' },
  { key: 'OTH', label: 'Lainnya', short: 'Lainnya', icon: <Wrench className="w-4 h-4" />, cls: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/30', dot: 'bg-slate-400' }
];
const LEVEL_ORDER = LEVELS.map(l => l.key);

function levelOf(jabatan: string): LevelKey {
  return LEVELS.find(l => l.test && l.test.test(jabatan || ''))?.key || 'OTH';
}

const GOL_RANK: Record<string, number> = { V: 0, IV: 1, III: 2, II: 3, I: 4 };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function Avatar({ name, photo }: { name: string; photo?: string }) {
  const src = formatAvatarUrl(photo);
  return (
    <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-500/20 dark:to-purple-500/30 text-purple-800 dark:text-purple-200 text-[11px] font-black flex items-center justify-center ring-2 ring-[var(--card-bg)]">
      {initials(name)}
      {src && <img src={src} alt={name} loading="lazy" onError={handleAvatarError} className="absolute inset-0 w-full h-full object-cover" />}
    </div>
  );
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function ApdEmployeeDirectory({ onOpenEmployee }: { onOpenEmployee: (nik: string) => void }) {
  const [employees, setEmployees] = useState<DirEmployee[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [intervals, setIntervals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelKey | 'ALL'>('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [apdFilter, setApdFilter] = useState<'ALL' | 'READY' | 'NEVER'>('ALL');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, histRes, setRes] = await Promise.all([
        fetch('/api/employees').then(r => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/api/apd/history').then(r => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/api/apd/settings').then(r => (r.ok ? r.json() : {})).catch(() => ({}))
      ]);
      const list: any[] = Array.isArray(empRes) ? empRes : (empRes?.data || []);
      setEmployees(list
        .filter(e => e?.nik && e?.name)
        .map(e => ({
          nik: String(e.nik).trim(), name: String(e.name).trim(),
          jabatan: String(e.jabatan || e.position || '').trim() || 'Tanpa Jabatan',
          section: String(e.section || '').trim(), department: String(e.department || '').trim(),
          gol: String(e.gol || '').trim().toUpperCase(), shift: String(e.shift || '').trim(),
          pt: String(e.pt || '').trim(), photo: String(e.photo || '')
        })));
      setHistory(Array.isArray(histRes) ? histRes : []);
      setIntervals(setRes && typeof setRes === 'object' ? (setRes as Record<string, number>) : {});
    } catch (err: any) {
      toast.error('Gagal memuat daftar karyawan: ' + (err?.message || 'kesalahan jaringan'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Ringkasan APD per NIK: item yang sudah boleh diambil lagi, item yang belum pernah diambil, pengambilan terakhir
  const apdByNik = useMemo(() => {
    const items = Object.entries(intervals).filter(([, m]) => Number(m) > 0).map(([k, m]) => [k, Number(m)] as const);
    const latest = new Map<string, Map<string, Date>>();
    history.forEach((r: any) => {
      const nik = String(r.nik || '').trim().toUpperCase();
      const item = String(r.itemName || '').trim();
      const d = r.dateTaken ? new Date(r.dateTaken) : null;
      if (!nik || !item || !d || isNaN(d.getTime())) return;
      const perItem = latest.get(nik) || new Map<string, Date>();
      const key = item.toLowerCase();
      const prev = perItem.get(key);
      if (!prev || d > prev) perItem.set(key, d);
      latest.set(nik, perItem);
    });
    const today = startOfDay(new Date());
    const map = new Map<string, ApdSummary>();
    employees.forEach(e => {
      const perItem = latest.get(e.nik.toUpperCase());
      const ready: string[] = [];
      let never = 0;
      let lastTaken: Date | null = null;
      perItem?.forEach(d => { if (!lastTaken || d > lastTaken) lastTaken = d; });
      items.forEach(([item, months]) => {
        const last = perItem?.get(item.toLowerCase());
        if (!last) { never++; return; }
        if (!isBefore(today, startOfDay(addMonths(last, months)))) ready.push(item);
      });
      map.set(e.nik, { ready, never, lastTaken });
    });
    return map;
  }, [employees, history, intervals]);

  const sections = useMemo(() => Array.from(new Set(employees.map(e => e.section).filter(Boolean))).sort(), [employees]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter(e => {
      if (levelFilter !== 'ALL' && levelOf(e.jabatan) !== levelFilter) return false;
      if (sectionFilter !== 'ALL' && !sameText(e.section, sectionFilter)) return false;
      const apd = apdByNik.get(e.nik);
      if (apdFilter === 'READY' && !apd?.ready.length) return false;
      if (apdFilter === 'NEVER' && !(apd && apd.lastTaken === null)) return false;
      return !q || e.name.toLowerCase().includes(q) || e.nik.toLowerCase().includes(q) || e.jabatan.toLowerCase().includes(q) || e.section.toLowerCase().includes(q);
    });
  }, [employees, search, levelFilter, sectionFilter, apdFilter, apdByNik]);

  // Kelompok per jabatan (nama jabatan dari database), urut level → jumlah → nama
  const groups = useMemo(() => {
    const byJabatan = new Map<string, DirEmployee[]>();
    visible.forEach(e => {
      const key = e.jabatan;
      byJabatan.set(key, [...(byJabatan.get(key) || []), e]);
    });
    return Array.from(byJabatan.entries())
      .map(([jabatan, list]) => ({
        jabatan, level: levelOf(jabatan),
        list: list.sort((a, b) => (GOL_RANK[a.gol] ?? 9) - (GOL_RANK[b.gol] ?? 9) || a.name.localeCompare(b.name))
      }))
      .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || b.list.length - a.list.length || a.jabatan.localeCompare(b.jabatan));
  }, [visible]);

  const stats = useMemo(() => {
    const perLevel = Object.fromEntries(LEVEL_ORDER.map(k => [k, 0])) as Record<LevelKey, number>;
    let ready = 0, never = 0;
    employees.forEach(e => {
      perLevel[levelOf(e.jabatan)]++;
      const apd = apdByNik.get(e.nik);
      if (apd?.ready.length) ready++;
      if (apd && apd.lastTaken === null) never++;
    });
    return { total: employees.length, jabatan: new Set(employees.map(e => e.jabatan)).size, perLevel, ready, never };
  }, [employees, apdByNik]);

  const toggleGroup = (key: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const allCollapsed = groups.length > 0 && groups.every(g => collapsed.has(g.jabatan));

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      let no = 0;
      const rows = groups.flatMap(g => g.list.map(e => {
        const apd = apdByNik.get(e.nik);
        return {
          No: ++no, Nama: e.name, NIK: e.nik, Jabatan: e.jabatan,
          'Level Jabatan': LEVELS.find(l => l.key === g.level)?.label || '', Section: e.section, Departemen: e.department,
          Gol: e.gol, Shift: e.shift, PT: e.pt,
          'Pengambilan APD Terakhir': apd?.lastTaken ? format(apd.lastTaken, 'dd/MM/yyyy') : 'Belum pernah',
          'APD Siap Diambil': apd?.ready.join(', ') || '-',
          'Jumlah Item Belum Pernah Diambil': apd?.never ?? 0
        };
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 14 }, { wch: 34 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 6 }, { wch: 10 }, { wch: 6 }, { wch: 18 }, { wch: 40 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daftar Karyawan');
      XLSX.writeFile(wb, `Daftar_Karyawan_APD_${format(new Date(), 'yyyyMMdd')}.xlsx`);
      toast.success(`Daftar ${rows.length} karyawan berhasil diekspor ke Excel`);
    } catch (err: any) {
      toast.error('Gagal ekspor Excel: ' + (err?.message || 'kesalahan'));
    }
  };

  const kpi = 'bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm';
  const chip = (active: boolean) => `h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${active ? 'bg-purple-600 text-white shadow-sm' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'}`;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={kpi}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Karyawan Aktif</p>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-[var(--text-main)] mt-1 tabular-nums">{stats.total}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Sumber: Database Karyawan</p>
        </div>
        <div className={kpi}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Jabatan</p>
            <Briefcase className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-3xl font-black text-[var(--text-main)] mt-1 tabular-nums">{stats.jabatan}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Kelompok jabatan berbeda</p>
        </div>
        <button onClick={() => setApdFilter(f => (f === 'READY' ? 'ALL' : 'READY'))} className={`${kpi} text-left cursor-pointer transition-shadow hover:shadow-md ${apdFilter === 'READY' ? 'ring-2 ring-amber-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">APD Siap Diambil</p>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{stats.ready}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Karyawan sudah jatuh tempo</p>
        </button>
        <button onClick={() => setApdFilter(f => (f === 'NEVER' ? 'ALL' : 'NEVER'))} className={`${kpi} text-left cursor-pointer transition-shadow hover:shadow-md ${apdFilter === 'NEVER' ? 'ring-2 ring-slate-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Belum Pernah Ambil</p>
            <CircleDashed className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-3xl font-black text-[var(--text-main)] mt-1 tabular-nums">{stats.never}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Tidak ada riwayat APD</p>
        </button>
      </div>

      {/* Komposisi level jabatan */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Komposisi Level Jabatan</p>
          <p className="text-[11px] text-[var(--text-muted)]">Klik untuk memfilter</p>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--input-bg)]">
          {LEVELS.filter(l => stats.perLevel[l.key] > 0).map(l => (
            <div key={l.key} className={`${l.dot} h-full`} style={{ width: `${(stats.perLevel[l.key] / Math.max(1, stats.total)) * 100}%` }} title={`${l.label}: ${stats.perLevel[l.key]}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => setLevelFilter('ALL')} className={chip(levelFilter === 'ALL')}>Semua Level <span className="opacity-70 tabular-nums">{stats.total}</span></button>
          {LEVELS.filter(l => stats.perLevel[l.key] > 0).map(l => (
            <button key={l.key} onClick={() => setLevelFilter(prev => (prev === l.key ? 'ALL' : l.key))} className={chip(levelFilter === l.key)}>
              <span className={`w-2 h-2 rounded-full ${l.dot}`} /> {l.label} <span className="opacity-70 tabular-nums">{stats.perLevel[l.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, NIK, jabatan, atau section..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
        <select
          value={sectionFilter}
          onChange={e => setSectionFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none lg:w-56"
        >
          <option value="ALL">Semua Section</option>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map(g => g.jabatan)))}
            className="h-10 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title={allCollapsed ? 'Buka semua kelompok' : 'Tutup semua kelompok'}
          >
            {allCollapsed ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />} {allCollapsed ? 'Buka' : 'Ringkas'}
          </button>
          <button onClick={load} disabled={loading} className="h-10 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
          </button>
          <button onClick={exportExcel} disabled={loading || visible.length === 0} className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
        </div>
      </div>

      {(apdFilter !== 'ALL' || levelFilter !== 'ALL' || sectionFilter !== 'ALL' || search) && (
        <p className="text-xs text-[var(--text-muted)] px-1">
          Menampilkan <b className="text-[var(--text-main)]">{visible.length}</b> dari {stats.total} karyawan dalam {groups.length} jabatan
          <button onClick={() => { setSearch(''); setLevelFilter('ALL'); setSectionFilter('ALL'); setApdFilter('ALL'); }} className="ml-2 font-bold text-purple-600 dark:text-purple-400 cursor-pointer hover:underline">Reset filter</button>
        </p>
      )}

      {/* Kelompok per jabatan */}
      {loading && employees.length === 0 ? (
        <div className="py-20 text-center text-sm text-[var(--text-muted)]"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Memuat daftar karyawan dari database...</div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center bg-[var(--card-bg)] border border-dashed border-[var(--border-main)] rounded-2xl">
          <Users className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
          <p className="mt-3 text-sm font-semibold text-[var(--text-main)]">Tidak ada karyawan yang cocok</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Ubah kata kunci atau filter pencarian.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const lvl = LEVELS.find(l => l.key === g.level)!;
            const isOpen = !collapsed.has(g.jabatan);
            const readyInGroup = g.list.filter(e => apdByNik.get(e.nik)?.ready.length).length;
            return (
              <section key={g.jabatan} className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => toggleGroup(g.jabatan)} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[var(--input-bg)]/60 transition-colors">
                  <span className={`w-9 h-9 shrink-0 rounded-xl ring-1 ring-inset flex items-center justify-center ${lvl.cls}`}>{lvl.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-[var(--text-main)] truncate">{g.jabatan}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{lvl.label}</p>
                  </div>
                  {readyInGroup > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                      <ShieldAlert className="w-3 h-3" /> {readyInGroup} siap ambil
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-black tabular-nums">{g.list.length}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border-main)] overflow-x-auto">
                    <table className="w-full min-w-[820px] text-[var(--text-main)]">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--input-bg)]/60">
                          <th className="px-4 py-2 text-left w-10">#</th>
                          <th className="px-2 py-2 text-left">Karyawan</th>
                          <th className="px-2 py-2 text-left">Section</th>
                          <th className="px-2 py-2 text-center">Gol</th>
                          <th className="px-2 py-2 text-center">Shift</th>
                          <th className="px-2 py-2 text-left">Status APD</th>
                          <th className="px-4 py-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.list.map((e, i) => {
                          const apd = apdByNik.get(e.nik);
                          return (
                            <tr key={e.nik} className="border-t border-[var(--border-main)] hover:bg-[var(--input-bg)]/50 transition-colors">
                              <td className="px-4 py-2.5 text-[11px] text-[var(--text-muted)] tabular-nums">{i + 1}</td>
                              <td className="px-2 py-2.5">
                                <div className="flex items-center gap-2.5 min-w-[220px]">
                                  <Avatar name={e.name} photo={e.photo} />
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-semibold leading-tight truncate">{e.name}</p>
                                    <p className="text-[11px] font-mono text-[var(--text-muted)]">{e.nik}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2.5 text-[12px] text-[var(--text-muted)]">{e.section || e.department || '-'}</td>
                              <td className="px-2 py-2.5 text-center">
                                {e.gol ? <span className="inline-block min-w-[32px] px-1.5 py-0.5 rounded-md bg-[var(--input-bg)] text-[11px] font-black">{e.gol}</span> : <span className="text-[var(--text-muted)]">-</span>}
                              </td>
                              <td className="px-2 py-2.5 text-center text-[12px]">{e.shift || '-'}</td>
                              <td className="px-2 py-2.5">
                                {!apd || apd.lastTaken === null ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                                    <CircleDashed className="w-3 h-3" /> Belum pernah ambil
                                  </span>
                                ) : apd.ready.length ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold" title={apd.ready.join(', ')}>
                                      <ShieldAlert className="w-3 h-3" /> {apd.ready.length} item siap diambil
                                    </span>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[240px]">{apd.ready.join(', ')}</p>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                                      <ShieldCheck className="w-3 h-3" /> Masih berlaku
                                    </span>
                                    <p className="text-[10px] text-[var(--text-muted)]">Terakhir {format(apd.lastTaken, 'dd/MM/yyyy')}</p>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  onClick={() => onOpenEmployee(e.nik)}
                                  className="h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  title="Buka riwayat & distribusi APD karyawan ini"
                                >
                                  <Shield className="w-3.5 h-3.5" /> Lihat APD <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
