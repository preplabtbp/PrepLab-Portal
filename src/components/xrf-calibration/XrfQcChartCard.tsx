import React, { useState, useRef, useEffect } from 'react';
import { 
  AlertTriangle, AlertCircle, CheckCircle2, ChevronDown, 
  Layers, Sliders, Activity, Info 
} from 'lucide-react';

export interface XrfChartLimitData {
  nominalValue: number;
  stdevFixed: number;
  upperAction: number;
  upperWarning: number;
  lowerWarning: number;
  lowerAction: number;
}

export interface XrfChartStatData {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  actualStdev: number;
}

export interface XrfPointData {
  index: number;
  id?: number;
  date: string;
  week?: number;
  analyzedAt?: string;
  value: number;
  status?: string;
}

// 9 Unsur Utama sesuai Gambar 1
export const QC_ELEMENTS_LIST = [
  'Ni',
  'Co',
  'Fe',
  'CaO',
  'SiO2',
  'Al2O3',
  'MgO',
  'Cr2O3',
  'MnO'
];

interface XrfQcChartCardProps {
  standardCode: string;
  instrumentName: string;
  instrumentCode: string;
  headerColorClass?: string;
  currentElement?: string;
  onSelectElement?: (el: string) => void;
  limits: XrfChartLimitData;
  statistics: XrfChartStatData;
  points: XrfPointData[];
  showStats?: boolean;
  compactStats?: boolean;
}

