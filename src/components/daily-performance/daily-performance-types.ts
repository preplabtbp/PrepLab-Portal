export type ShiftType = 'DAY' | 'NIGHT' | 'LS';
export type ReguType = 'A' | 'B';

export interface DailyManpowerStaff {
  shift: number;
  cuti: number;
  alpa: number;
  izin: number;
  sakit: number;
  total: number;
}

export interface DailyManpowerCrew {
  shift: number;
  bantn: number;
  lab: number;
  cuti: number;
  alpa: number;
  izin: number;
  sakit: number;
  total: number;
}

export interface DailySampleReceived {
  gc: { shift: number; day: number; wkly: number };
  prod: { shift: number; rc: number; ra?: number; day: number; wkly: number };
  exp: { shift: number; day: number; wkly: number };
  smelter: { shift: number; day: number; wkly: number };
  gts?: { shift: number; day: number; wkly: number };
}

export interface DailyPressPowder {
  received: { shift: number; day: number; wkly: number };
  finish: { shift: number; day: number; wkly: number };
}

export interface DailyEDXRF {
  epsC: number;
  epsD: number;
  epsE: number;
  epsF: number;
  epsG: number;
  epsH: number;
  s2Puma: number;
  shift: number;
  day: number;
  wkly: number;
}

export interface DailyWeighingFuseBead {
  osExp: number;
  finishShift: number;
  finishDay: number;
  finishWkly: number;
  balExp: number;
}

export interface DailyLOI {
  os: number;
  w2: number;
  w4: number;
  w5: number;
  finLoiShift: number;
  finLoiDay: number;
  finLoiWkly: number;
  bal: number;
}

export interface DailyZetiumRuns {
  prod: number;
  exp: number;
  smelt: number;
  gts: number;
  rarr: number;
  ver: number;
  std: number;
  blank: number;
  total: number;
  day: number;
  wkly: number;
}

export interface DailyWDXRF {
  osExp: number;
  zetiumA: DailyZetiumRuns;
  zetiumB: DailyZetiumRuns;
  bal: number;
}

export interface DailyQCData {
  os: number;
  finishShift: number;
  finishDay: number;
  finishWkly: number;
  bal: number;
}

export interface DailyReport {
  osReport: number;
  received: number;
  finishReportDay: number;
  finishReportWkly: number;
  bal: number;
}

export interface DailyPerformanceRecord {
  id: string; // e.g. "2026-10-01_A_DAY"
  no: number;
  date: string; // "01/10/2026"
  isoDate: string; // "2026-10-01"
  week: number; // 40
  regu: ReguType;
  shiftType: ShiftType;
  manpower: {
    staff: DailyManpowerStaff;
    crew: DailyManpowerCrew;
  };
  sampleReceived: DailySampleReceived;
  pressPowder: DailyPressPowder;
  edxrf: DailyEDXRF;
  fuseBead: DailyWeighingFuseBead;
  loi: DailyLOI;
  wdxrf: DailyWDXRF;
  qc: DailyQCData;
  report: DailyReport;
  notes?: string;
  manpowerNotes?: string;
  updatedAt?: string;
}

export type ViewMode = 'presentation' | 'pipeline' | 'station' | 'table';
