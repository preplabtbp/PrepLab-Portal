import * as XLSX from 'xlsx';
import { ScreenTestRecord, ScreenTestStats, OperatorStat, HistogramBin } from './screen-test-types';

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
 * Normalize Date string to DD/MM/YYYY or readable date
 */
export function normalizeDate(val: any): string {
  if (!val) return new Date().toLocaleDateString('id-ID');
  if (val instanceof Date) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const s = String(val).trim();
  // If Excel serial number date
  if (/^\d{5}$/.test(s)) {
    const excelEpoch = new Date(1899, 11, 30);
    const parsed = new Date(excelEpoch.getTime() + parseInt(s, 10) * 86400000);
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${parsed.getFullYear()}`;
  }
  return s;
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
    // Map headers dynamically
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

    // Also check if second row is subheader (e.g. "A | B | C = (A-B) | % | Min | By")
    if (lines.length > 1) {
      const secondTokens = lines[1].split(delimiter).map(t => t.trim().toLowerCase());
      const isSubheader = secondTokens.some(t => t === 'a' || t === 'b' || t.includes('a - b') || t.includes('c =') || t.includes('c=(a-b)'));
      if (isSubheader) {
        startIndex = 2;
      }
    }
  }

  // If columns not fully found by name, fallback to standard positional matching:
  // [0: No, 1: Date, 2: ID Sample, 3: Orig Wt, 4: Unpassed, 5: Passed, 6: Passed %, 7: Min Passed, 8: By]
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

    // Extract values based on mapped column or positional fallback
    const rawNo = colIndex.no >= 0 && colIndex.no < cells.length ? cells[colIndex.no] : (i + 1).toString();
    const rawDate = colIndex.date >= 0 && colIndex.date < cells.length ? cells[colIndex.date] : '';
    const rawSampleId = colIndex.sampleId >= 0 && colIndex.sampleId < cells.length ? cells[colIndex.sampleId] : '';
    const rawOrig = colIndex.originalWeight >= 0 && colIndex.originalWeight < cells.length ? cells[colIndex.originalWeight] : '';
    const rawUnpassed = colIndex.unpassedWeight >= 0 && colIndex.unpassedWeight < cells.length ? cells[colIndex.unpassedWeight] : '';
    const rawPassed = colIndex.passedWeight >= 0 && colIndex.passedWeight < cells.length ? cells[colIndex.passedWeight] : '';
    const rawPct = colIndex.passedPercentage >= 0 && colIndex.passedPercentage < cells.length ? cells[colIndex.passedPercentage] : '';
    const rawMin = colIndex.minPassed >= 0 && colIndex.minPassed < cells.length ? cells[colIndex.minPassed] : '';
    const rawBy = colIndex.operator >= 0 && colIndex.operator < cells.length ? cells[colIndex.operator] : '';

    // Ignore empty lines
    if (!rawSampleId && !rawUnpassed && !rawDate) continue;

    const noNum = parseInt(rawNo, 10) || (records.length + 1);
    const dateStr = normalizeDate(rawDate);
    const sampleId = rawSampleId || `SMP-${String(records.length + 1).padStart(3, '0')}`;
    
    // Original weight [A] default 20.00 gr
    let origWeight = cleanNumeric(rawOrig, 20.00);
    if (origWeight <= 0) origWeight = 20.00;

    // Unpassed [B]
    const unpassedWeight = cleanNumeric(rawUnpassed, 0);

    // Passed [C] = A - B
    let passedWeight = cleanNumeric(rawPassed, 0);
    if (passedWeight === 0 && unpassedWeight >= 0) {
      passedWeight = Math.max(0, +(origWeight - unpassedWeight).toFixed(3));
    }

    // Passed (%) = (C / A) * 100
    let passedPct = cleanNumeric(rawPct, 0);
    if (passedPct === 0 && origWeight > 0) {
      passedPct = +((passedWeight / origWeight) * 100).toFixed(2);
    } else {
      passedPct = +passedPct.toFixed(2);
    }

    // Min Passed standard
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
        
        // Convert to TSV string then reuse clipboard parser for consistent logic
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

  // Standard deviation
  let varianceSum = 0;
  records.forEach((r) => {
    varianceSum += Math.pow(r.passedPercentage - meanPassed, 2);
  });
  const stdDev = totalCount > 1 ? +(Math.sqrt(varianceSum / (totalCount - 1))).toFixed(3) : 0;

  // Process Capability Index Cpk for lower specification limit (LSL)
  // Cpk = (Mean - LSL) / (3 * stdDev)
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

  // Sort by highest sample volume
  return list.sort((a, b) => b.total - a.total);
}

/**
 * Calculate Distribution Histogram Bins
 */
export function calculateHistogram(records: ScreenTestRecord[], specLimit = 95.00): HistogramBin[] {
  if (records.length === 0) return [];

  // Fixed buckets standard for metallurgical screen test
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
export function exportToExcel(records: ScreenTestRecord[], fileName = 'Screen_Test_Sample_Smelter_HPL.xlsx') {
  const data = [
    ['Screen Test Sample Smelter HPL'],
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

  // Column widths
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
  XLSX.utils.book_append_sheet(wb, ws, 'Screen Test HPL');
  XLSX.writeFile(wb, fileName);
}
