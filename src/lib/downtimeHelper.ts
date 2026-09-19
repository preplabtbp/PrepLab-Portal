/**
 * downtimeHelper.ts
 * Unified helper for parsing, computing, and formatting work order downtime.
 */

/**
 * Parses raw downtime string or timestamps into decimal hours (e.g. 2.7, 0.6, 1.0).
 * Handles formats like:
 * - "2 Jam 43 Menit" -> 2 + 43/60 = 2.7
 * - "0 Jam 35 Menit" -> 0 + 35/60 = 0.6
 * - "2.5" / "2,5" -> 2.5
 * - Fallback to: repairEnd - (repairStart || date)
 */
export function parseDowntimeHours(
  raw: any,
  repairStart?: string | Date | null,
  repairEnd?: string | Date | null,
  date?: string | Date | null
): number {
  if (raw != null) {
    const s = String(raw).trim();
    if (s && s !== '0' && s !== '0 Jam 0 Menit' && s !== '-') {
      // 1. Match Indonesian "X Jam Y Menit" or English "X hours Y mins"
      const jamMatch = s.match(/(\d+)\s*(?:jam|hours?|h)/i);
      const menitMatch = s.match(/(\d+)\s*(?:menit|mins?|m)/i);

      if (jamMatch || menitMatch) {
        const hours = jamMatch ? parseInt(jamMatch[1], 10) : 0;
        const mins = menitMatch ? parseInt(menitMatch[1], 10) : 0;
        const total = hours + mins / 60;
        return Math.round(total * 10) / 10;
      }

      // 2. Direct float number (e.g. "2.5" or "2,5")
      const parsed = parseFloat(s.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        return Math.round(parsed * 10) / 10;
      }
    }
  }

  // 3. Fallback: calculate from timestamps
  const start = repairStart || date;
  if (start && repairEnd) {
    const startMs = new Date(start).getTime();
    const endMs = new Date(repairEnd).getTime();
    if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
      const diffMs = endMs - startMs;
      const hours = diffMs / (1000 * 60 * 60);
      return Math.round(hours * 10) / 10;
    }
  }

  return 0;
}

/**
 * Calculates human-readable duration string from start & end dates.
 * e.g. "2 Jam 44 Menit", "0 Jam 35 Menit"
 */
export function formatDowntimeDuration(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  if (!startDate || !endDate) return '-';
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs)) return '-';

  let diffMs = endMs - startMs;
  if (diffMs <= 0) {
    diffMs = 5 * 60 * 1000; // Minimum 5 minutes if instantaneous
  }

  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.round((diffMs % 3600000) / 60000);
  return `${diffHrs} Jam ${diffMins} Menit`;
}
