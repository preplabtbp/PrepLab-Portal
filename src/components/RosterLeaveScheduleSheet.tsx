import React, { useState, useMemo } from 'react';
import { 
  Plane, PlaneTakeoff, Calendar, Users, Search, Filter, 
  FileSpreadsheet, Download, RefreshCw, AlertCircle, CheckCircle2, 
  Clock, Sparkles, Shield, ArrowUpDown, ChevronDown, Check,
  ChevronRight, Building2, MapPin, Briefcase, Info, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface RosterLeaveScheduleSheetProps {
  roster: any[];
}

interface LeaveRecord {
  id: string;
  nik: string;
  nama: string;
  poh: string;
  jabatan: string;
  gol: string;
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
  return false;
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

export function extractLeaveRecordsFromRoster(roster: any[]): LeaveRecord[] {
  const records: LeaveRecord[] = [];

  const isLeaveOrTravel = (c: string) => {
    return ['TRV', 'TV', 'C', 'CT', 'CI', 'CE', 'CR', 'CS', 'IK', 'I', 'SL', 'S', 'TT', 'XP'].includes(c) ||
           c.startsWith('CT') || c.startsWith('CE') || c.startsWith('CI') || c.startsWith('IK') || c.startsWith('CR');
  };

  for (const emp of roster) {
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
        gol: emp.gol || (isGol1 ? 'I' : 'II'),
        isGol1,
        section: sectionVal,
        subSection: originalSectionVal,
        pt: emp.pt || 'TBP',
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

export function RosterLeaveScheduleSheet({ roster }: RosterLeaveScheduleSheetProps) {
  // Sub-Sheet Tab: 'staff' (Gol II-V) vs 'crew' (Gol I)
  const [activeTab, setActiveTab] = useState<'staff' | 'crew'>('staff');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all leave records
  const allLeaveRecords = useMemo(() => {
    return extractLeaveRecordsFromRoster(roster);
  }, [roster]);

  // Extract available periods (Month + Year) from data
  const availablePeriods = useMemo(() => {
    const periodSet = new Set<string>();
    allLeaveRecords.forEach(rec => {
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
  }, [allLeaveRecords]);

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

  // Available sections (based on unified section values: Laboratory, Preparation, Maintenance for current tab)
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    allLeaveRecords.forEach(e => {
      if (activeTab === 'staff' && e.isGol1) return;
      if (activeTab === 'crew' && !e.isGol1) return;
      if (e.section) set.add(e.section);
    });
    return Array.from(set).sort();
  }, [allLeaveRecords, activeTab]);

  // Filtered records based on tab, month, section, and search
  const filteredRecords = useMemo(() => {
    return allLeaveRecords.filter(rec => {
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
  }, [allLeaveRecords, activeTab, selectedMonth, selectedSection, searchQuery]);

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

    const titleSheet = activeTab === 'staff' ? 'STAFF LAB (Gol II-V)' : 'CREW PREP & LAB (Gol I)';
    const periodLabel = selectedMonth === 'ALL' 
      ? 'Semua Periode' 
      : availablePeriods.find(p => p.key === selectedMonth)?.label || selectedMonth;

    // Build worksheet data matching the physical screenshot format
    const wsData: any[][] = [
      [`PREP & LAB - ${titleSheet.toUpperCase()}`],
      [`Periode Cuti: ${periodLabel} | Section: ${selectedSection === 'ALL' ? 'Semua Section' : selectedSection}`],
      [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
      [], // blank line
      [
        'NO',
        'NAMA',
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
        rec.nama,
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
      { wch: 28 },  // NAMA
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
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'staff' ? 'Staff_Gol_II-V' : 'Crew_Gol_I');

    const fileName = `Jadwal_Cuti_${activeTab === 'staff' ? 'Staff_Gol_II-V' : 'Crew_Gol_I'}_${periodLabel.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Jadwal Cuti berhasil diekspor ke Excel: ${fileName}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sistem Manajemen Cuti Terintegrasi Roster</span>
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
              {allLeaveRecords.filter(r => !r.isGol1).length}
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
              {allLeaveRecords.filter(r => r.isGol1).length}
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

      {/* Filter Bar (Periode Cuti Bulan, Section, Search) */}
      <div 
        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs space-y-3"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)'
        }}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left filters: Month & Section */}
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
                <option value="ALL">Semua Periode ({allLeaveRecords.length} Data)</option>
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
                <th colSpan={15} className="py-3 px-4 font-black tracking-wide uppercase text-xs sm:text-sm text-center bg-slate-900 text-white">
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
                <th rowSpan={2} className="py-2.5 px-3 text-center w-12 border-r border-slate-200 dark:border-slate-800">NO</th>
                <th rowSpan={2} className="py-2.5 px-4 min-w-[180px] border-r border-slate-200 dark:border-slate-800">NAMA & NIK</th>
                <th rowSpan={2} className="py-2.5 px-3 min-w-[110px] border-r border-slate-200 dark:border-slate-800">POH</th>
                <th rowSpan={2} className="py-2.5 px-3 min-w-[140px] border-r border-slate-200 dark:border-slate-800">JABATAN</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center min-w-[110px] border-r border-slate-200 dark:border-slate-800 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300">
                  TANGGAL CUTI
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center min-w-[110px] border-r border-slate-200 dark:border-slate-800 bg-teal-500/5 text-teal-800 dark:text-teal-300">
                  TANGGAL ON SITE
                </th>
                <th rowSpan={2} className="py-2.5 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-800">KET</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center min-w-[120px] border-r border-slate-200 dark:border-slate-800 bg-amber-500/5 text-amber-800 dark:text-amber-300">
                  PERUBAHAN JADWAL ONSITE
                </th>
                <th colSpan={6} className="py-1.5 px-2 text-center border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-extrabold">
                  RINCIAN DURASI / JENIS CUTI (HARI)
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center min-w-[70px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold">
                  TOTAL HARI
                </th>
              </tr>
              {/* Sub-headers for duration columns */}
              <tr 
                className="border-b text-[10px] font-bold uppercase tracking-wider bg-slate-100/70 dark:bg-slate-800/50"
                style={{
                  borderColor: 'var(--border-main, #E2E8F0)',
                  color: 'var(--text-muted, #64748B)'
                }}
              >
                <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Perjalanan Masuk & Pulang (TRV)">Travel</th>
                <th className="py-1.5 px-2 text-center w-24 border-r border-slate-200 dark:border-slate-800" title="Cuti Tahunan (CT) & Istimewa (CI)">Tahunan / Istimewa</th>
                <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Cuti Extra (CE)">Extra</th>
                <th className="py-1.5 px-2 text-center w-20 border-r border-slate-200 dark:border-slate-800" title="Izin Khusus (IK)">Izin Khusus</th>
                <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Izin Biasa / Sakit (I / SL)">Izin</th>
                <th className="py-1.5 px-2 text-center min-w-[140px] border-r border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400" title="Tambahan Travel jika tidak ada transportasi (TT)">
                  Tambahan Travel (TT)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
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
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">
                        {index + 1}
                      </td>

                      {/* NAMA & NIK */}
                      <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-900 dark:text-white leading-tight">
                          {rec.nama}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{rec.nik}</span>
                          <span>•</span>
                          <span className="text-teal-600 dark:text-teal-400 font-semibold">{rec.section}</span>
                          {rec.subSection && rec.subSection !== rec.section && (
                            <span className="text-slate-400 font-normal">({rec.subSection})</span>
                          )}
                        </div>
                      </td>

                      {/* POH */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{rec.poh}</span>
                        </div>
                      </td>

                      {/* JABATAN */}
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

                      {/* TANGGAL CUTI */}
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800 bg-emerald-500/5">
                        {rec.tanggalCuti}
                      </td>

                      {/* TANGGAL ON SITE */}
                      <td className="py-2.5 px-3 text-center font-bold text-teal-700 dark:text-teal-400 border-r border-slate-100 dark:border-slate-800 bg-teal-500/5">
                        {rec.tanggalOnsite}
                      </td>

                      {/* KET */}
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

                      {/* PERUBAHAN JADWAL ONSITE */}
                      <td className="py-2.5 px-3 text-center font-bold border-r border-slate-100 dark:border-slate-800">
                        {rec.hasChange ? (
                          <span className="px-2 py-1 rounded-lg font-black text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30">
                            {rec.perubahanJadwalOnsite}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* Travel (TRV) */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {rec.travel > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                            {rec.travel}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Tahunan / Istimewa (CT/CI) */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {rec.tahunanIstimewa > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold">
                            {rec.tahunanIstimewa}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Extra (CE) */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {rec.extra > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold">
                            {rec.extra}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Izin Khusus (IK) */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {rec.izinKhusus > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold">
                            {rec.izinKhusus}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Izin / Sakit (I/SL) */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {rec.izin > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 font-bold">
                            {rec.izin}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Tambahan Travel (TT) */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {rec.tambahanTravel > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 font-black">
                            {rec.tambahanTravel}
                          </span>
                        ) : '-'}
                      </td>

                      {/* TOTAL HARI */}
                      <td className="py-2.5 px-3 text-center font-black text-slate-900 dark:text-white bg-slate-100/80 dark:bg-slate-800/80">
                        {rec.totalHari}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Total Footer Row */}
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <td colSpan={8} className="py-3 px-4 text-right uppercase tracking-wider text-xs border-r border-slate-200 dark:border-slate-700">
                    TOTAL KESELURUHAN ({filteredRecords.length} Personil):
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400">
                    {stats.traveling}
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-400">
                    {stats.sumTahunan}
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400">
                    {stats.sumExtra}
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-400">
                    {stats.sumIK}
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-yellow-800 dark:text-yellow-400">
                    {stats.sumIzin}
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-400">
                    {stats.sumTT}
                  </td>
                  <td className="py-3 px-3 text-center text-teal-600 dark:text-teal-400 text-sm">
                    {stats.totalHari}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
