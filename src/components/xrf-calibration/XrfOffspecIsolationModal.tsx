import React, { useState, useMemo } from 'react';
import { 
  Activity, AlertTriangle, AlertCircle, CheckCircle2, X, 
  Download, Trash2, Filter, Layers, Sliders, Eye, RefreshCw, 
  ChevronDown, Check, ShieldAlert, Sparkles, PlusCircle, ArrowUpDown,
  LayoutGrid, Columns, RotateCcw, Building2
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

// -------------------------------------------------------------------
// DEDICATED SHEWHART QC CARD FOR OFFSPEC POINTS PER INSTRUMENT
// -------------------------------------------------------------------
interface XrfOffspecCardProps {
  stdCode: string;
  instCode: string;
  instPoints: IsolatedOffspecPoint[];
  theme: { headerBg: string; dotColor: string; name: string };
  onSelectPoint: (p: IsolatedOffspecPoint) => void;
}

const XrfOffspecCard: React.FC<XrfOffspecCardProps> = ({
  stdCode,
  instCode,
  instPoints,
  theme,
  onSelectPoint,
}) => {
  const [hoveredPt, setHoveredPt] = useState<IsolatedOffspecPoint | null>(null);

  const nominal = instPoints[0]?.nominalValue || 0;
  const stdev = instPoints[0]?.stdevFixed || 0.05;
  const upperAction = Number((nominal + 3 * stdev).toFixed(4));
  const upperWarning = Number((nominal + 2 * stdev).toFixed(4));
  const lowerWarning = Number((nominal - 2 * stdev).toFixed(4));
  const lowerAction = Number((nominal - 3 * stdev).toFixed(4));

  const cardWidth = 420;
  const cardHeight = 240;
  const pad = { top: 20, right: 54, bottom: 30, left: 34 };
  const plotW = cardWidth - pad.left - pad.right;
  const plotH = cardHeight - pad.top - pad.bottom;

  let yMin = lowerAction - stdev * 0.6;
  let yMax = upperAction + stdev * 0.6;
  instPoints.forEach(p => {
    if (p.value < yMin) yMin = p.value - stdev * 0.3;
    if (p.value > yMax) yMax = p.value + stdev * 0.3;
  });
  const span = Math.max(0.001, yMax - yMin);

  const getY = (v: number) => {
    const ratio = (v - yMin) / span;
    return pad.top + plotH - ratio * plotH;
  };

  const yUpperAction = getY(upperAction);
  const yUpperWarning = getY(upperWarning);
  const yNominal = getY(nominal);
  const yLowerWarning = getY(lowerWarning);
  const yLowerAction = getY(lowerAction);

  const actionPts = instPoints.filter(p => p.status === 'action').length;
  const warnPts = instPoints.filter(p => p.status === 'warning').length;
  const maxDiff = Math.max(...instPoints.map(p => Math.abs(p.diff)));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Card Header with Instrument Theme */}
      <div className={`py-2 px-3.5 uppercase tracking-wider text-xs border-b-2 flex items-center justify-between shadow-2xs ${theme.headerBg}`}>
        <div className="flex items-center gap-1.5 font-black">
          <span className="w-2.5 h-2.5 rounded-full bg-white/80" />
          <span>{theme.name}</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-black/20 text-white font-black text-[10px]">
          {instPoints.length} Titik Off-Spec
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="relative p-2 flex-1">
        <svg viewBox={`0 0 ${cardWidth} ${cardHeight}`} className="w-full h-auto select-none overflow-visible">
          {/* Plot Background */}
          <rect
            x={pad.left}
            y={pad.top}
            width={plotW}
            height={plotH}
            fill="#FFFFFF"
            className="dark:fill-slate-950/60"
            stroke="#E2E8F0"
            strokeWidth="1"
            rx="4"
          />

          {/* 1. Upper Action (+3σ) */}
          <line x1={pad.left} y1={yUpperAction} x2={pad.left + plotW} y2={yUpperAction} stroke="#EF4444" strokeWidth="1.6" strokeDasharray="4 3" />
          <text x={pad.left - 6} y={yUpperAction + 4} textAnchor="end" className="fill-red-600 dark:fill-red-400 text-[10px] font-black font-sans">UL</text>
          <text x={pad.left + plotW + 5} y={yUpperAction + 3.5} className="fill-red-600 dark:fill-red-400 text-[9px] font-mono font-bold">{upperAction.toFixed(3)}</text>

          {/* 2. Upper Warning (+2σ) */}
          <line x1={pad.left} y1={yUpperWarning} x2={pad.left + plotW} y2={yUpperWarning} stroke="#F59E0B" strokeWidth="1.3" strokeDasharray="3 3" />
          <text x={pad.left - 6} y={yUpperWarning + 4} textAnchor="end" className="fill-amber-500 dark:fill-amber-400 text-[10px] font-black font-sans">WL</text>
          <text x={pad.left + plotW + 5} y={yUpperWarning + 3.5} className="fill-amber-600 dark:fill-amber-400 text-[9px] font-mono font-bold">{upperWarning.toFixed(3)}</text>

          {/* 3. Expected Value (Center Line) */}
          <line x1={pad.left} y1={yNominal} x2={pad.left + plotW} y2={yNominal} stroke="#10B981" strokeWidth="2" />
          <text x={pad.left - 6} y={yNominal + 4} textAnchor="end" className="fill-emerald-600 dark:fill-emerald-400 text-[10px] font-black font-sans">EV</text>
          <text x={pad.left + plotW + 5} y={yNominal + 3.5} className="fill-emerald-600 dark:fill-emerald-400 text-[9px] font-mono font-black">{nominal.toFixed(3)}</text>

          {/* 4. Lower Warning (-2σ) */}
          <line x1={pad.left} y1={yLowerWarning} x2={pad.left + plotW} y2={yLowerWarning} stroke="#F59E0B" strokeWidth="1.3" strokeDasharray="3 3" />
          <text x={pad.left - 6} y={yLowerWarning + 4} textAnchor="end" className="fill-amber-500 dark:fill-amber-400 text-[10px] font-black font-sans">WL</text>
          <text x={pad.left + plotW + 5} y={yLowerWarning + 3.5} className="fill-amber-600 dark:fill-amber-400 text-[9px] font-mono font-bold">{lowerWarning.toFixed(3)}</text>

          {/* 5. Lower Action (-3σ) */}
          <line x1={pad.left} y1={yLowerAction} x2={pad.left + plotW} y2={yLowerAction} stroke="#EF4444" strokeWidth="1.6" strokeDasharray="4 3" />
          <text x={pad.left - 6} y={yLowerAction + 4} textAnchor="end" className="fill-red-600 dark:fill-red-400 text-[10px] font-black font-sans">LL</text>
          <text x={pad.left + plotW + 5} y={yLowerAction + 3.5} className="fill-red-600 dark:fill-red-400 text-[9px] font-mono font-bold">{lowerAction.toFixed(3)}</text>

          {/* Points */}
          {instPoints.map((p, pIdx) => {
            const cx = pad.left + ((pIdx + 0.5) / Math.max(1, instPoints.length)) * plotW;
            const cy = getY(p.value);
            const isAction = p.status === 'action';
            const hasNote = Boolean(p.issue || p.solution || p.picNik);
            const isHov = hoveredPt?.id === p.id;

            return (
              <g 
                key={`off-card-pt-${p.id}-${pIdx}`}
                className="cursor-pointer"
                onClick={() => onSelectPoint(p)}
                onMouseEnter={() => setHoveredPt(p)}
                onMouseLeave={() => setHoveredPt(null)}
              >
                {/* Connecting drop line to nominal */}
                <line
                  x1={cx}
                  y1={yNominal}
                  x2={cx}
                  y2={cy}
                  stroke={isAction ? '#EF4444' : '#F59E0B'}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.35"
                />

                {/* Action Pulse Ring */}
                {isAction && (
                  <circle cx={cx} cy={cy} r={isHov ? 9 : 7} fill="#EF4444" fillOpacity="0.25" className="animate-pulse" />
                )}

                {/* Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHov ? 6 : 4.5}
                  fill={isAction ? '#EF4444' : '#F59E0B'}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  className="transition-transform duration-100 hover:scale-125"
                />

                {/* Anomaly Note Pin Marker */}
                {hasNote && (
                  <g transform={`translate(${cx + 4}, ${cy - 8})`}>
                    <circle r="4" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1" />
                    <text x="0" y="2.5" textAnchor="middle" className="fill-white text-[6.5px] font-black">N</text>
                  </g>
                )}

                {/* Label index */}
                <text
                  x={cx}
                  y={pad.top + plotH + 12}
                  textAnchor="middle"
                  className="fill-slate-400 text-[8.5px] font-mono"
                >
                  #{p.index}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover mini-preview */}
        {hoveredPt && (
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/95 text-white p-2 rounded-xl text-[10.5px] font-mono flex items-center justify-between border border-slate-700 shadow-lg pointer-events-none z-20">
            <div>
              <span className="font-bold text-amber-300">Run #{hoveredPt.index}:</span> {hoveredPt.value.toFixed(3)}% (Δ {hoveredPt.diff > 0 ? '+' : ''}{hoveredPt.diff.toFixed(3)})
            </div>
            <div className={`px-1.5 py-0.2 rounded text-[9px] font-black ${hoveredPt.status === 'action' ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'}`}>
              {hoveredPt.sigmaDist > 0 ? '+' : ''}{hoveredPt.sigmaDist.toFixed(2)}σ
            </div>
          </div>
        )}
      </div>

      {/* Card Footer Mini Stats */}
      <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10.5px]">
        <div className="flex items-center gap-2">
          {actionPts > 0 && (
            <span className="font-bold text-red-600 dark:text-red-400">
              {actionPts} Kritis (&gt;3σ)
            </span>
          )}
          {warnPts > 0 && (
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {warnPts} Warn (2-3σ)
            </span>
          )}
        </div>
        <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
          Maks |Δ|: <span className="font-bold text-slate-900 dark:text-white">{maxDiff.toFixed(3)}%</span>
        </div>
      </div>
    </div>
  );
};

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

  // Chart Display & Standard separation states (On-Spec layout style)
  const [offspecDisplayMode, setOffspecDisplayMode] = useState<'standards' | 'overview'>('standards');
  const [selectedStdTab, setSelectedStdTab] = useState<string>('ALL');
  const [stdViewMode, setStdViewMode] = useState<'grid' | 'side-by-side'>('grid');
  const [selectedOffspecPoint, setSelectedOffspecPoint] = useState<IsolatedOffspecPoint | null>(null);

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

  // Group filtered points by standard (for separate standards charts)
  const standardsWithOffspec = useMemo(() => {
    const map = new Map<string, {
      stdCode: string;
      points: IsolatedOffspecPoint[];
      instrumentsMap: Record<string, IsolatedOffspecPoint[]>;
      actionCount: number;
      warningCount: number;
    }>();

    filteredPoints.forEach(p => {
      if (!map.has(p.standardCode)) {
        map.set(p.standardCode, {
          stdCode: p.standardCode,
          points: [],
          instrumentsMap: {},
          actionCount: 0,
          warningCount: 0,
        });
      }
      const entry = map.get(p.standardCode)!;
      entry.points.push(p);
      if (!entry.instrumentsMap[p.instrumentCode]) {
        entry.instrumentsMap[p.instrumentCode] = [];
      }
      entry.instrumentsMap[p.instrumentCode].push(p);
      if (p.status === 'action') entry.actionCount++;
      else entry.warningCount++;
    });

    return Array.from(map.values());
  }, [filteredPoints]);

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
          {/* SECTION 2: CHART TERPISAH ISOLASI DATA OFFSPEC (PER STANDAR)  */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
            
            {/* Toolbar Filters for Chart */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 mr-1">
                  <Activity className="w-4 h-4 text-rose-500" />
                  Grafik Off-Spec Terisolasi
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

              {/* View & Layout Mode Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mode: Standards vs Global Overview */}
                <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-bold">
                  <button
                    onClick={() => setOffspecDisplayMode('standards')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      offspecDisplayMode === 'standards'
                        ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                    title="Chart dipisah per CRM Standard (Sama seperti Chart On-Spec)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Per Standar (On-Spec Style)</span>
                  </button>
                  <button
                    onClick={() => setOffspecDisplayMode('overview')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      offspecDisplayMode === 'overview'
                        ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                    title="Ringkasan Sebaran Multivariat dalam 1 Grafik Z-Score"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Ringkasan Z-Score</span>
                  </button>
                </div>

                {/* Layout Mode (Grid vs Side-by-side) when in standards view */}
                {offspecDisplayMode === 'standards' && (
                  <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-bold">
                    <button
                      onClick={() => setStdViewMode('grid')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        stdViewMode === 'grid'
                          ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title="Tampilan Grid Responsif"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Grid</span>
                    </button>
                    <button
                      onClick={() => setStdViewMode('side-by-side')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        stdViewMode === 'side-by-side'
                          ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title="Tampilan Strip Berdampingan"
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>Strip</span>
                    </button>
                  </div>
                )}

                {/* Sigma / Raw Toggle when in overview mode */}
                {offspecDisplayMode === 'overview' && (
                  <div className="flex items-center gap-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 p-0.5 text-xs font-bold">
                    <button
                      onClick={() => setChartMode('sigma')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        chartMode === 'sigma'
                          ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
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
                    >
                      Nilai Asli (%)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CONTENT RENDER: STANDARDS-SEPARATED CHARTS (DEFAULT) VS OVERVIEW */}
            {offspecDisplayMode === 'standards' ? (
              <div className="space-y-6">
                {/* Standards Quick Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedStdTab('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      selectedStdTab === 'ALL'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>Semua Standar</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black">
                      {filteredPoints.length}
                    </span>
                  </button>

                  {standardsWithOffspec.map(std => (
                    <button
                      key={`std-tab-${std.stdCode}`}
                      onClick={() => setSelectedStdTab(std.stdCode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        selectedStdTab === std.stdCode
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{std.stdCode}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-300 font-black">
                        {std.points.length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Standards Render Loop */}
                {standardsWithOffspec.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Activity className="w-8 h-8 mb-2 opacity-40 text-rose-500" />
                    <p className="text-xs font-bold">Tidak ada data off-spec untuk kriteria filter yang dipilih.</p>
                  </div>
                ) : (
                  standardsWithOffspec
                    .filter(std => selectedStdTab === 'ALL' || std.stdCode === selectedStdTab)
                    .map(std => {
                      return (
                        <div
                          key={`offspec-std-row-${std.stdCode}`}
                          className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4"
                        >
                          {/* Standard CRM Section Banner (PINNED HEADER - ON-SPEC STYLE) */}
                          <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 py-2.5 rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2">
                              <span className="px-3.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white dark:bg-white dark:text-slate-900 tracking-wider">
                                STANDAR: {std.stdCode}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                {std.points.length} Titik Off-Spec Terisolasi
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-mono">
                              {std.actionCount > 0 && (
                                <span className="font-black text-rose-600 dark:text-rose-400">
                                  {std.actionCount} Kritis (&gt;3σ)
                                </span>
                              )}
                              {std.warningCount > 0 && (
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {std.warningCount} Warning (2-3σ)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Cards per Instrument for this Standard */}
                          {stdViewMode === 'side-by-side' ? (
                            <div className="overflow-x-auto pb-3 pt-1 scrollbar-thin">
                              <div className="flex flex-nowrap gap-4 min-w-max">
                                {Object.entries(std.instrumentsMap).map(([instCode, pts]) => {
                                  const theme = instrumentThemes[instCode] || {
                                    headerBg: 'bg-cyan-500 text-slate-950 font-black',
                                    dotColor: getInstrumentColor(instCode),
                                    name: pts[0]?.instrumentName || instCode,
                                  };
                                  return (
                                    <div key={`card-${std.stdCode}-${instCode}`} className="w-[380px] md:w-[420px] flex-shrink-0">
                                      <XrfOffspecCard
                                        stdCode={std.stdCode}
                                        instCode={instCode}
                                        instPoints={pts}
                                        theme={theme}
                                        onSelectPoint={(p) => setSelectedOffspecPoint(p)}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(std.instrumentsMap).map(([instCode, pts]) => {
                                const theme = instrumentThemes[instCode] || {
                                  headerBg: 'bg-cyan-500 text-slate-950 font-black',
                                  dotColor: getInstrumentColor(instCode),
                                  name: pts[0]?.instrumentName || instCode,
                                };
                                return (
                                  <XrfOffspecCard
                                    key={`card-${std.stdCode}-${instCode}`}
                                    stdCode={std.stdCode}
                                    instCode={instCode}
                                    instPoints={pts}
                                    theme={theme}
                                    onSelectPoint={(p) => setSelectedOffspecPoint(p)}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            ) : (
              /* OVERVIEW SINGLE SVG CANVAS (EXISTING) */
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

                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 6 : 4.5}
                            fill={pointColor}
                            stroke="#FFFFFF"
                            strokeWidth="1.8"
                            className="cursor-pointer transition-transform duration-100 hover:scale-125"
                            onClick={() => setSelectedOffspecPoint(p)}
                            onMouseEnter={() => setHoveredChartPoint(p)}
                            onMouseLeave={() => setHoveredChartPoint(null)}
                          />

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

                {/* Floating Tooltip inside Off-Spec Overview Chart */}
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
            )}
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

        {/* DETAIL & ACTION DIALOG FOR SELECTED OFFSPEC POINT */}
        {selectedOffspecPoint && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setSelectedOffspecPoint(null)}
          >
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    selectedOffspecPoint.status === 'action'
                      ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}>
                    {selectedOffspecPoint.status === 'action' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Detail Titik #{selectedOffspecPoint.index} Terisolasi
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {selectedOffspecPoint.instrumentName} • {selectedOffspecPoint.standardCode}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOffspecPoint(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Waktu Analisa:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedOffspecPoint.analyzedAt || selectedOffspecPoint.date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Unsur:</span>
                  <span className="font-black text-teal-600 dark:text-teal-400">
                    {selectedOffspecPoint.element}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Hasil Analisa:</span>
                  <span className="font-black text-base text-slate-900 dark:text-white">
                    {selectedOffspecPoint.value.toFixed(3)} %
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Acuan Expected Value (EV):</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {selectedOffspecPoint.nominalValue.toFixed(3)} %
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Deviasi (Δ):</span>
                  <span className={`font-bold ${
                    selectedOffspecPoint.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {selectedOffspecPoint.diff > 0 ? '+' : ''}{selectedOffspecPoint.diff.toFixed(3)} %
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Jarak Sigma:</span>
                  <span className="font-black text-rose-600 dark:text-rose-400">
                    {selectedOffspecPoint.sigmaDist > 0 ? `+${selectedOffspecPoint.sigmaDist.toFixed(2)}` : selectedOffspecPoint.sigmaDist.toFixed(2)}σ
                  </span>
                </div>
              </div>

              {/* Note / Action Section */}
              {(selectedOffspecPoint.issue || selectedOffspecPoint.solution || selectedOffspecPoint.picName) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <span>Catatan Anomali & Tindakan</span>
                  </div>
                  {selectedOffspecPoint.issue && (
                    <div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">Issue: </span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedOffspecPoint.issue}</span>
                    </div>
                  )}
                  {selectedOffspecPoint.solution && (
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Action: </span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedOffspecPoint.solution}</span>
                    </div>
                  )}
                  {selectedOffspecPoint.picName && (
                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold">PIC: </span>
                      <span>[{selectedOffspecPoint.picNik || '-'}] {selectedOffspecPoint.picName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedOffspecPoint(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    onRemovePoint(selectedOffspecPoint.id);
                    toast.success(`Titik #${selectedOffspecPoint.index} dikembalikan ke grafik kontrol utama.`);
                    setSelectedOffspecPoint(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembalikan ke Chart Utama</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
