import React from 'react';
import { 
  ArrowRight, Award, TrendingDown, TrendingUp, 
  Clock, Zap, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import { formatNumber } from './daily-performance-v2-utils';
import { DailyPerformanceV2InBarCell } from './DailyPerformanceV2InBarCell';
import { BatchBreakdownItem } from './daily-performance-v2-types';

export interface ShiftRelayCardProps {
  title: string;
  stationSubtitle?: string;
  unit?: string;
  osMorning: number;
  receivedDay: number;
  finishedDay: number;
  balanceDay: number;
  receivedNight?: number;
  finishedNight?: number;
  balanceNight?: number;
  shiftDayName?: string;
  shiftNightName?: string;
  isLongShift?: boolean;
  maxMonthFinish?: number;
  colorVariant?: 'teal' | 'amber' | 'emerald' | 'sky' | 'indigo' | 'purple' | 'rose';
  extraSnippet?: React.ReactNode;
  osMorningBreakdown?: BatchBreakdownItem[];
  osDayBreakdown?: BatchBreakdownItem[];
  balanceNightBreakdown?: BatchBreakdownItem[];
  osNightBreakdown?: BatchBreakdownItem[];
  onOpenBatchManager?: () => void;
  batchManagerLabel?: string;
}

/**
 * Komponen sel angka dengan penanda sudut segitiga merah khas Excel Note/Comment
 * dan kartu popup kuning yang menampilkan rincian batch per PT saat kursor mouse di-hover.
 */
const ExcelCommentCell: React.FC<{
  value: number;
  unit?: string;
  breakdown?: BatchBreakdownItem[];
  colorClass?: string;
  sizeClass?: string;
}> = ({ 
  value, 
  unit, 
  breakdown, 
  colorClass = 'text-slate-800 dark:text-slate-100',
  sizeClass = 'text-xl'
}) => {
  const hasBreakdown = Boolean(breakdown && breakdown.length > 0 && value > 0);

  return (
    <div className="relative group inline-block">
      <div className="flex items-center gap-1.5 cursor-help">
        <span className={`font-black font-mono mt-0.5 ${sizeClass} ${colorClass}`}>
          {formatNumber(value)} <span className="text-xs font-normal opacity-70">{unit}</span>
        </span>
        {hasBreakdown && (
          <span 
            className="w-0 h-0 border-t-[8px] border-t-rose-500 border-l-[8px] border-l-transparent absolute -top-1 -right-2.5 cursor-pointer"
            title="Arahkan kursor untuk melihat rincian batch"
          />
        )}
      </div>

      {/* Floating Excel Note Popup on Cursor Hover */}
      {hasBreakdown && (
        <div className="absolute z-50 left-0 top-full mt-2 hidden group-hover:block p-3 rounded-xl bg-amber-50 dark:bg-amber-950/95 border-2 border-amber-300 dark:border-amber-600 shadow-2xl text-left whitespace-nowrap min-w-[150px] font-sans pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800 pb-1 mb-1.5 flex items-center justify-between gap-3">
            <span>User:</span>
            <span className="font-mono text-[9px] text-amber-700 dark:text-amber-300">
              {breakdown!.reduce((sum, b) => sum + b.batchCount, 0)} Batch
            </span>
          </div>
          <div className="space-y-1">
            {breakdown!.map((item, idx) => (
              <div key={idx} className="text-xs font-mono font-black text-slate-900 dark:text-amber-100 flex items-center justify-between gap-3">
                <span>{item.batchCount} BATCH {item.pt.toUpperCase()}</span>
                {item.sampleCount && (
                  <span className="text-[10px] text-slate-500 dark:text-amber-300/80 font-normal">
                    ({item.sampleCount} spl)
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 pt-1 border-t border-amber-200/80 dark:border-amber-800/80 text-[10px] font-mono text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>Total Sample:</span>
            <span className="font-bold">{formatNumber(value)} {unit}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const DailyPerformanceV2ShiftRelayCard: React.FC<ShiftRelayCardProps> = ({
  title,
  stationSubtitle,
  unit = 'spl',
  osMorning,
  receivedDay,
  finishedDay,
  balanceDay,
  receivedNight = 0,
  finishedNight = 0,
  balanceNight = balanceDay,
  shiftDayName = 'Shift A',
  shiftNightName = 'Shift B',
  isLongShift = false,
  maxMonthFinish = 100,
  colorVariant = 'teal',
  extraSnippet,
  osMorningBreakdown,
  osDayBreakdown,
  balanceNightBreakdown,
  osNightBreakdown,
  onOpenBatchManager,
  batchManagerLabel = 'Kelola Batch'
}) => {
  const totalFinished24h = finishedDay + (isLongShift ? 0 : finishedNight);
  const totalReceived24h = receivedDay + (isLongShift ? 0 : receivedNight);

  // Contribution percentages
  const dayPct = totalFinished24h > 0 ? Math.round((finishedDay / totalFinished24h) * 100) : (isLongShift ? 100 : 50);
  const nightPct = isLongShift ? 0 : Math.max(0, 100 - dayPct);

  // Net deltas
  // Pagi: apakah saldo jam 19:00 lebih kecil dari jam 07:00?
  const deltaPagi = balanceDay - osMorning;
  const pagiKurasBacklog = deltaPagi < 0;

  // Malam: apakah saldo jam 07:00 besok lebih kecil dari jam 19:00 tadi malam?
  const deltaMalam = balanceNight - balanceDay;
  const malamKurasBacklog = deltaMalam < 0;

  // Net 24 Jam: apakah saldo yang ditinggalkan ke besok lebih kecil dari saldo kemarin?
  const delta24h = balanceNight - osMorning;
  const net24hKurasBacklog = delta24h < 0;

  // Siapa yang berkontribusi lebih banyak?
  const isNightTop = !isLongShift && finishedNight > finishedDay;
  const isDayTop = isLongShift || finishedDay > finishedNight;
  const isDraw = !isLongShift && finishedDay === finishedNight && totalFinished24h > 0;

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-all">
      
      {/* 1. TOP HEADER: TITLE, TOTAL & TOP CONTRIBUTOR BADGE */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            {stationSubtitle && (
              <span className="text-xs text-slate-400 font-normal hidden sm:inline">
                • {stationSubtitle}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Top Contributor Badge */}
        <div className="flex items-center gap-2">
          {onOpenBatchManager && (
            <button
              onClick={onOpenBatchManager}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 cursor-pointer transition-all shadow-xs"
              title="Daftarkan batch diterima atau tandai batch selesai"
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>{batchManagerLabel}</span>
            </button>
          )}

          {isLongShift ? (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>⚡ 100% {shiftDayName} (Long Shift 07-24)</span>
            </span>
          ) : isNightTop ? (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 shadow-xs">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              <span>Top Contributor: 🌙 {shiftNightName} ({nightPct}% Selesai)</span>
            </span>
          ) : isDayTop ? (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shadow-xs">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Top Contributor: ☀️ {shiftDayName} ({dayPct}% Selesai)</span>
            </span>
          ) : isDraw ? (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              🤝 Kontribusi Seimbang (50% : 50%)
            </span>
          ) : null}

          <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
            Total: {formatNumber(totalFinished24h)} {unit}
          </span>
        </div>
      </div>

      {/* 2. CONTRIBUTION SPLIT BAR (DAY VS NIGHT) */}
      {!isLongShift && totalFinished24h > 0 && (
        <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <span>☀️ {shiftDayName} (Day 07-19):</span>
              <strong className="font-mono text-slate-900 dark:text-white">{formatNumber(finishedDay)} {unit}</strong>
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-mono">({dayPct}%)</span>
            </span>

            <span className="text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <span className="text-[10px] text-indigo-800 dark:text-indigo-300 font-mono">({nightPct}%)</span>
              <strong className="font-mono text-slate-900 dark:text-white">{formatNumber(finishedNight)} {unit}</strong>
              <span>:🌙 {shiftNightName} (Night 19-07)</span>
            </span>
          </div>

          {/* Progress Bar Split */}
          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${dayPct}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
              title={`${shiftDayName} (Pagi): ${finishedDay} ${unit} (${dayPct}%)`}
            />
            <div 
              style={{ width: `${nightPct}%` }}
              className="h-full bg-gradient-to-r from-indigo-400 to-blue-600 transition-all duration-500"
              title={`${shiftNightName} (Malam): ${finishedNight} ${unit} (${nightPct}%)`}
            />
          </div>
        </div>
      )}

      {/* 3. ALUR ESTAFET 4 TAHAP (THE CONTINUOUS RELAY CHAIN) */}
      <div className={`grid gap-3 text-xs ${
        isLongShift ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      }`}>
        
        {/* PILAR 1: BALLANCE 07:00 WIT */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ballance 07:00 WIT
              </span>
            </div>
            <ExcelCommentCell 
              value={osMorning}
              unit={unit}
              breakdown={osMorningBreakdown}
            />
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Warisan saldo yang ditinggalkan oleh shift malam kemarin untuk dimulai jam 07:00 pagi ini.
          </p>
        </div>

        {/* PILAR 2: KINERJA SHIFT PAGI & OS DAY SHIFT */}
        <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                {isLongShift ? '2. Selesai Long Shift' : '2. Kinerja Shift Pagi'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 font-bold text-amber-900 dark:text-amber-200">
                {shiftDayName}
              </span>
            </div>

            {/* Selesai Pagi InBar Cell */}
            <div className="mt-1">
              <DailyPerformanceV2InBarCell
                value={finishedDay}
                maxValue={maxMonthFinish}
                colorVariant="amber"
                unit={unit}
                size="sm"
              />
            </div>
            {receivedDay > 0 && (
              <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 mt-1 block">
                Recieved Day Shift: {formatNumber(receivedDay)} {unit}
              </span>
            )}
          </div>

          {/* Saldo Serah Terima Sore Jam 19:00: OS Day Shift */}
          <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300">
                {isLongShift ? 'Ballance Long Shift (24:00):' : 'OS Day Shift:'}
              </span>
              <ExcelCommentCell 
                value={balanceDay}
                unit={unit}
                breakdown={osDayBreakdown}
                colorClass="text-amber-950 dark:text-amber-100"
                sizeClass="text-sm font-black"
              />
            </div>

            {/* Delta Shift Pagi */}
            <div className="mt-1 flex items-center gap-1 text-[9px] font-bold">
              {pagiKurasBacklog ? (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" />
                  Pagi kurangi beban {Math.abs(deltaPagi)} {unit}
                </span>
              ) : deltaPagi > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  Beban bertambah +{deltaPagi} {unit} ke malam
                </span>
              ) : (
                <span className="text-slate-500">Saldo seimbang (tetap)</span>
              )}
            </div>
          </div>
        </div>

        {/* PILAR 3: KINERJA SHIFT MALAM (NIGHT SHIFT) */}
        {!isLongShift && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">
                  3. Kinerja Shift Malam
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900/60 font-bold text-indigo-900 dark:text-indigo-200">
                  {shiftNightName}
                </span>
              </div>

              {/* Selesai Malam InBar Cell */}
              <div className="mt-1">
                <DailyPerformanceV2InBarCell
                  value={finishedNight}
                  maxValue={maxMonthFinish}
                  colorVariant="indigo"
                  unit={unit}
                  size="sm"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1 block">
                Menerima dari Pagi: {formatNumber(balanceDay)} {unit}
              </span>
            </div>

            {/* Saldo Penutupan Jam 07:00: Ballance Night Shift */}
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300">
                  Ballance Night Shift:
                </span>
                <ExcelCommentCell 
                  value={balanceNight}
                  unit={unit}
                  breakdown={balanceNightBreakdown}
                  colorClass="text-indigo-950 dark:text-indigo-100"
                  sizeClass="text-sm font-black"
                />
              </div>

              {/* Delta Shift Malam */}
              <div className="mt-1 flex items-center gap-1 text-[9px] font-bold">
                {malamKurasBacklog ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" />
                    Malam kurangi beban {Math.abs(deltaMalam)} {unit}
                  </span>
                ) : deltaMalam > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    Beban bertambah +{deltaMalam} {unit}
                  </span>
                ) : (
                  <span className="text-slate-500">Saldo seimbang (tetap)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PILAR 4: OS NIGHT SHIFT (D+1 CARRY-OUT) */}
        <div className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 ${
          net24hKurasBacklog 
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/50' 
            : delta24h > 0 
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                net24hKurasBacklog ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
              }`}>
                OS Night Shift
              </span>
            </div>

            <ExcelCommentCell 
              value={balanceNight}
              unit={unit}
              breakdown={osNightBreakdown || balanceNightBreakdown}
              colorClass={net24hKurasBacklog ? 'text-emerald-900 dark:text-emerald-100' : delta24h > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'}
            />
          </div>

          {/* 24h Net Trend Indicator */}
          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="text-[10px] font-bold">
              {net24hKurasBacklog ? (
                <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Net kuras {Math.abs(delta24h)} {unit} dari kemarin!
                </span>
              ) : delta24h > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  Beban bertambah +{delta24h} {unit} ke hari esok
                </span>
              ) : (
                <span className="text-slate-500 font-medium">
                  Status seimbang (antrean stabil)
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Dari {formatNumber(osMorning)} {unit} ➔ Menjadi {formatNumber(balanceNight)} {unit}
            </span>
          </div>
        </div>

      </div>

      {/* Optional Extra Snippet (e.g. Furnace W2/W4/W5 or Zetium detail) */}
      {extraSnippet && (
        <div className="pt-2 text-xs">
          {extraSnippet}
        </div>
      )}

    </div>
  );
};
