import React, { useState, useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  BarChart2, 
  Users, 
  AlertCircle, 
  CheckCircle2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { 
  ScreenTestRecord, 
  ScreenTestStats, 
  ScreenTestChartView 
} from './screen-test-types';
import { 
  calculateHistogram, 
  calculateOperatorStats, 
  calculateDailyTrend 
} from './screen-test-utils';

interface ScreenTestChartProps {
  records: ScreenTestRecord[];
  stats: ScreenTestStats;
  specLimit?: number;
}

export const ScreenTestChart: React.FC<ScreenTestChartProps> = ({
  records,
  stats,
  specLimit = 95.00,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<ScreenTestChartView>('run-chart');
  const [showBrush, setShowBrush] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Prepare chart series data
  const chartData = useMemo(() => {
    return records.map((r, index) => ({
      index: index + 1,
      no: r.no ?? index + 1,
      sampleId: r.sampleId,
      date: r.date,
      passedPercentage: r.passedPercentage,
      passedWeight: r.passedWeight,
      unpassedWeight: r.unpassedWeight,
      originalWeight: r.originalWeight,
      operator: r.operator,
      minPassed: r.minPassed || specLimit,
      isPass: r.isPass,
      delta: +(r.passedPercentage - specLimit).toFixed(2),
    }));
  }, [records, specLimit]);

  // Dynamic Y-Domain matching Excel 90% - 100% or covering lower outliers
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [90, 100];
    const values = chartData.map(d => d.passedPercentage);
    const minVal = Math.min(...values, specLimit);
    const maxVal = Math.max(...values, 100);
    const yMin = Math.min(90, Math.floor(minVal - 1));
    const yMax = Math.min(100, Math.ceil(maxVal + 0.5));
    return [yMin, yMax];
  }, [chartData, specLimit]);

  // Distribution Histogram data
  const histogramData = useMemo(() => {
    return calculateHistogram(records, specLimit);
  }, [records, specLimit]);

  // Operator Comparison data
  const operatorData = useMemo(() => {
    return calculateOperatorStats(records);
  }, [records]);

  // Daily Trend data
  const dailyData = useMemo(() => {
    return calculateDailyTrend(records);
  }, [records]);

  // Export Chart to HD PNG
  const handleExportPng = async () => {
    if (!chartContainerRef.current) return;
    setIsExporting(true);
    try {
      toast.loading('Menyiapkan gambar grafik...', { id: 'export-png' });
      await new Promise(r => setTimeout(r, 150));
      const dataUrl = await toPng(chartContainerRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `Screen_Test_Smelter_HPL_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Grafik berhasil diexport ke file PNG HD!', { id: 'export-png' });
    } catch (err: any) {
      toast.error('Gagal export gambar: ' + err.message, { id: 'export-png' });
    } finally {
      setIsExporting(false);
    }
  };

  // Pure Scatter Point Renderer (No connecting lines, exact Excel scatter look)
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    const isPass = payload.passedPercentage >= specLimit;

    if (!isPass) {
      // Out-of-spec point: Red dot (distinct marker for failed samples)
      return (
        <g key={`dot-${payload.sampleId}-${payload.index}`}>
          <circle cx={cx} cy={cy} r={5.5} fill="#dc2626" stroke="#ffffff" strokeWidth={1.5} />
          <circle cx={cx} cy={cy} r={2} fill="#ffffff" />
        </g>
      );
    }

    // In-spec point: Green scatter dot matching Excel screenshot
    return (
      <g key={`dot-${payload.sampleId}-${payload.index}`}>
        <circle cx={cx} cy={cy} r={4.5} fill="#16a34a" stroke="#ffffff" strokeWidth={1} />
      </g>
    );
  };

  // Custom Light Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const isPass = data.passedPercentage >= specLimit;

    return (
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xl text-xs max-w-xs z-50 text-slate-800">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-900 text-sm">{data.sampleId}</span>
            <span className="text-[11px] text-slate-500 font-mono">#{data.no}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 ${
            isPass 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}>
            {isPass ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {isPass ? 'PASS' : 'OUT OF SPEC'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 py-2">
          <div>
            <span className="text-[10px] text-slate-500 block">Lolos Ayakan (%)</span>
            <span className={`text-sm font-black font-mono ${isPass ? 'text-emerald-700' : 'text-rose-600'}`}>
              {data.passedPercentage.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Deviasi dari Std</span>
            <span className={`text-xs font-bold font-mono ${data.delta >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {data.delta >= 0 ? `+${data.delta}%` : `${data.delta}%`}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Tertahan (B)</span>
            <span className="text-slate-800 font-mono font-semibold">{data.unpassedWeight} gr</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Lolos (C)</span>
            <span className="text-slate-800 font-mono font-semibold">{data.passedWeight} gr</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Tgl: <strong className="text-slate-700">{data.date}</strong></span>
          <span>Analis: <strong className="text-slate-900 font-bold">{data.operator}</strong></span>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={chartContainerRef}
      className="w-full bg-white rounded-2xl border-2 border-slate-400 shadow-sm p-4 sm:p-5 transition-all text-slate-900"
    >
      {/* Chart Top Header Box - Matching Excel Screenshot Blue Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-[#1e3a8a] text-white font-black text-xs px-3 py-1.5 rounded shadow-xs uppercase tracking-wider">
            Screen Test Sample Smelter HPL
          </div>
          <span className="text-xs text-slate-500 font-medium">
            (Batas Min: <strong className="text-red-600">{specLimit.toFixed(2)}%</strong>)
          </span>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Tabs */}
          <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveView('run-chart')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeView === 'run-chart'
                  ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              <span>Scatter Plot</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('distribution')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeView === 'distribution'
                  ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Distribusi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('operator-stats')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeView === 'operator-stats'
                  ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Performa Analis</span>
            </button>
          </div>

          {/* Export PNG */}
          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Main Plot Area - Exact Excel Scatter Style (Clean White Box with Red Spec Line & Green/Red Dots) */}
      <div className="mt-3 w-full h-[380px] sm:h-[440px] bg-white border border-slate-300 rounded-lg p-2">
        {records.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <TrendingUp className="w-8 h-8 opacity-40 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">Belum ada data sampel untuk ditampilkan pada grafik</p>
            <p className="text-xs text-slate-400">Klik "Paste Data Excel" untuk memuat data</p>
          </div>
        ) : activeView === 'run-chart' ? (
          /* VIEW 1: PURE SCATTER PLOT (TITIK SAJA TANPA GARIS PENGHUBUNG - EXACT EXCEL STYLE) */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 25, left: -10, bottom: showBrush ? 20 : 55 }}
            >
              <CartesianGrid 
                strokeDasharray="2 2" 
                stroke="#e2e8f0" 
                vertical={false} 
              />

              <XAxis
                dataKey="sampleId"
                stroke="#475569"
                tick={{ fill: '#1e293b', fontSize: 9, fontFamily: 'monospace' }}
                angle={-90}
                textAnchor="end"
                interval={Math.max(0, Math.floor(chartData.length / 40))}
                height={65}
                tickLine={{ stroke: '#94a3b8' }}
              />

              <YAxis
                domain={yDomain}
                stroke="#475569"
                tick={{ fill: '#1e293b', fontSize: 10, fontFamily: 'monospace' }}
                unit="%"
                tickCount={11}
                tickLine={{ stroke: '#94a3b8' }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* SPECIFICATION LIMIT LINE (RED HORIZONTAL LINE AT 95.00% EXACTLY AS IN EXCEL) */}
              <ReferenceLine
                y={specLimit}
                stroke="#dc2626"
                strokeWidth={2}
                label={{
                  value: `MIN PASSED: ${specLimit.toFixed(2)}%`,
                  position: 'insideTopRight',
                  fill: '#dc2626',
                  fontSize: 10.5,
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                }}
              />

              {/* PURE SCATTER POINTS (stroke="none" - NO CONNECTING LINE) */}
              <Line
                type="monotone"
                dataKey="passedPercentage"
                stroke="none"
                dot={renderCustomDot}
                activeDot={{ r: 6.5, fill: '#16a34a', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* RANGE BRUSH SLIDER FOR LARGE DATASETS */}
              {showBrush && chartData.length > 30 && (
                <Brush
                  dataKey="sampleId"
                  height={22}
                  stroke="#1e3a8a"
                  fill="#f8fafc"
                  tickFormatter={() => ''}
                  startIndex={Math.max(0, chartData.length - 45)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : activeView === 'distribution' ? (
          /* VIEW 2: DISTRIBUTION HISTOGRAM */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={histogramData}
              margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="rangeLabel" stroke="#64748b" tick={{ fill: '#334155', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#334155', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-300 p-2.5 rounded-lg text-xs shadow-md text-slate-800">
                      <p className="font-bold text-slate-900">Rentang: {d.rangeLabel}</p>
                      <p className="text-teal-700 font-bold mt-1">Frekuensi: {d.count} Sampel</p>
                      <p className={`text-[11px] font-semibold mt-0.5 ${d.isFailBin ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {d.isFailBin ? '⚠️ Di bawah standar (< 95%)' : '✓ Memenuhi standar (>= 95%)'}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {histogramData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.isFailBin ? '#ef4444' : '#10b981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          /* VIEW 3: OPERATOR PERFORMANCE */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={operatorData}
              margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="operator" stroke="#64748b" tick={{ fill: '#334155', fontSize: 11, fontWeight: 'bold' }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#334155', fontSize: 11 }} unit="%" />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-300 p-3 rounded-lg text-xs shadow-md text-slate-800">
                      <p className="font-bold text-slate-900 text-sm">Analis: {d.operator}</p>
                      <p className="text-slate-600 mt-1">Total Sampel: <strong>{d.total}</strong></p>
                      <p className="text-emerald-700 font-semibold">Lolos: {d.passed} ({d.passRate}%)</p>
                      <p className="text-rose-600 font-semibold">Out of Spec: {d.failed}</p>
                      <p className="text-blue-700 font-medium mt-1">Rata-rata: {d.avgPassedPercentage}%</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={specLimit} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Target 95%', fill: '#dc2626', fontSize: 10 }} />
              <Bar dataKey="passRate" name="Pass Rate (%)" radius={[4, 4, 0, 0]}>
                {operatorData.map((entry, idx) => (
                  <Cell
                    key={`op-cell-${idx}`}
                    fill={entry.passRate >= 90 ? '#0d9488' : '#eab308'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Legend */}
      <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-slate-700 font-medium">Lolos (&ge; {specLimit.toFixed(2)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            <span className="text-rose-700 font-bold">Out of Spec (&lt; {specLimit.toFixed(2)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-rose-600 inline-block" />
            <span className="text-slate-600">Garis Batas Standar ({specLimit.toFixed(2)}%)</span>
          </div>
        </div>

        <div className="font-mono text-[11px] text-slate-500">
          Total Plot: <strong className="text-slate-800">{records.length}</strong> Titik Sampel
        </div>
      </div>
    </div>
  );
};
