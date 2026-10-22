import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Layers, Flame, Cpu, FileCheck, ArrowRight, ArrowLeft, 
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus, Sparkles, BarChart2,
  ChevronRight, Calendar, ShieldCheck, Clock, Gauge, Sun, Moon, Building2, Split,
  Search, Edit3, Save, FileText, Check, Plus, MessageSquare, Info,
  UserCheck, Coffee, Briefcase, Award, Table as TableIcon, LayoutGrid, ArrowUpDown, Filter,
  UserPlus, X, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { DailyPerformanceRecord } from './daily-performance-types';
import { formatNumber } from './daily-performance-utils';
import { DailyPerformanceManpowerRosterModal } from './DailyPerformanceManpowerRosterModal';
import { getRosterData } from '../../sheets-api';
import { compareEmployeesByJabatan, getJabatanRank } from '../../lib/jabatanHierarchy';
import { 
  ManpowerTrendChart, 
  SampleReceivedTrendChart, 
  ProductivityPrepTrendChart, 
  XrfInstrumentsTrendChart, 
  QcReportingTrendChart 
} from './DailyPerformanceCharts';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  LabelList
} from 'recharts';

interface DailyPerformanceStructuredPresentationProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
  isPresentationMode?: boolean;
  onSaveRecord?: (newRec: DailyPerformanceRecord) => void;
  userPt?: string;
}

export interface LabPersonnelItem {
  nik: string;
  name: string;
  jabatan: string;
  section: string;
  regu: string;
  shiftSchedule: string;
  category: 'pagi' | 'malam' | 'tidak_bertugas';
  roleCategory: 'staff' | 'crew';
  keterangan: string;
  badgeColor: string;
  tglMasukKembali?: string;
}

export function isStaffRole(item: { jabatan?: string; gol?: string; roleCategory?: string }): boolean {
  if (item.roleCategory === 'staff') return true;
  if (item.roleCategory === 'crew') return false;

  const jab = String(item.jabatan || '').toLowerCase().trim();

  // ATURAN RESMI (User Requirement):
  // 1. Foreman, Admin, Supervisor, Superintendent, Manager, Specialist, QA/QC, Officer adalah STAF
  if (
    jab.includes('foreman') ||
    jab.includes('admin') ||
    jab.includes('manager') ||
    jab.includes('superintendent') ||
    jab.includes('supervisor') ||
    jab.includes('specialist') ||
    jab.includes('officer') ||
    jab.includes('chemist') ||
    jab.includes('qa') ||
    jab.includes('qc') ||
    jab.includes('staff') ||
    jab.includes('head')
  ) {
    return true;
  }

  // 2. "Crew itu yang jabatannya memang crew"
  if (jab.includes('crew')) {
    return false;
  }

  // 3. Fallback jika ada jabatan non-crew berkategori golongan III ke atas
  const gol = String(item.gol || '').trim().toUpperCase();
  if (gol.startsWith('III') || gol.startsWith('IV') || gol.startsWith('V')) {
    return true;
  }

  return false;
}

export interface JabatanCount {
  jabatan: string;
  count: number;
  rank: number;
}

export function getJabatanBreakdown(list: LabPersonnelItem[]): JabatanCount[] {
  const map: Record<string, { jabatan: string; count: number; rank: number }> = {};
  for (const item of list) {
    const j = (item.jabatan || 'Teknisi Lab').trim();
    if (!map[j]) {
      map[j] = {
        jabatan: j,
        count: 0,
        rank: getJabatanRank(j)
      };
    }
    map[j].count++;
  }
  return Object.values(map).sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.jabatan.localeCompare(b.jabatan, 'id', { sensitivity: 'base' });
  });
}