export const XrfQcChartCard: React.FC<XrfQcChartCardProps> = ({
  standardCode,
  instrumentName,
  instrumentCode,
  headerColorClass = 'bg-cyan-500 text-slate-950',
  currentElement = 'Ni',
  onSelectElement,
  limits,
  statistics,
  points,
  showStats = true,
  compactStats = false,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<XrfPointData | null>(null);
  const [showElementDropdown, setShowElementDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowElementDropdown(false);
      }
    };
    if (showElementDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showElementDropdown]);

  // SVG Chart Dimensions
  const svgWidth = 540;
  const svgHeight = 290;
  const padding = { top: 28, right: 62, bottom: 38, left: 56 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Determine Y-scale range (incorporate limits and actual data)
  const validPoints = points.filter(p => typeof p.value === 'number' && !isNaN(p.value));
  const rawValues = validPoints.map(p => p.value);
  
  const allValues = [
    limits.upperAction,
    limits.lowerAction,
    limits.nominalValue,
    ...(rawValues.length > 0 ? rawValues : [limits.nominalValue])
  ];

  const yMinData = Math.min(...allValues);
  const yMaxData = Math.max(...allValues);
  const marginY = (yMaxData - yMinData) * 0.15 || 0.05;
  const yDomainMin = Number((yMinData - marginY).toFixed(3));
  const yDomainMax = Number((yMaxData + marginY).toFixed(3));
  const yRange = yDomainMax - yDomainMin || 1;

  const getYCoord = (val: number) => {
    const clamped = Math.max(yDomainMin, Math.min(yDomainMax, val));
    const ratio = (clamped - yDomainMin) / yRange;
    return padding.top + plotHeight - ratio * plotHeight;
  };

  const numPoints = Math.max(validPoints.length, 10);
  const getXCoord = (index: number) => {
    if (numPoints <= 1) return padding.left + plotWidth / 2;
    return padding.left + ((index - 1) / (numPoints - 1)) * plotWidth;
  };

  // Generate 5 Y-axis ticks
  const yTicks = [
    yDomainMin,
    yDomainMin + yRange * 0.25,
    yDomainMin + yRange * 0.5,
    yDomainMin + yRange * 0.75,
    yDomainMax,
  ].map(v => Number(v.toFixed(3)));

  // Generate 4-5 X-axis label indices
  const stepX = Math.max(1, Math.floor(numPoints / 5));
  const xIndices: number[] = [];
  for (let i = 1; i <= numPoints; i += stepX) {
    xIndices.push(i);
  }
  if (!xIndices.includes(numPoints)) xIndices.push(numPoints);

  // Line Path for Data Points
  const pathD = validPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getXCoord(p.index).toFixed(1)} ${getYCoord(p.value).toFixed(1)}`)
    .join(' ');

  // Limits Y positions
  const yUpperAction = getYCoord(limits.upperAction);
  const yUpperWarning = getYCoord(limits.upperWarning);
  const yNominal = getYCoord(limits.nominalValue);
  const yLowerWarning = getYCoord(limits.lowerWarning);
  const yLowerAction = getYCoord(limits.lowerAction);

  // Calculate Out-of-control (Fail) and Warning count
  const actionCount = validPoints.filter(p => {
    const sigmaDist = limits.stdevFixed > 0 ? Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) : 0;
    return sigmaDist > 3.0;
  }).length;

  const warningCount = validPoints.filter(p => {
    const sigmaDist = limits.stdevFixed > 0 ? Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) : 0;
    return sigmaDist > 2.0 && sigmaDist <= 3.0;
  }).length;

  // Focus on the LATEST (last) point for control status (in-control vs need re-calibration)
  const lastPoint = validPoints.length > 0 ? validPoints[validPoints.length - 1] : null;
  const lastPointSigma = lastPoint && limits.stdevFixed > 0 
    ? Math.abs((lastPoint.value - limits.nominalValue) / limits.stdevFixed) 
    : 0;
  const isLatestNeedRecalibration = lastPoint && lastPointSigma > 3.0;
  const isLatestWarning = lastPoint && lastPointSigma > 2.0 && lastPointSigma <= 3.0;

  // Percentage recovery / bias
  const recoveryPct = limits.nominalValue > 0 
    ? ((statistics.mean / limits.nominalValue) * 100).toFixed(1) 
    : '100.0';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col font-sans transition-all hover:border-slate-300 dark:hover:border-slate-700">
      {/* ------------------------------------------------------------- */}
      {/* 1. ENTERPRISE HEADER BAR WITH ELEMENT DROPDOWN                */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-2 flex-wrap">
        {/* Left: Sample Count Indicator (Instrument name hidden since pinned header already represents it) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold px-2 py-0.8 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            N = {validPoints.length} Data
          </span>
        </div>

        {/* Center / Right: ELEMENT DROPDOWN & LATEST CONTROL STATUS */}
        <div className="flex items-center gap-2">
          {/* Green Element Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowElementDropdown(!showElementDropdown)}
              className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#16a34a] hover:bg-[#15803d] text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ring-1 ring-emerald-600/50"
              title="Pilih Unsur Analisis (Semua grafik akan mengikuti unsur terpilih)"
            >
              <span className="text-[10px] uppercase opacity-90 font-medium">Unsur:</span>
              <span className="text-sm font-black tracking-wide">{currentElement}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showElementDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Modal in Green Theme */}
            {showElementDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-28 bg-[#16a34a] border-2 border-emerald-700 rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-100/90 border-b border-emerald-600 mb-1">
                  Pilih Unsur
                </div>
                {QC_ELEMENTS_LIST.map((el) => {
                  const isSelected = currentElement === el;
                  return (
                    <button
                      key={`drop-el-${el}`}
                      onClick={() => {
                        if (onSelectElement) onSelectElement(el);
                        setShowElementDropdown(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#0284c7] text-white shadow-xs font-black'
                          : 'text-white hover:bg-emerald-700'
                      }`}
                    >
                      <span>{el}</span>
                      {isSelected && <span className="text-[10px] opacity-80">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Latest Data Point Status: In-Control vs Need Re-calibration (Notion Palette) */}
          {validPoints.length === 0 ? (
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
              No Data
            </span>
          ) : isLatestNeedRecalibration ? (
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-950/70 dark:text-rose-200 border border-[#FCA5A5] dark:border-rose-800 flex items-center gap-1 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
              Need Re-calibration
            </span>
          ) : isLatestWarning ? (
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/70 dark:text-amber-200 border border-[#FCD34D] dark:border-amber-800 flex items-center gap-1 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              Warning (2σ - 3σ)
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#DCFCE7] text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-200 border border-[#86EFAC] dark:border-emerald-800 flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              In-Control
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. ENTERPRISE SHEWHART QC CONTROL CHART CANVAS               */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 relative bg-slate-50/40 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none overflow-visible"
        >
          {/* Plot Background Card */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="#FFFFFF"
            className="dark:fill-slate-900/90"
            stroke="#CBD5E1"
            strokeWidth="1.2"
            rx="4"
          />

          {/* In-Control Green/Cyan Safe Band between -2σ and +2σ */}
          {yUpperWarning < yLowerWarning && (
            <rect
              x={padding.left}
              y={yUpperWarning}
              width={plotWidth}
              height={Math.max(0, yLowerWarning - yUpperWarning)}
              fill="#10B981"
              fillOpacity="0.04"
              className="dark:fill-teal-400 dark:fill-opacity-[0.05]"
            />
          )}

          {/* Gridlines & Y-Axis Scale Values */}
          {yTicks.map((tickVal, i) => {
            const yPos = getYCoord(tickVal);
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={padding.left + plotWidth}
                  y2={yPos}
                  stroke="#E2E8F0"
                  className="dark:stroke-slate-800"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                >
                  {tickVal.toFixed(3)}
                </text>
              </g>
            );
          })}

          {/* X-Axis Ticks & Run Indices */}
          {xIndices.map((idx) => {
            const xPos = getXCoord(idx);
            return (
              <g key={`xtick-${idx}`}>
                <line
                  x1={xPos}
                  y1={padding.top + plotHeight}
                  x2={xPos}
                  y2={padding.top + plotHeight + 5}
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <text
                  x={xPos}
                  y={padding.top + plotHeight + 16}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-[9.5px] font-mono font-medium"
                >
                  {idx}
                </text>
              </g>
            );
          })}

          {/* ------------------------------------------------------- */}
          {/* 5 SHEWHART LIMIT LINES & BADGES                         */}
          {/* ------------------------------------------------------- */}
          
          {/* 1. Upper Action (+3σ) - Red Dashed */}
          <line
            x1={padding.left}
            y1={yUpperAction}
            x2={padding.left + plotWidth}
            y2={yUpperAction}
            stroke="#EF4444"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={yUpperAction + 3.5}
            className="fill-red-600 dark:fill-red-400 text-[9px] font-mono font-bold"
          >
            +3σ {limits.upperAction.toFixed(3)}
          </text>

          {/* 2. Upper Warning (+2σ) - Amber Dashed */}
          <line
            x1={padding.left}
            y1={yUpperWarning}
            x2={padding.left + plotWidth}
            y2={yUpperWarning}
            stroke="#F59E0B"
            strokeWidth="1.4"
            strokeDasharray="3 3"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={yUpperWarning + 3.5}
            className="fill-amber-600 dark:fill-amber-400 text-[9px] font-mono"
          >
            +2σ {limits.upperWarning.toFixed(3)}
          </text>

          {/* 3. Center Line (Nominal Expected Value) - Emerald Solid */}
          <line
            x1={padding.left}
            y1={yNominal}
            x2={padding.left + plotWidth}
            y2={yNominal}
            stroke="#10B981"
            strokeWidth="2.2"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={yNominal + 3.5}
            className="fill-emerald-600 dark:fill-emerald-400 text-[9px] font-mono font-black"
          >
            CL {limits.nominalValue.toFixed(3)}
          </text>

          {/* 4. Lower Warning (-2σ) - Amber Dashed */}
          <line
            x1={padding.left}
            y1={yLowerWarning}
            x2={padding.left + plotWidth}
            y2={yLowerWarning}
            stroke="#F59E0B"
            strokeWidth="1.4"
            strokeDasharray="3 3"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={yLowerWarning + 3.5}
            className="fill-amber-600 dark:fill-amber-400 text-[9px] font-mono"
          >
            -2σ {limits.lowerWarning.toFixed(3)}
          </text>

          {/* 5. Lower Action (-3σ) - Red Dashed */}
          <line
            x1={padding.left}
            y1={yLowerAction}
            x2={padding.left + plotWidth}
            y2={yLowerAction}
            stroke="#EF4444"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={yLowerAction + 3.5}
            className="fill-red-600 dark:fill-red-400 text-[9px] font-mono font-bold"
          >
            -3σ {limits.lowerAction.toFixed(3)}
          </text>

          {/* ------------------------------------------------------- */}
          {/* DATA CONNECTING LINE & POINTS                           */}
          {/* ------------------------------------------------------- */}
          {validPoints.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="#0F172A"
              className="dark:stroke-slate-200"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Interactive Data Points with Sigma Severity Highlighting */}
          {validPoints.map((p) => {
            const cx = getXCoord(p.index);
            const cy = getYCoord(p.value);
            const isHovered = hoveredPoint?.id === p.id || hoveredPoint?.index === p.index;

            const sigmaDist = limits.stdevFixed > 0 ? Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) : 0;
            const isAction = sigmaDist > 3.0;
            const isWarning = sigmaDist > 2.0 && sigmaDist <= 3.0;

            const pointColor = isAction ? '#EF4444' : isWarning ? '#F59E0B' : '#0F172A';
            const radius = isHovered ? 4.8 : 3.2;

            return (
              <g key={`point-g-${p.index}-${p.id || ''}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={isHovered ? '#3B82F6' : pointColor}
                  stroke="#FFFFFF"
                  strokeWidth={isHovered ? 2 : 1.2}
                  className={`cursor-pointer transition-transform duration-100 ${!isAction && !isWarning ? 'dark:fill-slate-100' : ''}`}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* ------------------------------------------------------- */}
        {/* NOTION-STYLE FLOATING POPUP / TOOLTIP (GAMBAR 1 & 2)    */}
        {/* ------------------------------------------------------- */}
        {hoveredPoint && (() => {
          const pointSigma = limits.stdevFixed > 0 
            ? ((hoveredPoint.value - limits.nominalValue) / limits.stdevFixed) 
            : 0;
          const absSigma = Math.abs(pointSigma);
          const isPointAction = absSigma > 3.0;
          const isPointWarning = absSigma > 2.0 && absSigma <= 3.0;
          const diff = hoveredPoint.value - limits.nominalValue;
          const sampleDate = hoveredPoint.analyzedAt || hoveredPoint.date || `Pengambilan #${hoveredPoint.index}`;

          return (
            <div className="absolute top-4 right-14 bg-white/95 dark:bg-[#222222]/95 text-slate-800 dark:text-neutral-100 text-xs p-3.5 rounded-xl shadow-xl pointer-events-none backdrop-blur-md border border-slate-200 dark:border-neutral-700 font-sans z-30 space-y-2 animate-in fade-in zoom-in-95 duration-100 min-w-[220px]">
              {/* Header: Date & Time as primary title (replaces Run #200) */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-700 pb-2">
                <span className="text-[12px] font-bold text-slate-800 dark:text-neutral-100">
                  {sampleDate}
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                  Run #{hoveredPoint.index}
                </span>
              </div>

              {/* Body: Notion-style high contrast key-values */}
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400 font-sans">Hasil {currentElement}:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{hoveredPoint.value.toFixed(3)} %</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400 font-sans">Acuan (CL):</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{limits.nominalValue.toFixed(3)} %</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400 font-sans">Deviasi (Δ):</span>
                  <span className={`font-semibold ${diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400 font-sans">Sigma Dist (Z):</span>
                  <span className="font-semibold text-sky-700 dark:text-sky-400">
                    {limits.stdevFixed > 0 ? (pointSigma.toFixed(2) + 'σ') : '-'}
                  </span>
                </div>
              </div>

              {/* Status Pill in Notion Pastel Colorway (Gambar 2) */}
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-700 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-wider">Status QC:</span>
                {isPointAction ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-950/70 dark:text-rose-200 border border-[#FCA5A5] dark:border-rose-800">
                    Need Re-calibration (&gt;3σ)
                  </span>
                ) : isPointWarning ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/70 dark:text-amber-200 border border-[#FCD34D] dark:border-amber-800">
                    WARNING (2σ - 3σ)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#DCFCE7] text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-200 border border-[#86EFAC] dark:border-emerald-800">
                    IN-CONTROL (≤2σ)
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. ENTERPRISE STATISTICAL SUMMARY KPI ROW                     */}
      {/* ------------------------------------------------------------- */}
      {showStats && (
        <div className={`p-3 text-xs bg-white dark:bg-slate-900 ${
          compactStats 
            ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]' 
            : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2'
        }`}>
          {/* KPI 1: Target Nominal */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Target (CL)</div>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {limits.nominalValue.toFixed(3)}
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">σ Acuan = {limits.stdevFixed.toFixed(3)}</div>
          </div>

          {/* KPI 2: Mean Rata-rata */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mean (x̄)</div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {statistics.mean.toFixed(3)}
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">Median = {statistics.median.toFixed(3)}</div>
          </div>

          {/* KPI 3: Actual Stdev */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actual Std (s)</div>
            <div className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
              {statistics.actualStdev.toFixed(3)}
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
              {statistics.actualStdev <= limits.stdevFixed ? "Presisi Optimal" : "Deviasi Tinggi"}
            </div>
          </div>

          {/* KPI 4: Min - Max */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rentang (Min-Max)</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-1">
              {statistics.min.toFixed(2)} - {statistics.max.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">Range = {(statistics.max - statistics.min).toFixed(2)}</div>
          </div>

          {/* KPI 5: Recovery / Bias */}
          {!compactStats && (
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovery %</div>
              <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {recoveryPct} %
              </div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">Bias: {(statistics.mean - limits.nominalValue).toFixed(3)}</div>
            </div>
          )}

          {/* KPI 6: Total Points & Capability */}
          {!compactStats && (
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Sampel</div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                {validPoints.length} Data
              </div>
              <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {validPoints.length > 0 ? `${(((validPoints.length - actionCount) / validPoints.length) * 100).toFixed(0)}% In-Control` : '-'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
