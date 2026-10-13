export interface ScreenTestRecord {
  id: string;              // unique UUID or key
  no?: number;             // Row sequence number from Excel (e.g. 266, 267)
  date: string;            // Inspection date (e.g. '06/10/2026' or '2026-10-06')
  sampleId: string;        // ID Sample (e.g. 'TBP20261005-A1', 'GPS20261007-A1')
  originalWeight: number;  // Original Weight (gr) [A], default 20.00
  unpassedWeight: number;  // Unpassed Weight 200 mesh (gr) [B]
  passedWeight: number;    // Passed Weight 200 mesh (gr) [C = A - B]
  passedPercentage: number;// Passed (%) [ (C / A) * 100 ]
  minPassed: number;       // Min Passed threshold %, default 95.00
  operator: string;        // By (e.g. 'ARDILA', 'RIKO', 'JASRI')
  notes?: string;          // Optional notes
  isPass: boolean;         // passedPercentage >= minPassed
}

export interface ScreenTestStats {
  totalCount: number;
  passCount: number;
  failCount: number;
  passRate: number;        // (passCount / totalCount) * 100
  failRate: number;        // (failCount / totalCount) * 100
  meanPassed: number;      // Average passed %
  minPassedValue: number;  // Lowest passed %
  maxPassedValue: number;  // Highest passed %
  stdDev: number;          // Sample standard deviation
  cpk: number;             // Process capability index (Mean - MinSpec) / (3 * stdDev)
  specLimit: number;       // Target Min Passed (typically 95.00)
}

export interface OperatorStat {
  operator: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgPassedPercentage: number;
}

export interface HistogramBin {
  rangeLabel: string;
  min: number;
  max: number;
  count: number;
  isFailBin: boolean;
}

export type ScreenTestChartView = 'run-chart' | 'distribution' | 'operator-stats' | 'trend-daily';

export interface ScreenTestFilter {
  searchQuery: string;
  status: 'all' | 'pass' | 'fail';
  operator: string;
  startDate: string;
  endDate: string;
}
