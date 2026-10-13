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
  ReferenceArea,
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
  FileSpreadsheet,
  Layers,
  Sparkles,
  Copy
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { toast } from 'sonner';
import { 
  ScreenTestRecord, 
  ScreenTestStats, 
  ScreenTestChartView 
} from './screen-test-types';
import { 
  calculateHistogram, 
  calculateOperatorStats, 
  calculateDailyTrend,
  parseDateString
} from './screen-test-utils';

interface ScreenTestChartProps {
  records: ScreenTestRecord[];
  stats: ScreenTestStats;
  specLimit?: number;
  datasetName?: string;
  datasetCode?: string;
  meshSize?: string;
  periodLabel?: string;
}

// Custom clean rotated X-Axis Tick to eliminate overlap or hyphen artifacts
const CustomizedAxisTick = (props: any) => {
  const { x, y, payload } = props;
  if (!payload || !payload.value) return null;
  const label = String(payload.value).replace(/^[.:\-•\s]+/, '').trim();

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        dx={-4}
        textAnchor="end"
        fill="#475569"
        fontSize={10}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontWeight={600}
        transform="rotate(-55)"
      >
        {label}
      </text>
    </g>
  );
};

export const ScreenTestChart: React.FC<ScreenTestChartProps> = ({
  records,
  stats,
  specLimit = 95.00,
  datasetName = 'Sample Smelter HPL',
  datasetCode = 'HPL',
  meshSize = '200 mesh (74 µm)',
  periodLabel,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<ScreenTestChartView>('run-chart');
  const [showZones, setShowZones] = useState(true); // Acceptable vs Reject zone shading
  const [showMeanLine, setShowMeanLine] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Clean title to avoid redundantly repeating datasetCode if already in datasetName (e.g. "Sample Smelter HPL" + badge "HPL" -> "Sample Smelter")
  const cleanTitle = useMemo(() => {
    const trimmed = (datasetName || '').trim();
    if (!datasetCode) return trimmed;
    const codeRegex = new RegExp(`\\s*${datasetCode}\\s*$`, 'i');
    const stripped = trimmed.replace(codeRegex, '').trim();
    return stripped || trimmed;
  }, [datasetName, datasetCode]);

  // Calculate Sampling Date Range (Range Pengambilan Data Sampel)
  const dateRangeLabel = useMemo(() => {
    if (records.length === 0) return 'Belum ada data';
    const parsedDates: { raw: string; time: number }[] = [];
    for (const r of records) {
      if (!r.date) continue;
      const d = parseDateString(r.date);
      if (d) {
        parsedDates.push({ raw: r.date, time: d.getTime() });
      }
    }
    if (parsedDates.length === 0) {
      const validRaws = records.map(r => r.date).filter(Boolean);
      if (validRaws.length === 0) return '-';
      return validRaws[0] === validRaws[validRaws.length - 1]
        ? validRaws[0]
        : `${validRaws[0]} s/d ${validRaws[validRaws.length - 1]}`;
    }
    parsedDates.sort((a, b) => a.time - b.time);
    const earliest = parsedDates[0].raw;
    const latest = parsedDates[parsedDates.length - 1].raw;
    if (earliest === latest) {
      return earliest;
    }
    return `${earliest} s/d ${latest}`;
  }, [records]);

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

  // Dynamic Y-Domain matching industrial SPC chart
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [Math.floor(specLimit - 5), 100];
    const values = chartData.map(d => d.passedPercentage);
    const minVal = Math.min(...values, specLimit);
    const maxVal = Math.max(...values, 100);
    const yMin = Math.max(0, Math.floor(minVal - 2));
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

  // Filter out interactive toolbar buttons during export/snapshot
  const exportFilter = (node: HTMLElement) => {
    if (node && node.dataset && node.dataset.noExport === 'true') {
      return false;
    }
    return true;
  };

  // Export Chart to HD PNG
  const handleExportPng = async () => {
    if (!chartContainerRef.current) return;
    setIsExporting(true);
    try {
      toast.loading('Menyiapkan gambar grafik resolusi tinggi...', { id: 'export-png' });
      await new Promise(r => setTimeout(r, 220));
      const dataUrl = await toPng(chartContainerRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        filter: exportFilter,
        style: {
          minWidth: '1080px',
        },
      });
      const link = document.createElement('a');
      link.download = `Screen_Test_${datasetCode}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Grafik berhasil diexport ke file PNG HD!', { id: 'export-png' });
    } catch (err: any) {
      toast.error('Gagal export gambar: ' + err.message, { id: 'export-png' });
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Chart Image directly to Clipboard (Ctrl+V into PowerPoint)
  const handleCopyImageToClipboard = async () => {
    if (!chartContainerRef.current) return;
    setIsExporting(true);
    try {
      toast.loading('Menyalin grafik HD ke clipboard...', { id: 'copy-chart' });
      await new Promise(r => setTimeout(r, 220));
      const blob = await toBlob(chartContainerRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        filter: exportFilter,
        style: {
          minWidth: '1080px',
        },
      });
      if (!blob) throw new Error('Gagal merender gambar grafik');

      if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        toast.success('Grafik berhasil disalin ke Clipboard! Tekan Ctrl+V di slide PowerPoint.', { id: 'copy-chart', duration: 4500 });
      } else {
        // Fallback to PNG download
        const dataUrl = await toPng(chartContainerRef.current, { pixelRatio: 2.5, backgroundColor: '#ffffff', filter: exportFilter, style: { minWidth: '1080px' } });
        const link = document.createElement('a');
        link.download = `Screen_Test_${datasetCode}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Browser tidak mendukung clipboard gambar, grafik diunduh sebagai file PNG.', { id: 'copy-chart' });
      }
    } catch (err: any) {
      toast.error('Gagal menyalin grafik: ' + err.message, { id: 'copy-chart' });
    } finally {
      setIsExporting(false);
    }
  };

  // Pure Scatter Point Renderer (Clean enterprise dots)
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    const isPass = payload.passedPercentage >= specLimit;

    if (!isPass) {
      // Out-of-spec point: Red glowing alert dot
      return (
        <g key={`dot-${payload.sampleId}-${payload.index}`}>
          <circle cx={cx} cy={cy} r={8} fill="rgba(239, 68, 68, 0.2)" />
          <circle cx={cx} cy={cy} r={5.5} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={1.5} fill="#ffffff" />
        </g>
      );
    }

    // In-spec point: Emerald green dot
    return (
      <g key={`dot-${payload.sampleId}-${payload.index}`}>
        <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} />
      </g>
    );
  };

  // Custom Light Tooltip (Executive Glassmorphism)
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const isPass = data.passedPercentage >= specLimit;

    return (
      <div className="bg-white/95 border border-slate-300 rounded-xl p-3.5 shadow-xl text-xs max-w-xs z-50 text-slate-800 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <div className="font-mono font-black text-slate-900 text-sm">{data.sampleId}</div>
            <span className="text-[10px] text-slate-500 font-mono">Urutan #{data.no} • {datasetCode}</span>
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

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 py-2.5">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Lolos Ayakan (%)</span>
            <span className={`text-base font-black font-mono ${isPass ? 'text-emerald-700' : 'text-rose-600'}`}>
              {data.passedPercentage.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Deviasi Std ({specLimit}%)</span>
            <span className={`text-xs font-bold font-mono ${data.delta >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {data.delta >= 0 ? `+${data.delta}%` : `${data.delta}%`}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Tertahan [B]</span>
            <span className="text-slate-800 font-mono font-semibold">{data.unpassedWeight} gr</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Lolos [C]</span>
            <span className="text-slate-800 font-mono font-semibold">{data.passedWeight} gr</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <span>Tgl: <strong className="text-slate-900">{data.date}</strong></span>
          <span>Analis: <strong className="text-slate-900 font-bold">{data.operator}</strong></span>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={chartContainerRef}
      className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 transition-all text-slate-900"
    >
      {/* ═══ CHART EXECUTIVE HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-slate-200">
        <div className="flex items-center shrink-0">
          <div 
            className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm ring-1 ring-slate-800 shrink-0"
            style={{ marginRight: '14px' }}
          >
            {datasetCode}
          </div>
          <div className="flex flex-col justify-center shrink-0">
            <div className="flex items-center shrink-0">
              <h3 
                className="text-base sm:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap"
                style={{ marginRight: '18px' }}
              >
                Screen Test {cleanTitle}
              </h3>
              <span 
                className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300 shrink-0 whitespace-nowrap shadow-2xs"
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                {meshSize}
              </span>
            </div>
            <div className="flex items-center text-xs text-slate-600 mt-1.5 whitespace-nowrap shrink-0">
              <span>Batas Min: <strong className="text-rose-600 font-bold">&ge; {specLimit.toFixed(2)}%</strong></span>
              <span className="text-slate-300" style={{ marginLeft: '8px', marginRight: '8px' }}>•</span>
              <span>Rata-rata: <strong className="text-blue-700 font-mono font-bold">{stats.meanPassed}%</strong></span>
              <span className="text-slate-300" style={{ marginLeft: '8px', marginRight: '8px' }}>•</span>
              <span>Kepatuhan: <strong className={stats.passRate >= 90 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>{stats.passRate}%</strong></span>
              {dateRangeLabel && dateRangeLabel !== 'Belum ada data' && (
                <>
                  <span className="text-slate-300" style={{ marginLeft: '8px', marginRight: '8px' }}>•</span>
                  <span>Range Data: <strong className="text-slate-900 font-mono font-bold">{dateRangeLabel}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View Switcher & Action Buttons - Excluded during export to give header 100% full width without collision */}
        {!isExporting ? (
          <div data-no-export="true" className="flex flex-wrap items-center gap-2">
            {/* View Tabs */}
            <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveView('run-chart')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'operator-stats'
                    ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Performa Analis</span>
              </button>
            </div>

            {/* Toggle Zone Shading */}
            {activeView === 'run-chart' && (
              <button
                type="button"
                onClick={() => setShowZones(!showZones)}
                title="Tampilkan / Sembunyikan Arsiran Zona Spek"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  showZones
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Zona: {showZones ? 'ON' : 'OFF'}
              </button>
            )}

            {/* Copy to PPT Clipboard */}
            <button
              type="button"
              onClick={handleCopyImageToClipboard}
              disabled={isExporting}
              title="Salin gambar grafik resolusi tinggi ke clipboard, lalu tekan Ctrl+V langsung di slide PowerPoint"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Copy className="w-3.5 h-3.5 text-teal-400" />
              <span>Salin ke PPT</span>
            </button>

            {/* Export PNG */}
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download PNG</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end shrink-0" style={{ marginLeft: '16px' }}>
            <div className="flex items-center">
              <span 
                className="px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-mono font-bold tracking-wider"
                style={{ marginRight: '8px' }}
              >
                {activeView === 'run-chart' ? 'SPC SCATTER PLOT' : activeView === 'distribution' ? 'HISTOGRAM DISTRIBUSI' : 'PERFORMA ANALIS'}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-mono font-bold">
                📅 RENTANG: {dateRangeLabel}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1">
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* ═══ MAIN PLOT AREA ═══ */}
      <div className="mt-4 w-full h-[400px] sm:h-[460px] bg-slate-50/50 rounded-xl p-3 border border-slate-200">
        {records.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <TrendingUp className="w-10 h-10 opacity-30 text-slate-400" />
            <p className="text-sm font-bold text-slate-600">Belum ada data sampel pada dataset {datasetName}</p>
            <p className="text-xs text-slate-400">Silakan paste data dari Excel pada kotak di bawah</p>
          </div>
        ) : activeView === 'run-chart' ? (
          /* VIEW 1: ENTERPRISE SCATTER PLOT */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              key={`chart-${datasetCode}-${records.length}-${specLimit}`}
              data={chartData}
              margin={{ top: 20, right: 30, left: -10, bottom: 65 }}
            >
              {/* ACCEPTABLE (IN-SPEC) VS NON-ACCEPTABLE ZONE SHADING */}
              {showZones && (
                <>
                  <ReferenceArea
                    y1={specLimit}
                    y2={100}
                    fill="#10b981"
                    fillOpacity={0.04}
                  />
                  <ReferenceArea
                    y1={yDomain[0]}
                    y2={specLimit}
                    fill="#ef4444"
                    fillOpacity={0.05}
                  />
                </>
              )}

              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e2e8f0" 
                vertical={false} 
              />

              <XAxis
                dataKey="sampleId"
                stroke="#475569"
                tick={<CustomizedAxisTick />}
                interval={0}
                height={65}
                tickLine={{ stroke: '#cbd5e1' }}
              />

              <YAxis
                domain={yDomain}
                stroke="#475569"
                tick={{ fill: '#1e293b', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                unit="%"
                tickCount={11}
                tickLine={{ stroke: '#cbd5e1' }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* SPECIFICATION LIMIT LINE (RED HORIZONTAL LINE) */}
              <ReferenceLine
                y={specLimit}
                stroke="#dc2626"
                strokeWidth={2}
                label={{
                  value: `BATAS MIN: ${specLimit.toFixed(2)}%`,
                  position: 'insideTopRight',
                  fill: '#dc2626',
                  fontSize: 11,
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                }}
              />

              {/* MEAN PROCESS LINE (BLUE DASHED) */}
              {showMeanLine && (
                <ReferenceLine
                  y={stats.meanPassed}
                  stroke="#2563eb"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `MEAN: ${stats.meanPassed.toFixed(2)}%`,
                    position: 'insideBottomRight',
                    fill: '#2563eb',
                    fontSize: 10,
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                  }}
                />
              )}

              {/* SCATTER POINTS (stroke="none" - NO CONNECTING LINES) */}
              <Line
                type="monotone"
                dataKey="passedPercentage"
                stroke="none"
                dot={renderCustomDot}
                activeDot={{ r: 7.5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* Range brush for large datasets */}
              {chartData.length > 25 && (
                <Brush
                  dataKey="sampleId"
                  height={22}
                  stroke="#1e3a8a"
                  fill="#ffffff"
                  tickFormatter={() => ''}
                  startIndex={Math.max(0, chartData.length - 40)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : activeView === 'distribution' ? (
          /* VIEW 2: DISTRIBUTION HISTOGRAM */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              key={`hist-${datasetCode}-${records.length}`}
              data={histogramData}
              margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="rangeLabel" stroke="#475569" tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
              <YAxis stroke="#475569" tick={{ fill: '#334155', fontSize: 11 }} allowDecimals={false} />
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
                        {d.isFailBin ? '⚠️ Di bawah standar' : '✓ Memenuhi spesifikasi'}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[5, 5, 0, 0]}>
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
              key={`op-${datasetCode}-${records.length}`}
              data={operatorData}
              margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="operator" stroke="#475569" tick={{ fill: '#334155', fontSize: 11, fontWeight: 'bold' }} />
              <YAxis domain={[0, 100]} stroke="#475569" tick={{ fill: '#334155', fontSize: 11 }} unit="%" />
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
              <ReferenceLine y={specLimit} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `Target ${specLimit}%`, fill: '#dc2626', fontSize: 10 }} />
              <Bar dataKey="passRate" name="Pass Rate (%)" radius={[5, 5, 0, 0]}>
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

      {/* ═══ CHART LEGEND & AUDIT STRIP ═══ */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-emerald-900 font-bold">Lolos (&ge; {specLimit.toFixed(2)}%)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            <span className="text-rose-900 font-bold">Out of Spec (&lt; {specLimit.toFixed(2)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-rose-600 inline-block" />
            <span className="text-slate-600">Batas Spesifikasi ({specLimit.toFixed(2)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-blue-600 border-dashed inline-block" />
            <span className="text-slate-600">Garis Rata-rata Proses ({stats.meanPassed.toFixed(2)}%)</span>
          </div>
        </div>

        <div className="font-mono text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg flex items-center">
          <span style={{ marginRight: '8px' }}>
            Range Pengambilan: <strong className="text-slate-900 font-bold">{dateRangeLabel}</strong>
          </span>
          <span className="text-slate-300" style={{ marginRight: '8px' }}>•</span>
          <span>
            Total: <strong className="text-slate-900 font-bold">{records.length}</strong> Titik Sampel
          </span>
        </div>
      </div>
    </div>
  );
};
