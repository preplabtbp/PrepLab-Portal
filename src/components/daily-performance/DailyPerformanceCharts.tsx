import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area
} from 'recharts';
import { Calendar, Filter, BarChart2, TrendingUp, Layers } from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-types';
import { formatNumber } from './daily-performance-utils';

export type TimeRangeMode = 'week' | 'month' | 'year' | 'all';

interface TimeRangeControlsProps {
  mode: TimeRangeMode;
  onModeChange: (m: TimeRangeMode) => void;
  selectedWeek: number;
  onWeekChange: (w: number) => void;
  availableWeeks: number[];
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  availableMonths: string[];
  selectedYear: number;
  onYearChange: (y: number) => void;
  availableYears: number[];
}

export const TimeRangeControls: React.FC<TimeRangeControlsProps> = ({
  mode,
  onModeChange,
  selectedWeek,
  onWeekChange,
  availableWeeks,
  selectedMonth,
  onMonthChange,
  availableMonths,
  selectedYear,
  onYearChange,
  availableYears
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
      {/* Mode Buttons */}
      <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onModeChange('week')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            mode === 'week' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Week ISO
        </button>
        <button
          onClick={() => onModeChange('month')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            mode === 'month' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Bulan
        </button>
        <button
          onClick={() => onModeChange('year')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            mode === 'year' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Tahun
        </button>
        <button
          onClick={() => onModeChange('all')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            mode === 'all' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Semua Data
        </button>
      </div>

      {/* Dynamic Dropdowns depending on Mode */}
      <div className="flex items-center gap-2">
        {mode === 'week' && (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span>Pilih Minggu:</span>
            <select
              value={selectedWeek}
              onChange={e => onWeekChange(Number(e.target.value))}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
            >
              {availableWeeks.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
        )}

        {mode === 'month' && (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span>Pilih Bulan:</span>
            <select
              value={selectedMonth}
              onChange={e => onMonthChange(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {mode === 'year' && (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span>Pilih Tahun:</span>
            <select
              value={selectedYear}
              onChange={e => onYearChange(Number(e.target.value))}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom Chart Tooltip
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-2xl bg-slate-900/90 text-white text-xs shadow-xl border border-slate-700 backdrop-blur-md">
        <p className="font-bold text-slate-200 mb-1.5 border-b border-slate-700 pb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}:
              </span>
              <span className="font-mono font-bold">{formatNumber(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Hook to filter records by time range
export function useTimeRangeFilteredRecords(records: DailyPerformanceRecord[]) {
  const [mode, setMode] = useState<TimeRangeMode>('week');
  const [selectedWeek, setSelectedWeek] = useState<number>(41);
  const [selectedMonth, setSelectedMonth] = useState<string>('10/2026');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const availableWeeks = useMemo(() => {
    const s = new Set<number>();
    records.forEach(r => s.add(r.week));
    return Array.from(s).sort((a, b) => a - b);
  }, [records]);

  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    records.forEach(r => {
      const parts = r.date.split('/');
      if (parts.length === 3) s.add(`${parts[1]}/${parts[2]}`);
    });
    return Array.from(s).sort();
  }, [records]);

  const availableYears = useMemo(() => {
    const s = new Set<number>();
    records.forEach(r => {
      const parts = r.date.split('/');
      if (parts.length === 3) s.add(Number(parts[2]));
    });
    return Array.from(s).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (mode === 'week') return r.week === selectedWeek;
      if (mode === 'month') {
        const parts = r.date.split('/');
        return `${parts[1]}/${parts[2]}` === selectedMonth;
      }
      if (mode === 'year') {
        const parts = r.date.split('/');
        return Number(parts[2]) === selectedYear;
      }
      return true;
    });
  }, [records, mode, selectedWeek, selectedMonth, selectedYear]);

  // Aggregate by Date for Daily Trend
  const aggregatedByDate = useMemo(() => {
    const map = new Map<string, any>();

    filteredRecords.forEach(r => {
      const d = r.date;
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          isoDate: r.isoDate,
          week: r.week,
          // Manpower
          staffShift: 0,
          crewShift: 0,
          staffCuti: 0,
          crewCuti: 0,
          izinSakit: 0,
          // Received
          gcRecv: 0,
          prodRecv: 0,
          expRecv: 0,
          smeltRecv: 0,
          totalRecv: 0,
          // Prep
          pressFin: 0,
          weighFin: 0,
          fuseFin: 0,
          loiFin: 0,
          fuseBal: 0,
          loiBal: 0,
          // EDXRF
          epsC: 0,
          epsD: 0,
          epsE: 0,
          epsF: 0,
          epsG: 0,
          epsH: 0,
          s2Puma: 0,
          edxrfTotal: 0,
          // WDXRF
          ztmA: 0,
          ztmB: 0,
          wdxrfTotal: 0,
          wdxrfBal: 0,
          // QC & Report
          qcFin: 0,
          qcBal: 0,
          reportFin: 0,
          reportBal: 0
        });
      }

      const item = map.get(d);
      item.staffShift += r.manpower.staff.shift;
      item.crewShift += r.manpower.crew.shift;
      item.staffCuti += r.manpower.staff.cuti;
      item.crewCuti += r.manpower.crew.cuti;
      item.izinSakit += r.manpower.staff.izin + r.manpower.staff.sakit + r.manpower.crew.izin + r.manpower.crew.sakit;

      item.gcRecv += r.sampleReceived.gc.shift;
      item.prodRecv += r.sampleReceived.prod.shift;
      item.expRecv += r.sampleReceived.exp.shift;
      item.smeltRecv += r.sampleReceived.smelter.shift;
      item.totalRecv += (r.sampleReceived.gc.shift + r.sampleReceived.prod.shift + r.sampleReceived.exp.shift + r.sampleReceived.smelter.shift);

      item.pressFin += r.pressPowder.finish.shift;
      item.weighFin += r.fuseBead.finishShift;
      item.fuseFin += r.fuseBead.finishShift;
      item.loiFin += r.loi.finLoiShift;
      item.fuseBal = r.fuseBead.balExp;
      item.loiBal = r.loi.bal;

      item.epsC += r.edxrf.epsC;
      item.epsD += r.edxrf.epsD;
      item.epsE += r.edxrf.epsE;
      item.epsF += r.edxrf.epsF;
      item.epsG += r.edxrf.epsG;
      item.epsH += r.edxrf.epsH;
      item.s2Puma += r.edxrf.s2Puma;
      item.edxrfTotal += r.edxrf.shift;

      item.ztmA += r.wdxrf.zetiumA.total;
      item.ztmB += r.wdxrf.zetiumB.total;
      item.wdxrfTotal += (r.wdxrf.zetiumA.total + r.wdxrf.zetiumB.total);
      item.wdxrfBal = r.wdxrf.bal;

      item.qcFin += r.qc.finishShift;
      item.qcBal = r.qc.bal;
      item.reportFin += r.report.finishReportDay;
      item.reportBal = r.report.bal;
    });

    return Array.from(map.values());
  }, [filteredRecords]);

  return {
    mode,
    setMode,
    selectedWeek,
    setSelectedWeek,
    availableWeeks,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    selectedYear,
    setSelectedYear,
    availableYears,
    aggregatedByDate
  };
}

// 1. MANPOWER CHART
export const ManpowerTrendChart: React.FC<{ records: DailyPerformanceRecord[] }> = ({ records }) => {
  const tr = useTimeRangeFilteredRecords(records);

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Tren Kesiapan Manpower (Hadir vs Cuti & Sakit)
          </h4>
          <p className="text-xs text-slate-500">Pemantauan stabilitas jumlah tenaga kerja per periode</p>
        </div>
      </div>

      <TimeRangeControls
        mode={tr.mode}
        onModeChange={tr.setMode}
        selectedWeek={tr.selectedWeek}
        onWeekChange={tr.setSelectedWeek}
        availableWeeks={tr.availableWeeks}
        selectedMonth={tr.selectedMonth}
        onMonthChange={tr.setSelectedMonth}
        availableMonths={tr.availableMonths}
        selectedYear={tr.selectedYear}
        onYearChange={tr.setSelectedYear}
        availableYears={tr.availableYears}
      />

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tr.aggregatedByDate}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="crewShift" name="Crew Hadir" fill="#0d9488" stackId="a" radius={[0, 0, 4, 4]} />
            <Bar dataKey="staffShift" name="Staff Hadir" fill="#0284c7" stackId="a" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="crewCuti" name="Crew Cuti" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="izinSakit" name="Izin / Sakit" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 2. SAMPLE RECEIVED CHART
export const SampleReceivedTrendChart: React.FC<{ records: DailyPerformanceRecord[] }> = ({ records }) => {
  const tr = useTimeRangeFilteredRecords(records);

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Tren Penerimaan Sampel Masuk Per Section
          </h4>
          <p className="text-xs text-slate-500">Volume ritme sampel Grade Control, Produksi, Eksplorasi, dan Smelter</p>
        </div>
      </div>

      <TimeRangeControls
        mode={tr.mode}
        onModeChange={tr.setMode}
        selectedWeek={tr.selectedWeek}
        onWeekChange={tr.setSelectedWeek}
        availableWeeks={tr.availableWeeks}
        selectedMonth={tr.selectedMonth}
        onMonthChange={tr.setSelectedMonth}
        availableMonths={tr.availableMonths}
        selectedYear={tr.selectedYear}
        onYearChange={tr.setSelectedYear}
        availableYears={tr.availableYears}
      />

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tr.aggregatedByDate}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="gcRecv" name="Grade Control (GC)" fill="#0d9488" />
            <Bar dataKey="expRecv" name="Exploration (EXP)" fill="#8b5cf6" />
            <Bar dataKey="prodRecv" name="Production" fill="#0284c7" />
            <Line type="monotone" dataKey="totalRecv" name="Total Masuk" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 3. PRODUCTIVITY PREPARASI CHART
export const ProductivityPrepTrendChart: React.FC<{ records: DailyPerformanceRecord[] }> = ({ records }) => {
  const tr = useTimeRangeFilteredRecords(records);

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            Tren Output Preparasi (Press Powder, Fusion Bead, LOI) vs Backlog
          </h4>
          <p className="text-xs text-slate-500">Perbandingan sampel selesai preparasi terhadap saldo sisa</p>
        </div>
      </div>

      <TimeRangeControls
        mode={tr.mode}
        onModeChange={tr.setMode}
        selectedWeek={tr.selectedWeek}
        onWeekChange={tr.setSelectedWeek}
        availableWeeks={tr.availableWeeks}
        selectedMonth={tr.selectedMonth}
        onMonthChange={tr.setSelectedMonth}
        availableMonths={tr.availableMonths}
        selectedYear={tr.selectedYear}
        onYearChange={tr.setSelectedYear}
        availableYears={tr.availableYears}
      />

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tr.aggregatedByDate}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="pressFin" name="Press Powder Pelet" fill="#0284c7" />
            <Bar dataKey="fuseFin" name="Fuse Bead Selesai" fill="#d97706" />
            <Bar dataKey="loiFin" name="LOI Selesai" fill="#9333ea" />
            <Line type="monotone" dataKey="fuseBal" name="Backlog Bead" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="loiBal" name="Backlog LOI" stroke="#ea580c" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 4. XRF INSTRUMENTS CHART (EDXRF 6-ALAT & WDXRF 2-ALAT)
export const XrfInstrumentsTrendChart: React.FC<{ records: DailyPerformanceRecord[] }> = ({ records }) => {
  const tr = useTimeRangeFilteredRecords(records);
  const [subView, setSubView] = useState<'edxrf' | 'wdxrf'>('edxrf');

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Tren Pembacaan Spektrometri XRF (EDXRF 6 Mesin & WDXRF Zetium)
          </h4>
          <p className="text-xs text-slate-500">Evaluasi utilisasi per unit instrumen dan pengurangan antrean</p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
          <button
            onClick={() => setSubView('edxrf')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              subView === 'edxrf' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            EDXRF (6 Mesin Epsilon)
          </button>
          <button
            onClick={() => setSubView('wdxrf')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              subView === 'wdxrf' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            WDXRF (Zetium A vs B)
          </button>
        </div>
      </div>

      <TimeRangeControls
        mode={tr.mode}
        onModeChange={tr.setMode}
        selectedWeek={tr.selectedWeek}
        onWeekChange={tr.setSelectedWeek}
        availableWeeks={tr.availableWeeks}
        selectedMonth={tr.selectedMonth}
        onMonthChange={tr.setSelectedMonth}
        availableMonths={tr.availableMonths}
        selectedYear={tr.selectedYear}
        onYearChange={tr.setSelectedYear}
        availableYears={tr.availableYears}
      />

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {subView === 'edxrf' ? (
            <ComposedChart data={tr.aggregatedByDate}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="epsC" name="EPS C" fill="#0d9488" stackId="ed" />
              <Bar dataKey="epsD" name="EPS D" fill="#06b6d4" stackId="ed" />
              <Bar dataKey="epsE" name="EPS E" fill="#0284c7" stackId="ed" />
              <Bar dataKey="epsF" name="EPS F" fill="#3b82f6" stackId="ed" />
              <Bar dataKey="epsG" name="EPS G" fill="#6366f1" stackId="ed" />
              <Bar dataKey="epsH" name="EPS H" fill="#8b5cf6" stackId="ed" />
              <Line type="monotone" dataKey="edxrfTotal" name="Total EDXRF" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          ) : (
            <ComposedChart data={tr.aggregatedByDate}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="ztmA" name="Zetium A" fill="#0284c7" />
              <Bar dataKey="ztmB" name="Zetium B" fill="#6366f1" />
              <Line type="monotone" dataKey="wdxrfTotal" name="Total Run WDXRF" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="wdxrfBal" name="Outstanding Sisa" stroke="#e11d48" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 5. QC & REPORTING CHART
export const QcReportingTrendChart: React.FC<{ records: DailyPerformanceRecord[] }> = ({ records }) => {
  const tr = useTimeRangeFilteredRecords(records);

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Tren QC Verification & Pelepasan Laporan CoA
          </h4>
          <p className="text-xs text-slate-500">Kecepatan rilis sertifikat analisis eksplorasi terhadap saldo pending</p>
        </div>
      </div>

      <TimeRangeControls
        mode={tr.mode}
        onModeChange={tr.setMode}
        selectedWeek={tr.selectedWeek}
        onWeekChange={tr.setSelectedWeek}
        availableWeeks={tr.availableWeeks}
        selectedMonth={tr.selectedMonth}
        onMonthChange={tr.setSelectedMonth}
        availableMonths={tr.availableMonths}
        selectedYear={tr.selectedYear}
        onYearChange={tr.setSelectedYear}
        availableYears={tr.availableYears}
      />

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tr.aggregatedByDate}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="qcFin" name="QC Selesai" fill="#0d9488" />
            <Bar dataKey="reportFin" name="Laporan Dirilis" fill="#10b981" />
            <Line type="monotone" dataKey="qcBal" name="QC Pending" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="reportBal" name="Laporan O/S" stroke="#e11d48" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
