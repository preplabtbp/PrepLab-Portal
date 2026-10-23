import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Calendar,
  Users,
  Layers,
  Flame,
  Cpu,
  FileCheck,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Sparkles,
  Info
} from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-types';
import { formatNumber } from './daily-performance-utils';

export type BabakId = 'all' | 'babak1' | 'babak2' | 'babak3' | 'babak4' | 'babak5';
export type CompareType = 'month' | 'week' | 'shift';

interface DailyPerformanceComparisonChartsProps {
  records: DailyPerformanceRecord[];
  onSelectDate?: (date: string) => void;
}

interface PeriodAggregate {
  label: string;
  recordCount: number;
  // Babak 1: Manpower
  staffShift: number;
  crewShift: number;
  totalPresent: number;
  cutiTotal: number;
  izinSakitTotal: number;
  alpaTotal: number;
  attendanceRate: number;
  // Babak 2: Sample Received
  gcRecv: number;
  prodRecv: number;
  expRecv: number;
  smelterRecv: number;
  totalRecv: number;
  // Babak 3: Preparasi & Productivity
  pressFin: number;
  weighFin: number;
  fuseFin: number;
  loiFin: number;
  avgFuseBal: number;
  avgLoiBal: number;
  // Babak 4: XRF Instruments
  epsC: number;
  epsD: number;
  epsE: number;
  epsF: number;
  epsG: number;
  epsH: number;
  s2Puma: number;
  edxrfTotal: number;
  ztmA: number;
  ztmB: number;
  wdxrfTbp: number;
  wdxrfGts: number;
  wdxrfTotal: number;
  avgWdxrfBal: number;
  // Babak 5: QC & CoA
  qcFin: number;
  avgQcBal: number;
  reportFin: number;
  avgReportBal: number;
}

