import React, { useState } from 'react';

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

interface XrfQcChartCardProps {
  standardCode: string;
  instrumentName: string;
  instrumentCode: string;
  headerColorClass?: string; // e.g. 'bg-cyan-400 text-black' or 'bg-yellow-300 text-black'
  limits: XrfChartLimitData;
  statistics: XrfChartStatData;
  points: XrfPointData[];
}

export const XrfQcChartCard: React.FC<XrfQcChartCardProps> = ({
  standardCode,
  instrumentName,
  instrumentCode,
  headerColorClass = 'bg-cyan-500 text-white',
  limits,
  statistics,
  points,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<XrfPointData | null>(null);

  // SVG Chart Dimensions
  const svgWidth = 520;
  const svgHeight = 280;
  const padding = { top: 30, right: 25, bottom: 40, left: 55 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Determine Y-scale range (incorporate limits and actual data)
  const allValues = [
    limits.upperAction,
    limits.lowerAction,
    ...points.map(p => p.value).filter(v => typeof v === 'number' && !isNaN(v)),
  ];

  const yMinData = Math.min(...allValues);
  const yMaxData = Math.max(...allValues);
  const marginY = (yMaxData - yMinData) * 0.12 || 0.1;
  const yDomainMin = Number((yMinData - marginY).toFixed(3));
  const yDomainMax = Number((yMaxData + marginY).toFixed(3));
  const yRange = yDomainMax - yDomainMin || 1;

  const getYCoord = (val: number) => {
    const clamped = Math.max(yDomainMin, Math.min(yDomainMax, val));
    const ratio = (clamped - yDomainMin) / yRange;
    return padding.top + plotHeight - ratio * plotHeight;
  };

  const numPoints = Math.max(points.length, 10);
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
  const xIndices = [];
  for (let i = 1; i <= numPoints; i += stepX) {
    xIndices.push(i);
  }
  if (!xIndices.includes(numPoints)) xIndices.push(numPoints);

  // Points path string
  const validPoints = points.filter(p => typeof p.value === 'number' && !isNaN(p.value));
  const pathD = validPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getXCoord(p.index).toFixed(1)} ${getYCoord(p.value).toFixed(1)}`)
    .join(' ');

  // Limits Y positions
  const yUpperAction = getYCoord(limits.upperAction);
  const yUpperWarning = getYCoord(limits.upperWarning);
  const yNominal = getYCoord(limits.nominalValue);
  const yLowerWarning = getYCoord(limits.lowerWarning);
  const yLowerAction = getYCoord(limits.lowerAction);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col font-sans transition-all">
      {/* Header Bar */}
      <div className={`py-1.5 px-4 text-center font-bold text-sm tracking-wide flex items-center justify-between ${headerColorClass}`}>
        <span className="text-xs uppercase opacity-80">{instrumentName}</span>
        <span className="text-base font-extrabold uppercase tracking-wider">{standardCode}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
          N = {points.length}
        </span>
      </div>

      {/* SVG Canvas Shewhart Chart */}
      <div className="p-3 relative bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none overflow-visible"
        >
          {/* Plot background with grid */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="#FFFFFF"
            className="dark:fill-slate-900"
            stroke="#94A3B8"
            strokeWidth="1.5"
          />

          {/* Gridlines & Y-Axis Labels */}
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
                  strokeDasharray="2 2"
                />
                <text
                  x={padding.left - 6}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="fill-slate-600 dark:fill-slate-400 text-[10px] font-mono"
                >
                  {tickVal.toFixed(3)}
                </text>
              </g>
            );
          })}

          {/* X-Axis Ticks & Labels */}
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
                  className="fill-slate-600 dark:fill-slate-400 text-[9px] font-mono"
                >
                  {idx}
                </text>
              </g>
            );
          })}

          {/* 5 Shewhart Limit Lines */}
          {/* 1. Upper Action (+3σ) - RED */}
          <line
            x1={padding.left}
            y1={yUpperAction}
            x2={padding.left + plotWidth}
            y2={yUpperAction}
            stroke="#EF4444"
            strokeWidth="1.8"
          />

          {/* 2. Upper Warning (+2σ) - ORANGE */}
          <line
            x1={padding.left}
            y1={yUpperWarning}
            x2={padding.left + plotWidth}
            y2={yUpperWarning}
            stroke="#F59E0B"
            strokeWidth="1.5"
          />

          {/* 3. Center Line (Nominal Expected Value) - GREEN */}
          <line
            x1={padding.left}
            y1={yNominal}
            x2={padding.left + plotWidth}
            y2={yNominal}
            stroke="#10B981"
            strokeWidth="1.8"
          />

          {/* 4. Lower Warning (-2σ) - ORANGE */}
          <line
            x1={padding.left}
            y1={yLowerWarning}
            x2={padding.left + plotWidth}
            y2={yLowerWarning}
            stroke="#F59E0B"
            strokeWidth="1.5"
          />

          {/* 5. Lower Action (-3σ) - RED */}
          <line
            x1={padding.left}
            y1={yLowerAction}
            x2={padding.left + plotWidth}
            y2={yLowerAction}
            stroke="#EF4444"
            strokeWidth="1.8"
          />

          {/* Actual Data Polyline (Black connection line) */}
          {validPoints.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="#0F172A"
              className="dark:stroke-slate-200"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )}

          {/* Actual Data Square Points (Black square dots as in Excel) */}
          {validPoints.map((p) => {
            const cx = getXCoord(p.index);
            const cy = getYCoord(p.value);
            const isHovered = hoveredPoint?.id === p.id || hoveredPoint?.index === p.index;
            return (
              <rect
                key={`p-${p.index}-${p.id || ''}`}
                x={cx - 2.5}
                y={cy - 2.5}
                width={5}
                height={5}
                fill="#0F172A"
                className="dark:fill-slate-100 cursor-pointer transition-transform"
                stroke={isHovered ? "#3B82F6" : "#000000"}
                strokeWidth={isHovered ? 2 : 0.8}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-900/90 text-white text-[11px] p-2 rounded-lg shadow-lg pointer-events-none backdrop-blur-xs border border-slate-700 font-mono z-10">
            <div className="font-bold text-cyan-300">Run #{hoveredPoint.index}</div>
            <div>Tgl: {hoveredPoint.date}</div>
            <div>Nilai: <span className="font-semibold text-emerald-400">{hoveredPoint.value.toFixed(3)}</span></div>
            {hoveredPoint.week && <div>Week: {hoveredPoint.week}</div>}
          </div>
        )}
      </div>

      {/* Statistical Summary Box Underneath (Persis format Gambar 6) */}
      <div className="p-3 text-xs grid grid-cols-1 md:grid-cols-3 gap-2 bg-white dark:bg-slate-900">
        {/* Kolom 1: LIMITS */}
        <div className="space-y-1 border-r border-slate-200 dark:border-slate-800 pr-2">
          <div className="font-bold text-slate-700 dark:text-slate-300 border-b pb-0.5 border-slate-200 dark:border-slate-800 text-[11px] flex justify-between">
            <span>Limit</span>
            <span className="font-mono text-slate-500">σ = {limits.stdevFixed.toFixed(3)}</span>
          </div>
          <div className="space-y-0.5 font-mono text-[10.5px]">
            <div className="flex justify-between items-center bg-red-500/10 text-red-700 dark:text-red-400 px-1 py-0.5 rounded">
              <span className="font-semibold">Upper Action (+3σ)</span>
              <span className="font-bold">{limits.upperAction.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded">
              <span>Upper Warning (+2σ)</span>
              <span>{limits.upperWarning.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1 py-0.5 rounded">
              <span className="font-semibold">Expected Val (CL)</span>
              <span className="font-bold">{limits.nominalValue.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded">
              <span>Lower Warning (-2σ)</span>
              <span>{limits.lowerWarning.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center bg-red-500/10 text-red-700 dark:text-red-400 px-1 py-0.5 rounded">
              <span className="font-semibold">Lower Action (-3σ)</span>
              <span className="font-bold">{limits.lowerAction.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Kolom 2: STATISTICS */}
        <div className="space-y-1 border-r border-slate-200 dark:border-slate-800 pr-2">
          <div className="font-bold text-slate-700 dark:text-slate-300 border-b pb-0.5 border-slate-200 dark:border-slate-800 text-[11px]">
            Statistics (Aktual)
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Mean:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{statistics.mean.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Median:</span>
              <span className="text-slate-700 dark:text-slate-300">{statistics.median.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Minimum:</span>
              <span className="text-slate-700 dark:text-slate-300">{statistics.min.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Maximum:</span>
              <span className="text-slate-700 dark:text-slate-300">{statistics.max.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Actual s:</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{statistics.actualStdev.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Kolom 3: STATUS EVALUATION */}
        <div className="space-y-1 flex flex-col justify-between">
          <div>
            <div className="font-bold text-slate-700 dark:text-slate-300 border-b pb-0.5 border-slate-200 dark:border-slate-800 text-[11px]">
              Status Evaluasi
            </div>
            <div className="mt-2 text-center">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                Certified Value
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center leading-tight">
              Metrik acuan diambil dari sertifikat standar CRM & tabel STDEV.
            </p>
          </div>

          <div className="text-[9.5px] text-slate-400 text-center font-mono">
            {instrumentCode} • {standardCode}
          </div>
        </div>
      </div>
    </div>
  );
};
