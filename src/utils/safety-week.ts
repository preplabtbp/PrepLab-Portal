import { getISOWeek, getISOWeekYear, getISOWeekRange } from './iso-week';

export interface Period {
  start: Date;
  end: Date;
}

export const MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Periode rekap Safety: Sabtu – Jumat berikutnya.
 * Week N = Sabtu di minggu ISO N s/d Jumat di minggu ISO N+1 (contoh 2026: W42 = 17 – 23 Okt).
 */
export function getRekapWeekRange(year: number, week: number): Period {
  const iso = getISOWeekRange(year, week);
  const start = new Date(iso.start);
  start.setDate(start.getDate() + 5);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Week rekap untuk suatu tanggal (Sabtu ikut week ISO yang sama, Senin–Jumat ikut week ISO sebelumnya).
 */
export function getRekapWeek(date: Date): { week: number; year: number } {
  const d = new Date(date);
  d.setDate(d.getDate() - 5);
  return { week: getISOWeek(d), year: getISOWeekYear(d) };
}

export interface SafetyWeekOption {
  value: string;
  label: string;
  isCurrent?: boolean;
}

/**
 * Membangun opsi dropdown Week rekap safety yang seragam di seluruh modul (Tabel Rekap & Detail/Group Report)
 */
export function buildSafetyWeekOptions(year: number, currentWeek: number): SafetyWeekOption[] {
  const options: SafetyWeekOption[] = [];
  const start = Math.max(1, currentWeek - 8);
  const end = Math.min(53, currentWeek + 1);
  for (let w = end; w >= start; w--) {
    const { start: s, end: e } = getRekapWeekRange(year, w);
    const startStr = `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]}`;
    const endStr = `${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`;
    const isCurrent = w === currentWeek;
    options.push({
      value: `W${w}`,
      label: `Week ${w} (${startStr} - ${endStr})${isCurrent ? ' [Aktif]' : ''}`,
      isCurrent
    });
  }
  return options;
}

export function parseLocalDate(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function inPeriod(v: any, period: Period): boolean {
  const d = parseLocalDate(v);
  return !!d && d >= period.start && d <= period.end;
}

export function mergeRekapLists(lists: any[][]): any[] {
  const map = new Map<string, any>();
  lists.flat().forEach(emp => {
    const key = (emp.nik || emp.name || '').toString().trim().toUpperCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...emp, _sources: [emp] });
      return;
    }
    const reports = [...(prev.reports || []), ...(emp.reports || [])];
    const seen = new Set<string>();
    const manual = (e: any) => e.isManualOverride && e.status === 'SUDAH';
    const isSudah = (e: any) => e.status === 'SUDAH';
    const takeNew = (isSudah(emp) && !isSudah(prev)) || (manual(emp) && !manual(prev));
    map.set(key, {
      ...prev,
      ...(takeNew ? {
        status: emp.status,
        checkDetails: emp.checkDetails,
        completedAt: emp.completedAt,
        pdfTitle: emp.pdfTitle,
        ssUrl: emp.ssUrl,
        pdfUrl: emp.pdfUrl,
        isManualOverride: emp.isManualOverride,
      } : {}),
      reports: reports.filter(r => {
        const id = String(r.id ?? `${r.reportType}-${r.timestamp}`);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      }),
      _sources: [...prev._sources, emp]
    });
  });
  return Array.from(map.values());
}
