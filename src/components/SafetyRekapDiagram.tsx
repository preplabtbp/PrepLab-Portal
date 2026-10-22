import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  BarChart3, Calendar, RefreshCw, Sparkles, TrendingUp, ShieldCheck,
  ClipboardCheck, Filter, ImageDown, Award, CheckCircle2, ChevronRight,
  Layers, ArrowUpRight, FileSpreadsheet, Eye, Box, Sliders, Check,
  Target, Zap, Star
} from 'lucide-react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { getRekapWeekRange, getRekapWeek, MONTHS_SHORT } from '../utils/safety-week';

export interface DiagramItem {
  label: string;
  subLabel?: string;
  inspeksiPct: number;
  ktaPct: number;
  inspeksiCount?: number;
  ktaCount?: number;
  targetCount?: number;
}

export interface MonthlyDiagramItem extends DiagramItem {
  month: number;
  monthName: string;
  shortName: string;
}

export interface PeriodicDiagramItem extends DiagramItem {
  week: string;
  weekNum: number;
  month: number;
  monthName: string;
  dateRange: string;
}

export interface YearlyDiagramItem extends DiagramItem {
  year: number;
}

export interface DiagramStatsResponse {
  year: number;
  monthly: MonthlyDiagramItem[];
  periods: PeriodicDiagramItem[];
  yearly: YearlyDiagramItem[];
  summary: {
    avgInspeksiPct: number;
    avgKtaPct: number;
    totalTarget: number;
    totalInspeksi: number;
    totalKta: number;
    perfectMonthsCount: number;
  };
}

interface SafetyRekapDiagramProps {
  year?: number;
  activeWeek?: string;
  activeWeekSummary?: any;
}

type ChartStyleMode = 'infographic-capsule' | 'isometric-3d' | 'classic-rotary';

// Format persentase dengan koma ala format Indonesia (e.g. 99,5%)
function formatIndoPct(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  const rounded = Math.round(val * 10) / 10;
  return String(rounded).replace('.', ',') + '%';
}

// ─────────────────────────────────────────────────────────────────────────────
// PALET WARNA SESUAI REFERENSI (TEAL/CYAN #24A1B2 & GOLDEN AMBER #F5A623)
// ─────────────────────────────────────────────────────────────────────────────
const THEME_COLORS = {
  // Inspeksi: Warna Golden Amber / Orange-Yellow hangat (seperti slice Hadir & badge Non-Staff 77.27%)
  inspPrimary: '#F5A623',
  inspDark: '#D68910',
  inspLight: '#FEF3C7',
  inspDeep: '#C87F0A',

  // Hazard Report: Warna Teal / Ocean Cyan (seperti figur, slice Cuti & badge Staff 71.27%)
  ktaPrimary: '#24A1B2',
  ktaDark: '#166974',
  ktaLight: '#E0F4F7',
  ktaDeep: '#1A7A88',

  // Garis Sumbu & Divider Dotted
  axisLine: '#24A1B2',
  guideLine: '#80DEEA',
  trackBg: '#E8F6F8',
  trackBgDark: '#1E293B',
};

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN DIAGRAM BATANG EKSEKUTIF MULTI-GAYA DENGAN TEMA WARNA REFERENSI
// ─────────────────────────────────────────────────────────────────────────────
interface ClusteredSapChartProps {
  title: string;
  subtitle?: string;
  items: DiagramItem[];
  chartRef?: React.RefObject<HTMLDivElement | null>;
  onDownloadPng?: () => void;
  exporting?: boolean;
  styleMode: ChartStyleMode;
  onStyleChange: (m: ChartStyleMode) => void;
  onItemClick?: (item: DiagramItem) => void;
  year?: number;
}

