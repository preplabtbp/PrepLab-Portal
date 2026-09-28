/**
 * Period & Routine Cadence Utilities for Bulletin Activities
 * Supports: Daily, Weekly, Monthly, Quarterly, Biannual, Yearly, Non-Routine
 */

export type RoutineCadence = 
  | 'Non-Routine' 
  | 'Daily' 
  | 'Weekly' 
  | 'Monthly' 
  | 'Quarterly' 
  | 'Biannual' 
  | 'Yearly';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Normalizes any string to a recognized routine cadence
 */
export function normalizeCadence(val?: string | null): RoutineCadence | null {
  if (!val) return null;
  const s = val.toLowerCase().trim();

  if (s.includes('non') || s.includes('ad-hoc') || s.includes('adhoc') || s.includes('insidentil')) {
    return 'Non-Routine';
  }
  if (s.includes('daily') || s.includes('harian')) {
    return 'Daily';
  }
  if (s.includes('week') || s.includes('mingguan')) {
    return 'Weekly';
  }
  if (s.includes('month') || s.includes('bulanan')) {
    return 'Monthly';
  }
  if (s.includes('quarter') || s.includes('triwulan') || s.includes('q1') || s.includes('q2')) {
    return 'Quarterly';
  }
  if (s.includes('biannual') || s.includes('semester') || s.includes('b1') || s.includes('b2')) {
    return 'Biannual';
  }
  if (s.includes('year') || s.includes('annual') || s.includes('tahunan')) {
    return 'Yearly';
  }
  return null;
}

/**
 * Returns true if cadence has predefined periodic sub-titles
 */
export function isPeriodicCadence(cadence: string | null | undefined): boolean {
  const norm = normalizeCadence(cadence);
  return norm === 'Weekly' || norm === 'Monthly' || norm === 'Quarterly' || norm === 'Biannual' || norm === 'Yearly' || norm === 'Daily';
}

/**
 * Get current ISO week number (1 - 53)
 */
export function getCurrentWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Generates available standard sub-period instances for a given cadence and year
 */
export function generateSubPeriods(
  cadence: RoutineCadence | string | null | undefined, 
  targetYear: number = new Date().getFullYear(),
  customPeriods: string[] = []
): string[] {
  const norm = normalizeCadence(cadence);
  const results: string[] = [];

  switch (norm) {
    case 'Weekly': {
      // W1 .. W52 of targetYear
      for (let i = 1; i <= 52; i++) {
        results.push(`W${i} ${targetYear}`);
      }
      break;
    }
    case 'Monthly': {
      // Jan 2026 .. Des 2026
      MONTH_NAMES.forEach((m) => {
        results.push(`${m} ${targetYear}`);
      });
      break;
    }
    case 'Quarterly': {
      // Q1 2026 .. Q4 2026
      for (let i = 1; i <= 4; i++) {
        results.push(`Q${i} ${targetYear}`);
      }
      break;
    }
    case 'Biannual': {
      // B1 2026, B2 2026
      results.push(`B1 ${targetYear}`);
      results.push(`B2 ${targetYear}`);
      break;
    }
    case 'Yearly': {
      // 2023, 2024, 2025, 2026, 2027
      const startY = targetYear - 2;
      for (let y = startY; y <= targetYear + 2; y++) {
        results.push(`${y}`);
      }
      break;
    }
    case 'Daily': {
      // Current day and recent 6 days
      const now = new Date();
      for (let offset = -6; offset <= 0; offset++) {
        const d = new Date(now);
        d.setDate(now.getDate() + offset);
        const dayStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        results.push(dayStr);
      }
      break;
    }
    default:
      break;
  }

  // Add any custom sub-periods stored for this topic that aren't in the default set
  customPeriods.forEach(cp => {
    if (cp && !results.includes(cp)) {
      results.unshift(cp);
    }
  });

  return results;
}

/**
 * Returns the default active sub-period for today's date
 */
export function getDefaultActiveSubPeriod(
  cadence: RoutineCadence | string | null | undefined, 
  currentDate: Date = new Date()
): string {
  const norm = normalizeCadence(cadence);
  const year = currentDate.getFullYear();

  switch (norm) {
    case 'Weekly': {
      const w = getCurrentWeekNumber(currentDate);
      return `W${w} ${year}`;
    }
    case 'Monthly': {
      const mIdx = currentDate.getMonth();
      return `${MONTH_NAMES[mIdx]} ${year}`;
    }
    case 'Quarterly': {
      const q = Math.floor(currentDate.getMonth() / 3) + 1;
      return `Q${q} ${year}`;
    }
    case 'Biannual': {
      const b = currentDate.getMonth() < 6 ? 1 : 2;
      return `B${b} ${year}`;
    }
    case 'Yearly': {
      return `${year}`;
    }
    case 'Daily': {
      return currentDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    default:
      return '';
  }
}
