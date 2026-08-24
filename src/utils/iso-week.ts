/**
 * ISO 8601 Week Utilities for PrepLab Dashboards & Work Orders (Unified TBP & GPS)
 * In ISO 8601, weeks start on Monday, and Week 1 is the week with the first Thursday of the year.
 */

export function parseDateSafe(date: Date | string | number | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

export function getISOWeek(dateInput: Date | string | number): number {
  const d = parseDateSafe(dateInput);
  if (!d) return 1;
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNr);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getISOWeekYear(dateInput: Date | string | number): number {
  const d = parseDateSafe(dateInput);
  if (!d) return new Date().getFullYear();
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNr);
  return target.getUTCFullYear();
}

export function getISOWeekRange(year: number, week: number): { start: Date; end: Date; label: string } {
  // Find Thursday of week 1
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - (simple.getUTCDay() || 7) + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }

  const start = new Date(ISOweekStart.getUTCFullYear(), ISOweekStart.getUTCMonth(), ISOweekStart.getUTCDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const endStr = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const label = `Minggu ${String(week).padStart(2, '0')} (${startStr} - ${endStr})`;

  return { start, end, label };
}

export function isDateInISOWeek(dateInput: Date | string | number, targetYear: number, targetWeek: number): boolean {
  const d = parseDateSafe(dateInput);
  if (!d) return false;
  const w = getISOWeek(d);
  const y = getISOWeekYear(d);
  return w === targetWeek && y === targetYear;
}

export function isThisISOWeek(dateInput: Date | string | number): boolean {
  const now = new Date();
  return isDateInISOWeek(dateInput, getISOWeekYear(now), getISOWeek(now));
}

export function isLastISOWeek(dateInput: Date | string | number): boolean {
  const now = new Date();
  const lastWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return isDateInISOWeek(dateInput, getISOWeekYear(lastWeekDate), getISOWeek(lastWeekDate));
}

export function formatISOWeekLabel(dateInput: Date | string | number): string {
  const d = parseDateSafe(dateInput);
  if (!d) return '-';
  const w = getISOWeek(d);
  const y = getISOWeekYear(d);
  return `W${String(w).padStart(2, '0')} (${y})`;
}

/**
 * Returns options for dropdown select (e.g. current week, last week, and all individual ISO weeks for this year)
 */
export function getISOWeekFilterOptions(year: number = new Date().getFullYear()): Array<{ value: string; label: string }> {
  const currentWeek = getISOWeek(new Date());
  const options: Array<{ value: string; label: string }> = [
    { value: 'all', label: '📅 Semua Waktu' },
    { value: 'this_iso_week', label: `⚡ Minggu Ini (W${String(currentWeek).padStart(2, '0')})` },
    { value: 'last_iso_week', label: `⏮️ Minggu Lalu (W${String(Math.max(1, currentWeek - 1)).padStart(2, '0')})` },
    { value: 'this_month', label: '🗓️ Bulan Ini' },
    { value: 'last_30_days', label: '⏱️ 30 Hari Terakhir' },
    { value: 'this_year', label: `📆 Tahun Ini (${year})` },
    { value: 'custom', label: '🎯 Rentang Tanggal Kustom...' }
  ];

  return options;
}

export function getYearISOWeeksList(year: number = new Date().getFullYear()): Array<{ value: string; label: string; week: number; year: number }> {
  const list = [];
  const currentWeek = getISOWeek(new Date());

  for (let w = 53; w >= 1; w--) {
    const range = getISOWeekRange(year, w);
    // Include week if valid
    const isCurrent = w === currentWeek && year === new Date().getFullYear();
    list.push({
      value: `iso_${year}_${w}`,
      label: `Minggu ${String(w).padStart(2, '0')} [${range.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${range.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}]${isCurrent ? ' • (Minggu Ini)' : ''}`,
      week: w,
      year
    });
  }
  return list;
}
