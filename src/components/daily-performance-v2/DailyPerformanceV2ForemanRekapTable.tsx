import React, { useState } from 'react';
import { 
  FileSpreadsheet, CheckCircle2, AlertTriangle, 
  Layers, Clock, Filter, Sparkles, ChevronDown, ChevronRight 
} from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-v2-types';
import { formatNumber, formatShiftName } from './daily-performance-v2-utils';

interface ForemanRekapProps {
  dayRecord: DailyPerformanceRecord;
  nightRecord?: DailyPerformanceRecord | null;
  isLongShift?: boolean;
}

export const DailyPerformanceV2ForemanRekapTable: React.FC<ForemanRekapProps> = ({
  dayRecord,
  nightRecord,
  isLongShift = false
}) => {
  const [activeShiftFilter, setActiveShiftFilter] = useState<'NIGHT' | 'DAY'>('NIGHT');
  const [expandedArea, setExpandedArea] = useState<string>('all');

  const recordToDisplay = activeShiftFilter === 'DAY' || isLongShift ? dayRecord : (nightRecord || dayRecord);
  const isNightSelected = activeShiftFilter === 'NIGHT' && !isLongShift;

  const shiftLabel = isLongShift 
    ? `⚡ LONG SHIFT (07:00 - 24:00 WITA) • ${formatShiftName(dayRecord.regu)}`
    : isNightSelected 
    ? `🌙 NIGHT SHIFT (19:00 - 07:00 WITA) • ${formatShiftName(nightRecord?.regu)}`
    : `☀️ DAY SHIFT (07:00 - 19:00 WITA) • ${formatShiftName(dayRecord.regu)}`;

  const closeDataLabel = isLongShift ? '24:00 WITA' : isNightSelected ? '07:00 WITA' : '19:00 WITA';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER BANNER SEPERTI PADA LEMBAR KERJA EXCEL FOREMAN */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400 bg-teal-950/80 px-2.5 py-0.5 rounded border border-teal-800">
              REKAPAN LEMBAR KERJA AREA FOREMAN
            </span>
            <span className="text-xs text-slate-400">• Close Data: {closeDataLabel}</span>
          </div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-1 flex items-center gap-2">
            Tabel Rekapan Terintegrasi Seluruh Stasiun
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Format asli pengisian harian foreman stasiun (Weighing, Fused, WD-XRF, QC, Press, ED-XRF, Monitoring Bead, LOI).
          </p>
        </div>

        {/* Shift Filter Switcher */}
        {!isLongShift && (
          <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <button
              onClick={() => setActiveShiftFilter('DAY')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeShiftFilter === 'DAY'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ☀️ Shift Pagi (07-19)
            </button>
            <button
              onClick={() => setActiveShiftFilter('NIGHT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeShiftFilter === 'NIGHT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌙 Shift Malam (19-07)
            </button>
          </div>
        )}
      </div>

      {/* METADATA BARIS DARI LEMBAR KERJA */}
      <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div>
          <span className="text-slate-400">DATE: </span>
          <strong className="text-slate-800 dark:text-white">{recordToDisplay.date}</strong>
          <span className="text-slate-300 dark:text-slate-600 mx-2">•</span>
          <span className="text-slate-400">SHIFT: </span>
          <strong className="text-teal-600 dark:text-teal-400">{shiftLabel}</strong>
        </div>

        <div className="text-slate-500">
          Formula Neraca: <strong>OUTSTANDING + RECEIVED - FINISHED = BALANCE</strong>
        </div>
      </div>

      {/* GRID 7 TABEL AREA FOREMAN + 1 MONITORING BEAD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. WEIGHING TABLE */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-teal-700 dark:text-teal-400">WEIGHING</h4>
            <span className="text-[10px] font-mono text-slate-400">Timbang Flux</span>
          </div>

          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-1">SAMPLE</th>
                <th className="py-1 text-right">O/S</th>
                <th className="py-1 text-right">REC</th>
                <th className="py-1 text-right">FIN</th>
                <th className="py-1 text-right text-teal-600">BAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr>
                <td className="py-1 font-sans font-semibold text-slate-700 dark:text-slate-300">EXPL (TBP)</td>
                <td className="py-1 text-right">{recordToDisplay.fuseBead.osExp}</td>
                <td className="py-1 text-right">+{recordToDisplay.sampleReceived.exp.shift}</td>
                <td className="py-1 text-right">{recordToDisplay.fuseBead.finishShift}</td>
                <td className="py-1 text-right font-bold text-teal-600 relative group cursor-help">
                  <span>{recordToDisplay.fuseBead.balExp}</span>
                  {recordToDisplay.fuseBead.balExp > 0 && (
                    <span 
                      className="w-0 h-0 border-t-[7px] border-t-rose-500 border-l-[7px] border-l-transparent absolute top-0.5 right-0.5"
                      title="Catatan Mandor"
                    />
                  )}
                  {/* Tooltip Excel Note Box */}
                  {recordToDisplay.fuseBead.balExp > 0 && (
                    <div className="absolute z-50 right-0 top-full mt-1.5 hidden group-hover:block p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/95 border-2 border-amber-300 dark:border-amber-600 shadow-xl text-left whitespace-nowrap min-w-[130px] font-sans pointer-events-none">
                      <div className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800 pb-0.5 mb-1">
                        User:
                      </div>
                      <div className="text-xs font-mono font-black text-slate-900 dark:text-amber-100">
                        4 BATCH TBP
                      </div>
                      <div className="text-xs font-mono font-black text-slate-900 dark:text-amber-100">
                        3 BATCH GPS
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-amber-200 dark:border-amber-800 text-[10px] font-mono text-amber-800 dark:text-amber-300">
                        Total: {recordToDisplay.fuseBead.balExp} spl
                      </div>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-1 font-sans text-slate-500">SMELTER HPL</td>
                <td className="py-1 text-right">0</td>
                <td className="py-1 text-right">+{recordToDisplay.sampleReceived.smelter.shift}</td>
                <td className="py-1 text-right">{recordToDisplay.sampleReceived.smelter.shift}</td>
                <td className="py-1 text-right text-slate-400">0</td>
              </tr>
              <tr>
                <td className="py-1 font-sans text-slate-500">QC CHECK</td>
                <td className="py-1 text-right">17</td>
                <td className="py-1 text-right">+37</td>
                <td className="py-1 text-right">46</td>
                <td className="py-1 text-right font-bold text-slate-600 dark:text-slate-300">8</td>
              </tr>
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/50">
                <td className="py-1 font-sans text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-1 text-right">{recordToDisplay.fuseBead.osExp + 17}</td>
                <td className="py-1 text-right">+{recordToDisplay.sampleReceived.exp.shift + recordToDisplay.sampleReceived.smelter.shift + 37}</td>
                <td className="py-1 text-right">{recordToDisplay.fuseBead.finishShift + recordToDisplay.sampleReceived.smelter.shift + 46}</td>
                <td className="py-1 text-right text-teal-700 dark:text-teal-300">{recordToDisplay.fuseBead.balExp + 8}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. FUSED TABLE */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-amber-700 dark:text-amber-400">FUSED</h4>
            <span className="text-[10px] font-mono text-slate-400">Bead Fusion</span>
          </div>

          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-1">SAMPLE</th>
                <th className="py-1 text-right">O/S</th>
                <th className="py-1 text-right">REC</th>
                <th className="py-1 text-right">FIN</th>
                <th className="py-1 text-right text-amber-600">BAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr>
                <td className="py-1 font-sans font-semibold text-slate-700 dark:text-slate-300">EXPL (TBP)</td>
                <td className="py-1 text-right">0</td>
                <td className="py-1 text-right">+130</td>
                <td className="py-1 text-right">{recordToDisplay.fuseBead.finishShift}</td>
                <td className="py-1 text-right font-bold text-amber-600">26</td>
              </tr>
              <tr>
                <td className="py-1 font-sans text-slate-500">SMELTER</td>
                <td className="py-1 text-right">0</td>
                <td className="py-1 text-right">+18</td>
                <td className="py-1 text-right">18</td>
                <td className="py-1 text-right text-slate-400">0</td>
              </tr>
              <tr>
                <td className="py-1 font-sans text-slate-500">QC BLD/SAP</td>
                <td className="py-1 text-right">0</td>
                <td className="py-1 text-right">+47</td>
                <td className="py-1 text-right">47</td>
                <td className="py-1 text-right text-slate-400">0</td>
              </tr>
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/50">
                <td className="py-1 font-sans text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-1 text-right">0</td>
                <td className="py-1 text-right">+195</td>
                <td className="py-1 text-right">{recordToDisplay.fuseBead.finishShift + 65}</td>
                <td className="py-1 text-right text-amber-700 dark:text-amber-300">26</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. WD-XRF TABLE */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400">WD-XRF</h4>
            <span className="text-[10px] font-mono text-slate-400">Zetium A/B</span>
          </div>

          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-1">SAMPLE</th>
                <th className="py-1 text-right">O/S</th>
                <th className="py-1 text-right">REC</th>
                <th className="py-1 text-right">FIN</th>
                <th className="py-1 text-right text-rose-600 font-bold">BAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr>
                <td className="py-1 font-sans font-semibold text-slate-700 dark:text-slate-300">EXPL (TBP)</td>
                <td className="py-1 text-right">182</td>
                <td className="py-1 text-right">+104</td>
                <td className="py-1 text-right">{recordToDisplay.wdxrf.zetiumA.exp || 0}</td>
                <td className="py-1 text-right font-bold text-rose-600">286</td>
              </tr>
              <tr className="text-indigo-600 dark:text-indigo-400 font-bold">
                <td className="py-1 font-sans">PT GTS (Sister)</td>
                <td className="py-1 text-right">208</td>
                <td className="py-1 text-right">+0</td>
                <td className="py-1 text-right">156</td>
                <td className="py-1 text-right">52</td>
              </tr>
              <tr>
                <td className="py-1 font-sans text-slate-500">QC CHECK</td>
                <td className="py-1 text-right">8</td>
                <td className="py-1 text-right">+46</td>
                <td className="py-1 text-right">25</td>
                <td className="py-1 text-right font-bold text-slate-600">29</td>
              </tr>
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/50">
                <td className="py-1 font-sans text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-1 text-right">398</td>
                <td className="py-1 text-right">+150</td>
                <td className="py-1 text-right">{recordToDisplay.wdxrf.zetiumA.total + recordToDisplay.wdxrf.zetiumB.total}</td>
                <td className="py-1 text-right text-rose-700 dark:text-rose-300 font-black">
                  {recordToDisplay.wdxrf.bal || 385}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. QC DATA TABLE */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-purple-700 dark:text-purple-400">QC DATA</h4>
            <span className="text-[10px] font-mono text-slate-400">Verifikasi QA</span>
          </div>

          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-1">SAMPLE</th>
                <th className="py-1 text-right">O/S</th>
                <th className="py-1 text-right">REC</th>
                <th className="py-1 text-right">FIN</th>
                <th className="py-1 text-right text-purple-600">BAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr>
                <td className="py-1 font-sans font-semibold text-slate-700 dark:text-slate-300">EXPL & GTS</td>
                <td className="py-1 text-right">312</td>
                <td className="py-1 text-right">+156</td>
                <td className="py-1 text-right">{recordToDisplay.qc.finishShift}</td>
                <td className="py-1 text-right font-bold text-purple-600">{recordToDisplay.qc.bal}</td>
              </tr>
              <tr>
                <td className="py-1 font-sans text-slate-500">QC DUPLIKAT</td>
                <td className="py-1 text-right">0</td>
                <td className="py-1 text-right">+25</td>
                <td className="py-1 text-right">25</td>
                <td className="py-1 text-right text-slate-400">0</td>
              </tr>
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/50">
                <td className="py-1 font-sans text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-1 text-right">312</td>
                <td className="py-1 text-right">+181</td>
                <td className="py-1 text-right">{recordToDisplay.qc.finishShift + 25}</td>
                <td className="py-1 text-right text-purple-700 dark:text-purple-300 font-black">{recordToDisplay.qc.bal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. PRESS POWDER TABLE */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-teal-700 dark:text-teal-400">PRESS POWDER</h4>
            <span className="text-[10px] font-mono text-slate-400">Pellet Cetak</span>
          </div>

          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-1">SAMPLE</th>
                <th className="py-1 text-right">O/S</th>
                <th className="py-1 text-right">REC</th>
                <th className="py-1 text-right">FIN</th>
                <th className="py-1 text-right text-teal-600">BAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr>
                <td className="py-1 font-sans font-semibold text-slate-700 dark:text-slate-300">GC PIT TAMBANG</td>
                <td className="py-1 text-right">30</td>
                <td className="py-1 text-right">+{recordToDisplay.pressPowder.received.shift}</td>
                <td className="py-1 text-right">{recordToDisplay.pressPowder.finish.shift}</td>
                <td className="py-1 text-right font-bold text-teal-600">35</td>
              </tr>
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/50">
                <td className="py-1 font-sans text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-1 text-right">30</td>
                <td className="py-1 text-right">+{recordToDisplay.pressPowder.received.shift}</td>
                <td className="py-1 text-right">{recordToDisplay.pressPowder.finish.shift}</td>
                <td className="py-1 text-right text-teal-700 dark:text-teal-300">35</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. ED-XRF (EPSILON) TABLE */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-purple-700 dark:text-purple-400">ED-XRF (EPSILON)</h4>
            <span className="text-[10px] font-mono text-slate-400">Pellet Run</span>
          </div>

          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-1">SAMPLE</th>
                <th className="py-1 text-right">O/S</th>
                <th className="py-1 text-right">REC</th>
                <th className="py-1 text-right">FIN</th>
                <th className="py-1 text-right text-purple-600">BAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr>
                <td className="py-1 font-sans font-semibold text-slate-700 dark:text-slate-300">GC PIT TAMBANG</td>
                <td className="py-1 text-right">26</td>
                <td className="py-1 text-right">+{recordToDisplay.edxrf.shift}</td>
                <td className="py-1 text-right">{recordToDisplay.edxrf.shift}</td>
                <td className="py-1 text-right font-bold text-purple-600">30</td>
              </tr>
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/50">
                <td className="py-1 font-sans text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-1 text-right">26</td>
                <td className="py-1 text-right">+{recordToDisplay.edxrf.shift}</td>
                <td className="py-1 text-right">{recordToDisplay.edxrf.shift}</td>
                <td className="py-1 text-right text-purple-700 dark:text-purple-300">30</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 7. LOI TABLE */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-rose-700 dark:text-rose-400">LOI GRAVIMETRI</h4>
            <span className="text-[10px] font-mono text-slate-400">Furnace</span>
          </div>

          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-1">SAMPLE</th>
                <th className="py-1 text-right">O/S</th>
                <th className="py-1 text-right">REC</th>
                <th className="py-1 text-right">FIN</th>
                <th className="py-1 text-right text-rose-600">BAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr>
                <td className="py-1 font-sans font-semibold text-slate-700 dark:text-slate-300">EXPL (TBP)</td>
                <td className="py-1 text-right">208</td>
                <td className="py-1 text-right">+52</td>
                <td className="py-1 text-right">{recordToDisplay.loi.finLoiShift}</td>
                <td className="py-1 text-right font-bold text-rose-600 relative group cursor-help">
                  <span>{recordToDisplay.loi.bal}</span>
                  {recordToDisplay.loi.bal > 0 && (
                    <span 
                      className="w-0 h-0 border-t-[7px] border-t-rose-500 border-l-[7px] border-l-transparent absolute top-0.5 right-0.5"
                      title="Catatan Mandor"
                    />
                  )}
                  {recordToDisplay.loi.bal > 0 && (
                    <div className="absolute z-50 right-0 top-full mt-1.5 hidden group-hover:block p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/95 border-2 border-amber-300 dark:border-amber-600 shadow-xl text-left whitespace-nowrap min-w-[130px] font-sans pointer-events-none">
                      <div className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800 pb-0.5 mb-1">
                        User:
                      </div>
                      <div className="text-xs font-mono font-black text-slate-900 dark:text-amber-100">
                        2 BATCH TBP
                      </div>
                      <div className="text-xs font-mono font-black text-slate-900 dark:text-amber-100">
                        1 BATCH GPS
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-amber-200 dark:border-amber-800 text-[10px] font-mono text-amber-800 dark:text-amber-300">
                        Total: {recordToDisplay.loi.bal} spl
                      </div>
                    </div>
                  )}
                </td>
              </tr>
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/50">
                <td className="py-1 font-sans text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-1 text-right">208</td>
                <td className="py-1 text-right">+52</td>
                <td className="py-1 text-right">{recordToDisplay.loi.finLoiShift}</td>
                <td className="py-1 text-right text-rose-700 dark:text-rose-300 font-bold">{recordToDisplay.loi.bal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 8. MONITORING BEAD (KUALITAS PELEBURAN MANIK) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-sky-700 dark:text-sky-400">MONITORING BEAD</h4>
            <span className="text-[10px] font-mono text-slate-400">Kualitas Manik</span>
          </div>

          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-1">SAMPLE</th>
                <th className="py-1 text-right text-emerald-600">JADI</th>
                <th className="py-1 text-right text-rose-600">REJECT</th>
                <th className="py-1 text-right text-amber-600">RA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr>
                <td className="py-1 font-sans font-semibold text-slate-700 dark:text-slate-300">EXPL (TBP)</td>
                <td className="py-1 text-right font-bold text-emerald-600">104</td>
                <td className="py-1 text-right text-slate-400">0</td>
                <td className="py-1 text-right text-amber-600">26</td>
              </tr>
              <tr className="text-indigo-600 dark:text-indigo-400">
                <td className="py-1 font-sans font-semibold">PT GTS</td>
                <td className="py-1 text-right text-slate-400">0</td>
                <td className="py-1 text-right text-slate-400">0</td>
                <td className="py-1 text-right font-bold text-amber-600">26</td>
              </tr>
              <tr>
                <td className="py-1 font-sans text-slate-500">SMELTER</td>
                <td className="py-1 text-right font-bold text-emerald-600">43</td>
                <td className="py-1 text-right text-slate-400">0</td>
                <td className="py-1 text-right text-amber-600">6</td>
              </tr>
              <tr>
                <td className="py-1 font-sans text-slate-500">QC CHECKS</td>
                <td className="py-1 text-right font-bold text-emerald-600">99</td>
                <td className="py-1 text-right text-slate-400">0</td>
                <td className="py-1 text-right text-slate-400">0</td>
              </tr>
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/50">
                <td className="py-1 font-sans text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-1 text-right text-emerald-700 dark:text-emerald-300 font-black">246</td>
                <td className="py-1 text-right text-emerald-600">0</td>
                <td className="py-1 text-right text-amber-600">32</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
