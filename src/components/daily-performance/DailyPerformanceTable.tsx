import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronRight, Download, FileSpreadsheet,
  Eye, EyeOff
} from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-types';
import { formatNumber } from './daily-performance-utils';

interface DailyPerformanceTableProps {
  records: DailyPerformanceRecord[];
}

export const DailyPerformanceTable: React.FC<DailyPerformanceTableProps> = ({ records }) => {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedRegu, setSelectedRegu] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');

  // Collapsible column group toggles
  const [showEdxrfDetails, setShowEdxrfDetails] = useState(false);
  const [showZetiumDetails, setShowZetiumDetails] = useState(false);

  // Distinct months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      const parts = r.date.split('/');
      if (parts.length === 3) set.add(`${parts[1]}/${parts[2]}`);
    });
    return Array.from(set).sort();
  }, [records]);

  // Distinct weeks
  const availableWeeks = useMemo(() => {
    const set = new Set<number>();
    records.forEach(r => set.add(r.week));
    return Array.from(set).sort((a, b) => a - b);
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (search && !r.date.includes(search) && !r.isoDate.includes(search)) return false;
      if (selectedMonth !== 'all') {
        const parts = r.date.split('/');
        if (`${parts[1]}/${parts[2]}` !== selectedMonth) return false;
      }
      if (selectedWeek !== 'all' && r.week !== Number(selectedWeek)) return false;
      if (selectedRegu !== 'all' && r.regu !== selectedRegu) return false;
      if (selectedShift !== 'all' && r.shiftType !== selectedShift) return false;
      return true;
    });
  }, [records, search, selectedMonth, selectedWeek, selectedRegu, selectedShift]);

  // Quick export CSV - PEMISAHAN KETAT TBP/GPS DAN GTS
  const handleExportCsv = () => {
    const headers = [
      'No', 'Date', 'Week', 'Shift', 'Waktu Kerja',
      'Staff_Shift', 'Crew_Shift',
      'GC_Shift', 'Prod_Shift', 'Prod_RC', 'Prod_RA', 'Exp_Shift', 'Smelter_Shift', 'GTS_Received_Shift',
      'Press_Fin_Shift',
      'EDXRF_Total', 'FuseBead_Fin', 'FuseBead_Bal',
      'LOI_Fin', 'LOI_Bal',
      'ZTM_A_TBP_Internal', 'ZTM_B_TBP_Internal', 'WDXRF_TBP_Total', 'GTS_WDXRF_Runs_Terpisah', 'WDXRF_Bal',
      'QC_Fin', 'QC_Bal',
      'Report_Done', 'Report_Bal'
    ];

    const rows = filteredRecords.map(r => {
      const ztmATbp = r.wdxrf.zetiumA.prod + r.wdxrf.zetiumA.exp + r.wdxrf.zetiumA.smelt + r.wdxrf.zetiumA.rarr + r.wdxrf.zetiumA.ver + r.wdxrf.zetiumA.std + r.wdxrf.zetiumA.blank;
      const ztmBTbp = r.wdxrf.zetiumB.prod + r.wdxrf.zetiumB.exp + r.wdxrf.zetiumB.smelt + r.wdxrf.zetiumB.rarr + r.wdxrf.zetiumB.ver + r.wdxrf.zetiumB.std + r.wdxrf.zetiumB.blank;
      const gtsRuns = (r.wdxrf.zetiumA.gts || 0) + (r.wdxrf.zetiumB.gts || 0);

      return [
        r.no, r.date, r.week, r.regu, r.shiftType,
        r.manpower.staff.shift, r.manpower.crew.shift,
        r.sampleReceived.gc.shift, r.sampleReceived.prod.shift, r.sampleReceived.prod.rc || 0, r.sampleReceived.prod.ra || 0, r.sampleReceived.exp.shift, r.sampleReceived.smelter.shift, r.sampleReceived.gts?.shift || 0,
        r.pressPowder.finish.shift,
        r.edxrf.shift, r.fuseBead.finishShift, r.fuseBead.balExp,
        r.loi.finLoiShift, r.loi.bal,
        ztmATbp, ztmBTbp, ztmATbp + ztmBTbp, gtsRuns, r.wdxrf.bal,
        r.qc.finishShift, r.qc.bal,
        r.report.finishReportDay, r.report.bal
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daily_Performance_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Date */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari tanggal (DD/MM)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-teal-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span>Bulan:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
            >
              <option value="all">Semua Bulan</option>
              {availableMonths.map(m => {
                const [monthNum, yearNum] = m.split('/');
                const monthNames: Record<string, string> = {
                  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
                  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
                  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
                };
                return (
                  <option key={m} value={m}>
                    {monthNames[monthNum] || monthNum} {yearNum}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Week Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span>Minggu:</span>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
            >
              <option value="all">Semua Minggu</option>
              {availableWeeks.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>

          {/* Shift Filter (sebelumnya Regu) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span>Shift:</span>
            <select
              value={selectedRegu}
              onChange={e => setSelectedRegu(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
            >
              <option value="all">Semua Shift</option>
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
            </select>
          </div>

          {/* Waktu Kerja Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span>Waktu:</span>
            <select
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
            >
              <option value="all">Semua Waktu</option>
              <option value="DAY">DAY (Pagi: 07-19)</option>
              <option value="NIGHT">NIGHT (Malam: 19-07)</option>
              <option value="LS">LS (Long Shift: 07-24)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdxrfDetails(!showEdxrfDetails)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs cursor-pointer transition-all"
            title="Tampilkan / sembunyikan kolom mesin Epsilon"
          >
            {showEdxrfDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Unit EDXRF</span>
          </button>

          <button
            onClick={() => setShowZetiumDetails(!showZetiumDetails)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs cursor-pointer transition-all"
            title="Tampilkan / sembunyikan kategori WDXRF"
          >
            {showZetiumDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Kategori ZTM</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 z-20 shadow-xs text-[11px] font-bold">
              {/* Top Category Headers */}
              <tr>
                <th colSpan={4} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-800 text-center">
                  JADWAL & SHIFT
                </th>
                <th colSpan={2} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center bg-teal-500/10 text-teal-800 dark:text-teal-300">
                  MANPOWER
                </th>
                <th colSpan={5} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center bg-blue-500/10 text-blue-800 dark:text-blue-300">
                  SAMPLE RECEIVED (TBP/GPS + GTS Terpisah)
                </th>
                <th colSpan={showEdxrfDetails ? 8 : 1} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center bg-sky-500/10 text-sky-800 dark:text-sky-300">
                  EDXRF RUNS
                </th>
                <th colSpan={2} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center bg-amber-500/10 text-amber-800 dark:text-amber-300">
                  FUSE BEAD
                </th>
                <th colSpan={2} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center bg-orange-500/10 text-orange-800 dark:text-orange-300">
                  LOI EXP
                </th>
                <th colSpan={4} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center bg-indigo-500/10 text-indigo-800 dark:text-indigo-300">
                  WDXRF ZETIUM (TBP/GPS vs GTS Terpisah)
                </th>
                <th colSpan={2} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center bg-purple-500/10 text-purple-800 dark:text-purple-300">
                  QC EXP
                </th>
                <th colSpan={2} className="p-2 border-b border-slate-200 dark:border-slate-700 text-center bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                  REPORT EXP
                </th>
              </tr>

              {/* Specific Sub Headers */}
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Tanggal</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Wk</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Shift</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Waktu Kerja</th>

                {/* Manpower */}
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Staff</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Crew</th>

                {/* Sample Recv */}
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">GC</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Prod</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Exp</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Smelt</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right text-purple-600 dark:text-purple-400 font-bold" title="PT GTS Sister Site (Terpisah)">GTS</th>

                {/* EDXRF */}
                {showEdxrfDetails ? (
                  <>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">EPS C</th>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">EPS D</th>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">EPS E</th>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">EPS F</th>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">EPS G</th>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">EPS H</th>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">S2 Puma</th>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-teal-600">Total</th>
                  </>
                ) : (
                  <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-teal-600">Total Run</th>
                )}

                {/* Fuse Bead */}
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Fin</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right font-semibold text-amber-600">Bal</th>

                {/* LOI */}
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Fin</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right font-semibold text-orange-600">Bal</th>

                {/* WDXRF */}
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right" title="Zetium A internal TBP/GPS">ZTM A</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right" title="Zetium B internal TBP/GPS">ZTM B</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right text-purple-600 dark:text-purple-400 font-bold" title="Total run GTS Sister Site (Terpisah)">GTS Run</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right font-semibold text-rose-600">Bal</th>

                {/* QC */}
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Fin</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right font-semibold text-purple-600">Bal</th>

                {/* Report */}
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Done</th>
                <th className="p-2 text-right font-semibold text-emerald-600">Bal</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.map((r, idx) => (
                <tr 
                  key={r.id || idx} 
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    r.shiftType === 'LS' ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                  }`}
                >
                  <td className="p-2 font-mono font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                    {r.date}
                  </td>
                  <td className="p-2 text-center text-slate-500 border-r border-slate-100 dark:border-slate-800 font-mono">
                    {r.week}
                  </td>
                  <td className="p-2 text-center border-r border-slate-100 dark:border-slate-800">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      r.regu === 'A' 
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' 
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                    }`}>
                      Shift {r.regu}
                    </span>
                  </td>
                  <td className="p-2 text-center border-r border-slate-100 dark:border-slate-800 font-semibold text-[10px]">
                    <span className={`px-2 py-0.5 rounded-md ${
                      r.shiftType === 'DAY' ? 'text-amber-700 dark:text-amber-400' :
                      r.shiftType === 'NIGHT' ? 'text-sky-700 dark:text-sky-400' : 'text-purple-700 dark:text-purple-400'
                    }`} title={r.shiftType === 'DAY' ? '07:00 - 19:00 WITA' : r.shiftType === 'NIGHT' ? '19:00 - 07:00 WITA' : '07:00 - 24:00 WITA'}>
                      {r.shiftType === 'DAY' ? 'DAY (07-19)' : r.shiftType === 'NIGHT' ? 'NIGHT (19-07)' : 'LS (07-24)'}
                    </span>
                  </td>

                  {/* Manpower */}
                  <td className="p-2 text-center border-r border-slate-100 dark:border-slate-800 font-mono">{r.manpower.staff.shift}</td>
                  <td className="p-2 text-center border-r border-slate-100 dark:border-slate-800 font-mono">{r.manpower.crew.shift}</td>

                  {/* Sample Received */}
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{formatNumber(r.sampleReceived.gc.shift)}</td>
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">
                    <div>{formatNumber(r.sampleReceived.prod.shift)}</div>
                    {((r.sampleReceived.prod.rc || 0) > 0 || (r.sampleReceived.prod.ra || 0) > 0) && (
                      <div className="text-[9px] text-slate-500 font-normal">
                        {(r.sampleReceived.prod.rc || 0) > 0 && `RC:${r.sampleReceived.prod.rc} `}
                        {(r.sampleReceived.prod.ra || 0) > 0 && `RA:${r.sampleReceived.prod.ra}`}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{formatNumber(r.sampleReceived.exp.shift)}</td>
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{formatNumber(r.sampleReceived.smelter.shift)}</td>
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-purple-600 dark:text-purple-400">
                    {(r.sampleReceived.gts?.shift || 0) > 0 ? formatNumber(r.sampleReceived.gts!.shift) : '-'}
                  </td>

                  {/* EDXRF */}
                  {showEdxrfDetails ? (
                    <>
                      <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{r.edxrf.epsC || '-'}</td>
                      <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{r.edxrf.epsD || '-'}</td>
                      <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{r.edxrf.epsE || '-'}</td>
                      <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{r.edxrf.epsF || '-'}</td>
                      <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{r.edxrf.epsG || '-'}</td>
                      <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{r.edxrf.epsH || '-'}</td>
                      <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{r.edxrf.s2Puma || '-'}</td>
                      <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {formatNumber(r.edxrf.shift)}
                      </td>
                    </>
                  ) : (
                    <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {formatNumber(r.edxrf.shift)}
                    </td>
                  )}

                  {/* Fuse Bead */}
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{formatNumber(r.fuseBead.finishShift)}</td>
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {r.fuseBead.balExp > 0 ? formatNumber(r.fuseBead.balExp) : '-'}
                  </td>

                  {/* LOI */}
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{formatNumber(r.loi.finLoiShift)}</td>
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-orange-600 dark:text-orange-400">
                    {r.loi.bal > 0 ? formatNumber(r.loi.bal) : '-'}
                  </td>

                  {/* WDXRF - PEMISAHAN KETAT TBP/GPS & GTS */}
                  {(() => {
                    const ztmATbp = r.wdxrf.zetiumA.prod + r.wdxrf.zetiumA.exp + r.wdxrf.zetiumA.smelt + r.wdxrf.zetiumA.rarr + r.wdxrf.zetiumA.ver + r.wdxrf.zetiumA.std + r.wdxrf.zetiumA.blank;
                    const ztmBTbp = r.wdxrf.zetiumB.prod + r.wdxrf.zetiumB.exp + r.wdxrf.zetiumB.smelt + r.wdxrf.zetiumB.rarr + r.wdxrf.zetiumB.ver + r.wdxrf.zetiumB.std + r.wdxrf.zetiumB.blank;
                    const gtsRuns = (r.wdxrf.zetiumA.gts || 0) + (r.wdxrf.zetiumB.gts || 0);

                    return (
                      <>
                        <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono" title={`Zetium A TBP/GPS: ${ztmATbp}`}>
                          {formatNumber(ztmATbp)}
                        </td>
                        <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono" title={`Zetium B TBP/GPS: ${ztmBTbp}`}>
                          {formatNumber(ztmBTbp)}
                        </td>
                        <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-purple-600 dark:text-purple-400" title={`Run GTS Sister Site (A:${r.wdxrf.zetiumA.gts || 0}, B:${r.wdxrf.zetiumB.gts || 0})`}>
                          {gtsRuns > 0 ? formatNumber(gtsRuns) : '-'}
                        </td>
                        <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-rose-600 dark:text-rose-400">
                          {r.wdxrf.bal > 0 ? formatNumber(r.wdxrf.bal) : '-'}
                        </td>
                      </>
                    );
                  })()}

                  {/* QC */}
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{formatNumber(r.qc.finishShift)}</td>
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-purple-600 dark:text-purple-400">
                    {r.qc.bal > 0 ? formatNumber(r.qc.bal) : '-'}
                  </td>

                  {/* Report */}
                  <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono">{formatNumber(r.report.finishReportDay)}</td>
                  <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {r.report.bal > 0 ? formatNumber(r.report.bal) : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
