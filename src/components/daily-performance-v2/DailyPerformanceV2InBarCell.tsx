import React from 'react';
import { formatNumber } from './daily-performance-v2-utils';

export interface InBarCellProps {
  value: number;
  maxValue: number;
  prefix?: string;
  unit?: string;
  colorVariant?: 'slate' | 'sky' | 'emerald' | 'amber' | 'indigo' | 'purple' | 'rose' | 'teal';
  isHighlightPeak?: boolean;
  label?: string;
  subtext?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const DailyPerformanceV2InBarCell: React.FC<InBarCellProps> = ({
  value,
  maxValue,
  prefix = '',
  unit = '',
  colorVariant = 'slate',
  isHighlightPeak = true,
  label,
  subtext,
  size = 'md',
  className = '',
  onClick
}) => {
  const safeMax = Math.max(1, maxValue, value);
  const pct = safeMax > 0 ? Math.min(100, Math.round((value / safeMax) * 100)) : 0;
  const isFullBar = value > 0 && value >= maxValue;

  const variantStyles = {
    slate: {
      bar: isFullBar 
        ? 'bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-500' 
        : 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600',
      text: 'text-slate-800 dark:text-slate-100',
      sub: 'text-slate-500 dark:text-slate-400'
    },
    teal: {
      bar: isFullBar 
        ? 'bg-gradient-to-r from-teal-400 to-emerald-500 shadow-xs' 
        : 'bg-gradient-to-r from-teal-200 to-teal-300 dark:from-teal-900/70 dark:to-teal-700/70',
      text: isFullBar ? 'text-teal-950 dark:text-white' : 'text-teal-900 dark:text-teal-200',
      sub: 'text-teal-600 dark:text-teal-400'
    },
    sky: {
      bar: isFullBar 
        ? 'bg-gradient-to-r from-sky-400 to-cyan-500 shadow-xs' 
        : 'bg-gradient-to-r from-sky-200 to-sky-300 dark:from-sky-900/70 dark:to-sky-700/70',
      text: isFullBar ? 'text-sky-950 dark:text-white' : 'text-sky-900 dark:text-sky-200',
      sub: 'text-sky-600 dark:text-sky-400'
    },
    emerald: {
      bar: isFullBar 
        ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-xs' 
        : 'bg-gradient-to-r from-emerald-200 to-emerald-300 dark:from-emerald-900/70 dark:to-emerald-700/70',
      text: isFullBar ? 'text-emerald-950 dark:text-white' : 'text-emerald-900 dark:text-emerald-200',
      sub: 'text-emerald-600 dark:text-emerald-400'
    },
    amber: {
      bar: isFullBar 
        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-xs' 
        : 'bg-gradient-to-r from-amber-200 to-amber-300 dark:from-amber-900/70 dark:to-amber-700/70',
      text: isFullBar ? 'text-amber-950 dark:text-white' : 'text-amber-900 dark:text-amber-200',
      sub: 'text-amber-600 dark:text-amber-400'
    },
    indigo: {
      bar: isFullBar 
        ? 'bg-gradient-to-r from-indigo-400 to-blue-500 shadow-xs' 
        : 'bg-gradient-to-r from-indigo-200 to-indigo-300 dark:from-indigo-900/70 dark:to-indigo-700/70',
      text: isFullBar ? 'text-indigo-950 dark:text-white' : 'text-indigo-900 dark:text-indigo-200',
      sub: 'text-indigo-600 dark:text-indigo-400'
    },
    purple: {
      bar: isFullBar 
        ? 'bg-gradient-to-r from-purple-400 to-fuchsia-500 shadow-xs' 
        : 'bg-gradient-to-r from-purple-200 to-purple-300 dark:from-purple-900/70 dark:to-purple-700/70',
      text: isFullBar ? 'text-purple-950 dark:text-white' : 'text-purple-900 dark:text-purple-200',
      sub: 'text-purple-600 dark:text-purple-400'
    },
    rose: {
      bar: isFullBar 
        ? 'bg-gradient-to-r from-rose-400 to-red-500 shadow-xs' 
        : 'bg-gradient-to-r from-rose-200 to-rose-300 dark:from-rose-900/70 dark:to-rose-700/70',
      text: isFullBar ? 'text-rose-950 dark:text-white' : 'text-rose-900 dark:text-rose-200',
      sub: 'text-rose-600 dark:text-rose-400'
    }
  };

  const currentTheme = variantStyles[colorVariant] || variantStyles.slate;

  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-10' : 'h-8 sm:h-9';
  const textClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm';

  return (
    <div 
      onClick={onClick}
      title={`${pct}% dibanding tertinggi di bulan ini (${formatNumber(maxValue)} ${unit})`}
      className={`relative w-full ${heightClass} rounded-xl overflow-hidden bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 flex items-center shadow-inner group transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-500' : ''
      } ${className}`}
    >
      {/* Background Volume Fill Bar */}
      <div 
        style={{ width: `${Math.max(0, pct)}%` }} 
        className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-lg ${currentTheme.bar}`}
      />

      {/* Numerical & Label Overlay */}
      <div className="relative z-10 flex items-center justify-between w-full px-2.5 sm:px-3 text-xs">
        <div className="flex items-center gap-1.5 font-mono overflow-hidden">
          {label && (
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider truncate hidden sm:inline">
              {label}
            </span>
          )}
          <span className={`font-black ${textClass} ${currentTheme.text} drop-shadow-xs whitespace-nowrap`}>
            {prefix}{formatNumber(value)}
          </span>
          {unit && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-medium whitespace-nowrap">
              {unit}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 font-mono shrink-0">
          {isFullBar && isHighlightPeak && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-amber-950 shadow-xs flex items-center gap-0.5 ring-1 ring-amber-300 animate-pulse" title="Rekor tertinggi di bulan ini">
              Rekor Bln
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
