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
  days?: Array<{ date: Date; dateStr: string; code: string }>;
  allScheduleEntries?: Array<{ date: Date; dateStr: string; code: string }>;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  mei: 4, agu: 7, ags: 7, okt: 9, des: 11
};

export function parseKeyDate(str: string | null | undefined | Date): Date | null {
  if (!str || str === '-') return null;
  if (str instanceof Date) return isNaN(str.getTime()) ? null : str;
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

  // "24 Aug 26", "13 Sep 2026", "2 Okt 2026"
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

/**
 * Konversi tanggal ke format ISO YYYY-MM-DD untuk input date HTML5
 */
export function toIsoDate(val?: any): string {
  if (!val || val === '-') return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const clean = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) return clean.slice(0, 10);

  // Excel serial number
  if (/^\d{5}$/.test(clean)) {
    const num = Number(clean);
    if (num >= 25569 && num <= 65000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
  }

  // YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // DD-MMM-YYYY (e.g. 13 Sep 2026 or 13-Sep-2026)
  const dMmmY = clean.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{4})/);
  if (dMmmY) {
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05', jun: '06',
      jul: '07', agu: '08', ags: '08', aug: '08', sep: '09', okt: '10', oct: '10',
      nov: '11', des: '12', dec: '12'
    };
    const mStr = dMmmY[2].toLowerCase().slice(0, 3);
    const mNum = monthMap[mStr] || '01';
    return `${dMmmY[3]}-${mNum}-${dMmmY[1].padStart(2, '0')}`;
  }

  const parsed = parseKeyDate(clean);
  if (parsed && !isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return '';
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

/**
 * Menghitung rincian durasi cuti berdasarkan kemunculan kode di roster kerja
 * antara Tanggal Cuti dan Tanggal On Site (atau Perubahan Jadwal Onsite):
 * - Tahunan / Istimewa: HANYA kode CT (CT1-CT12) atau CI (CI1-CI30)
 *   (BUKAN keseluruhan cuti; jangan hitung kode 'C' biasa!)
 * - Travel: TRV (atau TV)
 * - Izin: I (atau SL)
 * - Extra: CE
 * - Izin Khusus: IK
 * - Tambahan Travel: TT
 */
export function calculateDurationsFromRosterRange(
  scheduleEntries: Array<{ date: Date; dateStr: string; code: string }> = [],
  startDate?: Date | null,
  endDate?: Date | null
) {
  let travel = 0;
  let tahunanIstimewa = 0;
  let extra = 0;
  let izinKhusus = 0;
  let izin = 0;
  let tambahanTravel = 0;

  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return {
      travel: 0,
      tahunanIstimewa: 0,
      extra: 0,
      izinKhusus: 0,
      izin: 0,
      tambahanTravel: 0,
      totalHari: 0,
      daysCount: 0
    };
  }

  const startZero = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0).getTime();
  const endZero = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();

  const daysInRange = scheduleEntries.filter(item => {
    if (!item.date) return false;
    const dTime = item.date.getTime();
    return dTime >= startZero && dTime <= endZero;
  });

  daysInRange.forEach(item => {
    const c = String(item.code || '').toUpperCase().trim();
    if (!c || c === 'OFF' || c === '-' || c === 'KERJA' || c === 'ON' || c === 'D' || c === 'N' || c === 'LS') return;

    // 1. Tambahan Travel = TT (termasuk TT1, TT2, dsb)
    if (c === 'TT' || c.startsWith('TT') || c.includes('TAMBAHAN TRAVEL') || /^TT\s*[-/.(]?\s*\d*\)?$/i.test(c)) {
      tambahanTravel++;
    }
    // 2. Travel = TRV / TV (termasuk TRV1, TRV2, TV1, TV2, dsb)
    else if (c === 'TRV' || c.startsWith('TRV') || c === 'TV' || c.startsWith('TV') || c === 'TRAVEL') {
      travel++;
    }
    // 3. Izin Khusus = IK (termasuk IK1, IK2, dsb)
    else if (c === 'IK' || c.startsWith('IK') || c.includes('IZIN KHUSUS') || /^IK\s*[-/.(]?\s*\d*\)?$/i.test(c)) {
      izinKhusus++;
    }
    // 4. Extra = CE (termasuk CE1, CE2, dsb)
    else if (c === 'CE' || c.startsWith('CE') || c.includes('EXTRA') || c.startsWith('CR') || /^CE\s*[-/.(]?\s*\d*\)?$/i.test(c)) {
      extra++;
    }
    // 5. Tahunan / Istimewa = HANYA CT (Termasuk CT1-CT12) atau CI (Termasuk CI1-CI30)
    // Sesuai sheet "Database Rooster Prep & Lab", HANYA cell bertuliskan CT/CT1-CT12 atau CI/CI1-CI30 yang dihitung.
    // JANGAN PERNAH menghitung kode 'C' biasa karena 'C' adalah cuti reguler/keseluruhan cuti!
    else if (
      c === 'CT' || c.startsWith('CT') ||
      c === 'CI' || c.startsWith('CI') ||
      /^CT\s*[-/.(]?\s*(\d+)?\)?$/i.test(c) ||
      /^CI\s*[-/.(]?\s*(\d+)?\)?$/i.test(c) ||
      c === 'CUTI TAHUNAN' || c === 'CUTI ISTIMEWA'
    ) {
      tahunanIstimewa++;
    }
    // 6. Izin = I (juga cover SL, Sakit, dsb)
    else if (
      c === 'I' || c === 'SL' || c.startsWith('SL') || c === 'IZIN' ||
      (c.startsWith('I') && !c.startsWith('IK')) ||
      /^I\s*[-/.(]?\s*\d*\)?$/i.test(c)
    ) {
      izin++;
    }
  });

  const totalHari = travel + tahunanIstimewa + extra + izinKhusus + izin + tambahanTravel;

  return {
    travel,
    tahunanIstimewa,
    extra,
    izinKhusus,
    izin,
    tambahanTravel,
    totalHari,
    daysCount: daysInRange.length
  };
}

export function calculateLeaveDurations(
  days: Array<{ date: Date; dateStr: string; code: string }> = [],
  targetYear?: number,
  targetMonthIndex?: number // 0-indexed (0: Jan, 9: Okt, dst)
) {
  const targetDays = (targetYear !== undefined && targetMonthIndex !== undefined)
    ? days.filter(d => d.date && d.date.getFullYear() === targetYear && d.date.getMonth() === targetMonthIndex)
    : days;

  if (targetDays.length === 0) {
    return {
      travel: 0,
      tahunanIstimewa: 0,
      extra: 0,
      izinKhusus: 0,
      izin: 0,
      tambahanTravel: 0,
      totalHari: 0,
      activeDaysCount: 0
    };
  }

  const startDate = targetDays[0]?.date || new Date();
  const endDate = targetDays[targetDays.length - 1]?.date || startDate;
  const res = calculateDurationsFromRosterRange(targetDays, startDate, endDate);

  return {
    ...res,
    activeDaysCount: targetDays.length
  };
}

