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

const FALLBACK_TBP_LAB_PERSONNEL: LabPersonnelItem[] = [
  // Shift A (Pagi - Pure TBP & GPS)
  { nik: '02D22000023', name: 'Muhammad Reza Satria', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: '04D24000068', name: 'Muhammad Fandy Septiawan', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: '04D26000070', name: 'Rahmad Azizul Khakim', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: '04D26000015', name: 'Gusti Nur Firdaus', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0406220796', name: 'Naslim Muksin', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0203220102', name: 'Ramadhan W. Anwar', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0405240290', name: 'Randi Zakaria', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0212210097', name: 'Riko Saputra Day', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0412221652', name: 'Suryadi La Samusu', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: 'M0402230134', name: 'Wahyu Jabir', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'crew', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },

  // Non-Shift (Merged into Shift Pagi - Pure TBP & GPS Staff)
  { nik: '04D23000004', name: 'Tigwa Anggawikara', jabatan: 'Laboratory Superintendent', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '02D21001045', name: 'Arthur Paul Marnix Souisa', jabatan: 'Laboratory Supervisor', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '02D24000043', name: 'Muhamad Alvin Febriansyah', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '04D22000094', name: 'Kemal Maulana', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '04D21001046', name: 'Moch. Siswanto', jabatan: 'Laboratory Maintenance Supervisor', section: 'Maintenance', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '02D21001017', name: 'Christian Anggawijaya', jabatan: 'Laboratory Maintenance Supervisor', section: 'Maintenance', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0403240177', name: 'Aldy Aldersun Puluh', jabatan: 'Admin, Preparation & Laboratory', section: 'Administration', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0411251243', name: 'Agung Adi Putra Prasetyo', jabatan: 'Admin, Preparation & Laboratory', section: 'Administration', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0206250732', name: 'Muhammad Iqbal', jabatan: 'Admin, Preparation & Laboratory', section: 'Administration', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0403190701', name: 'Murti Tamisari Harun', jabatan: 'Preparation Foreman, Wet', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },

  // Shift B (Malam - Pure TBP & GPS)
  { nik: '02D18000192', name: 'Khaufi Wirawan Aligora', jabatan: 'Laboratory Supervisor', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D21001049', name: 'Muhammad Amran Selang', jabatan: 'Laboratory Supervisor', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D25000067', name: 'Andika Dafa Rusdiarta', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '02D23000024', name: 'Fachmi Amarullah', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D24000057', name: 'Herwin Predianto', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D26000067', name: 'Muhammad Furqan', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: '04D24000056', name: 'Rizal Zaelani', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0407221011', name: 'Agusman Suaib', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0411221527', name: 'Hasbi Nuh', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0201250032', name: 'Imran Sebualamo', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0412221625', name: 'Iran Rumbia', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0406220795', name: 'Irman Welhemus', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0402230188', name: 'Jarfin Saharudin', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0403240155', name: 'Jasri', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0406210029', name: 'La Dai', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0209240583', name: 'La Wisnu', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0402240078', name: 'Muh. Alif Multazam NH', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0202220051', name: 'Rahmat Purnomo', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0203220144', name: 'Risdiyanto Ladedi', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0402230199', name: 'Sukri Koco', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },
  { nik: 'M0409251014', name: 'Zhiran Arrazy Barmawi Putra', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'crew', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },

  // Tidak Bertugas (Izin, Sakit, Off, Cuti - Pure TBP & GPS)
  { nik: '04D25000059', name: 'Anresansia Winesha Pandit', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'CT', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Cuti Tahunan (CT)', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' },
  { nik: '02D25000050', name: 'Ayup Riyan Redondo', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'CR', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Cuti Roster (CR)', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' },
  { nik: '04D23000025', name: 'M. Harits Asyardy', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'OFF', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Off Roster (Libur)', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
  { nik: '04D23000035', name: 'Ahmad Jusma Azhari Annur', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'SL', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Sakit Surat Dokter (SL)', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300' },
  { nik: '04D26000016', name: 'Riyan Panji Putra', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'I', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Izin Resmi (I)', badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300' },
  { nik: '04D25000045', name: 'Kevin Murheza', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'OFF', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Off Roster (Libur)', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
  { nik: 'M0203250155', name: 'Sahrul Sanusi', jabatan: 'Crew, Preparation & Laboratory', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'OFF', category: 'tidak_bertugas', roleCategory: 'crew', keterangan: 'Off Roster (Libur)', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' }
];

const FALLBACK_GTS_LAB_PERSONNEL: LabPersonnelItem[] = [
  // Shift A (Pagi - Dedicated GTS)
  { nik: '03D24000058', name: 'Rafi Fadlurrahman', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  { nik: '03D24000060', name: 'Febrian Mauklesi Salatutin', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu A', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Shift Pagi', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' },
  
  // Non-Shift (Dedicated GTS)
  { nik: '03D22000021', name: 'Agus Kusman', jabatan: 'Preparation & Laboratory Superintendent', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '03D23000041', name: 'Asrar Kurniawan', jabatan: 'Laboratory Supervisor', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '03D23000052', name: 'Difri Candra A.N', jabatan: 'Quality Assurance Officer', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: '03D23000053', name: 'Sugiyanto', jabatan: 'Quality Assurance Officer', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0303240091', name: 'Irsal Ridwan Johan', jabatan: 'Admin, Preparation & Laboratory', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },
  { nik: 'M0303240092', name: 'Mursalin Iskandar', jabatan: 'Admin, Inventory Control', section: 'Laboratory', regu: 'Non-Shift', shiftSchedule: 'D', category: 'pagi', roleCategory: 'staff', keterangan: 'Hadir Non-Shift Pagi', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300' },

  // Shift B (Malam - Dedicated GTS)
  { nik: '03D24000061', name: 'Secwin Sello Manukrante', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'N', category: 'malam', roleCategory: 'staff', keterangan: 'Hadir Shift Malam', badgeColor: 'bg-indigo-900 text-white border-indigo-700' },

  // Tidak Bertugas (Dedicated GTS)
  { nik: '03D24000062', name: 'M. Afdal Al Fatihah', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'OFF', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Off Roster (Libur)', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
  { nik: '03D24000063', name: 'Muhammad Faris Nur Fauzan', jabatan: 'Laboratory Foreman', section: 'Laboratory', regu: 'Regu B', shiftSchedule: 'SL', category: 'tidak_bertugas', roleCategory: 'staff', keterangan: 'Sakit Surat Dokter (SL)', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300' }
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
      const sec = (emp.section || emp.department || '').toLowerCase();
      // Hanya ambil karyawan di luar seksi Laboratory
      return !sec.includes('lab') && !sec.includes('laboratorium');
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

      const sec = (emp.section || '').toLowerCase();
      const dep = (emp.department || '').toLowerCase();
      const jab = (emp.jabatan || emp.position || '').toLowerCase();
      return (
        sec.includes('lab') ||
        dep.includes('lab') ||
        sec.includes('laboratorium') ||
        dep.includes('laboratorium') ||
        jab.includes('chemist') ||
        jab.includes('laboratory') ||
        jab.includes('qa officer') ||
        jab.includes('qa/qc')
      ) && !sec.includes('preparation') && !sec.includes('dry') && !sec.includes('wet');
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
      const isNonShift = empShift.includes('NON') || jab.includes('superintendent') || jab.includes('supervisor') || jab.includes('officer') || jab.includes('admin') || jab.includes('chemist');

      let category: 'pagi' | 'malam' | 'tidak_bertugas' = 'pagi';
      let keterangan = 'Hadir Shift Pagi';
      let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';

      // 1. Cek Apakah Tidak Bertugas (Izin, Sakit, Off, Cuti)
      if (upper === 'OFF' || upper === 'X') {
        category = 'tidak_bertugas';
        keterangan = 'Off Roster (Libur)';
        badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
      } else if (upper.startsWith('C') || upper === 'CT' || upper === 'CR' || upper === 'CE' || upper === 'CI' || upper === 'CS') {
        const type = upper === 'CT' ? 'Tahunan' : upper === 'CR' ? 'Roster' : upper === 'CE' ? 'Emergency' : 'Izin Cuti';
        category = 'tidak_bertugas';
        keterangan = `Cuti ${type} (${upper})`;
        badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      } else if (['SL', 'SS', 'S1', 'S2'].includes(upper) || upper.startsWith('SAKIT')) {
        category = 'tidak_bertugas';
        keterangan = upper === 'SL' ? 'Sakit Surat Dokter (SL)' : 'Sakit (SS)';
        badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      } else if (['I', 'IK', 'IA', 'DL', 'UL'].includes(upper) || upper.startsWith('IZIN')) {
        category = 'tidak_bertugas';
        keterangan = upper === 'IK' ? 'Izin Khusus (IK)' : upper === 'DL' ? 'Dinas Luar (DL)' : 'Izin Resmi (I)';
        badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300';
      } else if (upper === 'TRV' || upper === 'TV') {
        category = 'tidak_bertugas';
        keterangan = 'Travel Roster (TRV)';
        badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300';
      } else if (upper === 'A' || upper === 'ALPA') {
        category = 'tidak_bertugas';
        keterangan = 'Alpa / Tanpa Keterangan';
        badgeColor = 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200 border-rose-400';
      }
      // 2. Cek Apakah Shift Malam
      else if (upper === 'N') {
        category = 'malam';
        keterangan = 'Hadir Shift Malam (N)';
        badgeColor = 'bg-indigo-900 text-white border-indigo-700';
      }
      // 3. Gabungkan Non-Shift dengan Shift Pagi
      else {
        category = 'pagi';
        if (isNonShift) {
          keterangan = 'Hadir Non-Shift Pagi';
          badgeColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300';
        } else {
          keterangan = 'Hadir Shift Pagi (D)';
          badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
        }
      }

      const regu = isNonShift ? 'Non-Shift' : emp.regu || (empShift === 'A' ? 'Regu A' : empShift === 'B' ? 'Regu B' : 'Regu Shift');

      const isStaff = isStaffRole({
        jabatan: emp.jabatan || emp.position,
        gol: emp.gol || emp.golongan,
        roleCategory: emp.roleCategory
      });
      const roleCategory: 'staff' | 'crew' = isStaff ? 'staff' : 'crew';

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
        badgeColor
      };
    });
  }, [rosterList, dateKeys, userPt]);

  // Lists by Category & Role
  const staffList = useMemo(() => parsedLabPersonnel.filter(p => p.roleCategory === 'staff'), [parsedLabPersonnel]);
  const crewList = useMemo(() => parsedLabPersonnel.filter(p => p.roleCategory === 'crew'), [parsedLabPersonnel]);

  const pagiList = useMemo(() => parsedLabPersonnel.filter(p => p.category === 'pagi'), [parsedLabPersonnel]);
  const malamList = useMemo(() => parsedLabPersonnel.filter(p => p.category === 'malam'), [parsedLabPersonnel]);
  const tidakBertugasList = useMemo(() => parsedLabPersonnel.filter(p => p.category === 'tidak_bertugas'), [parsedLabPersonnel]);

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

  // STEP 3: PRODUCTIVITY PREPARASI (Balance, Received, Finished, Outstanding)
  // 3a. Press Powder
  const pressRecv = dayRecords.reduce((acc, r) => acc + r.pressPowder.received.shift, 0);
  const pressFin = dayRecords.reduce((acc, r) => acc + r.pressPowder.finish.shift, 0);
  const pressBal = Math.max(0, pressRecv - pressFin);

  // 3b. Weighing (Fuse Bead Weighing)
  const weighOs = dayRecords[0]?.fuseBead.osExp || 0;
  const weighRecv = expShift;
  const weighFin = dayRecords.reduce((acc, r) => acc + r.fuseBead.finishShift, 0);
  const weighBal = dayRecords[dayRecords.length - 1]?.fuseBead.balExp || 0;

  // 3c. Fusion (Fuse Bead Formation)
  const fusionBalAwal = weighOs;
  const fusionRecv = expShift;
  const fusionFin = weighFin;
  const fusionBalAkhir = weighBal;

  // 3d. LOI (Loss on Ignition)
  const loiOs = dayRecords[0]?.loi.os || 0;
  const loiW2 = dayRecords.reduce((acc, r) => acc + r.loi.w2, 0);
  const loiW4 = dayRecords.reduce((acc, r) => acc + r.loi.w4, 0);
  const loiW5 = dayRecords.reduce((acc, r) => acc + r.loi.w5, 0);
  const loiFin = dayRecords.reduce((acc, r) => acc + r.loi.finLoiShift, 0);
  const loiBal = dayRecords[dayRecords.length - 1]?.loi.bal || 0;

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
  const totalGtsReceived = dayRecords.reduce((acc, r) => acc + (r.sampleReceived.gts?.shift || 0), 0);
  const totalTbpGpsReceived = gcShift + prodShift + expShift + smelterShift;

  // Preparasi Per-Shift
  const pressDayShift = dayShift?.pressPowder.finish.shift || 0;
  const pressNightShift = nightShift?.pressPowder.finish.shift || 0;
  const weighDayShift = dayShift?.fuseBead.finishShift || 0;
  const weighNightShift = nightShift?.fuseBead.finishShift || 0;
  const fusionDayShift = weighDayShift;
  const fusionNightShift = weighNightShift;
  const loiDayShift = dayShift?.loi.finLoiShift || 0;
  const loiNightShift = nightShift?.loi.finLoiShift || 0;

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

  // Component Helper for Standardized 4-Pillar Card
  const StandardProductivityCard = ({
    title,
    subtitle,
    balance,
    received,
    finished,
    outstanding,
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

        {/* 4 Standardized Metric Pillars */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* 1. Balance Awal */}
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Balance</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
              {formatNumber(balance)}
            </span>
            <span className="text-[9px] text-slate-400">Saldo Awal</span>
          </div>

          {/* 2. Received */}
          <div className="p-2.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
            <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 block uppercase tracking-wider">Received</span>
            <span className="text-base sm:text-lg font-black font-mono text-sky-700 dark:text-sky-300 mt-0.5 block">
              +{formatNumber(received)}
            </span>
            <span className="text-[9px] text-sky-500/70">Sampel Masuk</span>
          </div>

          {/* 3. Finished */}
          <div className="p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">Finished</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">
              {formatNumber(finished)}
            </span>
            <span className="text-[9px] text-emerald-500/70">Diselesaikan</span>
          </div>

          {/* 4. Outstanding (Balance Akhir) */}
          <div className={`p-2.5 rounded-2xl border ${
            isBottleneck 
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50' 
              : 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40'
          }`}>
            <span className={`text-[10px] font-semibold block uppercase tracking-wider ${isBottleneck ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'}`}>
              Outstanding
            </span>
            <span className={`text-base sm:text-lg font-black font-mono mt-0.5 block ${isBottleneck ? 'text-rose-700 dark:text-rose-300' : 'text-teal-700 dark:text-teal-300'}`}>
              {formatNumber(outstanding)}
            </span>
            <span className="text-[9px] text-slate-400">Sisa Saldo</span>
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

  const steps = [
    { num: 1, title: 'Manpower & SDM', desc: 'Kehadiran Staff & Crew', icon: Users },
    { num: 2, title: 'Sample Received', desc: 'GC, Prod, Exp, Smelter', icon: Layers },
    { num: 3, title: 'Productivity Preparasi', desc: 'Press, Weighing, Fusion, LOI', icon: Flame },
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
        <div className="space-y-5">
          {/* Top Bar Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                <span>Kesiapan Manpower (Kategori Utama: Staff & Crew Laboratorium)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase tracking-wider">
                  Universe {userPt || 'TBP'}
                </span>
              </h3>
              <span className="text-xs text-slate-500">
                Total Personil: <strong>{parsedLabPersonnel.length} Terdaftar</strong> • 
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1">👔 {staffList.length} Staff</span> ({staffHadirTotal} Hadir) • 
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">👷 {crewList.length} Crew</span> ({crewHadirTotal} Hadir) • 
                <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">📋 {tidakBertugasList.length} Tidak Bertugas</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRosterModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Seluruh Roster Portal</span>
              </button>
              <button
                onClick={() => setShowChart1(!showChart1)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showChart1 
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{showChart1 ? 'Tutup Grafik' : 'Grafik Tren Manpower'}</span>
              </button>
            </div>
          </div>

          {showChart1 && <ManpowerTrendChart records={records} />}

          {/* ========================================================================= */}
          {/* REALITA HARI INI & MINI TREND CHART: BABAK 1 MANPOWER */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* SISI KIRI: REALITA MANPOWER OPERASIONAL HARI INI */}
            <div className="lg:col-span-8 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              
              {/* Header Status & Shift Distribution */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">
                    Kondisi Operasional Hari Ini • {selectedDate}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {staffHadirTotal + crewHadirTotal + totalAssistanceCount}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Personil Bertugas di Lab ({userPt || 'TBP'})
                    </span>
                    <TrendDeltaBadge current={totalHadirToday} prev={prevTotalHadir} unit="org" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Pagi: {staffPagi.length + crewPagi.length + assistancePagiCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold font-mono flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    Malam: {staffMalam.length + crewMalam.length + assistanceMalamCount}
                  </span>
                </div>
              </div>

              {/* 1. KLASIFIKASI JABATAN STAFF HADIR (HANYA MUNCULKAN JIKA > 0, JIKA 0 SEMBUNYIKAN) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Klasifikasi Jabatan Staff Hadir ({staffHadirTotal} Org)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    *Jabatan tidak hadir otomatis disembunyikan
                  </span>
                </div>

                {activeStaffJabatanList.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-400 italic">
                    Tidak ada personil staff yang hadir hari ini.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeStaffJabatanList.map(j => {
                      const style = getJabatanBadgeStyle(j.jabatan);
                      return (
                        <div 
                          key={j.jabatan}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 shadow-2xs"
                        >
                          <span className={`w-2 h-2 rounded-full ${style.bg.replace('bg-', 'bg-')}`} />
                          <span className="text-xs font-semibold text-slate-700">{j.jabatan}:</span>
                          <span className="text-xs font-black font-mono text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {j.count}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({j.pagi}P / {j.malam}M)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. CREW SEKSI LABORATORY (SEMUA CREW JABATAN SAMA, SECTION=LABORATORY) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-emerald-950">Crew Seksi Laboratory</h5>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                        Posisi Setara
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700/80">
                      Seluruh crew bernaung di bawah seksi Laboratory (preparasi, furnace & analisa rutin)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-emerald-800">
                      {crewHadirTotal}
                    </span>
                    <span className="text-xs text-emerald-700 font-medium ml-1">
                      Hadir ({crewPagi.length} Pagi / {crewMalam.length} Malam)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. INPUT MANUAL PERBANTUAN DARI SECTION LAIN DENGAN AUTOFILL DATALIST */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Perbantuan dari Section Lain ({totalAssistanceCount} Personil)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAssistanceInput(!showAssistanceInput)}
                    className="px-2.5 py-1 rounded-xl bg-white border border-slate-300 text-blue-600 hover:bg-blue-50 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showAssistanceInput ? 'Tutup Form' : 'Tambah Perbantuan'}</span>
                  </button>
                </div>

                {/* Form Input Perbantuan dengan Datalist Autofill */}
                {showAssistanceInput && (
                  <div className="p-3 rounded-2xl bg-white border border-blue-200 space-y-2 shadow-xs">
                    <span className="text-[11px] text-slate-500 block">
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
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
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
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="pagi">Shift Pagi</option>
                        <option value="malam">Shift Malam</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAddAssistance(assistanceSearch, assistanceShift)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                )}

                {/* List Personil Perbantuan Aktif */}
                {assistanceList.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic">
                    Belum ada personil perbantuan dari seksi lain hari ini.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assistanceList.map(item => (
                      <div
                        key={item.nik}
                        className="px-2.5 py-1 rounded-xl bg-white border border-blue-200 flex items-center gap-2 shadow-2xs"
                      >
                        <span className="text-xs font-bold text-slate-900">{item.name}</span>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
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
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Ringkasan Tidak Bertugas (Cuti, Sakit, Off) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Tidak Bertugas: <strong className="text-slate-800 font-mono">{tidakBertugasList.length}</strong> org</span>
                  <span>•</span>
                  <span>Cuti: <strong className="text-amber-600 font-mono">{staffCuti + crewCuti}</strong></span>
                  <span>•</span>
                  <span>Sakit/Izin: <strong className="text-rose-600 font-mono">{staffIzinSakit + crewIzinSakit}</strong></span>
                  <span>•</span>
                  <span>Off Roster: <strong className="text-slate-600 font-mono">{tidakBertugasList.filter(p => p.shiftSchedule === 'OFF' || p.shiftSchedule === 'X').length}</strong></span>
                </div>
              </div>

            </div>

            {/* SISI KANAN: MINI TREND CHART 7 HARI (KLIK UNTUK GRAFIK DETAIL) */}
            <div className="lg:col-span-4 flex flex-col">
              <MiniTrendChartCard
                title="Tren Kehadiran Manpower"
                unit="org"
                metricToday={staffHadirTotal + crewHadirTotal + totalAssistanceCount}
                deltaVal={(staffHadirTotal + crewHadirTotal) - prevTotalHadir}
                unitLabel="vs D-1"
                data={history7Days.map(h => ({ date: h.date, val: h.manpowerHadir, label: h.label }))}
                onClick={() => setShowChart1(true)}
              />
            </div>

          </div>

          {/* ========================================================================= */}
          {/* CARD UTAMA: STAFF & CREW (SHIFT BUKAN KATEGORI UTAMA) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* CARD 1: MANPOWER STAFF */}
            <div 
              onClick={() => {
                setManpowerRoleTab('staff');
                setManpowerShiftFilter('all');
              }}
              className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                manpowerRoleTab === 'staff'
                  ? 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 border-indigo-500/80 shadow-md ring-2 ring-indigo-400/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-sm'
              }`}
            >
              {/* Header Card Staff */}
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100/70 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">Manpower Staff</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Kategori Utama
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Superintendent, Supervisor, QA Officer, Foreman & Admin</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {staffHadirTotal} <span className="text-xs font-normal text-slate-400">/ {staffList.length} Org</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {staffHadirTotal} Hadir ({Math.round((staffHadirTotal / (staffList.length || 1)) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Sub-Kategori Shift di dalam Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                
                {/* 1. Shift Pagi & Non-Shift */}
                <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/70 border border-teal-200/80 dark:border-teal-900/50 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-teal-50 dark:border-teal-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Shift Pagi & Non-Shift</span>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200">
                      {staffPagi.length} Org
                    </span>
                  </div>
                  
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Jabatan yang Bertugas ({staffPagi.length} Personil):
                  </div>
                  
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {staffBreakdownPagi.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-1">Tidak ada staf dinas pagi</div>
                    ) : (
                      staffBreakdownPagi.map(b => (
                        <div 
                          key={b.jabatan} 
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700/60"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[155px]" title={b.jabatan}>
                            {b.jabatan}
                          </span>
                          <span className="font-mono font-black text-teal-700 dark:text-teal-300 text-[11px] bg-teal-50 dark:bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-200/50 shrink-0">
                            {b.count} orang
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Shift Malam */}
                <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/70 border border-indigo-200/80 dark:border-indigo-900/50 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-indigo-50 dark:border-indigo-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span>Shift Malam</span>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200">
                      {staffMalam.length} Org
                    </span>
                  </div>
                  
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Jabatan yang Bertugas ({staffMalam.length} Personil):
                  </div>
                  
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {staffBreakdownMalam.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-1">Tidak ada staf dinas malam</div>
                    ) : (
                      staffBreakdownMalam.map(b => (
                        <div 
                          key={b.jabatan} 
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700/60"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[155px]" title={b.jabatan}>
                            {b.jabatan}
                          </span>
                          <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-[11px] bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-200/50 shrink-0">
                            {b.count} orang
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Footer Staff */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-indigo-100/60 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <Coffee className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tidak bertugas: <strong className="text-amber-600 dark:text-amber-400">{staffTidakBertugas.length} orang</strong> (Cuti / Sakit / Off)</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setManpowerRoleTab('staff');
                    setManpowerShiftFilter('all');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat daftar nama staff</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CARD 2: MANPOWER CREW */}
            <div 
              onClick={() => {
                setManpowerRoleTab('crew');
                setManpowerShiftFilter('all');
              }}
              className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                manpowerRoleTab === 'crew'
                  ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/20 border-emerald-500/80 shadow-md ring-2 ring-emerald-400/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 shadow-sm'
              }`}
            >
              {/* Header Card Crew */}
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100/70 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">Manpower Crew</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Kategori Utama
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Seluruh crew berposisi setara di Section Laboratory</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {crewHadirTotal} <span className="text-xs font-normal text-slate-400">/ {crewList.length} Org</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {crewHadirTotal} Hadir ({Math.round((crewHadirTotal / (crewList.length || 1)) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Sub-Kategori Shift di dalam Crew */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                
                {/* 1. Shift Pagi */}
                <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/70 border border-teal-200/80 dark:border-teal-900/50 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-teal-50 dark:border-teal-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Crew Shift Pagi</span>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200">
                      {crewPagi.length} Org
                    </span>
                  </div>
                  
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Semua Crew Berposisi Setara:
                    </span>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Bertugas pada preparasi sampel, penimbangan, pembakaran furnace & operasional spektrometer XRF.
                    </p>
                  </div>
                </div>

                {/* 2. Shift Malam */}
                <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/70 border border-indigo-200/80 dark:border-indigo-900/50 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-indigo-50 dark:border-indigo-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span>Crew Shift Malam</span>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200">
                      {crewMalam.length} Org
                    </span>
                  </div>
                  
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Semua Crew Berposisi Setara:
                    </span>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Bertugas pada preparasi sampel, penimbangan, pembakaran furnace & operasional spektrometer XRF.
                    </p>
                  </div>
                </div>

              </div>

              {/* Footer Crew */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-emerald-100/60 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-3 text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-amber-500" />
                    Off: <strong className="text-slate-700 dark:text-slate-300">{crewTidakBertugas.length} org</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                    Perbantuan Masuk: <strong className="text-blue-600 dark:text-blue-400 font-mono">{totalAssistanceCount} org</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setManpowerRoleTab('crew');
                    setManpowerShiftFilter('all');
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat daftar nama crew</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* SUPPORT STRIP: RINGKASAN KESIAPAN OPERASIONAL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Total Hadir Lab</span>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {staffHadirTotal + crewHadirTotal} <span className="text-xs font-normal text-slate-400">/ {parsedLabPersonnel.length}</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">
                Staff: {staffHadirTotal} • Crew: {crewHadirTotal}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
              <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 block uppercase tracking-wider flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-500" /> Total Dinas Pagi
              </span>
              <div className="text-lg font-black font-mono text-teal-700 dark:text-teal-300 mt-0.5">
                {staffPagi.length + crewPagi.length} <span className="text-xs font-normal text-slate-400">Orang</span>
              </div>
              <span className="text-[10px] text-teal-600/80">
                Staff: {staffPagi.length} • Crew: {crewPagi.length}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider flex items-center gap-1">
                <Moon className="w-3 h-3 text-indigo-500" /> Total Dinas Malam
              </span>
              <div className="text-lg font-black font-mono text-indigo-700 dark:text-indigo-300 mt-0.5">
                {staffMalam.length + crewMalam.length} <span className="text-xs font-normal text-slate-400">Orang</span>
              </div>
              <span className="text-[10px] text-indigo-600/80">
                Staff: {staffMalam.length} • Crew: {crewMalam.length}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block uppercase tracking-wider flex items-center gap-1">
                <Coffee className="w-3 h-3 text-amber-500" /> Tidak Bertugas & Bantuan
              </span>
              <div className="text-lg font-black font-mono text-amber-700 dark:text-amber-300 mt-0.5">
                {tidakBertugasList.length} <span className="text-xs font-normal text-slate-400">Off/Cuti</span>
              </div>
              <span className="text-[10px] text-blue-600 font-semibold">
                +{crewBantuan} Kru Bantuan Prep
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABEL DETAIL PERSONIL (DIURUTKAN BERDASARKAN JABATAN) */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              
              {/* Primary Role Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setManpowerRoleTab('staff')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      manpowerRoleTab === 'staff'
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Staff ({staffList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManpowerRoleTab('crew')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      manpowerRoleTab === 'crew'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Crew ({crewList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManpowerRoleTab('semua')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      manpowerRoleTab === 'semua'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span>Semua Personil ({parsedLabPersonnel.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManpowerRoleTab('tidak_bertugas')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      manpowerRoleTab === 'tidak_bertugas'
                        ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tidak Bertugas ({tidakBertugasList.length})</span>
                  </button>
                </div>

                {/* Sub-Filter Shift (Pill) */}
                {manpowerRoleTab !== 'tidak_bertugas' && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl text-[11px]">
                    <span className="text-slate-400 font-semibold px-2">Shift:</span>
                    <button
                      type="button"
                      onClick={() => setManpowerShiftFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        manpowerShiftFilter === 'all'
                          ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setManpowerShiftFilter('pagi')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        manpowerShiftFilter === 'pagi'
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sun className="w-3 h-3 text-amber-500" /> Pagi
                    </button>
                    <button
                      type="button"
                      onClick={() => setManpowerShiftFilter('malam')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        manpowerShiftFilter === 'malam'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Moon className="w-3 h-3 text-indigo-500" /> Malam
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Search Box & View Mode Toggle (Table vs Cards) */}
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={manpowerSearch}
                    onChange={e => setManpowerSearch(e.target.value)}
                    placeholder="Cari personil / NIK / jabatan..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setManpowerViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      manpowerViewMode === 'table'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Tabel (Urut Berdasarkan Jabatan)"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setManpowerViewMode('cards')}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      manpowerViewMode === 'cards'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Grid Kartu Personil"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* Info Notice: Sorting by Official Jabatan Hierarchy */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-1 py-1 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>
                  Daftar nama <strong>diurutkan berdasarkan hirarki jabatan resmi</strong> (Superintendent → Supervisor → QA Officer → Foreman → Admin → Crew)
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Menampilkan <strong>{filteredPersonnel.length}</strong> personil
              </span>
            </div>

            {/* Personnel Display: Table vs Cards */}
            {filteredPersonnel.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada personil yang sesuai dengan filter atau pencarian "{manpowerSearch}".
              </div>
            ) : manpowerViewMode === 'table' ? (
              /* TABLE VIEW: SORTED BY JABATAN HIERARCHY */
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Personil</th>
                      <th className="py-2.5 px-3">Jabatan Resmi</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Shift & Roster</th>
                      <th className="py-2.5 px-3">Regu</th>
                      <th className="py-2.5 px-3 text-right">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {filteredPersonnel.map((p, idx) => {
                      const badgeStyle = getJabatanBadgeStyle(p.jabatan);
                      return (
                        <tr 
                          key={`${p.nik}_${p.name}`}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                                p.roleCategory === 'staff'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {p.name}
                                </div>
                                <span className="font-mono text-[10px] text-slate-400">{p.nik}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                              {p.jabatan}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                              p.roleCategory === 'staff'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {p.roleCategory}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {p.category === 'pagi' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                              {p.category === 'malam' && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                              {p.category === 'tidak_bertugas' && <Coffee className="w-3.5 h-3.5 text-amber-500" />}
                              <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                                {p.category === 'pagi' ? 'Pagi' : p.category === 'malam' ? 'Malam' : 'Off/Cuti'}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">({p.shiftSchedule})</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                            {p.regu}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${p.badgeColor}`}>
                              {p.keterangan}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* GRID CARDS VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPersonnel.map((p, idx) => {
                  const badgeStyle = getJabatanBadgeStyle(p.jabatan);
                  return (
                    <div
                      key={`${p.nik}_${p.name}`}
                      className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          p.roleCategory === 'staff'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={p.name}>
                              {p.name}
                            </div>
                          </div>
                          <div className="mt-0.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                              {p.jabatan}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono">
                            <span>{p.nik}</span>
                            <span>•</span>
                            <span className="font-sans font-medium text-slate-500">{p.regu}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.badgeColor}`}>
                          {p.keterangan}
                        </span>
                        <span className="block text-[9px] font-mono text-slate-400 mt-1">
                          Roster: {p.shiftSchedule}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Catatan Tambahan Manpower & Perbantuan Section Prep */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Catatan Tambahan Manpower & Perbantuan dari Prep
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Catatan operasional kesiapan personil, rotasi khusus, atau kru perbantuan dari section Preparation pada tanggal {selectedDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const template = `Terdapat perbantuan dari Section Preparation: [Nama Operator] untuk stasiun [Fusion/Weighing/Prep].`;
                    setManpowerNotes(prev => prev ? `${prev}\n${template}` : template);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Template Perbantuan Prep</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveManpowerNotes}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Catatan</span>
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={manpowerNotes}
              onChange={e => setManpowerNotes(e.target.value)}
              placeholder="Tuliskan catatan kehadiran personil lab atau perbantuan dari preparation... (Contoh: '2 personil diperbantukan dari Preparation: Agus & Budi untuk stasiun Fusion Furnace shift pagi.')"
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
                <span className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                Sample Received Per Section (Penerimaan Sampel Masuk)
              </h3>
              <span className="text-xs text-slate-500">
                Total Masuk Hari Ini: <strong className="text-blue-600 font-mono text-sm">{formatNumber(totalReceivedShift)}</strong> sampel • 
                <span className="text-teal-600 dark:text-teal-400 font-mono font-bold ml-1">☀️ Pagi: {formatNumber(totalDayShift)}</span> • 
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold ml-1">🌙 Malam: {formatNumber(totalNightShift)}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSampleViewMode(sampleViewMode === 'cards' ? 'shift_breakdown' : 'cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  sampleViewMode === 'shift_breakdown'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{sampleViewMode === 'shift_breakdown' ? 'Tampilan Ringkas' : 'Komparasi Shift Pagi & Malam'}</span>
              </button>
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
                <span>{showChart2 ? 'Tutup Grafik' : 'Grafik Tren'}</span>
              </button>
            </div>
          </div>

          {showChart2 && <SampleReceivedTrendChart records={records} />}

          {/* ========================================================================= */}
          {/* REALITA HARI INI & MINI TREND CHART: BABAK 2 SAMPLE RECEIVED */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* SISI KIRI: REALITA INTAKE HARI INI */}
            <div className="lg:col-span-8 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              
              {/* Header Status & Shift Distribution */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Kondisi Operasional Hari Ini • {selectedDate}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {formatNumber(totalTbpGpsReceived)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Sampel TBP & GPS (Internal Lab)
                    </span>
                    <TrendDeltaBadge current={totalTbpGpsReceived} prev={prevTotalReceived} unit="spl" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Pagi: {formatNumber(totalDayShift)}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold font-mono flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    Malam: {formatNumber(totalNightShift)}
                  </span>
                </div>
              </div>

              {/* 4 Pilar Seksi Pengirim (Tonjolkan yang aktif > 0) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Pilar Seksi Pengirim Sampel
                  </span>
                  <span className="text-[10px] text-slate-400">
                    *Rincian shift pagi & malam
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* GC */}
                  <div className={`p-3 rounded-2xl border ${gcShift > 0 ? 'bg-teal-50/60 border-teal-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-800">Grade Control</span>
                      <span className="text-[10px] text-slate-500 font-mono">P:{gcDayShift}|M:{gcNightShift}</span>
                    </div>
                    <div className="text-xl font-black font-mono text-teal-900 mt-1">
                      {formatNumber(gcShift)} <span className="text-xs font-normal text-slate-500">spl</span>
                    </div>
                    {gcShift === 0 && <span className="text-[10px] text-slate-400 italic">Nihil / 0 sampel</span>}
                  </div>

                  {/* Production */}
                  <div className={`p-3 rounded-2xl border ${prodShift > 0 ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-800">Production</span>
                      <span className="text-[10px] text-slate-500 font-mono">P:{prodDayShift}|M:{prodNightShift}</span>
                    </div>
                    <div className="text-xl font-black font-mono text-blue-900 mt-1">
                      {formatNumber(prodShift)} <span className="text-xs font-normal text-slate-500">spl</span>
                    </div>
                    {(prodRc > 0 || prodRaTotal > 0) && (
                      <div className="text-[10px] text-blue-700 font-mono mt-0.5">
                        {prodRc > 0 && `RC: ${prodRc}`} {prodRaTotal > 0 && `• RA: ${prodRaTotal}`}
                      </div>
                    )}
                  </div>

                  {/* Exploration */}
                  <div className={`p-3 rounded-2xl border ${expShift > 0 ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-800">Exploration</span>
                      <span className="text-[10px] text-slate-500 font-mono">P:{expDayShift}|M:{expNightShift}</span>
                    </div>
                    <div className="text-xl font-black font-mono text-purple-900 mt-1">
                      {formatNumber(expShift)} <span className="text-xs font-normal text-slate-500">spl</span>
                    </div>
                    {expShift === 0 && <span className="text-[10px] text-slate-400 italic">Nihil / 0 sampel</span>}
                  </div>

                  {/* Smelter */}
                  <div className={`p-3 rounded-2xl border ${smelterShift > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-800">Smelter</span>
                      <span className="text-[10px] text-slate-500 font-mono">P:{smelterDayShift}|M:{smelterNightShift}</span>
                    </div>
                    <div className="text-xl font-black font-mono text-amber-900 mt-1">
                      {formatNumber(smelterShift)} <span className="text-xs font-normal text-slate-500">spl</span>
                    </div>
                    {smelterShift === 0 && <span className="text-[10px] text-slate-400 italic">Nihil / 0 sampel</span>}
                  </div>
                </div>
              </div>

              {/* PT GTS Sister Site (Jika ada sampel) */}
              {totalGtsReceived > 0 && (
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-purple-900">PT GTS (Sister Site):</span>
                    <span className="text-purple-700">Entitas Mandiri (Dikelola Terpisah)</span>
                  </div>
                  <span className="font-mono font-black text-purple-900 text-sm">
                    {formatNumber(totalGtsReceived)} sampel
                  </span>
                </div>
              )}

              {/* Shift Ratio Bar */}
              <ShiftDistributionBar 
                dayVal={totalDayShift} 
                nightVal={totalNightShift} 
                dayLabel="Pagi"
                nightLabel="Malam"
              />

            </div>

            {/* SISI KANAN: MINI TREND CHART 7 HARI (KLIK UNTUK GRAFIK DETAIL) */}
            <div className="lg:col-span-4 flex flex-col">
              <MiniTrendChartCard
                title="Tren Sample Intake"
                unit="spl"
                metricToday={formatNumber(totalTbpGpsReceived)}
                deltaVal={totalTbpGpsReceived - prevTotalReceived}
                unitLabel="vs D-1"
                data={history7Days.map(h => ({ date: h.date, val: h.sampleIntake, label: h.label }))}
                onClick={() => setShowChart2(true)}
              />
            </div>

          </div>

          {/* PER-SHIFT MANAGEMENT BREAKDOWN (Pagi vs Malam) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shift Pagi Card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-teal-200/80 dark:border-teal-900/40 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Shift Pagi (Day Shift)</h4>
                    <span className="text-[10px] text-slate-400">Penerimaan dinas pagi</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-mono text-teal-600 dark:text-teal-400">
                    {formatNumber(totalDayShift)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Total Sampel</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Grade Control</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNumber(gcDayShift)}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Produksi</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNumber(prodDayShift)}</span>
                  {(prodRcDay > 0 || prodRaDay > 0) && (
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 block font-mono">
                      {prodRcDay > 0 && `RC:${prodRcDay} `}
                      {prodRaDay > 0 && `RA:${prodRaDay}`}
                    </span>
                  )}
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Eksplorasi</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNumber(expDayShift)}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Smelter</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNumber(smelterDayShift)}</span>
                </div>
              </div>
            </div>

            {/* Shift Malam Card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Shift Malam (Night Shift)</h4>
                    <span className="text-[10px] text-slate-400">Penerimaan dinas malam</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {formatNumber(totalNightShift)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Total Sampel</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Grade Control</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNumber(gcNightShift)}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Produksi</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNumber(prodNightShift)}</span>
                  {(prodRcNight > 0 || prodRaNight > 0) && (
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block font-mono">
                      {prodRcNight > 0 && `RC:${prodRcNight} `}
                      {prodRaNight > 0 && `RA:${prodRaNight}`}
                    </span>
                  )}
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Eksplorasi</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNumber(expNightShift)}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Smelter</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNumber(smelterNightShift)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Standard Sample Received Cards (Detailed with RC + RA + Wkly) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Grade Control */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  Grade Control (GC)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {formatNumber(gcShift)}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2">
                <span>Pagi: <strong className="font-mono">{formatNumber(gcDayShift)}</strong></span>
                <span>Malam: <strong className="font-mono">{formatNumber(gcNightShift)}</strong></span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                <span>Akumulasi Day: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(gcDay)}</strong></span>
                <span>Wkly: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(gcWkly)}</strong></span>
              </div>
            </div>

            {/* Production (PROD with RC & RA) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Production (PROD)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {formatNumber(prodShift)}
                </span>
                <div className="flex items-center gap-1">
                  {prodRc > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-bold">
                      +{prodRc} RC
                    </span>
                  )}
                  {prodRaTotal > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-mono font-bold">
                      +{prodRaTotal} RA
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2">
                <span>Pagi: <strong className="font-mono">{formatNumber(prodDayShift)}</strong></span>
                <span>Malam: <strong className="font-mono">{formatNumber(prodNightShift)}</strong></span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                <span>Akumulasi Day: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(prodDay)}</strong></span>
                <span>Wkly: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(prodWkly)}</strong></span>
              </div>
            </div>

            {/* Exploration */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Exploration (EXP)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {formatNumber(expShift)}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2">
                <span>Pagi: <strong className="font-mono">{formatNumber(expDayShift)}</strong></span>
                <span>Malam: <strong className="font-mono">{formatNumber(expNightShift)}</strong></span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                <span>Akumulasi Day: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(expDay)}</strong></span>
                <span>Wkly: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(expWkly)}</strong></span>
              </div>
            </div>

            {/* Smelter */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  Smelter
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {formatNumber(smelterShift)}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2">
                <span>Pagi: <strong className="font-mono">{formatNumber(smelterDayShift)}</strong></span>
                <span>Malam: <strong className="font-mono">{formatNumber(smelterNightShift)}</strong></span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                <span>Akumulasi Day: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(smelterDay)}</strong></span>
                <span>Wkly: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(smelterWkly)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PRODUCTIVITY PREPARASI (Standardized 4 Pillars) */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 3) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                Productivity Section Preparasi (Press Powder, Weighing, Fusion, LOI)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Skema: Balance ➔ Received ➔ Finished ➔ Outstanding
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
              <span>{showChart3 ? 'Tutup Grafik' : 'Grafik Tren Preparasi & Backlog'}</span>
            </button>
          </div>

          {showChart3 && <ProductivityPrepTrendChart records={records} />}

          {/* ========================================================================= */}
          {/* REALITA HARI INI & MINI TREND CHART: BABAK 3 PRODUCTIVITY PREPARASI */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* SISI KIRI: REALITA PREPARASI HARI INI */}
            <div className="lg:col-span-8 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              
              {/* Header Status & Shift Distribution */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                    Kondisi Operasional Hari Ini • {selectedDate}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {formatNumber(totalPrepFin)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Unit Diproses di 4 Stasiun Preparasi
                    </span>
                    <TrendDeltaBadge current={totalPrepFin} prev={prevTotalPrepFin} unit="unit" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Pagi: {formatNumber(totalPrepFinDay)}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold font-mono flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    Malam: {formatNumber(totalPrepFinNight)}
                  </span>
                </div>
              </div>

              {/* Status 4 Stasiun Preparasi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Press Powder */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Press Powder</span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {pressBal === 0 ? 'Clear' : `${pressBal} O/S`}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {formatNumber(pressFin)} <span className="text-xs font-normal text-slate-400">pelet</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Selesai dicetak</span>
                </div>

                {/* 2. Weighing */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Weighing</span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {weighBal === 0 ? 'Clear' : `${weighBal} O/S`}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {formatNumber(weighFin)} <span className="text-xs font-normal text-slate-400">cawan</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Ditimbang teliti</span>
                </div>

                {/* 3. Fusion */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Fusion Furnace</span>
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                      {fusionBalAkhir === 0 ? 'Clear' : `${fusionBalAkhir} O/S`}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {formatNumber(fusionFin)} <span className="text-xs font-normal text-slate-400">bead</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Glass bead siap XRF</span>
                </div>

                {/* 4. LOI */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">LOI (Loss Ign.)</span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {loiBal === 0 ? 'Clear' : `${loiBal} O/S`}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {formatNumber(loiFin)} <span className="text-xs font-normal text-slate-400">cawan</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Furnace gravimetri</span>
                </div>
              </div>

              {/* Backlog Alert & Shift Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Sisa Antrean (Backlog):</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded-lg border ${
                    totalPrepBal > 400 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {formatNumber(totalPrepBal)} sampel
                  </span>
                  <TrendDeltaBadge current={totalPrepBal} prev={prevTotalPrepBal} isInverse={true} unit="spl" />
                </div>
              </div>

              <ShiftDistributionBar 
                dayVal={totalPrepFinDay} 
                nightVal={totalPrepFinNight} 
                dayLabel="Pagi"
                nightLabel="Malam"
              />

            </div>

            {/* SISI KANAN: MINI TREND CHART 7 HARI (KLIK UNTUK GRAFIK DETAIL) */}
            <div className="lg:col-span-4 flex flex-col">
              <MiniTrendChartCard
                title="Tren Throughput Preparasi"
                unit="unit"
                metricToday={formatNumber(totalPrepFin)}
                deltaVal={totalPrepFin - prevTotalPrepFin}
                unitLabel="vs D-1"
                data={history7Days.map(h => ({ date: h.date, val: h.prepFinished, label: h.label }))}
                onClick={() => setShowChart3(true)}
              />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3a. Press Powder */}
            <StandardProductivityCard
              title="Press Powder (Pellet)"
              subtitle="Pencetakan pelet serbuk untuk instrumen EDXRF cepat"
              balance={0}
              received={pressRecv}
              finished={pressFin}
              outstanding={pressBal}
              icon={Flame}
              color="sky"
              detailSnippet={
                <span>Rata-rata throughput pelet tercapai {pressFin} unit per shift.</span>
              }
            />

            {/* 3b. Weighing */}
            <StandardProductivityCard
              title="Weighing (Penimbangan)"
              subtitle="Penimbangan akurat sampel eksplorasi untuk peleburan"
              balance={weighOs}
              received={weighRecv}
              finished={weighFin}
              outstanding={weighBal}
              icon={Gauge}
              color="amber"
              detailSnippet={
                <span>Antrean penimbangan berkurang menjadi <strong>{weighBal}</strong> sampel eksplorasi.</span>
              }
            />

            {/* 3c. Fusion (Fuse Bead) */}
            <StandardProductivityCard
              title="Fusion (Bead Peleburan)"
              subtitle="Peleburan manik borat kaca suhu tinggi untuk WDXRF presisi"
              balance={fusionBalAwal}
              received={fusionRecv}
              finished={fusionFin}
              outstanding={fusionBalAkhir}
              icon={Flame}
              color="orange"
              detailSnippet={
                <span>Kecepatan fusion menyeimbangi output penimbangan ({fusionFin} manik selesai).</span>
              }
            />

            {/* 3d. LOI (Loss on Ignition) */}
            <StandardProductivityCard
              title="LOI (Loss on Ignition)"
              subtitle="Pengabuan suhu tinggi furnace workstation W2, W4, W5"
              balance={loiOs}
              received={expShift}
              finished={loiFin}
              outstanding={loiBal}
              icon={Flame}
              color="purple"
              detailSnippet={
                <div className="flex gap-4 pt-1 font-mono text-[11px]">
                  <span>W2: <strong>{loiW2}</strong></span>
                  <span>W4: <strong>{loiW4}</strong></span>
                  <span>W5: <strong>{loiW5}</strong></span>
                  <span className="text-slate-400">| Sisa Saldo: <strong>{loiBal}</strong></span>
                </div>
              }
            />
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
                Skema: Balance ➔ Received ➔ Finished ➔ Outstanding
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
                  <span>Pagi: {edxrfDayShift + tbpGpsDayWdxrf} run</span>
                  <span>•</span>
                  <span>Malam: {edxrfNightShift + tbpGpsNightWdxrf} run</span>
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Beban Shift GTS</span>
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-amber-600 flex items-center gap-1"><Sun className="w-3 h-3" /> Pagi: <strong>{gtsDayRuns}</strong></span>
                  <span className="text-indigo-600 flex items-center gap-1"><Moon className="w-3 h-3" /> Malam: <strong>{gtsNightRuns}</strong></span>
                </div>
                <ShiftDistributionBar dayVal={gtsDayRuns} nightVal={gtsNightRuns} dayLabel="Pagi" nightLabel="Malam" />
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
                Skema: Balance ➔ Received ➔ Finished ➔ Outstanding
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
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Pagi: {formatNumber(reportDayShift)}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold font-mono flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    Malam: {formatNumber(reportNightShift)}
                  </span>
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

              <ShiftDistributionBar 
                dayVal={reportDayShift} 
                nightVal={reportNightShift} 
                dayLabel="Pagi"
                nightLabel="Malam"
              />

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
