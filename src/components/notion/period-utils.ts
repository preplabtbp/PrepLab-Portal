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

/**
 * Calculates the subsequent/next sub-period based on current period and cadence
 * e.g., '2026' -> '2027' (Yearly)
 * 'Sep 2026' -> 'Okt 2026' (Monthly)
 * 'Des 2026' -> 'Jan 2027' (Monthly)
 * 'W39 2026' -> 'W40 2026' (Weekly)
 * 'W52 2026' -> 'W1 2027' (Weekly)
 * 'Q3 2026' -> 'Q4 2026' (Quarterly)
 * 'B1 2026' -> 'B2 2026' (Biannual)
 */
export function getNextSubPeriod(
  currentPeriod: string,
  cadence: RoutineCadence | string | null | undefined
): string {
  const norm = normalizeCadence(cadence);
  const cur = (currentPeriod || '').trim();

  if (norm === 'Yearly') {
    const match = cur.match(/\b(20\d\d)\b/);
    const yr = match ? parseInt(match[1], 10) : new Date().getFullYear();
    return `${yr + 1}`;
  }

  if (norm === 'Monthly') {
    const monthMatch = cur.match(/([a-zA-Z]{3,4})\s*(20\d\d)/i);
    if (monthMatch) {
      const mName = monthMatch[1].toLowerCase();
      let yr = parseInt(monthMatch[2], 10);
      let idx = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(mName.substring(0, 3)));
      if (idx === -1) idx = new Date().getMonth();
      if (idx === 11) {
        idx = 0;
        yr += 1;
      } else {
        idx += 1;
      }
      return `${MONTH_NAMES[idx]} ${yr}`;
    }
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return getDefaultActiveSubPeriod('Monthly', nextMonth);
  }

  if (norm === 'Weekly') {
    const weekMatch = cur.match(/W(\d+)\s*(20\d\d)/i);
    if (weekMatch) {
      let wNum = parseInt(weekMatch[1], 10);
      let yr = parseInt(weekMatch[2], 10);
      if (wNum >= 52) {
        wNum = 1;
        yr += 1;
      } else {
        wNum += 1;
      }
      return `W${wNum} ${yr}`;
    }
    const now = new Date();
    now.setDate(now.getDate() + 7);
    return getDefaultActiveSubPeriod('Weekly', now);
  }

  if (norm === 'Quarterly') {
    const qMatch = cur.match(/Q(\d)\s*(20\d\d)/i);
    if (qMatch) {
      let qNum = parseInt(qMatch[1], 10);
      let yr = parseInt(qMatch[2], 10);
      if (qNum >= 4) {
        qNum = 1;
        yr += 1;
      } else {
        qNum += 1;
      }
      return `Q${qNum} ${yr}`;
    }
    const now = new Date();
    now.setMonth(now.getMonth() + 3);
    return getDefaultActiveSubPeriod('Quarterly', now);
  }

  if (norm === 'Biannual') {
    const bMatch = cur.match(/B(\d)\s*(20\d\d)/i);
    if (bMatch) {
      let bNum = parseInt(bMatch[1], 10);
      let yr = parseInt(bMatch[2], 10);
      if (bNum >= 2) {
        bNum = 1;
        yr += 1;
      } else {
        bNum += 1;
      }
      return `B${bNum} ${yr}`;
    }
    const now = new Date();
    now.setMonth(now.getMonth() + 6);
    return getDefaultActiveSubPeriod('Biannual', now);
  }

  if (norm === 'Daily') {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    return now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return getDefaultActiveSubPeriod(norm);
}

/**
 * Calculates the next default target date (ISO format 'YYYY-MM-DD')
 * from an optional existing date string or current date
 */
export function getNextDefaultTargetDate(
  cadence: RoutineCadence | string | null | undefined,
  baseDateStr?: string | null
): string {
  const norm = normalizeCadence(cadence);
  let base = new Date();
  if (baseDateStr) {
    const parsed = new Date(baseDateStr);
    if (!isNaN(parsed.getTime())) {
      base = parsed;
    }
  }

  const next = new Date(base);
  switch (norm) {
    case 'Yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'Monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'Weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'Quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'Biannual':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'Daily':
    default:
      next.setDate(next.getDate() + 1);
      break;
  }

  return next.toISOString().split('T')[0];
}

