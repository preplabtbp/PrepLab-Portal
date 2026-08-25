import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, Loader2, Calendar, MapPin, Briefcase, Clock, 
  Plane, PlaneTakeoff, Info, Search, RefreshCw, CheckCircle2, 
  AlertCircle, Edit2, Check, X, Filter, Users, ChevronRight, Layers, Sparkles
} from 'lucide-react';
import { getRosterData } from '../sheets-api';
import { Button } from './ui';
import { PageHeader } from './PageHeader';
import { toast } from 'sonner';

function safeFormatDate(date: any, options: any) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', options);
  } catch (e) { return '-'; }
}

function parseStringDate(str: string | null | undefined) {
  if (!str || str === '-') return null;
  const parts = str.replace(/-/g, ' ').split(' ');
  if (parts.length >= 3) {
    const mmap: Record<string, number> = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return new Date(year, mmap[parts[1]] || 0, parseInt(parts[0]));
  }
  return new Date(str);
}

// Preset Shift Codes for quick Admin editing
const SHIFT_OPTIONS = [
  { code: 'D', label: 'D (Day Shift)', desc: 'Shift Pagi / Siang', bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { code: 'N', label: 'N (Night Shift)', desc: 'Shift Malam', bg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { code: 'OFF', label: 'OFF (Libur)', desc: 'Hari Libur Rutin', bg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
  { code: 'TRV', label: 'TRV (Travel On)', desc: 'Perjalanan Masuk', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { code: 'TV', label: 'TV (Travel Off)', desc: 'Perjalanan Pulang Cuti', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { code: 'CT', label: 'CT (Cuti Tahunan)', desc: 'Cuti Tahunan Karyawan', bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { code: 'CI', label: 'CI (Cuti Istimewa)', desc: 'Cuti Istimewa 5 Tahunan', bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { code: 'I', label: 'I (Izin / Sakit)', desc: 'Izin Tidak Masuk', bg: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  { code: 'S', label: 'S (Standby / Sakit)', desc: 'Standby / Libur Shift', bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { code: 'LS', label: 'LS (Libur Shift)', desc: 'Libur Antar Shift', bg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' },
  { code: '-', label: '- (Kosongkan)', desc: 'Hapus Roster', bg: 'bg-transparent text-slate-400 border-slate-300' },
];

export function RosterAdminScreen() {
  const [roster, setRoster] = useState<any[]>(() => {
    try {
      const cached = sessionStorage.getItem('preplab_roster_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem('preplab_roster_cache');
      if (cached) return false;
    } catch(e) {}
    return true;
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [developerList, setDeveloperList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Date Range (default: Today to +14 days for optimal matrix view)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 13);
    return d.toISOString().split('T')[0];
  });

  // Cell Editing Popover Modal State
  const [editingCell, setEditingCell] = useState<{
    empNik: string;
    empName: string;
    dateStr: string;
    displayDate: string;
    currentShift: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDeveloperList(data.map((d: any) => d.nik));
        }
      })
      .catch(() => {});
  }, []);

  const getHierarchyLevel = (jabatan: string) => {
    if (!jabatan) return 6;
    const j = jabatan.toLowerCase();
    if (j.includes('manager')) return 1;
    if (j.includes('superintendent')) return 2;
    if (j.includes('supervisor') || j.includes('specialist')) return 3;
    if (j.includes('foreman') || j.includes('officer')) return 4;
    if (j.includes('admin')) return 5;
    return 6;
  };

  const requestorRole = currentUser?.jabatan || '';
  const requestorSection = currentUser?.section || currentUser?.department || '';
  const requestorNik = currentUser?.nik || localStorage.getItem('p2h_inspector_nik') || '';
  const requestorPt = currentUser?.pt || '';

  const isSuperAdmin = requestorNik === '02D25000055' || requestorNik === '02D24000043' || requestorNik === 'preplabadmin';
  const isDeveloper = isSuperAdmin || requestorNik === 'preplabadmin' || developerList.includes(requestorNik);

  const isAdministration = 
    requestorSection.toLowerCase() === 'administration' || 
    requestorSection.toLowerCase() === 'administrasi' || 
    requestorRole.toLowerCase().includes('admin') || 
    requestorRole.toLowerCase().includes('administrasi');

  const isAdminOrQA = isDeveloper || isAdministration || 
    requestorSection.toLowerCase() === 'qa' || 
    requestorSection.toLowerCase().includes('quality assurance') ||
    requestorRole.toLowerCase().includes('quality assurance') ||
    requestorRole.toLowerCase().includes('qa');

  // STRICT RULE: Only Administration Team & Developers can edit roster
  const canEditRoster = isDeveloper || isAdministration;

  const levelU = isSuperAdmin ? 0 : getHierarchyLevel(requestorRole);

  const handleManualSync = async () => {
    if (!canEditRoster) {
      toast.error('Akses ditolak: Hanya Tim Administrasi dan Developer yang dapat menyinkronkan roster.');
      return;
    }
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/roster/sync', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': requestorNik
        },
        body: JSON.stringify({ editorNik: requestorNik })
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({ type: 'success', message: data.message || 'Sinkronisasi Roster berhasil diperbarui!' });
        const refreshed: any = await getRosterData();
        const list = Array.isArray(refreshed) ? refreshed : (refreshed?.roster || []);
        setRoster(list);
      } else {
        setSyncFeedback({ type: 'error', message: data.message || 'Gagal sinkronisasi data dari Google Sheets' });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', message: 'Koneksi gagal: ' + e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchRoster = async () => {
    setIsLoading(true);
    try {
      const savedProfileStr = localStorage.getItem('p2h_inspector_profile');
      if (savedProfileStr) {
        try {
          const prof = JSON.parse(savedProfileStr);
          setCurrentUser(prof);
        } catch(e) {}
      }
      
      const res: any = await getRosterData({ requestorNik, requestorRole, requestorSection });
      const list = Array.isArray(res) ? res : (res?.roster || []);
      if (list.length > 0) {
        setRoster(list);
        try {
          sessionStorage.setItem('preplab_roster_cache', JSON.stringify(list));
        } catch(e) {}
      }
      
      if (requestorNik && list.length > 0) {
        const me = list.find((e: any) => e.nik === requestorNik);
        if (me) setCurrentUser(me);
      }
    } catch (err) {
      console.error("Error fetching roster:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  // Filter & Hierarchy Sorting
  const filteredRoster = useMemo(() => {
    let list = roster;
    
    // Filter by PT
    if (requestorPt === 'GTS') {
      list = list.filter(emp => emp.pt === 'GTS');
    } else if (requestorPt === 'TBP' || requestorPt === 'GPS') {
      list = list.filter(emp => emp.pt !== 'GTS');
    }

    list = list.filter(emp => {
      const hasSchedule = (emp.fullSchedule && Object.keys(emp.fullSchedule).length > 0) || (emp.schedule && emp.schedule.length > 0);
      if (!hasSchedule) return false;

      // Admin & QA can see all personnel (filtered by dropdown section if chosen)
      if (isAdminOrQA) {
        if (sectionFilter !== 'ALL') return emp.section === sectionFilter;
        return true;
      }
      
      const levelE = getHierarchyLevel(emp.jabatan);

      // Hierarchical Subordinate Filtering for Leaders:
      if (levelU === 1) { // Manager -> sees all subordinates in department
        if (sectionFilter !== 'ALL') return emp.section === sectionFilter;
        return levelE > 1 || emp.nik === requestorNik;
      }
      if (levelU === 2) { // Superintendent -> sees SPV, Foreman, Admin, Crew in their section
        return emp.section === requestorSection && (levelE > 2 || emp.nik === requestorNik);
      }
      if (levelU === 3) { // SPV -> sees Foreman, Admin, Crew in their section
        return emp.section === requestorSection && (levelE > 3 || emp.nik === requestorNik);
      }
      if (levelU === 4) { // Foreman -> sees Admin, Crew in their section
        return emp.section === requestorSection && (levelE > 4 || emp.nik === requestorNik);
      }
      if (levelU === 5) { // Admin -> sees own section team
        return emp.section === requestorSection;
      }
      if (levelU === 6) { // Crew -> sees peers in own section
        return emp.section === requestorSection;
      }
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(emp => 
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.nama && emp.nama.toLowerCase().includes(q)) ||
        (emp.nik && emp.nik.toLowerCase().includes(q)) ||
        (emp.jabatan && emp.jabatan.toLowerCase().includes(q)) ||
        (emp.section && emp.section.toLowerCase().includes(q))
      );
    }

    // Sort by Hierarchy Level (Manager -> SPT -> SPV -> Foreman -> Admin -> Crew), then by Section, then by Name
    return [...list].sort((a, b) => {
      const rankA = getHierarchyLevel(a.jabatan);
      const rankB = getHierarchyLevel(b.jabatan);
      if (rankA !== rankB) return rankA - rankB;
      const secA = (a.section || '').localeCompare(b.section || '');
      if (secA !== 0) return secA;
      return (a.name || a.nama || '').localeCompare(b.name || b.nama || '');
    });
  }, [roster, currentUser, sectionFilter, searchQuery, isAdminOrQA, levelU, requestorSection, requestorPt]);

  // Generate Date Column Array
  const dateColumns = useMemo(() => {
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return [];

    const maxDays = 31;
    const diffDays = Math.floor((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
    const effectiveEndDate = diffDays > maxDays ? new Date(sDate.getTime() + maxDays * 24 * 60 * 60 * 1000) : eDate;

    const list: {
      rawDate: Date;
      keyDateStr: string;     // format "24 Aug 26" used in fullSchedule
      dayName: string;        // "Sen", "Sel", "Rab"
      dateNumber: string;     // "24 Agu"
      isToday: boolean;
      isWeekend: boolean;
    }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const iter = new Date(sDate);
    iter.setHours(0, 0, 0, 0);

    const indonesianDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    while (iter <= effectiveEndDate) {
      const parts = iter.toDateString().split(' '); // e.g. ["Mon", "Aug", "24", "2026"]
      const day = parseInt(parts[2], 10);
      const keyDateStr = day + ' ' + parts[1] + ' ' + parts[3].substring(2); // "24 Aug 26"

      const isToday = iter.getTime() === today.getTime();
      const isWeekend = iter.getDay() === 0 || iter.getDay() === 6;

      list.push({
        rawDate: new Date(iter),
        keyDateStr,
        dayName: indonesianDays[iter.getDay()],
        dateNumber: `${day} ${iter.toLocaleDateString('id-ID', { month: 'short' })}`,
        isToday,
        isWeekend
      });

      iter.setDate(iter.getDate() + 1);
    }

    return list;
  }, [startDate, endDate]);

  // Update Roster Cell
  const handleSaveCell = async (newShift: string) => {
    if (!canEditRoster) {
      toast.error('Akses ditolak: Hanya Tim Administrasi dan Developer yang dapat mengubah roster.');
      return;
    }
    if (!editingCell) return;
    const { empNik, keyDateStr } = editingCell as any;

    // Optimistic UI update
    setRoster(prev => prev.map(emp => {
      if (emp.nik === empNik) {
        const updatedFull = { ...(emp.fullSchedule || {}), [keyDateStr]: newShift };
        return { ...emp, fullSchedule: updatedFull };
      }
      return emp;
    }));

    setEditingCell(null);
    toast.success(`Roster ${editingCell.empName} diubah menjadi ${newShift}`);

    try {
      const res = await fetch('/api/roster/cell', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-nik': requestorNik
        },
        body: JSON.stringify({
          nik: empNik,
          date: keyDateStr,
          status: newShift,
          editorNik: requestorNik
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menyimpan ke server');
      }
    } catch (e: any) {
      toast.error('Gagal update ke server: ' + e.message);
      fetchRoster(); // Rollback
    }
  };

  // Helper for Roster Badge Styling
  const getShiftBadgeStyle = (code: string | undefined | null) => {
    if (!code || code === '-') {
      return 'opacity-40 text-slate-400 font-mono';
    }
    const c = code.toUpperCase().trim();
    if (c === 'D') return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/35 font-black shadow-2xs';
    if (c === 'N') return 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/35 font-black shadow-2xs';
    if (c === 'OFF') return 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30 font-bold';
    if (c === 'TRV' || c === 'TV') return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-black shadow-2xs ring-1 ring-amber-500/30';
    if (c.startsWith('CT') || c.startsWith('CI') || c === 'C' || c === 'CR') {
      return 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 font-black shadow-2xs ring-1 ring-rose-500/30';
    }
    if (c === 'S' || c === 'LS' || c === 'SD') return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 font-bold';
    if (c === 'I' || c.startsWith('IZIN') || c === 'XP' || c === 'TT') {
      return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40 font-bold';
    }
    return 'bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30 font-bold';
  };

  const calculateLeave = (emp: any) => {
    if (!emp) return null;
    let joinDate: Date | null = null;
    const rawJoin = emp.tgl_masuk_format || emp.tanggalAwalBergabung || emp.joinDate || emp.tgl_masuk;
    if (rawJoin && rawJoin !== '-') {
      try {
        joinDate = new Date(rawJoin);
        if (isNaN(joinDate.getTime())) joinDate = parseStringDate(rawJoin);
      } catch (e) {
        joinDate = parseStringDate(rawJoin);
      }
    }

    let isYear5 = false;
    if (joinDate && !isNaN(joinDate.getTime())) {
      const diffMs = new Date().getTime() - joinDate.getTime();
      const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears >= 5) isYear5 = true;
    }

    const sched = emp.fullSchedule || {};
    let ctUsed = 0;
    let ciUsed = 0;
    let izinUsed = 0;

    let futureTrv: string | null = null;
    let pastTrv: string | null = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedDatesAsc = Object.keys(sched).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    sortedDatesAsc.forEach(dateStr => {
      const code = (sched[dateStr] || '').toUpperCase();
      const d = new Date(dateStr);
      
      if (code === 'CT' || code.startsWith('CT')) ctUsed++;
      else if (code === 'CI' || code.startsWith('CI')) ciUsed++;
      else if (code === 'I' || code.startsWith('IZIN') || code === 'CR' || code === 'XP') izinUsed++;

      if (['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT'].includes(code) || code.startsWith('CT') || code.startsWith('CE')) {
        if (d >= today && !futureTrv) futureTrv = dateStr;
        if (d <= today) pastTrv = dateStr;
      }
    });

    if (emp.total_cuti_tahunan && !isNaN(parseFloat(emp.total_cuti_tahunan))) ctUsed = parseFloat(emp.total_cuti_tahunan);
    if (emp.total_izin && !isNaN(parseFloat(emp.total_izin))) izinUsed = parseFloat(emp.total_izin);

    let actualCuti: Date | null = null;
    let planDate: Date | null = null;

    if (emp.nextTrvDate) actualCuti = new Date(emp.nextTrvDate);
    else if (futureTrv) actualCuti = new Date(futureTrv);

    if (emp.cuti_plan_format && emp.cuti_plan_format !== '-') planDate = new Date(emp.cuti_plan_format);

    if (!actualCuti && !planDate && (emp.lastTrvDate || pastTrv)) {
      const lTrv = new Date(emp.lastTrvDate || pastTrv!);
      if (!isNaN(lTrv.getTime())) {
        actualCuti = new Date(lTrv.getTime() + (70 * 24 * 60 * 60 * 1000));
      }
    }

    let daysRemaining = 0;
    let difference = 0;

    if (actualCuti && !isNaN(actualCuti.getTime())) {
      const target = new Date(actualCuti);
      target.setHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (planDate && actualCuti && !isNaN(planDate.getTime()) && !isNaN(actualCuti.getTime())) {
      difference = Math.round((actualCuti.getTime() - planDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const totalKuota = isYear5 ? 24 : 12;
    const totalUsed = isYear5 ? ciUsed : ctUsed;
    const remaining = Math.max(0, totalKuota - totalUsed);

    return {
      isYear5,
      totalKuota,
      totalUsed,
      izinUsed,
      remaining,
      actualCuti,
      difference,
      daysRemaining,
      hasTrv: !!futureTrv || !!emp.nextTrvDate,
      joinDate
    };
  };

  // Quick Date Preset Buttons
  const setQuickRange = (days: number) => {
    const s = new Date();
    const e = new Date();
    e.setDate(e.getDate() + (days - 1));
    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      <PageHeader 
        title="Tabel Roster & Jadwal Kerja"
        description={
          isAdminOrQA 
            ? "Pusat Roster Seluruh Departemen (Urutan Hierarki & Sinkronisasi Spreadsheet tiap 17:00 WIT)"
            : "Matriks Roster Jadwal Kerja Tim & Bawahannya"
        }
        icon={<Calendar />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {canEditRoster ? (
            <span 
              className="text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editor Roster (Admin & Dev)
            </span>
          ) : (
            <span 
              className="text-xs font-medium px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs opacity-80"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-muted)'
              }}
            >
              <Info className="w-3.5 h-3.5 text-slate-400" /> Mode Baca Roster
            </span>
          )}
          {canEditRoster && (
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-white flex items-center gap-2 rounded-xl text-xs font-bold px-3.5 py-2 shadow-sm transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : 'Sinkron Google Sheets'}
            </Button>
          )}
        </div>
      </PageHeader>

      {syncFeedback && (
        <div 
          className="p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border shadow-xs animate-in fade-in"
          style={{
            backgroundColor: syncFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            borderColor: syncFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
            color: syncFeedback.type === 'success' ? '#10B981' : '#F43F5E'
          }}
        >
          <div className="flex items-center gap-2 font-semibold">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button 
            onClick={() => setSyncFeedback(null)} 
            className="opacity-70 hover:opacity-100 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Bar (Filter, Search, Date Range) */}
      <div 
        className="p-4 rounded-2xl border shadow-xs space-y-3.5"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)',
          color: 'var(--text-main, #1E293B)'
        }}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Section & Department Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <span className="text-xs font-bold uppercase tracking-wider opacity-75" style={{ color: 'var(--text-muted)' }}>
                Filter Section:
              </span>
            </div>
            <select 
              value={sectionFilter} 
              onChange={(e) => setSectionFilter(e.target.value)}
              className="text-xs font-bold py-1.5 px-3 rounded-xl border outline-none cursor-pointer shadow-2xs"
              style={{
                backgroundColor: 'var(--input-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-main, #1E293B)'
              }}
            >
              <option value="ALL">Semua Section ({filteredRoster.length} Personil)</option>
              <option value="Preparation">Preparation</option>
              <option value="Dry, Preparation">Dry, Preparation</option>
              <option value="Wet, Preparation">Wet, Preparation</option>
              <option value="Laboratory">Laboratory</option>
              <option value="QA">QA / Quality Assurance</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inventory Control">Inventory Control</option>
              <option value="Administration">Administration</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Cari nama, NIK, jabatan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs border outline-none font-medium transition-all shadow-2xs"
              style={{
                backgroundColor: 'var(--input-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-main, #1E293B)'
              }}
            />
          </div>
        </div>

        {/* Date Presets & Custom Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold opacity-75" style={{ color: 'var(--text-muted)' }}>Preset Rentang:</span>
            <button 
              onClick={() => setQuickRange(7)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
            >
              7 Hari
            </button>
            <button 
              onClick={() => setQuickRange(14)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
            >
              14 Hari
            </button>
            <button 
              onClick={() => setQuickRange(30)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
            >
              30 Hari
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold opacity-75" style={{ color: 'var(--text-muted)' }}>Tanggal:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border text-xs font-bold outline-none shadow-2xs"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)'
              }}
            />
            <span className="opacity-60 font-medium">s/d</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date(new Date(startDate).getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="px-2.5 py-1 rounded-lg border text-xs font-bold outline-none shadow-2xs"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Roster Table Matrix */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Menyusun tabel roster bawahan & personil...
          </p>
        </div>
      ) : filteredRoster.length === 0 ? (
        <div 
          className="p-12 rounded-2xl border text-center space-y-2 shadow-xs"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-main)'
          }}
        >
          <Users className="w-10 h-10 mx-auto opacity-40" style={{ color: 'var(--text-muted)' }} />
          <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
            Tidak Ada Personil yang Ditampilkan
          </h4>
          <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            {isAdminOrQA 
              ? "Tidak ada data karyawan yang cocok dengan filter atau kata kunci pencarian."
              : "Hanya personil bawahan langsung dalam hierarki yang ditampilkan pada modul ini."}
          </p>
        </div>
      ) : (
        <div 
          className="rounded-2xl border shadow-lg overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--card-bg, #FFFFFF)',
            borderColor: 'var(--border-main, #E2E8F0)'
          }}
        >
          {/* Table Container with Horizontal Scroll */}
          <div className="overflow-x-auto overflow-y-auto max-h-[72vh] relative">
            <table className="w-full text-left border-collapse min-w-[850px]">
              {/* Table Header */}
              <thead>
                <tr 
                  className="sticky top-0 z-30 border-b select-none"
                  style={{
                    backgroundColor: 'var(--bg-main, #F8FAFC)',
                    borderColor: 'var(--border-main, #E2E8F0)'
                  }}
                >
                  {/* Sticky Column: Nama Personil */}
                  <th 
                    className="sticky left-0 z-40 p-3 sm:p-3.5 text-xs font-bold uppercase tracking-wider w-[240px] sm:w-[280px] min-w-[240px] border-r shadow-xs backdrop-blur-md"
                    style={{
                      backgroundColor: 'var(--bg-main, #F8FAFC)',
                      borderColor: 'var(--border-main, #E2E8F0)',
                      color: 'var(--text-main, #1E293B)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>Nama Personil & Jabatan</span>
                      <span className="text-[10px] opacity-60 font-mono">({filteredRoster.length})</span>
                    </div>
                  </th>

                  {/* Date Columns */}
                  {dateColumns.map((col, idx) => (
                    <th 
                      key={idx}
                      className={`p-2 text-center text-xs font-bold border-r min-w-[58px] max-w-[68px] ${
                        col.isToday ? 'ring-2 ring-inset ring-teal-500' : ''
                      }`}
                      style={{
                        backgroundColor: col.isToday 
                          ? 'rgba(42, 157, 143, 0.12)' 
                          : col.isWeekend 
                          ? 'rgba(0,0,0,0.02)' 
                          : 'transparent',
                        borderColor: 'var(--border-main, #E2E8F0)',
                        color: col.isToday ? 'var(--primary)' : 'var(--text-main)'
                      }}
                    >
                      <div className="text-[10px] uppercase font-bold tracking-tight opacity-75">
                        {col.dayName}
                      </div>
                      <div className="text-xs font-black">
                        {col.dateNumber}
                      </div>
                      {col.isToday && (
                        <span className="inline-block text-[8px] font-black uppercase px-1 rounded bg-teal-500 text-white mt-0.5">
                          Hari Ini
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y text-xs" style={{ borderColor: 'var(--border-main)' }}>
                {filteredRoster.map((emp, rowIdx) => {
                  const leave = calculateLeave(emp);
                  const isSelf = emp.nik === requestorNik;

                  return (
                    <tr 
                      key={emp.nik || rowIdx}
                      className="hover:opacity-95 transition-colors group"
                      style={{
                        backgroundColor: isSelf ? 'rgba(42, 157, 143, 0.05)' : 'transparent'
                      }}
                    >
                      {/* Sticky Person Info Cell */}
                      <td 
                        className="sticky left-0 z-20 p-3 sm:p-3.5 border-r shadow-xs backdrop-blur-md"
                        style={{
                          backgroundColor: isSelf ? 'var(--input-bg)' : 'var(--card-bg)',
                          borderColor: 'var(--border-main)'
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>
                              {emp.name || emp.nama}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white bg-teal-600">
                                Anda
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-mono">{emp.nik}</span>
                            <span>•</span>
                            <span className="font-semibold truncate max-w-[140px]">{emp.jabatan}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {emp.section && (
                              <span 
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                                style={{
                                  backgroundColor: 'var(--input-bg)',
                                  borderColor: 'var(--border-main)',
                                  color: 'var(--primary)'
                                }}
                              >
                                {emp.section}
                              </span>
                            )}
                            {emp.gol && (
                              <span 
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded border opacity-75"
                                style={{
                                  backgroundColor: 'var(--input-bg)',
                                  borderColor: 'var(--border-main)'
                                }}
                              >
                                {emp.gol}
                              </span>
                            )}
                            {leave?.actualCuti && (
                              <span 
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded border text-emerald-600 dark:text-emerald-400"
                                style={{
                                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                  borderColor: 'rgba(16, 185, 129, 0.2)'
                                }}
                                title={`Estimasi Cuti: ${safeFormatDate(leave.actualCuti, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                              >
                                ✈️ {safeFormatDate(leave.actualCuti, { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date Shift Code Cells */}
                      {dateColumns.map((col, cIdx) => {
                        const shiftCode = emp.fullSchedule?.[col.keyDateStr] || '-';
                        const badgeStyle = getShiftBadgeStyle(shiftCode);

                        return (
                          <td 
                            key={cIdx}
                            onClick={() => {
                              if (canEditRoster) {
                                setEditingCell({
                                  empNik: emp.nik,
                                  empName: emp.name || emp.nama,
                                  dateStr: col.keyDateStr,
                                  displayDate: `${col.dayName}, ${col.dateNumber}`,
                                  currentShift: shiftCode === '-' ? '' : shiftCode
                                } as any);
                              } else {
                                toast.info("Akses Khusus Administrasi & Developer", {
                                  description: "Fitur pengeditan jadwal roster hanya dapat diakses oleh Tim Administrasi dan Developer."
                                });
                              }
                            }}
                            className={`p-1.5 text-center border-r transition-all select-none ${
                              canEditRoster ? 'cursor-pointer hover:scale-105 hover:z-10' : 'cursor-default'
                            } ${col.isToday ? 'bg-teal-500/5' : ''}`}
                            style={{
                              borderColor: 'var(--border-main)'
                            }}
                            title={canEditRoster ? `Klik untuk mengedit roster ${emp.name || emp.nama} pada ${col.dateNumber}` : `Roster ${emp.name || emp.nama} (${shiftCode})`}
                          >
                            <div 
                              className={`w-full py-1.5 px-1 rounded-lg border text-center text-xs transition-transform ${badgeStyle}`}
                            >
                              {shiftCode}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Legend Footer */}
          <div 
            className="p-3.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none"
            style={{
              backgroundColor: 'var(--bg-main, #F8FAFC)',
              borderColor: 'var(--border-main, #E2E8F0)'
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold opacity-75 mr-1" style={{ color: 'var(--text-muted)' }}>Keterangan:</span>
              <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold bg-blue-500/15 text-blue-600 border-blue-500/30">D = Day Shift</span>
              <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold bg-purple-500/15 text-purple-600 border-purple-500/30">N = Night Shift</span>
              <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold bg-slate-500/15 text-slate-600 border-slate-500/30">OFF = Libur</span>
              <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold bg-amber-500/15 text-amber-600 border-amber-500/30">TRV/TV = Travel Cuti</span>
              <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold bg-rose-500/15 text-rose-600 border-rose-500/30">CT/CI = Cuti</span>
              <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border-emerald-500/30">S/LS = Standby/Libur Shift</span>
            </div>

            <span className="text-[11px] font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
              {canEditRoster ? '💡 Klik pada sel jadwal untuk mengubah kode shift secara langsung.' : 'Tampilan baca roster tim.'}
            </span>
          </div>
        </div>
      )}

      {/* Inline Cell Editor Popover Modal (For Admin & QA) */}
      {editingCell && (
        <div 
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEditingCell(null)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-main)' }}>
              <div>
                <h3 className="font-bold text-sm font-display" style={{ color: 'var(--text-main)' }}>
                  Edit Roster Harian
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {editingCell.empName} ({editingCell.displayDate})
                </p>
              </div>
              <button 
                onClick={() => setEditingCell(null)}
                className="p-1.5 rounded-full border opacity-70 hover:opacity-100 cursor-pointer"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold block" style={{ color: 'var(--text-main)' }}>
                Pilih Kode Shift / Keterangan:
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                {SHIFT_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleSaveCell(opt.code)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      editingCell.currentShift === opt.code ? 'ring-2 ring-teal-500 font-black' : 'hover:opacity-85'
                    } ${opt.bg}`}
                  >
                    <span className="font-black text-xs">{opt.label}</span>
                    <span className="text-[10px] opacity-75">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Code Input */}
            <form 
              onSubmit={e => {
                e.preventDefault();
                const form = e.target as any;
                const customVal = form.customShift.value.trim().toUpperCase();
                if (customVal) handleSaveCell(customVal);
              }}
              className="pt-2 border-t flex gap-2"
              style={{ borderColor: 'var(--border-main)' }}
            >
              <input 
                name="customShift"
                type="text"
                placeholder="Kode kustom (contoh: D2, OFF2...)"
                defaultValue={editingCell.currentShift}
                className="flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none font-bold uppercase shadow-2xs"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-main)',
                  color: 'var(--text-main)'
                }}
              />
              <Button type="submit" className="text-xs px-3 py-1.5 text-white" style={{ backgroundColor: 'var(--primary)' }}>
                Simpan
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
