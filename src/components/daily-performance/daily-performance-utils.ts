import { DailyPerformanceRecord } from './daily-performance-types';

export const STORAGE_KEY_DAILY_PERFORMANCE = 'preplab_daily_performance_records_v2';

export function getStoredRecords(initialFallback: DailyPerformanceRecord[]): DailyPerformanceRecord[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_DAILY_PERFORMANCE);
    
    // Auto-migration from v1 if v2 not yet present
    if (!raw) {
      const rawV1 = localStorage.getItem('preplab_daily_performance_records_v1');
      if (rawV1) {
        try {
          const parsedV1 = JSON.parse(rawV1);
          if (Array.isArray(parsedV1) && parsedV1.length > 0) {
            const hasSeptember = parsedV1.some(r => r.date && r.date.includes('/09/2026'));
            const septemberRecs = initialFallback.filter(r => r.date && r.date.includes('/09/2026'));
            const merged = hasSeptember ? parsedV1 : [...septemberRecs, ...parsedV1];
            merged.sort((a, b) => a.isoDate.localeCompare(b.isoDate) || (a.shiftType === 'DAY' ? -1 : 1));
            localStorage.setItem(STORAGE_KEY_DAILY_PERFORMANCE, JSON.stringify(merged));
            return merged;
          }
        } catch (migErr) {
          console.warn('Could not migrate daily performance v1 records:', migErr);
        }
      }
      localStorage.setItem(STORAGE_KEY_DAILY_PERFORMANCE, JSON.stringify(initialFallback));
      return initialFallback;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure September records are present if cache was created before September update
      const hasSeptember = parsed.some(r => r.date && r.date.includes('/09/2026'));
      if (!hasSeptember) {
        const septemberRecs = initialFallback.filter(r => r.date && r.date.includes('/09/2026'));
        const merged = [...septemberRecs, ...parsed];
        merged.sort((a, b) => a.isoDate.localeCompare(b.isoDate) || (a.shiftType === 'DAY' ? -1 : 1));
        localStorage.setItem(STORAGE_KEY_DAILY_PERFORMANCE, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error reading daily performance records from localStorage', e);
  }
  return initialFallback;
}

export function saveStoredRecords(records: DailyPerformanceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DAILY_PERFORMANCE, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving daily performance records', e);
  }
}

export interface DailyKPISummary {
  totalReceived: number;
  totalReceivedExp: number;
  totalReceivedProd: number;
  totalEdxrfRun: number;
  totalWdxrfRun: number;
  totalZetiumA: number;
  totalZetiumB: number;
  totalReportReleased: number;
  totalManpowerPresent: number;
  totalManpowerPlanned: number;
  manpowerAttendanceRate: number;
  activeBottleneck: {
    station: string;
    backlog: number;
    severity: 'normal' | 'warning' | 'critical';
  };
}

export function calculateSummaryKPIs(records: DailyPerformanceRecord[]): DailyKPISummary {
  let totalReceived = 0;
  let totalReceivedExp = 0;
  let totalReceivedProd = 0;
  let totalEdxrfRun = 0;
  let totalZetiumA = 0;
  let totalZetiumB = 0;
  let totalReportReleased = 0;
  let staffPresent = 0;
  let crewPresent = 0;
  let staffTotal = 0;
  let crewTotal = 0;

  let latestFuseBal = 0;
  let latestLoiBal = 0;
  let latestWdxrfBal = 0;
  let latestQcBal = 0;
  let latestReportBal = 0;

  // Sort by date ascending to get latest balances
  const sorted = [...records].sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  sorted.forEach(r => {
    totalReceived += (r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift + r.sampleReceived.smelter.shift);
    totalReceivedExp += r.sampleReceived.exp.shift;
    totalReceivedProd += r.sampleReceived.prod.shift;
    totalEdxrfRun += r.edxrf.shift;
    totalZetiumA += r.wdxrf.zetiumA.total;
    totalZetiumB += r.wdxrf.zetiumB.total;
    totalReportReleased += r.report.finishReportDay;

    staffPresent += r.manpower.staff.shift;
    staffTotal += r.manpower.staff.total;
    crewPresent += r.manpower.crew.shift;
    crewTotal += r.manpower.crew.total;

    if (r.fuseBead.balExp > 0) latestFuseBal = r.fuseBead.balExp;
    if (r.loi.bal > 0) latestLoiBal = r.loi.bal;
    if (r.wdxrf.bal > 0) latestWdxrfBal = r.wdxrf.bal;
    if (r.qc.bal > 0) latestQcBal = r.qc.bal;
    if (r.report.bal > 0) latestReportBal = r.report.bal;
  });

  const totalManpowerPresent = staffPresent + crewPresent;
  const totalManpowerPlanned = staffTotal + crewTotal;
  const manpowerAttendanceRate = totalManpowerPlanned > 0
    ? Math.round((totalManpowerPresent / totalManpowerPlanned) * 100)
    : 100;

  // Determine biggest bottleneck
  const backlogs = [
    { station: 'WDXRF Backlog', backlog: latestWdxrfBal },
    { station: 'Fuse Bead Bal', backlog: latestFuseBal },
    { station: 'LOI Backlog', backlog: latestLoiBal },
    { station: 'QC Backlog', backlog: latestQcBal },
    { station: 'Report Release Bal', backlog: latestReportBal },
  ];
  backlogs.sort((a, b) => b.backlog - a.backlog);

  const topBottleneck = backlogs[0] || { station: 'None', backlog: 0 };
  let severity: 'normal' | 'warning' | 'critical' = 'normal';
  if (topBottleneck.backlog > 400) severity = 'critical';
  else if (topBottleneck.backlog > 200) severity = 'warning';

  return {
    totalReceived,
    totalReceivedExp,
    totalReceivedProd,
    totalEdxrfRun,
    totalWdxrfRun: totalZetiumA + totalZetiumB,
    totalZetiumA,
    totalZetiumB,
    totalReportReleased,
    totalManpowerPresent,
    totalManpowerPlanned,
    manpowerAttendanceRate,
    activeBottleneck: {
      station: topBottleneck.station,
      backlog: topBottleneck.backlog,
      severity
    }
  };
}

export function formatNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('id-ID');
}