export interface NextPeriodSchedule {
  nextPeriod: string;
  nextStartDate: string; // 'YYYY-MM-DD' - Tanggal mulai periode baru (kapan pertama kali muncul di planning)
  nextTargetDate: string; // 'YYYY-MM-DD' - Target selesai periode baru
}

/**
 * Calculates next period label, start date (first day it appears in planning kerja),
 * and target date according to routine rules:
 * - Daily: starts tomorrow (+1 day), targets tomorrow
 * - Weekly: starts on the FIRST DAY of next week (Monday/Senin), targets Sunday
 * - Monthly: starts on the FIRST DAY of next month (1st), targets last day of month
 * - Quarterly: starts on 1st day of next quarter, targets last day of quarter
 * - Biannual: starts on 1st day of next semester, targets last day of semester
 * - Yearly: starts on Jan 1st of next year, targets Dec 31st of next year
 */
export function getNextPeriodSchedule(
  cadence: RoutineCadence | string | null | undefined,
  currentPeriod?: string | null,
  baseDateStr?: string | null
): NextPeriodSchedule {
  const norm = normalizeCadence(cadence) || 'Daily';
  let base = new Date();
  if (baseDateStr) {
    const parsed = new Date(baseDateStr.includes('T') ? baseDateStr : `${baseDateStr}T12:00:00`);
    if (!isNaN(parsed.getTime())) {
      base = parsed;
    }
  }

  const nextPeriodLabel = getNextSubPeriod(currentPeriod, norm);

  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let nextStartDate = '';
  let nextTargetDate = '';

  switch (norm) {
    case 'Daily': {
      const nextDay = new Date(base);
      nextDay.setDate(base.getDate() + 1);
      nextStartDate = formatYMD(nextDay);
      nextTargetDate = nextStartDate;
      break;
    }

    case 'Weekly': {
      // First day of next week: Monday (Senin)
      const dayOfWeek = base.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
      const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = new Date(base);
      nextMonday.setDate(base.getDate() + daysUntilNextMonday);
      nextStartDate = formatYMD(nextMonday);

      // Target date: Sunday of that week (+6 days from Monday)
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      nextTargetDate = formatYMD(nextSunday);
      break;
    }

    case 'Monthly': {
      // First day of next month: Tanggal 1 bulan berikutnya
      const nextMonthFirst = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      nextStartDate = formatYMD(nextMonthFirst);

      // Target date: Last day of that next month
      const nextMonthLast = new Date(base.getFullYear(), base.getMonth() + 2, 0);
      nextTargetDate = formatYMD(nextMonthLast);
      break;
    }

    case 'Quarterly': {
      const curQuarter = Math.floor(base.getMonth() / 3);
      const nextQuarterFirst = new Date(base.getFullYear(), (curQuarter + 1) * 3, 1);
      nextStartDate = formatYMD(nextQuarterFirst);

      const nextQuarterLast = new Date(nextQuarterFirst.getFullYear(), nextQuarterFirst.getMonth() + 3, 0);
      nextTargetDate = formatYMD(nextQuarterLast);
      break;
    }

    case 'Biannual': {
      const curSem = base.getMonth() < 6 ? 0 : 1;
      const nextSemFirst = new Date(base.getFullYear(), (curSem + 1) * 6, 1);
      nextStartDate = formatYMD(nextSemFirst);

      const nextSemLast = new Date(nextSemFirst.getFullYear(), nextSemFirst.getMonth() + 6, 0);
      nextTargetDate = formatYMD(nextSemLast);
      break;
    }

    case 'Yearly': {
      const nextYearFirst = new Date(base.getFullYear() + 1, 0, 1);
      nextStartDate = formatYMD(nextYearFirst);

      const nextYearLast = new Date(base.getFullYear() + 1, 11, 31);
      nextTargetDate = formatYMD(nextYearLast);
      break;
    }

    default: {
      const nextDay = new Date(base);
      nextDay.setDate(base.getDate() + 1);
      nextStartDate = formatYMD(nextDay);
      nextTargetDate = nextStartDate;
      break;
    }
  }

  return {
    nextPeriod: nextPeriodLabel,
    nextStartDate,
    nextTargetDate
  };
}