export function extractLeaveRecordsFromRoster(roster: any[]): LeaveRecord[] {
  const records: LeaveRecord[] = [];

  const isLeaveOrTravel = (c: string) => {
    return ['TRV', 'TV', 'C', 'CT', 'CI', 'CE', 'CR', 'CS', 'IK', 'I', 'SL', 'TT', 'XP'].includes(c) ||
           c.startsWith('TRV') || c.startsWith('CT') || c.startsWith('CE') || c.startsWith('CI') || c.startsWith('IK') || c.startsWith('CR') || c.startsWith('TT') || c.startsWith('SL') ||
           /^CT\s*[-/.(]?\s*\d*\)?$/i.test(c) || /^CI\s*[-/.(]?\s*\d*\)?$/i.test(c) || /^CE\s*[-/.(]?\s*\d*\)?$/i.test(c) || /^TRV\s*[-/.(]?\s*\d*\)?$/i.test(c);
  };

  const isWorkDuty = (c: string) => {
    const u = c.toUpperCase().trim();
    return ['D', 'N', 'LS', 'DS', 'NS', 'KERJA', 'ON'].includes(u) || (u.startsWith('D') && !u.startsWith('DL')) || u.startsWith('N');
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
      } else if ((item.code === 'OFF' || item.code === '-') && currentBlock.length > 0) {
        // Toleransi hari libur rutin (OFF) di sela-sela rangkaian cuti sebelum masuk kerja
        let hasFutureLeave = false;
        for (let j = i + 1; j < Math.min(entries.length, i + 15); j++) {
          const nextCode = entries[j].code;
          if (isWorkDuty(nextCode)) {
            break;
          }
          if (isLeaveOrTravel(nextCode)) {
            hasFutureLeave = true;
            break;
          }
        }
        if (hasFutureLeave) {
          // Tetap masukkan ke dalam block cuti yang sama
          currentBlock.push(item);
        } else {
          blocks.push(currentBlock);
          currentBlock = [];
        }
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
      const isCutiSite = block.some(b => 
        b.code === 'CS' || b.code.startsWith('CS') || b.code.includes('CUTI SITE') || /^CS\s*[-/.(]?\s*\d*\)?$/i.test(b.code)
      );

      const hasCoreLeave = block.some(b => 
        ['TRV', 'TV', 'C', 'CT', 'CI', 'CE', 'CR', 'CS'].includes(b.code) || 
        b.code.startsWith('TRV') || b.code.startsWith('CT') || b.code.startsWith('CE') || b.code.startsWith('CI') || b.code.startsWith('CS') ||
        b.code.includes('CUTI')
      );
      if (!hasCoreLeave) continue;

      // 1. Tanggal Cuti: first TRV/TV or C/CT/CE/CS
      const firstCutiItem = block.find(b => 
        ['TRV', 'TV', 'C', 'CT', 'CI', 'CE', 'CR', 'CS'].includes(b.code) || 
        b.code.startsWith('TRV') || b.code.startsWith('CT') || b.code.startsWith('CE') || b.code.startsWith('CI') || b.code.startsWith('CS') ||
        b.code.includes('CUTI')
      ) || block[0];

      // Find index of last core cuti day
      let lastCoreCutiIdx = -1;
      for (let k = 0; k < block.length; k++) {
        const c = block[k].code;
        if (
          ['C', 'CT', 'CI', 'CE', 'CR', 'CS'].includes(c) || 
          c.startsWith('CT') || c.startsWith('CE') || c.startsWith('CI') || c.startsWith('CS') ||
          c.includes('CUTI')
        ) {
          lastCoreCutiIdx = k;
        }
      }

      // Check extensions (I / IK / SL / TT / XP) after core cuti
      let hasExtension = false;
      const extReasons: string[] = [];
      if (lastCoreCutiIdx !== -1) {
        for (let k = lastCoreCutiIdx + 1; k < block.length; k++) {
          const c = block[k].code;
          if (['I', 'IK', 'SL', 'TT', 'XP'].includes(c) || c.startsWith('IK') || c.startsWith('TT') || c.startsWith('SL')) {
            hasExtension = true;
            if ((c === 'TT' || c.startsWith('TT')) && !extReasons.includes('TT (Travel Delay)')) extReasons.push('TT (Travel Delay)');
            if ((c === 'XP' || c.startsWith('XP')) && !extReasons.includes('Speedboat (XP)')) extReasons.push('Speedboat (XP)');
            if ((c === 'I' || c.startsWith('IZIN') || (c.startsWith('I') && !c.startsWith('IK'))) && !extReasons.includes('Izin (I)')) extReasons.push('Izin (I)');
            if ((c === 'IK' || c.startsWith('IK')) && !extReasons.includes('Izin Khusus (IK)')) extReasons.push('Izin Khusus (IK)');
            if ((c === 'SL' || c.startsWith('SL')) && !extReasons.includes('Sakit (SL)')) extReasons.push('Sakit (SL)');
          }
        }
      }

      const tanggalCutiRaw = firstCutiItem.date;
      let tanggalOnsiteRaw: Date;
      let perubahanJadwalOnsiteRaw: Date | null = null;
      let ket = isCutiSite ? 'Cuti Site' : 'Sesuai Roster';

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
        ket = isCutiSite ? 'Cuti Site' : 'Sesuai Roster';
      }

      // Cek apakah tanggal onsite atau perubahan jadwal onsite sudah melewati hari ini
      const effectiveOnsiteRaw = perubahanJadwalOnsiteRaw || tanggalOnsiteRaw;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const effectiveOnsiteZero = new Date(effectiveOnsiteRaw);
      effectiveOnsiteZero.setHours(0, 0, 0, 0);

      const isCutiSelesai = effectiveOnsiteZero.getTime() < today.getTime();
      if (isCutiSelesai) {
        ket = isCutiSite ? 'Cuti Site Selesai' : 'Cuti Selesai';
      }

      // Hitung rincian durasi dari roster kerja antara Tanggal Cuti dan Tanggal On Site (atau Perubahan Jadwal Onsite)
      const rosterDurations = calculateDurationsFromRosterRange(
        entries,
        tanggalCutiRaw,
        effectiveOnsiteRaw
      );
      const travel = rosterDurations.travel;
      const tahunanIstimewa = rosterDurations.tahunanIstimewa;
      const extra = rosterDurations.extra;
      const izinKhusus = rosterDurations.izinKhusus;
      const izin = rosterDurations.izin;
      const tambahanTravel = rosterDurations.tambahanTravel;

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
        isCutiSelesai,
        days: block,
        allScheduleEntries: entries
      });
    }
  }

  // Sort by Tanggal Cuti chronological
  return records.sort((a, b) => a.tanggalCutiRaw.getTime() - b.tanggalCutiRaw.getTime());
}

const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  no: true,
  nama: true,
  jabatan: true,
  section: true,
  poh: true,
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
};

