import React, { useState, useMemo } from 'react';
import { 
  Activity, AlertTriangle, AlertCircle, CheckCircle2, X, 
  Download, Trash2, Filter, Layers, Sliders, Eye, RefreshCw, 
  ChevronDown, Check, ShieldAlert, Sparkles, PlusCircle, ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';

export interface IsolatedOffspecPoint {
  id: string; // unique key: `${instCode}-${stdCode}-${element}-${index}`
  pointId?: number;
  index: number;
  date: string;
  analyzedAt?: string;
  instrumentCode: string;
  instrumentName: string;
  standardCode: string;
  element: string;
  value: number;
  nominalValue: number;
  stdevFixed: number;
  diff: number;
  sigmaDist: number;
  status: 'action' | 'warning' | 'normal';
  statusLabel: string;
  isolatedAt: string;
  note?: string;
  issue?: string;
  solution?: string;
  picNik?: string;
  picName?: string;
}

interface XrfOffspecIsolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isolatedPoints: IsolatedOffspecPoint[];
  onRemovePoint: (id: string) => void;
  onClearAll: () => void;
  onAutoIsolateAllOffspec?: () => void;
  instrumentThemes?: Record<string, { headerBg: string; dotColor: string; name: string }>;
}

export const XrfOffspecIsolationModal: React.FC<XrfOffspecIsolationModalProps> = ({
  isOpen,
  onClose,
  isolatedPoints,
  onRemovePoint,
  onClearAll,
  onAutoIsolateAllOffspec,
  instrumentThemes = {},
}) => {
  // Filters
  const [filterInstrument, setFilterInstrument] = useState<string>('ALL');
  const [filterElement, setFilterElement] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ACTION' | 'WARNING'>('ALL');
  const [chartMode, setChartMode] = useState<'sigma' | 'raw'>('sigma');
  const [hoveredChartPoint, setHoveredChartPoint] = useState<IsolatedOffspecPoint | null>(null);

  // Distinct lists for filters
  const availableInstruments = useMemo(() => {
    const map = new Map<string, string>();
    isolatedPoints.forEach(p => map.set(p.instrumentCode, p.instrumentName));
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [isolatedPoints]);

  const availableElements = useMemo(() => {
    return Array.from(new Set(isolatedPoints.map(p => p.element)));
  }, [isolatedPoints]);

  // Filtered dataset
  const filteredPoints = useMemo(() => {
    return isolatedPoints.filter(p => {
      if (filterInstrument !== 'ALL' && p.instrumentCode !== filterInstrument) return false;
      if (filterElement !== 'ALL' && p.element !== filterElement) return false;
      if (filterSeverity === 'ACTION' && p.status !== 'action') return false;
      if (filterSeverity === 'WARNING' && p.status !== 'warning') return false;
      return true;
    });
  }, [isolatedPoints, filterInstrument, filterElement, filterSeverity]);

  // -----------------------------------------------------------------
  // 1. REKAPITULASI PER INSTRUMEN
  // -----------------------------------------------------------------
  const instrumentRecap = useMemo(() => {
    const map: Record<string, {
      code: string;
      name: string;
      total: number;
      actionCount: number;
      warningCount: number;
      maxAbsDiff: number;
      elements: Record<string, number>;
      avgSigma: number;
      points: IsolatedOffspecPoint[];
    }> = {};

    isolatedPoints.forEach(p => {
      if (!map[p.instrumentCode]) {
        map[p.instrumentCode] = {
          code: p.instrumentCode,
          name: p.instrumentName,
          total: 0,
          actionCount: 0,
          warningCount: 0,
          maxAbsDiff: 0,
          elements: {},
          avgSigma: 0,
          points: [],
        };
      }

      const entry = map[p.instrumentCode];
      entry.total += 1;
      if (p.status === 'action') entry.actionCount += 1;
      else if (p.status === 'warning') entry.warningCount += 1;

      const absDiff = Math.abs(p.diff);
      if (absDiff > entry.maxAbsDiff) entry.maxAbsDiff = absDiff;

      entry.elements[p.element] = (entry.elements[p.element] || 0) + 1;
      entry.points.push(p);
    });

    // Compute average sigma
    Object.values(map).forEach(entry => {
      const sumSigma = entry.points.reduce((acc, curr) => acc + Math.abs(curr.sigmaDist), 0);
      entry.avgSigma = entry.total > 0 ? Number((sumSigma / entry.total).toFixed(2)) : 0;
    });

    return Object.values(map);
  }, [isolatedPoints]);

  // Export to CSV
  const handleExportCSV = () => {
    if (isolatedPoints.length === 0) {
      toast.error('Tidak ada data isolasi untuk diekspor');
      return;
    }

    const headers = [
      'ID', 'Tanggal Analisa', 'Run #', 'Mesin XRF', 'Kode Standar',
      'Unsur', 'Nilai Terukur (%)', 'Nilai Acuan CL (%)', 'Deviasi (Diff)',
      'Sigma Distance (Z)', 'Status QC', 'Issue / Masalah', 'Solusi / Tindakan', 'PIC NIK', 'PIC Nama', 'Waktu Isolasi'
    ];

    const rows = filteredPoints.map(p => [
      p.id,
      p.analyzedAt || p.date,
      p.index,
      `"${p.instrumentName}"`,
      p.standardCode,
      p.element,
      p.value.toFixed(4),
      p.nominalValue.toFixed(4),
      p.diff.toFixed(4),
      p.sigmaDist.toFixed(2),
      p.status === 'action' ? 'Need Re-calibration (>3σ)' : 'Warning (2σ-3σ)',
      `"${(p.issue || '').replace(/"/g, '""')}"`,
      `"${(p.solution || '').replace(/"/g, '""')}"`,
      `"${p.picNik || ''}"`,
      `"${(p.picName || '').replace(/"/g, '""')}"`,
      p.isolatedAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_isolasi_offspec_xrf_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Berhasil mengunduh ${filteredPoints.length} baris data isolasi off-spec`);
  };

  // -----------------------------------------------------------------
  // 2. SVG CHART RENDERING UNTUK DATA OFFSPEC TERISOLASI
  // -----------------------------------------------------------------
  const svgWidth = 840;
  const svgHeight = 320;
  const padding = { top: 32, right: 60, bottom: 44, left: 64 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Chart domain & scale
  const chartData = useMemo(() => {
    if (filteredPoints.length === 0) return { min: -4, max: 4, points: [] };

    if (chartMode === 'sigma') {
      let minSigma = -3.5;
      let maxSigma = 3.5;
      filteredPoints.forEach(p => {
        if (p.sigmaDist < minSigma) minSigma = Math.floor(p.sigmaDist - 0.5);
        if (p.sigmaDist > maxSigma) maxSigma = Math.ceil(p.sigmaDist + 0.5);
      });
      return { min: minSigma, max: maxSigma, points: filteredPoints };
    } else {
      let minVal = Infinity;
      let maxVal = -Infinity;
      filteredPoints.forEach(p => {
        if (p.value < minVal) minVal = p.value;
        if (p.value > maxVal) maxVal = p.value;
      });
      const span = Math.max(0.05, maxVal - minVal);
      return { 
        min: Number((minVal - span * 0.15).toFixed(3)), 
        max: Number((maxVal + span * 0.15).toFixed(3)), 
        points: filteredPoints 
      };
    }
  }, [filteredPoints, chartMode]);

  const getYCoord = (val: number) => {
    const range = chartData.max - chartData.min;
    if (range <= 0) return padding.top + plotHeight / 2;
    const clamped = Math.max(chartData.min, Math.min(chartData.max, val));
    const ratio = (clamped - chartData.min) / range;
    return padding.top + plotHeight - ratio * plotHeight;
  };

  const getXCoord = (idx: number, total: number) => {
    if (total <= 1) return padding.left + plotWidth / 2;
    return padding.left + (idx / (total - 1)) * plotWidth;
  };

  // Color mapping per instrument
  const getInstrumentColor = (code: string) => {
    const theme = instrumentThemes[code];
    if (theme?.dotColor) return theme.dotColor;
    if (code.includes('EPSILON_A')) return '#06B6D4';
    if (code.includes('EPSILON_B')) return '#9333EA';
    if (code.includes('EPSILON_C')) return '#14B8A6';
    if (code.includes('EPSILON_D')) return '#F59E0B';
    if (code.includes('EPSILON_E')) return '#F97316';
    if (code.includes('EPSILON_F')) return '#F43F5E';
    if (code.includes('EPSILON_G')) return '#10B981';
    if (code.includes('EPSILON_H')) return '#6366F1';
    if (code.includes('PUMA')) return '#8B5CF6';
    if (code.includes('SUPERMINI')) return '#EC4899';
    return '#3B82F6';
  };

  // Safe early exit after all hooks have been called
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Chart & Rekapitulasi Isolasi Data Off-Spec
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-xs">
                  {isolatedPoints.length} Data Terisolasi
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Investigasi data di luar toleransi (±2σ / ±3σ) dengan visualisasi chart khusus dan rekap per instrumen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAutoIsolateAllOffspec && (
              <button
                onClick={() => {
                  onAutoIsolateAllOffspec();
                  toast.success('Pemeriksaan selesai: Seluruh titik off-spec otomatis ditambahkan');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Pindai dan masukkan semua titik data dengan penyimpangan > 2σ ke dalam isolasi"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-Deteksi Semua Off-Spec</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={isolatedPoints.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Unduh Data Isolasi sebagai CSV/Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>

            {isolatedPoints.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Yakin ingin mengosongkan seluruh data isolasi off-spec?')) {
                    onClearAll();
                    toast.success('Daftar isolasi off-spec telah dikosongkan.');
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                title="Kosongkan Semua Data Isolasi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ------------------------------------------------------------- */}
          {/* SECTION 1: REKAPITULASI RINGKASAN PER INSTRUMEN               */}
          {/* ------------------------------------------------------------- */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Rekapitulasi Off-Spec per Mesin XRF ({instrumentRecap.length} Alat Terdeteksi)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Penyimpangan di luar batas 2σ (Warning) & 3σ (Action)
              </span>
            </div>

            {instrumentRecap.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/40">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Belum ada data titik off-spec yang diisolasi.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Klik titik pada grafik Shewhart utama, atau tekan tombol &quot;Auto-Deteksi Semua Off-Spec&quot; di atas untuk mengumpulkan data otomatis.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {instrumentRecap.map(item => {
                  const theme = instrumentThemes[item.code] || {
                    name: item.name,
                    dotColor: getInstrumentColor(item.code),
                    headerBg: 'bg-slate-800 text-white font-bold',
                  };

                  return (
                    <div 
                      key={`recap-${item.code}`}
                      className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div>
                        {/* Instrument Header Pill */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: theme.dotColor }} 
                            />
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {item.name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {item.total} Titik
                          </span>
                        </div>

                        {/* Severity Breakdown */}
                        <div className="grid grid-cols-2 gap-2 my-2 text-center">
                          <div className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
                            <div className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase">&gt; 3σ (Action)</div>
                            <div className="text-sm font-black text-red-700 dark:text-red-300">{item.actionCount}</div>
                          </div>
                          <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                            <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">2σ - 3σ (Warn)</div>
                            <div className="text-sm font-black text-amber-700 dark:text-amber-300">{item.warningCount}</div>
                          </div>
                        </div>

                        {/* Metrics detail */}
                        <div className="space-y-1 text-[10.5px] font-mono text-slate-600 dark:text-slate-400 pt-1">
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-400">Maks Deviasi (|Δ|):</span>
                            <span className="font-bold text-slate-900 dark:text-slate-200">
                              {item.maxAbsDiff.toFixed(3)} %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-400">Rata-rata Sigma:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-200">
                              {item.avgSigma.toFixed(2)} σ
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-400">Unsur Terkena:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                              {Object.keys(item.elements).join(', ') || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setFilterInstrument(filterInstrument === item.code ? 'ALL' : item.code)}
                        className={`w-full mt-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          filterInstrument === item.code
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {filterInstrument === item.code ? '✓ Sedang Difilter' : 'Filter Alat Ini'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 2: CHART TERPISAH ISOLASI DATA OFFSPEC                */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            
            {/* Toolbar Filters for Chart */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-500" />
                  Grafik Sebaran Titik Off-Spec Terisolasi
                </span>

                {/* Filter Instrument Dropdown */}
                <select
                  value={filterInstrument}
                  onChange={(e) => setFilterInstrument(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                >
                  <option value="ALL">Semua Mesin ({isolatedPoints.length})</option>
                  {availableInstruments.map(i => (
                    <option key={i.code} value={i.code}>{i.name}</option>
                  ))}
                </select>

                {/* Filter Element Dropdown */}
                {availableElements.length > 1 && (
                  <select
                    value={filterElement}
                    onChange={(e) => setFilterElement(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                  >
                    <option value="ALL">Semua Unsur</option>
                    {availableElements.map(el => (
                      <option key={el} value={el}>Unsur: {el}</option>
                    ))}
                  </select>
                )}

                {/* Filter Severity */}
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as any)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                >
                  <option value="ALL">Semua Severity (2σ & 3σ)</option>
                  <option value="ACTION">Hanya Kritis (&gt; 3σ Action)</option>
                  <option value="WARNING">Hanya Peringatan (2σ - 3σ Warning)</option>
                </select>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 p-0.5 text-xs font-bold self-start sm:self-auto">
                <button
                  onClick={() => setChartMode('sigma')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === 'sigma'
                      ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Skala Terstandarisasi Sigma (Z-Score)"
                >
                  Skala Sigma (Z)
                </button>
                <button
                  onClick={() => setChartMode('raw')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === 'raw'
                      ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Nilai Hasil Analisa Asli (%)"
                >
                  Nilai Asli (%)
                </button>
              </div>
            </div>

            {/* SVG CANVAS */}
            <div className="relative">
              {filteredPoints.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Activity className="w-8 h-8 mb-2 opacity-40 text-rose-500" />
                  <p className="text-xs font-bold">Tidak ada data off-spec untuk kriteria filter yang dipilih.</p>
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto select-none overflow-visible"
                >
                  {/* Plot Card Background */}
                  <rect
                    x={padding.left}
                    y={padding.top}
                    width={plotWidth}
                    height={plotHeight}
                    fill="#FFFFFF"
                    className="dark:fill-slate-900"
                    stroke="#E2E8F0"
                    strokeWidth="1.2"
                    rx="6"
                  />

                  {/* Sigma Reference Lines when chartMode === 'sigma' */}
                  {chartMode === 'sigma' ? (
                    <>
                      {/* +3σ Upper Action */}
                      <line
                        x1={padding.left}
                        y1={getYCoord(3.0)}
                        x2={padding.left + plotWidth}
                        y2={getYCoord(3.0)}
                        stroke="#EF4444"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <text
                        x={padding.left + plotWidth + 6}
                        y={getYCoord(3.0) + 3.5}
                        className="fill-red-600 dark:fill-red-400 text-[9px] font-mono font-bold"
                      >
                        +3.0σ (Action)
                      </text>

                      {/* +2σ Upper Warning */}
                      <line
                        x1={padding.left}
                        y1={getYCoord(2.0)}
                        x2={padding.left + plotWidth}
                        y2={getYCoord(2.0)}
                        stroke="#F59E0B"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padding.left + plotWidth + 6}
                        y={getYCoord(2.0) + 3.5}
                        className="fill-amber-600 dark:fill-amber-400 text-[9px] font-mono"
                      >
                        +2.0σ (Warn)
                      </text>

                      {/* 0.0σ Center Line */}
                      <line
                        x1={padding.left}
                        y1={getYCoord(0.0)}
                        x2={padding.left + plotWidth}
                        y2={getYCoord(0.0)}
                        stroke="#10B981"
                        strokeWidth="1.8"
                      />
                      <text
                        x={padding.left + plotWidth + 6}
                        y={getYCoord(0.0) + 3.5}
                        className="fill-emerald-600 dark:fill-emerald-400 text-[9px] font-mono font-black"
                      >
                        0.0σ (Target CL)
                      </text>

                      {/* -2σ Lower Warning */}
                      <line
                        x1={padding.left}
                        y1={getYCoord(-2.0)}
                        x2={padding.left + plotWidth}
                        y2={getYCoord(-2.0)}
                        stroke="#F59E0B"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padding.left + plotWidth + 6}
                        y={getYCoord(-2.0) + 3.5}
                        className="fill-amber-600 dark:fill-amber-400 text-[9px] font-mono"
                      >
                        -2.0σ (Warn)
                      </text>

                      {/* -3σ Lower Action */}
                      <line
                        x1={padding.left}
                        y1={getYCoord(-3.0)}
                        x2={padding.left + plotWidth}
                        y2={getYCoord(-3.0)}
                        stroke="#EF4444"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <text
                        x={padding.left + plotWidth + 6}
                        y={getYCoord(-3.0) + 3.5}
                        className="fill-red-600 dark:fill-red-400 text-[9px] font-mono font-bold"
                      >
                        -3.0σ (Action)
                      </text>

                      {/* Y-Axis Ticks */}
                      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(val => {
                        const y = getYCoord(val);
                        return (
                          <g key={`sigma-tick-${val}`}>
                            <line
                              x1={padding.left - 4}
                              y1={y}
                              x2={padding.left}
                              y2={y}
                              stroke="#94A3B8"
                              strokeWidth="1"
                            />
                            <text
                              x={padding.left - 7}
                              y={y + 3.5}
                              textAnchor="end"
                              className="fill-slate-500 text-[9.5px] font-mono"
                            >
                              {val > 0 ? `+${val}σ` : `${val}σ`}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  ) : (
                    // Raw value gridlines
                    [0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const val = chartData.min + pct * (chartData.max - chartData.min);
                      const y = getYCoord(val);
                      return (
                        <g key={`raw-tick-${idx}`}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={padding.left + plotWidth}
                            y2={y}
                            stroke="#E2E8F0"
                            className="dark:stroke-slate-800"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={padding.left - 6}
                            y={y + 3.5}
                            textAnchor="end"
                            className="fill-slate-500 text-[9.5px] font-mono"
                          >
                            {val.toFixed(3)}%
                          </text>
                        </g>
                      );
                    })
                  )}

                  {/* Plotted Data Points */}
                  {filteredPoints.map((p, idx) => {
                    const cx = getXCoord(idx, filteredPoints.length);
                    const val = chartMode === 'sigma' ? p.sigmaDist : p.value;
                    const cy = getYCoord(val);
                    const isAction = p.status === 'action';
                    const pointColor = getInstrumentColor(p.instrumentCode);
                    const isHovered = hoveredChartPoint?.id === p.id;

                    return (
                      <g key={`offspec-pt-${p.id}-${idx}`}>
                        {/* Connecting Line to CL */}
                        <line
                          x1={cx}
                          y1={chartMode === 'sigma' ? getYCoord(0) : getYCoord(p.nominalValue)}
                          x2={cx}
                          y2={cy}
                          stroke={pointColor}
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          opacity="0.4"
                        />

                        {/* Outer Glow / Pulse for Action points */}
                        {isAction && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 9 : 7}
                            fill="#EF4444"
                            fillOpacity="0.2"
                            className="animate-pulse"
                          />
                        )}

                        {/* Main Dot */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 6 : 4.5}
                          fill={pointColor}
                          stroke="#FFFFFF"
                          strokeWidth="1.8"
                          className="cursor-pointer transition-transform duration-100 hover:scale-125"
                          onMouseEnter={() => setHoveredChartPoint(p)}
                          onMouseLeave={() => setHoveredChartPoint(null)}
                        />

                        {/* X-axis Sequence Label */}
                        <text
                          x={cx}
                          y={padding.top + plotHeight + 14}
                          textAnchor="middle"
                          className="fill-slate-400 text-[8.5px] font-mono"
                        >
                          #{idx + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Floating Tooltip inside Off-Spec Chart */}
              {hoveredChartPoint && (
                <div className="absolute top-2 right-4 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-neutral-100 text-xs p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 font-sans z-30 space-y-1.5 min-w-[210px] animate-in fade-in duration-100 pointer-events-none">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {hoveredChartPoint.instrumentName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                      {hoveredChartPoint.standardCode}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Tanggal:</span>
                      <span>{hoveredChartPoint.analyzedAt || hoveredChartPoint.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Unsur {hoveredChartPoint.element}:</span>
                      <span className="font-bold">{hoveredChartPoint.value.toFixed(3)} %</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Acuan CL:</span>
                      <span>{hoveredChartPoint.nominalValue.toFixed(3)} %</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Deviasi (Δ):</span>
                      <span className={hoveredChartPoint.diff >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                        {hoveredChartPoint.diff > 0 ? '+' : ''}{hoveredChartPoint.diff.toFixed(3)} %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Sigma Dist:</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {hoveredChartPoint.sigmaDist > 0 ? `+${hoveredChartPoint.sigmaDist.toFixed(2)}` : hoveredChartPoint.sigmaDist.toFixed(2)}σ
                      </span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Status:</span>
                    <span className={`px-2 py-0.5 rounded font-black ${
                      hoveredChartPoint.status === 'action'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {hoveredChartPoint.statusLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart Legend of Active Instruments */}
            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legenda Alat:</span>
              {availableInstruments.map(i => (
                <div key={`legend-${i.code}`} className="flex items-center gap-1.5 text-xs">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: getInstrumentColor(i.code) }} 
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-bold text-[11px]">{i.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 3: TABEL DETAIL REKAP DATA OFFSPEC TERISOLASI         */}
          {/* ------------------------------------------------------------- */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Daftar Rinci Data Terisolasi ({filteredPoints.length} Rekord)
                </h3>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3.5 py-3">#</th>
                      <th className="px-3.5 py-3">Waktu Analisa</th>
                      <th className="px-3.5 py-3">Mesin XRF</th>
                      <th className="px-3.5 py-3">Standar</th>
                      <th className="px-3.5 py-3">Unsur</th>
                      <th className="px-3.5 py-3 text-right">Hasil (%)</th>
                      <th className="px-3.5 py-3 text-right">Acuan CL (%)</th>
                      <th className="px-3.5 py-3 text-right">Deviasi (Δ)</th>
                      <th className="px-3.5 py-3 text-right">Sigma (Z)</th>
                      <th className="px-3.5 py-3 text-center">Status QC</th>
                      <th className="px-3.5 py-3">Catatan Anomali & PIC</th>
                      <th className="px-3.5 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {filteredPoints.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-slate-400 font-sans">
                          Tidak ada data yang cocok dengan kriteria filter saat ini.
                        </td>
                      </tr>
                    ) : (
                      filteredPoints.map((item, idx) => {
                        const isAction = item.status === 'action';

                        return (
                          <tr 
                            key={`tbl-iso-${item.id}-${idx}`}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-3.5 py-2.5 text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="px-3.5 py-2.5 font-sans font-medium text-slate-700 dark:text-slate-300">
                              {item.analyzedAt || item.date}
                            </td>
                            <td className="px-3.5 py-2.5 font-sans">
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: getInstrumentColor(item.instrumentCode) }} 
                                />
                                {item.instrumentName}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-sans font-bold text-slate-700 dark:text-slate-300">
                              {item.standardCode}
                            </td>
                            <td className="px-3.5 py-2.5 font-sans font-black text-teal-700 dark:text-teal-400">
                              {item.element}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-black text-slate-900 dark:text-white">
                              {item.value.toFixed(3)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right text-slate-500">
                              {item.nominalValue.toFixed(3)}
                            </td>
                            <td className={`px-3.5 py-2.5 text-right font-bold ${
                              item.diff >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                            }`}>
                              {item.diff > 0 ? '+' : ''}{item.diff.toFixed(3)}
                            </td>
                            <td className={`px-3.5 py-2.5 text-right font-black ${
                              isAction ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {item.sigmaDist > 0 ? `+${item.sigmaDist.toFixed(2)}` : item.sigmaDist.toFixed(2)}σ
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-sans">
                              {isAction ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-950/70 dark:text-rose-200 border border-[#FCA5A5] dark:border-rose-800">
                                  <AlertCircle className="w-3 h-3 text-[#DC2626]" />
                                  Need Re-cal (&gt;3σ)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/70 dark:text-amber-200 border border-[#FCD34D] dark:border-amber-800">
                                  <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                                  Warning (2σ-3σ)
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 font-sans text-[11px]">
                              {item.issue || item.solution || item.picName ? (
                                <div className="space-y-0.5 max-w-[240px]">
                                  {item.issue && (
                                    <div className="text-slate-800 dark:text-slate-200">
                                      <span className="font-bold text-rose-600 dark:text-rose-400">Issue:</span> {item.issue}
                                    </div>
                                  )}
                                  {item.solution && (
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Action:</span> {item.solution}
                                    </div>
                                  )}
                                  {item.picName && (
                                    <div className="text-slate-500 text-[10px] font-mono">
                                      <span className="font-semibold font-sans">PIC:</span> [{item.picNik || '-'}] {item.picName}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 italic text-[10.5px]">Tanpa Catatan</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-sans">
                              <button
                                onClick={() => {
                                  onRemovePoint(item.id);
                                  toast.success(`Titik #${item.index} dikembalikan ke chart utama.`);
                                }}
                                className="px-2 py-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10.5px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                                title="Kembalikan titik ini ke grafik kontrol utama"
                              >
                                <span>Kembalikan</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{filteredPoints.length}</span> dari <span className="font-bold text-slate-800 dark:text-slate-200">{isolatedPoints.length}</span> data terisolasi
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold transition-all shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