/**
 * Resets all checklist items in a markdown text to unchecked (- [ ])
 * and strips any checked date annotations
 */
export function resetAllTasklistItems(text?: string | null): string {
  if (!text) return '';
  return text
    // Replace [x] or [X] with [ ]
    .replace(/^(\s*[-*•]?\s*\[)[xX](\]\s*)/gm, '$1 $2')
    // Remove checkedDate comments: <!--checkedDate:YYYY-MM-DD-->
    .replace(/<!--\s*checkedDate:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\s*-->/gi, '')
    // Remove {date:YYYY-MM-DD} or {checked:YYYY-MM-DD} tags
    .replace(/\{(?:checked|date):\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\}/gi, '')
    .trim();
}

/**
 * Detects the sub-period of a row from its date fields or title
 */
export function detectRowSubPeriod(
  row: Record<string, any>,
  cadence: RoutineCadence | string | null | undefined
): string | null {
  if (!row || !cadence) return null;
  const norm = normalizeCadence(cadence);
  if (!norm) return null;

  // Search through row fields for date-like or year-like values
  const dateCandidateKeys = [
    'target selesai', 'target date', 'target', 'deadline', 
    'tanggal selesai', 'tanggal', 'created time', 'tanggal dibuat', 
    'waktu', 'period', 'periode'
  ];

  for (const [key, val] of Object.entries(row)) {
    if (!val || typeof val !== 'string') continue;
    const kLower = key.toLowerCase().trim();
    if (dateCandidateKeys.some(cand => kLower.includes(cand))) {
      // Check 4-digit year directly
      const yrMatch = val.match(/\b(20\d\d)\b/);
      if (yrMatch) {
        if (norm === 'Yearly') {
          return yrMatch[1];
        }
      }

      // Check standard date
      const d = new Date(val);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) {
        return getDefaultActiveSubPeriod(norm, d);
      }
    }
  }

  return null;
}

/**
 * Dynamically discovers only the sub-periods that are assigned, discussed,
 * or explicitly created for this specific topic (NO hardcoded multi-year ranges).
 */
export function getTopicSubPeriods(
  baseTopicTitle: string,
  row: Record<string, any> | null | undefined,
  cadence: RoutineCadence | string | null | undefined,
  allComments: Array<{ topicTitle?: string }> = [],
  customList: string[] = []
): string[] {
  const norm = normalizeCadence(cadence);
  if (!norm) return [];

  const foundPeriods = new Set<string>();

  // 1. From the row itself (its target/created date)
  if (row) {
    const rowPeriod = detectRowSubPeriod(row, norm);
    if (rowPeriod) {
      foundPeriods.add(rowPeriod);
    }
  }

  // 2. From existing comments in the discussion drawer
  if (baseTopicTitle && allComments && allComments.length > 0) {
    const baseClean = baseTopicTitle.toLowerCase().trim();
    const prefix = `${baseClean} - `;
    allComments.forEach(c => {
      const t = (c.topicTitle || '').trim();
      const tLower = t.toLowerCase();
      if (tLower.startsWith(prefix)) {
        const sub = t.substring(prefix.length).trim();
        if (sub) {
          foundPeriods.add(sub);
        }
      }
    });
  }

  // 3. From custom/rollover periods for this topic
  if (customList && customList.length > 0) {
    customList.forEach(cp => {
      if (cp && cp.trim()) {
        foundPeriods.add(cp.trim());
      }
    });
  }

  // 4. If none found, fallback to current active period for today
  if (foundPeriods.size === 0) {
    const defaultCur = getDefaultActiveSubPeriod(norm, new Date());
    if (defaultCur) {
      foundPeriods.add(defaultCur);
    }
  }

  // Sort logically (e.g. 2026, 2027 or W1, W2)
  const result = Array.from(foundPeriods);
  result.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return result;
}
