import React, { useState } from 'react';
import { 
  Users, Layers, Flame, Cpu, CheckSquare, FileText, 
  ChevronRight, Activity, Gauge, TrendingUp, BarChart2 
} from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-types';
import { formatNumber } from './daily-performance-utils';

interface DailyPerformanceStationCardsProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
}

export const DailyPerformanceStationCards: React.FC<DailyPerformanceStationCardsProps> = ({
  records,
  selectedDate
}) => {
  const [activeStation, setActiveStation] = useState<'edxrf' | 'wdxrf' | 'manpower' | 'prep' | 'loi' | 'qc'>('wdxrf');

  // Filter for selected date
  const dayRecords = records.filter(r => r.date === selectedDate || r.isoDate === selectedDate);
  const dayShift = dayRecords.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
  const nightShift = dayRecords.find(r => r.shiftType === 'NIGHT');

  // Aggregate EDXRF per machine across the day
  const epsC = dayRecords.reduce((acc, r) => acc + r.edxrf.epsC, 0);
  const epsD = dayRecords.reduce((acc, r) => acc + r.edxrf.epsD, 0);
  const epsE = dayRecords.reduce((acc, r) => acc + r.edxrf.epsE, 0);
  const epsF = dayRecords.reduce((acc, r) => acc + r.edxrf.epsF, 0);
  const epsG = dayRecords.reduce((acc, r) => acc + r.edxrf.epsG, 0);
  const epsH = dayRecords.reduce((acc, r) => acc + r.edxrf.epsH, 0);
  const s2Puma = dayRecords.reduce((acc, r) => acc + r.edxrf.s2Puma, 0);
  const maxEdxrf = Math.max(epsC, epsD, epsE, epsF, epsG, epsH, s2Puma, 1);

  // Aggregate WDXRF Zetium A & B - PEMISAHAN KETAT TBP/GPS & GTS
  const ztmA = {
    prod: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.prod, 0),
    exp: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.exp, 0),
    smelt: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.smelt, 0),
    gts: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.gts, 0),
    rarr: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.rarr, 0),
    ver: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.ver, 0),
    std: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.std, 0),
    blank: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.blank, 0),
    total: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.total, 0),
  };

  const ztmB = {
    prod: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.prod, 0),
    exp: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.exp, 0),
    smelt: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.smelt, 0),
    gts: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.gts, 0),
    rarr: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.rarr, 0),
    ver: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.ver, 0),
    std: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.std, 0),
    blank: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.blank, 0),
    total: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.total, 0),
  };

  // Kalkulasi TBP/GPS Murni (Internal Lab) vs GTS (Sister Site Terpisah)
  const ztmATbpTotal = ztmA.prod + ztmA.exp + ztmA.smelt + ztmA.rarr + ztmA.ver + ztmA.std + ztmA.blank;
  const ztmBTbpTotal = ztmB.prod + ztmB.exp + ztmB.smelt + ztmB.rarr + ztmB.ver + ztmB.std + ztmB.blank;
  const totalGtsRuns = ztmA.gts + ztmB.gts;
  const isLongShift = dayShift?.shiftType === 'LS';
  const gtsDayRuns = (dayShift?.wdxrf.zetiumA.gts || 0) + (dayShift?.wdxrf.zetiumB.gts || 0);
  const gtsNightRuns = (nightShift?.wdxrf.zetiumA.gts || 0) + (nightShift?.wdxrf.zetiumB.gts || 0);

  // LOI furnaces
  const loiW2 = dayRecords.reduce((acc, r) => acc + r.loi.w2, 0);
  const loiW4 = dayRecords.reduce((acc, r) => acc + r.loi.w4, 0);
  const loiW5 = dayRecords.reduce((acc, r) => acc + r.loi.w5, 0);

  const stations = [
    { id: 'wdxrf', label: 'WDXRF Zetium (A & B)', icon: <Cpu className="w-4 h-4" /> },
    { id: 'edxrf', label: 'EDXRF 7-Mesin', icon: <Gauge className="w-4 h-4" /> },
    { id: 'prep', label: 'Preparasi & Bead', icon: <Flame className="w-4 h-4" /> },
    { id: 'loi', label: 'Furnace LOI', icon: <Activity className="w-4 h-4" /> },
    { id: 'manpower', label: 'Manpower & Shift', icon: <Users className="w-4 h-4" /> },
    { id: 'qc', label: 'QC & Release', icon: <CheckSquare className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Station Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {stations.map(st => (
          <button
            key={st.id}
            onClick={() => setActiveStation(st.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeStation === st.id
                ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {st.icon}
            <span>{st.label}</span>
          </button>
        ))}
      </div>

      {/* ACTIVE STATION CONTENT */}
      {activeStation === 'wdxrf' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ZETIUM A */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Zetium A (WDXRF Unit 1)
                  </h4>
                  <p className="text-xs text-slate-500">Throughput Internal TBP/GPS + Analisis Titipan GTS</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                    {formatNumber(ztmATbpTotal)}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-medium">TBP/GPS Runs</span>
                  {ztmA.gts > 0 && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      + {ztmA.gts} GTS (Terpisah)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">PROD</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{ztmA.prod}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">EXP</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{ztmA.exp}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">SMELTER</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{ztmA.smelt}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 ring-1 ring-purple-500/20">
                  <span className="text-purple-600 dark:text-purple-400 text-[9px] font-bold block">GTS (Terpisah)</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{ztmA.gts}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">RA / RR</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{ztmA.rarr}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">VERIFIKASI</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{ztmA.ver}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">STANDAR</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{ztmA.std}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">BLANK</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{ztmA.blank}</span>
                </div>
              </div>
            </div>

            {/* ZETIUM B */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Zetium B (WDXRF Unit 2)
                  </h4>
                  <p className="text-xs text-slate-500">Throughput Internal TBP/GPS + Analisis Titipan GTS</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {formatNumber(ztmBTbpTotal)}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-medium">TBP/GPS Runs</span>
                  {ztmB.gts > 0 && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      + {ztmB.gts} GTS (Terpisah)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">PROD</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{ztmB.prod}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">EXP</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{ztmB.exp}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">SMELTER</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{ztmB.smelt}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 ring-1 ring-purple-500/20">
                  <span className="text-purple-600 dark:text-purple-400 text-[9px] font-bold block">GTS (Terpisah)</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{ztmB.gts}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">RA / RR</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{ztmB.rarr}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">VERIFIKASI</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{ztmB.ver}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">STANDAR</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{ztmB.std}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">BLANK</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{ztmB.blank}</span>
                </div>
              </div>
            </div>
          </div>

          {/* DEDICATED SEPARATE CARD: PT GANE TAMBANG SENTOSA (GTS) WDXRF */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/90 via-white to-slate-50 dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-100 dark:border-purple-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-purple-500/20">
                  GTS
                </div>
                <div>
                  <h4 className="font-bold text-purple-950 dark:text-purple-200 text-sm flex items-center gap-2">
                    PT Gane Tambang Sentosa (GTS) — Dedicated WDXRF Analysis
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                      Sister Site (Terpisah)
                    </span>
                  </h4>
                  <p className="text-xs text-purple-700/80 dark:text-purple-300/70">
                    Analisis titipan spektrometri pada Zetium A & B dengan kurva kalibrasi mandiri (TIDAK DIGABUNG ke TBP/GPS)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
                  {formatNumber(totalGtsRuns)}
                </span>
                <span className="text-xs text-purple-500 block">Total Run GTS</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/40">
                <span className="text-slate-400 text-[10px] block font-semibold">ZETIUM A (GTS)</span>
                <span className="text-lg font-mono font-bold text-purple-700 dark:text-purple-300">{ztmA.gts}</span>
                <span className="text-slate-400 text-[10px] ml-1">run</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/40">
                <span className="text-slate-400 text-[10px] block font-semibold">ZETIUM B (GTS)</span>
                <span className="text-lg font-mono font-bold text-purple-700 dark:text-purple-300">{ztmB.gts}</span>
                <span className="text-slate-400 text-[10px] ml-1">run</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/40">
                <span className="text-slate-400 text-[10px] block font-semibold">
                  {isLongShift ? 'OPERASIONAL SHIFT GTS' : 'DISTRIBUSI SHIFT GTS'}
                </span>
                <div className="flex items-center gap-2 mt-0.5 font-bold font-mono text-sm">
                  {isLongShift ? (
                    <span className="text-amber-600">Long Shift LS (07:00 - 24:00): {gtsDayRuns}</span>
                  ) : (
                    <>
                      <span className="text-amber-600">Shift D (Pagi): {gtsDayRuns}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-indigo-600">Shift N (Malam): {gtsNightRuns}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-100/50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed">
              <strong>Aturan Pelaporan Manajemen:</strong> Berdasarkan kebijakan operasional Harita Nickel, pencapaian target harian PT Trimegah Bangun Persada (TBP) dan PT Gane Permai Sentosa (GPS) hanya menghitung sampel internal. Sampel GTS dilaporkan dalam invoice analisis dan logbook sertifikasi tersendiri.
            </div>
          </div>
        </div>
      )}

      {/* EDXRF 7-MACHINE MATRIX */}
      {activeStation === 'edxrf' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                Distribusi Pembacaan EDXRF (7 Unit Mesin)
              </h4>
              <p className="text-xs text-slate-500">Beban kerja per instrumen Epsilon & Bruker S2 Puma</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
                {formatNumber(epsC + epsD + epsE + epsF + epsG + epsH + s2Puma)}
              </span>
              <span className="text-xs text-slate-400 block">Total Pembacaan</span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Epsilon C', count: epsC, color: 'bg-teal-500' },
              { name: 'Epsilon D', count: epsD, color: 'bg-cyan-500' },
              { name: 'Epsilon E', count: epsE, color: 'bg-sky-500' },
              { name: 'Epsilon F', count: epsF, color: 'bg-blue-500' },
              { name: 'Epsilon G', count: epsG, color: 'bg-indigo-500' },
              { name: 'Epsilon H', count: epsH, color: 'bg-purple-500' },
              { name: 'S2 PUMA (Bruker)', count: s2Puma, color: 'bg-amber-500' },
            ].map(m => (
              <div key={m.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{m.name}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {m.count} run ({maxEdxrf > 0 ? Math.round((m.count / maxEdxrf) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${m.color} transition-all duration-500`}
                    style={{ width: `${maxEdxrf > 0 ? (m.count / maxEdxrf) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOI FURNACES */}
      {activeStation === 'loi' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                Workstation Pengabuan LOI (Loss on Ignition)
              </h4>
              <p className="text-xs text-slate-500">Rincian per jalur workstation/furnace</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/40">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 block mb-1">Workstation 2 (W2)</span>
              <span className="text-2xl font-black font-mono text-slate-800 dark:text-white">{loiW2}</span>
            </div>
            <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/40">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 block mb-1">Workstation 4 (W4)</span>
              <span className="text-2xl font-black font-mono text-slate-800 dark:text-white">{loiW4}</span>
            </div>
            <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/40">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 block mb-1">Workstation 5 (W5)</span>
              <span className="text-2xl font-black font-mono text-slate-800 dark:text-white">{loiW5}</span>
            </div>
          </div>
        </div>
      )}

      {/* MANPOWER */}
      {activeStation === 'manpower' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* STAFF */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" /> Manpower Staff
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 text-[10px] block">Hadir Shift</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {dayRecords.reduce((acc, r) => acc + r.manpower.staff.shift, 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 text-[10px] block">Cuti</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {dayRecords.reduce((acc, r) => acc + r.manpower.staff.cuti, 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 text-[10px] block">Izin / Sakit</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {dayRecords.reduce((acc, r) => acc + r.manpower.staff.izin + r.manpower.staff.sakit, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* CREW */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" /> Manpower Crew (Teknisi Lab)
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 text-[10px] block">Hadir Shift</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {dayRecords.reduce((acc, r) => acc + r.manpower.crew.shift, 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 text-[10px] block">Bantuan</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {dayRecords.reduce((acc, r) => acc + r.manpower.crew.bantn, 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 text-[10px] block">Cuti</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {dayRecords.reduce((acc, r) => acc + r.manpower.crew.cuti, 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 text-[10px] block">Izin / Sakit</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {dayRecords.reduce((acc, r) => acc + r.manpower.crew.izin + r.manpower.crew.sakit, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREPARATION & QC FALLBACKS */}
      {(activeStation === 'prep' || activeStation === 'qc') && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <p>Data ringkasan stasiun ini tercermin langsung pada Pipeline Flow. Gunakan tab <strong>Data Table Logbook</strong> untuk rincian formula kolom demi kolom.</p>
        </div>
      )}
    </div>
  );
};