export function getJabatanBadgeStyle(jabatan?: string): { bg: string; text: string; border: string; label: string } {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('manager')) {
    return { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800', label: 'Manager' };
  }
  if (j.includes('superintendent')) {
    return { bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-800', label: 'Superintendent' };
  }
  if (j.includes('supervisor')) {
    return { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800', label: 'Supervisor' };
  }
  if (j.includes('qa') || j.includes('quality') || j.includes('officer')) {
    return { bg: 'bg-cyan-100 dark:bg-cyan-950/60', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-800', label: 'QA / Officer' };
  }
  if (j.includes('foreman')) {
    return { bg: 'bg-teal-100 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-800', label: 'Foreman' };
  }
  if (j.includes('admin')) {
    return { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800', label: 'Admin' };
  }
  if (j.includes('crew')) {
    return { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800', label: 'Crew' };
  }
  return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700', label: 'Staff' };
}


// Helper to parse roster date key
function parseRosterDateKey(keyStr: string): Date | null {
  if (!keyStr) return null;
  const s = keyStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  const parts = s.split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const monthsMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
      jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
    };
    const m = monthsMap[mStr];
    if (!isNaN(day) && m !== undefined && !isNaN(year)) {
      return new Date(year, m, day);
    }
  }
  return null;
}

function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Mencari tanggal kembali bekerja dari roster (diambil dari kode X1 atau hari kerja pertama setelah cuti)
export function getReturnToWorkDate(emp: any, selectedDateStr: string): string | null {
  let curDate: Date | null = null;
  if (selectedDateStr.includes('/')) {
    const [d, m, y] = selectedDateStr.split('/').map(Number);
    curDate = new Date(y, m - 1, d);
  } else if (selectedDateStr.includes('-')) {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    curDate = new Date(y, m - 1, d);
  }
  const curTime = curDate ? curDate.getTime() : 0;

  if (emp.fullSchedule && typeof emp.fullSchedule === 'object') {
    const entries: { date: Date; code: string }[] = [];
    for (const [k, v] of Object.entries(emp.fullSchedule)) {
      const parsed = parseRosterDateKey(k);
      if (parsed) {
        entries.push({ date: parsed, code: String(v || '').trim().toUpperCase() });
      }
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Prioritas 1: Cari kode X1 / 1X pada atau setelah selectedDate
    const x1Entry = entries.find(e => e.date.getTime() >= curTime && (e.code === 'X1' || e.code === '1X'));
    if (x1Entry) {
      return formatDateDDMMYYYY(x1Entry.date);
    }

    // Prioritas 2: Cari shift kerja (D atau N) pertama setelah tanggal cuti
    const workEntry = entries.find(e => e.date.getTime() > curTime && (e.code === 'D' || e.code === 'N'));
    if (workEntry) {
      return formatDateDDMMYYYY(workEntry.date);
    }
  }

  if (Array.isArray(emp.schedule)) {
    const entries: { date: Date; code: string }[] = [];
    for (const item of emp.schedule) {
      const parsed = parseRosterDateKey(item.date || item.dateStr || item.keyDateStr);
      if (parsed) {
        entries.push({ date: parsed, code: String(item.shift || item.code || '').trim().toUpperCase() });
      }
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    const x1Entry = entries.find(e => e.date.getTime() >= curTime && (e.code === 'X1' || e.code === '1X'));
    if (x1Entry) {
      return formatDateDDMMYYYY(x1Entry.date);
    }

    const workEntry = entries.find(e => e.date.getTime() > curTime && (e.code === 'D' || e.code === 'N'));
    if (workEntry) {
      return formatDateDDMMYYYY(workEntry.date);
    }
  }

  return null;
}

export const formatShiftName = (regu?: string) => {
  if (!regu || regu === '-') return '-';
  if (regu.toLowerCase().includes('non')) return 'Non-Shift';
  const clean = regu.replace(/^(Regu|Shift)\s*/i, '').trim();
  return `Shift ${clean}`;
};

const FALLBACK_TBP_LAB_PERSONNEL: LabPersonnelItem[] = [
  // Shift A (Pagi - Pure TBP & GPS)
  { nik: '02D22000023', name: 'Muhammad Reza Satria', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: '04D24000068', name: 'Muhammad Fandy Septiawan', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: '04D26000070', name: 'Rahmad Azizul Khakim', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: '04D26000015', name: 'Gusti Nur Firdaus', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0406220796', name: 'Naslim Muksin', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0203220102', name: 'Ramadhan W. Anwar', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0405240290', name: 'Randi Zakaria', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0212210097', name: 'Riko Saputra Day', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0412221652', name: 'Suryadi La Samusu', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0402230134', name: 'Wahyu Jabir', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },

  // Non-Shift (Merged into Shift Pagi - Pure TBP & GPS Staff)
  { nik: '04D23000004', name: 'Tigwa Anggawikara', jabatan: 'Laboratory Superintendent', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '02D21001045', name: 'Arthur Paul Marnix Souisa', jabatan: 'Laboratory Supervisor', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '02D24000043', name: 'Muhamad Alvin Febriansyah', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '04D22000094', name: 'Kemal Maulana', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0403190701', name: 'Murti Tamisari Harun', jabatan: 'Preparation Foreman, Wet', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },

  // Shift B (Malam - Pure TBP & GPS)
  { nik: '02D18000192', name: 'Khaufi Wirawan Aligora', jabatan: 'Laboratory Supervisor', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D21001049', name: 'Muhammad Amran Selang', jabatan: 'Laboratory Supervisor', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D25000067', name: 'Andika Dafa Rusdiarta', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '02D23000024', name: 'Fachmi Amarullah', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D24000057', name: 'Herwin Predianto', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D26000067', name: 'Muhammad Furqan', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D24000056', name: 'Rizal Zaelani', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0407221011', name: 'Agusman Suaib', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0411221527', name: 'Hasbi Nuh', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0201250032', name: 'Imran Sebualamo', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0412221625', name: 'Iran Rumbia', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0406220795', name: 'Irman Welhemus', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0402230188', name: 'Jarfin Saharudin', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0403240155', name: 'Jasri', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0406210029', name: 'La Dai', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0209240583', name: 'La Wisnu', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0402240078', name: 'Muh. Alif Multazam NH', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0202220051', name: 'Rahmat Purnomo', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0203220144', name: 'Risdiyanto Ladedi', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0402230199', name: 'Sukri Koco', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0409251014', name: 'Zhiran Arrazy Barmawi Putra', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },

  // Tidak Bertugas (Izin, Sakit, Off, Cuti - Pure TBP & GPS)
  { nik: '04D25000059', name: 'Anresansia Winesha Pandit', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'CT', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Cuti', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' },
  { nik: '02D25000050', name: 'Ayup Riyan Redondo', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'CR', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Cuti', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' },
  { nik: '04D23000025', name: 'M. Harits Asyardy', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'OFF', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Off Roster', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
  { nik: '04D23000035', name: 'Ahmad Jusma Azhari Annur', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'SL', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Sakit', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300' },
  { nik: '04D26000016', name: 'Riyan Panji Putra', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'I', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Izin', badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300' },
  { nik: '04D25000045', name: 'Kevin Murheza', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'OFF', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Off Roster', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
  { nik: 'M0203250155', name: 'Sahrul Sanusi', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'OFF', category: 'tidak_bertugas', roleCategory: 'crew', keterangan: 'Off Roster', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' }
];

const FALLBACK_GTS_LAB_PERSONNEL: LabPersonnelItem[] = [
  // Shift A (Pagi - Dedicated GTS)
  { nik: '03D24000058', name: 'Rafi Fadlurrahman', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: '03D24000060', name: 'Febrian Mauklesi Salatutin', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  
  // Non-Shift (Dedicated GTS)
  { nik: '03D22000021', name: 'Agus Kusman', jabatan: 'Preparation & Laboratory Superintendent', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '03D23000041', name: 'Asrar Kurniawan', jabatan: 'Laboratory Supervisor', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '03D23000052', name: 'Difri Candra A.N', jabatan: 'Quality Assurance Officer', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '03D23000053', name: 'Sugiyanto', jabatan: 'Quality Assurance Officer', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0303240091', name: 'Irsal Ridwan Johan', jabatan: 'Admin, Preparation & Laboratory', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0303240092', name: 'Mursalin Iskandar', jabatan: 'Admin, Inventory Control', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },

  // Shift B (Malam - Dedicated GTS)
  { nik: '03D24000061', name: 'Secwin Sello Manukrante', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },

  // Tidak Bertugas (Dedicated GTS)
  { nik: '03D24000062', name: 'M. Afdal Al Fatihah', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'OFF', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Off Roster', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
  { nik: '03D24000063', name: 'Muhammad Faris Nur Fauzan', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Shift B', shiftSchedule: 'SL', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Sakit', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300' }
];

const FALLBACK_LAB_PERSONNEL = FALLBACK_TBP_LAB_PERSONNEL;

export const DailyPerformanceStructuredPresentation: React.FC<DailyPerformanceStructuredPresentationProps> = ({
  records,
  selectedDate,
  isPresentationMode = false,
  onSaveRecord,
  userPt = 'TBP'
}) => {
  // 5 sequential steps: 1=Manpower, 2=Sample Received, 3=Productivity Prep, 4=Instruments, 5=QC & Report
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showAllSections, setShowAllSections] = useState<boolean>(false);

  // Modal and Chart states
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showChart1, setShowChart1] = useState(false);
  const [showChart2, setShowChart2] = useState(false);
  const [showChart3, setShowChart3] = useState(false);
  const [showChart4, setShowChart4] = useState(false);
  const [showChart5, setShowChart5] = useState(false);

  // Section 1 Roster & Personnel States
  const [rosterList, setRosterList] = useState<any[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(true);
  const [manpowerRoleTab, setManpowerRoleTab] = useState<'staff' | 'crew' | 'semua' | 'tidak_bertugas'>('staff');
  const [manpowerShiftFilter, setManpowerShiftFilter] = useState<'all' | 'pagi' | 'malam'>('all');
  const [manpowerViewMode, setManpowerViewMode] = useState<'table' | 'cards'>('table');
  const [manpowerSearch, setManpowerSearch] = useState<string>('');

  // Section 2 View Mode
  const [sampleViewMode, setSampleViewMode] = useState<'cards' | 'shift_breakdown'>('cards');

  // Perbantuan dari Section Lain (Assistance Personnel)
  interface AssistancePersonnel {
    nik: string;
    name: string;
    fromSection: string;
    shift: 'pagi' | 'malam';
    notes?: string;
  }

  const [assistanceList, setAssistanceList] = useState<AssistancePersonnel[]>(() => {
    try {
      const raw = localStorage.getItem(`daily_perf_assistance_${selectedDate}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [showAssistanceInput, setShowAssistanceInput] = useState<boolean>(false);
  const [assistanceSearch, setAssistanceSearch] = useState<string>('');
  const [assistanceShift, setAssistanceShift] = useState<'pagi' | 'malam'>('pagi');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`daily_perf_assistance_${selectedDate}`);
      setAssistanceList(raw ? JSON.parse(raw) : []);
    } catch {
      setAssistanceList([]);
    }
  }, [selectedDate]);

  const handleAddAssistance = (nikOrSearch: string, shift: 'pagi' | 'malam') => {
    const clean = nikOrSearch.trim().toLowerCase();
    const found = rosterList.find((e: any) => {
      const n = (e.nik || '').toLowerCase();
      const nm = (e.name || e.nama || '').toLowerCase();
      return n === clean || nm.includes(clean) || `${n} - ${nm}`.includes(clean);
    });

    if (!found) {
      toast.error('Personil tidak ditemukan di daftar karyawan.');
      return;
    }

    const newItem: AssistancePersonnel = {
      nik: found.nik,
      name: found.name || found.nama || found.nik,
      fromSection: found.section || found.department || 'Section Lain',
      shift
    };

    const updated = [...assistanceList.filter(a => a.nik !== found.nik), newItem];
    setAssistanceList(updated);
    localStorage.setItem(`daily_perf_assistance_${selectedDate}`, JSON.stringify(updated));
    setAssistanceSearch('');
    setShowAssistanceInput(false);
    toast.success(`Personil perbantuan ${newItem.name} (${newItem.fromSection}) berhasil ditambahkan.`);
  };

  const handleRemoveAssistance = (nik: string) => {
    const updated = assistanceList.filter(a => a.nik !== nik);
    setAssistanceList(updated);
    localStorage.setItem(`daily_perf_assistance_${selectedDate}`, JSON.stringify(updated));
    toast.info('Personil perbantuan telah dihapus.');
  };

  // Personil non-Lab dari Roster untuk Autofill Datalist (Perbantuan Section Lain)
  const nonLabCandidates = useMemo(() => {
    const isGtsUniverse = (userPt || '').toUpperCase().trim() === 'GTS';
    if (!rosterList || rosterList.length === 0) return [];
    return rosterList.filter((emp: any) => {
      const empPt = String(emp.pt || '').toUpperCase().trim();
      const nikUpper = String(emp.nik || '').toUpperCase().trim();
      const isEmpGts = empPt === 'GTS' || nikUpper.startsWith('03D') || nikUpper.startsWith('M03');
      if (isGtsUniverse) {
        if (!isEmpGts) return false;
      } else {
        if (isEmpGts) return false;
      }

      // Klasifikasi personil di luar seksi Laboratory (Admin & QA memiliki section tersendiri)
      const sec = String(emp.section || '').trim().toLowerCase();
      const isLabSection = (sec === 'laboratory' || sec === 'laboratorium' || sec.includes('laboratory') || sec.includes('laboratorium')) &&
                           !sec.includes('qa') &&
                           !sec.includes('quality') &&
                           !sec.includes('admin') &&
                           !sec.includes('administrasi') &&
                           !sec.includes('maintenance') &&
                           !sec.includes('prep') &&
                           !sec.includes('dry') &&
                           !sec.includes('wet');
      return !isLabSection;
    });
  }, [rosterList, userPt]);

  const assistancePagiCount = assistanceList.filter(a => a.shift === 'pagi').length;
  const assistanceMalamCount = assistanceList.filter(a => a.shift === 'malam').length;
  const totalAssistanceCount = assistanceList.length;

  // Load roster data from /api/roster
  useEffect(() => {
    let isMounted = true;
    setIsLoadingRoster(true);
    getRosterData()
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.roster || []);
        setRosterList(list);
      })
      .catch(err => {
        console.error('Failed to load roster for presentation:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingRoster(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Compute date keys for matching roster schedules
  const dateKeys = useMemo(() => {
    let day = 1;
    let monthIdx = 9; // Oct = 9 (0-indexed)
    let year = 2026;

    if (selectedDate.includes('/')) {
      const parts = selectedDate.split('/');
      day = parseInt(parts[0], 10) || 1;
      monthIdx = (parseInt(parts[1], 10) || 10) - 1;
      year = parseInt(parts[2], 10) || 2026;
    } else if (selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      year = parseInt(parts[0], 10) || 2026;
      monthIdx = (parseInt(parts[1], 10) || 10) - 1;
      day = parseInt(parts[2], 10) || 1;
    }

    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const mEn = monthsEn[monthIdx] || 'Oct';
    const mId = monthsId[monthIdx] || 'Okt';
    const y2 = String(year).slice(-2);

    return [
      `${day} ${mEn} ${y2}`,
      `${String(day).padStart(2, '0')} ${mEn} ${y2}`,
      `${day} ${mId} ${y2}`,
      `${String(day).padStart(2, '0')} ${mId} ${y2}`,
      `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      `${String(day).padStart(2, '0')}/${String(monthIdx + 1).padStart(2, '0')}/${year}`
    ];
  }, [selectedDate]);

  // Keyboard navigation for presentation (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAllSections) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentStep(prev => Math.min(5, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentStep(prev => Math.max(1, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAllSections]);

  // Filter records for selected date
  const dayRecords = records.filter(r => r.date === selectedDate || r.isoDate === selectedDate);
  const dayShift = dayRecords.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
  const nightShift = dayRecords.find(r => r.shiftType === 'NIGHT');
  const isLongShift = dayShift?.shiftType === 'LS';

  // Manpower Notes State (Persisted in localStorage & active record)
  const [manpowerNotes, setManpowerNotes] = useState<string>(() => {
    return dayShift?.manpowerNotes || dayShift?.notes || localStorage.getItem(`daily_perf_manpower_notes_${selectedDate}`) || '';
  });

  useEffect(() => {
    const saved = dayShift?.manpowerNotes || dayShift?.notes || localStorage.getItem(`daily_perf_manpower_notes_${selectedDate}`) || '';
    setManpowerNotes(saved);
  }, [selectedDate, dayShift]);

  const handleSaveManpowerNotes = () => {
    localStorage.setItem(`daily_perf_manpower_notes_${selectedDate}`, manpowerNotes);
    if (dayShift && onSaveRecord) {
      onSaveRecord({
        ...dayShift,
        manpowerNotes,
        notes: manpowerNotes
      });
    }
    toast.success('Catatan Manpower & Perbantuan berhasil disimpan.');
  };

  // Parse Section Lab Personnel
  const parsedLabPersonnel = useMemo<LabPersonnelItem[]>(() => {
    const isGtsUniverse = (userPt || '').toUpperCase().trim() === 'GTS';

    if (!rosterList || rosterList.length === 0) {
      return isGtsUniverse ? FALLBACK_GTS_LAB_PERSONNEL : FALLBACK_TBP_LAB_PERSONNEL;
    }

    const labEmps = rosterList.filter((emp: any) => {
      const empPt = String(emp.pt || '').toUpperCase().trim();
      const nikUpper = String(emp.nik || '').toUpperCase().trim();
      const isEmpGts = empPt === 'GTS' || nikUpper.startsWith('03D') || nikUpper.startsWith('M03');

      // STRICT UNIVERSE ISOLATION:
      if (isGtsUniverse) {
        if (!isEmpGts) return false;
      } else {
        // TBP Universe: GTS personnel MUST NEVER APPEAR under any circumstances!
        if (isEmpGts) return false;
        // Verify valid TBP/GPS
        const isTbpOrGps = empPt === 'TBP' || empPt === 'GPS' || empPt === 'PT. TBP' || empPt === 'PT TBP' || 
                           nikUpper.startsWith('04D') || nikUpper.startsWith('02D') || nikUpper.startsWith('M04') || nikUpper.startsWith('M02') || !empPt;
        if (!isTbpOrGps) return false;
      }

      // KLASIFIKASI MURNI BERDASARKAN KOLOM SECTION:
      // Hanya section Laboratory; Admin dan QA memiliki section tersendiri dan tidak digabungkan
      const sec = String(emp.section || '').trim().toLowerCase();
      return (
        (sec === 'laboratory' || sec === 'laboratorium' || sec.includes('laboratory') || sec.includes('laboratorium')) &&
        !sec.includes('qa') &&
        !sec.includes('quality') &&
        !sec.includes('admin') &&
        !sec.includes('administrasi') &&
        !sec.includes('maintenance') &&
        !sec.includes('prep') &&
        !sec.includes('dry') &&
        !sec.includes('wet')
      );
    });

    if (labEmps.length === 0) {
      return isGtsUniverse ? FALLBACK_GTS_LAB_PERSONNEL : FALLBACK_TBP_LAB_PERSONNEL;
    }

    return labEmps.map((emp: any) => {
      let shiftCode = '';

      if (emp.fullSchedule && typeof emp.fullSchedule === 'object') {
        for (const k of dateKeys) {
          if (emp.fullSchedule[k]) {
            shiftCode = String(emp.fullSchedule[k]).trim();
            break;
          }
        }
      }

      if (!shiftCode && Array.isArray(emp.schedule)) {
        for (const k of dateKeys) {
          const item = emp.schedule.find((s: any) => s.date === k || s.dateStr === k || s.keyDateStr === k);
          if (item && item.shift) {
            shiftCode = String(item.shift).trim();
            break;
          }
        }
      }

      const upper = (shiftCode || '').toUpperCase().trim();
      const empShift = (emp.shift || '').toString().trim().toUpperCase();
      const jab = (emp.jabatan || emp.position || '').toLowerCase();
      // Non-Shift murni untuk section Laboratory (Supervisor, Chemist, Superintendent, dll.)
      const isNonShift = empShift.includes('NON') || jab.includes('superintendent') || jab.includes('supervisor') || jab.includes('officer') || jab.includes('chemist');

      let category: 'pagi' | 'malam' | 'tidak_bertugas' = 'pagi';
      let keterangan = 'Hadir Shift Pagi';
      let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';

      // 1. Cek Apakah Tidak Bertugas (Izin, Sakit, Off, Cuti)
      if (upper === 'OFF' || upper === 'X') {
        category = 'tidak_bertugas';
        keterangan = 'Off Roster';
        badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
      } else if (upper.startsWith('C') || upper === 'CT' || upper === 'CR' || upper === 'CE' || upper === 'CI' || upper === 'CS') {
        category = 'tidak_bertugas';
        keterangan = 'Cuti';
        badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      } else if (['SL', 'SS', 'S1', 'S2'].includes(upper) || upper.startsWith('SAKIT')) {
        category = 'tidak_bertugas';
        keterangan = 'Sakit';
        badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      } else if (['I', 'IK', 'IA', 'DL', 'UL'].includes(upper) || upper.startsWith('IZIN')) {
        category = 'tidak_bertugas';
        keterangan = upper === 'DL' ? 'Dinas Luar' : 'Izin';
        badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300';
      } else if (upper === 'TRV' || upper === 'TV') {
        category = 'tidak_bertugas';
        keterangan = 'Travel';
        badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300';
      } else if (upper === 'A' || upper === 'ALPA') {
        category = 'tidak_bertugas';
        keterangan = 'Alpa';
        badgeColor = 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200 border-rose-400';
      }
      // 2. Cek Apakah Shift Malam vs Pagi
      else if (upper === 'N') {
        category = 'malam';
        keterangan = 'Hadir Shift Malam';
        badgeColor = 'bg-indigo-900 text-white border-indigo-700';
      } else if (upper === 'D') {
        category = 'pagi';
        keterangan = isNonShift ? 'Hadir Non-Shift Pagi' : 'Hadir Shift Pagi';
        badgeColor = isNonShift 
          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
      } else {
        // Jika kode kerja umum ('1', 'X1') atau belum spesifik, cocokkan dengan regu shift hari ini dari Daily Performance:
        const personReguLetter = (emp.regu || empShift || '').toString().toUpperCase().replace(/[^A-D]/g, '');
        const dayReguLetter = (dayShift?.regu || '').toUpperCase().replace(/[^A-D]/g, '');
        const nightReguLetter = (nightShift?.regu || '').toUpperCase().replace(/[^A-D]/g, '');

        if (!isNonShift && personReguLetter && nightReguLetter && personReguLetter === nightReguLetter) {
          category = 'malam';
          keterangan = 'Hadir Shift Malam';
          badgeColor = 'bg-indigo-900 text-white border-indigo-700';
        } else {
          category = 'pagi';
          if (isNonShift) {
            keterangan = 'Hadir Non-Shift Pagi';
            badgeColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300';
          } else {
            keterangan = 'Hadir Shift Pagi';
            badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
          }
        }
      }

      const regu = isNonShift ? 'Non-Shift' : emp.regu ? formatShiftName(emp.regu) : (empShift === 'A' ? 'Shift A' : empShift === 'B' ? 'Shift B' : 'Shift');

      const isStaff = isStaffRole({
        jabatan: emp.jabatan || emp.position,
        gol: emp.gol || emp.golongan,
        roleCategory: emp.roleCategory
      });
      const roleCategory: 'staff' | 'crew' = isStaff ? 'staff' : 'crew';

      const isCuti = upper.startsWith('C') || upper === 'CT' || upper === 'CR' || upper === 'CE' || upper === 'CI' || upper === 'CS';
      const tglMasukKembali = isCuti ? (getReturnToWorkDate(emp, selectedDate) || undefined) : undefined;

      return {
        nik: emp.nik || '-',
        name: emp.name || emp.nama || 'Tanpa Nama',
        jabatan: emp.jabatan || emp.position || 'Teknisi Lab',
        section: 'Laboratory',
        regu,
        shiftSchedule: upper || (isNonShift ? 'D' : 'D'),
        category,
        roleCategory,
        keterangan,
        badgeColor,
        tglMasukKembali
      };
    });
  }, [rosterList, dateKeys, userPt, selectedDate, dayShift, nightShift]);

  // Lists by Category & Role
  const staffList = useMemo(() => parsedLabPersonnel.filter(p => p.roleCategory === 'staff'), [parsedLabPersonnel]);
  const crewList = useMemo(() => parsedLabPersonnel.filter(p => p.roleCategory === 'crew'), [parsedLabPersonnel]);

  const pagiList = useMemo(() => parsedLabPersonnel.filter(p => p.category === 'pagi'), [parsedLabPersonnel]);
  const malamList = useMemo(() => parsedLabPersonnel.filter(p => p.category === 'malam'), [parsedLabPersonnel]);
  const tidakBertugasList = useMemo(() => parsedLabPersonnel.filter(p => p.category === 'tidak_bertugas'), [parsedLabPersonnel]);

  // Kategorisasi Personil Tidak Hadir (Cuti, Sakit, Izin, Off)
  const cutiList = useMemo(() => tidakBertugasList.filter(p => {
    const k = (p.keterangan || '').toLowerCase();
    const s = (p.shiftSchedule || '').toUpperCase();
    return k.includes('cuti') || s === 'CT' || s === 'C';
  }), [tidakBertugasList]);

  const sakitList = useMemo(() => tidakBertugasList.filter(p => {
    const k = (p.keterangan || '').toLowerCase();
    const s = (p.shiftSchedule || '').toUpperCase();
    const isCuti = k.includes('cuti') || s === 'CT' || s === 'C';
    return !isCuti && (k.includes('sakit') || s === 'S');
  }), [tidakBertugasList]);

  const izinList = useMemo(() => tidakBertugasList.filter(p => {
    const k = (p.keterangan || '').toLowerCase();
    const s = (p.shiftSchedule || '').toUpperCase();
    const isCuti = k.includes('cuti') || s === 'CT' || s === 'C';
    const isSakit = k.includes('sakit') || s === 'S';
    return !isCuti && !isSakit && (k.includes('izin') || k.includes('ijin') || s === 'I');
  }), [tidakBertugasList]);

  const offList = useMemo(() => tidakBertugasList.filter(p => {
    const k = (p.keterangan || '').toLowerCase();
    const s = (p.shiftSchedule || '').toUpperCase();
    const isCuti = k.includes('cuti') || s === 'CT' || s === 'C';
    const isSakit = k.includes('sakit') || s === 'S';
    const isIzin = k.includes('izin') || k.includes('ijin') || s === 'I';
    return !isCuti && !isSakit && !isIzin;
  }), [tidakBertugasList]);

  // Staff breakdown
  const staffPagi = useMemo(() => staffList.filter(p => p.category === 'pagi'), [staffList]);
  const staffMalam = useMemo(() => staffList.filter(p => p.category === 'malam'), [staffList]);
  const staffTidakBertugas = useMemo(() => staffList.filter(p => p.category === 'tidak_bertugas'), [staffList]);
  const staffHadirTotal = staffPagi.length + staffMalam.length;
  const staffBreakdownPagi = useMemo(() => getJabatanBreakdown(staffPagi), [staffPagi]);
  const staffBreakdownMalam = useMemo(() => getJabatanBreakdown(staffMalam), [staffMalam]);

  // Klasifikasi Jabatan Staff yang Hadir Hari Ini (Hanya Jabatan dengan Count > 0, jika 0 jangan munculkan)
  const activeStaffJabatanList = useMemo(() => {
    const map: Record<string, { jabatan: string; count: number; pagi: number; malam: number; rank: number }> = {};
    for (const s of [...staffPagi, ...staffMalam]) {
      const j = (s.jabatan || 'Staff Lab').trim();
      if (!map[j]) {
        map[j] = { jabatan: j, count: 0, pagi: 0, malam: 0, rank: getJabatanRank(j) };
      }
      map[j].count++;
      if (s.category === 'pagi') map[j].pagi++;
      if (s.category === 'malam') map[j].malam++;
    }
    return Object.values(map).sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.jabatan.localeCompare(b.jabatan, 'id', { sensitivity: 'base' });
    });
  }, [staffPagi, staffMalam]);

  // Crew breakdown
  const crewPagi = useMemo(() => crewList.filter(p => p.category === 'pagi'), [crewList]);
  const crewMalam = useMemo(() => crewList.filter(p => p.category === 'malam'), [crewList]);
  const crewTidakBertugas = useMemo(() => crewList.filter(p => p.category === 'tidak_bertugas'), [crewList]);
  const crewHadirTotal = crewPagi.length + crewMalam.length;
  const crewBreakdownPagi = useMemo(() => getJabatanBreakdown(crewPagi), [crewPagi]);
  const crewBreakdownMalam = useMemo(() => getJabatanBreakdown(crewMalam), [crewMalam]);

  // List personil alpa
  const alpaList = useMemo(() => tidakBertugasList.filter(p => {
    const k = (p.keterangan || '').toLowerCase();
    const s = (p.shiftSchedule || '').toUpperCase();
    return k.includes('alpa') || s === 'A' || s === 'ALPA';
  }), [tidakBertugasList]);

  // Distribusi Lengkap Personil Tidak Hadir (Cuti, Sakit, Izin, Alpa) ke Shift Pagi vs Shift Malam:
  // - Regu shift pagi (misal Regu A) -> dialokasikan ke Shift Pagi
  // - Non-shift section Laboratory (Spv, Chemist, Superintendent, dll) -> otomatis masuk Shift Pagi
  // - Regu shift malam (misal Regu B) -> dialokasikan ke Shift Malam
  // - Breakdown Staff Cuti vs Crew Cuti untuk masing-masing shift
  const { 
    cutiPagi, cutiMalam,
    staffCutiPagi, crewCutiPagi,
    staffCutiMalam, crewCutiMalam,
    sakitPagi, sakitMalam,
    izinPagi, izinMalam,
    alpaPagi, alpaMalam,
    kendalaPagi, kendalaMalam
  } = useMemo(() => {
    const activePagiRegus = new Set(
      crewPagi
        .map(p => (p.regu || '').trim())
        .filter(r => r && r !== 'Non-Shift')
    );

    const activeMalamRegus = new Set(
      crewMalam
        .map(p => (p.regu || '').trim())
        .filter(r => r && r !== 'Non-Shift')
    );

    const isMatchRegu = (personRegu: string, targetSet: Set<string>) => {
      if (!personRegu) return false;
      const clean = personRegu.toLowerCase().trim();
      for (const act of targetSet) {
        const actClean = act.toLowerCase().trim();
        if (clean === actClean) return true;
        const actLetter = actClean.replace(/[^a-d]/g, '');
        const cleanLetter = clean.replace(/[^a-d]/g, '');
        if (actLetter && cleanLetter && actLetter === cleanLetter) return true;
      }
      return false;
    };

    const isAssignedToPagi = (person: LabPersonnelItem) => {
      // Pada hari Long Shift (Hari Minggu), dinas dilakukan 100% oleh Shift Pagi (07:00 - 24:00 WITA)
      if (isLongShift) {
        const personReguLetter = (person.regu || '').toUpperCase().replace(/[^A-D]/g, '');
        const dayReguLetter = (dayShift?.regu || '').toUpperCase().replace(/[^A-D]/g, '');
        if (personReguLetter && dayReguLetter && personReguLetter === dayReguLetter) return true;
        if (person.regu === 'Non-Shift') return true;
        return false;
      }

      // 1. Non-shift personnel (Spv, Superintendent, Chemist, Admin, QA) selalu dinas pagi (07:00 - 19:00)
      if (person.regu === 'Non-Shift') return true;
      const j = (person.jabatan || '').toLowerCase();
      if (j.includes('supervisor') || j.includes('chemist') || j.includes('superintendent') || j.includes('admin') || j.includes('qa')) return true;

      // 2. Hubungkan langsung dengan Shift hari ini dari Daily Performance Record:
      const personReguLetter = (person.regu || '').toUpperCase().replace(/[^A-D]/g, '');
      const dayReguLetter = (dayShift?.regu || '').toUpperCase().replace(/[^A-D]/g, '');
      const nightReguLetter = (nightShift?.regu || '').toUpperCase().replace(/[^A-D]/g, '');

      if (personReguLetter && dayReguLetter && personReguLetter === dayReguLetter) {
        return true; // Sesuai Shift Pagi hari ini
      }
      if (personReguLetter && nightReguLetter && personReguLetter === nightReguLetter) {
        return false; // Sesuai Shift Malam hari ini
      }

      // 3. Fallback berdasarkan jadwal shift jika tercatat D atau N
      if (person.shiftSchedule === 'D') return true;
      if (person.shiftSchedule === 'N') return false;

      // 4. Fallback shift matching aktif
      if (isMatchRegu(person.regu, activePagiRegus)) return true;
      if (isMatchRegu(person.regu, activeMalamRegus)) return false;

      return true;
    };

    const cPagi = cutiList.filter(p => isAssignedToPagi(p));
    const cMalam = cutiList.filter(p => !isAssignedToPagi(p));
    const sPagi = sakitList.filter(p => isAssignedToPagi(p));
    const sMalam = sakitList.filter(p => !isAssignedToPagi(p));
    const iPagi = izinList.filter(p => isAssignedToPagi(p));
    const iMalam = izinList.filter(p => !isAssignedToPagi(p));
    const aPagi = alpaList.filter(p => isAssignedToPagi(p));
    const aMalam = alpaList.filter(p => !isAssignedToPagi(p));

    return {
      cutiPagi: cPagi,
      cutiMalam: cMalam,
      staffCutiPagi: cPagi.filter(p => p.roleCategory === 'staff'),
      crewCutiPagi: cPagi.filter(p => p.roleCategory === 'crew'),
      staffCutiMalam: cMalam.filter(p => p.roleCategory === 'staff'),
      crewCutiMalam: cMalam.filter(p => p.roleCategory === 'crew'),
      sakitPagi: sPagi,
      sakitMalam: sMalam,
      izinPagi: iPagi,
      izinMalam: iMalam,
      alpaPagi: aPagi,
      alpaMalam: aMalam,
      kendalaPagi: [...cPagi, ...sPagi, ...iPagi, ...aPagi],
      kendalaMalam: [...cMalam, ...sMalam, ...iMalam, ...aMalam]
    };
  }, [cutiList, sakitList, izinList, alpaList, crewPagi, crewMalam, dayShift, nightShift, isLongShift]);

  // Filtered & Sorted Personnel (Sorted by Jabatan Hierarchy via compareEmployeesByJabatan)
  const filteredPersonnel = useMemo(() => {
    let base = parsedLabPersonnel;

    if (manpowerRoleTab === 'staff') {
      base = staffList;
    } else if (manpowerRoleTab === 'crew') {
      base = crewList;
    } else if (manpowerRoleTab === 'tidak_bertugas') {
      base = tidakBertugasList;
    }

    if (manpowerRoleTab !== 'tidak_bertugas') {
      if (manpowerShiftFilter === 'pagi') {
        base = base.filter(p => p.category === 'pagi');
      } else if (manpowerShiftFilter === 'malam') {
        base = base.filter(p => p.category === 'malam');
      }
    }

    if (manpowerSearch.trim()) {
      const q = manpowerSearch.toLowerCase();
      base = base.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.nik.toLowerCase().includes(q) || 
        p.jabatan.toLowerCase().includes(q) ||
        p.keterangan.toLowerCase().includes(q) ||
        p.regu.toLowerCase().includes(q)
      );
    }

    // Diurutkan berdasarkan hirarki jabatan resmi!
    return [...base].sort(compareEmployeesByJabatan);
  }, [parsedLabPersonnel, staffList, crewList, tidakBertugasList, manpowerRoleTab, manpowerShiftFilter, manpowerSearch]);

  // STEP 1: MANPOWER CALCULATIONS
  const staffPresent = dayRecords.reduce((acc, r) => acc + r.manpower.staff.shift, 0);
  const staffCuti = dayRecords.reduce((acc, r) => acc + r.manpower.staff.cuti, 0);
  const staffIzinSakit = dayRecords.reduce((acc, r) => acc + r.manpower.staff.izin + r.manpower.staff.sakit + r.manpower.staff.alpa, 0);
  const staffTotal = dayRecords.reduce((acc, r) => acc + r.manpower.staff.total, 0);

  const crewPresent = dayRecords.reduce((acc, r) => acc + r.manpower.crew.shift, 0);
  const crewBantuan = dayRecords.reduce((acc, r) => acc + r.manpower.crew.bantn, 0);
  const crewCuti = dayRecords.reduce((acc, r) => acc + r.manpower.crew.cuti, 0);
  const crewIzinSakit = dayRecords.reduce((acc, r) => acc + r.manpower.crew.izin + r.manpower.crew.sakit + r.manpower.crew.alpa, 0);
  const crewTotal = dayRecords.reduce((acc, r) => acc + r.manpower.crew.total, 0);

  // STEP 2: SAMPLE RECEIVED PER SECTION & PER SHIFT
  const gcDayShift = dayShift?.sampleReceived.gc.shift || 0;
  const gcNightShift = nightShift?.sampleReceived.gc.shift || 0;
  const gcShift = dayRecords.reduce((acc, r) => acc + r.sampleReceived.gc.shift, 0);
  const gcDay = dayRecords[dayRecords.length - 1]?.sampleReceived.gc.day || gcShift;
  const gcWkly = dayRecords[dayRecords.length - 1]?.sampleReceived.gc.wkly || 0;

  const prodDayShift = dayShift?.sampleReceived.prod.shift || 0;
  const prodNightShift = nightShift?.sampleReceived.prod.shift || 0;
  const prodRcDay = dayShift?.sampleReceived.prod.rc || 0;
  const prodRcNight = nightShift?.sampleReceived.prod.rc || 0;
  const prodRaDay = dayShift?.sampleReceived.prod.ra || 0;
  const prodRaNight = nightShift?.sampleReceived.prod.ra || 0;
  const prodShift = dayRecords.reduce((acc, r) => acc + r.sampleReceived.prod.shift, 0);
  const prodRc = dayRecords.reduce((acc, r) => acc + r.sampleReceived.prod.rc, 0);
  const prodRaTotal = dayRecords.reduce((acc, r) => acc + (r.sampleReceived.prod.ra || 0), 0);
  const prodDay = dayRecords[dayRecords.length - 1]?.sampleReceived.prod.day || prodShift;
  const prodWkly = dayRecords[dayRecords.length - 1]?.sampleReceived.prod.wkly || 0;

  const expDayShift = dayShift?.sampleReceived.exp.shift || 0;
  const expNightShift = nightShift?.sampleReceived.exp.shift || 0;
  const expShift = dayRecords.reduce((acc, r) => acc + r.sampleReceived.exp.shift, 0);
  const expDay = dayRecords[dayRecords.length - 1]?.sampleReceived.exp.day || expShift;
  const expWkly = dayRecords[dayRecords.length - 1]?.sampleReceived.exp.wkly || 0;

  const smelterDayShift = dayShift?.sampleReceived.smelter.shift || 0;
  const smelterNightShift = nightShift?.sampleReceived.smelter.shift || 0;
  const smelterShift = dayRecords.reduce((acc, r) => acc + r.sampleReceived.smelter.shift, 0);
  const smelterDay = dayRecords[dayRecords.length - 1]?.sampleReceived.smelter.day || smelterShift;
  const smelterWkly = dayRecords[dayRecords.length - 1]?.sampleReceived.smelter.wkly || 0;

  const totalDayShift = gcDayShift + prodDayShift + expDayShift + smelterDayShift;
  const totalNightShift = gcNightShift + prodNightShift + expNightShift + smelterNightShift;
  const totalReceivedShift = gcShift + prodShift + expShift + smelterShift;

  // STEP 3: PRODUCTIVITY (3 Garis Besar: Press Pellet GC, Fusion, LOI)
  // Output Selesai Per-Shift
  const pressDayShift = dayShift?.pressPowder.finish.shift || 0;
  const pressNightShift = nightShift?.pressPowder.finish.shift || 0;
  const weighDayShift = dayShift?.fuseBead.finishShift || 0;
  const weighNightShift = nightShift?.fuseBead.finishShift || 0;
  const fusionDayShift = weighDayShift;
  const fusionNightShift = weighNightShift;
  const loiDayShift = dayShift?.loi.finLoiShift || 0;
  const loiNightShift = nightShift?.loi.finLoiShift || 0;

  // 3a. Metode Press Pellet (Sample GC) - Neraca Per Shift
  const pressBalAwalDay = 0;
  const pressRecvDay = gcDayShift;
  const pressFinDay = pressDayShift;
  const pressBalDay = Math.max(0, pressBalAwalDay + pressRecvDay - pressFinDay);

  const pressBalAwalNight = pressBalDay;
  const pressRecvNight = gcNightShift;
  const pressFinNight = pressNightShift;
  const pressBalNight = Math.max(0, pressBalAwalNight + pressRecvNight - pressFinNight);

  const pressBalAwal = pressBalAwalDay;
  const pressRecv = gcShift;
  const pressFin = pressFinDay + pressFinNight;
  const pressBal = isLongShift ? pressBalDay : pressBalNight;

  // 3b. Fusion (Exploration, Production, Smelter) - Neraca Per Shift
  // Sub-Unit A: Weighing (Penimbangan Cawan & Fluks)
  const weighOsDay = dayShift?.fuseBead.osExp || 0;
  const weighRecvDay = expDayShift + (prodRcDay > 0 ? prodRcDay : 0) + smelterDayShift;
  const weighFinDay = weighDayShift;
  const weighBalDay = dayShift?.fuseBead.balExp ?? Math.max(0, weighOsDay + weighRecvDay - weighFinDay);

  const weighOsNight = nightShift?.fuseBead.osExp || weighBalDay || 0;
  const weighRecvNight = expNightShift + (prodRcNight > 0 ? prodRcNight : 0) + smelterNightShift;
  const weighFinNight = weighNightShift;
  const weighBalNight = nightShift?.fuseBead.balExp ?? Math.max(0, weighOsNight + weighRecvNight - weighFinNight);

  const weighOs = weighOsDay;
  const weighRecv = (weighRecvDay + weighRecvNight) > 0 ? (weighRecvDay + weighRecvNight) : expShift;
  const weighFin = weighFinDay + weighFinNight;
  const weighBal = isLongShift ? weighBalDay : (dayRecords[dayRecords.length - 1]?.fuseBead.balExp ?? weighBalNight);

  // Sub-Unit B: Fusion (Peleburan Manik Kaca Borat)
  const fusionBalAwalDay = weighOsDay;
  const fusionRecvDay = weighFinDay;
  const fusionFinDay = fusionDayShift;
  const fusionBalDay = dayShift?.fuseBead.balExp ?? Math.max(0, fusionBalAwalDay + fusionRecvDay - fusionFinDay);

  const fusionBalAwalNight = weighOsNight || fusionBalDay || 0;
  const fusionRecvNight = weighFinNight;
  const fusionFinNight = fusionNightShift;
  const fusionBalNight = nightShift?.fuseBead.balExp ?? Math.max(0, fusionBalAwalNight + fusionRecvNight - fusionFinNight);

  const fusionBalAwal = weighOs;
  const fusionRecv = weighFin;
  const fusionFin = weighFin;
  const fusionBalAkhir = weighBal;

  // 3c. LOI (Exploration): Balance, Received, Weighing, W1-W4, Outstanding (OS W1-W4) - Neraca Per Shift
  const loiOsDay = dayShift?.loi.os || 0;
  const loiRecvDay = expDayShift;
  const loiWeighingDay = dayShift?.loi?.weighing || weighFinDay || dayShift?.loi.finLoiShift || 0;
  const loiFinDay = loiDayShift;
  const loiBalDay = dayShift?.loi.bal || 0;

  const loiOsNight = nightShift?.loi.os || loiBalDay || 0;
  const loiRecvNight = expNightShift;
  const loiWeighingNight = nightShift?.loi?.weighing || weighFinNight || nightShift?.loi.finLoiShift || 0;
  const loiFinNight = loiNightShift;
  const loiBalNight = nightShift?.loi.bal || 0;

  const loiOs = loiOsDay;
  const loiRecv = expShift;
  const loiWeighing = loiWeighingDay + loiWeighingNight;
  const loiFin = loiFinDay + loiFinNight;
  const loiBal = isLongShift ? loiBalDay : (dayRecords[dayRecords.length - 1]?.loi.bal || loiBalNight);

  // Tahap Proses W1 - W4 LOI Per-Shift
  const loiW1Day = dayShift?.loi?.w1 || dayShift?.loi?.w2 || loiFinDay;
  const loiW1Night = nightShift?.loi?.w1 || nightShift?.loi?.w2 || loiFinNight;
  const loiW1 = loiW1Day + loiW1Night;

  const loiW2Day = dayShift?.loi.w2 || 0;
  const loiW2Night = nightShift?.loi.w2 || 0;
  const loiW2 = loiW2Day + loiW2Night;

  const loiW3Day = dayShift?.loi?.w3 || dayShift?.loi?.w5 || dayShift?.loi?.w4 || 0;
  const loiW3Night = nightShift?.loi?.w3 || nightShift?.loi?.w5 || nightShift?.loi?.w4 || 0;
  const loiW3 = loiW3Day + loiW3Night;

  const loiW4Day = dayShift?.loi.w4 || 0;
  const loiW4Night = nightShift?.loi.w4 || 0;
  const loiW4 = loiW4Day + loiW4Night;

  const osW1Day = dayShift?.loi?.osW1 || Math.max(0, Math.round(loiBalDay * 0.3));
  const osW1Night = nightShift?.loi?.osW1 || Math.max(0, Math.round(loiBalNight * 0.3));
  const osW1 = isLongShift ? osW1Day : (osW1Day + osW1Night);

  const osW2Day = dayShift?.loi?.osW2 || Math.max(0, Math.round(loiBalDay * 0.25));
  const osW2Night = nightShift?.loi?.osW2 || Math.max(0, Math.round(loiBalNight * 0.25));
  const osW2 = isLongShift ? osW2Day : (osW2Day + osW2Night);

  const osW3Day = dayShift?.loi?.osW3 || Math.max(0, Math.round(loiBalDay * 0.25));
  const osW3Night = nightShift?.loi?.osW3 || Math.max(0, Math.round(loiBalNight * 0.25));
  const osW3 = isLongShift ? osW3Day : (osW3Day + osW3Night);

  const osW4Day = dayShift?.loi?.osW4 || Math.max(0, loiBalDay - (osW1Day + osW2Day + osW3Day));
  const osW4Night = nightShift?.loi?.osW4 || Math.max(0, loiBalNight - (osW1Night + osW2Night + osW3Night));
  const osW4 = isLongShift ? osW4Day : (osW4Day + osW4Night);

  // STEP 4: INSTRUMEN (EDXRF 6 alat & WDXRF 2 alat)
  // 4a. EDXRF 6 alat Epsilon (C, D, E, F, G, H) + S2 Puma
  const epsC = dayRecords.reduce((acc, r) => acc + r.edxrf.epsC, 0);
  const epsD = dayRecords.reduce((acc, r) => acc + r.edxrf.epsD, 0);
  const epsE = dayRecords.reduce((acc, r) => acc + r.edxrf.epsE, 0);
  const epsF = dayRecords.reduce((acc, r) => acc + r.edxrf.epsF, 0);
  const epsG = dayRecords.reduce((acc, r) => acc + r.edxrf.epsG, 0);
  const epsH = dayRecords.reduce((acc, r) => acc + r.edxrf.epsH, 0);
  const s2Puma = dayRecords.reduce((acc, r) => acc + r.edxrf.s2Puma, 0);
  const edxrfTotalFin = epsC + epsD + epsE + epsF + epsG + epsH + s2Puma;
  const edxrfBalAwal = pressFin;
  const edxrfRecv = pressRecv;
  const edxrfOutstanding = Math.max(0, edxrfRecv - edxrfTotalFin);

  const edxrfBalAwalDay = 0;
  const edxrfRecvDay = pressFinDay;
  const edxrfFinDay = dayShift?.edxrf.shift || 0;
  const edxrfBalDay = Math.max(0, edxrfBalAwalDay + edxrfRecvDay - edxrfFinDay);

  const edxrfBalAwalNight = edxrfBalDay;
  const edxrfRecvNight = pressFinNight;
  const edxrfFinNight = nightShift?.edxrf.shift || 0;
  const edxrfBalNight = Math.max(0, edxrfBalAwalNight + edxrfRecvNight - edxrfFinNight);

  // 4b. WDXRF 2 alat (Zetium A & Zetium B)
  const wdxrfBalAwal = dayRecords[0]?.wdxrf.osExp || 0;
  const wdxrfRecv = fusionFin;
  const ztmATotal = dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.total, 0);
  const ztmBTotal = dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.total, 0);
  const wdxrfTotalFin = ztmATotal + ztmBTotal;
  const wdxrfBalAkhir = dayRecords[dayRecords.length - 1]?.wdxrf.bal || 0;

  const ztmABreakdown = {
    prod: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.prod, 0),
    exp: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.exp, 0),
    smelt: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.smelt, 0),
    gts: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.gts, 0),
    rarr: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.rarr, 0),
    ver: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.ver, 0),
    std: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.std, 0),
    blank: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.blank, 0),
  };

  const ztmBBreakdown = {
    prod: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.prod, 0),
    exp: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.exp, 0),
    smelt: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.smelt, 0),
    gts: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.gts, 0),
    rarr: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.rarr, 0),
    ver: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.ver, 0),
    std: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.std, 0),
    blank: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.blank, 0),
  };

  // PEMISAHAN MUTLAK GTS DAN TBP/GPS (ENTITAS TERPISAH)
  const ztmAGts = ztmABreakdown.gts;
  const ztmBGts = ztmBBreakdown.gts;
  const totalGtsRuns = ztmAGts + ztmBGts;

  const ztmATbpGps = ztmABreakdown.prod + ztmABreakdown.exp + ztmABreakdown.smelt + ztmABreakdown.rarr + ztmABreakdown.ver + ztmABreakdown.std + ztmABreakdown.blank;
  const ztmBTbpGps = ztmBBreakdown.prod + ztmBBreakdown.exp + ztmBBreakdown.smelt + ztmBBreakdown.rarr + ztmBBreakdown.ver + ztmBBreakdown.std + ztmBBreakdown.blank;
  const totalTbpGpsWdxrf = ztmATbpGps + ztmBTbpGps;

  // GTS Runs Per Shift
  const gtsDayRuns = (dayShift?.wdxrf.zetiumA.gts || 0) + (dayShift?.wdxrf.zetiumB.gts || 0);
  const gtsNightRuns = (nightShift?.wdxrf.zetiumA.gts || 0) + (nightShift?.wdxrf.zetiumB.gts || 0);

  // TBP/GPS WDXRF Per Shift
  const tbpGpsDayWdxrf = dayShift ? (
    (dayShift.wdxrf.zetiumA.prod || 0) + (dayShift.wdxrf.zetiumA.exp || 0) + (dayShift.wdxrf.zetiumA.smelt || 0) + (dayShift.wdxrf.zetiumA.rarr || 0) + (dayShift.wdxrf.zetiumA.ver || 0) + (dayShift.wdxrf.zetiumA.std || 0) + (dayShift.wdxrf.zetiumA.blank || 0) +
    (dayShift.wdxrf.zetiumB.prod || 0) + (dayShift.wdxrf.zetiumB.exp || 0) + (dayShift.wdxrf.zetiumB.smelt || 0) + (dayShift.wdxrf.zetiumB.rarr || 0) + (dayShift.wdxrf.zetiumB.ver || 0) + (dayShift.wdxrf.zetiumB.std || 0) + (dayShift.wdxrf.zetiumB.blank || 0)
  ) : 0;
  const tbpGpsNightWdxrf = nightShift ? (
    (nightShift.wdxrf.zetiumA.prod || 0) + (nightShift.wdxrf.zetiumA.exp || 0) + (nightShift.wdxrf.zetiumA.smelt || 0) + (nightShift.wdxrf.zetiumA.rarr || 0) + (nightShift.wdxrf.zetiumA.ver || 0) + (nightShift.wdxrf.zetiumA.std || 0) + (nightShift.wdxrf.zetiumA.blank || 0) +
    (nightShift.wdxrf.zetiumB.prod || 0) + (nightShift.wdxrf.zetiumB.exp || 0) + (nightShift.wdxrf.zetiumB.smelt || 0) + (nightShift.wdxrf.zetiumB.rarr || 0) + (nightShift.wdxrf.zetiumB.ver || 0) + (nightShift.wdxrf.zetiumB.std || 0) + (nightShift.wdxrf.zetiumB.blank || 0)
  ) : 0;

  // GTS Sample Received (jika tercatat mandiri)
  const gtsDayShift = dayShift?.sampleReceived.gts?.shift || 0;
  const gtsNightShift = nightShift?.sampleReceived.gts?.shift || 0;
  const totalGtsReceived = dayRecords.reduce((acc, r) => acc + (r.sampleReceived.gts?.shift || 0), 0);
  const totalTbpGpsReceived = gcShift + prodShift + expShift + smelterShift;

  // Preparasi Per-Shift Agregat
  const totalPrepFin = pressFin + weighFin + fusionFin + loiFin;
  const totalPrepFinDay = pressDayShift + weighDayShift + fusionDayShift + loiDayShift;
  const totalPrepFinNight = pressNightShift + weighNightShift + fusionNightShift + loiNightShift;
  const totalPrepBal = pressBal + weighBal + fusionBalAkhir + loiBal;

  // EDXRF Per-Shift
  const edxrfDayShift = dayShift?.edxrf.shift || 0;
  const edxrfNightShift = nightShift?.edxrf.shift || 0;

  // STEP 5: QC DATA & REPORTING
  const qcBalAwal = dayRecords[0]?.qc.os || 0;
  const qcRecv = wdxrfTotalFin;
  const qcFin = dayRecords.reduce((acc, r) => acc + r.qc.finishShift, 0);
  const qcBalAkhir = dayRecords[dayRecords.length - 1]?.qc.bal || 0;
  const qcDayShift = dayShift?.qc.finishShift || 0;
  const qcNightShift = nightShift?.qc.finishShift || 0;

  const reportBalAwal = dayRecords[0]?.report.osReport || 0;
  const reportRecv = dayRecords.reduce((acc, r) => acc + r.report.received, 0);
  const reportFin = dayRecords.reduce((acc, r) => acc + r.report.finishReportDay, 0);
  const reportBalAkhir = dayRecords[dayRecords.length - 1]?.report.bal || 0;
  const reportDayShift = dayShift?.report.finishReportDay || 0;
  const reportNightShift = nightShift?.report.finishReportDay || 0;

  // =========================================================================
  // D-1 (PREVIOUS DAY) & HISTORICAL CHRONOLOGICAL DATA ENGINE
  // =========================================================================
  const sortedDateList = useMemo(() => {
    const dates = Array.from(new Set(records.map(r => r.isoDate || r.date))).filter(Boolean);
    return dates.sort((a, b) => {
      if (a.includes('-') && b.includes('-')) return a.localeCompare(b);
      const [d1, m1, y1] = a.split('/').map(Number);
      const [d2, m2, y2] = b.split('/').map(Number);
      if (y1 && y2 && d1 && d2) {
        return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
      }
      return a.localeCompare(b);
    });
  }, [records]);

  const activeIsoDate = dayRecords[0]?.isoDate || selectedDate;
  const activeDate = dayRecords[0]?.date || selectedDate;
  const currentChronologicalIndex = sortedDateList.findIndex(d => d === activeIsoDate || d === activeDate);
  const prevDateKey = currentChronologicalIndex > 0 ? sortedDateList[currentChronologicalIndex - 1] : null;

  const prevDayRecords = useMemo(() => {
    if (!prevDateKey) return [];
    return records.filter(r => r.isoDate === prevDateKey || r.date === prevDateKey);
  }, [records, prevDateKey]);

  // Trailing records up to selected date for 7-day average
  const trailingRecords = useMemo(() => {
    if (currentChronologicalIndex <= 0) return dayRecords;
    const startIndex = Math.max(0, currentChronologicalIndex - 6);
    const dateRange = new Set(sortedDateList.slice(startIndex, currentChronologicalIndex + 1));
    return records.filter(r => dateRange.has(r.isoDate || r.date));
  }, [records, sortedDateList, currentChronologicalIndex, dayRecords]);

  const trailingDaysCount = useMemo(() => {
    return new Set(trailingRecords.map(r => r.isoDate || r.date)).size || 1;
  }, [trailingRecords]);

  // Step 1 D-1 Manpower
  const prevStaffPresent = prevDayRecords.reduce((acc, r) => acc + r.manpower.staff.shift, 0);
  const prevCrewPresent = prevDayRecords.reduce((acc, r) => acc + r.manpower.crew.shift, 0);
  const prevTotalHadir = prevStaffPresent + prevCrewPresent;
  const totalHadirToday = staffHadirTotal + crewHadirTotal;

  // Step 2 D-1 Sample Received
  const prevGcShift = prevDayRecords.reduce((acc, r) => acc + r.sampleReceived.gc.shift, 0);
  const prevProdShift = prevDayRecords.reduce((acc, r) => acc + r.sampleReceived.prod.shift, 0);
  const prevExpShift = prevDayRecords.reduce((acc, r) => acc + r.sampleReceived.exp.shift, 0);
  const prevSmelterShift = prevDayRecords.reduce((acc, r) => acc + r.sampleReceived.smelter.shift, 0);
  const prevTotalReceived = prevGcShift + prevProdShift + prevExpShift + prevSmelterShift;
  const prevTotalGtsReceived = prevDayRecords.reduce((acc, r) => acc + (r.sampleReceived.gts?.shift || 0), 0);

  // 7-day average TBP/GPS Received
  const avg7TbpGpsRecv = Math.round(
    trailingRecords.reduce((acc, r) => acc + r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift + r.sampleReceived.smelter.shift, 0) / trailingDaysCount
  );

  // Step 3 D-1 Preparasi Throughput & Backlog
  const prevPressFin = prevDayRecords.reduce((acc, r) => acc + r.pressPowder.finish.shift, 0);
  const prevWeighFin = prevDayRecords.reduce((acc, r) => acc + r.fuseBead.finishShift, 0);
  const prevFusionFin = prevWeighFin;
  const prevLoiFin = prevDayRecords.reduce((acc, r) => acc + r.loi.finLoiShift, 0);
  const prevTotalPrepFin = prevPressFin + prevWeighFin + prevFusionFin + prevLoiFin;
  const prevTotalPrepBal = (prevDayRecords[prevDayRecords.length - 1]?.fuseBead.balExp || 0) + (prevDayRecords[prevDayRecords.length - 1]?.loi.bal || 0);

  // Step 4 D-1 EDXRF & WDXRF
  const prevEdxrfTotalFin = prevDayRecords.reduce((acc, r) => acc + r.edxrf.shift, 0);

  const prevZtmAGts = prevDayRecords.reduce((acc, r) => acc + (r.wdxrf.zetiumA.gts || 0), 0);
  const prevZtmBGts = prevDayRecords.reduce((acc, r) => acc + (r.wdxrf.zetiumB.gts || 0), 0);
  const prevTotalGtsRuns = prevZtmAGts + prevZtmBGts;

  const prevTotalTbpGpsWdxrf = prevDayRecords.reduce((acc, r) => {
    const za = r.wdxrf.zetiumA;
    const zb = r.wdxrf.zetiumB;
    const zaT = (za.prod || 0) + (za.exp || 0) + (za.smelt || 0) + (za.rarr || 0) + (za.ver || 0) + (za.std || 0) + (za.blank || 0);
    const zbT = (zb.prod || 0) + (zb.exp || 0) + (zb.smelt || 0) + (zb.rarr || 0) + (zb.ver || 0) + (zb.std || 0) + (zb.blank || 0);
    return acc + zaT + zbT;
  }, 0);

  // Step 5 D-1 QC & Reporting
  const prevQcFin = prevDayRecords.reduce((acc, r) => acc + r.qc.finishShift, 0);
  const prevReportFin = prevDayRecords.reduce((acc, r) => acc + r.report.finishReportDay, 0);
  const prevReportBal = prevDayRecords[prevDayRecords.length - 1]?.report.bal || 0;

  // Active Month Records & Monthly Benchmarks (Rekor Tertinggi Bulan Ini)
  const activeMonthRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    
    let targetYear = 2026;
    let targetMonth = 10; // 1-12
    if (selectedDate.includes('/')) {
      const parts = selectedDate.split('/');
      targetMonth = parseInt(parts[1], 10) || 10;
      targetYear = parseInt(parts[2], 10) || 2026;
    } else if (selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      targetYear = parseInt(parts[0], 10) || 2026;
      targetMonth = parseInt(parts[1], 10) || 10;
    }

    const filtered = records.filter(r => {
      const d = r.isoDate || r.date || '';
      if (d.includes('-')) {
        const parts = d.split('-');
        return parseInt(parts[0], 10) === targetYear && parseInt(parts[1], 10) === targetMonth;
      } else if (d.includes('/')) {
        const parts = d.split('/');
        return parseInt(parts[2], 10) === targetYear && parseInt(parts[1], 10) === targetMonth;
      }
      return true;
    });

    return filtered.length > 0 ? filtered : records;
  }, [records, selectedDate]);

  // Compute maximum shift volume and maximum daily volume across this month
  const monthlyBenchmarks = useMemo(() => {
    const dailyGroups: Record<string, DailyPerformanceRecord[]> = {};
    activeMonthRecords.forEach(r => {
      const key = r.isoDate || r.date || 'unknown';
      if (!dailyGroups[key]) dailyGroups[key] = [];
      dailyGroups[key].push(r);
    });

    // 1. Press Pellet GC
    let maxShiftPressFin = 0, maxShiftPressRecv = 0, maxShiftPressBal = 0;
    let maxDailyPressFin = 0, maxDailyPressRecv = 0, maxDailyPressBal = 0;

    // 2. Weighing
    let maxShiftWeighFin = 0, maxShiftWeighRecv = 0, maxShiftWeighBal = 0;
    let maxDailyWeighFin = 0, maxDailyWeighRecv = 0, maxDailyWeighBal = 0;

    // 3. Fusion
    let maxShiftFusionFin = 0, maxShiftFusionRecv = 0, maxShiftFusionBal = 0;
    let maxDailyFusionFin = 0, maxDailyFusionRecv = 0, maxDailyFusionBal = 0;

    // 4. LOI
    let maxShiftLoiFin = 0, maxShiftLoiRecv = 0, maxShiftLoiWeigh = 0, maxShiftLoiBal = 0;
    let maxDailyLoiFin = 0, maxDailyLoiRecv = 0, maxDailyLoiWeigh = 0, maxDailyLoiBal = 0;

    // 5. LOI Workstations (W1 - W4 & OS W1 - OS W4)
    let maxShiftW1 = 0, maxShiftW2 = 0, maxShiftW3 = 0, maxShiftW4 = 0;
    let maxShiftOsW1 = 0, maxShiftOsW2 = 0, maxShiftOsW3 = 0, maxShiftOsW4 = 0;
    let maxDailyW1 = 0, maxDailyW2 = 0, maxDailyW3 = 0, maxDailyW4 = 0;
    let maxDailyOsW1 = 0, maxDailyOsW2 = 0, maxDailyOsW3 = 0, maxDailyOsW4 = 0;

    // Calculate maximum per-shift in month
    activeMonthRecords.forEach(r => {
      // Press
      const pFin = r.pressPowder?.finish?.shift || 0;
      const pRecv = r.sampleReceived?.gc?.shift || 0;
      maxShiftPressFin = Math.max(maxShiftPressFin, pFin);
      maxShiftPressRecv = Math.max(maxShiftPressRecv, pRecv);

      // Weighing & Fusion
      const fFin = r.fuseBead?.finishShift || 0;
      const fRecv = (r.sampleReceived?.exp?.shift || 0) + (r.sampleReceived?.prod?.rc || 0) + (r.sampleReceived?.smelter?.shift || 0);
      const fBal = r.fuseBead?.balExp || 0;
      const fOs = r.fuseBead?.osExp || 0;
      maxShiftWeighFin = Math.max(maxShiftWeighFin, fFin);
      maxShiftWeighRecv = Math.max(maxShiftWeighRecv, fRecv);
      maxShiftWeighBal = Math.max(maxShiftWeighBal, fBal, fOs);

      maxShiftFusionFin = Math.max(maxShiftFusionFin, fFin);
      maxShiftFusionRecv = Math.max(maxShiftFusionRecv, fFin);
      maxShiftFusionBal = Math.max(maxShiftFusionBal, fBal, fOs);

      // LOI
      const lFin = r.loi?.finLoiShift || 0;
      const lRecv = r.sampleReceived?.exp?.shift || 0;
      const lWeigh = r.loi?.weighing || fFin || lFin;
      const lBal = r.loi?.bal || 0;
      const lOs = r.loi?.os || 0;
      maxShiftLoiFin = Math.max(maxShiftLoiFin, lFin);
      maxShiftLoiRecv = Math.max(maxShiftLoiRecv, lRecv);
      maxShiftLoiWeigh = Math.max(maxShiftLoiWeigh, lWeigh);
      maxShiftLoiBal = Math.max(maxShiftLoiBal, lBal, lOs);

      // W1 - W4
      const w1 = r.loi?.w1 || r.loi?.w2 || lFin;
      const w2 = r.loi?.w2 || 0;
      const w3 = r.loi?.w3 || r.loi?.w5 || r.loi?.w4 || 0;
      const w4 = r.loi?.w4 || 0;
      maxShiftW1 = Math.max(maxShiftW1, w1);
      maxShiftW2 = Math.max(maxShiftW2, w2);
      maxShiftW3 = Math.max(maxShiftW3, w3);
      maxShiftW4 = Math.max(maxShiftW4, w4);

      const ow1 = r.loi?.osW1 || Math.round(lBal * 0.3);
      const ow2 = r.loi?.osW2 || Math.round(lBal * 0.25);
      const ow3 = r.loi?.osW3 || Math.round(lBal * 0.25);
      const ow4 = r.loi?.osW4 || Math.max(0, lBal - (ow1 + ow2 + ow3));
      maxShiftOsW1 = Math.max(maxShiftOsW1, ow1);
      maxShiftOsW2 = Math.max(maxShiftOsW2, ow2);
      maxShiftOsW3 = Math.max(maxShiftOsW3, ow3);
      maxShiftOsW4 = Math.max(maxShiftOsW4, ow4);
    });

    // Calculate maximum daily totals in month
    Object.values(dailyGroups).forEach(group => {
      const dRec = group.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
      const nRec = group.find(r => r.shiftType === 'NIGHT');

      // Press Daily
      const pFinD = (dRec?.pressPowder?.finish?.shift || 0) + (nRec?.pressPowder?.finish?.shift || 0);
      const pRecvD = (dRec?.sampleReceived?.gc?.shift || 0) + (nRec?.sampleReceived?.gc?.shift || 0);
      const pBalD = Math.max(0, pRecvD - pFinD);
      maxDailyPressFin = Math.max(maxDailyPressFin, pFinD);
      maxDailyPressRecv = Math.max(maxDailyPressRecv, pRecvD);
      maxDailyPressBal = Math.max(maxDailyPressBal, pBalD);

      // Weighing Daily
      const wFinD = (dRec?.fuseBead?.finishShift || 0) + (nRec?.fuseBead?.finishShift || 0);
      const wRecvD = ((dRec?.sampleReceived?.exp?.shift || 0) + (dRec?.sampleReceived?.prod?.rc || 0) + (dRec?.sampleReceived?.smelter?.shift || 0)) +
                     ((nRec?.sampleReceived?.exp?.shift || 0) + (nRec?.sampleReceived?.prod?.rc || 0) + (nRec?.sampleReceived?.smelter?.shift || 0));
      const wBalD = group[group.length - 1]?.fuseBead?.balExp || Math.max(0, wRecvD - wFinD);
      maxDailyWeighFin = Math.max(maxDailyWeighFin, wFinD);
      maxDailyWeighRecv = Math.max(maxDailyWeighRecv, wRecvD);
      maxDailyWeighBal = Math.max(maxDailyWeighBal, wBalD);

      // Fusion Daily
      maxDailyFusionFin = Math.max(maxDailyFusionFin, wFinD);
      maxDailyFusionRecv = Math.max(maxDailyFusionRecv, wFinD);
      maxDailyFusionBal = Math.max(maxDailyFusionBal, wBalD);

      // LOI Daily
      const lFinD = (dRec?.loi?.finLoiShift || 0) + (nRec?.loi?.finLoiShift || 0);
      const lRecvD = (dRec?.sampleReceived?.exp?.shift || 0) + (nRec?.sampleReceived?.exp?.shift || 0);
      const lWeighD = (dRec?.loi?.weighing || dRec?.fuseBead?.finishShift || 0) + (nRec?.loi?.weighing || nRec?.fuseBead?.finishShift || 0);
      const lBalD = group[group.length - 1]?.loi?.bal || 0;
      maxDailyLoiFin = Math.max(maxDailyLoiFin, lFinD);
      maxDailyLoiRecv = Math.max(maxDailyLoiRecv, lRecvD);
      maxDailyLoiWeigh = Math.max(maxDailyLoiWeigh, lWeighD);
      maxDailyLoiBal = Math.max(maxDailyLoiBal, lBalD);

      // W1 - W4 Daily
      const w1D = (dRec?.loi?.w1 || dRec?.loi?.w2 || dRec?.loi?.finLoiShift || 0) + (nRec?.loi?.w1 || nRec?.loi?.w2 || nRec?.loi?.finLoiShift || 0);
      const w2D = (dRec?.loi?.w2 || 0) + (nRec?.loi?.w2 || 0);
      const w3D = (dRec?.loi?.w3 || dRec?.loi?.w5 || dRec?.loi?.w4 || 0) + (nRec?.loi?.w3 || nRec?.loi?.w5 || nRec?.loi?.w4 || 0);
      const w4D = (dRec?.loi?.w4 || 0) + (nRec?.loi?.w4 || 0);
      maxDailyW1 = Math.max(maxDailyW1, w1D);
      maxDailyW2 = Math.max(maxDailyW2, w2D);
      maxDailyW3 = Math.max(maxDailyW3, w3D);
      maxDailyW4 = Math.max(maxDailyW4, w4D);

      const ow1D = (dRec?.loi?.osW1 || Math.round((dRec?.loi?.bal || 0) * 0.3)) + (nRec?.loi?.osW1 || Math.round((nRec?.loi?.bal || 0) * 0.3));
      const ow2D = (dRec?.loi?.osW2 || Math.round((dRec?.loi?.bal || 0) * 0.25)) + (nRec?.loi?.osW2 || Math.round((nRec?.loi?.bal || 0) * 0.25));
      const ow3D = (dRec?.loi?.osW3 || Math.round((dRec?.loi?.bal || 0) * 0.25)) + (nRec?.loi?.osW3 || Math.round((nRec?.loi?.bal || 0) * 0.25));
      const ow4D = (dRec?.loi?.osW4 || 0) + (nRec?.loi?.osW4 || 0);
      maxDailyOsW1 = Math.max(maxDailyOsW1, ow1D);
      maxDailyOsW2 = Math.max(maxDailyOsW2, ow2D);
      maxDailyOsW3 = Math.max(maxDailyOsW3, ow3D);
      maxDailyOsW4 = Math.max(maxDailyOsW4, ow4D);
    });

    return {
      press: {
        maxShift: { fin: maxShiftPressFin || 1, recv: maxShiftPressRecv || 1, bal: maxShiftPressBal || 1 },
        maxDaily: { fin: maxDailyPressFin || 1, recv: maxDailyPressRecv || 1, bal: maxDailyPressBal || 1 }
      },
      weigh: {
        maxShift: { fin: maxShiftWeighFin || 1, recv: maxShiftWeighRecv || 1, bal: maxShiftWeighBal || 1 },
        maxDaily: { fin: maxDailyWeighFin || 1, recv: maxDailyWeighRecv || 1, bal: maxDailyWeighBal || 1 }
      },
      fusion: {
        maxShift: { fin: maxShiftFusionFin || 1, recv: maxShiftFusionRecv || 1, bal: maxShiftFusionBal || 1 },
        maxDaily: { fin: maxDailyFusionFin || 1, recv: maxDailyFusionRecv || 1, bal: maxDailyFusionBal || 1 }
      },
      loi: {
        maxShift: { fin: maxShiftLoiFin || 1, recv: maxShiftLoiRecv || 1, weigh: maxShiftLoiWeigh || 1, bal: maxShiftLoiBal || 1 },
        maxDaily: { fin: maxDailyLoiFin || 1, recv: maxDailyLoiRecv || 1, weigh: maxDailyLoiWeigh || 1, bal: maxDailyLoiBal || 1 }
      },
      loiFurnace: {
        maxShift: { w1: maxShiftW1 || 1, w2: maxShiftW2 || 1, w3: maxShiftW3 || 1, w4: maxShiftW4 || 1, os1: maxShiftOsW1 || 1, os2: maxShiftOsW2 || 1, os3: maxShiftOsW3 || 1, os4: maxShiftOsW4 || 1 },
        maxDaily: { w1: maxDailyW1 || 1, w2: maxDailyW2 || 1, w3: maxDailyW3 || 1, w4: maxDailyW4 || 1, os1: maxDailyOsW1 || 1, os2: maxDailyOsW2 || 1, os3: maxDailyOsW3 || 1, os4: maxDailyOsW4 || 1 }
      }
    };
  }, [activeMonthRecords]);

  // =========================================================================
  // HELPER COMPONENTS FOR AT-A-GLANCE MANAGEMENT INTELLIGENCE
  // =========================================================================

  // 1. Trend & D-1 Delta Badge
  const TrendDeltaBadge = ({
    current,
    prev,
    isInverse = false,
    unit = ''
  }: {
    current: number;
    prev?: number;
    isInverse?: boolean;
    unit?: string;
  }) => {
    if (prev === undefined || prev === null || prevDayRecords.length === 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium font-mono">
          Baseline D-1
        </span>
      );
    }
    const diff = current - prev;
    if (diff === 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold font-mono flex items-center gap-0.5">
          <Minus className="w-2.5 h-2.5" /> 0% vs D-1
        </span>
      );
    }

    const pct = prev > 0 ? Math.round((Math.abs(diff) / prev) * 100) : 100;
    const isPositive = diff > 0;
    const isGood = isInverse ? !isPositive : isPositive;

    const colorClass = isGood
      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';

    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold font-mono flex items-center gap-1 ${colorClass}`}>
        {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
        <span>{isPositive ? `+${formatNumber(diff)}` : formatNumber(diff)}{unit ? ` ${unit}` : ''} ({isPositive ? '+' : '-'}{pct}%) vs D-1</span>
      </span>
    );
  };

  // 2. Shift Load Distribution Ratio Bar
  const ShiftDistributionBar = ({
    dayVal,
    nightVal,
    dayLabel = 'Pagi',
    nightLabel = 'Malam'
  }: {
    dayVal: number;
    nightVal: number;
    dayLabel?: string;
    nightLabel?: string;
  }) => {
    const total = dayVal + nightVal;
    const dayPct = total > 0 ? Math.round((dayVal / total) * 100) : 50;
    const nightPct = total > 0 ? 100 - dayPct : 50;

    return (
      <div className="space-y-1 w-full pt-1">
        <div className="flex items-center justify-between text-[10px] font-semibold">
          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono">
            <Sun className="w-3 h-3 text-amber-500" /> {dayLabel}: {formatNumber(dayVal)} ({dayPct}%)
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-mono">
            <Moon className="w-3 h-3 text-indigo-500" /> {nightLabel}: {formatNumber(nightVal)} ({nightPct}%)
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
          <div 
            className="bg-amber-500 h-full transition-all duration-500" 
            style={{ width: `${dayPct}%` }}
            title={`Shift Pagi: ${dayPct}%`}
          />
          <div 
            className="bg-indigo-500 h-full transition-all duration-500" 
            style={{ width: `${nightPct}%` }}
            title={`Shift Malam: ${nightPct}%`}
          />
        </div>
      </div>
    );
  };

  // 7-Day Chronological History for Mini Trend Charts
  const history7Days = useMemo(() => {
    if (!records || records.length === 0) return [];

    const uniqueDates = Array.from(new Set(records.map(r => r.date))).sort((a, b) => {
      const pA = a.split('/').map(Number);
      const pB = b.split('/').map(Number);
      const tA = new Date(pA[2] || 2026, (pA[1] || 10) - 1, pA[0] || 1).getTime();
      const tB = new Date(pB[2] || 2026, (pB[1] || 10) - 1, pB[0] || 1).getTime();
      return tA - tB;
    });

    const currIdx = uniqueDates.indexOf(selectedDate);
    const targetSlice = currIdx >= 0
      ? uniqueDates.slice(Math.max(0, currIdx - 6), currIdx + 1)
      : uniqueDates.slice(-7);

    return targetSlice.map(d => {
      const dayRecs = records.filter(r => r.date === d);
      const dayS = dayRecs.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
      const nightS = dayRecs.find(r => r.shiftType === 'NIGHT');

      const mStaff = (dayS?.manpower?.staff?.shift || 0) + (nightS?.manpower?.staff?.shift || 0);
      const mCrew = (dayS?.manpower?.crew?.shift || 0) + (nightS?.manpower?.crew?.shift || 0);
      const mTotal = mStaff + mCrew;

      const intakeTotal = dayRecs.reduce((sum, r) => sum + (r.sampleReceived?.gc?.shift || 0) + (r.sampleReceived?.prod?.shift || 0) + (r.sampleReceived?.exp?.shift || 0) + (r.sampleReceived?.smelter?.shift || 0), 0);

      const prepFinished = dayRecs.reduce((sum, r) => sum + (r.pressPowder?.finish?.shift || 0) + (r.fuseBead?.finishShift || 0) + (r.loi?.finLoiShift || 0), 0);

      const xrfOutput = dayRecs.reduce((sum, r) => {
        const edSum = (r.edxrf?.epsC || 0) + (r.edxrf?.epsD || 0) + (r.edxrf?.epsE || 0) + (r.edxrf?.epsF || 0) + (r.edxrf?.epsG || 0) + (r.edxrf?.epsH || 0);
        const wdA = r.wdxrf?.zetiumA?.total || 0;
        const wdB = r.wdxrf?.zetiumB?.total || 0;
        return sum + edSum + wdA + wdB;
      }, 0);

      const coaReleased = dayRecs.reduce((sum, r) => sum + (r.report?.finishReportDay || 0), 0);

      const parts = d.split('/');
      const label = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : d;

      return {
        date: d,
        label,
        manpowerHadir: mTotal || 9,
        sampleIntake: intakeTotal || 0,
        prepFinished: prepFinished || 0,
        xrfOutput: xrfOutput || 0,
        coaReleased: coaReleased || 0,
      };
    });
  }, [records, selectedDate]);

  // Mini Trend Card for 5-7 days context (Clean Corporate Light Theme)
  const MiniTrendChartCard = ({
    title,
    unit = 'sampel',
    data,
    onClick,
    metricToday,
    deltaVal = 0,
    unitLabel = 'vs D-1'
  }: {
    title: string;
    unit?: string;
    data: { date: string; val: number; label: string }[];
    onClick: () => void;
    metricToday: number | string;
    deltaVal?: number;
    unitLabel?: string;
  }) => {
    const maxVal = Math.max(...data.map(d => d.val), 1);
    const isPositive = deltaVal >= 0;

    return (
      <div 
        onClick={onClick}
        className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-400 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {title}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black font-mono text-slate-900">
                {metricToday}
              </span>
              <span className="text-xs text-slate-500 font-medium">{unit}</span>
            </div>
          </div>
          {deltaVal !== 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 border ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? `+${deltaVal}` : deltaVal} {unitLabel}
            </span>
          )}
        </div>

        {/* 7-Day Mini Sparkline / Bar Chart */}
        <div className="pt-2">
          <div className="flex items-end justify-between gap-1.5 h-16 w-full px-1">
            {data.map((item, idx) => {
              const isToday = idx === data.length - 1;
              const heightPct = Math.max(12, Math.round((item.val / maxVal) * 100));
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-1 group/bar h-full justify-end">
                  <div className="relative w-full flex justify-center">
                    {/* Tooltip on hover */}
                    <span className="opacity-0 group-hover/bar:opacity-100 transition-opacity absolute -top-6 px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-mono pointer-events-none whitespace-nowrap z-10 shadow-xs">
                      {item.val} {unit}
                    </span>
                    <div 
                      className={`w-full max-w-[22px] rounded-t-md transition-all duration-300 ${
                        isToday 
                          ? 'bg-teal-500 group-hover:bg-teal-600 shadow-xs ring-1 ring-teal-400' 
                          : 'bg-slate-200 group-hover:bg-slate-300'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-mono ${isToday ? 'text-teal-700 font-bold' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Trigger */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-teal-600 group-hover:text-teal-700 font-bold">
          <span>Lihat Grafik Detail & Remarks</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    );
  };

  // Component Helper for Standardized 4-Pillar Card with Shift Breakdown
  const StandardProductivityCard = ({
    title,
    subtitle,
    balance,
    received,
    finished,
    outstanding,
    balanceDay,
    balanceNight,
    receivedDay,
    receivedNight,
    finishedDay,
    finishedNight,
    outstandingDay,
    outstandingNight,
    icon: Icon,
    color = 'teal',
    detailSnippet
  }: {
    title: string;
    subtitle: string;
    balance: number;
    received: number;
    finished: number;
    outstanding: number;
    balanceDay?: number;
    balanceNight?: number;
    receivedDay?: number;
    receivedNight?: number;
    finishedDay?: number;
    finishedNight?: number;
    outstandingDay?: number;
    outstandingNight?: number;
    icon: any;
    color?: string;
    detailSnippet?: React.ReactNode;
  }) => {
    const isBottleneck = outstanding > 200;
    return (
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-${color}-50 dark:bg-${color}-950/60 text-${color}-600 dark:text-${color}-400 border border-${color}-200/50`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{title}</h4>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          {isBottleneck ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Backlog Tinggi
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Normal
            </span>
          )}
        </div>

        {/* 4 Standardized Metric Pillars with Shift Sub-Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {/* 1. Balance Awal */}
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Balance</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
                {formatNumber(balance)}
              </span>
            </div>
            <div className="pt-1.5 mt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[8px] text-slate-400 block">Saldo Awal</span>
              {balanceDay !== undefined && (
                isLongShift ? (
                  <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 font-bold block">
                    LS: {formatNumber(balanceDay)}
                  </span>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-[9px] font-mono">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">D: {formatNumber(balanceDay)}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">N: {formatNumber(balanceNight || 0)}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* 2. Received */}
          <div className="p-2.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 block uppercase tracking-wider">Received</span>
              <span className="text-base sm:text-lg font-black font-mono text-sky-700 dark:text-sky-300 mt-0.5 block">
                +{formatNumber(received)}
              </span>
            </div>
            <div className="pt-1.5 mt-1 border-t border-sky-200/50 dark:border-sky-800/50">
              <span className="text-[8px] text-sky-500/70 block">Sampel Masuk</span>
              {receivedDay !== undefined && (
                isLongShift ? (
                  <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 font-bold block">
                    LS: +{formatNumber(receivedDay)}
                  </span>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-[9px] font-mono">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">D: +{formatNumber(receivedDay)}</span>
                    <span className="text-sky-300 dark:text-sky-700">•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">N: +{formatNumber(receivedNight || 0)}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* 3. Finished */}
          <div className="p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">Finished</span>
              <span className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                {formatNumber(finished)}
              </span>
            </div>
            <div className="pt-1.5 mt-1 border-t border-emerald-200/50 dark:border-emerald-800/50">
              <span className="text-[8px] text-emerald-500/70 block">Diselesaikan</span>
              {finishedDay !== undefined && (
                isLongShift ? (
                  <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 font-bold block">
                    LS: {formatNumber(finishedDay)}
                  </span>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-[9px] font-mono">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">D: {formatNumber(finishedDay)}</span>
                    <span className="text-emerald-300 dark:text-emerald-700">•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">N: {formatNumber(finishedNight || 0)}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* 4. Outstanding (Balance Akhir) */}
          <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${
            isBottleneck 
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50' 
              : 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40'
          }`}>
            <div>
              <span className={`text-[10px] font-semibold block uppercase tracking-wider ${isBottleneck ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'}`}>
                Outstanding
              </span>
              <span className={`text-base sm:text-lg font-black font-mono mt-0.5 block ${isBottleneck ? 'text-rose-700 dark:text-rose-300' : 'text-teal-700 dark:text-teal-300'}`}>
                {formatNumber(outstanding)}
              </span>
            </div>
            <div className={`pt-1.5 mt-1 border-t ${isBottleneck ? 'border-rose-200/50 dark:border-rose-900/40' : 'border-teal-200/50 dark:border-teal-800/50'}`}>
              <span className="text-[8px] text-slate-400 block">Sisa Saldo</span>
              {outstandingDay !== undefined && (
                isLongShift ? (
                  <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 font-bold block">
                    LS: {formatNumber(outstandingDay)}
                  </span>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-[9px] font-mono">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">D: {formatNumber(outstandingDay)}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">N: {formatNumber(outstandingNight || 0)}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Optional Detail Snippet */}
        {detailSnippet && (
          <div className="pt-2 text-xs text-slate-500">
            {detailSnippet}
          </div>
        )}
      </div>
    );
  };

  // Visual In-Bar Metric Component: Proporsional Volume terhadap Rekor Tertinggi Bulan Ini
  const InBarMetricCell = ({
    value,
    maxValue,
    prefix = '',
    unit = '',
    colorVariant = 'slate',
    isHighlightPeak = true
  }: {
    value: number;
    maxValue: number;
    prefix?: string;
    unit?: string;
    colorVariant?: 'slate' | 'sky' | 'emerald' | 'amber' | 'indigo' | 'purple' | 'rose';
    isHighlightPeak?: boolean;
  }) => {
    const safeMax = Math.max(1, maxValue, value);
    const pct = safeMax > 0 ? Math.min(100, Math.round((value / safeMax) * 100)) : 0;
    const isFullBar = value > 0 && value >= maxValue;

    const variantStyles = {
      slate: {
        bar: isFullBar 
          ? 'bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-500' 
          : 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600',
        text: 'text-slate-800 dark:text-slate-100',
        sub: 'text-slate-500 dark:text-slate-400'
      },
      sky: {
        bar: isFullBar 
          ? 'bg-gradient-to-r from-sky-400 to-cyan-500 shadow-xs' 
          : 'bg-gradient-to-r from-sky-200 to-sky-300 dark:from-sky-900/70 dark:to-sky-700/70',
        text: isFullBar ? 'text-sky-950 dark:text-white' : 'text-sky-900 dark:text-sky-200',
        sub: 'text-sky-600 dark:text-sky-400'
      },
      emerald: {
        bar: isFullBar 
          ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-xs' 
          : 'bg-gradient-to-r from-emerald-200 to-emerald-300 dark:from-emerald-900/70 dark:to-emerald-700/70',
        text: isFullBar ? 'text-emerald-950 dark:text-white' : 'text-emerald-900 dark:text-emerald-200',
        sub: 'text-emerald-600 dark:text-emerald-400'
      },
      amber: {
        bar: isFullBar 
          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-xs' 
          : 'bg-gradient-to-r from-amber-200 to-amber-300 dark:from-amber-900/70 dark:to-amber-700/70',
        text: isFullBar ? 'text-amber-950 dark:text-white' : 'text-amber-900 dark:text-amber-200',
        sub: 'text-amber-600 dark:text-amber-400'
      },
      indigo: {
        bar: isFullBar 
          ? 'bg-gradient-to-r from-indigo-400 to-blue-500 shadow-xs' 
          : 'bg-gradient-to-r from-indigo-200 to-indigo-300 dark:from-indigo-900/70 dark:to-indigo-700/70',
        text: isFullBar ? 'text-indigo-950 dark:text-white' : 'text-indigo-900 dark:text-indigo-200',
        sub: 'text-indigo-600 dark:text-indigo-400'
      },
      purple: {
        bar: isFullBar 
          ? 'bg-gradient-to-r from-purple-400 to-fuchsia-500 shadow-xs' 
          : 'bg-gradient-to-r from-purple-200 to-purple-300 dark:from-purple-900/70 dark:to-purple-700/70',
        text: isFullBar ? 'text-purple-950 dark:text-white' : 'text-purple-900 dark:text-purple-200',
        sub: 'text-purple-600 dark:text-purple-400'
      },
      rose: {
        bar: isFullBar 
          ? 'bg-gradient-to-r from-rose-400 to-red-500 shadow-xs' 
          : 'bg-gradient-to-r from-rose-200 to-rose-300 dark:from-rose-900/70 dark:to-rose-700/70',
        text: isFullBar ? 'text-rose-950 dark:text-white' : 'text-rose-900 dark:text-rose-200',
        sub: 'text-rose-600 dark:text-rose-400'
      }
    };

    const currentTheme = variantStyles[colorVariant] || variantStyles.slate;

    return (
      <div className="relative w-full h-8 sm:h-9 rounded-xl overflow-hidden bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 flex items-center shadow-inner group">
        {/* Background Volume Fill Bar */}
        <div 
          style={{ width: `${Math.max(0, pct)}%` }} 
          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-lg ${currentTheme.bar}`}
        />

        {/* Numerical & Label Overlay */}
        <div className="relative z-10 flex items-center justify-between w-full px-2.5 sm:px-3 text-xs">
          <div className="flex items-center gap-1.5 font-mono">
            <span className={`font-black text-xs sm:text-sm ${currentTheme.text} drop-shadow-xs`}>
              {prefix}{formatNumber(value)}
            </span>
            {unit && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-medium">{unit}</span>}
          </div>

          <div className="flex items-center gap-1 font-mono">
            {isFullBar && isHighlightPeak ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-amber-950 shadow-xs flex items-center gap-0.5 ring-1 ring-amber-300">
                Rekor Bulan Ini
              </span>
            ) : (
              <span className={`text-[10px] font-bold ${currentTheme.sub}`}>
                {pct}% bln
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const steps = [
    { num: 1, title: 'Manpower & SDM', desc: 'Kehadiran Staff & Crew', icon: Users },
    { num: 2, title: 'Sample Received', desc: 'GC, Prod, Exp, Smelter', icon: Layers },
    { num: 3, title: 'Productivity', desc: 'Metode Press Pellet, Fusion, LOI', icon: Flame },
    { num: 4, title: 'Instrumen ED & WD', desc: '6 EDXRF + 2 WDXRF Zetium', icon: Cpu },
    { num: 5, title: 'QC & Pelaporan', desc: 'Kontrol Mutu & Rilis CoA', icon: FileCheck },
  ];

  return (
    <div className="space-y-6">
      
      {/* STEP PROGRESSION BAR */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                Alur Presentasi Terstruktur
              </span>
              <span className="text-xs text-slate-400">• Tanggal {selectedDate}</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
              Rapat Harian Laboratorium (Storyline Runtun)
            </h3>
          </div>

          {/* Prev / Next & View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllSections(!showAllSections)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showAllSections 
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {showAllSections ? 'Mode Slide Berurutan' : 'Lihat Semua 5 Babak Sekaligus'}
            </button>

            {!showAllSections && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  disabled={currentStep === 1}
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  title="Kembali ke langkah sebelumnya (Panah Kiri)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold px-2 text-slate-700 dark:text-slate-200">
                  {currentStep} / 5
                </span>
                <button
                  disabled={currentStep === 5}
                  onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  title="Lanjut ke langkah berikutnya (Panah Kanan)"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 5 Step Indicator Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {steps.map(s => {
            const Icon = s.icon;
            const isActive = currentStep === s.num && !showAllSections;
            const isCompleted = currentStep > s.num && !showAllSections;
            return (
              <button
                key={s.num}
                onClick={() => {
                  setCurrentStep(s.num);
                  setShowAllSections(false);
                }}
                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20'
                    : isCompleted
                    ? 'bg-teal-50/60 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className={`p-1.5 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {s.num}. {s.title}
                  </div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                    {s.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MANPOWER & KESIAPAN SDM */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 1) && (
        <div className="space-y-4">
          {/* Header Ringkas */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">1</span>
                <span>Kesiapan Manpower Laboratorium</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Hadir Hari Ini: <strong className="text-teal-600 dark:text-teal-400 font-mono text-sm">{staffPagi.length + crewPagi.length + staffMalam.length + crewMalam.length + totalAssistanceCount}</strong> Personil
                {' '}(Shift D: <strong className="text-amber-600 font-mono">{staffPagi.length + crewPagi.length + assistancePagiCount}</strong> • Shift N: <strong className="text-indigo-600 font-mono">{staffMalam.length + crewMalam.length + assistanceMalamCount}</strong>)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowChart1(!showChart1)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showChart1 
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{showChart1 ? 'Tutup Tren Periodik' : 'Tren Periodik (Week/Month)'}</span>
              </button>
            </div>
          </div>

          {showChart1 && <ManpowerTrendChart records={records} />}

          {/* ========================================================================= */}
          {/* 1. KOMPARASI SHIFT: JUMLAH STAFF & CREW PER SHIFT (PAGI VS MALAM) */}
          {/* ========================================================================= */}
          {isLongShift ? (
            /* ========================================================================= */
            /* SINGLE CARD HARI LONG SHIFT (MINGGU) - DILAKUKAN OLEH SHIFT PAGI */
            /* ========================================================================= */
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">Long Shift (LS)</h4>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase">
                        Hari Minggu
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
                        {dayShift?.regu ? `Shift ${dayShift.regu}` : 'Shift Pagi'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      07:00 - 24:00 WITA • Dilakukan oleh Shift Pagi ({dayShift?.regu ? `Shift ${dayShift.regu}` : 'Shift Pagi'})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black font-mono text-teal-600 dark:text-teal-400">
                    {staffPagi.length + crewPagi.length + assistancePagiCount} <span className="text-xs font-normal text-slate-400">Org</span>
                  </div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold">Total Hadir Long Shift</span>
                </div>
              </div>

              {/* Breakdown Staff & Crew (Hadir vs Cuti) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Staff Long Shift</span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      {staffCutiPagi.length} Cuti
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-indigo-900 dark:text-indigo-200">
                    {staffPagi.length} <span className="text-xs font-medium text-slate-500">Hadir</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <Users className="w-3.5 h-3.5" />
                      <span>Crew Long Shift</span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      {crewCutiPagi.length} Cuti
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-200">
                    {crewPagi.length} <span className="text-xs font-medium text-slate-500">Hadir</span>
                  </div>
                </div>
              </div>

              {/* Status Rekap Tidak Hadir Long Shift */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Rekap Tidak Hadir:</span>
                <div className="flex items-center gap-1.5 flex-wrap font-mono font-bold text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    {cutiPagi.length} Cuti
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                    {sakitPagi.length} Sakit
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100/80 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                    {izinPagi.length} Izin
                  </span>
                  {alpaPagi.length > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                      {alpaPagi.length} Alpa
                    </span>
                  )}
                </div>
              </div>

              {/* List Detail Personil Tidak Hadir (Cuti, Sakit, Izin, Alpa) Long Shift */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Daftar Personil Tidak Hadir ({kendalaPagi.length} Orang):</span>
                  {kendalaPagi.length === 0 && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Hadir Lengkap</span>
                  )}
                </div>

                {kendalaPagi.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Seluruh staff dan crew Long Shift hadir bertugas lengkap (Nihil cuti, sakit, izin, atau alpa).
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {kendalaPagi.map(p => (
                      <div key={p.nik} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.badgeColor}`}>
                            {p.keterangan}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{p.jabatan} • <strong className="uppercase">{p.roleCategory}</strong></span>
                          <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{formatShiftName(p.regu)}</span>
                        </div>
                        {p.tglMasukKembali && (
                          <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                            <span>Masuk kembali:</span>
                            <strong className="font-mono font-bold text-amber-900 dark:text-amber-200">{p.tglMasukKembali}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ratio Bar Staff vs Crew */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Staff: {staffPagi.length} org ({Math.round((staffPagi.length / Math.max(1, staffPagi.length + crewPagi.length)) * 100)}%)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Crew: {crewPagi.length} org ({Math.round((crewPagi.length / Math.max(1, staffPagi.length + crewPagi.length)) * 100)}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div 
                    style={{ width: `${(staffPagi.length / Math.max(1, staffPagi.length + crewPagi.length)) * 100}%` }}
                    className="h-full bg-indigo-500 transition-all"
                  />
                  <div 
                    style={{ width: `${(crewPagi.length / Math.max(1, staffPagi.length + crewPagi.length)) * 100}%` }}
                    className="h-full bg-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* KOMPARASI 2 SHIFT REGULAR: PAGI (07:00 - 19:00) VS MALAM (19:00 - 07:00) */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shift Pagi */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-teal-200/80 dark:border-teal-900/40 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Shift Pagi (Day Shift)</h4>
                      <span className="text-[11px] text-slate-400">07:00 - 19:00 WITA</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
                      {staffPagi.length + crewPagi.length + assistancePagiCount} <span className="text-xs font-normal text-slate-400">Org</span>
                    </div>
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold">Total Hadir Dinas Pagi</span>
                  </div>
                </div>

                {/* Breakdown Staff & Crew (Hadir vs Cuti) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Staff Pagi</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        {staffCutiPagi.length} Cuti
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-indigo-900 dark:text-indigo-200">
                      {staffPagi.length} <span className="text-xs font-medium text-slate-500">Hadir</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <Users className="w-3.5 h-3.5" />
                        <span>Crew Pagi</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        {crewCutiPagi.length} Cuti
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-200">
                      {crewPagi.length} <span className="text-xs font-medium text-slate-500">Hadir</span>
                    </div>
                  </div>
                </div>

                {/* Status Rekap Tidak Hadir Shift Pagi */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Rekap Tidak Hadir:</span>
                  <div className="flex items-center gap-1.5 flex-wrap font-mono font-bold text-[11px]">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      {cutiPagi.length} Cuti
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                      {sakitPagi.length} Sakit
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-100/80 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                      {izinPagi.length} Izin
                    </span>
                    {alpaPagi.length > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                        {alpaPagi.length} Alpa
                      </span>
                    )}
                  </div>
                </div>

                {/* List Detail Personil Tidak Hadir (Cuti, Sakit, Izin, Alpa) Shift Pagi */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Daftar Personil Tidak Hadir ({kendalaPagi.length} Orang):</span>
                    {kendalaPagi.length === 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Hadir Lengkap</span>
                    )}
                  </div>

                  {kendalaPagi.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      Seluruh staff dan crew shift pagi hadir bertugas lengkap (Nihil cuti, sakit, izin, atau alpa).
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {kendalaPagi.map(p => (
                        <div key={p.nik} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.badgeColor}`}>
                              {p.keterangan}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{p.jabatan} • <strong className="uppercase">{p.roleCategory}</strong></span>
                            <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{formatShiftName(p.regu)}</span>
                          </div>
                          {p.tglMasukKembali && (
                            <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                              <span>Masuk kembali:</span>
                              <strong className="font-mono font-bold text-amber-900 dark:text-amber-200">{p.tglMasukKembali}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ratio Bar Staff vs Crew */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">Staff: {staffPagi.length} org ({Math.round((staffPagi.length / Math.max(1, staffPagi.length + crewPagi.length)) * 100)}%)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Crew: {crewPagi.length} org ({Math.round((crewPagi.length / Math.max(1, staffPagi.length + crewPagi.length)) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div 
                      style={{ width: `${(staffPagi.length / Math.max(1, staffPagi.length + crewPagi.length)) * 100}%` }}
                      className="h-full bg-indigo-500 transition-all"
                    />
                    <div 
                      style={{ width: `${(crewPagi.length / Math.max(1, staffPagi.length + crewPagi.length)) * 100}%` }}
                      className="h-full bg-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Shift Malam */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Shift Malam (Night Shift)</h4>
                      <span className="text-[11px] text-slate-400">19:00 - 07:00 WITA</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {staffMalam.length + crewMalam.length + assistanceMalamCount} <span className="text-xs font-normal text-slate-400">Org</span>
                    </div>
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">Total Hadir Dinas Malam</span>
                  </div>
                </div>

                {/* Breakdown Staff & Crew (Hadir vs Cuti) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Staff Malam</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        {staffCutiMalam.length} Cuti
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-indigo-900 dark:text-indigo-200">
                      {staffMalam.length} <span className="text-xs font-medium text-slate-500">Hadir</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <Users className="w-3.5 h-3.5" />
                        <span>Crew Malam</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        {crewCutiMalam.length} Cuti
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-200">
                      {crewMalam.length} <span className="text-xs font-medium text-slate-500">Hadir</span>
                    </div>
                  </div>
                </div>

                {/* Status Rekap Tidak Hadir Shift Malam */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Rekap Tidak Hadir:</span>
                  <div className="flex items-center gap-1.5 flex-wrap font-mono font-bold text-[11px]">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      {cutiMalam.length} Cuti
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                      {sakitMalam.length} Sakit
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-100/80 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                      {izinMalam.length} Izin
                    </span>
                    {alpaMalam.length > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                        {alpaMalam.length} Alpa
                      </span>
                    )}
                  </div>
                </div>

                {/* List Detail Personil Tidak Hadir (Cuti, Sakit, Izin, Alpa) Shift Malam */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Daftar Personil Tidak Hadir ({kendalaMalam.length} Orang):</span>
                    {kendalaMalam.length === 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Hadir Lengkap</span>
                    )}
                  </div>

                  {kendalaMalam.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      Seluruh staff dan crew shift malam hadir bertugas lengkap (Nihil cuti, sakit, izin, atau alpa).
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {kendalaMalam.map(p => (
                        <div key={p.nik} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.badgeColor}`}>
                              {p.keterangan}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{p.jabatan} • <strong className="uppercase">{p.roleCategory}</strong></span>
                            <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{formatShiftName(p.regu)}</span>
                          </div>
                          {p.tglMasukKembali && (
                            <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                              <span>Masuk kembali:</span>
                              <strong className="font-mono font-bold text-amber-900 dark:text-amber-200">{p.tglMasukKembali}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ratio Bar Staff vs Crew */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">Staff: {staffMalam.length} org ({Math.round((staffMalam.length / Math.max(1, staffMalam.length + crewMalam.length)) * 100)}%)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Crew: {crewMalam.length} org ({Math.round((crewMalam.length / Math.max(1, staffMalam.length + crewMalam.length)) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div 
                      style={{ width: `${(staffMalam.length / Math.max(1, staffMalam.length + crewMalam.length)) * 100}%` }}
                      className="h-full bg-indigo-500 transition-all"
                    />
                    <div 
                      style={{ width: `${(crewMalam.length / Math.max(1, staffMalam.length + crewMalam.length)) * 100}%` }}
                      className="h-full bg-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* ========================================================================= */}
          {/* 3. STATUS PERBANTUAN DARI SECTION LAIN */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Perbantuan dari Section Lain ({totalAssistanceCount} Personil)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Kru perbantuan lintas divisi (misal: Section Preparation / Sample House)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAssistanceInput(!showAssistanceInput)}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAssistanceInput ? 'Tutup Form' : 'Tambah Perbantuan'}</span>
              </button>
            </div>

            {/* Form Input Perbantuan dengan Datalist Autofill */}
            {showAssistanceInput && (
              <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">
                  Pilih nama atau ketik NIK personil non-laboratorium dari roster:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      list="perbantuan-candidates-list"
                      type="text"
                      value={assistanceSearch}
                      onChange={e => setAssistanceSearch(e.target.value)}
                      placeholder="Ketik NIK atau nama personil dari seksi lain..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                    <datalist id="perbantuan-candidates-list">
                      {nonLabCandidates.map((c: any) => (
                        <option 
                          key={c.nik} 
                          value={`${c.nik} - ${c.name || c.nama} (${c.section || c.department || 'Seksi Lain'})`} 
                        />
                      ))}
                    </datalist>
                  </div>

                  <select
                    value={assistanceShift}
                    onChange={e => setAssistanceShift(e.target.value as 'pagi' | 'malam')}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {isLongShift ? (
                      <option value="pagi">Long Shift (07:00 - 24:00 WITA)</option>
                    ) : (
                      <>
                        <option value="pagi">Shift Pagi (07:00 - 19:00 WITA)</option>
                        <option value="malam">Shift Malam (19:00 - 07:00 WITA)</option>
                      </>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleAddAssistance(assistanceSearch, assistanceShift)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {/* List Personil Perbantuan Aktif */}
            {assistanceList.length === 0 ? (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-400 italic">
                Tidak ada personil perbantuan dari seksi lain hari ini (Nihil).
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assistanceList.map(item => (
                  <div
                    key={item.nik}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 flex items-center gap-2 shadow-2xs"
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900">
                      {item.fromSection}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({item.shift === 'pagi' ? 'Pagi' : 'Malam'})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssistance(item.nik)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                      title="Hapus perbantuan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 4. CATATAN OPERASIONAL MANPOWER */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Catatan Operasional Manpower
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Catatan kehadiran personil, mutasi shift, atau rotasi khusus pada tanggal {selectedDate}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveManpowerNotes}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Catatan</span>
              </button>
            </div>

            <textarea
              rows={2}
              value={manpowerNotes}
              onChange={e => setManpowerNotes(e.target.value)}
              placeholder="Tuliskan catatan kehadiran personil lab atau perbantuan khusus..."
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
            />
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SAMPLE RECEIVED PER SECTION & PER SHIFT */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 2) && (
        <div className="space-y-4">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">2</span>
                Sample Received Per Section (Penerimaan Sampel Masuk)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Masuk Hari Ini: <strong className="text-blue-600 dark:text-blue-400 font-mono text-sm">{formatNumber(totalReceivedShift)}</strong> sampel • 
                {isLongShift ? (
                  <span className="text-amber-700 dark:text-amber-400 font-mono font-bold ml-1">Long Shift LS (07:00 - 24:00 WITA): {formatNumber(totalDayShift)} spl (Shift Pagi)</span>
                ) : (
                  <>
                    <span className="text-teal-600 dark:text-teal-400 font-mono font-bold ml-1">Shift D (07:00 - 19:00): {formatNumber(totalDayShift)}</span> • 
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold ml-1">Shift N (19:00 - 07:00): {formatNumber(totalNightShift)}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowChart2(!showChart2)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showChart2 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{showChart2 ? 'Tutup Tren 7 Hari' : 'Tren 7 Hari'}</span>
              </button>
            </div>
          </div>

          {showChart2 && <SampleReceivedTrendChart records={records} />}

          {/* ========================================================================= */}
          {/* VISUAL BAR CHART: KOMPARASI PENERIMAAN SAMPEL SHIFT PAGI VS MALAM */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {isLongShift 
                      ? 'Visualisasi Sampel Masuk Tiap Kategori (Long Shift: 07:00 - 24:00 WITA)' 
                      : 'Visualisasi Sampel Masuk Tiap Kategori (Shift Pagi vs Malam)'}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {isLongShift 
                      ? 'Volume penerimaan sampel operasional Long Shift oleh Shift Pagi' 
                      : 'Perbandingan langsung volume penerimaan antar shift operasional (Pagi: 07:00 - 19:00 vs Malam: 19:00 - 07:00)'}
                  </span>
                </div>
              </div>

              {isLongShift ? (
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
                    <span className="w-3 h-3 rounded-md bg-amber-500" />
                    Long Shift (07:00 - 24:00 WITA) • {formatNumber(totalDayShift)} spl (Shift Pagi)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                    <span className="w-3 h-3 rounded-md bg-teal-500" />
                    Shift Pagi ({formatNumber(totalDayShift)} spl)
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                    <span className="w-3 h-3 rounded-md bg-indigo-500" />
                    Shift Malam ({formatNumber(totalNightShift)} spl)
                  </span>
                </div>
              )}
            </div>

            {/* Recharts Grouped Bar Chart */}
            <div className="w-full h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Grade Control', pagi: gcDayShift, malam: gcNightShift, total: gcShift, rc: 0, ra: 0 },
                    { name: 'Production', pagi: prodDayShift, malam: prodNightShift, total: prodShift, rc: prodRc, ra: prodRaTotal },
                    { name: 'Exploration', pagi: expDayShift, malam: expNightShift, total: expShift, rc: 0, ra: 0 },
                    { name: 'Smelter', pagi: smelterDayShift, malam: smelterNightShift, total: smelterShift, rc: 0, ra: 0 },
                    ...(totalGtsReceived > 0 ? [{ name: 'PT GTS (Sister)', pagi: gtsDayShift, malam: gtsNightShift, total: totalGtsReceived, rc: 0, ra: 0 }] : [])
                  ]}
                  margin={{ top: 25, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis 
                    dataKey="name" 
                    tick={({ x, y, payload }) => {
                      const sampleTotalsMap: Record<string, number> = {
                        'Grade Control': gcShift,
                        'Production': prodShift,
                        'Exploration': expShift,
                        'Smelter': smelterShift,
                        'PT GTS (Sister)': totalGtsReceived
                      };
                      const totalVal = sampleTotalsMap[payload.value] || 0;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={12} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>
                            {payload.value}
                          </text>
                          <text x={0} y={0} dy={26} textAnchor="middle" fill="#0f172a" fontSize={11} fontWeight={800} fontFamily="monospace" className="dark:fill-slate-100">
                            {formatNumber(totalVal)}
                          </text>
                        </g>
                      );
                    }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    interval={0}
                    height={46}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0]?.payload;
                      return (
                        <div className="p-3 rounded-2xl bg-slate-900/95 text-white shadow-xl text-xs space-y-1.5 border border-slate-700 backdrop-blur-md">
                          <div className="font-bold border-b border-slate-700 pb-1 text-slate-200">
                            {label}
                          </div>
                          {isLongShift ? (
                            <div className="flex items-center justify-between gap-4 text-amber-300">
                              <span>Long Shift LS (07:00 - 24:00 WITA):</span>
                              <span className="font-mono font-bold">{formatNumber(data?.pagi || 0)} spl (Shift Pagi)</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-4 text-teal-300">
                                <span>Shift D (07:00 - 19:00):</span>
                                <span className="font-mono font-bold">{formatNumber(data?.pagi || 0)} spl</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-indigo-300">
                                <span>Shift N (19:00 - 07:00):</span>
                                <span className="font-mono font-bold">{formatNumber(data?.malam || 0)} spl</span>
                              </div>
                            </>
                          )}
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-700 font-bold text-white">
                            <span>Total Masuk:</span>
                            <span className="font-mono">{formatNumber(data?.total || 0)} spl</span>
                          </div>
                          {(data?.rc > 0 || data?.ra > 0) && (
                            <div className="pt-1 border-t border-amber-500/30 text-amber-300 text-[10px]">
                              {data.rc > 0 && <span>• RC: {data.rc} spl </span>}
                              {data.ra > 0 && <span>• RA: {data.ra} spl</span>}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="pagi" 
                    name={isLongShift ? "Long Shift (07:00 - 24:00 WITA)" : "Shift Pagi (07:00 - 19:00)"} 
                    fill={isLongShift ? "#d97706" : "#0d9488"} 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={isLongShift ? 55 : 45}
                  >
                    <LabelList 
                      dataKey="pagi" 
                      position="top" 
                      formatter={(val: any) => (Number(val) > 0 ? formatNumber(Number(val)) : '')}
                      style={{ fill: isLongShift ? '#d97706' : '#0d9488', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' }} 
                      offset={6}
                    />
                  </Bar>
                  {!isLongShift && (
                    <Bar dataKey="malam" name="Shift Malam (19:00 - 07:00)" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList 
                        dataKey="malam" 
                        position="top" 
                        formatter={(val: any) => (Number(val) > 0 ? formatNumber(Number(val)) : '')}
                        style={{ fill: '#4f46e5', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' }} 
                        offset={6}
                      />
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STATUS CALLOUT: ADANYA SAMPEL RE-ASSAY (RA) & RE-CHECK (RC) */}
          {/* ========================================================================= */}
          <div className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-3 ${
            prodRc > 0 || prodRaTotal > 0
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
              : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-2xl ${
                prodRc > 0 || prodRaTotal > 0
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                  : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
              }`}>
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Status Re-Assay (RA) & Re-Check (RC)
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    prodRc > 0 || prodRaTotal > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  }`}>
                    {prodRc > 0 || prodRaTotal > 0 ? 'Ada RA / RC Aktif' : 'Nihil / Zero RA-RC'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {prodRc > 0 || prodRaTotal > 0 ? (
                    isLongShift ? (
                      <>
                        Terdeteksi pada kategori <strong>Production</strong>: <strong className="text-amber-700 dark:text-amber-300 font-mono">{prodRc} RC</strong> & <strong className="text-sky-700 dark:text-sky-300 font-mono">{prodRaTotal} RA</strong> pada <strong>Long Shift (07:00 - 24:00 WITA)</strong>. Kategori lain Nihil.
                      </>
                    ) : (
                      <>
                        Terdeteksi pada kategori <strong>Production</strong>: <strong className="text-amber-700 dark:text-amber-300 font-mono">{prodRc} RC</strong> (Pagi: {prodRcDay}, Malam: {prodRcNight}) & <strong className="text-sky-700 dark:text-sky-300 font-mono">{prodRaTotal} RA</strong> (Pagi: {prodRaDay}, Malam: {prodRaNight}). Kategori lain Nihil.
                      </>
                    )
                  ) : (
                    'Seluruh kategori sampel (Grade Control, Production, Exploration, Smelter) berstatus regular tanpa adanya sampel RA maupun RC.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                Total RC: <strong className={prodRc > 0 ? "text-amber-600 font-black" : "text-slate-400"}>{prodRc}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                Total RA: <strong className={prodRaTotal > 0 ? "text-sky-600 font-black" : "text-slate-400"}>{prodRaTotal}</strong>
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABEL MATRIKS RINGKAS: JUMLAH TIAP JENIS SAMPEL, BREAKDOWN SHIFT & STATUS RA/RC */}
          {/* HARI LONG SHIFT HANYA MEMUNCULKAN 1 TABEL RINGKAS (VOLUME LONG SHIFT PAGI) */}
          {/* ========================================================================= */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Jenis Sampel</th>
                  {isLongShift ? (
                    <th className="py-3 px-4 text-center">Volume Long Shift (LS - 07:00 - 24:00 WITA)</th>
                  ) : (
                    <>
                      <th className="py-3 px-4 text-center">Shift D (07:00 - 19:00)</th>
                      <th className="py-3 px-4 text-center">Shift N (19:00 - 07:00)</th>
                      <th className="py-3 px-4 text-center">Total Masuk</th>
                    </>
                  )}
                  <th className="py-3 px-4 text-center">Status RA / RC</th>
                  <th className="py-3 px-4 text-right">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {/* 1. Grade Control */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span>Grade Control (GC)</span>
                  </td>
                  {isLongShift ? (
                    <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                      {formatNumber(gcShift)}
                    </td>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatNumber(gcDayShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatNumber(gcNightShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                        {formatNumber(gcShift)}
                      </td>
                    </>
                  )}
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                      Regular (0 RA / 0 RC)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500 font-medium">
                    {totalReceivedShift > 0 ? `${Math.round((gcShift / totalReceivedShift) * 100)}%` : '0%'}
                  </td>
                </tr>

                {/* 2. Production */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Production (PROD)</span>
                  </td>
                  {isLongShift ? (
                    <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                      {formatNumber(prodShift)}
                    </td>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatNumber(prodDayShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatNumber(prodNightShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                        {formatNumber(prodShift)}
                      </td>
                    </>
                  )}
                  <td className="py-3 px-4 text-center">
                    {prodRc > 0 || prodRaTotal > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        {prodRc > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                            {prodRc} RC
                          </span>
                        )}
                        {prodRaTotal > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono">
                            {prodRaTotal} RA
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                        Regular (0 RA / 0 RC)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500 font-medium">
                    {totalReceivedShift > 0 ? `${Math.round((prodShift / totalReceivedShift) * 100)}%` : '0%'}
                  </td>
                </tr>

                {/* 3. Exploration */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Exploration (EXP)</span>
                  </td>
                  {isLongShift ? (
                    <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                      {formatNumber(expShift)}
                    </td>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatNumber(expDayShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatNumber(expNightShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                        {formatNumber(expShift)}
                      </td>
                    </>
                  )}
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                      Regular (0 RA / 0 RC)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500 font-medium">
                    {totalReceivedShift > 0 ? `${Math.round((expShift / totalReceivedShift) * 100)}%` : '0%'}
                  </td>
                </tr>

                {/* 4. Smelter */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Smelter</span>
                  </td>
                  {isLongShift ? (
                    <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                      {formatNumber(smelterShift)}
                    </td>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatNumber(smelterDayShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatNumber(smelterNightShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                        {formatNumber(smelterShift)}
                      </td>
                    </>
                  )}
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                      Regular (0 RA / 0 RC)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500 font-medium">
                    {totalReceivedShift > 0 ? `${Math.round((smelterShift / totalReceivedShift) * 100)}%` : '0%'}
                  </td>
                </tr>

                {/* 5. PT GTS Sister Site (Jika ada sampel) */}
                {totalGtsReceived > 0 && (
                  <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors bg-purple-50/30 dark:bg-purple-950/10">
                    <td className="py-3 px-4 font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      <span>PT GTS (Sister Site)</span>
                    </td>
                    {isLongShift ? (
                      <td className="py-3 px-4 text-center font-mono font-black text-purple-900 dark:text-purple-200 text-sm">
                        {formatNumber(totalGtsReceived)}
                      </td>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatNumber(gtsDayShift)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatNumber(gtsNightShift)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-purple-900 dark:text-purple-200 text-sm">
                          {formatNumber(totalGtsReceived)}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Entitas Terpisah
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 font-medium">
                      Mandiri
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                  <td className="py-3 px-4 text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    {isLongShift ? 'Total Penerimaan Long Shift (TBP/GPS)' : 'Total Penerimaan (TBP/GPS)'}
                  </td>
                  {isLongShift ? (
                    <td className="py-3 px-4 text-center font-mono text-teal-700 dark:text-teal-400 text-base font-black">
                      {formatNumber(totalReceivedShift)}
                    </td>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-center font-mono text-teal-700 dark:text-teal-400 font-black">
                        {formatNumber(totalDayShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-indigo-700 dark:text-indigo-400 font-black">
                        {formatNumber(totalNightShift)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-blue-700 dark:text-blue-300 text-base font-black">
                        {formatNumber(totalReceivedShift)}
                      </td>
                    </>
                  )}
                  <td className="py-3 px-4 text-center text-[10px] text-slate-500">
                    {prodRc > 0 || prodRaTotal > 0 ? `${prodRc} RC • ${prodRaTotal} RA` : '100% Regular'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PRODUCTIVITY (3 GARIS BESAR OPERASIONAL) */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 3) && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                Productivity
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                3 Garis Besar: Metode Press Pellet (Sample GC) • Fusion (Exploration, Production, Smelter) • LOI (Exploration)
              </span>
            </div>

            <button
              onClick={() => setShowChart3(!showChart3)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showChart3 
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart3 ? 'Tutup Grafik' : 'Grafik Tren Productivity'}</span>
            </button>
          </div>

          {showChart3 && <ProductivityPrepTrendChart records={records} />}

          {/* ========================================================================= */}
          {/* 1. METODE PRESS PELLET (SAMPLE GC) */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 uppercase tracking-wider">
                      Metode Press Pellet (Sample GC)
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {pressBal === 0 ? 'Lancar (0 Outstanding)' : `${pressBal} Outstanding`}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                    1. Metode Press Pellet (Sample GC) — Press Stasiun
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pencetakan pelet serbuk terkompresi khusus sampel Grade Control (GC) untuk analisis cepat instrumen EDXRF.
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono text-right bg-sky-50/60 dark:bg-sky-950/30 px-3 py-1.5 rounded-xl border border-sky-200/60 dark:border-sky-900/50">
                <span className="text-[10px] text-slate-400 block font-sans">Total Output Pelet Hari Ini</span>
                <strong className="text-base sm:text-lg font-black text-sky-900 dark:text-sky-300">{formatNumber(pressFin)} pelet</strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  {isLongShift ? `LS: ${pressFinDay}` : `D: ${pressFinDay} • N: ${pressFinNight}`}
                </span>
              </div>
            </div>

            {/* TABEL 1: METODE PRESS PELLET (SAMPLE GC) */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3.5 w-44">Pilar Operasional</th>
                    <th className="py-2.5 px-3 w-28 text-center">Shift</th>
                    <th className="py-2.5 px-4 min-w-[240px]">
                      Volume Shift (D & N) • In-Bar Rekor Bulan
                    </th>
                    <th className="py-2.5 px-4 min-w-[260px]">
                      Daily Total (24 Jam) • In-Bar Rekor Bulan
                    </th>
                    <th className="py-2.5 px-3 w-36 text-center text-[10px] text-slate-500 font-semibold">
                      Rekor Bln Ini (D/N • Daily)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white dark:bg-slate-900">
                  {/* 1. BALANCE */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-3.5 align-middle border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Balance</span>
                          <span className="text-[10px] text-slate-400 block">Saldo Awal Pelet</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {isLongShift ? 'LS (Day)' : 'Shift D'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <InBarMetricCell 
                        value={pressBalAwalDay} 
                        maxValue={monthlyBenchmarks.press.maxShift.bal} 
                        colorVariant="slate" 
                        unit="pelet" 
                      />
                    </td>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-4 align-middle border-l border-slate-100 dark:border-slate-800">
                      <InBarMetricCell 
                        value={pressBalAwal} 
                        maxValue={monthlyBenchmarks.press.maxDaily.bal} 
                        colorVariant="slate" 
                        unit="pelet" 
                      />
                    </td>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                      <div>Shift: <strong className="text-slate-600 dark:text-slate-300">{formatNumber(monthlyBenchmarks.press.maxShift.bal)}</strong></div>
                      <div className="mt-0.5">Daily: <strong className="text-slate-600 dark:text-slate-300">{formatNumber(monthlyBenchmarks.press.maxDaily.bal)}</strong></div>
                    </td>
                  </tr>
                  {!isLongShift && (
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Shift N
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <InBarMetricCell 
                          value={pressBalAwalNight} 
                          maxValue={monthlyBenchmarks.press.maxShift.bal} 
                          colorVariant="slate" 
                          unit="pelet" 
                        />
                      </td>
                    </tr>
                  )}

                  {/* 2. RECEIVED */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors bg-sky-50/20 dark:bg-sky-950/10">
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-3.5 align-middle border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                        <div>
                          <span className="font-bold text-sky-800 dark:text-sky-300 block text-xs">Received</span>
                          <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70 block">Sampel GC Masuk</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {isLongShift ? 'LS (Day)' : 'Shift D'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <InBarMetricCell 
                        value={pressRecvDay} 
                        maxValue={monthlyBenchmarks.press.maxShift.recv} 
                        prefix="+" 
                        colorVariant="sky" 
                        unit="spl" 
                      />
                    </td>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-4 align-middle border-l border-slate-100 dark:border-slate-800">
                      <InBarMetricCell 
                        value={pressRecv} 
                        maxValue={monthlyBenchmarks.press.maxDaily.recv} 
                        prefix="+" 
                        colorVariant="sky" 
                        unit="spl" 
                      />
                    </td>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                      <div>Shift: <strong className="text-sky-700 dark:text-sky-300">+{formatNumber(monthlyBenchmarks.press.maxShift.recv)}</strong></div>
                      <div className="mt-0.5">Daily: <strong className="text-sky-700 dark:text-sky-300">+{formatNumber(monthlyBenchmarks.press.maxDaily.recv)}</strong></div>
                    </td>
                  </tr>
                  {!isLongShift && (
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors bg-sky-50/20 dark:bg-sky-950/10">
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Shift N
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <InBarMetricCell 
                          value={pressRecvNight} 
                          maxValue={monthlyBenchmarks.press.maxShift.recv} 
                          prefix="+" 
                          colorVariant="sky" 
                          unit="spl" 
                        />
                      </td>
                    </tr>
                  )}

                  {/* 3. FINISHED */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors bg-emerald-50/20 dark:bg-emerald-950/10">
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-3.5 align-middle border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div>
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 block text-xs">Finished</span>
                          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 block">Output Selesai</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {isLongShift ? 'LS (Day)' : 'Shift D'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <InBarMetricCell 
                        value={pressFinDay} 
                        maxValue={monthlyBenchmarks.press.maxShift.fin} 
                        colorVariant="emerald" 
                        unit="pelet" 
                      />
                    </td>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-4 align-middle border-l border-slate-100 dark:border-slate-800">
                      <InBarMetricCell 
                        value={pressFin} 
                        maxValue={monthlyBenchmarks.press.maxDaily.fin} 
                        colorVariant="emerald" 
                        unit="pelet" 
                      />
                    </td>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                      <div>Shift: <strong className="text-emerald-700 dark:text-emerald-300">{formatNumber(monthlyBenchmarks.press.maxShift.fin)}</strong></div>
                      <div className="mt-0.5">Daily: <strong className="text-emerald-700 dark:text-emerald-300">{formatNumber(monthlyBenchmarks.press.maxDaily.fin)}</strong></div>
                    </td>
                  </tr>
                  {!isLongShift && (
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors bg-emerald-50/20 dark:bg-emerald-950/10">
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Shift N
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <InBarMetricCell 
                          value={pressFinNight} 
                          maxValue={monthlyBenchmarks.press.maxShift.fin} 
                          colorVariant="emerald" 
                          unit="pelet" 
                        />
                      </td>
                    </tr>
                  )}

                  {/* 4. OUTSTANDING */}
                  <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${pressBal > 0 ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}`}>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-3.5 align-middle border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${pressBal > 0 ? 'bg-rose-500' : 'bg-teal-500'}`} />
                        <div>
                          <span className={`font-bold block text-xs ${pressBal > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-teal-700 dark:text-teal-400'}`}>
                            Outstanding
                          </span>
                          <span className="text-[10px] text-slate-400 block">Sisa Saldo Pelet</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {isLongShift ? 'LS (Day)' : 'Shift D'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <InBarMetricCell 
                        value={pressBalDay} 
                        maxValue={monthlyBenchmarks.press.maxShift.bal} 
                        colorVariant={pressBalDay > 0 ? 'rose' : 'slate'} 
                        unit="pelet" 
                      />
                    </td>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-4 align-middle border-l border-slate-100 dark:border-slate-800">
                      <InBarMetricCell 
                        value={pressBal} 
                        maxValue={monthlyBenchmarks.press.maxDaily.bal} 
                        colorVariant={pressBal > 0 ? 'rose' : 'slate'} 
                        unit="pelet" 
                      />
                    </td>
                    <td rowSpan={isLongShift ? 1 : 2} className="py-3 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                      <div>Shift: <strong className="text-slate-600 dark:text-slate-300">{formatNumber(monthlyBenchmarks.press.maxShift.bal)}</strong></div>
                      <div className="mt-0.5">Daily: <strong className="text-slate-600 dark:text-slate-300">{formatNumber(monthlyBenchmarks.press.maxDaily.bal)}</strong></div>
                    </td>
                  </tr>
                  {!isLongShift && (
                    <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${pressBal > 0 ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}`}>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Shift N
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <InBarMetricCell 
                          value={pressBalNight} 
                          maxValue={monthlyBenchmarks.press.maxShift.bal} 
                          colorVariant={pressBalNight > 0 ? 'rose' : 'slate'} 
                          unit="pelet" 
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Shift Ratio Bar D vs N */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold">
                {isLongShift ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono">
                    <Sun className="w-3.5 h-3.5" /> Long Shift LS (07:00 - 24:00 WITA): {formatNumber(pressDayShift)} pelet (100% Day Shift)
                  </span>
                ) : (
                  <>
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono">
                      <Sun className="w-3.5 h-3.5" /> Day Shift (D): {formatNumber(pressDayShift)} pelet ({pressFin > 0 ? Math.round((pressDayShift / pressFin) * 100) : 0}%)
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-mono">
                      <Moon className="w-3.5 h-3.5" /> Night Shift (N): {formatNumber(pressNightShift)} pelet ({pressFin > 0 ? Math.round((pressNightShift / pressFin) * 100) : 0}%)
                    </span>
                  </>
                )}
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                <div 
                  style={{ width: `${isLongShift ? 100 : (pressFin > 0 ? (pressDayShift / pressFin) * 100 : 50)}%` }}
                  className="h-full bg-amber-400 transition-all"
                  title={isLongShift ? `Long Shift LS: ${pressDayShift} pelet` : `Day Shift D: ${pressDayShift} pelet`}
                />
                {!isLongShift && (
                  <div 
                    style={{ width: `${pressFin > 0 ? (pressNightShift / pressFin) * 100 : 50}%` }}
                    className="h-full bg-indigo-600 transition-all"
                    title={`Night Shift N: ${pressNightShift} pelet`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. FUSION (EXPLORATION, PRODUCTION, SMELTER) */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                      Fusion (Exploration, Production, Smelter)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                      Antrean WIP: {weighBal} Sampel
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                    2. Fusion — Dua Sub-Unit: Weighing & Fusion Peleburan
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Peleburan manik kaca borat presisi untuk sampel Eksplorasi, Produksi (akurat), dan Smelter sebelum uji WDXRF.
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono text-right bg-amber-50/60 dark:bg-amber-950/30 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-900/50">
                <span className="text-[10px] text-slate-400 block font-sans">Sampel Masuk Jalur Fusion</span>
                <strong className="text-base font-bold text-amber-900 dark:text-amber-300">+{formatNumber(weighRecv)} sampel</strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  {isLongShift ? `LS: +${weighRecvDay}` : `D: +${weighRecvDay} • N: +${weighRecvNight}`}
                </span>
              </div>
            </div>

            {/* DUA SUB-TABEL: SUB-TABEL 2A (WEIGHING) & SUB-TABEL 2B (FUSION) */}
            <div className="space-y-5">
              
              {/* SUB-TABEL 2A: WEIGHING */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-600" />
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                      Sub-Tabel 2A: Weighing (Penimbangan Cawan & Fluks)
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold">
                    Cawan & Fluks
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2 px-3 w-40">Pilar Weighing</th>
                        <th className="py-2 px-3 w-28 text-center">Shift</th>
                        <th className="py-2 px-3.5 min-w-[220px]">Volume Shift (D & N) • In-Bar Rekor</th>
                        <th className="py-2 px-3.5 min-w-[240px]">Daily Total • In-Bar Rekor</th>
                        <th className="py-2 px-3 w-32 text-center text-[10px] text-slate-500 font-semibold">Rekor Bln</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white dark:bg-slate-900">
                      {/* Balance */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                          Balance (Saldo Awal)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isLongShift ? 'LS' : 'D'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={weighOsDay} maxValue={monthlyBenchmarks.weigh.maxShift.bal} colorVariant="slate" unit="cwn" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                          <InBarMetricCell value={weighOs} maxValue={monthlyBenchmarks.weigh.maxDaily.bal} colorVariant="slate" unit="cwn" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                          <div>Shift: {formatNumber(monthlyBenchmarks.weigh.maxShift.bal)}</div>
                          <div>Daily: {formatNumber(monthlyBenchmarks.weigh.maxDaily.bal)}</div>
                        </td>
                      </tr>
                      {!isLongShift && (
                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              N
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            <InBarMetricCell value={weighOsNight} maxValue={monthlyBenchmarks.weigh.maxShift.bal} colorVariant="slate" unit="cwn" />
                          </td>
                        </tr>
                      )}

                      {/* Received */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-sky-50/20 dark:bg-sky-950/10">
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-sky-800 dark:text-sky-300 border-r border-slate-100 dark:border-slate-800">
                          Received (Masuk Timbang)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isLongShift ? 'LS' : 'D'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={weighRecvDay} maxValue={monthlyBenchmarks.weigh.maxShift.recv} prefix="+" colorVariant="sky" unit="spl" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                          <InBarMetricCell value={weighRecv} maxValue={monthlyBenchmarks.weigh.maxDaily.recv} prefix="+" colorVariant="sky" unit="spl" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                          <div>Shift: +{formatNumber(monthlyBenchmarks.weigh.maxShift.recv)}</div>
                          <div>Daily: +{formatNumber(monthlyBenchmarks.weigh.maxDaily.recv)}</div>
                        </td>
                      </tr>
                      {!isLongShift && (
                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-sky-50/20 dark:bg-sky-950/10">
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              N
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            <InBarMetricCell value={weighRecvNight} maxValue={monthlyBenchmarks.weigh.maxShift.recv} prefix="+" colorVariant="sky" unit="spl" />
                          </td>
                        </tr>
                      )}

                      {/* Finished */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-emerald-800 dark:text-emerald-300 border-r border-slate-100 dark:border-slate-800">
                          Finished (Ditimbang)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isLongShift ? 'LS' : 'D'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={weighFinDay} maxValue={monthlyBenchmarks.weigh.maxShift.fin} colorVariant="emerald" unit="cwn" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                          <InBarMetricCell value={weighFin} maxValue={monthlyBenchmarks.weigh.maxDaily.fin} colorVariant="emerald" unit="cwn" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                          <div>Shift: {formatNumber(monthlyBenchmarks.weigh.maxShift.fin)}</div>
                          <div>Daily: {formatNumber(monthlyBenchmarks.weigh.maxDaily.fin)}</div>
                        </td>
                      </tr>
                      {!isLongShift && (
                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              N
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            <InBarMetricCell value={weighFinNight} maxValue={monthlyBenchmarks.weigh.maxShift.fin} colorVariant="emerald" unit="cwn" />
                          </td>
                        </tr>
                      )}

                      {/* Outstanding */}
                      <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${weighBal > 0 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-amber-800 dark:text-amber-300 border-r border-slate-100 dark:border-slate-800">
                          Outstanding (Sisa Timbang)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isLongShift ? 'LS' : 'D'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={weighBalDay} maxValue={monthlyBenchmarks.weigh.maxShift.bal} colorVariant="amber" unit="cwn" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                          <InBarMetricCell value={weighBal} maxValue={monthlyBenchmarks.weigh.maxDaily.bal} colorVariant="amber" unit="cwn" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                          <div>Shift: {formatNumber(monthlyBenchmarks.weigh.maxShift.bal)}</div>
                          <div>Daily: {formatNumber(monthlyBenchmarks.weigh.maxDaily.bal)}</div>
                        </td>
                      </tr>
                      {!isLongShift && (
                        <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${weighBal > 0 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              N
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            <InBarMetricCell value={weighBalNight} maxValue={monthlyBenchmarks.weigh.maxShift.bal} colorVariant="amber" unit="cwn" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SUB-TABEL 2B: FUSION */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-600" />
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                      Sub-Tabel 2B: Fusion (Peleburan Manik Kaca Borat / Glass Bead)
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                    Glass Bead
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2 px-3 w-40">Pilar Fusion</th>
                        <th className="py-2 px-3 w-28 text-center">Shift</th>
                        <th className="py-2 px-3.5 min-w-[220px]">Volume Shift (D & N) • In-Bar Rekor</th>
                        <th className="py-2 px-3.5 min-w-[240px]">Daily Total • In-Bar Rekor</th>
                        <th className="py-2 px-3 w-32 text-center text-[10px] text-slate-500 font-semibold">Rekor Bln</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white dark:bg-slate-900">
                      {/* Balance */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                          Balance (Saldo Awal)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isLongShift ? 'LS' : 'D'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={fusionBalAwalDay} maxValue={monthlyBenchmarks.fusion.maxShift.bal} colorVariant="slate" unit="bead" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                          <InBarMetricCell value={fusionBalAwal} maxValue={monthlyBenchmarks.fusion.maxDaily.bal} colorVariant="slate" unit="bead" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                          <div>Shift: {formatNumber(monthlyBenchmarks.fusion.maxShift.bal)}</div>
                          <div>Daily: {formatNumber(monthlyBenchmarks.fusion.maxDaily.bal)}</div>
                        </td>
                      </tr>
                      {!isLongShift && (
                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              N
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            <InBarMetricCell value={fusionBalAwalNight} maxValue={monthlyBenchmarks.fusion.maxShift.bal} colorVariant="slate" unit="bead" />
                          </td>
                        </tr>
                      )}

                      {/* Received */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-sky-50/20 dark:bg-sky-950/10">
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-sky-800 dark:text-sky-300 border-r border-slate-100 dark:border-slate-800">
                          Received (Dari Timbang)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isLongShift ? 'LS' : 'D'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={fusionRecvDay} maxValue={monthlyBenchmarks.fusion.maxShift.recv} prefix="+" colorVariant="sky" unit="bead" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                          <InBarMetricCell value={fusionRecv} maxValue={monthlyBenchmarks.fusion.maxDaily.recv} prefix="+" colorVariant="sky" unit="bead" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                          <div>Shift: +{formatNumber(monthlyBenchmarks.fusion.maxShift.recv)}</div>
                          <div>Daily: +{formatNumber(monthlyBenchmarks.fusion.maxDaily.recv)}</div>
                        </td>
                      </tr>
                      {!isLongShift && (
                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-sky-50/20 dark:bg-sky-950/10">
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              N
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            <InBarMetricCell value={fusionRecvNight} maxValue={monthlyBenchmarks.fusion.maxShift.recv} prefix="+" colorVariant="sky" unit="bead" />
                          </td>
                        </tr>
                      )}

                      {/* Finished */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-emerald-800 dark:text-emerald-300 border-r border-slate-100 dark:border-slate-800">
                          Finished (Manik Selesai)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isLongShift ? 'LS' : 'D'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={fusionFinDay} maxValue={monthlyBenchmarks.fusion.maxShift.fin} colorVariant="emerald" unit="bead" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                          <InBarMetricCell value={fusionFin} maxValue={monthlyBenchmarks.fusion.maxDaily.fin} colorVariant="emerald" unit="bead" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                          <div>Shift: {formatNumber(monthlyBenchmarks.fusion.maxShift.fin)}</div>
                          <div>Daily: {formatNumber(monthlyBenchmarks.fusion.maxDaily.fin)}</div>
                        </td>
                      </tr>
                      {!isLongShift && (
                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              N
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            <InBarMetricCell value={fusionFinNight} maxValue={monthlyBenchmarks.fusion.maxShift.fin} colorVariant="emerald" unit="bead" />
                          </td>
                        </tr>
                      )}

                      {/* Outstanding */}
                      <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${fusionBalAkhir > 0 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-amber-800 dark:text-amber-300 border-r border-slate-100 dark:border-slate-800">
                          Outstanding (Sisa Lebur)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isLongShift ? 'LS' : 'D'}
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={fusionBalDay} maxValue={monthlyBenchmarks.fusion.maxShift.bal} colorVariant="amber" unit="bead" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                          <InBarMetricCell value={fusionBalAkhir} maxValue={monthlyBenchmarks.fusion.maxDaily.bal} colorVariant="amber" unit="bead" />
                        </td>
                        <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                          <div>Shift: {formatNumber(monthlyBenchmarks.fusion.maxShift.bal)}</div>
                          <div>Daily: {formatNumber(monthlyBenchmarks.fusion.maxDaily.bal)}</div>
                        </td>
                      </tr>
                      {!isLongShift && (
                        <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${fusionBalAkhir > 0 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              N
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            <InBarMetricCell value={fusionBalNight} maxValue={monthlyBenchmarks.fusion.maxShift.bal} colorVariant="amber" unit="bead" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. LOI (EXPLORATION) */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wider">
                      LOI (Exploration)
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      loiFin < fusionFin 
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                    }`}>
                      {loiFin < fusionFin ? 'Titik Kendala Furnace' : 'Kapasitas Normal'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                    3. LOI (Loss on Ignition) — Gravimetri Eksplorasi
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Siklus pembakaran suhu tinggi bertahap: Balance → Received → Weighing → W1 → W2 → W3 → W4 → Outstanding.
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono text-right bg-purple-50/60 dark:bg-purple-950/30 px-3 py-1.5 rounded-xl border border-purple-200/60 dark:border-purple-900/50">
                <span className="text-[10px] text-slate-400 block font-sans">Total Selesai LOI Hari Ini</span>
                <strong className="text-base font-bold text-purple-900 dark:text-purple-300">{formatNumber(loiFin)} cawan</strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  {isLongShift ? `LS: ${loiDayShift}` : `D: ${loiDayShift} • N: ${loiNightShift}`}
                </span>
              </div>
            </div>

            {/* TABEL 3A: NERACA UTAMA SIKLUS LOI GRAVIMETRI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Tabel 3A: Neraca Utama LOI Gravimetri (Balance, Received, Weighing, Finished, Outstanding)
                </h5>
                <span className="text-[10px] text-slate-400 font-mono">5 Pilar Siklus LOI</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2 px-3 w-40">Pilar Neraca</th>
                      <th className="py-2 px-3 w-28 text-center">Shift</th>
                      <th className="py-2 px-3.5 min-w-[220px]">Volume Shift (D & N) • In-Bar Rekor</th>
                      <th className="py-2 px-3.5 min-w-[240px]">Daily Total • In-Bar Rekor</th>
                      <th className="py-2 px-3 w-32 text-center text-[10px] text-slate-500 font-semibold">Rekor Bln</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white dark:bg-slate-900">
                    {/* 1. Balance */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                        Balance (Saldo Awal LOI)
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-2 px-3.5">
                        <InBarMetricCell value={loiOsDay} maxValue={monthlyBenchmarks.loi.maxShift.bal} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiOs} maxValue={monthlyBenchmarks.loi.maxDaily.bal} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loi.maxShift.bal)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loi.maxDaily.bal)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={loiOsNight} maxValue={monthlyBenchmarks.loi.maxShift.bal} colorVariant="slate" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* 2. Received */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-sky-50/20 dark:bg-sky-950/10">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-sky-800 dark:text-sky-300 border-r border-slate-100 dark:border-slate-800">
                        Received (Sampel EXP Masuk)
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-2 px-3.5">
                        <InBarMetricCell value={loiRecvDay} maxValue={monthlyBenchmarks.loi.maxShift.recv} prefix="+" colorVariant="sky" unit="spl" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiRecv} maxValue={monthlyBenchmarks.loi.maxDaily.recv} prefix="+" colorVariant="sky" unit="spl" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: +{formatNumber(monthlyBenchmarks.loi.maxShift.recv)}</div>
                        <div>Daily: +{formatNumber(monthlyBenchmarks.loi.maxDaily.recv)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-sky-50/20 dark:bg-sky-950/10">
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={loiRecvNight} maxValue={monthlyBenchmarks.loi.maxShift.recv} prefix="+" colorVariant="sky" unit="spl" />
                        </td>
                      </tr>
                    )}

                    {/* 3. Weighing */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-indigo-50/20 dark:bg-indigo-950/10">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-indigo-800 dark:text-indigo-300 border-r border-slate-100 dark:border-slate-800">
                        Weighing (Penimbangan Cawan)
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-2 px-3.5">
                        <InBarMetricCell value={loiWeighingDay} maxValue={monthlyBenchmarks.loi.maxShift.weigh} colorVariant="indigo" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiWeighing} maxValue={monthlyBenchmarks.loi.maxDaily.weigh} colorVariant="indigo" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loi.maxShift.weigh)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loi.maxDaily.weigh)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-indigo-50/20 dark:bg-indigo-950/10">
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={loiWeighingNight} maxValue={monthlyBenchmarks.loi.maxShift.weigh} colorVariant="indigo" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* 4. Finished */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-emerald-800 dark:text-emerald-300 border-r border-slate-100 dark:border-slate-800">
                        Finished (Selesai Pembakaran)
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-2 px-3.5">
                        <InBarMetricCell value={loiFinDay} maxValue={monthlyBenchmarks.loi.maxShift.fin} colorVariant="emerald" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiFin} maxValue={monthlyBenchmarks.loi.maxDaily.fin} colorVariant="emerald" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loi.maxShift.fin)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loi.maxDaily.fin)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={loiFinNight} maxValue={monthlyBenchmarks.loi.maxShift.fin} colorVariant="emerald" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* 5. Outstanding */}
                    <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${loiBal > 0 ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}`}>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle font-semibold text-rose-700 dark:text-rose-400 border-r border-slate-100 dark:border-slate-800">
                        Outstanding (Total Antrean LOI)
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-2 px-3.5">
                        <InBarMetricCell value={loiBalDay} maxValue={monthlyBenchmarks.loi.maxShift.bal} colorVariant="rose" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiBal} maxValue={monthlyBenchmarks.loi.maxDaily.bal} colorVariant="rose" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2.5 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loi.maxShift.bal)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loi.maxDaily.bal)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${loiBal > 0 ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}`}>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-2 px-3.5">
                          <InBarMetricCell value={loiBalNight} maxValue={monthlyBenchmarks.loi.maxShift.bal} colorVariant="rose" unit="cwn" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABEL 3B: ALUR PROSES WORKSTATION FURNACE (W1 - W4) & ANTREAN PER TAHAP (OS W1 - OS W4) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-purple-600" />
                  Tabel 3B: Alur Proses Furnace (Weight 1 → Weight 4) & Outstanding Per Tahap (OS W1 - OS W4)
                </h5>
                <span className="text-[10px] font-mono text-slate-400">
                  (w1 - w4 proses bertahap dengan antrean OS tersendiri)
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2 px-3 w-44">Tahapan Furnace / OS</th>
                      <th className="py-2 px-3 w-28 text-center">Shift</th>
                      <th className="py-2 px-3.5 min-w-[220px]">Volume Shift (D & N) • In-Bar Rekor</th>
                      <th className="py-2 px-3.5 min-w-[240px]">Daily Total • In-Bar Rekor</th>
                      <th className="py-2 px-3 w-32 text-center text-[10px] text-slate-500 font-semibold">Rekor Bln</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white dark:bg-slate-900">
                    {/* W1 */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle font-bold text-purple-900 dark:text-purple-200 border-r border-slate-100 dark:border-slate-800">
                        Weight 1 (W1) - Tahap 1
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3.5">
                        <InBarMetricCell value={loiW1Day} maxValue={monthlyBenchmarks.loiFurnace.maxShift.w1} colorVariant="purple" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiW1} maxValue={monthlyBenchmarks.loiFurnace.maxDaily.w1} colorVariant="purple" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loiFurnace.maxShift.w1)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loiFurnace.maxDaily.w1)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-1.5 px-3.5">
                          <InBarMetricCell value={loiW1Night} maxValue={monthlyBenchmarks.loiFurnace.maxShift.w1} colorVariant="purple" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* OS W1 */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-purple-50/15 dark:bg-purple-950/10">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-purple-700 dark:text-purple-400 font-medium border-r border-slate-100 dark:border-slate-800">
                        ↳ Antrean OS W1
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3.5">
                        <InBarMetricCell value={osW1Day} maxValue={monthlyBenchmarks.loiFurnace.maxShift.os1} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={osW1} maxValue={monthlyBenchmarks.loiFurnace.maxDaily.os1} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loiFurnace.maxShift.os1)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loiFurnace.maxDaily.os1)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-purple-50/15 dark:bg-purple-950/10">
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-1.5 px-3.5">
                          <InBarMetricCell value={osW1Night} maxValue={monthlyBenchmarks.loiFurnace.maxShift.os1} colorVariant="slate" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* W2 */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle font-bold text-purple-900 dark:text-purple-200 border-r border-slate-100 dark:border-slate-800">
                        Weight 2 (W2) - Tahap 2
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3.5">
                        <InBarMetricCell value={loiW2Day} maxValue={monthlyBenchmarks.loiFurnace.maxShift.w2} colorVariant="purple" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiW2} maxValue={monthlyBenchmarks.loiFurnace.maxDaily.w2} colorVariant="purple" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loiFurnace.maxShift.w2)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loiFurnace.maxDaily.w2)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-1.5 px-3.5">
                          <InBarMetricCell value={loiW2Night} maxValue={monthlyBenchmarks.loiFurnace.maxShift.w2} colorVariant="purple" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* OS W2 */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-purple-50/15 dark:bg-purple-950/10">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-purple-700 dark:text-purple-400 font-medium border-r border-slate-100 dark:border-slate-800">
                        ↳ Antrean OS W2
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3.5">
                        <InBarMetricCell value={osW2Day} maxValue={monthlyBenchmarks.loiFurnace.maxShift.os2} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={osW2} maxValue={monthlyBenchmarks.loiFurnace.maxDaily.os2} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loiFurnace.maxShift.os2)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loiFurnace.maxDaily.os2)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-purple-50/15 dark:bg-purple-950/10">
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-1.5 px-3.5">
                          <InBarMetricCell value={osW2Night} maxValue={monthlyBenchmarks.loiFurnace.maxShift.os2} colorVariant="slate" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* W3 */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle font-bold text-purple-900 dark:text-purple-200 border-r border-slate-100 dark:border-slate-800">
                        Weight 3 (W3) - Tahap 3
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3.5">
                        <InBarMetricCell value={loiW3Day} maxValue={monthlyBenchmarks.loiFurnace.maxShift.w3} colorVariant="purple" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiW3} maxValue={monthlyBenchmarks.loiFurnace.maxDaily.w3} colorVariant="purple" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loiFurnace.maxShift.w3)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loiFurnace.maxDaily.w3)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-1.5 px-3.5">
                          <InBarMetricCell value={loiW3Night} maxValue={monthlyBenchmarks.loiFurnace.maxShift.w3} colorVariant="purple" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* OS W3 */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-purple-50/15 dark:bg-purple-950/10">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-purple-700 dark:text-purple-400 font-medium border-r border-slate-100 dark:border-slate-800">
                        ↳ Antrean OS W3
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3.5">
                        <InBarMetricCell value={osW3Day} maxValue={monthlyBenchmarks.loiFurnace.maxShift.os3} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={osW3} maxValue={monthlyBenchmarks.loiFurnace.maxDaily.os3} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loiFurnace.maxShift.os3)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loiFurnace.maxDaily.os3)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-purple-50/15 dark:bg-purple-950/10">
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-1.5 px-3.5">
                          <InBarMetricCell value={osW3Night} maxValue={monthlyBenchmarks.loiFurnace.maxShift.os3} colorVariant="slate" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* W4 */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle font-bold text-purple-900 dark:text-purple-200 border-r border-slate-100 dark:border-slate-800">
                        Weight 4 (W4) - Tahap 4 Konstan
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3.5">
                        <InBarMetricCell value={loiW4Day} maxValue={monthlyBenchmarks.loiFurnace.maxShift.w4} colorVariant="purple" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={loiW4} maxValue={monthlyBenchmarks.loiFurnace.maxDaily.w4} colorVariant="purple" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loiFurnace.maxShift.w4)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loiFurnace.maxDaily.w4)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-1.5 px-3.5">
                          <InBarMetricCell value={loiW4Night} maxValue={monthlyBenchmarks.loiFurnace.maxShift.w4} colorVariant="purple" unit="cwn" />
                        </td>
                      </tr>
                    )}

                    {/* OS W4 */}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-purple-50/15 dark:bg-purple-950/10">
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-purple-700 dark:text-purple-400 font-medium border-r border-slate-100 dark:border-slate-800">
                        ↳ Antrean OS W4
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {isLongShift ? 'LS' : 'D'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3.5">
                        <InBarMetricCell value={osW4Day} maxValue={monthlyBenchmarks.loiFurnace.maxShift.os4} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3.5 align-middle border-l border-slate-100 dark:border-slate-800">
                        <InBarMetricCell value={osW4} maxValue={monthlyBenchmarks.loiFurnace.maxDaily.os4} colorVariant="slate" unit="cwn" />
                      </td>
                      <td rowSpan={isLongShift ? 1 : 2} className="py-2 px-3 align-middle text-center font-mono text-[10px] text-slate-400 border-l border-slate-100 dark:border-slate-800">
                        <div>Shift: {formatNumber(monthlyBenchmarks.loiFurnace.maxShift.os4)}</div>
                        <div>Daily: {formatNumber(monthlyBenchmarks.loiFurnace.maxDaily.os4)}</div>
                      </td>
                    </tr>
                    {!isLongShift && (
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 bg-purple-50/15 dark:bg-purple-950/10">
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                            N
                          </span>
                        </td>
                        <td className="py-1.5 px-3.5">
                          <InBarMetricCell value={osW4Night} maxValue={monthlyBenchmarks.loiFurnace.maxShift.os4} colorVariant="slate" unit="cwn" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Catatan Kesiapan Form Input Foreman */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Struktur Input Siap:</strong> Skema W1 s/d W4 dan antrean per workstation (OS W1 - OS W4) telah terintegrasi di tampilan dashboard. Data saat ini bersumber dari logbook SQL eksisting dan otomatis sinkron saat form pengisian foreman aktif.
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: INSTRUMEN EDXRF (6 ALAT) & WDXRF (2 ALAT) */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 4) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">4</span>
                Penjabaran Instrumen (EDXRF 6 Alat & WDXRF 2 Alat)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Skema: Balance → Received → Finished → Outstanding
              </span>
            </div>

            <button
              onClick={() => setShowChart4(!showChart4)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showChart4 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart4 ? 'Tutup Grafik' : 'Grafik Tren Spektrometri XRF'}</span>
            </button>
          </div>

          {showChart4 && <XrfInstrumentsTrendChart records={records} />}

          {/* ========================================================================= */}
          {/* REALITA HARI INI & MINI TREND CHART: BABAK 4 INSTRUMEN EDXRF & WDXRF */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* SISI KIRI: REALITA SPEKTROMETRI XRF HARI INI */}
            <div className="lg:col-span-8 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              
              {/* Header Status & Shift Distribution */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">
                    Kondisi Operasional Hari Ini • {selectedDate}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {formatNumber(edxrfTotalFin + totalTbpGpsWdxrf)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Total Run Spektrometer (Internal TBP/GPS)
                    </span>
                    <TrendDeltaBadge 
                      current={edxrfTotalFin + totalTbpGpsWdxrf} 
                      prev={prevEdxrfTotalFin + prevTotalTbpGpsWdxrf} 
                      unit="run" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold font-mono">
                    EDXRF: {formatNumber(edxrfTotalFin)}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold font-mono">
                    WDXRF: {formatNumber(totalTbpGpsWdxrf)}
                  </span>
                </div>
              </div>

              {/* Status EDXRF 6 Mesin + Puma (Hanya munculkan mesin aktif > 0) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Realisasi Unit EDXRF (6 Epsilon + S2 Puma)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'Epsilon C', val: epsC },
                    { name: 'Epsilon D', val: epsD },
                    { name: 'Epsilon E', val: epsE },
                    { name: 'Epsilon F', val: epsF },
                    { name: 'Epsilon G', val: epsG },
                    { name: 'Epsilon H', val: epsH },
                    { name: 'S2 Puma', val: s2Puma },
                  ]
                    .filter(unit => unit.val > 0)
                    .map(unit => (
                      <div key={unit.name} className="p-2.5 rounded-2xl bg-teal-50/50 border border-teal-200/70 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">{unit.name}</span>
                        <span className="text-xs font-black font-mono text-teal-800 bg-white px-1.5 py-0.5 rounded border border-teal-100">
                          {unit.val} run
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Status WDXRF Zetium (TBP/GPS vs GTS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Internal TBP/GPS */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">WDXRF Zetium (TBP/GPS)</span>
                    <span className="text-[10px] text-indigo-700 font-mono">Internal</span>
                  </div>
                  <div className="text-xl font-black font-mono text-indigo-950">
                    {formatNumber(totalTbpGpsWdxrf)} <span className="text-xs font-normal text-slate-500">run</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono pt-1 border-t border-indigo-100">
                    <span>Ztm A: {ztmATbpGps}</span>
                    <span>Ztm B: {ztmBTbpGps}</span>
                  </div>
                </div>

                {/* Sister Site GTS */}
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">WDXRF Zetium (PT GTS)</span>
                    <span className="text-[10px] text-purple-700 font-mono font-bold bg-purple-100 px-1.5 py-0.2 rounded">
                      Sister Site
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-purple-950">
                    {formatNumber(totalGtsRuns)} <span className="text-xs font-normal text-slate-500">run GTS</span>
                  </div>
                  <div className="text-[10px] text-purple-700/80 flex justify-between font-mono pt-1 border-t border-purple-100">
                    <span>Ztm A: {ztmAGts}</span>
                    <span>Ztm B: {ztmBGts}</span>
                  </div>
                </div>
              </div>

              {/* Utilisasi & Chamber Readiness */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700">8/8 Mesin Spektrometer Siap & Terkalibrasi</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  {isLongShift ? (
                    <span>Long Shift (07:00 - 24:00): {edxrfDayShift + tbpGpsDayWdxrf} run (Shift Pagi)</span>
                  ) : (
                    <>
                      <span>Pagi: {edxrfDayShift + tbpGpsDayWdxrf} run</span>
                      <span>•</span>
                      <span>Malam: {edxrfNightShift + tbpGpsNightWdxrf} run</span>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* SISI KANAN: MINI TREND CHART 7 HARI (KLIK UNTUK GRAFIK DETAIL) */}
            <div className="lg:col-span-4 flex flex-col">
              <MiniTrendChartCard
                title="Tren Output XRF"
                unit="run"
                metricToday={formatNumber(edxrfTotalFin + totalTbpGpsWdxrf)}
                deltaVal={(edxrfTotalFin + totalTbpGpsWdxrf) - (prevEdxrfTotalFin + prevTotalTbpGpsWdxrf)}
                unitLabel="vs D-1"
                data={history7Days.map(h => ({ date: h.date, val: h.xrfOutput, label: h.label }))}
                onClick={() => setShowChart4(true)}
              />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 4a. EDXRF (6 Alat Epsilon C-H + S2 Puma) */}
            <div className="space-y-4">
              <StandardProductivityCard
                title="EDXRF Group (6 Unit Mesin)"
                subtitle="Energy Dispersive XRF: Epsilon C, D, E, F, G, H (+ Bruker Puma)"
                balance={edxrfBalAwal}
                received={edxrfRecv}
                finished={edxrfTotalFin}
                outstanding={edxrfOutstanding}
                balanceDay={edxrfBalAwalDay}
                balanceNight={edxrfBalAwalNight}
                receivedDay={edxrfRecvDay}
                receivedNight={edxrfRecvNight}
                finishedDay={edxrfFinDay}
                finishedNight={edxrfFinNight}
                outstandingDay={edxrfBalDay}
                outstandingNight={edxrfBalNight}
                icon={Cpu}
                color="teal"
              />

              {/* Rincian 6 Alat Epsilon */}
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Rincian Pembacaan Per-Mesin EDXRF:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS C</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsC}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS D</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">{epsD}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS E</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsE}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS F</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsF}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS G</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsG}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS H</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsH}</span>
                  </div>
                </div>
                {s2Puma > 0 && (
                  <div className="text-[11px] text-slate-500 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Bruker S2 PUMA:</span>
                    <span className="font-mono font-bold text-amber-600">{s2Puma} run</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4b. WDXRF (2 Alat: Zetium A & Zetium B) */}
            <div className="space-y-4">
              <StandardProductivityCard
                title="WDXRF Group (2 Unit Zetium)"
                subtitle="Wavelength Dispersive XRF: Zetium A & Zetium B"
                balance={wdxrfBalAwal}
                received={wdxrfRecv}
                finished={wdxrfTotalFin}
                outstanding={wdxrfBalAkhir}
                balanceDay={dayShift?.wdxrf.osExp || 0}
                balanceNight={nightShift?.wdxrf.osExp || dayShift?.wdxrf.bal || 0}
                receivedDay={fusionFinDay}
                receivedNight={fusionFinNight}
                finishedDay={tbpGpsDayWdxrf}
                finishedNight={tbpGpsNightWdxrf}
                outstandingDay={dayShift?.wdxrf.bal || 0}
                outstandingNight={nightShift?.wdxrf.bal || 0}
                icon={Cpu}
                color="indigo"
              />

              {/* Rincian 2 Alat Zetium A & B */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Zetium A */}
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Zetium A</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-white">{ztmATotal} run</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex justify-between"><span>Prod:</span><strong className="font-mono">{ztmABreakdown.prod}</strong></div>
                    <div className="flex justify-between"><span>Exp:</span><strong className="font-mono text-purple-600">{ztmABreakdown.exp}</strong></div>
                    <div className="flex justify-between"><span>Smelt:</span><strong className="font-mono">{ztmABreakdown.smelt}</strong></div>
                    <div className="flex justify-between"><span>RA/RR:</span><strong className="font-mono text-amber-600">{ztmABreakdown.rarr}</strong></div>
                    <div className="flex justify-between"><span>Ver:</span><strong className="font-mono text-emerald-600">{ztmABreakdown.ver}</strong></div>
                    <div className="flex justify-between"><span>Std/Blk:</span><strong className="font-mono">{ztmABreakdown.std + ztmABreakdown.blank}</strong></div>
                    <div className="flex justify-between col-span-2 pt-1 border-t border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300">
                      <span className="font-semibold flex items-center gap-1"><Building2 className="w-3 h-3 text-purple-500" /> GTS Sister Site:</span>
                      <strong className="font-mono font-bold">{ztmABreakdown.gts} run</strong>
                    </div>
                  </div>
                </div>

                {/* Zetium B */}
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Zetium B</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-white">{ztmBTotal} run</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex justify-between"><span>Prod:</span><strong className="font-mono">{ztmBBreakdown.prod}</strong></div>
                    <div className="flex justify-between"><span>Exp:</span><strong className="font-mono text-purple-600">{ztmBBreakdown.exp}</strong></div>
                    <div className="flex justify-between"><span>Smelt:</span><strong className="font-mono">{ztmBBreakdown.smelt}</strong></div>
                    <div className="flex justify-between"><span>RA/RR:</span><strong className="font-mono text-amber-600">{ztmBBreakdown.rarr}</strong></div>
                    <div className="flex justify-between"><span>Ver:</span><strong className="font-mono text-emerald-600">{ztmBBreakdown.ver}</strong></div>
                    <div className="flex justify-between"><span>Std/Blk:</span><strong className="font-mono">{ztmBBreakdown.std + ztmBBreakdown.blank}</strong></div>
                    <div className="flex justify-between col-span-2 pt-1 border-t border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300">
                      <span className="font-semibold flex items-center gap-1"><Building2 className="w-3 h-3 text-purple-500" /> GTS Sister Site:</span>
                      <strong className="font-mono font-bold">{ztmBBreakdown.gts} run</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* DEDICATED SEPARATE CARD: PT GANE TAMBANG SENTOSA (GTS) WDXRF */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-50 via-white to-purple-50/50 dark:from-purple-950/30 dark:via-slate-900 dark:to-purple-950/20 border-2 border-purple-300 dark:border-purple-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-200/60 dark:border-purple-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      PT Gane Tambang Sentosa (GTS) — Dedicated WDXRF Analysis
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                      Entitas Mandiri / Terpisah
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Analisis spektrometri sampel titipan sister site GTS pada Zetium A & B (TIDAK DIGABUNGKAN ke TBP/GPS)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
                  {formatNumber(totalGtsRuns)}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">Total Run GTS Hari Ini</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Zetium A GTS */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Zetium A (GTS)</span>
                <span className="text-xl font-black font-mono text-purple-700 dark:text-purple-300 block mt-0.5">
                  {formatNumber(ztmAGts)} <span className="text-xs font-normal text-slate-400">run</span>
                </span>
                <span className="text-[10px] text-slate-500">Throughput WDXRF Unit 1</span>
              </div>

              {/* Zetium B GTS */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Zetium B (GTS)</span>
                <span className="text-xl font-black font-mono text-purple-700 dark:text-purple-300 block mt-0.5">
                  {formatNumber(ztmBGts)} <span className="text-xs font-normal text-slate-400">run</span>
                </span>
                <span className="text-[10px] text-slate-500">Throughput WDXRF Unit 2</span>
              </div>

              {/* Shift Split GTS */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-xs space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isLongShift ? 'Operasional Shift GTS' : 'Beban Shift GTS'}
                </span>
                {isLongShift ? (
                  <div className="text-[11px] font-mono text-amber-600 font-bold">
                    Long Shift (07:00 - 24:00): {gtsDayRuns} run (Shift Pagi)
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-amber-600 flex items-center gap-1"><Sun className="w-3 h-3" /> Pagi: <strong>{gtsDayRuns}</strong></span>
                      <span className="text-indigo-600 flex items-center gap-1"><Moon className="w-3 h-3" /> Malam: <strong>{gtsNightRuns}</strong></span>
                    </div>
                    <ShiftDistributionBar dayVal={gtsDayRuns} nightVal={gtsNightRuns} dayLabel="Pagi" nightLabel="Malam" />
                  </>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-100/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/40 text-[11px] text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Aturan Validasi Data:</strong> Seluruh output pembacaan spektrometer untuk PT Gane Tambang Sentosa (GTS) memiliki kalibrasi kurva dan sertifikasi CoA mandiri. Data ini tidak digabung ke dalam perhitungan KPI throughput internal PT TBP dan PT GPS.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: QC DATA & REPORTING (Standardized 4 Pillars) */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 5) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">5</span>
                QC Data & Reporting (Kontrol Mutu & Rilis CoA Eksplorasi)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Skema: Balance → Received → Finished → Outstanding
              </span>
            </div>

            <button
              onClick={() => setShowChart5(!showChart5)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showChart5 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart5 ? 'Tutup Grafik' : 'Grafik Tren QC & CoA'}</span>
            </button>
          </div>

          {showChart5 && <QcReportingTrendChart records={records} />}

          {/* ========================================================================= */}
          {/* REALITA HARI INI & MINI TREND CHART: BABAK 5 QC DATA & REPORTING */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* SISI KIRI: REALITA QC & PELAPORAN HARI INI */}
            <div className="lg:col-span-8 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              
              {/* Header Status & Shift Distribution */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Kondisi Operasional Hari Ini • {selectedDate}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {formatNumber(reportFin)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Sertifikat Analisis (CoA) Dirilis Sah
                    </span>
                    <TrendDeltaBadge current={reportFin} prev={prevReportFin} unit="lpr" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isLongShift ? (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      Long Shift (07:00 - 24:00): {formatNumber(reportDayShift)} (Shift Pagi)
                    </span>
                  ) : (
                    <>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        Pagi: {formatNumber(reportDayShift)}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold font-mono flex items-center gap-1">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        Malam: {formatNumber(reportNightShift)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status QC & Pelaporan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Validasi QC */}
                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900">Validasi Mutu (QC)</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      qcBalAkhir === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {qcBalAkhir === 0 ? 'Clear / 100%' : `${qcBalAkhir} O/S`}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-teal-950">
                    {formatNumber(qcFin)} <span className="text-xs font-normal text-slate-500">sampel</span>
                  </div>
                  <span className="text-[10px] text-teal-700/80 block">
                    Validasi kalibrasi, standar CRM & duplicate checks
                  </span>
                </div>

                {/* Pelepasan CoA */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Pelepasan Laporan (CoA)</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      reportBalAkhir === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {reportBalAkhir === 0 ? 'Zero Pending' : `${reportBalAkhir} Pending`}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-950">
                    {formatNumber(reportFin)} <span className="text-xs font-normal text-slate-500">CoA</span>
                  </div>
                  <span className="text-[10px] text-emerald-700/80 block">
                    Dokumen resmi diserahkan ke Mining / GC / KSO
                  </span>
                </div>
              </div>

              {/* Status Sisa Antrean Pending & Approval */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Pending Approval CoA:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded-lg border ${
                    reportBalAkhir > 50 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {formatNumber(reportBalAkhir)} laporan
                  </span>
                  <TrendDeltaBadge current={reportBalAkhir} prev={prevReportBal} isInverse={true} unit="lpr" />
                </div>
              </div>

              {!isLongShift && (
                <ShiftDistributionBar 
                  dayVal={reportDayShift} 
                  nightVal={reportNightShift} 
                  dayLabel="Pagi"
                  nightLabel="Malam"
                />
              )}

            </div>

            {/* SISI KANAN: MINI TREND CHART 7 HARI (KLIK UNTUK GRAFIK DETAIL) */}
            <div className="lg:col-span-4 flex flex-col">
              <MiniTrendChartCard
                title="Tren Rilis CoA"
                unit="lpr"
                metricToday={formatNumber(reportFin)}
                deltaVal={reportFin - prevReportFin}
                unitLabel="vs D-1"
                data={history7Days.map(h => ({ date: h.date, val: h.coaReleased, label: h.label }))}
                onClick={() => setShowChart5(true)}
              />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 5a. QC Data */}
            <StandardProductivityCard
              title="QC Data (Exploration Quality Check)"
              subtitle="Verifikasi validasi kalibrasi & duplicate check spektrometri"
              balance={qcBalAwal}
              received={qcRecv}
              finished={qcFin}
              outstanding={qcBalAkhir}
              balanceDay={dayShift?.qc.os || 0}
              balanceNight={nightShift?.qc.os || dayShift?.qc.bal || 0}
              receivedDay={tbpGpsDayWdxrf}
              receivedNight={tbpGpsNightWdxrf}
              finishedDay={qcDayShift}
              finishedNight={qcNightShift}
              outstandingDay={dayShift?.qc.bal || 0}
              outstandingNight={nightShift?.qc.bal || 0}
              icon={ShieldCheck}
              color="teal"
              detailSnippet={
                <span>Total verifikasi selesai: <strong>{qcFin} sampel</strong>. Sisa saldo verifikasi: <strong>{qcBalAkhir}</strong>.</span>
              }
            />

            {/* 5b. Reporting */}
            <StandardProductivityCard
              title="Reporting (Penerbitan Hasil / CoA)"
              subtitle="Pelepasan resmi laporan analisis Certificate of Analysis"
              balance={reportBalAwal}
              received={reportRecv}
              finished={reportFin}
              outstanding={reportBalAkhir}
              balanceDay={dayShift?.report.osReport || 0}
              balanceNight={nightShift?.report.osReport || dayShift?.report.bal || 0}
              receivedDay={dayShift?.report.received || 0}
              receivedNight={nightShift?.report.received || 0}
              finishedDay={reportDayShift}
              finishedNight={reportNightShift}
              outstandingDay={dayShift?.report.bal || 0}
              outstandingNight={nightShift?.report.bal || 0}
              icon={FileCheck}
              color="emerald"
              detailSnippet={
                <div className="flex items-center justify-between pt-1">
                  <span>Hasil Selesai Dirilis: <strong className="text-emerald-600 font-mono">{reportFin}</strong></span>
                  <span>Sisa Pending: <strong className="font-mono">{reportBalAkhir}</strong></span>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation for Slide Flow */}
      {!showAllSections && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer shadow-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Babak Sebelumnya</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Gunakan tombol panah keyboard ◄ ► untuk beralih babak presentasi
          </span>

          <button
            disabled={currentStep === 5}
            onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-teal-500/20 cursor-pointer transition-all"
          >
            <span>Lanjut ke Babak {currentStep < 5 ? currentStep + 1 : 5}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manpower Roster Detailed List Modal */}
      <DailyPerformanceManpowerRosterModal
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        selectedDate={selectedDate}
        userPt={userPt}
      />
    </div>
  );
};
