import { 
  DailyPerformanceRecord, 
  ShiftType, 
  ReguType,
  DailyManpowerStaff,
  DailyManpowerCrew,
  DailySampleReceived,
  DailyPressPowder,
  DailyEDXRF,
  DailyWeighingFuseBead,
  DailyLOI,
  DailyZetiumRuns,
  DailyWDXRF,
  DailyQCData,
  DailyReport
} from '../daily-performance/daily-performance-types';

export type { 
  DailyPerformanceRecord, 
  ShiftType, 
  ReguType,
  DailyManpowerStaff,
  DailyManpowerCrew,
  DailySampleReceived,
  DailyPressPowder,
  DailyEDXRF,
  DailyWeighingFuseBead,
  DailyLOI,
  DailyZetiumRuns,
  DailyWDXRF,
  DailyQCData,
  DailyReport
};

export type V2ViewMode = 'briefing' | 'matrix' | 'bottleneck' | 'handover' | 'summary_sheet' | 'foreman_rekap';

export interface MonthlyPeakRecords {
  monthKey: string; // e.g. "2026-09" or "2026-10"
  maxReceived: number;
  maxReceivedGc: number;
  maxReceivedProd: number;
  maxReceivedExp: number;
  maxReceivedSmelter: number;
  maxPressFinish: number;
  maxWeighingFinish: number;
  maxFusionFinish: number;
  maxLoiFinish: number;
  maxEdxrfShift: number;
  maxZetiumTotal: number;
  maxQcFinish: number;
  maxReportFinish: number;
}

export interface StationBottleneckStatus {
  stationKey: 'press' | 'weighing' | 'fusion' | 'loi' | 'edxrf' | 'wdxrf' | 'qc' | 'report';
  name: string;
  stageNum: number;
  balance: number;
  received: number;
  finished: number;
  delta: number; // received - finished (positive = accumulating backlog)
  health: 'optimal' | 'warning' | 'critical';
  reason?: string;
  recommendation?: string;
}

export interface ShiftHandoverNote {
  id: string;
  date: string; // "01/10/2026"
  isoDate: string; // "2026-10-01"
  shiftType: ShiftType;
  shiftName: string; // "Shift A", "Shift B"
  spvName: string;
  handoverTo: string;
  criticalIssues: string[];
  equipmentStatus: {
    furnaceW2: 'NORMAL' | 'ISSUE' | 'OFF';
    furnaceW4: 'NORMAL' | 'ISSUE' | 'OFF';
    furnaceW5: 'NORMAL' | 'ISSUE' | 'OFF';
    zetiumA: 'NORMAL' | 'ISSUE' | 'OFF';
    zetiumB: 'NORMAL' | 'ISSUE' | 'OFF';
    pelletPress: 'NORMAL' | 'ISSUE' | 'OFF';
    beadFusion: 'NORMAL' | 'ISSUE' | 'OFF';
  };
  samplePriorities: string;
  notes: string;
  updatedAt: string;
}

export interface BatchBreakdownItem {
  pt: string;
  batchCount: number;
  sampleCount?: number;
}

export type SampleGroupType = 'Exploration' | 'Smelter' | 'Production' | 'Khusus';

export interface SampleCategoryDefinition {
  code: string;
  name: string;
  group: SampleGroupType;
}

export const WEIGHING_SAMPLE_CATEGORIES: SampleCategoryDefinition[] = [
  // 1. Exploration
  { code: 'TBP', name: 'TBP', group: 'Exploration' },
  { code: 'GPS', name: 'GPS', group: 'Exploration' },
  { code: 'JMP', name: 'JMP', group: 'Exploration' },
  { code: 'GTS', name: 'GTS', group: 'Exploration' },
  { code: 'BJM', name: 'BJM', group: 'Exploration' },
  { code: 'OAM', name: 'OAM', group: 'Exploration' },
  { code: 'SCANDIUM', name: 'SCANDIUM', group: 'Exploration' },

  // 2. Smelter
  { code: 'SMELTER MSP', name: 'SMELTER MSP', group: 'Smelter' },
  { code: 'SMELTER HPL', name: 'SMELTER HPL', group: 'Smelter' },
  { code: 'SMELTER HJF', name: 'SMELTER HJF', group: 'Smelter' },
  { code: 'SMELTER ONC', name: 'SMELTER ONC', group: 'Smelter' },
  { code: 'SMELTER KPS', name: 'SMELTER KPS', group: 'Smelter' },

  // 3. Production
  { code: 'QC LIM', name: 'QC LIM', group: 'Production' },
  { code: 'QC SAP', name: 'QC SAP', group: 'Production' },
  { code: 'QC BLD', name: 'QC BLD', group: 'Production' },
  { code: 'QC BOULDER', name: 'QC BOULDER', group: 'Production' },

  // 4. Khusus (Sample Accidental)
  { code: 'KHUSUS', name: 'KHUSUS (Accidental)', group: 'Khusus' },
];

export function getSampleGroup(code: string): SampleGroupType {
  const c = String(code || '').trim().toUpperCase();
  const found = WEIGHING_SAMPLE_CATEGORIES.find(cat => cat.code.toUpperCase() === c);
  if (found) return found.group;
  if (c.includes('SMELTER')) return 'Smelter';
  if (c.includes('LIM') || c.includes('SAP') || c.includes('BLD') || c.includes('BOULDER') || c.includes('PROD')) return 'Production';
  if (c.includes('KHUSUS') || c.includes('ACCIDENTAL')) return 'Khusus';
  return 'Exploration';
}

export interface SampleBatchRecord {
  id: string;
  date?: string;
  stationKey?: 'weighing' | 'fusion' | 'loi';
  pt: string;
  sampleGroup?: SampleGroupType;
  batchNumber?: number;
  sampleCount: number;
  isFinished: boolean; // Alias untuk Finish Fusion (kompatibilitas backward)
  fusionFinished?: boolean;
  wdxrfFinished?: boolean;
  qcFinished?: boolean;
  reportingFinished?: boolean;
  isBatchExploration?: boolean;
  shiftCreated?: 'DAY' | 'NIGHT' | 'LS';
  shiftFinished?: 'DAY' | 'NIGHT' | 'LS';
  // Additional ergonomic fields
  batchName?: string;
  receivedShift?: 'DAY' | 'NIGHT' | 'LS';
  receivedDate?: string;
  station?: string;
  createdAt?: string;
}

export interface DirectSampleIntakeRecord {
  id: string;
  code: string;
  group: SampleGroupType;
  sampleCount: number;
  shift: ShiftType;
  date: string;
  createdAt: string;
  notes?: string;
}

export interface BalanceOverrideAuditLog {
  id: string;
  timestamp: string;
  date: string;
  shift: ShiftType;
  regu: string;
  stationKey: 'press' | 'edxrf' | 'fusion' | 'loi' | 'wdxrf' | 'qc' | 'report';
  stationName: string;
  previousShiftInfo: {
    date: string;
    shift: string;
    regu: string;
    foreman: string;
    originalBalance: number;
    intake?: number;
    finished?: number;
  };
  originalValue: number;
  correctedValue: number;
  modifiedBy: string;
  reason: string;
  investigationNotes?: string;
}

