// Sertifikasi K3 & Kompetensi (Training External) — jenis sertifikat, masa berlaku & status expired.

export type CertType = 'iso_17025' | 'ahli_k3_kimia' | 'petugas_k3_kimia' | 'proteksi_radiasi' | 'teknisi_k3_listrik' | 'juru_las_3';

export interface CertMeta {
  type: CertType;
  title: string;
  /** Masa berlaku sertifikat dalam tahun (null = belum diketahui) */
  validYears: number | null;
  issuer: string;
  /** Warna header grup (mengikuti file rekap sumber) */
  color: string;
}

export const CERT_TYPES: CertMeta[] = [
  { type: 'iso_17025', title: 'ISO 17025 : 2017 Sistem Manajemen Laboratorium', validYears: 3, issuer: 'BSN / KAN', color: '#fef08a' },
  { type: 'ahli_k3_kimia', title: 'Ahli K3 Kimia', validYears: 3, issuer: 'Kemenaker', color: '#fefce8' },
  { type: 'petugas_k3_kimia', title: 'Petugas K3 Kimia', validYears: 5, issuer: 'Kemenaker', color: '#e5e7eb' },
  { type: 'proteksi_radiasi', title: 'Petugas Proteksi Radiasi', validYears: 5, issuer: 'BAPETEN', color: '#a5f3fc' },
  { type: 'teknisi_k3_listrik', title: 'Teknisi K3 Listrik', validYears: 3, issuer: 'Kemenaker', color: '#d9f99d' },
  { type: 'juru_las_3', title: 'Juru Las Kelas III', validYears: null, issuer: 'Kemenaker', color: '#d9f99d' },
];
export const CERT_META: Record<CertType, CertMeta> = Object.fromEntries(CERT_TYPES.map(c => [c.type, c])) as Record<CertType, CertMeta>;
export const isCertType = (v: unknown): v is CertType => typeof v === 'string' && v in CERT_META;

export interface TrainingCertification {
  id: number;
  certType: CertType;
  nik: string | null;
  nama: string;
  jabatan: string | null;
  pt: string | null;
  tanggal: string | null;
  keterangan: string | null;
  expired: string | null;
  note: string | null;
}

/** Tanggal expired otomatis = tanggal training + masa berlaku (bila tanggal expired belum diisi) */
export function defaultCertExpired(type: CertType, tanggal: string | null | undefined): string | null {
  const years = CERT_META[type]?.validYears;
  if (!years || !tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null;
  const [y, m, d] = tanggal.split('-').map(Number);
  return `${y + years}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export type CertStatus = 'active' | 'soon' | 'expired' | 'unknown';
/** Status masa berlaku terhadap tanggal hari ini (YYYY-MM-DD). "Warning" (Segera Expired) = ≤ 365 hari (1 tahun) lagi. */
export function certStatus(expired: string | null | undefined, today: string): { status: CertStatus; daysLeft: number | null } {
  if (!expired) return { status: 'unknown', daysLeft: null };
  const cleanExp = String(expired).trim().replace(/\//g, '-');
  const m = cleanExp.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return { status: 'unknown', daysLeft: null };
  const expIso = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  const daysLeft = Math.round((Date.parse(expIso) - Date.parse(today)) / 86400000);
  return { status: daysLeft < 0 ? 'expired' : daysLeft <= 365 ? 'soon' : 'active', daysLeft };
}


/** Tanggal mulai Warning = 1 tahun sebelum tanggal expired (YYYY-MM-DD) */
export function certWarningDate(expired: string | null | undefined): string | null {
  if (!expired) return null;
  const cleanExp = String(expired).trim().replace(/\//g, '-');
  const m = cleanExp.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const y = parseInt(m[1], 10) - 1;
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month === 2 && day === 29) {
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    return `${y}-02-${isLeap ? '29' : '28'}`;
  }
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}