// Custom Tooltip for Recharts
const CustomCompareTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs shadow-xl backdrop-blur-md">
        <p className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1.5 flex items-center justify-between gap-3">
          <span>{label}</span>
          <span className="text-[10px] font-normal text-slate-400">Komparasi Data</span>
        </p>
        <div className="space-y-1.5">
          {payload.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: item.color }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}:
              </span>
              <span className="font-mono font-bold text-slate-900">{formatNumber(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Executive KPI Metric Card with Delta Variance
interface MetricDeltaCardProps {
  title: string;
  valA: number;
  valB: number;
  labelA: string;
  labelB: string;
  unit?: string;
  inverseColors?: boolean; // If true, increase is bad (e.g. Backlog, Absenteeism)
  subtext?: string;
}

const MetricDeltaCard: React.FC<MetricDeltaCardProps> = ({
  title,
  valA,
  valB,
  labelA,
  labelB,
  unit = 'sampel',
  inverseColors = false,
  subtext
}) => {
  const diff = valA - valB;
  const pct = valB > 0 ? ((valA - valB) / valB) * 100 : (valA > 0 ? 100 : 0);
  
  // Decide whether positive diff is good or bad
  const isPositiveGood = !inverseColors;
  const isBetter = diff > 0 ? isPositiveGood : (diff < 0 ? !isPositiveGood : true);
  const isNeutral = diff === 0;

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        
        {/* Main Value of Period A */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {formatNumber(valA)}
          </span>
          <span className="text-xs font-medium text-slate-400">{unit}</span>
        </div>

        {/* Benchmark Value of Period B */}
        <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <span className="truncate pr-2">{labelB}:</span>
          <span className="font-mono font-bold text-slate-700">{formatNumber(valB)} {unit}</span>
        </div>
      </div>

      {/* Delta Badge */}
      <div className="flex items-center justify-between mt-3 pt-2">
        <span className="text-[11px] text-slate-400">Selisih (Δ):</span>
        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
          isNeutral 
            ? 'bg-slate-100 text-slate-600'
            : isBetter 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {isNeutral ? (
            <Minus className="w-3 h-3" />
          ) : diff > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}</span>
          <span className="text-[10px] font-normal">({diff > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`})</span>
        </div>
      </div>
      {subtext && <p className="text-[10px] text-slate-400 mt-1 italic">{subtext}</p>}
    </div>
  );
};

export const DailyPerformanceComparisonCharts: React.FC<DailyPerformanceComparisonChartsProps> = ({
  records
}) => {
  // Navigation & Control States
  const [selectedBabak, setSelectedBabak] = useState<BabakId>('all');
  const [compareType, setCompareType] = useState<CompareType>('month');

  // Extract available periods
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      const parts = r.date.split('/');
      if (parts.length === 3) set.add(`${parts[1]}/${parts[2]}`);
    });
    return Array.from(set).sort().reverse(); // e.g. ["10/2026", "09/2026"]
  }, [records]);

  const availableWeeks = useMemo(() => {
    const set = new Set<number>();
    records.forEach(r => set.add(r.week));
    return Array.from(set).sort((a, b) => b - a); // e.g. [43, 42, 41, 40...]
  }, [records]);

  // Selected periods for Comparison
  const [monthA, setMonthA] = useState<string>(() => availableMonths[0] || '10/2026');
  const [monthB, setMonthB] = useState<string>(() => availableMonths[1] || availableMonths[0] || '09/2026');

  const [weekA, setWeekA] = useState<number>(() => availableWeeks[0] || 42);
  const [weekB, setWeekB] = useState<number>(() => availableWeeks[1] || availableWeeks[0] || 41);

  const [shiftA, setShiftA] = useState<'DAY' | 'NIGHT'>('DAY');
  const [shiftB, setShiftB] = useState<'DAY' | 'NIGHT'>('NIGHT');

  // Swap Periods
  const handleSwap = () => {
    if (compareType === 'month') {
      const temp = monthA;
      setMonthA(monthB);
      setMonthB(temp);
    } else if (compareType === 'week') {
      const temp = weekA;
      setWeekA(weekB);
      setWeekB(temp);
    } else {
      const temp = shiftA;
      setShiftA(shiftB);
      setShiftB(temp);
    }
  };

  // Helper to aggregate records
  const calculateAggregate = (recs: DailyPerformanceRecord[], label: string): PeriodAggregate => {
    let staffShift = 0;
    let crewShift = 0;
    let totalPresent = 0;
    let cutiTotal = 0;
    let izinSakitTotal = 0;
    let alpaTotal = 0;
    let plannedTotal = 0;

    let gcRecv = 0;
    let prodRecv = 0;
    let expRecv = 0;
    let smelterRecv = 0;
    let totalRecv = 0;

    let pressFin = 0;
    let weighFin = 0;
    let fuseFin = 0;
    let loiFin = 0;
    let sumFuseBal = 0;
    let sumLoiBal = 0;

    let epsC = 0;
    let epsD = 0;
    let epsE = 0;
    let epsF = 0;
    let epsG = 0;
    let epsH = 0;
    let s2Puma = 0;
    let edxrfTotal = 0;

    let ztmA = 0;
    let ztmB = 0;
    let wdxrfTbp = 0;
    let wdxrfGts = 0;
    let wdxrfTotal = 0;
    let sumWdxrfBal = 0;

    let qcFin = 0;
    let sumQcBal = 0;
    let reportFin = 0;
    let sumReportBal = 0;

    recs.forEach(r => {
      // Manpower
      staffShift += r.manpower.staff.shift;
      crewShift += r.manpower.crew.shift;
      totalPresent += (r.manpower.staff.shift + r.manpower.crew.shift);
      cutiTotal += (r.manpower.staff.cuti + r.manpower.crew.cuti);
      izinSakitTotal += (r.manpower.staff.izin + r.manpower.crew.izin + r.manpower.staff.sakit + r.manpower.crew.sakit);
      alpaTotal += (r.manpower.staff.alpa + r.manpower.crew.alpa);
      plannedTotal += (r.manpower.staff.total + r.manpower.crew.total);

      // Received
      gcRecv += r.sampleReceived.gc.shift;
      prodRecv += r.sampleReceived.prod.shift;
      expRecv += r.sampleReceived.exp.shift;
      smelterRecv += r.sampleReceived.smelter.shift;
      totalRecv += (r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift + r.sampleReceived.smelter.shift);

      // Prep
      pressFin += r.pressPowder.finish.shift;
      weighFin += r.fuseBead.finishShift;
      fuseFin += r.fuseBead.finishShift;
      loiFin += r.loi.finLoiShift;
      sumFuseBal += (r.fuseBead.balExp || 0);
      sumLoiBal += (r.loi.bal || 0);

      // EDXRF
      epsC += r.edxrf.epsC;
      epsD += r.edxrf.epsD;
      epsE += r.edxrf.epsE;
      epsF += r.edxrf.epsF;
      epsG += r.edxrf.epsG;
      epsH += r.edxrf.epsH;
      s2Puma += r.edxrf.s2Puma;
      edxrfTotal += r.edxrf.shift;

      // WDXRF
      const zGts = (r.wdxrf.zetiumA.gts || 0) + (r.wdxrf.zetiumB.gts || 0);
      const zTot = r.wdxrf.zetiumA.total + r.wdxrf.zetiumB.total;
      const zTbp = Math.max(0, zTot - zGts);

      ztmA += r.wdxrf.zetiumA.total;
      ztmB += r.wdxrf.zetiumB.total;
      wdxrfTbp += zTbp;
      wdxrfGts += zGts;
      wdxrfTotal += zTot;
      sumWdxrfBal += (r.wdxrf.bal || 0);

      // QC & CoA
      qcFin += r.qc.finishShift;
      sumQcBal += (r.qc.bal || 0);
      reportFin += r.report.finishReportDay;
      sumReportBal += (r.report.bal || 0);
    });

    const count = recs.length || 1;
    const attendanceRate = plannedTotal > 0 ? Math.round((totalPresent / plannedTotal) * 100) : 100;

    return {
      label,
      recordCount: recs.length,
      staffShift,
      crewShift,
      totalPresent,
      cutiTotal,
      izinSakitTotal,
      alpaTotal,
      attendanceRate,
      gcRecv,
      prodRecv,
      expRecv,
      smelterRecv,
      totalRecv,
      pressFin,
      weighFin,
      fuseFin,
      loiFin,
      avgFuseBal: Math.round(sumFuseBal / count),
      avgLoiBal: Math.round(sumLoiBal / count),
      epsC,
      epsD,
      epsE,
      epsF,
      epsG,
      epsH,
      s2Puma,
      edxrfTotal,
      ztmA,
      ztmB,
      wdxrfTbp,
      wdxrfGts,
      wdxrfTotal,
      avgWdxrfBal: Math.round(sumWdxrfBal / count),
      qcFin,
      avgQcBal: Math.round(sumQcBal / count),
      reportFin,
      avgReportBal: Math.round(sumReportBal / count)
    };
  };

  // Filter records for Period A and Period B
  const { recordsA, recordsB, labelA, labelB } = useMemo(() => {
    let recsA: DailyPerformanceRecord[] = [];
    let recsB: DailyPerformanceRecord[] = [];
    let lA = '';
    let lB = '';

    if (compareType === 'month') {
      recsA = records.filter(r => r.date.endsWith(`/${monthA}`));
      recsB = records.filter(r => r.date.endsWith(`/${monthB}`));
      lA = `Bulan ${monthA}`;
      lB = `Bulan ${monthB}`;
    } else if (compareType === 'week') {
      recsA = records.filter(r => r.week === weekA);
      recsB = records.filter(r => r.week === weekB);
      lA = `Week ${weekA}`;
      lB = `Week ${weekB}`;
    } else {
      recsA = records.filter(r => r.shiftType === shiftA);
      recsB = records.filter(r => r.shiftType === shiftB);
      lA = `Shift ${shiftA}`;
      lB = `Shift ${shiftB}`;
    }

    return { recordsA: recsA, recordsB: recsB, labelA: lA, labelB: lB };
  }, [records, compareType, monthA, monthB, weekA, weekB, shiftA, shiftB]);

  // Calculated aggregates
  const aggA = useMemo(() => calculateAggregate(recordsA, labelA), [recordsA, labelA]);
  const aggB = useMemo(() => calculateAggregate(recordsB, labelB), [recordsB, labelB]);

  // Side-by-Side Data preparation for Charts
  // 1. Manpower Data
  const manpowerBarData = useMemo(() => [
    { category: 'Staff Hadir', [labelA]: aggA.staffShift, [labelB]: aggB.staffShift },
    { category: 'Crew Hadir', [labelA]: aggA.crewShift, [labelB]: aggB.crewShift },
    { category: 'Cuti Reguler', [labelA]: aggA.cutiTotal, [labelB]: aggB.cutiTotal },
    { category: 'Izin & Sakit', [labelA]: aggA.izinSakitTotal, [labelB]: aggB.izinSakitTotal }
  ], [aggA, aggB, labelA, labelB]);

  // 2. Sample Received Data
  const sampleRecvBarData = useMemo(() => [
    { category: 'Grade Control (GC)', [labelA]: aggA.gcRecv, [labelB]: aggB.gcRecv },
    { category: 'Mine Geo (Prod)', [labelA]: aggA.prodRecv, [labelB]: aggB.prodRecv },
    { category: 'Exploration (EXP)', [labelA]: aggA.expRecv, [labelB]: aggB.expRecv },
    { category: 'Smelter / Special', [labelA]: aggA.smelterRecv, [labelB]: aggB.smelterRecv }
  ], [aggA, aggB, labelA, labelB]);

  // 3. Preparasi Data
  const prepBarData = useMemo(() => [
    { category: 'Press Powder Pelet', [labelA]: aggA.pressFin, [labelB]: aggB.pressFin },
    { category: 'Fuse Bead Weighing', [labelA]: aggA.weighFin, [labelB]: aggB.weighFin },
    { category: 'Fusion Burn Bead', [labelA]: aggA.fuseFin, [labelB]: aggB.fuseFin },
    { category: 'LOI Furnace Ovens', [labelA]: aggA.loiFin, [labelB]: aggB.loiFin },
    { category: 'Rata2 Backlog Bead', [labelA]: aggA.avgFuseBal, [labelB]: aggB.avgFuseBal }
  ], [aggA, aggB, labelA, labelB]);

  // 4. XRF Instruments Data
  const xrfBarData = useMemo(() => [
    { category: 'EPS C', [labelA]: aggA.epsC, [labelB]: aggB.epsC },
    { category: 'EPS D', [labelA]: aggA.epsD, [labelB]: aggB.epsD },
    { category: 'EPS E', [labelA]: aggA.epsE, [labelB]: aggB.epsE },
    { category: 'EPS F', [labelA]: aggA.epsF, [labelB]: aggB.epsF },
    { category: 'EPS G', [labelA]: aggA.epsG, [labelB]: aggB.epsG },
    { category: 'EPS H', [labelA]: aggA.epsH, [labelB]: aggB.epsH },
    { category: 'S2 Puma', [labelA]: aggA.s2Puma, [labelB]: aggB.s2Puma },
    { category: 'Zetium A', [labelA]: aggA.ztmA, [labelB]: aggB.ztmA },
    { category: 'Zetium B', [labelA]: aggA.ztmB, [labelB]: aggB.ztmB }
  ], [aggA, aggB, labelA, labelB]);

  // 5. QC & CoA Data
  const qcBarData = useMemo(() => [
    { category: 'QC Lolos Verifikasi', [labelA]: aggA.qcFin, [labelB]: aggB.qcFin },
    { category: 'Rata2 QC Pending', [labelA]: aggA.avgQcBal, [labelB]: aggB.avgQcBal },
    { category: 'Sertifikat CoA Rilis', [labelA]: aggA.reportFin, [labelB]: aggB.reportFin },
    { category: 'Rata2 CoA O/S', [labelA]: aggA.avgReportBal, [labelB]: aggB.avgReportBal }
  ], [aggA, aggB, labelA, labelB]);

  // Daily Trend Comparison Curve (Overlay Day 1..31)
  const dailyOverlayTrendData = useMemo(() => {
    const mapA = new Map<number, number>();
    const mapB = new Map<number, number>();

    recordsA.forEach(r => {
      const dayNum = parseInt(r.date.split('/')[0], 10);
      if (!isNaN(dayNum)) {
        let val = 0;
        if (selectedBabak === 'babak1') val = r.manpower.staff.shift + r.manpower.crew.shift;
        else if (selectedBabak === 'babak2') val = r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift;
        else if (selectedBabak === 'babak3') val = r.pressPowder.finish.shift + r.fuseBead.finishShift;
        else if (selectedBabak === 'babak4') val = r.edxrf.shift + r.wdxrf.zetiumA.total + r.wdxrf.zetiumB.total;
        else if (selectedBabak === 'babak5') val = r.qc.finishShift + r.report.finishReportDay;
        else val = r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift;
        mapA.set(dayNum, (mapA.get(dayNum) || 0) + val);
      }
    });

    recordsB.forEach(r => {
      const dayNum = parseInt(r.date.split('/')[0], 10);
      if (!isNaN(dayNum)) {
        let val = 0;
        if (selectedBabak === 'babak1') val = r.manpower.staff.shift + r.manpower.crew.shift;
        else if (selectedBabak === 'babak2') val = r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift;
        else if (selectedBabak === 'babak3') val = r.pressPowder.finish.shift + r.fuseBead.finishShift;
        else if (selectedBabak === 'babak4') val = r.edxrf.shift + r.wdxrf.zetiumA.total + r.wdxrf.zetiumB.total;
        else if (selectedBabak === 'babak5') val = r.qc.finishShift + r.report.finishReportDay;
        else val = r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift;
        mapB.set(dayNum, (mapB.get(dayNum) || 0) + val);
      }
    });

    const maxDay = 31;
    const res = [];
    for (let d = 1; d <= maxDay; d++) {
      if (mapA.has(d) || mapB.has(d)) {
        res.push({
          day: `Tgl ${d}`,
          [labelA]: mapA.get(d) || 0,
          [labelB]: mapB.get(d) || 0
        });
      }
    }
    return res;
  }, [recordsA, recordsB, selectedBabak, labelA, labelB]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER & COMPARISON CONTROLS */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Executive Comparison Cockpit
              </span>
              <span className="text-xs text-slate-400">• Multi-Period Analytics</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Mode Analisis & Komparasi Kinerja Antar Periode
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Evaluasi mendalam per babak operasional untuk membandingkan output, ritme produksi, utilisasi instrumen, dan penanganan antrean.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <button
              onClick={() => { setCompareType('month'); setMonthA(availableMonths[0]); setMonthB(availableMonths[1] || availableMonths[0]); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                compareType === 'month' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan (MoM)
            </button>
            <button
              onClick={() => { setCompareType('week'); setWeekA(availableWeeks[0]); setWeekB(availableWeeks[1] || availableWeeks[0]); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                compareType === 'week' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Minggu (WoW)
            </button>
            <button
              onClick={() => { setCompareType('shift'); setShiftA('DAY'); setShiftB('NIGHT'); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                compareType === 'shift' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift Day vs Night
            </button>
          </div>
        </div>

        {/* INTERACTIVE COMPARISON PERIOD SELECTOR */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          
          {/* Period A (Primary / Current) */}
          <div className="md:col-span-5 flex items-center justify-between p-2.5 rounded-xl bg-white border border-teal-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Periode Utama (A)</span>
                <p className="font-bold text-slate-800 text-xs truncate">{labelA}</p>
              </div>
            </div>

            {compareType === 'month' && (
              <select
                value={monthA}
                onChange={e => setMonthA(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-300 font-bold text-teal-900 cursor-pointer focus:outline-none"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>Bulan {m}</option>
                ))}
              </select>
            )}

            {compareType === 'week' && (
              <select
                value={weekA}
                onChange={e => setWeekA(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-300 font-bold text-teal-900 cursor-pointer focus:outline-none"
              >
                {availableWeeks.map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            )}

            {compareType === 'shift' && (
              <select
                value={shiftA}
                onChange={e => setShiftA(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-300 font-bold text-teal-900 cursor-pointer focus:outline-none"
              >
                <option value="DAY">Shift DAY (Siang)</option>
                <option value="NIGHT">Shift NIGHT (Malam)</option>
              </select>
            )}
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              onClick={handleSwap}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
              title="Tukar Posisi Periode A dan B"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Period B (Benchmark / Comparison) */}
          <div className="md:col-span-5 flex items-center justify-between p-2.5 rounded-xl bg-white border border-indigo-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Periode Pembanding (B)</span>
                <p className="font-bold text-slate-800 text-xs truncate">{labelB}</p>
              </div>
            </div>

            {compareType === 'month' && (
              <select
                value={monthB}
                onChange={e => setMonthB(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-300 font-bold text-indigo-900 cursor-pointer focus:outline-none"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>Bulan {m}</option>
                ))}
              </select>
            )}

            {compareType === 'week' && (
              <select
                value={weekB}
                onChange={e => setWeekB(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-300 font-bold text-indigo-900 cursor-pointer focus:outline-none"
              >
                {availableWeeks.map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            )}

            {compareType === 'shift' && (
              <select
                value={shiftB}
                onChange={e => setShiftB(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-300 font-bold text-indigo-900 cursor-pointer focus:outline-none"
              >
                <option value="DAY">Shift DAY (Siang)</option>
                <option value="NIGHT">Shift NIGHT (Malam)</option>
              </select>
            )}
          </div>

        </div>

        {/* BABAK TABS SELECTOR */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
          <button
            onClick={() => setSelectedBabak('all')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedBabak === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Semua Babak (Ringkasan)</span>
          </button>

          <button
            onClick={() => setSelectedBabak('babak1')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedBabak === 'babak1'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Babak 1: SDM & Manpower</span>
          </button>

          <button
            onClick={() => setSelectedBabak('babak2')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedBabak === 'babak2'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Babak 2: Sample Received</span>
          </button>

          <button
            onClick={() => setSelectedBabak('babak3')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedBabak === 'babak3'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Babak 3: Preparasi & Backlog</span>
          </button>

          <button
            onClick={() => setSelectedBabak('babak4')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedBabak === 'babak4'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Babak 4: Spektrometri XRF</span>
          </button>

          <button
            onClick={() => setSelectedBabak('babak5')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedBabak === 'babak5'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Babak 5: QC & Pelepasan CoA</span>
          </button>
        </div>

      </div>

      {/* ================= SECTION CONTENT PER BABAK ================= */}

      {/* ALL BABAK EXECUTIVE OVERVIEW */}
      {selectedBabak === 'all' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <MetricDeltaCard
              title="Babak 1: Kehadiran Total"
              valA={aggA.totalPresent}
              valB={aggB.totalPresent}
              labelA={labelA}
              labelB={labelB}
              unit="orang"
              subtext={`Attendance rate: ${aggA.attendanceRate}% vs ${aggB.attendanceRate}%`}
            />
            <MetricDeltaCard
              title="Babak 2: Total Sampel Masuk"
              valA={aggA.totalRecv}
              valB={aggB.totalRecv}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
              subtext={`GC: ${formatNumber(aggA.gcRecv)} vs ${formatNumber(aggB.gcRecv)}`}
            />
            <MetricDeltaCard
              title="Babak 3: Fuse Bead Selesai"
              valA={aggA.fuseFin}
              valB={aggB.fuseFin}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
              subtext={`Backlog sisa: ${formatNumber(aggA.avgFuseBal)}`}
            />
            <MetricDeltaCard
              title="Babak 4: EDXRF + WDXRF Run"
              valA={aggA.edxrfTotal + aggA.wdxrfTotal}
              valB={aggB.edxrfTotal + aggB.wdxrfTotal}
              labelA={labelA}
              labelB={labelB}
              unit="analisis"
              subtext={`EDXRF: ${formatNumber(aggA.edxrfTotal)} | WDX: ${formatNumber(aggA.wdxrfTotal)}`}
            />
            <MetricDeltaCard
              title="Babak 5: Laporan CoA Dirilis"
              valA={aggA.reportFin}
              valB={aggB.reportFin}
              labelA={labelA}
              labelB={labelB}
              unit="laporan"
              subtext={`QC lolos: ${formatNumber(aggA.qcFin)} sampel`}
            />
          </div>

          {/* High Level 5 Babak Side-by-Side Comparison */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-600" />
                  Komparasi Output Utama 5 Babak Operasional
                </h3>
                <p className="text-xs text-slate-500">Perbandingan volume sampel kunci antara {labelA} (Teal) dan {labelB} (Indigo)</p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { babak: 'B1: SDM Hadir', [labelA]: aggA.totalPresent, [labelB]: aggB.totalPresent },
                  { babak: 'B2: Sampel Masuk', [labelA]: aggA.totalRecv, [labelB]: aggB.totalRecv },
                  { babak: 'B3: Pelet Press', [labelA]: aggA.pressFin, [labelB]: aggB.pressFin },
                  { babak: 'B3: Fuse Bead', [labelA]: aggA.fuseFin, [labelB]: aggB.fuseFin },
                  { babak: 'B4: EDXRF Run', [labelA]: aggA.edxrfTotal, [labelB]: aggB.edxrfTotal },
                  { babak: 'B4: WDXRF Run', [labelA]: aggA.wdxrfTotal, [labelB]: aggB.wdxrfTotal },
                  { babak: 'B5: CoA Rilis', [labelA]: aggA.reportFin, [labelB]: aggB.reportFin }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="babak" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomCompareTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey={labelA} fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={labelB} fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* BABAK 1: SDM & MANPOWER */}
      {selectedBabak === 'babak1' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricDeltaCard
              title="Crew Operasional Hadir"
              valA={aggA.crewShift}
              valB={aggB.crewShift}
              labelA={labelA}
              labelB={labelB}
              unit="orang"
            />
            <MetricDeltaCard
              title="Staff Pengawas Hadir"
              valA={aggA.staffShift}
              valB={aggB.staffShift}
              labelA={labelA}
              labelB={labelB}
              unit="orang"
            />
            <MetricDeltaCard
              title="Personil Cuti Reguler"
              valA={aggA.cutiTotal}
              valB={aggB.cutiTotal}
              labelA={labelA}
              labelB={labelB}
              unit="orang"
              inverseColors={true}
            />
            <MetricDeltaCard
              title="Izin & Sakit"
              valA={aggA.izinSakitTotal}
              valB={aggB.izinSakitTotal}
              labelA={labelA}
              labelB={labelB}
              unit="orang"
              inverseColors={true}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Komparasi Kesiapan SDM ({labelA} vs {labelB})
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={manpowerBarData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey={labelA} fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={labelB} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Tren Fluktuasi Kehadiran Harian
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Pola kestabilan personil hadir per tanggal kalender antara kedua periode.
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyOverlayTrendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey={labelA} stroke="#0d9488" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey={labelB} stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                💡 <span className="font-bold">Insight Manajemen:</span> Tingkat kehadiran {labelA} adalah <strong>{aggA.attendanceRate}%</strong> berbanding <strong>{aggB.attendanceRate}%</strong> pada {labelB}.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BABAK 2: SAMPLE RECEIVED */}
      {selectedBabak === 'babak2' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricDeltaCard
              title="Grade Control (GC)"
              valA={aggA.gcRecv}
              valB={aggB.gcRecv}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
            />
            <MetricDeltaCard
              title="Mine Geology (Prod)"
              valA={aggA.prodRecv}
              valB={aggB.prodRecv}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
            />
            <MetricDeltaCard
              title="Exploration (EXP)"
              valA={aggA.expRecv}
              valB={aggB.expRecv}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
            />
            <MetricDeltaCard
              title="Smelter / External"
              valA={aggA.smelterRecv}
              valB={aggB.smelterRecv}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                Komparasi Pasokan Sampel Masuk ({labelA} vs {labelB})
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sampleRecvBarData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey={labelA} fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={labelB} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  Ritme Ritase Sampel Masuk Harian
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mendeteksi adanya hari-hari lonjakan pasokan bijih tambang yang ekstrim.
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyOverlayTrendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey={labelA} stroke="#0d9488" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey={labelB} stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                📊 <span className="font-bold">Total Sampel Masuk:</span> {labelA} mencapai <strong>{formatNumber(aggA.totalRecv)}</strong> sampel vs <strong>{formatNumber(aggB.totalRecv)}</strong> sampel di {labelB}.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BABAK 3: PREPARASI & PRODUKTIVITAS */}
      {selectedBabak === 'babak3' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricDeltaCard
              title="Pelet Press Powder Selesai"
              valA={aggA.pressFin}
              valB={aggB.pressFin}
              labelA={labelA}
              labelB={labelB}
              unit="pelet"
            />
            <MetricDeltaCard
              title="Fuse Bead Peleburan Selesai"
              valA={aggA.fuseFin}
              valB={aggB.fuseFin}
              labelA={labelA}
              labelB={labelB}
              unit="bead"
            />
            <MetricDeltaCard
              title="LOI Furnace Selesai"
              valA={aggA.loiFin}
              valB={aggB.loiFin}
              labelA={labelA}
              labelB={labelB}
              unit="crucible"
            />
            <MetricDeltaCard
              title="Rata-rata Backlog Antrean Bead"
              valA={aggA.avgFuseBal}
              valB={aggB.avgFuseBal}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
              inverseColors={true}
              subtext="Makin rendah backlog, aliran sampel makin lancar"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                Komparasi Output Preparasi Fisik vs Backlog ({labelA} vs {labelB})
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepBarData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey={labelA} fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={labelB} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  Tren Produktivitas Preparasi Harian
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Kestabilan produksi pelet press powder dan fuse bead harian.
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyOverlayTrendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey={labelA} stroke="#0d9488" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey={labelB} stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                🔥 <span className="font-bold">Status Antrean:</span> Saldo sisa antrean bead di {labelA} rata-rata <strong>{aggA.avgFuseBal}</strong> vs <strong>{aggB.avgFuseBal}</strong> di {labelB}.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BABAK 4: SPEKTROMETRI XRF */}
      {selectedBabak === 'babak4' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricDeltaCard
              title="Total EDXRF (6 Mesin Epsilon)"
              valA={aggA.edxrfTotal}
              valB={aggB.edxrfTotal}
              labelA={labelA}
              labelB={labelB}
              unit="analisis"
            />
            <MetricDeltaCard
              title="WDXRF Zetium A (TBP / GPS)"
              valA={aggA.ztmA}
              valB={aggB.ztmA}
              labelA={labelA}
              labelB={labelB}
              unit="run"
            />
            <MetricDeltaCard
              title="WDXRF Zetium B (TBP & GTS)"
              valA={aggA.ztmB}
              valB={aggB.ztmB}
              labelA={labelA}
              labelB={labelB}
              unit="run"
            />
            <MetricDeltaCard
              title="Total Run Spektrometri XRF"
              valA={aggA.edxrfTotal + aggA.wdxrfTotal}
              valB={aggB.edxrfTotal + aggB.wdxrfTotal}
              labelA={labelA}
              labelB={labelB}
              unit="run"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-600" />
                Komparasi Utilisasi per Instrumen ({labelA} vs {labelB})
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={xrfBarData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey={labelA} fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={labelB} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  Tren Kecepatan Pembacaan Instrumen Harian
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Komparasi stabilitas jumlah run instrumen EDXRF dan WDXRF harian.
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyOverlayTrendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey={labelA} stroke="#0d9488" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey={labelB} stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                ⚡ <span className="font-bold">Total Beban Spektrometer:</span> Di {labelA} mesin XRF menyelesaikan <strong>{formatNumber(aggA.edxrfTotal + aggA.wdxrfTotal)}</strong> run vs <strong>{formatNumber(aggB.edxrfTotal + aggB.wdxrfTotal)}</strong> di {labelB}.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BABAK 5: QC & PELEPASAN COA */}
      {selectedBabak === 'babak5' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricDeltaCard
              title="Sampel Lolos QC Verification"
              valA={aggA.qcFin}
              valB={aggB.qcFin}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
            />
            <MetricDeltaCard
              title="Rata-rata QC Pending"
              valA={aggA.avgQcBal}
              valB={aggB.avgQcBal}
              labelA={labelA}
              labelB={labelB}
              unit="sampel"
              inverseColors={true}
            />
            <MetricDeltaCard
              title="Sertifikat Analisis (CoA) Dirilis"
              valA={aggA.reportFin}
              valB={aggB.reportFin}
              labelA={labelA}
              labelB={labelB}
              unit="laporan"
            />
            <MetricDeltaCard
              title="Rata-rata CoA Outstanding"
              valA={aggA.avgReportBal}
              valB={aggB.avgReportBal}
              labelA={labelA}
              labelB={labelB}
              unit="laporan"
              inverseColors={true}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Komparasi Kinerja QC & Pelepasan CoA ({labelA} vs {labelB})
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qcBarData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey={labelA} fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={labelB} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Tren Rilis Laporan Harian
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mengevaluasi ketepatan waktu pelepasan sertifikat hasil analisis harian.
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyOverlayTrendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomCompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey={labelA} stroke="#0d9488" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey={labelB} stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                📋 <span className="font-bold">Turn-Around-Time (TAT):</span> Total sertifikat dirilis {labelA} sebanyak <strong>{formatNumber(aggA.reportFin)}</strong> vs <strong>{formatNumber(aggB.reportFin)}</strong> di {labelB}.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