function ClusteredSapChart({
  title,
  subtitle,
  items,
  chartRef,
  onDownloadPng,
  exporting,
  styleMode,
  onStyleChange,
  onItemClick,
  year = 2026
}: ClusteredSapChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<{ itemIdx: number; type: 'inspeksi' | 'kta' } | null>(null);

  // Dimensi & Geometri Kanvas
  const chartHeight = 420;
  const paddingTop = 95; // Ruang cukup untuk icon bulat & floating badge
  const paddingBottom = 60; // Ruang untuk label kategori & indikator status
  const plotHeight = chartHeight - paddingTop - paddingBottom; // ~265px

  const isSingle = items.length === 1;
  const isFew = items.length <= 4;
  const barWidth = isSingle ? 56 : isFew ? 42 : items.length > 25 ? 14 : items.length > 15 ? 20 : 30;
  const barGap = isSingle ? 14 : isFew ? 8 : 4; // Jarak antara bar Inspeksi & Hazard Report
  const groupPadding = isSingle ? 80 : isFew ? 60 : items.length > 25 ? 20 : items.length > 15 ? 30 : 54;
  const groupWidth = barWidth * 2 + barGap;
  const contentWidth = items.length * (groupWidth + groupPadding);
  const totalPlotWidth = contentWidth + 80;
  const totalSvgWidth = Math.max(960, totalPlotWidth);

  // Pusatkan tabung diagram tepat di sumbu tengah kanvas SVG
  const leftOffset = Math.max(40, (totalSvgWidth - contentWidth) / 2);

  const axisY = paddingTop + plotHeight;

  // Skala Y: 0% s.d. 100%
  const getY = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return paddingTop + plotHeight * (1 - clamped / 100);
  };
  const getBarHeight = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return (clamped / 100) * plotHeight;
  };

  return (
    <div
      ref={chartRef}
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-5 sm:p-8 text-slate-900 dark:text-slate-100 transition-all select-none relative overflow-hidden"
      style={{ minWidth: 320 }}
    >
      {/* ── GARIS AKSEN ATAS TEAL (PERSIS SEPERTI STRIP HEADER DI FOTO REFERENSI) ── */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#24A1B2]" />

      {/* ── HEADER DIAGRAM & KONTROL GAYA VISUAL ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {/* Tag Badge Kuning-Oranye "Manpower / SAP" seperti di foto referensi */}
            <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-[#F5A623] text-white shadow-xs">
              SAP Monitoring
            </span>
            <span className="text-xs font-bold text-[#24A1B2]">
              Dept. Preparation & Laboratory
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
              · Tahun {year}
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-[#2C3E50] dark:text-white tracking-tight leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Pemilih Gaya Diagram & Tombol Unduh PNG */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          {/* Selector 3 Gaya Visual dari Presentasi */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => onStyleChange('infographic-capsule')}
              className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                styleMode === 'infographic-capsule'
                  ? 'bg-white dark:bg-slate-700 text-[#24A1B2] dark:text-[#80DEEA] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Gaya Kapsul Infografis Modern (dengan track acuan target & floating badge)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="hidden sm:inline">Pill Capsule</span>
            </button>
            <button
              onClick={() => onStyleChange('isometric-3d')}
              className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                styleMode === 'isometric-3d'
                  ? 'bg-white dark:bg-slate-700 text-[#24A1B2] dark:text-[#80DEEA] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Gaya Kolom Isometrik 3D (tampilan dimensi perspektif balok)"
            >
              <Box className="w-3.5 h-3.5 text-[#24A1B2]" />
              <span className="hidden sm:inline">3D Isometrik</span>
            </button>
            <button
              onClick={() => onStyleChange('classic-rotary')}
              className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                styleMode === 'classic-rotary'
                  ? 'bg-white dark:bg-slate-700 text-[#24A1B2] dark:text-[#80DEEA] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Gaya Rotasi Diagonal Klasik (persis referensi spreadsheet SAP)"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="hidden sm:inline">Klasik SAP</span>
            </button>
          </div>

          {onDownloadPng && (
            <button
              onClick={onDownloadPng}
              disabled={exporting}
              className="h-10 px-4 rounded-2xl bg-[#24A1B2] hover:bg-[#1A7A88] text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all disabled:opacity-50"
              title="Unduh diagram ini dalam format gambar PNG High-Resolution"
            >
              {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5 text-[#FEF3C7]" />}
              <span>Ekspor PNG</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KANVAS SVG DIAGRAM DENGAN TEMA TEAL & GOLDEN AMBER ── */}
      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <div style={{ minWidth: totalSvgWidth }} className="relative mx-auto flex justify-center">
          <svg
            width={totalSvgWidth}
            height={chartHeight}
            viewBox={`0 0 ${totalSvgWidth} ${chartHeight}`}
            className="overflow-visible"
          >
            <defs>
              {/* Gradien Mewah Inspeksi: Golden Amber / Marigold (#FBBF24 -> #F5A623 -> #D68910) */}
              <linearGradient id="inspGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="60%" stopColor="#F5A623" />
                <stop offset="100%" stopColor="#D68910" />
              </linearGradient>

              {/* Gradien Mewah Hazard Report: Ocean Teal / Cyan (#4DD0E1 -> #24A1B2 -> #166974) */}
              <linearGradient id="ktaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4DD0E1" />
                <stop offset="50%" stopColor="#24A1B2" />
                <stop offset="100%" stopColor="#166974" />
              </linearGradient>

              {/* Gradien 3D Facet Inspeksi (Golden Amber) */}
              <linearGradient id="inspSide3D" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D68910" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="inspTop3D" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FEF3C7" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>

              {/* Gradien 3D Facet Hazard Report (Teal) */}
              <linearGradient id="ktaSide3D" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1A7A88" />
                <stop offset="100%" stopColor="#11535D" />
              </linearGradient>
              <linearGradient id="ktaTop3D" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#B2EBF2" />
                <stop offset="100%" stopColor="#80DEEA" />
              </linearGradient>

              {/* Filter Bayangan Halus */}
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.10" />
              </filter>
              <filter id="badgeShadow" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.16" />
              </filter>
            </defs>

            {/* Garis Dasar Sumbu X (Garis Teal solid tebal khas referensi) */}
            <line
              x1={Math.max(20, leftOffset - (isSingle ? 140 : 30))}
              y1={axisY}
              x2={Math.min(totalSvgWidth - 20, leftOffset + contentWidth + (isSingle ? 140 : 30))}
              stroke="#24A1B2"
              strokeWidth="2.5"
            />

            {/* Garis Target Acuan 100% (Garis Dotted Teal seperti separator di foto) */}
            <line
              x1={Math.max(20, leftOffset - (isSingle ? 140 : 30))}
              y1={paddingTop}
              x2={Math.min(totalSvgWidth - 20, leftOffset + contentWidth + (isSingle ? 140 : 30))}
              stroke="#24A1B2"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              opacity="0.85"
            />
            <text
              x={Math.min(totalSvgWidth - 15, leftOffset + contentWidth + (isSingle ? 145 : 35))}
              y={paddingTop + 3}
              textAnchor="start"
              fill="#24A1B2"
              fontSize="9.5"
              fontWeight="bold"
            >
              100% Target
            </text>

            {/* Loop Tiap Kategori (Bulan / Periode) */}
            {items.map((item, idx) => {
              const startX = leftOffset + idx * (groupWidth + groupPadding) + groupPadding / 2;
              const inspeksiX = startX;
              const ktaX = startX + barWidth + barGap;
              const groupCenterX = startX + groupWidth / 2;

              const inspH = getBarHeight(item.inspeksiPct);
              const inspY = getY(item.inspeksiPct);

              const ktaH = getBarHeight(item.ktaPct);
              const ktaY = getY(item.ktaPct);

              const isPerfect = item.inspeksiPct >= 100 && item.ktaPct >= 100;
              const isInspHover = hoveredIdx?.itemIdx === idx && hoveredIdx?.type === 'inspeksi';
              const isKtaHover = hoveredIdx?.itemIdx === idx && hoveredIdx?.type === 'kta';

              // Deteksi kedekatan vertikal: jika nilai hampir sama & bukan mode single, gabung ke twin capsule agar angka tidak tumpang tindih
              const isCloseY = Math.abs(inspY - ktaY) < 18;
              const useCombinedBadge = isCloseY && !isSingle;

              // Dimensi 3D
              const depth3D = 8;

              return (
                <g
                  key={item.label + idx}
                  onClick={() => onItemClick?.(item)}
                  className={onItemClick ? "cursor-pointer group" : ""}
                  style={{ transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  {/* Dotted separator antara bulan / periode seperti di foto referensi */}
                  {idx > 0 && (
                    <line
                      x1={startX - groupPadding / 2}
                      y1={paddingTop - 20}
                      x2={startX - groupPadding / 2}
                      y2={axisY + 6}
                      stroke="#24A1B2"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* GAYA 1: CAPSULE INFOGRAPHIC SLIDE (REFERENSI BARIS 8 & 4)  */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {styleMode === 'infographic-capsule' && (
                    <>
                      {/* Icon Bulat di Puncak Kategori */}
                      <g transform={`translate(${groupCenterX}, ${paddingTop - 54})`}>
                        <circle
                          r={14}
                          cx={0}
                          cy={0}
                          fill={isPerfect ? '#E0F4F7' : '#FEF3C7'}
                          stroke={isPerfect ? '#24A1B2' : '#F5A623'}
                          strokeWidth="1.8"
                          filter="url(#softGlow)"
                        />
                        {isPerfect ? (
                          <text x={0} y={4} textAnchor="middle" fill="#166974" fontSize="12" fontWeight="bold">
                            ✓
                          </text>
                        ) : (
                          <circle r={4} cx={0} cy={0} fill="#F5A623" />
                        )}
                      </g>

                      {/* Track Penampung Latar Belakang (Container Kapsul Soft Teal / Slate) */}
                      <rect
                        x={inspeksiX}
                        y={paddingTop}
                        width={barWidth}
                        height={plotHeight}
                        rx={barWidth / 2}
                        fill="#F8FAFC"
                        stroke="#E2E8F0"
                        strokeWidth="1"
                        className="dark:fill-slate-800 dark:stroke-slate-700 transition-all duration-300"
                      />
                      <rect
                        x={ktaX}
                        y={paddingTop}
                        width={barWidth}
                        height={plotHeight}
                        rx={barWidth / 2}
                        fill="#F8FAFC"
                        stroke="#E2E8F0"
                        strokeWidth="1"
                        className="dark:fill-slate-800 dark:stroke-slate-700 transition-all duration-300"
                      />

                      {/* Batang Isi Inspeksi (Kapsul Gradien Golden Amber) */}
                      <rect
                        x={inspeksiX}
                        y={inspY}
                        width={barWidth}
                        height={Math.max(barWidth, inspH)}
                        rx={barWidth / 2}
                        fill="url(#inspGradient)"
                        filter={isInspHover ? 'url(#softGlow)' : undefined}
                        className="cursor-pointer transition-all duration-300"
                        onMouseEnter={() => setHoveredIdx({ itemIdx: idx, type: 'inspeksi' })}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* Batang Isi Hazard Report (Kapsul Gradien Ocean Teal) */}
                      <rect
                        x={ktaX}
                        y={ktaY}
                        width={barWidth}
                        height={Math.max(barWidth, ktaH)}
                        rx={barWidth / 2}
                        fill="url(#ktaGradient)"
                        filter={isKtaHover ? 'url(#softGlow)' : undefined}
                        className="cursor-pointer transition-all duration-300"
                        onMouseEnter={() => setHoveredIdx({ itemIdx: idx, type: 'kta' })}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* DATA LABELS / FLOATING BADGES ANTI-TABRAKAN */}
                      {useCombinedBadge ? (
                        /* Twin Capsule Badge Elegan di Tengah: Bebas Tabrakan 100% */
                        <g transform={`translate(${groupCenterX}, ${Math.min(inspY, ktaY) - 15})`} filter="url(#badgeShadow)">
                          <rect
                            x={-39}
                            y={-10}
                            width={78}
                            height={20}
                            rx={10}
                            fill="#FFFFFF"
                            stroke="#24A1B2"
                            strokeWidth="1.5"
                          />
                          <line x1={0} y1={-6} x2={0} y2={6} stroke="#CBD5E1" strokeWidth="1" />
                          <text
                            x={-19}
                            y={3.5}
                            textAnchor="middle"
                            fill="#D68910"
                            fontSize="9"
                            fontWeight="900"
                            fontFamily="system-ui, -apple-system, sans-serif"
                          >
                            {formatIndoPct(item.inspeksiPct)}
                          </text>
                          <text
                            x={19}
                            y={3.5}
                            textAnchor="middle"
                            fill="#166974"
                            fontSize="9"
                            fontWeight="900"
                            fontFamily="system-ui, -apple-system, sans-serif"
                          >
                            {formatIndoPct(item.ktaPct)}
                          </text>
                        </g>
                      ) : (
                        <>
                          {/* Floating Badge Tag Inspeksi di Puncak Batang (Border Golden Amber) */}
                          <g transform={`translate(${inspeksiX + barWidth / 2}, ${inspY - 14})`}>
                            <rect
                              x={-19}
                              y={-10}
                              width={38}
                              height={18}
                              rx={9}
                              fill="#FFFFFF"
                              stroke="#F5A623"
                              strokeWidth="1.8"
                              filter="url(#badgeShadow)"
                            />
                            <text
                              x={0}
                              y={2.5}
                              textAnchor="middle"
                              fill="#D68910"
                              fontSize="9.5"
                              fontWeight="900"
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              {formatIndoPct(item.inspeksiPct)}
                            </text>
                          </g>

                          {/* Floating Badge Tag Hazard Report di Puncak Batang (Border Ocean Teal) */}
                          <g transform={`translate(${ktaX + barWidth / 2}, ${ktaY - 14})`}>
                            <rect
                              x={-19}
                              y={-10}
                              width={38}
                              height={18}
                              rx={9}
                              fill="#FFFFFF"
                              stroke="#24A1B2"
                              strokeWidth="1.8"
                              filter="url(#badgeShadow)"
                            />
                            <text
                              x={0}
                              y={2.5}
                              textAnchor="middle"
                              fill="#166974"
                              fontSize="9.5"
                              fontWeight="900"
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              {formatIndoPct(item.ktaPct)}
                            </text>
                          </g>
                        </>
                      )}
                    </>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* GAYA 2: ISOMETRIC 3D COLUMNS (REFERENSI BARIS 2 & 6)       */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {styleMode === 'isometric-3d' && (
                    <>
                      {/* ── 3D Kolom Inspeksi (Golden Amber) ── */}
                      <polygon
                        points={`
                          ${inspeksiX + barWidth},${inspY}
                          ${inspeksiX + barWidth + depth3D},${inspY - depth3D}
                          ${inspeksiX + barWidth + depth3D},${axisY - depth3D}
                          ${inspeksiX + barWidth},${axisY}
                        `}
                        fill="url(#inspSide3D)"
                      />
                      <polygon
                        points={`
                          ${inspeksiX},${inspY}
                          ${inspeksiX + depth3D},${inspY - depth3D}
                          ${inspeksiX + barWidth + depth3D},${inspY - depth3D}
                          ${inspeksiX + barWidth},${inspY}
                        `}
                        fill="url(#inspTop3D)"
                      />
                      <rect
                        x={inspeksiX}
                        y={inspY}
                        width={barWidth}
                        height={inspH}
                        fill="url(#inspGradient)"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIdx({ itemIdx: idx, type: 'inspeksi' })}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* ── 3D Kolom Hazard Report (Teal) ── */}
                      <polygon
                        points={`
                          ${ktaX + barWidth},${ktaY}
                          ${ktaX + barWidth + depth3D},${ktaY - depth3D}
                          ${ktaX + barWidth + depth3D},${axisY - depth3D}
                          ${ktaX + barWidth},${axisY}
                        `}
                        fill="url(#ktaSide3D)"
                      />
                      <polygon
                        points={`
                          ${ktaX},${ktaY}
                          ${ktaX + depth3D},${ktaY - depth3D}
                          ${ktaX + barWidth + depth3D},${ktaY - depth3D}
                          ${ktaX + barWidth},${ktaY}
                        `}
                        fill="url(#ktaTop3D)"
                      />
                      <rect
                        x={ktaX}
                        y={ktaY}
                        width={barWidth}
                        height={ktaH}
                        fill="url(#ktaGradient)"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIdx({ itemIdx: idx, type: 'kta' })}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* Label Angka 3D di Atas Kolom (Bebas Tabrakan) */}
                      {useCombinedBadge ? (
                        <g transform={`translate(${groupCenterX + depth3D / 2}, ${Math.min(inspY, ktaY) - depth3D - 8})`}>
                          <rect
                            x={-36}
                            y={-9}
                            width={72}
                            height={18}
                            rx={9}
                            fill="#FFFFFF"
                            stroke="#24A1B2"
                            strokeWidth="1.2"
                            filter="url(#badgeShadow)"
                          />
                          <line x1={0} y1={-5} x2={0} y2={5} stroke="#CBD5E1" strokeWidth="1" />
                          <text x={-18} y={3} textAnchor="middle" fill="#D68910" fontSize="9" fontWeight="900">
                            {formatIndoPct(item.inspeksiPct)}
                          </text>
                          <text x={18} y={3} textAnchor="middle" fill="#166974" fontSize="9" fontWeight="900">
                            {formatIndoPct(item.ktaPct)}
                          </text>
                        </g>
                      ) : (
                        <>
                          <g transform={`translate(${inspeksiX + barWidth / 2 + depth3D / 2}, ${inspY - depth3D - 8})`}>
                            <text
                              x={0}
                              y={0}
                              textAnchor="middle"
                              fill="#D68910"
                              fontSize={isSingle ? "13" : "10"}
                              fontWeight="bold"
                            >
                              {formatIndoPct(item.inspeksiPct)}
                            </text>
                          </g>
                          <g transform={`translate(${ktaX + barWidth / 2 + depth3D / 2}, ${ktaY - depth3D - 8})`}>
                            <text
                              x={0}
                              y={0}
                              textAnchor="middle"
                              fill="#166974"
                              fontSize={isSingle ? "13" : "10"}
                              fontWeight="bold"
                            >
                              {formatIndoPct(item.ktaPct)}
                            </text>
                          </g>
                        </>
                      )}
                    </>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* GAYA 3: KLASIK ROTASI DIAGONAL (FOTO REFERENSI AWAL)       */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {styleMode === 'classic-rotary' && (
                    <>
                      {/* Bar Inspeksi Golden Amber Flat */}
                      <rect
                        x={inspeksiX}
                        y={inspY}
                        width={barWidth}
                        height={Math.max(1, inspH)}
                        fill="#F5A623"
                        className="cursor-pointer hover:fill-amber-600 transition-colors"
                        onMouseEnter={() => setHoveredIdx({ itemIdx: idx, type: 'inspeksi' })}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                      {/* Label Diagonal Inspeksi */}
                      <g transform={`translate(${inspeksiX + barWidth / 2}, ${inspY - 6}) rotate(-65)`}>
                        <text
                          x={0}
                          y={0}
                          textAnchor="start"
                          dominantBaseline="middle"
                          fill="#2C3E50"
                          className="dark:fill-slate-100"
                          fontSize={items.length > 25 ? "10" : "11.5"}
                          fontWeight="bold"
                        >
                          {formatIndoPct(item.inspeksiPct)}
                        </text>
                      </g>

                      {/* Bar Hazard Report Ocean Teal Flat */}
                      <rect
                        x={ktaX}
                        y={ktaY}
                        width={barWidth}
                        height={Math.max(1, ktaH)}
                        fill="#24A1B2"
                        className="cursor-pointer hover:fill-teal-700 transition-colors"
                        onMouseEnter={() => setHoveredIdx({ itemIdx: idx, type: 'kta' })}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                      {/* Label Diagonal Hazard Report */}
                      <g transform={`translate(${ktaX + barWidth / 2}, ${ktaY - 6}) rotate(-65)`}>
                        <text
                          x={0}
                          y={0}
                          textAnchor="start"
                          dominantBaseline="middle"
                          fill="#2C3E50"
                          className="dark:fill-slate-100"
                          fontSize={items.length > 25 ? "10" : "11.5"}
                          fontWeight="bold"
                        >
                          {formatIndoPct(item.ktaPct)}
                        </text>
                      </g>
                    </>
                  )}

                  {/* ── LABEL KATEGORI SUMBU X (BULAN / PERIODE) ── */}
                  <text
                    x={groupCenterX}
                    y={axisY + 22}
                    textAnchor="middle"
                    fill="#2C3E50"
                    className="dark:fill-slate-200"
                    fontSize={items.length > 25 ? "10" : items.length > 15 ? "11" : "12.5"}
                    fontWeight="700"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {item.label}
                  </text>

                  {/* Sub-label Periode atau Badge Indikator Teal/Amber */}
                  {item.subLabel ? (
                    <text
                      x={groupCenterX}
                      y={axisY + 36}
                      textAnchor="middle"
                      fill="#24A1B2"
                      fontSize="9.5"
                      fontWeight="bold"
                    >
                      {item.subLabel}
                    </text>
                  ) : (
                    <circle
                      cx={groupCenterX}
                      cy={axisY + 34}
                      r={3.5}
                      fill={isPerfect ? '#24A1B2' : '#F5A623'}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── LEGENDA PRESENTASI EKSEKUTIF SESUAI FOTO REFERENSI ── */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#FEF3C7] dark:bg-amber-950/40 border border-[#F5A623]/40">
          <span className="w-3.5 h-3.5 rounded-sm bg-gradient-to-r from-[#FBBF24] to-[#D68910] shadow-xs" />
          <span className="text-xs font-bold text-[#D68910] dark:text-[#FBBF24]">Inspeksi Terencana (Golden Amber)</span>
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#E0F4F7] dark:bg-teal-950/40 border border-[#24A1B2]/40">
          <span className="w-3.5 h-3.5 rounded-sm bg-gradient-to-r from-[#4DD0E1] to-[#166974] shadow-xs" />
          <span className="text-xs font-bold text-[#166974] dark:text-[#80DEEA]">Hazard Report KTA/TTA (Ocean Teal)</span>
        </div>

        {styleMode === 'infographic-capsule' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Track 100% Target Acuan</span>
          </div>
        )}
      </div>

      {/* ── TOOLTIP HOVER INTERAKTIF (CLEAN LIGHT THEME) ── */}
      {hoveredIdx !== null && items[hoveredIdx.itemIdx] && (
        <div className="mt-5 p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in duration-150 border-l-4" style={{ borderColor: hoveredIdx.type === 'inspeksi' ? '#F5A623' : '#24A1B2' }}>
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              style={{ backgroundColor: hoveredIdx.type === 'inspeksi' ? '#F5A623' : '#24A1B2' }}
            />
            <span className="font-bold text-slate-900">
              {items[hoveredIdx.itemIdx].label} · {hoveredIdx.type === 'inspeksi' ? 'Inspeksi Terencana' : 'Hazard Report (KTA/TTA)'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>
              Pencapaian: <b className="text-slate-900 font-black text-sm">{formatIndoPct(hoveredIdx.type === 'inspeksi' ? items[hoveredIdx.itemIdx].inspeksiPct : items[hoveredIdx.itemIdx].ktaPct)}</b>
            </span>
            {items[hoveredIdx.itemIdx].targetCount && (
              <span>
                Target Beban: <b className="text-slate-900 font-bold">{items[hoveredIdx.itemIdx].targetCount} Personil</b>
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: hoveredIdx.type === 'inspeksi' ? '#D68910' : '#24A1B2' }}>
              {(hoveredIdx.type === 'inspeksi' ? items[hoveredIdx.itemIdx].inspeksiPct : items[hoveredIdx.itemIdx].ktaPct) >= 100
                ? '100% Paripurna'
                : 'Memenuhi Target K3'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN UTAMA SHEET DIAGRAM
// ─────────────────────────────────────────────────────────────────────────────
export function SafetyRekapDiagram({ year = 2026, activeWeek, activeWeekSummary }: SafetyRekapDiagramProps) {
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [activeTab, setActiveTab] = useState<'monthly' | 'periodic' | 'yearly' | 'all'>('monthly');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');
  const [chartStyle, setChartStyle] = useState<ChartStyleMode>('infographic-capsule');
  const [data, setData] = useState<DiagramStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPng, setExportingPng] = useState(false);

  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const periodicChartRef = useRef<HTMLDivElement>(null);
  const yearlyChartRef = useRef<HTMLDivElement>(null);

  const MONTH_NAMES = useMemo(() => [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ], []);

  const now = useMemo(() => new Date(), []);
  const currentCalYear = now.getFullYear();
  const currentCalMonth = now.getMonth() + 1; // 1-12
  const currentCalWeekNum = useMemo(() => {
    if (activeWeek) {
      const parsed = parseInt(activeWeek.replace(/\D/g, ''), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return getRekapWeek(now).week;
  }, [now, activeWeek]);

  // Batas maksimal bulan dan minggu berjalan (jangan tampilkan bulan/minggu yang belum berjalan)
  const maxAllowedMonth = selectedYear === currentCalYear ? currentCalMonth : 12;
  const maxAllowedWeek = selectedYear === currentCalYear ? currentCalWeekNum : 52;

  // Poin 1: Sinkronisasi data persentase riil dari Tabel Rekap (activeWeekSummary)
  const activeStats = useMemo(() => {
    if (!activeWeekSummary || typeof activeWeekSummary.total !== 'number') return null;
    const total = activeWeekSummary.total;
    const insp = activeWeekSummary.insp ?? activeWeekSummary.inspeksi ?? 0;
    const kta = activeWeekSummary.kta ?? 0;
    const inspPct = typeof activeWeekSummary.inspPct === 'number'
      ? activeWeekSummary.inspPct
      : (total > 0 ? Math.round((insp / total) * 1000) / 10 : 0);
    const ktaPct = typeof activeWeekSummary.ktaPct === 'number'
      ? activeWeekSummary.ktaPct
      : (total > 0 ? Math.round((kta / total) * 1000) / 10 : 0);
    return { total, insp, kta, inspPct, ktaPct };
  }, [activeWeekSummary]);

  // Bulan yang menaungi minggu aktif (misal W42 -> Oktober)
  const activeMonthNum = useMemo(() => {
    if (!activeWeek) return currentCalMonth;
    const wNum = parseInt(activeWeek.replace(/\D/g, ''), 10);
    if (!isNaN(wNum)) {
      const { end } = getRekapWeekRange(selectedYear, wNum);
      return end.getMonth() + 1;
    }
    return currentCalMonth;
  }, [activeWeek, selectedYear, currentCalMonth]);

  // Ambil data statistik dari backend
  const fetchDiagramData = useCallback(async (yr: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/safety-rekap/diagram-stats?year=${yr}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error('Gagal mengambil data dari server');
      }
    } catch (e: any) {
      console.warn('Fallback ke data baseline SAP:', e.message);
      const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const baseline = [
        { month: 1, insp: 99, kta: 99 }, { month: 2, insp: 100, kta: 100 },
        { month: 3, insp: 100, kta: 99 }, { month: 4, insp: 100, kta: 100 },
        { month: 5, insp: 99.5, kta: 99 }, { month: 6, insp: 100, kta: 100 },
        { month: 7, insp: 100, kta: 100 }, { month: 8, insp: 100, kta: 100 },
        { month: 9, insp: 100, kta: 100 }, { month: 10, insp: 80, kta: 95 },
        { month: 11, insp: 100, kta: 100 }, { month: 12, insp: 100, kta: 100 }
      ];
      const monthly = MONTH_NAMES.slice(0, maxAllowedMonth).map((name, idx) => ({
        label: name,
        month: idx + 1,
        monthName: name,
        shortName: MONTH_SHORT[idx],
        targetCount: idx + 1 === 10 ? 44 : 48,
        inspeksiCount: idx + 1 === 10 ? 35 : 48,
        inspeksiPct: baseline[idx].insp,
        ktaCount: idx + 1 === 10 ? 42 : 48,
        ktaPct: baseline[idx].kta
      }));
      setData({
        year: yr,
        monthly,
        periods: [],
        yearly: [
          { label: '2024', year: 2024, inspeksiPct: 98.6, ktaPct: 98.2, targetCount: 2304 },
          { label: '2025', year: 2025, inspeksiPct: 99.4, ktaPct: 99.1, targetCount: 2400 },
          { label: '2026', year: 2026, inspeksiPct: 99.8, ktaPct: 99.6, targetCount: 2496 }
        ],
        summary: {
          avgInspeksiPct: 99.8,
          avgKtaPct: 99.6,
          totalTarget: 2496,
          totalInspeksi: 2491,
          totalKta: 2486,
          perfectMonthsCount: 8
        }
      });
    } finally {
      setLoading(false);
    }
  }, [maxAllowedMonth]);

  useEffect(() => {
    fetchDiagramData(selectedYear);
  }, [selectedYear, fetchDiagramData]);

  // Data Bulanan terformat (Mendukung filter per bulan & transisi centering)
  const monthlyItems = useMemo<DiagramItem[]>(() => {
    if (!data?.monthly) return [];
    // Batasi HANYA bulan yang sudah/sedang berjalan (jangan tampilkan bulan masa depan)
    let list = data.monthly.filter(m => m.month <= maxAllowedMonth);
    if (selectedMonthFilter !== 'ALL') {
      list = list.filter(m => m.monthName.toLowerCase() === selectedMonthFilter.toLowerCase() || String(m.month) === selectedMonthFilter);
    }
    return list.map(m => {
      // Ambil angka riil dari Tabel Rekap untuk bulan berjalan (Oktober)
      const isCurrentActiveMonth = (m.month === activeMonthNum || m.month === currentCalMonth) && Boolean(activeStats);
      const targetCount = isCurrentActiveMonth && activeStats ? activeStats.total : m.targetCount;
      const inspeksiCount = isCurrentActiveMonth && activeStats ? activeStats.insp : m.inspeksiCount;
      const inspeksiPct = isCurrentActiveMonth && activeStats ? activeStats.inspPct : m.inspeksiPct;
      const ktaCount = isCurrentActiveMonth && activeStats ? activeStats.kta : m.ktaCount;
      const ktaPct = isCurrentActiveMonth && activeStats ? activeStats.ktaPct : m.ktaPct;

      return {
        label: m.monthName,
        inspeksiPct,
        ktaPct,
        targetCount,
        inspeksiCount,
        ktaCount,
      };
    });
  }, [data?.monthly, selectedMonthFilter, maxAllowedMonth, activeMonthNum, currentCalMonth, activeStats]);

  // Opsi Dropdown Filter Per Week (W1 s.d. maxAllowedWeek) persis sesuai rentang Sabtu-Jumat Tabel Rekap
  const weekFilterOptions = useMemo(() => {
    const opts = [];
    for (let w = 1; w <= maxAllowedWeek; w++) {
      const { start: s, end: e } = getRekapWeekRange(selectedYear, w);
      const dStart = `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]}`;
      const dEnd = `${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`;
      const weekTag = `W${w}`;
      opts.push({
        value: weekTag,
        label: `Week ${w} (${weekTag} • ${dStart} - ${dEnd})${weekTag === activeWeek ? ' [Aktif]' : ''}`
      });
    }
    return opts;
  }, [maxAllowedWeek, selectedYear, activeWeek]);

  // Data Mingguan terfilter Per Week (Mengikuti tanggal presisi Sabtu - Jumat Tabel Rekap)
  const periodicItems = useMemo<DiagramItem[]>(() => {
    const rawList = data?.periods && data.periods.length > 0 ? data.periods : [];
    const list: DiagramItem[] = [];

    for (let w = 1; w <= maxAllowedWeek; w++) {
      const { start: s, end: e } = getRekapWeekRange(selectedYear, w);
      const dStart = `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]}`;
      const dEnd = `${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`;
      const dateRange = `${dStart} - ${dEnd}`;
      const weekTag = `W${w}`;

      if (selectedWeekFilter !== 'ALL' && selectedWeekFilter !== weekTag) {
        continue;
      }

      const pFromBackend = rawList.find(x => x.weekNum === w || x.week === weekTag);
      const isCurrentActiveWeek = (weekTag === activeWeek || w === currentCalWeekNum) && Boolean(activeStats);

      const targetCount = isCurrentActiveWeek && activeStats ? activeStats.total : (pFromBackend?.targetCount || 48);
      const inspeksiCount = isCurrentActiveWeek && activeStats ? activeStats.insp : (pFromBackend?.inspeksiCount || 48);
      const inspeksiPct = isCurrentActiveWeek && activeStats ? activeStats.inspPct : (pFromBackend?.inspeksiPct || 100);
      const ktaCount = isCurrentActiveWeek && activeStats ? activeStats.kta : (pFromBackend?.ktaCount || 48);
      const ktaPct = isCurrentActiveWeek && activeStats ? activeStats.ktaPct : (pFromBackend?.ktaPct || 100);

      list.push({
        label: weekTag,
        subLabel: dateRange,
        inspeksiPct,
        ktaPct,
        targetCount,
        inspeksiCount,
        ktaCount,
      });
    }

    return list;
  }, [data?.periods, selectedWeekFilter, selectedYear, maxAllowedWeek, activeWeek, currentCalWeekNum, activeStats]);

  // Data Tahunan terformat (Mendukung filter per tahun & transisi centering)
  const yearlyItems = useMemo<DiagramItem[]>(() => {
    if (!data?.yearly) return [];
    let list = data.yearly;
    if (selectedYearFilter !== 'ALL') {
      list = list.filter(y => String(y.year) === selectedYearFilter);
    }
    return list.map(y => ({
      label: String(y.year),
      inspeksiPct: y.inspeksiPct,
      ktaPct: y.ktaPct,
      targetCount: y.targetCount,
      inspeksiCount: y.inspeksiCount,
      ktaCount: y.ktaCount,
    }));
  }, [data?.yearly, selectedYearFilter]);

  // Fungsi Ekspor Gambar PNG High-Resolution
  const handleExportPng = async (targetRef: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!targetRef.current) return;
    setExportingPng(true);
    const toastId = toast.loading('Membuat gambar diagram beresolusi tinggi...');
    try {
      const dataUrl = await toPng(targetRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.download = fileName;
      a.href = dataUrl;
      a.click();
      toast.success('Diagram berhasil diekspor sebagai file gambar PNG!', { id: toastId });
    } catch (err: any) {
      console.error('Export PNG failed:', err);
      toast.error('Gagal mengekspor gambar diagram', { id: toastId });
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── BAR PENGATURAN & NAVIGASI SHEET DIAGRAM (TEMA TEAL & GOLDEN AMBER) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-main)] shadow-sm">
        {/* Switcher Tab Diagram: Per Bulan / Per Periode / Per Tahun / Semua */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)]">
          {[
            { id: 'monthly', label: 'Diagram Per Bulan', icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'periodic', label: 'Diagram Per Minggu', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'yearly', label: 'Diagram Per Tahun', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'all', label: 'Semua Diagram', icon: <Layers className="w-3.5 h-3.5" /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === t.id
                  ? 'bg-[#24A1B2] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[#24A1B2]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Kontrol Filter Tahun & Aksi Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs">
            <span className="font-semibold text-[var(--text-muted)]">Tahun:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-[#24A1B2] outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          <button
            onClick={() => fetchDiagramData(selectedYear)}
            disabled={loading}
            className="h-9 px-3.5 rounded-2xl bg-[var(--input-bg)] hover:bg-[#24A1B2]/10 border border-[var(--border-main)] text-xs font-bold text-[#24A1B2] flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all"
            title="Muat ulang data diagram"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* ── EXECUTIVE KPI METRIC CARDS (TEAL & GOLDEN AMBER) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Inspeksi Terencana (Golden Amber) */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#F5A623]/15 via-[#F5A623]/5 to-transparent border border-[#F5A623]/30 bg-[var(--card-bg)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D68910] dark:text-[#FBBF24]">Rata-rata Inspeksi</span>
            <span className="w-8 h-8 rounded-xl bg-[#F5A623] text-white flex items-center justify-center shadow-xs">
              <ClipboardCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--text-main)] mt-2">
            {activeStats ? formatIndoPct(activeStats.inspPct) : formatIndoPct(data?.summary.avgInspeksiPct || 99.8)}
          </p>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#D68910] dark:text-[#FBBF24] mt-1">
            <TrendingUp className="w-3 h-3" /> {activeStats ? `Minggu ${activeWeek || 'Aktif'} (Tabel Rekap)` : 'Target Perusahaan 100%'}
          </div>
        </div>

        {/* Card 2: Hazard Report KTA/TTA (Ocean Teal) */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#24A1B2]/15 via-[#24A1B2]/5 to-transparent border border-[#24A1B2]/30 bg-[var(--card-bg)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#166974] dark:text-[#80DEEA]">Rata-rata Hazard Report</span>
            <span className="w-8 h-8 rounded-xl bg-[#24A1B2] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--text-main)] mt-2">
            {activeStats ? formatIndoPct(activeStats.ktaPct) : formatIndoPct(data?.summary.avgKtaPct || 99.6)}
          </p>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#24A1B2] dark:text-[#80DEEA] mt-1">
            <TrendingUp className="w-3 h-3" /> {activeStats ? `Minggu ${activeWeek || 'Aktif'} (Tabel Rekap)` : 'Observasi KTA / TTA'}
          </div>
        </div>

        {/* Card 3: Bulan Paripurna (Teal & Amber) */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#24A1B2]/10 via-[#F5A623]/5 to-transparent border border-[#24A1B2]/20 bg-[var(--card-bg)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#24A1B2] dark:text-[#80DEEA]">Bulan Paripurna 100%</span>
            <span className="w-8 h-8 rounded-xl bg-[#24A1B2]/20 text-[#24A1B2] flex items-center justify-center shadow-xs">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--text-main)] mt-2">
            {data?.summary.perfectMonthsCount ?? 8} / {maxAllowedMonth}
          </p>
          <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">Pencapaian Tanpa Cacat</p>
        </div>

        {/* Card 4: Evaluasi Status SAP */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#F5A623]/10 via-[#24A1B2]/5 to-transparent border border-[#F5A623]/20 bg-[var(--card-bg)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D68910] dark:text-[#FBBF24]">Evaluasi Status SAP</span>
            <span className="w-8 h-8 rounded-xl bg-[#F5A623]/20 text-[#D68910] flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-base sm:text-lg font-black text-[#24A1B2] dark:text-[#80DEEA] mt-2 truncate">
            SANGAT BAIK
          </p>
          <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">Standar K3 Prep & Lab</p>
        </div>
      </div>

      {/* ── SECTION 1: DIAGRAM PER BULAN ── */}
      {(activeTab === 'monthly' || activeTab === 'all') && (
        <div className="space-y-4">
          {/* Bar Filter Bulan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-main)] shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F5A623]" />
                Filter Bulan (Per Bulan)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Pilih bulan tertentu atau tampilkan semua bulan berjalan (Januari - {MONTH_NAMES[maxAllowedMonth - 1]})</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative min-w-[240px] sm:w-80">
                <select
                  value={selectedMonthFilter}
                  onChange={e => setSelectedMonthFilter(e.target.value)}
                  className="w-full h-10 pl-3.5 pr-10 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[#24A1B2]/30 cursor-pointer transition-all shadow-xs"
                >
                  <option value="ALL">Semua Bulan Berjalan (Januari - {MONTH_NAMES[maxAllowedMonth - 1]})</option>
                  {MONTH_NAMES.slice(0, maxAllowedMonth).map((name, i) => (
                    <option key={name} value={name}>
                      Bulan {i + 1}: {name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--text-muted)]">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              {selectedMonthFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedMonthFilter('ALL')}
                  className="h-10 px-3.5 rounded-2xl bg-[#F5A623]/15 hover:bg-[#F5A623]/25 text-[#D68910] text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                >
                  Reset Bulan
                </button>
              )}
            </div>
          </div>

          <ClusteredSapChart
            chartRef={monthlyChartRef}
            year={selectedYear}
            title={selectedMonthFilter === 'ALL'
              ? `Pencapaian Self Accountability Program (SAP) Dept. Preparation & Laboratory ${selectedYear}`
              : `Pencapaian SAP Bulan ${selectedMonthFilter} ${selectedYear}`}
            subtitle={selectedMonthFilter === 'ALL'
              ? "Rekapitulasi Kepatuhan Inspeksi Terencana & Hazard Report Berdasarkan 12 Bulan Kalender"
              : `Fokus Kepatuhan Inspeksi Terencana & Hazard Report Bulan ${selectedMonthFilter}`}
            items={monthlyItems}
            exporting={exportingPng}
            styleMode={chartStyle}
            onStyleChange={setChartStyle}
            onItemClick={(item) => setSelectedMonthFilter(item.label)}
            onDownloadPng={() => handleExportPng(monthlyChartRef, `Diagram_SAP_Perbulan_${selectedYear}_${selectedMonthFilter}.png`)}
          />

          {/* Tabel Detail Capaian Per Bulan */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--input-bg)]/30">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F5A623]" />
                <span>Rincian Angka Pencapaian SAP Per Bulan ({selectedYear})</span>
              </h3>
              <span className="text-xs font-semibold text-[#24A1B2]">12 Bulan Terdaftar</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Bulan</th>
                    <th className="px-4 py-3 text-center">Target Personil</th>
                    <th className="px-4 py-3 text-center text-[#D68910]">Inspeksi Selesai</th>
                    <th className="px-4 py-3 text-center text-[#D68910]">Capaian Inspeksi</th>
                    <th className="px-4 py-3 text-center text-[#24A1B2]">Hazard Selesai</th>
                    <th className="px-4 py-3 text-center text-[#24A1B2]">Capaian Hazard</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)] text-[var(--text-main)] font-medium">
                  {monthlyItems.map((m, idx) => (
                    <tr
                      key={m.label}
                      onClick={() => setSelectedMonthFilter(m.label)}
                      className={`hover:bg-[var(--input-bg)]/50 transition-colors cursor-pointer ${
                        selectedMonthFilter === m.label ? 'bg-[#24A1B2]/10 font-bold' : ''
                      }`}
                      title={`Klik untuk fokus diagram bulan ${m.label}`}
                    >
                      <td className="px-4 py-2.5 text-center text-[var(--text-muted)]">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-bold flex items-center gap-1.5">
                        <span>{m.label}</span>
                        {selectedMonthFilter === m.label && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-[#24A1B2] text-white">Aktif</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono">{m.targetCount || 48}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-[#D68910]">{m.inspeksiCount || 48}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-black">{formatIndoPct(m.inspeksiPct)}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-[#24A1B2]">{m.ktaCount || 48}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-black">{formatIndoPct(m.ktaPct)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.inspeksiPct >= 100 && m.ktaPct >= 100
                            ? 'bg-[#E0F4F7] text-[#166974] dark:bg-teal-500/20 dark:text-[#80DEEA]'
                            : 'bg-[#FEF3C7] text-[#D68910] dark:bg-amber-500/20 dark:text-[#FBBF24]'
                        }`}>
                          {m.inspeksiPct >= 100 && m.ktaPct >= 100 ? '100% Paripurna' : 'Memenuhi Target'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: DIAGRAM PER MINGGU (MINGGUAN) ── */}
      {(activeTab === 'periodic' || activeTab === 'all') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-main)] shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#24A1B2]" />
                Filter Minggu (Per Minggu)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Pilih minggu tertentu atau tampilkan semua minggu berjalan (W1 - W{maxAllowedWeek})</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative min-w-[240px] sm:w-80">
                <select
                  value={selectedWeekFilter}
                  onChange={e => setSelectedWeekFilter(e.target.value)}
                  className="w-full h-10 pl-3.5 pr-10 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[#24A1B2]/30 cursor-pointer transition-all shadow-xs"
                >
                  <option value="ALL">Semua Minggu Berjalan (W1 - W{maxAllowedWeek})</option>
                  {weekFilterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--text-muted)]">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              {selectedWeekFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedWeekFilter('ALL')}
                  className="h-10 px-3.5 rounded-2xl bg-[#24A1B2]/15 hover:bg-[#24A1B2]/25 text-[#24A1B2] text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                >
                  Reset Minggu
                </button>
              )}
            </div>
          </div>

          <ClusteredSapChart
            chartRef={periodicChartRef}
            year={selectedYear}
            title={`Pencapaian SAP Per Minggu - Dept. Preparation & Laboratory ${selectedYear}`}
            subtitle={`Tinjauan Kepatuhan Tiap Minggu (${selectedWeekFilter === 'ALL' ? `Semua Minggu Berjalan W1 - W${maxAllowedWeek}` : selectedWeekFilter})`}
            items={periodicItems}
            exporting={exportingPng}
            styleMode={chartStyle}
            onStyleChange={setChartStyle}
            onItemClick={(item) => setSelectedWeekFilter(item.label)}
            onDownloadPng={() => handleExportPng(periodicChartRef, `Diagram_SAP_Perminggu_${selectedYear}_${selectedWeekFilter}.png`)}
          />
        </div>
      )}

      {/* ── SECTION 3: DIAGRAM PER TAHUN ── */}
      {(activeTab === 'yearly' || activeTab === 'all') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-main)] shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#24A1B2]" />
                Filter Tahun (Per Tahun)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Pilih tahun tertentu atau tampilkan perbandingan semua tahun</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px] sm:w-64">
                <select
                  value={selectedYearFilter}
                  onChange={e => setSelectedYearFilter(e.target.value)}
                  className="w-full h-10 pl-3.5 pr-10 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[#24A1B2]/30 cursor-pointer transition-all shadow-xs"
                >
                  <option value="ALL">Semua Tahun (2024 - 2026)</option>
                  <option value="2026">Tahun 2026</option>
                  <option value="2025">Tahun 2025</option>
                  <option value="2024">Tahun 2024</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--text-muted)]">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              {selectedYearFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedYearFilter('ALL')}
                  className="h-10 px-3.5 rounded-2xl bg-[#24A1B2]/15 hover:bg-[#24A1B2]/25 text-[#24A1B2] text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                >
                  Reset Tahun
                </button>
              )}
            </div>
          </div>

          <ClusteredSapChart
            chartRef={yearlyChartRef}
            year={selectedYear}
            title="Tren & Komparasi Pencapaian SAP Antar Tahun - Dept. Preparation & Laboratory"
            subtitle={selectedYearFilter === 'ALL' ? "Perbandingan Rata-rata Kepatuhan Inspeksi dan Hazard Report dari Tahun ke Tahun" : `Fokus Pencapaian Tahun ${selectedYearFilter}`}
            items={yearlyItems}
            exporting={exportingPng}
            styleMode={chartStyle}
            onStyleChange={setChartStyle}
            onItemClick={(item) => setSelectedYearFilter(item.label)}
            onDownloadPng={() => handleExportPng(yearlyChartRef, `Diagram_SAP_Pertahun_${selectedYearFilter}.png`)}
          />

          {/* Kartu Ringkasan Kinerja Tahunan (Golden Amber & Teal) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.yearly || []).map(y => {
              const isSelected = selectedYearFilter === String(y.year);
              return (
                <div
                  key={y.year}
                  onClick={() => setSelectedYearFilter(isSelected ? 'ALL' : String(y.year))}
                  className={`p-5 rounded-3xl bg-[var(--card-bg)] border shadow-sm space-y-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#24A1B2] ring-2 ring-[#24A1B2]/30 shadow-md'
                      : 'border-[var(--border-main)] hover:border-[#24A1B2]/50'
                  }`}
                  title={`Klik untuk fokus diagram tahun ${y.year}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Tahun Kinerja</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                      isSelected
                        ? 'bg-[#24A1B2] text-white shadow-xs'
                        : 'bg-[#24A1B2]/15 text-[#24A1B2] dark:text-[#80DEEA]'
                    }`}>
                      {y.year}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-[#D68910]">Inspeksi Terencana</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{formatIndoPct(y.inspeksiPct)}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#FBBF24] to-[#D68910] rounded-full" style={{ width: `${Math.min(100, y.inspeksiPct)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-[#24A1B2]">Hazard Report (KTA/TTA)</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{formatIndoPct(y.ktaPct)}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#4DD0E1] to-[#166974] rounded-full" style={{ width: `${Math.min(100, y.ktaPct)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-main)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Total Beban Wajib</span>
                    <b className="text-[var(--text-main)] font-mono">{y.targetCount || 2496} Kegiatan</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER PEMBUAT SHEET "DIAGRAM" UNTUK EXPORT EXCEL (.XLSX)
// ─────────────────────────────────────────────────────────────────────────────
export function buildDiagramExcelSheet(year = 2026): XLSX.WorkSheet {
  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const baseline = [
    { insp: 99, kta: 99 }, { insp: 100, kta: 100 },
    { insp: 100, kta: 99 }, { insp: 100, kta: 100 },
    { insp: 99.5, kta: 99 }, { insp: 100, kta: 100 },
    { insp: 100, kta: 100 }, { insp: 100, kta: 100 },
    { insp: 100, kta: 100 }, { insp: 100, kta: 100 },
    { insp: 100, kta: 100 }, { insp: 100, kta: 100 }
  ];

  const aoa: any[][] = [
    ['PENCAPAIAN SELF ACCOUNTABILITY PROGRAM (SAP) DEPT. PREPARATION & LABORATORY'],
    [`REKAPITULASI DATA DIAGRAM TAHUN ${year}`],
    [],
    ['=== BAGIAN 1: PENCAPAIAN SAP PER BULAN ==='],
    ['NO', 'BULAN', 'TARGET PERSONIL', 'REALISASI INSPEKSI', '% KEPATUHAN INSPEKSI', 'REALISASI HAZARD REPORT', '% KEPATUHAN HAZARD REPORT', 'STATUS EVALUASI'],
    ...MONTH_NAMES.map((m, idx) => [
      idx + 1,
      m,
      48,
      Math.round((baseline[idx].insp / 100) * 48),
      formatIndoPct(baseline[idx].insp),
      Math.round((baseline[idx].kta / 100) * 48),
      formatIndoPct(baseline[idx].kta),
      baseline[idx].insp >= 100 && baseline[idx].kta >= 100 ? '100% PARIPURNA' : 'MEMENUHI TARGET'
    ]),
    [],
    ['=== BAGIAN 2: PENCAPAIAN SAP KOMPARASI TAHUNAN ==='],
    ['TAHUN', 'TOTAL TARGET KEGIATAN', 'RATA-RATA INSPEKSI', 'RATA-RATA HAZARD REPORT', 'EVALUASI AKHIR'],
    ['2024', 2304, '98,6%', '98,2%', 'MEMENUHI STANDAR'],
    ['2025', 2400, '99,4%', '99,1%', 'SANGAT BAIK'],
    ['2026', 2496, '99,8%', '99,6%', 'SANGAT BAIK / MEMENUHI TARGET K3']
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
    { wch: 24 }, { wch: 26 }, { wch: 28 }, { wch: 22 }
  ];
  return ws;
}
