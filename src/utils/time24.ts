/**
 * time24.ts
 * Utilitas format waktu 24 jam (HH:mm) seragam untuk seluruh PrepLab Portal.
 * Menjamin tidak ada lagi format 12 jam (AM/PM) di seluruh komponen.
 */

export const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
export const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
export const MINUTES_STEP_5 = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

/**
 * Format tanggal / timestamp menjadi string waktu 24 jam "HH:mm".
 * Contoh: 14:05, 09:30, 23:59.
 */
export function formatTime24(dateInput?: Date | string | number | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

/**
 * Format tanggal / timestamp menjadi string waktu 24 jam dengan detik "HH:mm:ss".
 * Contoh: 14:05:22, 09:30:00.
 */
export function formatTime24WithSeconds(dateInput?: Date | string | number | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  } catch {
    return '';
  }
}

/**
 * Format waktu saat ini dalam format 24 jam "HH:mm".
 */
export function getCurrentTime24(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Format tanggal & waktu lengkap dalam 24 jam bahasa Indonesia.
 * Contoh: "20 Okt 2026, 14:30"
 */
export function formatDateTime24(dateInput?: Date | string | number | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = formatTime24(d);
    return `${dateStr}, ${timeStr}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Sanitasi dan normalisasi string waktu input ke "HH:mm".
 * Mendukung format parsial seperti "9", "930", "14:3", dsb.
 */
export function normalizeTime24(raw: string): string {
  const clean = raw.replace(/[^\d:]/g, '');
  if (!clean) return '';

  if (clean.includes(':')) {
    const [hStr, mStr] = clean.split(':');
    let h = parseInt(hStr || '0', 10);
    let m = parseInt(mStr || '0', 10);
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Jika input hanya angka misal "1430" atau "930"
  if (clean.length === 3) {
    const h = Math.min(23, parseInt(clean.slice(0, 1), 10));
    const m = Math.min(59, parseInt(clean.slice(1), 10));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } else if (clean.length >= 4) {
    const h = Math.min(23, parseInt(clean.slice(0, 2), 10));
    const m = Math.min(59, parseInt(clean.slice(2, 4), 10));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return clean;
}
