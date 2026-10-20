import React from 'react';
import { 
  ArrowRight, AlertTriangle, CheckCircle2, Flame, Layers, 
  Cpu, FileCheck, Users, ShieldAlert, Sparkles, TrendingUp
} from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-types';
import { formatNumber } from './daily-performance-utils';

interface DailyPerformancePipelineFunnelProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
  isPresentationMode?: boolean;
}

export const DailyPerformancePipelineFunnel: React.FC<DailyPerformancePipelineFunnelProps> = ({
  records,
  selectedDate,
  isPresentationMode = false
}) => {
  // Filter for the selected date
  const dayRecords = records.filter(r => r.date === selectedDate || r.isoDate === selectedDate);
  const dayShift = dayRecords.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
  const nightShift = dayRecords.find(r => r.shiftType === 'NIGHT');

  // Aggregated totals for this date
  const totalReceived = dayRecords.reduce((acc, r) => 
    acc + r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift + r.sampleReceived.smelter.shift, 0
  );
  const gcReceived = dayRecords.reduce((acc, r) => acc + r.sampleReceived.gc.shift, 0);
  const prodReceived = dayRecords.reduce((acc, r) => acc + r.sampleReceived.prod.shift, 0);
  const expReceived = dayRecords.reduce((acc, r) => acc + r.sampleReceived.exp.shift, 0);

  // Prep Stage
  const pressFinish = dayRecords.reduce((acc, r) => acc + r.pressPowder.finish.shift, 0);
  const fuseBeadFinish = dayRecords.reduce((acc, r) => acc + r.fuseBead.finishShift, 0);
  const fuseBeadBal = dayRecords[dayRecords.length - 1]?.fuseBead.balExp || 0;

  // Analysis Stage
  const edxrfRuns = dayRecords.reduce((acc, r) => acc + r.edxrf.shift, 0);
  const ztmARuns = dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.total, 0);
  const ztmBRuns = dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.total, 0);
  const totalWdxrf = ztmARuns + ztmBRuns;
  const wdxrfBal = dayRecords[dayRecords.length - 1]?.wdxrf.bal || 0;
  const loiRuns = dayRecords.reduce((acc, r) => acc + r.loi.finLoiShift, 0);
  const loiBal = dayRecords[dayRecords.length - 1]?.loi.bal || 0;

  // QC & Report
  const qcDone = dayRecords.reduce((acc, r) => acc + r.qc.finishShift, 0);
  const qcBal = dayRecords[dayRecords.length - 1]?.qc.bal || 0;
  const reportDone = dayRecords.reduce((acc, r) => acc + r.report.finishReportDay, 0);
  const reportBal = dayRecords[dayRecords.length - 1]?.report.bal || 0;

  // Manpower
  const staffPresent = dayRecords.reduce((acc, r) => acc + r.manpower.staff.shift, 0);
  const crewPresent = dayRecords.reduce((acc, r) => acc + r.manpower.crew.shift, 0);

  // Severe bottleneck detection
  const isWdxrfBottleneck = wdxrfBal > 300;
  const isLoiBottleneck = loiBal > 250;
  const isFuseBottleneck = fuseBeadBal > 300;

  return (
    <div className="space-y-6">
      {/* Top Header Summary in Funnel */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-indigo-500/10 border border-teal-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500 text-white shadow-md shadow-teal-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base sm:text-lg flex items-center gap-2">
              Alur Rantai Operasional Laboratorium (Pipeline View)
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
                {selectedDate}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualisasi hulu ke hilir tanpa scroll horizontal. Mengawasi throughput, utilisasi instrumen, dan penumpukan saldo (backlog).
            </p>
          </div>
        </div>

        {/* Quick Shift Badges */}
        <div className="flex items-center gap-2">
          {dayShift && (
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
              <span className="text-slate-400">Siang:</span>{' '}
              <span className="font-bold text-teal-600 dark:text-teal-400">Regu {dayShift.regu}</span>
              <span className="text-slate-400 text-[10px] ml-1">({dayShift.shiftType})</span>
            </div>
          )}
          {nightShift && (
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
              <span className="text-slate-400">Malam:</span>{' '}
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Regu {nightShift.regu}</span>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>{staffPresent} Staff + {crewPresent} Crew</span>
          </div>
        </div>
      </div>

      {/* 4 Pipeline Stages in Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        
        {/* STAGE 1: SAMPLE INTAKE */}
        <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> 1. Sample Intake
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-medium">
                Penerimaan
              </span>
            </div>

            <div className="my-2">
              <div className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
                {formatNumber(totalReceived)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total sampel diterima hari ini
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500" /> Grade Control (GC)
                </span>
                <span className="font-mono font-semibold">{formatNumber(gcReceived)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Produksi (PROD)
                </span>
                <span className="font-mono font-semibold">{formatNumber(prodReceived)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Eksplorasi (EXP)
                </span>
                <span className="font-mono font-semibold">{formatNumber(expReceived)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Status Log-in</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Tercatat
            </span>
          </div>
        </div>

        {/* STAGE 2: PREPARATION (Press Powder & Fuse Bead) */}
        <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> 2. Preparasi Sampel
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                Pelet & Bead
              </span>
            </div>

            <div className="my-2">
              <div className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
                {formatNumber(pressFinish + fuseBeadFinish)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total item preparasi selesai
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> Press Powder Pelet
                </span>
                <span className="font-mono font-semibold">{formatNumber(pressFinish)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Weighing Fuse Bead
                </span>
                <span className="font-mono font-semibold">{formatNumber(fuseBeadFinish)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Saldo Fuse Bead (Bal):</span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
              isFuseBottleneck 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {formatNumber(fuseBeadBal)} exp
            </span>
          </div>
        </div>

        {/* STAGE 3: INSTRUMENT RUN (EDXRF & WDXRF & LOI) */}
        <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> 3. Instrumen & Analisis
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                XRF & LOI
              </span>
            </div>

            <div className="my-2">
              <div className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
                {formatNumber(edxrfRuns + totalWdxrf + loiRuns)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total pembacaan run instrumen
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" /> EDXRF (Epsilon & S2)
                </span>
                <span className="font-mono font-semibold">{formatNumber(edxrfRuns)} run</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> WDXRF (Zetium A+B)
                </span>
                <span className="font-mono font-semibold">{formatNumber(totalWdxrf)} run</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> LOI (W2, W4, W5)
                </span>
                <span className="font-mono font-semibold">{formatNumber(loiRuns)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Backlog WDXRF:</span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
              isWdxrfBottleneck 
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 animate-pulse' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {formatNumber(wdxrfBal)} exp
            </span>
          </div>
        </div>

        {/* STAGE 4: QC & FINAL REPORT RELEASE */}
        <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" /> 4. QC & Pelaporan
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
                Rilis Akhir
              </span>
            </div>

            <div className="my-2">
              <div className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
                {formatNumber(reportDone)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Laporan & CoA selesai dirilis
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> QC Validated
                </span>
                <span className="font-mono font-semibold">{formatNumber(qcDone)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500" /> Saldo QC Tertunda
                </span>
                <span className="font-mono font-semibold">{formatNumber(qcBal)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Sisa Laporan O/S
                </span>
                <span className="font-mono font-semibold">{formatNumber(reportBal)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Status Pelepasan:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {reportBal === 0 ? 'Semua Rilis' : `${formatNumber(reportBal)} Pending`}
            </span>
          </div>
        </div>

      </div>

      {/* Bottleneck Alert Banner if any station is congested */}
      {(isWdxrfBottleneck || isFuseBottleneck || isLoiBottleneck) && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-white mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
              Perhatian Bottleneck Operasional
            </h4>
            <div className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {isWdxrfBottleneck && (
                <span>• <strong>WDXRF Zetium:</strong> Terjadi akumulasi backlog sebesar <strong>{formatNumber(wdxrfBal)} sampel</strong>. Evaluasi utilisasi Zetium A & B.</span>
              )}
              {isFuseBottleneck && (
                <span>• <strong>Weighing Fuse Bead:</strong> Saldo preparasi manik mencapai <strong>{formatNumber(fuseBeadBal)} sampel</strong>.</span>
              )}
              {isLoiBottleneck && (
                <span>• <strong>LOI Furnaces:</strong> Antrean pengabuan mencapai <strong>{formatNumber(loiBal)} sampel</strong>.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
