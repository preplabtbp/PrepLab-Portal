import * as XLSX from 'xlsx';
import { 
  ScreenTestRecord, 
  ScreenTestStats, 
  OperatorStat, 
  HistogramBin, 
  ScreenTestDataset 
} from './screen-test-types';

/**
 * Clean numeric string from commas, percent signs, and currency/spaces
 */
export function cleanNumeric(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim().replace(/%/g, '').replace(/,/g, '.');
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
}

/**
 * Parse Date string to standard JavaScript Date
 * Tolerates DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD, etc.
 */
export function parseDateString(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();

  // Excel serial number date
  if (/^\d{5}$/.test(s)) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + parseInt(s, 10) * 86400000);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Standard ISO 8601 week number calculator
 */
export function getISOWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Normalize Date string to DD/MM/YYYY format
 */
export function normalizeDate(val: any): string {
  const parsed = parseDateString(val);
  if (!parsed) return new Date().toLocaleDateString('id-ID');
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Smart Excel Clipboard (TSV / CSV) Parser
 * Automatically parses Tab-Separated Values from Ctrl+V straight from Excel / Google Sheets
 */
export function parseExcelClipboardData(rawText: string, defaultMinPassed = 95.00): {
  records: ScreenTestRecord[];
  warnings: string[];
  totalRowsDetected: number;
} {
  const warnings: string[] = [];
  if (!rawText || !rawText.trim()) {
    return { records: [], warnings: ['Data clipboard kosong'], totalRowsDetected: 0 };
  }

  // Split lines
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return { records: [], warnings: ['Tidak ada baris data yang ditemukan'], totalRowsDetected: 0 };
  }

  // Determine delimiter: tab (\t) or comma / semicolon
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  let delimiter = '\t';
  if (tabCount === 0) {
    if (semicolonCount > commaCount && semicolonCount > 1) delimiter = ';';
    else if (commaCount > 1) delimiter = ',';
  }

  // Check if first row is header
  const headerTokens = lines[0].split(delimiter).map(t => t.trim().toLowerCase());
  const hasHeaderRow = headerTokens.some(t => 
    t.includes('date') || t.includes('tanggal') ||
    t.includes('sample') || t.includes('id') ||
    t.includes('original') || t.includes('weight') ||
    t.includes('unpassed') || t.includes('passed') ||
    t.includes('mesh') || t.includes('by')
  );

  // Column index map
  let colIndex = {
    no: -1,
    date: -1,
    sampleId: -1,
    originalWeight: -1,
    unpassedWeight: -1,
    passedWeight: -1,
    passedPercentage: -1,
    minPassed: -1,
    operator: -1,
  };

  let startIndex = 0;

  if (hasHeaderRow) {
    startIndex = 1;
    headerTokens.forEach((token, idx) => {
      if (token === 'no' || token === 'no.' || token === 'nomor') colIndex.no = idx;
      else if (token.includes('date') || token.includes('tgl') || token.includes('tanggal')) colIndex.date = idx;
      else if (token.includes('id') || token.includes('sample')) colIndex.sampleId = idx;
      else if (token.includes('original') || token.includes('berat awal') || (token.includes('weight') && !token.includes('unpass') && !token.includes('pass'))) colIndex.originalWeight = idx;
      else if (token.includes('unpass') || token.includes('tertahan') || token.includes('tidak lolos')) colIndex.unpassedWeight = idx;
      else if (token.includes('passed (gr)') || token.includes('passed (g)') || (token.includes('passed') && token.includes('gr')) || token.includes('lolos (gr)')) colIndex.passedWeight = idx;
      else if (token.includes('passed (%)') || token.includes('%') || token.includes('persen') || token.includes('passed(%)')) colIndex.passedPercentage = idx;
      else if (token.includes('min') || token.includes('standar') || token.includes('threshold')) colIndex.minPassed = idx;
      else if (token.includes('by') || token.includes('oleh') || token.includes('analis') || token.includes('operator')) colIndex.operator = idx;
    });

    if (lines.length > 1) {
      const secondTokens = lines[1].split(delimiter).map(t => t.trim().toLowerCase());
      const isSubheader = secondTokens.some(t => t === 'a' || t === 'b' || t.includes('a - b') || t.includes('c =') || t.includes('c=(a-b)'));
      if (isSubheader) {
        startIndex = 2;
      }
    }
  }

  // Fallback positional matching
  if (colIndex.sampleId === -1 && colIndex.unpassedWeight === -1) {
    colIndex = {
      no: 0,
      date: 1,
      sampleId: 2,
      originalWeight: 3,
      unpassedWeight: 4,
      passedWeight: 5,
      passedPercentage: 6,
      minPassed: 7,
      operator: 8,
    };
  }

  const records: ScreenTestRecord[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells = rawLine.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;

    const rawNo = colIndex.no >= 0 && colIndex.no < cells.length ? cells[colIndex.no] : (i + 1).toString();
    const rawDate = colIndex.date >= 0 && colIndex.date < cells.length ? cells[colIndex.date] : '';
    const rawSampleId = colIndex.sampleId >= 0 && colIndex.sampleId < cells.length ? cells[colIndex.sampleId] : '';
    const rawOrig = colIndex.originalWeight >= 0 && colIndex.originalWeight < cells.length ? cells[colIndex.originalWeight] : '';
    const rawUnpassed = colIndex.unpassedWeight >= 0 && colIndex.unpassedWeight < cells.length ? cells[colIndex.unpassedWeight] : '';
    const rawPassed = colIndex.passedWeight >= 0 && colIndex.passedWeight < cells.length ? cells[colIndex.passedWeight] : '';
    const rawPct = colIndex.passedPercentage >= 0 && colIndex.passedPercentage < cells.length ? cells[colIndex.passedPercentage] : '';
    const rawMin = colIndex.minPassed >= 0 && colIndex.minPassed < cells.length ? cells[colIndex.minPassed] : '';
    const rawBy = colIndex.operator >= 0 && colIndex.operator < cells.length ? cells[colIndex.operator] : '';

    if (!rawSampleId && !rawUnpassed && !rawDate) continue;

    const noNum = parseInt(rawNo, 10) || (records.length + 1);
    const dateStr = normalizeDate(rawDate);
    const sampleId = rawSampleId || `SMP-${String(records.length + 1).padStart(3, '0')}`;
    
    let origWeight = cleanNumeric(rawOrig, 20.00);
    if (origWeight <= 0) origWeight = 20.00;

    const unpassedWeight = cleanNumeric(rawUnpassed, 0);

    let passedWeight = cleanNumeric(rawPassed, 0);
    if (passedWeight === 0 && unpassedWeight >= 0) {
      passedWeight = Math.max(0, +(origWeight - unpassedWeight).toFixed(3));
    }

    let passedPct = cleanNumeric(rawPct, 0);
    if (passedPct === 0 && origWeight > 0) {
      passedPct = +((passedWeight / origWeight) * 100).toFixed(2);
    } else {
      passedPct = +passedPct.toFixed(2);
    }

    let minPassed = cleanNumeric(rawMin, defaultMinPassed);
    if (minPassed <= 0) minPassed = defaultMinPassed;

    const operator = (rawBy || 'ANON').toUpperCase();
    const isPass = passedPct >= minPassed;

    records.push({
      id: `screen-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      no: noNum,
      date: dateStr,
      sampleId,
      originalWeight: origWeight,
      unpassedWeight,
      passedWeight,
      passedPercentage: passedPct,
      minPassed,
      operator,
      isPass,
    });
  }

  return {
    records,
    warnings,
    totalRowsDetected: lines.length - startIndex,
  };
}

/**
 * Filter Records by Week / Month / Date Period
 */
export function filterRecordsByPeriod(
  records: ScreenTestRecord[],
  period: string,
  customStart?: string,
  customEnd?: string
): ScreenTestRecord[] {
  if (!period || period === 'all') return records;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentIsoWeek = getISOWeekNumber(now);

  return records.filter((r) => {
    const d = parseDateString(r.date);
    if (!d) return true; // Keep if date cannot be parsed

    const rYear = d.getFullYear();
    const rMonth = d.getMonth();
    const rIsoWeek = getISOWeekNumber(d);

    if (period === 'this_week') {
      return rYear === currentYear && rIsoWeek === currentIsoWeek;
    }

    if (period === 'last_week') {
      const prevWeek = currentIsoWeek === 1 ? 52 : currentIsoWeek - 1;
      const targetYear = currentIsoWeek === 1 ? currentYear - 1 : currentYear;
      return rYear === targetYear && rIsoWeek === prevWeek;
    }

    if (period === 'this_month') {
      return rYear === currentYear && rMonth === currentMonth;
    }

    if (period === 'last_month') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return rYear === targetYear && rMonth === prevMonth;
    }

    // Specific Month, e.g. "month_2026-10"
    if (period.startsWith('month_')) {
      const monthPart = period.replace('month_', ''); // "2026-10"
      const [y, m] = monthPart.split('-').map(Number);
      return rYear === y && rMonth === (m - 1);
    }

    // Specific ISO Week, e.g. "week_2026-W41"
    if (period.startsWith('week_')) {
      const weekPart = period.replace('week_', ''); // "2026-W41"
      const [yStr, wStr] = weekPart.split('-W');
      const targetY = parseInt(yStr, 10);
      const targetW = parseInt(wStr, 10);
      return rYear === targetY && rIsoWeek === targetW;
    }

    // Custom Date Range
    if (period === 'custom' && (customStart || customEnd)) {
      const t = d.getTime();
      if (customStart) {
        const s = parseDateString(customStart);
        if (s && t < s.getTime()) return false;
      }
      if (customEnd) {
        const e = parseDateString(customEnd);
        if (e && t > (e.getTime() + 86400000)) return false;
      }
      return true;
    }

    return true;
  });
}

/**
 * Extract available distinct months and weeks from dataset
 */
export function getDistinctPeriodOptions(records: ScreenTestRecord[]): {
  months: Array<{ value: string; label: string }>;
  weeks: Array<{ value: string; label: string }>;
} {
  const monthMap = new Map<string, string>();
  const weekMap = new Map<string, string>();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  records.forEach((r) => {
    const d = parseDateString(r.date);
    if (!d) return;

    const y = d.getFullYear();
    const m = d.getMonth();
    const w = getISOWeekNumber(d);

    const mKey = `month_${y}-${String(m + 1).padStart(2, '0')}`;
    const mLabel = `${monthNames[m]} ${y}`;
    monthMap.set(mKey, mLabel);

    const wKey = `week_${y}-W${String(w).padStart(2, '0')}`;
    const wLabel = `Minggu ${String(w).padStart(2, '0')} (${monthNames[m]} ${y})`;
    weekMap.set(wKey, wLabel);
  });

  const months = Array.from(monthMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => b.value.localeCompare(a.value));

  const weeks = Array.from(weekMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => b.value.localeCompare(a.value));

  return { months, weeks };
}

/**
 * Parse uploaded .xlsx / .xls / .csv file using SheetJS (xlsx)
 */
export async function parseUploadedExcelFile(file: File, defaultMinPassed = 95.00): Promise<{
  records: ScreenTestRecord[];
  warnings: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const tsvText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
        const result = parseExcelClipboardData(tsvText, defaultMinPassed);
        resolve({
          records: result.records,
          warnings: result.warnings,
        });
      } catch (err: any) {
        reject(new Error('Gagal membaca file Excel/CSV: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Gagal mengunggah file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Calculate statistical parameters (Process Capability, Mean, StdDev, etc.)
 */
export function calculateScreenTestStats(records: ScreenTestRecord[], specLimit = 95.00): ScreenTestStats {
  if (records.length === 0) {
    return {
      totalCount: 0,
      passCount: 0,
      failCount: 0,
      passRate: 0,
      failRate: 0,
      meanPassed: 0,
      minPassedValue: 0,
      maxPassedValue: 0,
      stdDev: 0,
      cpk: 0,
      specLimit,
    };
  }

  const totalCount = records.length;
  let passCount = 0;
  let sum = 0;
  let min = records[0].passedPercentage;
  let max = records[0].passedPercentage;

  records.forEach((r) => {
    if (r.passedPercentage >= (r.minPassed || specLimit)) {
      passCount++;
    }
    sum += r.passedPercentage;
    if (r.passedPercentage < min) min = r.passedPercentage;
    if (r.passedPercentage > max) max = r.passedPercentage;
  });

  const failCount = totalCount - passCount;
  const passRate = +((passCount / totalCount) * 100).toFixed(1);
  const failRate = +((failCount / totalCount) * 100).toFixed(1);
  const meanPassed = +(sum / totalCount).toFixed(2);

  let varianceSum = 0;
  records.forEach((r) => {
    varianceSum += Math.pow(r.passedPercentage - meanPassed, 2);
  });
  const stdDev = totalCount > 1 ? +(Math.sqrt(varianceSum / (totalCount - 1))).toFixed(3) : 0;

  let cpk = 0;
  if (stdDev > 0) {
    cpk = +((meanPassed - specLimit) / (3 * stdDev)).toFixed(2);
  }

  return {
    totalCount,
    passCount,
    failCount,
    passRate,
    failRate,
    meanPassed,
    minPassedValue: +min.toFixed(2),
    maxPassedValue: +max.toFixed(2),
    stdDev,
    cpk,
    specLimit,
  };
}

/**
 * Aggregate Operator / Analyst performance
 */
export function calculateOperatorStats(records: ScreenTestRecord[]): OperatorStat[] {
  const map = new Map<string, { total: number; passed: number; sumPct: number }>();

  records.forEach((r) => {
    const op = (r.operator || 'UNKNOWN').trim().toUpperCase();
    const curr = map.get(op) || { total: 0, passed: 0, sumPct: 0 };
    curr.total += 1;
    if (r.passedPercentage >= r.minPassed) {
      curr.passed += 1;
    }
    curr.sumPct += r.passedPercentage;
    map.set(op, curr);
  });

  const list: OperatorStat[] = [];
  map.forEach((data, op) => {
    const passRate = data.total > 0 ? +((data.passed / data.total) * 100).toFixed(1) : 0;
    const avgPct = data.total > 0 ? +(data.sumPct / data.total).toFixed(2) : 0;
    list.push({
      operator: op,
      total: data.total,
      passed: data.passed,
      failed: data.total - data.passed,
      passRate,
      avgPassedPercentage: avgPct,
    });
  });

  return list.sort((a, b) => b.total - a.total);
}

/**
 * Calculate Distribution Histogram Bins
 */
export function calculateHistogram(records: ScreenTestRecord[], specLimit = 95.00): HistogramBin[] {
  if (records.length === 0) return [];

  const bins: HistogramBin[] = [
    { rangeLabel: '< 85.0%', min: 0, max: 85.0, count: 0, isFailBin: true },
    { rangeLabel: '85.0 - 87.9%', min: 85.0, max: 88.0, count: 0, isFailBin: true },
    { rangeLabel: '88.0 - 90.9%', min: 88.0, max: 91.0, count: 0, isFailBin: true },
    { rangeLabel: '91.0 - 92.9%', min: 91.0, max: 93.0, count: 0, isFailBin: true },
    { rangeLabel: '93.0 - 94.9%', min: 93.0, max: 95.0, count: 0, isFailBin: true },
    { rangeLabel: '95.0 - 96.9%', min: 95.0, max: 97.0, count: 0, isFailBin: false },
    { rangeLabel: '97.0 - 98.9%', min: 97.0, max: 99.0, count: 0, isFailBin: false },
    { rangeLabel: '99.0 - 100%', min: 99.0, max: 100.1, count: 0, isFailBin: false },
  ];

  records.forEach((r) => {
    const val = r.passedPercentage;
    for (const bin of bins) {
      if (val >= bin.min && val < bin.max) {
        bin.count++;
        break;
      }
    }
  });

  return bins;
}

/**
 * Group trend by day
 */
export function calculateDailyTrend(records: ScreenTestRecord[]) {
  const map = new Map<string, { total: number; passed: number; sumPct: number }>();

  records.forEach((r) => {
    const d = r.date || 'Unknown';
    const curr = map.get(d) || { total: 0, passed: 0, sumPct: 0 };
    curr.total += 1;
    if (r.passedPercentage >= r.minPassed) curr.passed += 1;
    curr.sumPct += r.passedPercentage;
    map.set(d, curr);
  });

  const res: Array<{ date: string; avgPct: number; total: number; passRate: number }> = [];
  map.forEach((data, date) => {
    res.push({
      date,
      avgPct: +(data.sumPct / data.total).toFixed(2),
      total: data.total,
      passRate: +((data.passed / data.total) * 100).toFixed(1),
    });
  });

  return res;
}

/**
 * Generate high-fidelity realistic dataset matching the user's screenshot
 * ("Screen Test Sample Smelter HPL")
 */
export function getSampleMockData(): ScreenTestRecord[] {
  const rawSampleRows = [
    { no: 266, date: '06/10/2026', id: 'TBP20261005-A1', a: 20.00, b: 0.45, by: 'ARDILA' },
    { no: 267, date: '07/10/2026', id: 'TBP20261005-B1', a: 20.00, b: 2.04, by: 'RIKO' },
    { no: 268, date: '08/10/2026', id: 'GPS20261007-A1', a: 20.00, b: 0.59, by: 'ARDILA' },
    { no: 269, date: '09/10/2026', id: 'GPS20261008-A1', a: 20.00, b: 2.61, by: 'RIKO' },
    { no: 270, date: '10/10/2026', id: 'GPS20261008-B1', a: 20.00, b: 2.29, by: 'RIKO' },
    { no: 271, date: '11/10/2026', id: 'GPS20261009-B3', a: 20.00, b: 2.02, by: 'JASRI' },
    { no: 272, date: '12/10/2026', id: 'GPS20261010-B1', a: 20.00, b: 2.91, by: 'JASRI' },
    { no: 273, date: '12/10/2026', id: 'TBP20261010-A2', a: 20.00, b: 0.38, by: 'ARDILA' },
    { no: 274, date: '13/10/2026', id: 'TBP20261011-B1', a: 20.00, b: 0.52, by: 'RIKO' },
    { no: 275, date: '13/10/2026', id: 'GPS20261011-A1', a: 20.00, b: 0.65, by: 'JASRI' },
    { no: 276, date: '14/10/2026', id: 'GPS20261012-A3', a: 20.00, b: 1.10, by: 'ARDILA' },
    { no: 277, date: '14/10/2026', id: 'TBP20261012-B2', a: 20.00, b: 0.44, by: 'RIKO' },
    { no: 278, date: '15/10/2026', id: 'GPS20261013-A1', a: 20.00, b: 0.88, by: 'JASRI' },
    { no: 279, date: '15/10/2026', id: 'TBP20261013-C1', a: 20.00, b: 2.15, by: 'RIKO' },
    { no: 280, date: '16/10/2026', id: 'GPS20261014-A2', a: 20.00, b: 0.35, by: 'ARDILA' },
    { no: 281, date: '16/10/2026', id: 'TBP20261014-B1', a: 20.00, b: 0.72, by: 'JASRI' },
    { no: 282, date: '17/10/2026', id: 'GPS20261015-B1', a: 20.00, b: 0.49, by: 'ARDILA' },
    { no: 283, date: '17/10/2026', id: 'TBP20261015-A1', a: 20.00, b: 2.38, by: 'RIKO' },
    { no: 284, date: '18/10/2026', id: 'GPS20261016-A1', a: 20.00, b: 0.40, by: 'JASRI' },
    { no: 285, date: '18/10/2026', id: 'GPS20261016-B2', a: 20.00, b: 0.61, by: 'ARDILA' },
    { no: 286, date: '19/10/2026', id: 'TBP20261017-A2', a: 20.00, b: 0.46, by: 'RIKO' },
    { no: 287, date: '19/10/2026', id: 'GPS20261017-C1', a: 20.00, b: 2.80, by: 'JASRI' },
    { no: 288, date: '20/10/2026', id: 'TBP20261018-A1', a: 20.00, b: 0.32, by: 'ARDILA' },
    { no: 289, date: '20/10/2026', id: 'GPS20261018-B1', a: 20.00, b: 0.58, by: 'RIKO' },
    { no: 290, date: '21/10/2026', id: 'TBP20261019-B3', a: 20.00, b: 0.50, by: 'JASRI' },
    { no: 291, date: '21/10/2026', id: 'GPS20261019-A1', a: 20.00, b: 0.95, by: 'ARDILA' },
    { no: 292, date: '22/10/2026', id: 'TBP20261020-A1', a: 20.00, b: 0.41, by: 'RIKO' },
    { no: 293, date: '22/10/2026', id: 'GPS20261020-B2', a: 20.00, b: 2.10, by: 'JASRI' },
    { no: 294, date: '23/10/2026', id: 'TBP20261021-A2', a: 20.00, b: 0.39, by: 'ARDILA' },
    { no: 295, date: '23/10/2026', id: 'GPS20261021-C1', a: 20.00, b: 0.63, by: 'RIKO' },
    { no: 296, date: '24/10/2026', id: 'TBP20261022-B1', a: 20.00, b: 0.48, by: 'JASRI' },
    { no: 297, date: '24/10/2026', id: 'GPS20261022-A1', a: 20.00, b: 0.55, by: 'ARDILA' },
    { no: 298, date: '25/10/2026', id: 'TBP20261023-A3', a: 20.00, b: 1.85, by: 'RIKO' },
    { no: 299, date: '25/10/2026', id: 'GPS20261023-B1', a: 20.00, b: 0.37, by: 'JASRI' },
    { no: 300, date: '26/10/2026', id: 'TBP20261024-A1', a: 20.00, b: 0.42, by: 'ARDILA' },
  ];

  return rawSampleRows.map((r, idx) => {
    const c = +(r.a - r.b).toFixed(2);
    const pct = +((c / r.a) * 100).toFixed(2);
    const minPassed = 95.00;
    return {
      id: `mock-${idx + 1}`,
      no: r.no,
      date: r.date,
      sampleId: r.id,
      originalWeight: r.a,
      unpassedWeight: r.b,
      passedWeight: c,
      passedPercentage: pct,
      minPassed,
      operator: r.by,
      isPass: pct >= minPassed,
    };
  });
}

/**
 * Standard Default Multi-Datasets (HPL, RKEF, MSP)
 */
export function getDefaultDatasets(): ScreenTestDataset[] {
  const hplData = getSampleMockData();

  const rkefData: ScreenTestRecord[] = [
    { id: 'rkef-1', no: 101, date: '05/10/2026', sampleId: 'RKEF20261005-K1', originalWeight: 20.00, unpassedWeight: 1.40, passedWeight: 18.60, passedPercentage: 93.00, minPassed: 90.00, operator: 'FAJAR', isPass: true },
    { id: 'rkef-2', no: 102, date: '06/10/2026', sampleId: 'RKEF20261006-K2', originalWeight: 20.00, unpassedWeight: 1.10, passedWeight: 18.90, passedPercentage: 94.50, minPassed: 90.00, operator: 'FAJAR', isPass: true },
    { id: 'rkef-3', no: 103, date: '08/10/2026', sampleId: 'RKEF20261008-C1', originalWeight: 20.00, unpassedWeight: 2.25, passedWeight: 17.75, passedPercentage: 88.75, minPassed: 90.00, operator: 'ANDI', isPass: false },
    { id: 'rkef-4', no: 104, date: '09/10/2026', sampleId: 'RKEF20261009-C2', originalWeight: 20.00, unpassedWeight: 1.60, passedWeight: 18.40, passedPercentage: 92.00, minPassed: 90.00, operator: 'ANDI', isPass: true },
    { id: 'rkef-5', no: 105, date: '11/10/2026', sampleId: 'RKEF20261011-F1', originalWeight: 20.00, unpassedWeight: 0.95, passedWeight: 19.05, passedPercentage: 95.25, minPassed: 90.00, operator: 'FAJAR', isPass: true },
    { id: 'rkef-6', no: 106, date: '12/10/2026', sampleId: 'RKEF20261012-F2', originalWeight: 20.00, unpassedWeight: 1.80, passedWeight: 18.20, passedPercentage: 91.00, minPassed: 90.00, operator: 'BAYU', isPass: true },
    { id: 'rkef-7', no: 107, date: '14/10/2026', sampleId: 'RKEF20261014-K1', originalWeight: 20.00, unpassedWeight: 2.40, passedWeight: 17.60, passedPercentage: 88.00, minPassed: 90.00, operator: 'BAYU', isPass: false },
    { id: 'rkef-8', no: 108, date: '15/10/2026', sampleId: 'RKEF20261015-K2', originalWeight: 20.00, unpassedWeight: 1.35, passedWeight: 18.65, passedPercentage: 93.25, minPassed: 90.00, operator: 'ANDI', isPass: true },
    { id: 'rkef-9', no: 109, date: '17/10/2026', sampleId: 'RKEF20261017-C1', originalWeight: 20.00, unpassedWeight: 1.20, passedWeight: 18.80, passedPercentage: 94.00, minPassed: 90.00, operator: 'FAJAR', isPass: true },
    { id: 'rkef-10', no: 110, date: '18/10/2026', sampleId: 'RKEF20261018-C2', originalWeight: 20.00, unpassedWeight: 1.55, passedWeight: 18.45, passedPercentage: 92.25, minPassed: 90.00, operator: 'BAYU', isPass: true },
    { id: 'rkef-11', no: 111, date: '20/10/2026', sampleId: 'RKEF20261020-F1', originalWeight: 20.00, unpassedWeight: 1.05, passedWeight: 18.95, passedPercentage: 94.75, minPassed: 90.00, operator: 'ANDI', isPass: true },
    { id: 'rkef-12', no: 112, date: '22/10/2026', sampleId: 'RKEF20261022-F2', originalWeight: 20.00, unpassedWeight: 2.10, passedWeight: 17.90, passedPercentage: 89.50, minPassed: 90.00, operator: 'FAJAR', isPass: false },
    { id: 'rkef-13', no: 113, date: '24/10/2026', sampleId: 'RKEF20261024-K1', originalWeight: 20.00, unpassedWeight: 1.30, passedWeight: 18.70, passedPercentage: 93.50, minPassed: 90.00, operator: 'BAYU', isPass: true },
    { id: 'rkef-14', no: 114, date: '25/10/2026', sampleId: 'RKEF20261025-K2', originalWeight: 20.00, unpassedWeight: 0.85, passedWeight: 19.15, passedPercentage: 95.75, minPassed: 90.00, operator: 'ANDI', isPass: true },
  ];

  const mspData: ScreenTestRecord[] = [
    { id: 'msp-1', no: 201, date: '04/10/2026', sampleId: 'MSP20261004-P1', originalWeight: 20.00, unpassedWeight: 0.80, passedWeight: 19.20, passedPercentage: 96.00, minPassed: 92.00, operator: 'HADI', isPass: true },
    { id: 'msp-2', no: 202, date: '06/10/2026', sampleId: 'MSP20261006-P2', originalWeight: 20.00, unpassedWeight: 1.90, passedWeight: 18.10, passedPercentage: 90.50, minPassed: 92.00, operator: 'HADI', isPass: false },
    { id: 'msp-3', no: 203, date: '07/10/2026', sampleId: 'MSP20261007-D1', originalWeight: 20.00, unpassedWeight: 0.70, passedWeight: 19.30, passedPercentage: 96.50, minPassed: 92.00, operator: 'RIZKI', isPass: true },
    { id: 'msp-4', no: 204, date: '09/10/2026', sampleId: 'MSP20261009-D2', originalWeight: 20.00, unpassedWeight: 1.20, passedWeight: 18.80, passedPercentage: 94.00, minPassed: 92.00, operator: 'RIZKI', isPass: true },
    { id: 'msp-5', no: 205, date: '11/10/2026', sampleId: 'MSP20261011-P1', originalWeight: 20.00, unpassedWeight: 0.95, passedWeight: 19.05, passedPercentage: 95.25, minPassed: 92.00, operator: 'DEDI', isPass: true },
    { id: 'msp-6', no: 206, date: '13/10/2026', sampleId: 'MSP20261013-P2', originalWeight: 20.00, unpassedWeight: 1.75, passedWeight: 18.25, passedPercentage: 91.25, minPassed: 92.00, operator: 'DEDI', isPass: false },
    { id: 'msp-7', no: 207, date: '15/10/2026', sampleId: 'MSP20261015-D1', originalWeight: 20.00, unpassedWeight: 0.65, passedWeight: 19.35, passedPercentage: 96.75, minPassed: 92.00, operator: 'HADI', isPass: true },
    { id: 'msp-8', no: 208, date: '17/10/2026', sampleId: 'MSP20261017-D2', originalWeight: 20.00, unpassedWeight: 1.10, passedWeight: 18.90, passedPercentage: 94.50, minPassed: 92.00, operator: 'RIZKI', isPass: true },
    { id: 'msp-9', no: 209, date: '19/10/2026', sampleId: 'MSP20261019-P1', originalWeight: 20.00, unpassedWeight: 0.85, passedWeight: 19.15, passedPercentage: 95.75, minPassed: 92.00, operator: 'HADI', isPass: true },
    { id: 'msp-10', no: 210, date: '21/10/2026', sampleId: 'MSP20261021-P2', originalWeight: 20.00, unpassedWeight: 1.80, passedWeight: 18.20, passedPercentage: 91.00, minPassed: 92.00, operator: 'DEDI', isPass: false },
    { id: 'msp-11', no: 211, date: '23/10/2026', sampleId: 'MSP20261023-D1', originalWeight: 20.00, unpassedWeight: 0.75, passedWeight: 19.25, passedPercentage: 96.25, minPassed: 92.00, operator: 'RIZKI', isPass: true },
    { id: 'msp-12', no: 212, date: '24/10/2026', sampleId: 'MSP20261024-D2', originalWeight: 20.00, unpassedWeight: 1.00, passedWeight: 19.00, passedPercentage: 95.00, minPassed: 92.00, operator: 'HADI', isPass: true },
  ];

  return [
    {
      id: 'hpl',
      name: 'Sample Smelter HPL',
      code: 'HPL',
      specLimit: 95.00,
      meshSize: '200 mesh (74 µm)',
      description: 'Pengujian ayakan proses pelindian bijih nikel bertekanan tinggi (HPAL)',
      records: hplData,
      isDefault: true,
    },
    {
      id: 'rkef',
      name: 'Sample Smelter RKEF',
      code: 'RKEF',
      specLimit: 90.00,
      meshSize: '200 mesh (74 µm)',
      description: 'Pengujian ayakan tanur putar & tungku listrik peleburan nikel pirometalurgi',
      records: rkefData,
      isDefault: true,
    },
    {
      id: 'msp',
      name: 'Sample Smelter MSP',
      code: 'MSP',
      specLimit: 92.00,
      meshSize: '200 mesh (74 µm)',
      description: 'Pengujian ayakan produk presipitat sulfida nikel-kobalt',
      records: mspData,
      isDefault: true,
    },
  ];
}

/**
 * Generate TSV Template for Copying to Clipboard
 */
export function generateTemplateTsv(): string {
  const header1 = 'No\tDate\tID Sample\tOriginal Weight (gr)\tScreen Test 200 mesh (Sample Weight)\t\tPassed (%)\tMin Passed\tBy';
  const header2 = '\t\t\tA\tUnpassed (gr) [B]\tPassed (gr) [C=(A-B)]\t% = (C/A)*100\t\t';
  const rows = [
    '266\t06/10/2026\tTBP20261005-A1\t20.00\t0.45\t19.55\t97.75%\t95.00%\tARDILA',
    '267\t07/10/2026\tTBP20261005-B1\t20.00\t2.04\t17.96\t89.80%\t95.00%\tRIKO',
    '268\t08/10/2026\tGPS20261007-A1\t20.00\t0.59\t19.41\t97.05%\t95.00%\tARDILA',
    '269\t09/10/2026\tGPS20261008-A1\t20.00\t2.61\t17.39\t86.95%\t95.00%\tRIKO',
    '270\t10/10/2026\tGPS20261008-B1\t20.00\t2.29\t17.71\t88.55%\t95.00%\tRIKO',
  ];
  return [header1, header2, ...rows].join('\n');
}

/**
 * Export Records to formatted Excel file (.xlsx)
 */
export function exportToExcel(records: ScreenTestRecord[], fileName = 'Screen_Test_Sample_Smelter.xlsx') {
  const data = [
    ['Screen Test Sample Smelter Report'],
    [],
    ['No', 'Date', 'ID Sample', 'Original Weight (gr)', 'Unpassed (gr)', 'Passed (gr)', 'Passed (%)', 'Min Passed', 'By', 'Status'],
    ...records.map(r => [
      r.no ?? '',
      r.date,
      r.sampleId,
      r.originalWeight,
      r.unpassedWeight,
      r.passedWeight,
      r.passedPercentage,
      r.minPassed,
      r.operator,
      r.isPass ? 'PASS' : 'OUT OF SPEC',
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 8 },  // No
    { wch: 14 }, // Date
    { wch: 20 }, // ID Sample
    { wch: 18 }, // Orig Wt
    { wch: 14 }, // Unpassed
    { wch: 14 }, // Passed
    { wch: 14 }, // Passed %
    { wch: 12 }, // Min Passed
    { wch: 14 }, // By
    { wch: 14 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Screen Test Data');
  XLSX.writeFile(wb, fileName);
}
