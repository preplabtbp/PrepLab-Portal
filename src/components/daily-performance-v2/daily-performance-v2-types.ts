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
