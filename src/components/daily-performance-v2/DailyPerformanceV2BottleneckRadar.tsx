import React, { useMemo } from 'react';
import { 
  AlertTriangle, CheckCircle2, ArrowRight, Activity, 
  Layers, Flame, Cpu, FileCheck, Zap, TrendingDown, TrendingUp
} from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-v2-types';
import { 
  formatNumber, 
  detectAllStationBottlenecks 
} from './daily-performance-v2-utils';

interface DailyPerformanceV2BottleneckRadarProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
}

export const DailyPerformanceV2BottleneckRadar: React.FC<DailyPerformanceV2BottleneckRadarProps> = ({
  records,
  selectedDate
}) => {
  const recordsForDate = useMemo(() => {
    return records.filter(r => r.date === selectedDate);
  }, [records, selectedDate]);

  const isLongShift = useMemo(() => {
    return recordsForDate.some(r => r.shiftType === 'LS');
  }, [recordsForDate]);

  const dayRecord = useMemo(() => {
    return recordsForDate.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
  }, [recordsForDate]);

  const nightRecord = useMemo(() => {
    if (isLongShift) return null;
    return recordsForDate.find(r => r.shiftType === 'NIGHT');
  }, [recordsForDate, isLongShift]);

  const bottlenecks = useMemo(() => {
    if (!dayRecord) return [];
    return detectAllStationBottlenecks(dayRecord, nightRecord || undefined, isLongShift);
  }, [dayRecord, nightRecord, isLongShift]);

  if (!dayRecord) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Data Belum Tersedia</h3>
        <p className="text-xs text-slate-500">
          Tidak ditemukan logbook kinerja untuk tanggal {selectedDate}.
        </p>
      </div>
    );
  }

  const criticalCount = bottlenecks.filter(b => b.health === 'critical').length;
  const warningCount = bottlenecks.filter(b => b.health === 'warning').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* STATUS BANNER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
              Pipeline Flow & Bottleneck Radar
            </span>
            <span className="text-xs text-slate-400">• Tanggal {selectedDate}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            Deteksi Dini Hambatan Throughput Laboratorium
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Menganalisis rasio penerimaan terhadap penyelesaian sampel di setiap stasiun untuk mencegah penumpukan antrean.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {criticalCount === 0 && warningCount === 0 ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Seluruh Stasiun Optimal</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>
                {criticalCount > 0 ? `${criticalCount} Stasiun Kritis` : `${warningCount} Perlu Perhatian`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PIPELINE FLOW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bottlenecks.map(station => {
          const isCritical = station.health === 'critical';
          const isWarning = station.health === 'warning';

          return (
            <div
              key={station.stationKey}
              className={`p-5 rounded-3xl border transition-all space-y-3.5 ${
                isCritical
                  ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 shadow-xs ring-1 ring-rose-400/20'
                  : isWarning
                  ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                    isCritical 
                      ? 'bg-rose-500 text-white' 
                      : isWarning 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-teal-600 text-white'
                  }`}>
                    {station.stageNum}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {station.name}
                  </h3>
                </div>

                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isCritical
                    ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200'
                    : isWarning
                    ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                }`}>
                  {isCritical ? 'Kritis' : isWarning ? 'Waspada' : 'Lancar'}
                </span>
              </div>

              {/* Numerical Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                  <span className="text-[9px] text-slate-400 block font-sans">Masuk</span>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400">+{formatNumber(station.received)}</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                  <span className="text-[9px] text-slate-400 block font-sans">Selesai</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(station.finished)}</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                  <span className="text-[9px] text-slate-400 block font-sans">Sisa Bal</span>
                  <span className={`text-xs font-black ${isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'}`}>
                    {formatNumber(station.balance)}
                  </span>
                </div>
              </div>

              {/* Reason & Recommendation */}
              {(station.reason || station.recommendation) && (
                <div className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  isCritical 
                    ? 'bg-rose-100/70 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800' 
                    : 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                }`}>
                  {station.reason && <p className="font-bold">{station.reason}</p>}
                  {station.recommendation && <p className="text-[11px] opacity-90">Rekomendasi: {station.recommendation}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
