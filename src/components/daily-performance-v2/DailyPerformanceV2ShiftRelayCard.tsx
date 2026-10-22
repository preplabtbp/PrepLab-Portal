import React from 'react';
import { 
  ArrowRight, Award, TrendingDown, TrendingUp, 
  Clock, Zap, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { formatNumber } from './daily-performance-v2-utils';
import { DailyPerformanceV2InBarCell } from './DailyPerformanceV2InBarCell';

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
}

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
  extraSnippet
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

        {/* Top Contributor Badge */}
        <div className="flex items-center gap-2">
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
        
        {/* PILAR 1: SALDO DARI HARI KEMARIN (D-1 CARRY-IN) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                1. Saldo Awal (07:00 WITA)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-slate-600 dark:text-slate-300">
                Dari Kemarin
              </span>
            </div>
            <span className="text-xl font-black font-mono text-slate-800 dark:text-slate-100 mt-1 block">
              {formatNumber(osMorning)} <span className="text-xs font-normal text-slate-400">{unit}</span>
            </span>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Warisan saldo yang ditinggalkan oleh shift malam kemarin untuk dimulai jam 07:00 pagi ini.
          </p>
        </div>

        {/* PILAR 2: KINERJA SHIFT PAGI (DAY SHIFT) & OPERAN JAM 19:00 */}
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
                + Masuk siang: {formatNumber(receivedDay)} {unit}
              </span>
            )}
          </div>

          {/* Saldo Serah Terima Jam 19:00 */}
          <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300">
                {isLongShift ? 'Sisa Saldo Jam 24:00:' : 'Operan ke Malam (19:00):'}
              </span>
              <span className="font-mono font-black text-amber-950 dark:text-amber-100 text-sm">
                {formatNumber(balanceDay)} {unit}
              </span>
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

        {/* PILAR 3: KINERJA SHIFT MALAM (NIGHT SHIFT) - HANYA MUNCUL JIKA BUKAN LONG SHIFT */}
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

            {/* Saldo Penutupan Jam 07:00 */}
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300">
                  Sisa Saldo Pagi (07:00):
                </span>
                <span className="font-mono font-black text-indigo-950 dark:text-indigo-100 text-sm">
                  {formatNumber(balanceNight)} {unit}
                </span>
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

        {/* PILAR 4: OUTSTANDING YANG DITINGGALKAN UNTUK HARI BERIKUTNYA (D+1 CARRY-OUT) */}
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
                {isLongShift ? '3. Beban Senin Pagi' : '4. Beban Hari Esok'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Oper ke D+1
              </span>
            </div>

            <span className={`text-xl font-black font-mono mt-1 block ${
              net24hKurasBacklog ? 'text-emerald-900 dark:text-emerald-100' : delta24h > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'
            }`}>
              {formatNumber(balanceNight)} <span className="text-xs font-normal opacity-70">{unit}</span>
            </span>
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
