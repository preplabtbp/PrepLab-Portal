import React, { useState, useMemo } from 'react';
import { 
  Plane, PlaneTakeoff, Calendar, Users, Search, Filter, 
  FileSpreadsheet, Download, RefreshCw, AlertCircle, CheckCircle2, 
  Clock, Sparkles, Shield, ArrowUpDown, ChevronDown, Check,
  ChevronRight, Building2, MapPin, Briefcase, Info, Printer,
  ChevronLeft, Edit2, Eye, EyeOff, RotateCcw, X, Save, Settings2,
  ShieldAlert, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface RosterLeaveScheduleSheetProps {
  roster: any[];
  returnTo?: string | null;
  currentUser?: any;
  developerList?: string[];
}

interface LeaveRecord {
  id: string;
  nik: string;
  nama: string;
  poh: string;
  jabatan: string;
  gol: string;
  golLevel: number;
  isGol1: boolean;
  section: string;
  subSection?: string;
  pt: string;
  tanggalCuti: string;
  tanggalCutiRaw: Date;
  tanggalOnsite: string;
  tanggalOnsiteRaw: Date;
  perubahanJadwalOnsite: string;
  perubahanJadwalOnsiteRaw: Date | null;
  ket: string;
  travel: number;
  tahunanIstimewa: number;
  extra: number;
  izinKhusus: number;
  izin: number;
  tambahanTravel: number;
  totalHari: number;
  hasChange: boolean;
  isCutiSelesai: boolean;
  isCustomEdited?: boolean;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  mei: 4, agu: 7, ags: 7, okt: 9, des: 11
};

export function parseKeyDate(str: string | null | undefined): Date | null {
  if (!str || str === '-') return null;
  const s = String(str).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s)) {
    const parts = s.split(/[-/]/).map(Number);
    const day = parts[0];
    const month = parts[1] - 1;
    let yr = parts[2];
    if (yr < 100) yr += 2000;
    return new Date(yr, month, day);
  }

  // "24 Aug 26" or "1 Sep 26"
  const parts = s.replace(/-/g, ' ').split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[mStr] ?? 0;
    let yr = parseInt(parts[2], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, month, day);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatIndonesianDate(d: Date | null, options?: { withDay?: boolean; shortMonth?: boolean }): string {
  if (!d || isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const monthName = options?.shortMonth 
    ? MONTH_NAMES_ID[monthIdx].substring(0, 3) 
    : MONTH_NAMES_ID[monthIdx];

  if (options?.withDay) {
    return `${dayNames[d.getDay()]}, ${day} ${monthName} ${year}`;
  }
  return `${day} ${monthName} ${year}`;
}

export function parseGolonganLevel(val: any, jabatan?: string): number {
  const s = String(val || '').trim().toUpperCase();
  if (s === '5' || s === 'V' || (s.includes('V') && !s.includes('IV'))) return 5;
  if (s === '4' || s === 'IV' || s.includes('IV')) return 4;
  if (s === '3' || s === 'III' || s.includes('III')) return 3;
  if (s === '2' || s === 'II' || s.includes('II')) return 2;
  if (s === '1' || s === 'I' || s.includes('I')) return 1;

  // Fallback analisa nama jabatan
  const j = String(jabatan || '').toLowerCase();
  if (j.includes('manager') || j.includes('head') || j.includes('gm') || j.includes('vp')) return 5;
  if (j.includes('superintendent') || j.includes('spt')) return 4;
  if (j.includes('supervisor') || j.includes('spv') || j.includes('specialist')) return 3;
  if (
    j.includes('foreman') || j.includes('officer') || j.includes('admin') || 
    j.includes('analyst') || j.includes('chemist') || j.includes('teknisi') || j.includes('technician')
  ) return 2;
  return 1;
}

export function checkIsGolonganI(emp: any): boolean {
  const gol = String(emp.gol || emp.golongan || emp.jobGrade || '').trim().toUpperCase();
  const jab = String(emp.jabatan || emp.position || emp.role || '').trim().toLowerCase();

  if (
    gol === 'I' || gol === '1' || gol === 'I.1' || gol === '1.1' || 
    gol === 'S1.1' || gol === 'S1.2' || gol.startsWith('1.') || gol.startsWith('I.')
  ) {
    return true;
  }
  if (
    (jab.includes('crew') || jab.includes('helper') || jab.includes('operator') || jab.includes('teknisi')) &&
    !jab.includes('foreman') && !jab.includes('supervisor') && !jab.includes('admin') && 
    !jab.includes('superintendent') && !jab.includes('manager') && !jab.includes('specialist') && 
    !jab.includes('lead') && !jab.includes('officer')
  ) {
    return true;
  }
  return parseGolonganLevel(gol, jab) === 1;
}

/**
 * Aturan Khusus: Manager, Section Manager, Administration, QA, Inventory Control
 * digabung ke dalam naungan kelompok "Laboratory".
 */
export function getUnifiedSection(emp: any): string {
  const jab = String(emp.jabatan || emp.position || emp.role || '').toLowerCase();
  const sec = String(emp.section || emp.department || '').toLowerCase();

  if (
    jab.includes('manager') ||
    sec.includes('manager') ||
    jab.includes('head') ||
    sec.includes('head') ||
    sec.includes('admin') ||
    sec.includes('administrasi') ||
    sec.includes('qa') ||
    sec.includes('quality assurance') ||
    sec.includes('inventory') ||
    sec.includes('control') ||
    sec.includes('lab') ||
    sec.includes('laboratory')
  ) {
    return 'Laboratory';
  }

  if (sec.includes('prep') || sec.includes('preparasi')) {
    return 'Preparation';
  }
  if (sec.includes('maint') || sec.includes('pemeliharaan')) {
    return 'Maintenance';
  }
  return emp.section || 'Laboratory';
}

/**
 * Aturan Perusahaan: Hanya karyawan PT TBP dan PT GPS yang diambil.
 * Karyawan dari PT lain (seperti GTS, vendor, kontraktor) jangan diambil.
 */
export function isTbpOrGpsEmployee(emp: any): boolean {
  if (!emp) return false;
  const rawPt = String(emp.pt || emp.perusahaan || emp.company || '').trim().toUpperCase();
  const nik = String(emp.nik || '').trim().toUpperCase();

  // Jika PT eksplisit diisi
  if (rawPt) {
    if (rawPt.includes('TBP') || rawPt.includes('TRIMEGAH')) return true;
    if (rawPt.includes('GPS') || rawPt.includes('GEBE PRIMA')) return true;
    return false; // PT lain dilarang
  }

  // Jika PT kosong, cek NIK (misal GTS)
  if (nik.startsWith('GTS') || nik.includes('GTS')) {
    return false;
  }

  // Default PrepLab roster personil adalah PT TBP
  return true;
}

export function extractLeaveRecordsFromRoster(roster: any[]): LeaveRecord[] {
  const records: LeaveRecord[] = [];

  const isLeaveOrTravel = (c: string) => {
    return ['TRV', 'TV', 'C', 'CT', 'CI', 'CE', 'CR', 'CS', 'IK', 'I', 'SL', 'S', 'TT', 'XP'].includes(c) ||
           c.startsWith('CT') || c.startsWith('CE') || c.startsWith('CI') || c.startsWith('IK') || c.startsWith('CR');
  };

  for (const emp of roster) {
    // Filter PT: Hanya PT TBP dan GPS saja yang diambil, jangan ambil PT lain
    if (!isTbpOrGpsEmployee(emp)) {
      continue;
    }

    const sched = emp.fullSchedule || {};
    const entries = Object.entries(sched)
      .map(([dateStr, code]) => ({
        dateStr,
        date: parseKeyDate(dateStr),
        code: String(code || '').toUpperCase().trim()
      }))
      .filter((item): item is { dateStr: string; date: Date; code: string } => item.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (entries.length === 0) continue;

    // Group into consecutive leave blocks
    const blocks: typeof entries[] = [];
    let currentBlock: typeof entries = [];

    for (let i = 0; i < entries.length; i++) {
      const item = entries[i];
      if (isLeaveOrTravel(item.code)) {
        currentBlock.push(item);
      } else if (
        item.code === 'OFF' && 
        currentBlock.length > 0 && 
        i + 1 < entries.length && 
        isLeaveOrTravel(entries[i + 1].code)
      ) {
        // Tolerates intermediate OFF day inside leave block
        currentBlock.push(item);
      } else {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
      }
    }
    if (currentBlock.length > 0) blocks.push(currentBlock);

    // Process each leave block
    const isGol1 = checkIsGolonganI(emp);
    const pohVal = emp.poh || emp.tempatTinggal || emp.domisili || emp.alamatDomisili || emp.kota || '-';
    const jabatanVal = emp.jabatan || emp.position || '-';
    const golLevel = parseGolonganLevel(emp.gol || emp.golongan || emp.jobGrade, jabatanVal);
    const sectionVal = getUnifiedSection(emp);
    const originalSectionVal = emp.section || emp.department || (jabatanVal.toLowerCase().includes('section manager') ? 'Section Manager' : 'Laboratory');

    let blockIdx = 0;
    for (const block of blocks) {
      blockIdx++;
      const hasCoreLeave = block.some(b => 
        ['TRV', 'TV', 'C', 'CT', 'CI', 'CE', 'CR'].includes(b.code) || 
        b.code.startsWith('CT') || b.code.startsWith('CE')
      );
      if (!hasCoreLeave) continue;

      // 1. Tanggal Cuti: first TRV/TV or C/CT/CE
      const firstCutiItem = block.find(b => 
        ['TRV', 'TV', 'C', 'CT', 'CI', 'CE', 'CR'].includes(b.code) || 
        b.code.startsWith('CT') || b.code.startsWith('CE')
      ) || block[0];

      // Counters
      let travel = 0;
      let tahunanIstimewa = 0;
      let extra = 0;
      let izinKhusus = 0;
      let izin = 0;
      let tambahanTravel = 0;

      block.forEach(b => {
        const c = b.code;
        if (c === 'TRV' || c === 'TV') travel++;
        else if (c === 'CT' || c.startsWith('CT') || c === 'CI' || c.startsWith('CI') || c === 'C') tahunanIstimewa++;
        else if (c === 'CE' || c.startsWith('CE')) extra++;
        else if (c === 'IK' || c.startsWith('IK')) izinKhusus++;
        else if (c === 'I' || c === 'SL' || c === 'S' || c.startsWith('IZIN')) izin++;
        else if (c === 'TT') tambahanTravel++;
      });

      // Find index of last core cuti day
      let lastCoreCutiIdx = -1;
      for (let k = 0; k < block.length; k++) {
        const c = block[k].code;
        if (['C', 'CT', 'CI', 'CE', 'CR'].includes(c) || c.startsWith('CT') || c.startsWith('CE')) {
          lastCoreCutiIdx = k;
        }
      }

      // Check extensions (I / IK / SL / TT / XP) after core cuti
      let hasExtension = false;
      const extReasons: string[] = [];
      if (lastCoreCutiIdx !== -1) {
        for (let k = lastCoreCutiIdx + 1; k < block.length; k++) {
          const c = block[k].code;
          if (['I', 'IK', 'SL', 'S', 'TT', 'XP'].includes(c) || c.startsWith('IK')) {
            hasExtension = true;
            if (c === 'TT' && !extReasons.includes('TT (Travel Delay)')) extReasons.push('TT (Travel Delay)');
            if (c === 'XP' && !extReasons.includes('Speedboat (XP)')) extReasons.push('Speedboat (XP)');
            if ((c === 'I' || c.startsWith('IZIN')) && !extReasons.includes('Izin (I)')) extReasons.push('Izin (I)');
            if (c.startsWith('IK') && !extReasons.includes('Izin Khusus (IK)')) extReasons.push('Izin Khusus (IK)');
            if ((c === 'SL' || c === 'S') && !extReasons.includes('Sakit (SL)')) extReasons.push('Sakit (SL)');
          }
        }
      }

      const tanggalCutiRaw = firstCutiItem.date;
      let tanggalOnsiteRaw: Date;
      let perubahanJadwalOnsiteRaw: Date | null = null;
      let ket = 'Sesuai Roster';

      if (hasExtension) {
        // Planned return date was before extension
        let plannedOnsiteItem = block[lastCoreCutiIdx];
        if (
          lastCoreCutiIdx + 1 < block.length && 
          (block[lastCoreCutiIdx + 1].code === 'TRV' || block[lastCoreCutiIdx + 1].code === 'TV')
        ) {
          plannedOnsiteItem = block[lastCoreCutiIdx + 1];
        }
        tanggalOnsiteRaw = plannedOnsiteItem.date;
        perubahanJadwalOnsiteRaw = block[block.length - 1].date;
        ket = extReasons.join(', ') || 'Perubahan Jadwal';
      } else {
        tanggalOnsiteRaw = block[block.length - 1].date;
        perubahanJadwalOnsiteRaw = null;
        ket = 'Sesuai Roster';
      }

      // Cek apakah tanggal onsite atau perubahan jadwal onsite sudah melewati hari ini
      const effectiveOnsiteRaw = perubahanJadwalOnsiteRaw || tanggalOnsiteRaw;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const effectiveOnsiteZero = new Date(effectiveOnsiteRaw);
      effectiveOnsiteZero.setHours(0, 0, 0, 0);

      const isCutiSelesai = effectiveOnsiteZero.getTime() < today.getTime();
      if (isCutiSelesai) {
        ket = 'Cuti Selesai';
      }

      records.push({
        id: `${emp.nik}-${blockIdx}-${tanggalCutiRaw.getTime()}`,
        nik: emp.nik,
        nama: emp.name || emp.nama || '-',
        poh: pohVal,
        jabatan: jabatanVal,
        gol: emp.gol || (golLevel === 1 ? 'I' : golLevel === 2 ? 'II' : golLevel === 3 ? 'III' : golLevel === 4 ? 'IV' : 'V'),
        golLevel,
        isGol1,
        section: sectionVal,
        subSection: originalSectionVal,
        pt: String(emp.pt || '').toUpperCase().includes('GPS') ? 'GPS' : 'TBP',
        tanggalCuti: formatIndonesianDate(tanggalCutiRaw, { shortMonth: true }),
        tanggalCutiRaw,
        tanggalOnsite: formatIndonesianDate(tanggalOnsiteRaw, { shortMonth: true }),
        tanggalOnsiteRaw,
        perubahanJadwalOnsite: perubahanJadwalOnsiteRaw 
          ? formatIndonesianDate(perubahanJadwalOnsiteRaw, { shortMonth: true }) 
          : '-',
        perubahanJadwalOnsiteRaw,
        ket,
        travel,
        tahunanIstimewa,
        extra,
        izinKhusus,
        izin,
        tambahanTravel,
        totalHari: travel + tahunanIstimewa + extra + izinKhusus + izin + tambahanTravel,
        hasChange: hasExtension,
        isCutiSelesai
      });
    }
  }

  // Sort by Tanggal Cuti chronological
  return records.sort((a, b) => a.tanggalCutiRaw.getTime() - b.tanggalCutiRaw.getTime());
}

const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  no: true,
  nama: true,
  poh: true,
  jabatan: true,
  tanggalCuti: true,
  tanggalOnsite: true,
  ket: true,
  perubahanJadwalOnsite: true,
  travel: true,
  tahunanIstimewa: true,
  extra: true,
  izinKhusus: true,
  izin: true,
  tambahanTravel: true,
  totalHari: true,
  aksi: true,
};

const COLUMN_DEFS = [
  { id: 'no', label: 'NO' },
  { id: 'nama', label: 'NAMA & NIK' },
  { id: 'poh', label: 'POH' },
  { id: 'jabatan', label: 'JABATAN & GOL' },
  { id: 'tanggalCuti', label: 'TANGGAL CUTI' },
  { id: 'tanggalOnsite', label: 'TANGGAL ON SITE' },
  { id: 'ket', label: 'KET' },
  { id: 'perubahanJadwalOnsite', label: 'PERUBAHAN JADWAL ONSITE' },
  { id: 'travel', label: 'Travel (TRV)', group: 'duration' as const },
  { id: 'tahunanIstimewa', label: 'Tahunan / Istimewa', group: 'duration' as const },
  { id: 'extra', label: 'Extra (CE)', group: 'duration' as const },
  { id: 'izinKhusus', label: 'Izin Khusus (IK)', group: 'duration' as const },
  { id: 'izin', label: 'Izin (I / SL)', group: 'duration' as const },
  { id: 'tambahanTravel', label: 'Tambahan Travel (TT)', group: 'duration' as const },
  { id: 'totalHari', label: 'TOTAL HARI' },
  { id: 'aksi', label: 'AKSI (Edit)' },
];

export function RosterLeaveScheduleSheet({ 
  roster, 
  returnTo, 
  currentUser, 
  developerList = [] 
}: RosterLeaveScheduleSheetProps) {
  // 1. Current User Identity & Profile Resolution
  const user = useMemo(() => {
    if (currentUser) return currentUser;
    try {
      const saved = localStorage.getItem('p2h_inspector_profile');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
  }, [currentUser]);

  const userNik = String(user?.nik || (typeof localStorage !== 'undefined' ? localStorage.getItem('p2h_inspector_nik') : '') || '').trim();

  // Find user in roster to get the most accurate employee details
  const userFromRoster = useMemo(() => {
    if (!userNik || !roster) return null;
    return roster.find((e: any) => String(e.nik || '').trim() === userNik) || null;
  }, [userNik, roster]);

  const effectiveUser = useMemo(() => {
    return { ...user, ...(userFromRoster || {}) };
  }, [user, userFromRoster]);

  const effNik = String(effectiveUser?.nik || userNik).trim();
  const effRole = String(effectiveUser?.jabatan || effectiveUser?.position || effectiveUser?.role || '').toLowerCase();
  const effSection = String(effectiveUser?.section || effectiveUser?.department || '').toLowerCase();
  const effNama = String(effectiveUser?.nama || effectiveUser?.name || '').toLowerCase();

  // 2. Hak Akses Edit:
  // Hanya Section Administration, Manager, Developer, dan Meeting Room
  const isSuperAdmin = effNik === '02D25000055' || effNik === '02D24000043' || effNik === 'M0403240177' || effNik === 'preplabadmin';
  const isDeveloper = isSuperAdmin || (developerList && developerList.includes(effNik));

  const isAdministration = 
    effSection.includes('admin') || 
    effSection.includes('administrasi') || 
    effRole.includes('admin') || 
    effRole.includes('administrasi');

  const isManager = 
    effRole.includes('manager') || 
    effSection.includes('manager') || 
    effRole.includes('head') || 
    effSection.includes('head');

  const isMeetingRoom = 
    effNik.toLowerCase().includes('meeting') || 
    effNama.includes('meeting') || 
    effRole.includes('meeting') || 
    effSection.includes('meeting');

  const canEditLeave = isDeveloper || isAdministration || isManager || isMeetingRoom;

  // 3. User Unified Section
  const userUnifiedSection = useMemo(() => {
    return getUnifiedSection(effectiveUser);
  }, [effectiveUser]);

  // 4. Hak Akses Lihat (Only View Matrix):
  // - Gol I = tidak bisa dilihat atau di larang
  // - Gol II = Hanya bisa melihat Cuti Gol I dan II persection
  // - Gol III dan IV = Hanya bisa Melihat Cuti Gol I, II dan III Persection
  // - Gol V = Semuanya (begitu pula Admin / Manager / Developer / Meeting Room)
  const userGolLevel = useMemo(() => {
    if (canEditLeave) return 5;
    return parseGolonganLevel(effectiveUser?.gol || effectiveUser?.golongan || effectiveUser?.jobGrade, effRole);
  }, [canEditLeave, effectiveUser, effRole]);

  const isAccessForbidden = userGolLevel === 1;
  const isRestrictedPerSection = userGolLevel >= 2 && userGolLevel <= 4;

  // Sub-Sheet Tab: 'staff' (Gol II-V) vs 'crew' (Gol I)
  const [activeTab, setActiveTab] = useState<'staff' | 'crew'>('staff');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>(() => {
    if (isRestrictedPerSection) return userUnifiedSection;
    return 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lock section to userUnifiedSection for restricted users
  React.useEffect(() => {
    if (isRestrictedPerSection && selectedSection !== userUnifiedSection) {
      setSelectedSection(userUnifiedSection);
    }
  }, [isRestrictedPerSection, userUnifiedSection, selectedSection]);

  // Column Visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('preplab_leave_visible_cols');
      if (saved) return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
    } catch(e) {}
    return DEFAULT_VISIBLE_COLUMNS;
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const toggleColumn = (colKey: string) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [colKey]: !prev[colKey] };
      try {
        localStorage.setItem('preplab_leave_visible_cols', JSON.stringify(next));
      } catch(e) {}
      return next;
    });
  };

  const showAllColumns = () => {
    const allTrue = Object.keys(DEFAULT_VISIBLE_COLUMNS).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setVisibleColumns(allTrue);
    try {
      localStorage.setItem('preplab_leave_visible_cols', JSON.stringify(allTrue));
    } catch(e) {}
  };

  const resetDefaultColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    try {
      localStorage.setItem('preplab_leave_visible_cols', JSON.stringify(DEFAULT_VISIBLE_COLUMNS));
    } catch(e) {}
  };

  // Custom Overrides state (persisted to localStorage)
  const [customOverrides, setCustomOverrides] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem('preplab_leave_custom_overrides');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
  });

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    poh: string;
    tanggalCuti: string;
    tanggalOnsite: string;
    perubahanJadwalOnsite: string;
    ket: string;
    travel: number;
    tahunanIstimewa: number;
    extra: number;
    izinKhusus: number;
    izin: number;
    tambahanTravel: number;
  }>({
    poh: '',
    tanggalCuti: '',
    tanggalOnsite: '',
    perubahanJadwalOnsite: '',
    ket: '',
    travel: 0,
    tahunanIstimewa: 0,
    extra: 0,
    izinKhusus: 0,
    izin: 0,
    tambahanTravel: 0
  });

  const handleOpenEditModal = (rec: LeaveRecord) => {
    if (!canEditLeave) {
      toast.error('Akses ditolak: Hanya Section Administration, Manager, Developer, dan Meeting Room yang dapat mengedit.');
      return;
    }
    setEditingRecord(rec);
    setEditForm({
      poh: rec.poh || '',
      tanggalCuti: rec.tanggalCuti || '',
      tanggalOnsite: rec.tanggalOnsite || '',
      perubahanJadwalOnsite: rec.perubahanJadwalOnsite === '-' ? '' : rec.perubahanJadwalOnsite,
      ket: rec.ket || '',
      travel: rec.travel || 0,
      tahunanIstimewa: rec.tahunanIstimewa || 0,
      extra: rec.extra || 0,
      izinKhusus: rec.izinKhusus || 0,
      izin: rec.izin || 0,
      tambahanTravel: rec.tambahanTravel || 0
    });
  };

  const handleSaveRecordEdit = () => {
    if (!editingRecord || !canEditLeave) return;
    const travel = Math.max(0, Number(editForm.travel) || 0);
    const tahunanIstimewa = Math.max(0, Number(editForm.tahunanIstimewa) || 0);
    const extra = Math.max(0, Number(editForm.extra) || 0);
    const izinKhusus = Math.max(0, Number(editForm.izinKhusus) || 0);
    const izin = Math.max(0, Number(editForm.izin) || 0);
    const tambahanTravel = Math.max(0, Number(editForm.tambahanTravel) || 0);
    const totalHari = travel + tahunanIstimewa + extra + izinKhusus + izin + tambahanTravel;

    const overrideData = {
      poh: editForm.poh.trim() || editingRecord.poh,
      tanggalCuti: editForm.tanggalCuti.trim() || editingRecord.tanggalCuti,
      tanggalOnsite: editForm.tanggalOnsite.trim() || editingRecord.tanggalOnsite,
      perubahanJadwalOnsite: editForm.perubahanJadwalOnsite.trim() || '-',
      ket: editForm.ket.trim() || editingRecord.ket,
      travel,
      tahunanIstimewa,
      extra,
      izinKhusus,
      izin,
      tambahanTravel,
      totalHari
    };

    setCustomOverrides(prev => {
      const next = { ...prev, [editingRecord.id]: overrideData };
      try {
        localStorage.setItem('preplab_leave_custom_overrides', JSON.stringify(next));
      } catch(e) {}
      return next;
    });

    toast.success(`Jadwal cuti ${editingRecord.nama} berhasil diperbarui!`);
    setEditingRecord(null);
  };

  const handleResetRecordToOriginal = () => {
    if (!editingRecord || !canEditLeave) return;
    setCustomOverrides(prev => {
      const next = { ...prev };
      delete next[editingRecord.id];
      try {
        localStorage.setItem('preplab_leave_custom_overrides', JSON.stringify(next));
      } catch(e) {}
      return next;
    });

    toast.info(`Jadwal cuti ${editingRecord.nama} dikembalikan ke kalkulasi roster asli.`);
    setEditingRecord(null);
  };

  // Extract all leave records from raw roster
  const allLeaveRecords = useMemo(() => {
    return extractLeaveRecordsFromRoster(roster);
  }, [roster]);

  // Merge with custom overrides
  const mergedLeaveRecords = useMemo(() => {
    return allLeaveRecords.map(rec => {
      const ov = customOverrides[rec.id];
      if (!ov) return rec;
      const travel = ov.travel !== undefined ? ov.travel : rec.travel;
      const tahunanIstimewa = ov.tahunanIstimewa !== undefined ? ov.tahunanIstimewa : rec.tahunanIstimewa;
      const extra = ov.extra !== undefined ? ov.extra : rec.extra;
      const izinKhusus = ov.izinKhusus !== undefined ? ov.izinKhusus : rec.izinKhusus;
      const izin = ov.izin !== undefined ? ov.izin : rec.izin;
      const tambahanTravel = ov.tambahanTravel !== undefined ? ov.tambahanTravel : rec.tambahanTravel;
      const totalHari = travel + tahunanIstimewa + extra + izinKhusus + izin + tambahanTravel;
      const perubahanJadwalOnsite = ov.perubahanJadwalOnsite !== undefined ? ov.perubahanJadwalOnsite : rec.perubahanJadwalOnsite;
      const hasChange = (perubahanJadwalOnsite && perubahanJadwalOnsite !== '-') || rec.hasChange;

      return {
        ...rec,
        poh: ov.poh !== undefined ? ov.poh : rec.poh,
        tanggalCuti: ov.tanggalCuti !== undefined ? ov.tanggalCuti : rec.tanggalCuti,
        tanggalOnsite: ov.tanggalOnsite !== undefined ? ov.tanggalOnsite : rec.tanggalOnsite,
        perubahanJadwalOnsite,
        ket: ov.ket !== undefined ? ov.ket : rec.ket,
        travel,
        tahunanIstimewa,
        extra,
        izinKhusus,
        izin,
        tambahanTravel,
        totalHari,
        hasChange,
        isCustomEdited: true
      };
    });
  }, [allLeaveRecords, customOverrides]);

  // Access Control Matrix Filtering:
  // - Gol I: Dilarang (empty array)
  // - Gol II: Hanya Gol I dan II pada section yang sama
  // - Gol III & IV: Hanya Gol I, II, dan III pada section yang sama
  // - Gol V & Editors: Semuanya
  const accessibleRecords = useMemo(() => {
    if (isAccessForbidden) return [];
    if (userGolLevel >= 5) return mergedLeaveRecords;

    return mergedLeaveRecords.filter(rec => {
      // Wajib section yang sama
      if (rec.section !== userUnifiedSection) return false;

      // Gol II: Hanya Gol I dan II
      if (userGolLevel === 2) {
        return rec.golLevel <= 2;
      }

      // Gol III dan IV: Hanya Gol I, II, dan III
      if (userGolLevel === 3 || userGolLevel === 4) {
        return rec.golLevel <= 3;
      }

      return false;
    });
  }, [mergedLeaveRecords, isAccessForbidden, userGolLevel, userUnifiedSection]);

  // Extract available periods (Month + Year) from accessible data
  const availablePeriods = useMemo(() => {
    const periodSet = new Set<string>();
    accessibleRecords.forEach(rec => {
      const d = rec.tanggalCutiRaw;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      periodSet.add(key);
    });

    const sortedKeys = Array.from(periodSet).sort();
    return sortedKeys.map(key => {
      const [year, month] = key.split('-').map(Number);
      return {
        key,
        label: `${MONTH_NAMES_ID[month - 1]} ${year}`
      };
    });
  }, [accessibleRecords]);

  // Set default month to current month if present in data
  useMemo(() => {
    if (selectedMonth === 'ALL' && availablePeriods.length > 0) {
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const found = availablePeriods.find(p => p.key === currentKey);
      if (found) {
        setSelectedMonth(currentKey);
      }
    }
  }, [availablePeriods]);

  // Available sections
  const availableSections = useMemo(() => {
    if (isRestrictedPerSection) {
      return [userUnifiedSection];
    }
    const set = new Set<string>();
    accessibleRecords.forEach(e => {
      if (activeTab === 'staff' && e.isGol1) return;
      if (activeTab === 'crew' && !e.isGol1) return;
      if (e.section) set.add(e.section);
    });
    return Array.from(set).sort();
  }, [isRestrictedPerSection, userUnifiedSection, accessibleRecords, activeTab]);

  // Visible duration columns count & layout helpers
  const visibleDurationColsCount = useMemo(() => {
    return ['travel', 'tahunanIstimewa', 'extra', 'izinKhusus', 'izin', 'tambahanTravel']
      .filter(c => visibleColumns[c]).length;
  }, [visibleColumns]);

  const visibleBeforeDurationCount = useMemo(() => {
    return ['no', 'nama', 'poh', 'jabatan', 'tanggalCuti', 'tanggalOnsite', 'ket', 'perubahanJadwalOnsite']
      .filter(c => visibleColumns[c]).length;
  }, [visibleColumns]);

  const totalVisibleCols = useMemo(() => {
    return Object.keys(visibleColumns).filter(k => {
      if (k === 'aksi' && !canEditLeave) return false;
      return visibleColumns[k];
    }).length;
  }, [visibleColumns, canEditLeave]);

  const activeColumnDefs = useMemo(() => {
    return COLUMN_DEFS.filter(col => col.id !== 'aksi' || canEditLeave);
  }, [canEditLeave]);

  const hiddenColsCount = useMemo(() => {
    return activeColumnDefs.length - totalVisibleCols;
  }, [activeColumnDefs, totalVisibleCols]);

  // Filtered records based on tab, month, section, and search
  const filteredRecords = useMemo(() => {
    return accessibleRecords.filter(rec => {
      // 1. Tab Golongan
      if (activeTab === 'staff' && rec.isGol1) return false;
      if (activeTab === 'crew' && !rec.isGol1) return false;

      // 2. Periode Cuti (Bulan)
      if (selectedMonth !== 'ALL') {
        const [y, m] = selectedMonth.split('-').map(Number);
        const cutiMonth = rec.tanggalCutiRaw.getMonth() + 1;
        const cutiYear = rec.tanggalCutiRaw.getFullYear();
        const onsiteMonth = rec.tanggalOnsiteRaw.getMonth() + 1;
        const onsiteYear = rec.tanggalOnsiteRaw.getFullYear();

        // Matches if leave starts or returns in this month
        const matchStart = cutiYear === y && cutiMonth === m;
        const matchEnd = onsiteYear === y && onsiteMonth === m;
        if (!matchStart && !matchEnd) return false;
      }

      // 3. Section
      if (selectedSection !== 'ALL' && rec.section !== selectedSection) {
        return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.nama.toLowerCase().includes(q);
        const matchNik = rec.nik.toLowerCase().includes(q);
        const matchJab = rec.jabatan.toLowerCase().includes(q);
        const matchPoh = rec.poh.toLowerCase().includes(q);
        if (!matchName && !matchNik && !matchJab && !matchPoh) return false;
      }

      return true;
    });
  }, [accessibleRecords, activeTab, selectedMonth, selectedSection, searchQuery]);

  // Statistics KPI
  const stats = useMemo(() => {
    const totalPersonil = filteredRecords.length;
    const traveling = filteredRecords.reduce((acc, r) => acc + r.travel, 0);
    const withChanges = filteredRecords.filter(r => r.hasChange).length;
    const totalHari = filteredRecords.reduce((acc, r) => acc + r.totalHari, 0);
    const avgHari = totalPersonil > 0 ? (totalHari / totalPersonil).toFixed(1) : '0';

    const sumTahunan = filteredRecords.reduce((acc, r) => acc + r.tahunanIstimewa, 0);
    const sumExtra = filteredRecords.reduce((acc, r) => acc + r.extra, 0);
    const sumIK = filteredRecords.reduce((acc, r) => acc + r.izinKhusus, 0);
    const sumIzin = filteredRecords.reduce((acc, r) => acc + r.izin, 0);
    const sumTT = filteredRecords.reduce((acc, r) => acc + r.tambahanTravel, 0);

    return {
      totalPersonil,
      traveling,
      withChanges,
      totalHari,
      avgHari,
      sumTahunan,
      sumExtra,
      sumIK,
      sumIzin,
      sumTT
    };
  }, [filteredRecords]);

  // Export to Excel function (.xlsx)
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error('Tidak ada data cuti untuk diekspor.');
      return;
    }

    const titleSheet = activeTab === 'staff' ? 'PT TBP & PT GPS - STAFF LAB (Gol II-V)' : 'PT TBP & PT GPS - CREW PREP & LAB (Gol I)';
    const periodLabel = selectedMonth === 'ALL' 
      ? 'Semua Periode' 
      : availablePeriods.find(p => p.key === selectedMonth)?.label || selectedMonth;

    // Build worksheet data matching the physical format
    const wsData: any[][] = [
      [`PREP & LAB - ${titleSheet.toUpperCase()}`],
      [`Periode Cuti: ${periodLabel} | Section: ${selectedSection === 'ALL' ? 'Semua Section' : selectedSection}`],
      [`Entitas: PT Trimegah Bangun Persada (TBP) & PT Gebe Prima Sentosa (GPS)`],
      [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
      [], // blank line
      [
        'NO',
        'NAMA & NIK',
        'PERUSAHAAN (PT)',
        'POH',
        'JABATAN',
        'TANGGAL CUTI',
        'TANGGAL ON SITE',
        'KET',
        'PERUBAHAN JADWAL ONSITE',
        'Travel',
        'TAHUNAN / ISTIMEWA',
        'EXTRA',
        'IZIN KHUSUS',
        'IZIN',
        'Tambahan Travel (Jika tidak ada Transport)',
        'TOTAL HARI'
      ]
    ];

    filteredRecords.forEach((rec, idx) => {
      wsData.push([
        idx + 1,
        `${rec.nama} (${rec.nik})`,
        rec.pt,
        rec.poh,
        rec.jabatan,
        rec.tanggalCuti,
        rec.tanggalOnsite,
        rec.ket,
        rec.perubahanJadwalOnsite,
        rec.travel,
        rec.tahunanIstimewa,
        rec.extra,
        rec.izinKhusus,
        rec.izin,
        rec.tambahanTravel,
        rec.totalHari
      ]);
    });

    // Total Row
    wsData.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      stats.traveling,
      stats.sumTahunan,
      stats.sumExtra,
      stats.sumIK,
      stats.sumIzin,
      stats.sumTT,
      stats.totalHari
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // NO
      { wch: 32 },  // NAMA & NIK
      { wch: 18 },  // PERUSAHAAN (PT)
      { wch: 16 },  // POH
      { wch: 24 },  // JABATAN
      { wch: 16 },  // TANGGAL CUTI
      { wch: 16 },  // TANGGAL ON SITE
      { wch: 26 },  // KET
      { wch: 24 },  // PERUBAHAN JADWAL ONSITE
      { wch: 8 },   // Travel
      { wch: 20 },  // TAHUNAN / ISTIMEWA
      { wch: 8 },   // EXTRA
      { wch: 14 },  // IZIN KHUSUS
      { wch: 8 },   // IZIN
      { wch: 36 },  // Tambahan Travel
      { wch: 12 }   // TOTAL HARI
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'staff' ? 'Staff_TBP_GPS' : 'Crew_TBP_GPS');

    const fileName = `Jadwal_Cuti_${activeTab === 'staff' ? 'Staff_Gol_II-V' : 'Crew_Gol_I'}_${periodLabel.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Jadwal Cuti berhasil diekspor ke Excel: ${fileName}`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Golongan I: Dilarang melihat / Akses tidak diizinkan
  if (isAccessForbidden) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
        {/* Return to Labnote Banner (if opened from Labnote) */}
        {returnTo && (
          <div className="p-3.5 sm:p-4 rounded-2xl border border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black flex items-center gap-2">
                  <span>Terhubung dari Modul Labnote</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white shadow-2xs">
                    Labnote Active
                  </span>
                </div>
                <div className="text-[11px] text-teal-700 dark:text-teal-300 font-medium mt-0.5">
                  Anda dialihkan dari task Labnote. Klik tombol kembali di samping untuk kembali ke halaman Labnote semula.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  window.location.href = decodeURIComponent(returnTo);
                } catch(e) {
                  window.location.href = returnTo;
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm hover:shadow-teal-500/20 transition-all cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Labnote</span>
            </button>
          </div>
        )}

        {/* Access Denied Card for Golongan I */}
        <div className="p-8 sm:p-14 rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 shadow-md text-center max-w-2xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 mx-auto flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <Lock className="w-3.5 h-3.5" />
              <span>Hak Akses Terbatas &bull; Golongan I</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Akses Jadwal Cuti Tidak Diizinkan
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Berdasarkan kebijakan hak akses operasional PrepLab, modul <strong>Jadwal & Riwayat Cuti Karyawan</strong> tidak dapat dilihat atau diakses oleh personil <strong>Golongan I</strong>.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Silakan hubungi Section Administration, Pengawas Lapangan, atau Manager Anda untuk kebutuhan informasi jadwal dan perjalanan cuti.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            {returnTo ? (
              <button
                type="button"
                onClick={() => {
                  try {
                    window.location.href = decodeURIComponent(returnTo);
                  } catch(e) {
                    window.location.href = returnTo;
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke Labnote</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('view');
                    window.location.href = url.pathname;
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-sm transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke Matriks Roster Harian</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Return to Labnote Banner (if opened from Labnote) */}
      {returnTo && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black flex items-center gap-2">
                <span>Terhubung dari Modul Labnote</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white shadow-2xs">
                  Labnote Active
                </span>
              </div>
              <div className="text-[11px] text-teal-700 dark:text-teal-300 font-medium mt-0.5">
                Anda dialihkan dari task Labnote. Klik tombol kembali di samping untuk kembali ke halaman Labnote semula.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                window.location.href = decodeURIComponent(returnTo);
              } catch(e) {
                window.location.href = returnTo;
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm hover:shadow-teal-500/20 transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Labnote</span>
          </button>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Edit Jadwal & Rincian Cuti
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {editingRecord.nama} ({editingRecord.nik}) • Gol {editingRecord.gol}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
              {/* Row 1: POH & KET */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    POH (Point of Hire)
                  </label>
                  <input
                    type="text"
                    value={editForm.poh}
                    onChange={(e) => setEditForm(prev => ({ ...prev, poh: e.target.value }))}
                    placeholder="Contoh: Ternate, Jakarta, dll."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Keterangan (KET)
                  </label>
                  <input
                    type="text"
                    value={editForm.ket}
                    onChange={(e) => setEditForm(prev => ({ ...prev, ket: e.target.value }))}
                    placeholder="Normal, Cuti Selesai, Extend, dll."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Row 2: Tanggal Cuti, Tanggal Onsite, Perubahan Onsite */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    Tanggal Cuti
                  </label>
                  <input
                    type="text"
                    value={editForm.tanggalCuti}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tanggalCuti: e.target.value }))}
                    placeholder="24 Agu 2026"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 font-bold text-emerald-800 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-teal-700 dark:text-teal-400 mb-1">
                    Tanggal On Site
                  </label>
                  <input
                    type="text"
                    value={editForm.tanggalOnsite}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tanggalOnsite: e.target.value }))}
                    placeholder="7 Sep 2026"
                    className="w-full px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20 font-bold text-teal-800 dark:text-teal-300 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-700 dark:text-amber-400 mb-1">
                    Perubahan Onsite
                  </label>
                  <input
                    type="text"
                    value={editForm.perubahanJadwalOnsite}
                    onChange={(e) => setEditForm(prev => ({ ...prev, perubahanJadwalOnsite: e.target.value }))}
                    placeholder="Kosongkan jika '-' "
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 font-bold text-amber-800 dark:text-amber-300 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Section: Rincian Durasi / Jenis Cuti (Hari) */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                    Rincian Durasi & Jenis Cuti (Hari)
                  </span>
                  <div className="text-xs font-bold text-slate-500">
                    Total: <span className="text-teal-600 dark:text-teal-400 font-black text-sm">
                      {(Number(editForm.travel) || 0) +
                       (Number(editForm.tahunanIstimewa) || 0) +
                       (Number(editForm.extra) || 0) +
                       (Number(editForm.izinKhusus) || 0) +
                       (Number(editForm.izin) || 0) +
                       (Number(editForm.tambahanTravel) || 0)} Hari
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                      Travel (TRV)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.travel}
                      onChange={(e) => setEditForm(prev => ({ ...prev, travel: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                      Tahunan / Istimewa (CT/CI)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.tahunanIstimewa}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tahunanIstimewa: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                      Extra (CE)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.extra}
                      onChange={(e) => setEditForm(prev => ({ ...prev, extra: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                      Izin Khusus (IK)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.izinKhusus}
                      onChange={(e) => setEditForm(prev => ({ ...prev, izinKhusus: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                      Izin (I / SL)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.izin}
                      onChange={(e) => setEditForm(prev => ({ ...prev, izin: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-700 dark:text-amber-400 text-[11px] mb-1">
                      Tambahan Travel (TT)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.tambahanTravel}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tambahanTravel: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div>
                {customOverrides[editingRecord.id] && (
                  <button
                    type="button"
                    onClick={handleResetRecordToOriginal}
                    className="text-rose-600 hover:text-rose-700 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset ke Roster Asli</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecordEdit}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Entrepreneurial Executive Header Card - Crisp Executive White Style */}
      <div 
        className="p-4 sm:p-6 rounded-2xl border shadow-xs relative overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: 'var(--border-main, #E2E8F0)',
          color: '#0F172A'
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sistem Manajemen Cuti Terintegrasi Roster</span>
              </div>

              {canEditLeave ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>Akses Editor: {isDeveloper ? 'Developer' : isManager ? 'Manager' : isMeetingRoom ? 'Meeting Room' : 'Section Administration'}</span>
                </div>
              ) : isRestrictedPerSection ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs">
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  <span>Mode Lihat: Gol I – {userGolLevel === 2 ? 'II' : 'III'} ({userUnifiedSection})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-2xs">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Akses Lihat Lengkap (Gol V)</span>
                </div>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>Jadwal & Riwayat Cuti Personil</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-normal leading-relaxed">
              Otomatisasi kalkulasi tanggal cuti, perjalanan (TRV), kuota cuti tahunan/extra/khusus, serta monitoring perubahan jadwal on-site terverifikasi dari Roster Harian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
              title="Cetak Jadwal Cuti"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Stats Cards - Clean White Background */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-200">
          <div className="bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold mb-1">
              <span>Total Personil Cuti</span>
              <Users className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900">
              {stats.totalPersonil} <span className="text-xs font-normal text-slate-500">Orang</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Tercatat pada periode terpilih
            </div>
          </div>

          <div className="bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold mb-1">
              <span>Total Travel (TRV)</span>
              <Plane className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-600">
              {stats.traveling} <span className="text-xs font-normal text-slate-500">Hari</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Akumulasi hari perjalanan
            </div>
          </div>

          <div className="bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold mb-1">
              <span>Perubahan Onsite</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-rose-600">
              {stats.withChanges} <span className="text-xs font-normal text-slate-500">Orang</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Extend / Delay transportasi
            </div>
          </div>

          <div className="bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold mb-1">
              <span>Rata-rata Durasi</span>
              <Clock className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-teal-700">
              {stats.avgHari} <span className="text-xs font-normal text-slate-500">Hari / Orang</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Total {stats.totalHari} hari cuti
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sub-Sheet Tabs (Staff Gol II-V vs Crew Gol I) */}
      <div 
        className="p-1.5 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)'
        }}
      >
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Staff & SPV (Gol II – V)</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
              activeTab === 'staff'
                ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {accessibleRecords.filter(r => !r.isGol1).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crew')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'crew'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Crew & Operator (Gol I)</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
              activeTab === 'crew'
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {accessibleRecords.filter(r => r.isGol1).length}
            </span>
          </button>
        </div>

        {/* Active Sheet Badge Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 font-medium">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Menampilkan tabel resmi: <strong className="text-slate-700 dark:text-slate-200">{activeTab === 'staff' ? 'PREP & LAB - STAFF LAB' : 'PREP & LAB - CREW LAB'}</strong>
          </span>
        </div>
      </div>

      {/* Filter Bar (Periode Cuti Bulan, Section, Sembunyikan Kolom, Search) */}
      <div 
        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs space-y-3"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)'
        }}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left filters: Month, Section & Column Visibility */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Periode Cuti (Bulan) Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Periode Cuti:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 rounded-xl border outline-none cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: 'var(--input-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)',
                  color: 'var(--text-main, #1E293B)'
                }}
              >
                <option value="ALL">Semua Periode ({accessibleRecords.length} Data)</option>
                {availablePeriods.map(p => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Section:
              </span>
              {isRestrictedPerSection ? (
                <div 
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-bold shadow-2xs"
                  style={{
                    backgroundColor: 'var(--input-bg, #F8FAFC)',
                    borderColor: 'var(--border-main, #CBD5E1)',
                    color: 'var(--text-main, #0F172A)'
                  }}
                  title="Hak akses terkunci pada section Anda"
                >
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>{userUnifiedSection}</span>
                  <span className="text-[10px] font-normal text-slate-500">(Seksi Anda)</span>
                </div>
              ) : (
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="text-xs font-bold py-1.5 px-3 rounded-xl border outline-none cursor-pointer shadow-2xs"
                  style={{
                    backgroundColor: 'var(--input-bg, #FFFFFF)',
                    borderColor: 'var(--border-main, #E2E8F0)',
                    color: 'var(--text-main, #1E293B)'
                  }}
                >
                  <option value="ALL">Semua Section</option>
                  {availableSections.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Column Visibility Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnMenu(prev => !prev)}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                title="Atur kolom yang ingin ditampilkan atau disembunyikan"
              >
                <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Sembunyikan Kolom</span>
                {hiddenColsCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {hiddenColsCount}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {showColumnMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowColumnMenu(false)} 
                  />
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in zoom-in-95 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Settings2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Atur Visibilitas Kolom</span>
                      </span>
                      <button 
                        type="button"
                        onClick={() => setShowColumnMenu(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={showAllColumns}
                        className="text-teal-600 hover:text-teal-700 font-bold hover:underline"
                      >
                        Tampilkan Semua
                      </button>
                      <button
                        type="button"
                        onClick={resetDefaultColumns}
                        className="text-slate-500 hover:text-slate-700 font-medium hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset Default</span>
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {activeColumnDefs.map((col) => {
                        const isVisible = visibleColumns[col.id] !== false;
                        return (
                          <label
                            key={col.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => toggleColumn(col.id)}
                                className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                              />
                              <span className={`font-semibold ${isVisible ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                                {col.label}
                              </span>
                            </div>
                            {col.group === 'duration' && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                                Durasi
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIK, jabatan, POH..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none font-medium shadow-2xs"
              style={{
                backgroundColor: 'var(--input-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-main, #1E293B)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div 
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Header Title Bar */}
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th colSpan={totalVisibleCols} className="py-3 px-4 font-black tracking-wide uppercase text-xs sm:text-sm text-center bg-slate-900 text-white">
                  {activeTab === 'staff' ? 'PREP & LAB - STAFF LAB' : 'PREP & LAB - CREW PREPARASI & LAB'}
                </th>
              </tr>
              {/* Main Column Headers */}
              <tr 
                className="border-b text-[11px] font-bold uppercase tracking-wider select-none bg-slate-50 dark:bg-slate-900/60"
                style={{
                  borderColor: 'var(--border-main, #E2E8F0)',
                  color: 'var(--text-muted, #64748B)'
                }}
              >
                {visibleColumns.no && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center w-12 border-r border-slate-200 dark:border-slate-800">NO</th>
                )}
                {visibleColumns.nama && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-4 min-w-[180px] border-r border-slate-200 dark:border-slate-800">NAMA & NIK</th>
                )}
                {visibleColumns.poh && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 min-w-[110px] border-r border-slate-200 dark:border-slate-800">POH</th>
                )}
                {visibleColumns.jabatan && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 min-w-[140px] border-r border-slate-200 dark:border-slate-800">JABATAN</th>
                )}
                {visibleColumns.tanggalCuti && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[110px] border-r border-slate-200 dark:border-slate-800 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300">
                    TANGGAL CUTI
                  </th>
                )}
                {visibleColumns.tanggalOnsite && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[110px] border-r border-slate-200 dark:border-slate-800 bg-teal-500/5 text-teal-800 dark:text-teal-300">
                    TANGGAL ON SITE
                  </th>
                )}
                {visibleColumns.ket && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-800">KET</th>
                )}
                {visibleColumns.perubahanJadwalOnsite && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[120px] border-r border-slate-200 dark:border-slate-800 bg-amber-500/5 text-amber-800 dark:text-amber-300">
                    PERUBAHAN JADWAL ONSITE
                  </th>
                )}

                {/* Duration Group Header */}
                {visibleDurationColsCount > 0 && (
                  <th colSpan={visibleDurationColsCount} className="py-1.5 px-2 text-center border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-extrabold">
                    RINCIAN DURASI / JENIS CUTI (HARI)
                  </th>
                )}

                {visibleColumns.totalHari && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[70px] border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold">
                    TOTAL HARI
                  </th>
                )}

                {canEditLeave && visibleColumns.aksi && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[70px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold">
                    AKSI
                  </th>
                )}
              </tr>

              {/* Sub-headers for duration columns */}
              {visibleDurationColsCount > 0 && (
                <tr 
                  className="border-b text-[10px] font-bold uppercase tracking-wider bg-slate-100/70 dark:bg-slate-800/50"
                  style={{
                    borderColor: 'var(--border-main, #E2E8F0)',
                    color: 'var(--text-muted, #64748B)'
                  }}
                >
                  {visibleColumns.travel && (
                    <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Perjalanan Masuk & Pulang (TRV)">Travel</th>
                  )}
                  {visibleColumns.tahunanIstimewa && (
                    <th className="py-1.5 px-2 text-center w-24 border-r border-slate-200 dark:border-slate-800" title="Cuti Tahunan (CT) & Istimewa (CI)">Tahunan / Istimewa</th>
                  )}
                  {visibleColumns.extra && (
                    <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Cuti Extra (CE)">Extra</th>
                  )}
                  {visibleColumns.izinKhusus && (
                    <th className="py-1.5 px-2 text-center w-20 border-r border-slate-200 dark:border-slate-800" title="Izin Khusus (IK)">Izin Khusus</th>
                  )}
                  {visibleColumns.izin && (
                    <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Izin Biasa / Sakit (I / SL)">Izin</th>
                  )}
                  {visibleColumns.tambahanTravel && (
                    <th className="py-1.5 px-2 text-center min-w-[140px] border-r border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400" title="Tambahan Travel jika tidak ada transportasi (TT)">
                      Tambahan Travel (TT)
                    </th>
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={totalVisibleCols} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Plane className="w-8 h-8 opacity-30 text-teal-500 animate-pulse" />
                      <span className="font-semibold text-sm">Tidak ada jadwal cuti yang sesuai filter.</span>
                      <span className="text-xs text-slate-400">Silakan ubah pilihan Periode Bulan, Section, atau kata kunci pencarian.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => {
                  const isEven = index % 2 === 0;
                  const isSelesai = rec.isCutiSelesai;
                  return (
                    <tr 
                      key={rec.id}
                      className={`transition-colors ${
                        isSelesai
                          ? 'bg-rose-100/75 dark:bg-rose-950/40 hover:bg-rose-200/70 dark:hover:bg-rose-950/60 text-rose-950 dark:text-rose-100 border-b border-rose-300/80 dark:border-rose-900/60'
                          : isEven 
                            ? 'bg-white dark:bg-slate-900/40 hover:bg-teal-50/40 dark:hover:bg-teal-950/20' 
                            : 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-teal-50/40 dark:hover:bg-teal-950/20'
                      }`}
                    >
                      {/* NO */}
                      {visibleColumns.no && (
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">
                          {index + 1}
                        </td>
                      )}

                      {/* NAMA & NIK */}
                      {visibleColumns.nama && (
                        <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white leading-tight">
                              {rec.nama}
                            </span>
                            {rec.isCustomEdited && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0" title="Data baris ini telah dimodifikasi secara kustom">
                                Diedit
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{rec.nik}</span>
                            <span>•</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              rec.pt === 'GPS' 
                                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30' 
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            }`}>
                              PT {rec.pt}
                            </span>
                            <span>•</span>
                            <span className="text-teal-600 dark:text-teal-400 font-semibold">{rec.section}</span>
                            {rec.subSection && rec.subSection !== rec.section && (
                              <span className="text-slate-400 font-normal">({rec.subSection})</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* POH */}
                      {visibleColumns.poh && (
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{rec.poh}</span>
                          </div>
                        </td>
                      )}

                      {/* JABATAN */}
                      {visibleColumns.jabatan && (
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800">
                          <div className="text-slate-800 dark:text-slate-200 font-semibold leading-tight">
                            {rec.jabatan}
                          </div>
                          <div className="mt-0.5">
                            <span className="inline-block text-[9px] px-1.5 py-0.2 rounded font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              Gol {rec.gol}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* TANGGAL CUTI */}
                      {visibleColumns.tanggalCuti && (
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800 bg-emerald-500/5">
                          {rec.tanggalCuti}
                        </td>
                      )}

                      {/* TANGGAL ON SITE */}
                      {visibleColumns.tanggalOnsite && (
                        <td className="py-2.5 px-3 text-center font-bold text-teal-700 dark:text-teal-400 border-r border-slate-100 dark:border-slate-800 bg-teal-500/5">
                          {rec.tanggalOnsite}
                        </td>
                      )}

                      {/* KET */}
                      {visibleColumns.ket && (
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800">
                          {rec.isCutiSelesai ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Cuti Selesai
                            </span>
                          ) : rec.hasChange ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <AlertCircle className="w-2.5 h-2.5" />
                              {rec.ket}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              <Check className="w-2.5 h-2.5 text-emerald-500" />
                              {rec.ket}
                            </span>
                          )}
                        </td>
                      )}

                      {/* PERUBAHAN JADWAL ONSITE */}
                      {visibleColumns.perubahanJadwalOnsite && (
                        <td className="py-2.5 px-3 text-center font-bold border-r border-slate-100 dark:border-slate-800">
                          {rec.hasChange ? (
                            <span className="px-2 py-1 rounded-lg font-black text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30">
                              {rec.perubahanJadwalOnsite}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                      )}

                      {/* Travel (TRV) */}
                      {visibleColumns.travel && (
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {rec.travel > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                              {rec.travel}
                            </span>
                          ) : '-'}
                        </td>
                      )}

                      {/* Tahunan / Istimewa (CT/CI) */}
                      {visibleColumns.tahunanIstimewa && (
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {rec.tahunanIstimewa > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold">
                              {rec.tahunanIstimewa}
                            </span>
                          ) : '-'}
                        </td>
                      )}

                      {/* Extra (CE) */}
                      {visibleColumns.extra && (
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {rec.extra > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold">
                              {rec.extra}
                            </span>
                          ) : '-'}
                        </td>
                      )}

                      {/* Izin Khusus (IK) */}
                      {visibleColumns.izinKhusus && (
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {rec.izinKhusus > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold">
                              {rec.izinKhusus}
                            </span>
                          ) : '-'}
                        </td>
                      )}

                      {/* Izin / Sakit (I/SL) */}
                      {visibleColumns.izin && (
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {rec.izin > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 font-bold">
                              {rec.izin}
                            </span>
                          ) : '-'}
                        </td>
                      )}

                      {/* Tambahan Travel (TT) */}
                      {visibleColumns.tambahanTravel && (
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {rec.tambahanTravel > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 font-black">
                              {rec.tambahanTravel}
                            </span>
                          ) : '-'}
                        </td>
                      )}

                      {/* TOTAL HARI */}
                      {visibleColumns.totalHari && (
                        <td className="py-2.5 px-3 text-center font-black text-slate-900 dark:text-white bg-slate-100/80 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-800">
                          {rec.totalHari}
                        </td>
                      )}

                      {/* AKSI (Edit Button) */}
                      {canEditLeave && visibleColumns.aksi && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 transition-all cursor-pointer shadow-2xs"
                            title="Edit data cuti personil ini"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Total Footer Row */}
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  {visibleBeforeDurationCount > 0 && (
                    <td colSpan={visibleBeforeDurationCount} className="py-3 px-4 text-right uppercase tracking-wider text-xs border-r border-slate-200 dark:border-slate-700">
                      TOTAL KESELURUHAN ({filteredRecords.length} Personil):
                    </td>
                  )}
                  {visibleColumns.travel && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400">
                      {stats.traveling}
                    </td>
                  )}
                  {visibleColumns.tahunanIstimewa && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-400">
                      {stats.sumTahunan}
                    </td>
                  )}
                  {visibleColumns.extra && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400">
                      {stats.sumExtra}
                    </td>
                  )}
                  {visibleColumns.izinKhusus && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-400">
                      {stats.sumIK}
                    </td>
                  )}
                  {visibleColumns.izin && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-yellow-800 dark:text-yellow-400">
                      {stats.sumIzin}
                    </td>
                  )}
                  {visibleColumns.tambahanTravel && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-400">
                      {stats.sumTT}
                    </td>
                  )}
                  {visibleColumns.totalHari && (
                    <td className="py-3 px-3 text-center text-teal-600 dark:text-teal-400 text-sm border-r border-slate-200 dark:border-slate-700">
                      {stats.totalHari}
                    </td>
                  )}
                  {canEditLeave && visibleColumns.aksi && (
                    <td className="py-3 px-2 text-center text-slate-400">
                      -
                    </td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
