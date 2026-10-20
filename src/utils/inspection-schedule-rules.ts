import { INSPECTION_29_AGENDAS } from './inspection-pic-matcher';

// Aturan penyusunan Jadwal Inspeksi mingguan (dipakai server untuk acak & layar untuk validasi edit manual).
// ID agenda mengikuti INSPECTION_29_AGENDAS di inspection-pic-matcher.ts.

export type ShiftGroup = 'Malam' | 'Siang';

export interface PlanMember {
  nik: string;
  name: string;
  jabatan: string;
  section: string;
  gol: string;
  team: string; // 'A' | 'B' | 'Nonshift' (kolom Shift di roster)
  shiftGroup: ShiftGroup | 'Nonshift' | null; // dari kode roster Senin – Rabu (N = Malam, D/LS = Siang)
  agendaId: number | null; // null = tidak dijadwalkan
  roleIndex: number; // 1 = inspektor utama, 2+ = pendamping
  isCuti: boolean;
  codes?: string[]; // kode roster Senin – Rabu
}

// Shift per agenda (kolom "Jadwal Inspeksi (Baru)" di Google Sheet jadwal)
export const DEFAULT_AGENDA_SHIFT: Record<number, ShiftGroup> = {
  1: 'Siang', 2: 'Siang', 3: 'Malam', 4: 'Siang',
  5: 'Siang', 6: 'Siang', 7: 'Siang', 8: 'Siang', 9: 'Siang',
  10: 'Siang', 11: 'Siang', 12: 'Siang', 13: 'Siang', 14: 'Malam', 15: 'Siang', 16: 'Malam', 17: 'Siang', 18: 'Siang',
  19: 'Malam', 20: 'Malam', 21: 'Malam', 22: 'Malam', 23: 'Siang', 24: 'Malam', 25: 'Siang', 26: 'Siang', 27: 'Malam',
  28: 'Malam', 29: 'Malam'
};

// Agenda APD per tim shift: shift kartu mengikuti tim (mis. Shift B sedang N di roster → APD B diisi karyawan Malam)
export const APD_TEAM_AGENDAS: Record<number, 'A' | 'B'> = { 13: 'A', 14: 'B', 23: 'A', 24: 'B' };

// Agenda yang dilarang untuk karyawan Gol III – V
export const GOL_RESTRICTED_AGENDAS = new Set([23, 24, 13, 14, 2, 17, 18, 3, 4]);
const SENIOR_GOL = new Set(['III', 'IV', 'V']);

// Inspeksi Harian Pra Pakai Tabung Gas Bertekanan: hanya Section Laboratory, Shift Siang / Nonshift
export const LAB_ONLY_AGENDA = 18;

// Batas jumlah petugas per agenda (agenda lain tidak dibatasi): masing-masing hanya 1 orang
export const AGENDA_MAX_MEMBERS: Record<number, number> = {
  2: 1, // Kepatuhan Alat Pelindung Diri - Maintenance
  3: 1, // Inspeksi Perkakas Tangan Portabel
  4: 1, // Inspeksi Bulanan Tangga Portabel
  [LAB_ONLY_AGENDA]: 1 // Inspeksi Harian Pra Pakai Tabung Gas Bertekanan
};

export function agendaCapacity(agendaId: number): number {
  return AGENDA_MAX_MEMBERS[agendaId] ?? Infinity;
}

export function isLabSection(section: string): boolean {
  return /^lab/i.test((section || '').trim());
}

export function isSeniorGol(gol: string): boolean {
  return SENIOR_GOL.has((gol || '').trim().toUpperCase());
}

// Kelompok acak: Siang digabung dengan Nonshift
export function poolOf(m: Pick<PlanMember, 'shiftGroup'>): ShiftGroup {
  return m.shiftGroup === 'Malam' ? 'Malam' : 'Siang';
}

export function agendaName(id: number | null | undefined): string {
  return INSPECTION_29_AGENDAS.find(a => a.id === id)?.name || '';
}

// Nama ringkas untuk tabel rekap per karyawan
export function agendaShortName(id: number | null | undefined): string {
  const name = agendaName(id);
  return name
    .replace(/^Inspeksi Umum Terencana (Area Kerja )?/i, '')
    .replace(/^Kepatuhan Alat Pelindung Diri - /i, 'APD ')
    .replace(/^Checklist Isi Kotak /i, '')
    .replace(/^Inspeksi (Harian |Bulanan )?/i, '')
    .replace(/^Formulir /i, '')
    .trim();
}

// Aturan wajib: alasan seorang karyawan dilarang mengisi agenda (null = boleh)
export function ruleError(m: Pick<PlanMember, 'gol' | 'section' | 'shiftGroup'>, agendaId: number): string | null {
  if (GOL_RESTRICTED_AGENDAS.has(agendaId) && isSeniorGol(m.gol)) {
    return `Gol ${m.gol} dilarang mengisi "${agendaShortName(agendaId)}"`;
  }
  if (agendaId === LAB_ONLY_AGENDA) {
    if (!isLabSection(m.section)) return 'Pra Pakai Tabung Gas hanya untuk karyawan Section Laboratory';
    if (m.shiftGroup === 'Malam') return 'Pra Pakai Tabung Gas hanya untuk Shift Siang / Nonshift';
  }
  return null;
}

// Peringatan (boleh disimpan): shift karyawan berbeda dengan shift agenda
export function shiftMismatch(m: Pick<PlanMember, 'shiftGroup'>, agendaShift: ShiftGroup): string | null {
  return poolOf(m) !== agendaShift ? `Agenda Shift ${agendaShift}, karyawan Shift ${m.shiftGroup || '-'}` : null;
}