const COLUMN_DEFS = [
  { id: 'no', label: 'NO' },
  { id: 'nama', label: 'NAMA KARYAWAN' },
  { id: 'jabatan', label: 'JABATAN' },
  { id: 'section', label: 'SECTION' },
  { id: 'poh', label: 'POH' },
  { id: 'tanggalCuti', label: 'TANGGAL CUTI' },
  { id: 'tanggalOnsite', label: 'TANGGAL ON SITE' },
  { id: 'ket', label: 'KETERANGAN' },
  { id: 'perubahanJadwalOnsite', label: 'PERUBAHAN JADWAL ONSITE' },
  { id: 'travel', label: 'Travel (TRV)', group: 'duration' as const },
  { id: 'tahunanIstimewa', label: 'Tahunan / Istimewa', group: 'duration' as const },
  { id: 'extra', label: 'Extra (CE)', group: 'duration' as const },
  { id: 'izinKhusus', label: 'Izin Khusus (IK)', group: 'duration' as const },
  { id: 'izin', label: 'Izin (I / SL)', group: 'duration' as const },
  { id: 'tambahanTravel', label: 'Tambahan Travel (TT)', group: 'duration' as const },
  { id: 'totalHari', label: 'TOTAL HARI' },
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
  const [selectedKet, setSelectedKet] = useState<string>('ALL');
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
  const [isExecutiveSummaryOpen, setIsExecutiveSummaryOpen] = useState(false);

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

  // Inline Direct Table Update Handler (seperti Modul Rekapan Izin Karyawan - Edit Langsung Sebagai Referensi)
  const handleInlineUpdateLeave = (rec: LeaveRecord, field: string, value: any) => {
    setCustomOverrides(prev => {
      const current = prev[rec.id] || {};
      const updated: any = { ...current };

      let needRecount = false;
      let newStartDate = updated.tanggalCutiRaw || rec.tanggalCutiRaw;
      let newEndDate = updated.perubahanJadwalOnsiteRaw || (updated.perubahanJadwalOnsite && updated.perubahanJadwalOnsite !== '-' ? parseKeyDate(updated.perubahanJadwalOnsite) : null) || updated.tanggalOnsiteRaw || rec.perubahanJadwalOnsiteRaw || rec.tanggalOnsiteRaw;

      if (field === 'section') updated.section = String(value || '').trim();
      else if (field === 'jabatan') updated.jabatan = String(value || '').trim();
      else if (field === 'poh') updated.poh = String(value || '').trim();
      else if (field === 'ket') updated.ket = String(value || '').trim();
      else if (field === 'perubahanJadwalOnsite') {
        const valStr = String(value || '').trim();
        if (!valStr || valStr === '-') {
          updated.perubahanJadwalOnsite = '-';
          updated.perubahanJadwalOnsiteRaw = null;
          newEndDate = updated.tanggalOnsiteRaw || rec.tanggalOnsiteRaw;
          needRecount = true;
        } else {
          const d = parseKeyDate(valStr);
          if (d) {
            updated.perubahanJadwalOnsite = formatIndonesianDate(d, { shortMonth: true });
            updated.perubahanJadwalOnsiteRaw = d;
            newEndDate = d;
            needRecount = true;
          } else {
            updated.perubahanJadwalOnsite = valStr;
          }
        }
      } else if (field === 'tanggalCuti') {
        const d = parseKeyDate(value);
        if (d) {
          updated.tanggalCuti = formatIndonesianDate(d, { shortMonth: true });
          updated.tanggalCutiRaw = d;
          newStartDate = d;
          needRecount = true;
        } else {
          updated.tanggalCuti = String(value || '').trim();
        }
      } else if (field === 'tanggalOnsite') {
        const d = parseKeyDate(value);
        if (d) {
          updated.tanggalOnsite = formatIndonesianDate(d, { shortMonth: true });
          updated.tanggalOnsiteRaw = d;
          if (!updated.perubahanJadwalOnsiteRaw && (!rec.perubahanJadwalOnsite || rec.perubahanJadwalOnsite === '-')) {
            newEndDate = d;
            needRecount = true;
          }
        } else {
          updated.tanggalOnsite = String(value || '').trim();
        }
      } else if (field === 'totalHari') {
        const numVal = Math.max(0, parseInt(value, 10) || 0);
        updated.totalHari = numVal;
        updated.isManualDurationEdit = true;
      } else if (['travel', 'tahunanIstimewa', 'extra', 'izinKhusus', 'izin', 'tambahanTravel'].includes(field)) {
        const numVal = Math.max(0, parseInt(value, 10) || 0);
        updated[field] = numVal;
        updated.isManualDurationEdit = true;

        const travel = updated.travel !== undefined ? updated.travel : rec.travel;
        const tahunanIstimewa = updated.tahunanIstimewa !== undefined ? updated.tahunanIstimewa : rec.tahunanIstimewa;
        const extra = updated.extra !== undefined ? updated.extra : rec.extra;
        const izinKhusus = updated.izinKhusus !== undefined ? updated.izinKhusus : rec.izinKhusus;
        const izin = updated.izin !== undefined ? updated.izin : rec.izin;
        const tambahanTravel = updated.tambahanTravel !== undefined ? updated.tambahanTravel : rec.tambahanTravel;
        updated.totalHari = travel + tahunanIstimewa + extra + izinKhusus + izin + tambahanTravel;
      }

      // Jika Tanggal Cuti atau Onsite diubah, otomatis hitung ulang durasi berdasarkan roster kerja
      if (needRecount && (rec.allScheduleEntries || rec.days)) {
        const recount = calculateDurationsFromRosterRange(
          rec.allScheduleEntries || rec.days,
          newStartDate,
          newEndDate
        );
        updated.travel = recount.travel;
        updated.tahunanIstimewa = recount.tahunanIstimewa;
        updated.extra = recount.extra;
        updated.izinKhusus = recount.izinKhusus;
        updated.izin = recount.izin;
        updated.tambahanTravel = recount.tambahanTravel;
        updated.totalHari = recount.totalHari;
      }

      const next = { ...prev, [rec.id]: updated };
      try {
        localStorage.setItem('preplab_leave_custom_overrides', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    toast.success(`Perubahan ${rec.nama} (${field}) tersimpan sebagai referensi!`);
  };

  const handleResetInlineRecord = (rec: LeaveRecord) => {
    setCustomOverrides(prev => {
      const next = { ...prev };
      delete next[rec.id];
      if (selectedMonth !== 'ALL') {
        delete next[`${rec.id}_${selectedMonth}`];
      }
      try {
        localStorage.setItem('preplab_leave_custom_overrides', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    toast.info(`Jadwal cuti ${rec.nama} dikembalikan ke kalkulasi roster asli.`);
  };

  const handleResetAllOverrides = () => {
    if (window.confirm('Kembalikan seluruh tabel ke kalkulasi roster asli?')) {
      setCustomOverrides({});
      try {
        localStorage.removeItem('preplab_leave_custom_overrides');
      } catch (e) {}
      toast.info('Seluruh perubahan referensi tabel telah direset ke asal.');
    }
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

      const finalTanggalCutiRaw = ov.tanggalCutiRaw || (ov.tanggalCuti ? parseKeyDate(ov.tanggalCuti) : null) || rec.tanggalCutiRaw;
      const finalTanggalOnsiteRaw = ov.tanggalOnsiteRaw || (ov.tanggalOnsite ? parseKeyDate(ov.tanggalOnsite) : null) || rec.tanggalOnsiteRaw;
      const finalPerubahanRaw = ov.perubahanJadwalOnsite && ov.perubahanJadwalOnsite !== '-' ? parseKeyDate(ov.perubahanJadwalOnsite) : rec.perubahanJadwalOnsiteRaw;
      const perubahanJadwalOnsite = ov.perubahanJadwalOnsite !== undefined ? ov.perubahanJadwalOnsite : rec.perubahanJadwalOnsite;
      const hasChange = (perubahanJadwalOnsite && perubahanJadwalOnsite !== '-') || rec.hasChange;

      const finalKet = ov.ket !== undefined ? ov.ket : rec.ket;
      const finalIsCutiSelesai = finalKet === 'Cuti Selesai' || finalKet === 'Cuti Site Selesai' || rec.isCutiSelesai;

      // Jika tanggal berubah dan belum ada manual override angka durasi, hitung ulang durasi dari roster kerja
      let defaultTravel = rec.travel;
      let defaultTahunan = rec.tahunanIstimewa;
      let defaultExtra = rec.extra;
      let defaultIK = rec.izinKhusus;
      let defaultIzin = rec.izin;
      let defaultTT = rec.tambahanTravel;

      const dateChanged = (ov.tanggalCuti && ov.tanggalCuti !== rec.tanggalCuti) ||
                          (ov.tanggalOnsite && ov.tanggalOnsite !== rec.tanggalOnsite) ||
                          (ov.perubahanJadwalOnsite !== undefined && ov.perubahanJadwalOnsite !== rec.perubahanJadwalOnsite);

      if (dateChanged && (rec.allScheduleEntries?.length || rec.days?.length)) {
        const recount = calculateDurationsFromRosterRange(
          rec.allScheduleEntries || rec.days,
          finalTanggalCutiRaw,
          finalPerubahanRaw || finalTanggalOnsiteRaw
        );
        defaultTravel = recount.travel;
        defaultTahunan = recount.tahunanIstimewa;
        defaultExtra = recount.extra;
        defaultIK = recount.izinKhusus;
        defaultIzin = recount.izin;
        defaultTT = recount.tambahanTravel;
      }

      const isManual = Boolean(ov.isManualDurationEdit);
      const travel = (isManual && ov.travel !== undefined) ? ov.travel : defaultTravel;
      const tahunanIstimewa = (isManual && ov.tahunanIstimewa !== undefined) ? ov.tahunanIstimewa : defaultTahunan;
      const extra = (isManual && ov.extra !== undefined) ? ov.extra : defaultExtra;
      const izinKhusus = (isManual && ov.izinKhusus !== undefined) ? ov.izinKhusus : defaultIK;
      const izin = (isManual && ov.izin !== undefined) ? ov.izin : defaultIzin;
      const tambahanTravel = (isManual && ov.tambahanTravel !== undefined) ? ov.tambahanTravel : defaultTT;
      const calculatedTotal = travel + tahunanIstimewa + extra + izinKhusus + izin + tambahanTravel;
      const totalHari = (isManual && ov.totalHari !== undefined) ? ov.totalHari : calculatedTotal;

      return {
        ...rec,
        section: ov.section !== undefined ? ov.section : rec.section,
        jabatan: ov.jabatan !== undefined ? ov.jabatan : rec.jabatan,
        poh: ov.poh !== undefined ? ov.poh : rec.poh,
        tanggalCuti: ov.tanggalCuti !== undefined ? ov.tanggalCuti : rec.tanggalCuti,
        tanggalCutiRaw: finalTanggalCutiRaw,
        tanggalOnsite: ov.tanggalOnsite !== undefined ? ov.tanggalOnsite : rec.tanggalOnsite,
        tanggalOnsiteRaw: finalTanggalOnsiteRaw,
        perubahanJadwalOnsite,
        perubahanJadwalOnsiteRaw: finalPerubahanRaw,
        ket: finalKet,
        travel,
        tahunanIstimewa,
        extra,
        izinKhusus,
        izin,
        tambahanTravel,
        totalHari,
        hasChange,
        isCutiSelesai: finalIsCutiSelesai,
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
      if (rec.days && rec.days.length > 0) {
        rec.days.forEach(d => {
          if (d.date) {
            const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
            periodSet.add(key);
          }
        });
      }
      if (rec.tanggalCutiRaw) {
        const d = rec.tanggalCutiRaw;
        periodSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      if (rec.tanggalOnsiteRaw) {
        const d = rec.tanggalOnsiteRaw;
        periodSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      if (rec.perubahanJadwalOnsiteRaw) {
        const d = rec.perubahanJadwalOnsiteRaw;
        periodSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
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

  // Available Keterangan options for filtering
  const availableKets = useMemo(() => {
    const set = new Set<string>();
    accessibleRecords.forEach(e => {
      if (activeTab === 'staff' && e.isGol1) return;
      if (activeTab === 'crew' && !e.isGol1) return;
      if (e.ket) set.add(e.ket);
    });
    const list = Array.from(set);
    list.sort((a, b) => {
      if (a === 'Cuti Selesai') return -1;
      if (b === 'Cuti Selesai') return 1;
      if (a === 'Cuti Site Selesai') return -1;
      if (b === 'Cuti Site Selesai') return 1;
      if (a === 'Cuti Site') return -1;
      if (b === 'Cuti Site') return 1;
      if (a === 'Sesuai Roster') return -1;
      if (b === 'Sesuai Roster') return 1;
      return a.localeCompare(b);
    });
    return list;
  }, [accessibleRecords, activeTab]);

  // Visible duration columns count & layout helpers
  const visibleDurationColsCount = useMemo(() => {
    return ['travel', 'tahunanIstimewa', 'extra', 'izinKhusus', 'izin', 'tambahanTravel']
      .filter(c => visibleColumns[c]).length;
  }, [visibleColumns]);

  const visibleBeforeDurationCount = useMemo(() => {
    return ['no', 'nama', 'section', 'poh', 'jabatan', 'tanggalCuti', 'tanggalOnsite', 'ket', 'perubahanJadwalOnsite']
      .filter(c => visibleColumns[c]).length;
  }, [visibleColumns]);

  const totalVisibleCols = useMemo(() => {
    return Object.keys(visibleColumns).filter(k => visibleColumns[k]).length;
  }, [visibleColumns]);

  const activeColumnDefs = useMemo(() => {
    return COLUMN_DEFS;
  }, []);

  const hiddenColsCount = useMemo(() => {
    return activeColumnDefs.length - totalVisibleCols;
  }, [activeColumnDefs, totalVisibleCols]);

  // Filtered records based on tab, month, section, keterangan, and search
  const filteredRecords = useMemo(() => {
    let targetYear: number | undefined;
    let targetMonthIndex: number | undefined;

    if (selectedMonth !== 'ALL') {
      const [y, m] = selectedMonth.split('-').map(Number);
      targetYear = y;
      targetMonthIndex = m - 1;
    }

    const list: LeaveRecord[] = [];

    for (const rec of accessibleRecords) {
      // 1. Tab Golongan
      if (activeTab === 'staff' && rec.isGol1) continue;
      if (activeTab === 'crew' && !rec.isGol1) continue;

      // 2. Periode Cuti (Bulan):
      // Filter apakah periode cuti karyawan (dari Tanggal Cuti s/d Tanggal On Site / Perubahan Onsite)
      // bersinggungan / aktif pada bulan yang dipilih
      if (selectedMonth !== 'ALL' && targetYear !== undefined && targetMonthIndex !== undefined) {
        const targetMonthStart = new Date(targetYear, targetMonthIndex, 1, 0, 0, 0, 0).getTime();
        const targetMonthEnd = new Date(targetYear, targetMonthIndex + 1, 0, 23, 59, 59, 999).getTime();

        const cutiStart = rec.tanggalCutiRaw.getTime();
        const effectiveEndRaw = rec.perubahanJadwalOnsiteRaw || rec.tanggalOnsiteRaw;
        const cutiEnd = effectiveEndRaw.getTime();

        // Periode cuti harus bersinggungan dengan bulan yang dipilih
        if (!(cutiStart <= targetMonthEnd && cutiEnd >= targetMonthStart)) {
          continue;
        }
      }

      // 3. Section
      if (selectedSection !== 'ALL' && rec.section !== selectedSection) {
        continue;
      }

      // 4. Keterangan Filter
      if (selectedKet !== 'ALL') {
        if (selectedKet === 'Cuti Selesai') {
          if (!rec.isCutiSelesai && rec.ket !== 'Cuti Selesai') continue;
        } else if (selectedKet === 'Cuti Site Selesai') {
          if (rec.ket !== 'Cuti Site Selesai') continue;
        } else if (selectedKet === 'Cuti Site') {
          if (rec.ket !== 'Cuti Site') continue;
        } else {
          if (rec.ket !== selectedKet) continue;
        }
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.nama.toLowerCase().includes(q);
        const matchNik = rec.nik.toLowerCase().includes(q);
        const matchJab = rec.jabatan.toLowerCase().includes(q);
        const matchPoh = rec.poh.toLowerCase().includes(q);
        if (!matchName && !matchNik && !matchJab && !matchPoh) continue;
      }

      // Cek apakah ada month-specific override yang sengaja diedit manual
      const rawMonthOv = selectedMonth !== 'ALL' ? customOverrides[`${rec.id}_${selectedMonth}`] : null;
      const monthOv = rawMonthOv && (rawMonthOv.isManualDurationEdit || rawMonthOv.tanggalCuti || rawMonthOv.tanggalOnsite || rawMonthOv.perubahanJadwalOnsite || rawMonthOv.ket) ? rawMonthOv : null;

      if (monthOv) {
        const travel = monthOv.travel !== undefined ? monthOv.travel : rec.travel;
        const tahunanIstimewa = monthOv.tahunanIstimewa !== undefined ? monthOv.tahunanIstimewa : rec.tahunanIstimewa;
        const extra = monthOv.extra !== undefined ? monthOv.extra : rec.extra;
        const izinKhusus = monthOv.izinKhusus !== undefined ? monthOv.izinKhusus : rec.izinKhusus;
        const izin = monthOv.izin !== undefined ? monthOv.izin : rec.izin;
        const tambahanTravel = monthOv.tambahanTravel !== undefined ? monthOv.tambahanTravel : rec.tambahanTravel;
        const calculatedTotal = travel + tahunanIstimewa + extra + izinKhusus + izin + tambahanTravel;
        const totalHari = monthOv.totalHari !== undefined ? monthOv.totalHari : calculatedTotal;

        list.push({
          ...rec,
          section: monthOv.section !== undefined ? monthOv.section : rec.section,
          jabatan: monthOv.jabatan !== undefined ? monthOv.jabatan : rec.jabatan,
          poh: monthOv.poh !== undefined ? monthOv.poh : rec.poh,
          tanggalCuti: monthOv.tanggalCuti !== undefined ? monthOv.tanggalCuti : rec.tanggalCuti,
          tanggalCutiRaw: monthOv.tanggalCutiRaw || rec.tanggalCutiRaw,
          tanggalOnsite: monthOv.tanggalOnsite !== undefined ? monthOv.tanggalOnsite : rec.tanggalOnsite,
          tanggalOnsiteRaw: monthOv.tanggalOnsiteRaw || rec.tanggalOnsiteRaw,
          perubahanJadwalOnsite: monthOv.perubahanJadwalOnsite !== undefined ? monthOv.perubahanJadwalOnsite : rec.perubahanJadwalOnsite,
          perubahanJadwalOnsiteRaw: monthOv.perubahanJadwalOnsiteRaw || rec.perubahanJadwalOnsiteRaw,
          ket: monthOv.ket !== undefined ? monthOv.ket : rec.ket,
          travel,
          tahunanIstimewa,
          extra,
          izinKhusus,
          izin,
          tambahanTravel,
          totalHari,
          isCustomEdited: true
        });
      } else {
        list.push(rec);
      }
    }

    return list;
  }, [accessibleRecords, activeTab, selectedMonth, selectedSection, selectedKet, searchQuery, customOverrides]);

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
        'NAMA KARYAWAN',
        'SECTION',
        'PERUSAHAAN (PT)',
        'POH',
        'JABATAN',
        'TANGGAL CUTI',
        'TANGGAL ON SITE',
        'KETERANGAN',
        'PERUBAHAN JADWAL ONSITE',
        'TRAVEL',
        'TAHUNAN / ISTIMEWA',
        'EXTRA',
        'IZIN KHUSUS',
        'IZIN',
        'TAMBAHAN TRAVEL (TT)',
        'TOTAL HARI'
      ]
    ];

    filteredRecords.forEach((rec, idx) => {
      wsData.push([
        idx + 1,
        rec.nama,
        rec.subSection && rec.subSection !== rec.section ? `${rec.section} (${rec.subSection})` : rec.section,
        rec.pt,
        rec.poh,
        rec.jabatan,
        rec.tanggalCuti,
        rec.tanggalOnsite,
        rec.isCutiSelesai ? 'Cuti Selesai' : rec.ket,
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
      { wch: 28 },  // NAMA KARYAWAN
      { wch: 18 },  // SECTION
      { wch: 18 },  // PERUSAHAAN (PT)
      { wch: 16 },  // POH
      { wch: 24 },  // JABATAN
      { wch: 16 },  // TANGGAL CUTI
      { wch: 16 },  // TANGGAL ON SITE
      { wch: 24 },  // KETERANGAN
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

      {/* Dropdown Tipis Keterangan & KPI Cuti */}
      <div 
        className="rounded-2xl border shadow-xs overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: 'var(--border-main, #E2E8F0)',
          color: '#0F172A'
        }}
      >
        {/* Baris Tipis Header (Selalu Terlihat & Bisa Diklik untuk Toggle) */}
        <div 
          onClick={() => setIsExecutiveSummaryOpen(prev => !prev)}
          className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Jadwal & Riwayat Cuti Personil
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {stats.totalPersonil} Personil Cuti
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {stats.traveling} Hari TRV
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {isExecutiveSummaryOpen ? 'Klik untuk menutup ringkasan keterangan & KPI' : 'Klik untuk melihat keterangan sistem, hak akses & 4 kartu analitik cuti'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
              title="Cetak Jadwal Cuti"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExecutiveSummaryOpen(prev => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isExecutiveSummaryOpen 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title={isExecutiveSummaryOpen ? "Tutup Keterangan" : "Buka Keterangan & KPI"}
            >
              <span className="text-[11px]">{isExecutiveSummaryOpen ? 'Tutup' : 'Keterangan & KPI'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExecutiveSummaryOpen ? 'rotate-180 text-emerald-700' : 'text-slate-500'}`} />
            </button>
          </div>
        </div>

        {/* Konten Keterangan & 4 Kartu KPI (Hanya Muncul Ketika Diklik) */}
        {isExecutiveSummaryOpen && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-6 pt-2 border-t border-slate-100 bg-slate-50/40">
            <div className="pt-2">
              <div className="space-y-1.5 mb-4">
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
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-normal leading-relaxed">
                  Otomatisasi kalkulasi tanggal cuti, perjalanan (TRV), kuota cuti tahunan/extra/khusus, serta monitoring perubahan jadwal on-site terverifikasi dari Roster Harian.
                </p>
              </div>

              {/* Executive KPI Stats Cards - 4 Kartu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200/80">
                <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
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

                <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
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

                <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
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

                <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
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
          </div>
        )}
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

        {/* Active Sheet Badge Indicator & Reference Mode Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Menampilkan tabel resmi: <strong className="text-slate-700 dark:text-slate-200">{activeTab === 'staff' ? 'PREP & LAB - STAFF LAB' : 'PREP & LAB - CREW LAB'}</strong>
              <span className="text-teal-600 dark:text-teal-400 font-semibold text-[11px] ml-1.5 hidden sm:inline">(Dapat diedit langsung di tabel sebagai referensi)</span>
            </span>
          </div>
          {Object.keys(customOverrides).length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                {Object.keys(customOverrides).length} Perubahan Disimpan
              </span>
              <button
                type="button"
                onClick={handleResetAllOverrides}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer shadow-2xs"
                title="Kembalikan semua baris ke kalkulasi roster asli"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Semua Referensi</span>
              </button>
            </div>
          )}
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

            {/* Keterangan Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Keterangan:
              </span>
              <select
                value={selectedKet}
                onChange={(e) => setSelectedKet(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 rounded-xl border outline-none cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: 'var(--input-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)',
                  color: 'var(--text-main, #1E293B)'
                }}
              >
                <option value="ALL">Semua Keterangan</option>
                {availableKets.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
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
        <div className="overflow-x-auto max-h-[72vh] overflow-y-auto relative custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Header Title Bar - Sticky Top 0 */}
              <tr className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
                <th colSpan={totalVisibleCols} className="py-3 px-4 font-black tracking-wide uppercase text-xs sm:text-sm text-center bg-slate-900 text-white">
                  {activeTab === 'staff' ? 'PREP & LAB - STAFF LAB' : 'PREP & LAB - CREW PREPARASI & LAB'}
                </th>
              </tr>
              {/* Main Column Headers - Sticky Top 41px */}
              <tr 
                className="sticky top-[41px] z-20 border-b text-[11px] font-bold uppercase tracking-wider select-none bg-slate-100 dark:bg-slate-900 shadow-2xs"
                style={{
                  borderColor: 'var(--border-main, #CBD5E1)',
                  color: 'var(--text-muted, #475569)'
                }}
              >
                {visibleColumns.no && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center w-12 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">NO</th>
                )}
                {visibleColumns.nama && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-4 min-w-[190px] border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">NAMA KARYAWAN</th>
                )}
                {visibleColumns.jabatan && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 min-w-[150px] border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">JABATAN</th>
                )}
                {visibleColumns.section && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">SECTION</th>
                )}
                {visibleColumns.poh && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 min-w-[110px] border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">POH</th>
                )}
                {visibleColumns.tanggalCuti && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[110px] border-r border-slate-200 dark:border-slate-800 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    TANGGAL CUTI
                  </th>
                )}
                {visibleColumns.tanggalOnsite && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[110px] border-r border-slate-200 dark:border-slate-800 bg-teal-500/10 text-teal-800 dark:text-teal-300">
                    TANGGAL ON SITE
                  </th>
                )}
                {visibleColumns.ket && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 min-w-[140px] border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">KETERANGAN</th>
                )}
                {visibleColumns.perubahanJadwalOnsite && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[120px] border-r border-slate-200 dark:border-slate-800 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    PERUBAHAN JADWAL ONSITE
                  </th>
                )}

                {/* Duration Group Header */}
                {visibleDurationColsCount > 0 && (
                  <th colSpan={visibleDurationColsCount} className="py-1.5 px-2 text-center border-b border-r border-slate-200 dark:border-slate-800 bg-slate-200/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold">
                    RINCIAN DURASI / JENIS CUTI (HARI)
                  </th>
                )}

                {visibleColumns.totalHari && (
                  <th rowSpan={visibleDurationColsCount > 0 ? 2 : 1} className="py-2.5 px-3 text-center min-w-[70px] border-r border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold">
                    TOTAL HARI
                  </th>
                )}


              </tr>

              {/* Sub-headers for duration columns - Sticky Top 77px */}
              {visibleDurationColsCount > 0 && (
                <tr 
                  className="sticky top-[77px] z-20 border-b text-[10px] font-bold uppercase tracking-wider bg-slate-200/95 dark:bg-slate-800 shadow-2xs"
                  style={{
                    borderColor: 'var(--border-main, #CBD5E1)',
                    color: 'var(--text-muted, #475569)'
                  }}
                >
                  {visibleColumns.travel && (
                    <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Jumlah kode TRV yang muncul di Roster Kerja antara Tanggal Cuti dan Tanggal On Site">Travel</th>
                  )}
                  {visibleColumns.tahunanIstimewa && (
                    <th className="py-1.5 px-2 text-center w-24 border-r border-slate-200 dark:border-slate-800" title="Jumlah kode CT yang muncul di Roster Kerja antara Tanggal Cuti dan Tanggal On Site">Tahunan / Istimewa</th>
                  )}
                  {visibleColumns.extra && (
                    <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Jumlah kode CE yang muncul di Roster Kerja antara Tanggal Cuti dan Tanggal On Site">Extra</th>
                  )}
                  {visibleColumns.izinKhusus && (
                    <th className="py-1.5 px-2 text-center w-20 border-r border-slate-200 dark:border-slate-800" title="Jumlah kode IK yang muncul di Roster Kerja antara Tanggal Cuti dan Tanggal On Site">Izin Khusus</th>
                  )}
                  {visibleColumns.izin && (
                    <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-800" title="Jumlah kode I yang muncul di Roster Kerja antara Tanggal Cuti dan Tanggal On Site">Izin</th>
                  )}
                  {visibleColumns.tambahanTravel && (
                    <th className="py-1.5 px-2 text-center min-w-[140px] border-r border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400" title="Jumlah kode TT yang muncul di Roster Kerja antara Tanggal Cuti dan Tanggal On Site">
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
                      <span className="text-xs text-slate-400">Silakan ubah pilihan Periode Bulan, Section, Keterangan, atau kata kunci pencarian.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <tr 
                      key={rec.id}
                      className={`transition-colors border-b border-slate-100 dark:border-slate-800/60 ${
                        isEven 
                          ? 'bg-white dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40' 
                          : 'bg-slate-50/60 dark:bg-slate-800/20 hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* NO */}
                      {visibleColumns.no && (
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">
                          {index + 1}
                        </td>
                      )}

                      {/* NAMA KARYAWAN */}
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
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              rec.pt === 'GPS' 
                                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30' 
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            }`}>
                              PT {rec.pt}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* JABATAN - Inline Editable */}
                      {visibleColumns.jabatan && (
                        <td className="py-2 px-2.5 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            defaultValue={rec.jabatan}
                            key={`${rec.id}-jab-${rec.jabatan}`}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== rec.jabatan) {
                                handleInlineUpdateLeave(rec, 'jabatan', val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            placeholder="Jabatan..."
                            className="w-full max-w-[170px] px-1.5 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 outline-none transition-all"
                            title="Edit Jabatan langsung di tabel sebagai referensi"
                          />
                        </td>
                      )}

                      {/* SECTION - Inline Editable */}
                      {visibleColumns.section && (
                        <td className="py-2 px-2.5 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            defaultValue={rec.section}
                            key={`${rec.id}-sec-${rec.section}`}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== rec.section) {
                                handleInlineUpdateLeave(rec, 'section', val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            placeholder="Section..."
                            className="w-full max-w-[130px] px-1.5 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300 rounded bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-teal-500 outline-none transition-all"
                            title="Edit Section langsung di tabel sebagai referensi"
                          />
                          {rec.subSection && rec.subSection !== rec.section && (
                            <div className="text-[10px] text-slate-400 pl-1.5">
                              {rec.subSection}
                            </div>
                          )}
                        </td>
                      )}

                      {/* POH - Inline Editable */}
                      {visibleColumns.poh && (
                        <td className="py-2 px-2.5 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              defaultValue={rec.poh}
                              key={`${rec.id}-poh-${rec.poh}`}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== rec.poh) {
                                  handleInlineUpdateLeave(rec, 'poh', val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              placeholder="POH..."
                              className="w-full max-w-[110px] px-1.5 py-0.5 text-xs font-semibold rounded bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-teal-500 text-slate-800 dark:text-slate-200 outline-none transition-all"
                              title="Edit POH langsung di tabel sebagai referensi"
                            />
                          </div>
                        </td>
                      )}

                      {/* TANGGAL CUTI - Inline Date Picker */}
                      {visibleColumns.tanggalCuti && (
                        <td className="py-2 px-2 text-center font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800 bg-emerald-500/5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-flex items-center group">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 transition-all cursor-pointer shadow-2xs">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                              <span>{rec.tanggalCuti}</span>
                            </div>
                            <input
                              type="date"
                              value={toIsoDate(rec.tanggalCutiRaw || rec.tanggalCuti)}
                              key={`${rec.id}-tc-${rec.tanggalCuti}`}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleInlineUpdateLeave(rec, 'tanggalCuti', val);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              title="Klik untuk memilih / mengubah Tanggal Cuti langsung"
                            />
                          </div>
                        </td>
                      )}

                      {/* TANGGAL ON SITE - Inline Date Picker */}
                      {visibleColumns.tanggalOnsite && (
                        <td className="py-2 px-2 text-center font-bold text-teal-700 dark:text-teal-400 border-r border-slate-100 dark:border-slate-800 bg-teal-500/5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-flex items-center group">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 border border-teal-200/80 dark:border-teal-800/60 transition-all cursor-pointer shadow-2xs">
                              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
                              <span>{rec.tanggalOnsite}</span>
                            </div>
                            <input
                              type="date"
                              value={toIsoDate(rec.tanggalOnsiteRaw || rec.tanggalOnsite)}
                              key={`${rec.id}-to-${rec.tanggalOnsite}`}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleInlineUpdateLeave(rec, 'tanggalOnsite', val);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              title="Klik untuk memilih / mengubah Tanggal Onsite langsung"
                            />
                          </div>
                        </td>
                      )}

                      {/* KETERANGAN - Manual Dropdown Selector */}
                      {visibleColumns.ket && (
                        <td className="py-2 px-2.5 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={rec.ket || 'Sesuai Roster'}
                            onChange={(e) => handleInlineUpdateLeave(rec, 'ket', e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border cursor-pointer outline-none transition-all shadow-2xs ${
                              rec.ket === 'Cuti Selesai' || rec.ket === 'Cuti Site Selesai'
                                ? 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                                : rec.ket === 'Cuti Site'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700'
                                : rec.ket === 'Sesuai Roster'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700'
                            }`}
                            title="Pilih keterangan cuti langsung di tabel"
                          >
                            <option value="Sesuai Roster">Sesuai Roster</option>
                            <option value="Cuti Selesai">Cuti Selesai</option>
                            <option value="Cuti Site">Cuti Site</option>
                            <option value="Cuti Site Selesai">Cuti Site Selesai</option>
                            <option value="Perubahan Jadwal">Perubahan Jadwal</option>
                            <option value="TT (Travel Delay)">TT (Travel Delay)</option>
                            <option value="Speedboat (XP)">Speedboat (XP)</option>
                            <option value="Izin (I)">Izin (I)</option>
                            <option value="Izin Khusus (IK)">Izin Khusus (IK)</option>
                            <option value="Sakit (SL)">Sakit (SL)</option>
                          </select>
                        </td>
                      )}

                      {/* PERUBAHAN JADWAL ONSITE - Inline Editable */}
                      {visibleColumns.perubahanJadwalOnsite && (
                        <td className="py-2 px-2 text-center font-bold border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-flex items-center group">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer border ${
                              rec.hasChange && rec.perubahanJadwalOnsite !== '-'
                                ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-2xs'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                            }`}>
                              <span>{rec.perubahanJadwalOnsite || '-'}</span>
                            </div>
                            <input
                              type="date"
                              value={rec.perubahanJadwalOnsite && rec.perubahanJadwalOnsite !== '-' ? toIsoDate(rec.perubahanJadwalOnsiteRaw || rec.perubahanJadwalOnsite) : ''}
                              key={`${rec.id}-pjo-${rec.perubahanJadwalOnsite}`}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleInlineUpdateLeave(rec, 'perubahanJadwalOnsite', val);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              title="Klik untuk memilih Tanggal Perubahan Jadwal Onsite"
                            />
                            {rec.perubahanJadwalOnsite && rec.perubahanJadwalOnsite !== '-' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInlineUpdateLeave(rec, 'perubahanJadwalOnsite', '-');
                                }}
                                className="ml-1 p-0.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-500 transition-colors"
                                title="Hapus perubahan jadwal onsite (kembalikan ke -)"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Travel (TRV) - Inline Editable */}
                      {/* Travel (TRV) - Inline Editable */}
                      {visibleColumns.travel && (
                        <td className="py-2 px-1 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0}
                            defaultValue={rec.travel}
                            key={`${rec.id}-trv-${rec.travel}`}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              if (val !== rec.travel) handleInlineUpdateLeave(rec, 'travel', val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-11 px-1 py-0.5 text-xs font-bold text-center text-amber-700 dark:text-amber-300 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 focus:border-amber-500 outline-none transition-all shadow-2xs"
                            title={`Travel: Jumlah 'TRV' yang muncul di Roster Kerja antara Tanggal Cuti (${rec.tanggalCuti}) dan Tanggal On Site (${rec.perubahanJadwalOnsite !== '-' ? rec.perubahanJadwalOnsite : rec.tanggalOnsite})`}
                          />
                        </td>
                      )}

                      {/* Tahunan / Istimewa (CT/CI) - Inline Editable */}
                      {visibleColumns.tahunanIstimewa && (
                        <td className="py-2 px-1 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0}
                            defaultValue={rec.tahunanIstimewa}
                            key={`${rec.id}-ct-${rec.tahunanIstimewa}`}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              if (val !== rec.tahunanIstimewa) handleInlineUpdateLeave(rec, 'tahunanIstimewa', val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-11 px-1 py-0.5 text-xs font-bold text-center text-purple-700 dark:text-purple-300 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 focus:border-purple-500 outline-none transition-all shadow-2xs"
                            title={`Tahunan / Istimewa: Jumlah 'CT' yang muncul di Roster Kerja antara Tanggal Cuti (${rec.tanggalCuti}) dan Tanggal On Site (${rec.perubahanJadwalOnsite !== '-' ? rec.perubahanJadwalOnsite : rec.tanggalOnsite})`}
                          />
                        </td>
                      )}

                      {/* Extra (CE) - Inline Editable */}
                      {visibleColumns.extra && (
                        <td className="py-2 px-1 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0}
                            defaultValue={rec.extra}
                            key={`${rec.id}-ce-${rec.extra}`}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              if (val !== rec.extra) handleInlineUpdateLeave(rec, 'extra', val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-11 px-1 py-0.5 text-xs font-bold text-center text-blue-700 dark:text-blue-300 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 focus:border-blue-500 outline-none transition-all shadow-2xs"
                            title={`Extra: Jumlah 'CE' yang muncul di Roster Kerja antara Tanggal Cuti (${rec.tanggalCuti}) dan Tanggal On Site (${rec.perubahanJadwalOnsite !== '-' ? rec.perubahanJadwalOnsite : rec.tanggalOnsite})`}
                          />
                        </td>
                      )}

                      {/* Izin Khusus (IK) - Inline Editable */}
                      {visibleColumns.izinKhusus && (
                        <td className="py-2 px-1 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0}
                            defaultValue={rec.izinKhusus}
                            key={`${rec.id}-ik-${rec.izinKhusus}`}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              if (val !== rec.izinKhusus) handleInlineUpdateLeave(rec, 'izinKhusus', val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-11 px-1 py-0.5 text-xs font-bold text-center text-indigo-700 dark:text-indigo-300 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 focus:border-indigo-500 outline-none transition-all shadow-2xs"
                            title={`Izin Khusus: Jumlah 'IK' yang muncul di Roster Kerja antara Tanggal Cuti (${rec.tanggalCuti}) dan Tanggal On Site (${rec.perubahanJadwalOnsite !== '-' ? rec.perubahanJadwalOnsite : rec.tanggalOnsite})`}
                          />
                        </td>
                      )}

                      {/* Izin / Sakit (I/SL) - Inline Editable */}
                      {visibleColumns.izin && (
                        <td className="py-2 px-1 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0}
                            defaultValue={rec.izin}
                            key={`${rec.id}-i-${rec.izin}`}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              if (val !== rec.izin) handleInlineUpdateLeave(rec, 'izin', val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-11 px-1 py-0.5 text-xs font-bold text-center text-yellow-800 dark:text-yellow-300 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-yellow-400 focus:border-yellow-500 outline-none transition-all shadow-2xs"
                            title={`Izin: Jumlah 'I' atau 'SL' yang muncul di Roster Kerja antara Tanggal Cuti (${rec.tanggalCuti}) dan Tanggal On Site (${rec.perubahanJadwalOnsite !== '-' ? rec.perubahanJadwalOnsite : rec.tanggalOnsite})`}
                          />
                        </td>
                      )}

                      {/* Tambahan Travel (TT) - Inline Editable */}
                      {visibleColumns.tambahanTravel && (
                        <td className="py-2 px-1 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0}
                            defaultValue={rec.tambahanTravel}
                            key={`${rec.id}-tt-${rec.tambahanTravel}`}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              if (val !== rec.tambahanTravel) handleInlineUpdateLeave(rec, 'tambahanTravel', val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-11 px-1 py-0.5 text-xs font-black text-center text-rose-700 dark:text-rose-400 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 focus:border-rose-500 outline-none transition-all shadow-2xs"
                            title={`Tambahan Travel (TT): Jumlah 'TT' yang muncul di Roster Kerja antara Tanggal Cuti (${rec.tanggalCuti}) dan Tanggal On Site (${rec.perubahanJadwalOnsite !== '-' ? rec.perubahanJadwalOnsite : rec.tanggalOnsite})`}
                          />
                        </td>
                      )}

                      {/* TOTAL HARI - Inline Editable */}
                      {visibleColumns.totalHari && (
                        <td className="py-2 px-2 text-center font-black text-slate-900 dark:text-white bg-slate-100/80 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              defaultValue={rec.totalHari}
                              key={`${rec.id}-${selectedMonth}-th-${rec.totalHari}`}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val !== rec.totalHari) {
                                  handleInlineUpdateLeave(rec, 'totalHari', val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              className="w-12 px-1 py-0.5 text-xs font-black text-center text-slate-900 dark:text-white rounded bg-transparent hover:bg-slate-200/60 dark:hover:bg-slate-700/60 focus:bg-white dark:focus:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 outline-none transition-all"
                              title="Edit Total Hari langsung di tabel sebagai referensi"
                            />
                            {rec.isCustomEdited && (
                              <button
                                type="button"
                                onClick={() => handleResetInlineRecord(rec)}
                                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Reset perubahan baris ini ke kalkulasi roster asli"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
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

                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
