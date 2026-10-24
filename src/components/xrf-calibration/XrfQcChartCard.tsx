import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, AlertCircle, CheckCircle2, ChevronDown, 
  Layers, Sliders, Activity, Info, ShieldAlert, Check, 
  X, Sparkles, ExternalLink, Pin, User, Search, Edit3, 
  Trash2, MessageSquare, Maximize2, Lock, Calendar, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

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

export interface XrfPointAnnotation {
  issue: string;
  solution: string;
  picNik: string;
  picName: string;
  picRole?: string;
  updatedAt?: string;
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

/**
 * Helper serbaguna untuk memformat tanggal dan jam titik chart secara konsisten.
 * Menjamin titik chart selalu menampilkan Tanggal & Jam (baik data GTS yang jam saja,
 * data lengkap, maupun data lama).
 */
/**
 * Normalisasi tanggal format apa pun (DD/MM/YY, DD/MM/YYYY, dsb) ke ISO YYYY-MM-DD
 */
export function normalizeIsoDate(datePart: string): string {
  if (!datePart) return '';
  const clean = datePart.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // DD/MM/YY or DD/MM/YYYY or DD-MM-YYYY
  const m = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    let day = parseInt(m[1], 10);
    let month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year = 2000 + year;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return clean;
}

export function formatPointDisplayDate(analyzedAt?: string | null, batchDate?: string | null): string {
  const cleanAnalyzed = (analyzedAt || '').trim();
  const cleanDate = (batchDate || '').trim();

  if (!cleanAnalyzed && !cleanDate) return '-';

  // 1. Jika analyzedAt HANYA berupa jam (misal: "08:00", "01:05", "00:26", "08:00:15")
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(cleanAnalyzed)) {
    const timePad = cleanAnalyzed.slice(0, 5).padStart(5, '0');
    const normDate = normalizeIsoDate(cleanDate);
    return normDate ? `${normDate} ${timePad}` : timePad;
  }

  // 2. Jika analyzedAt sudah memuat tanggal dan jam
  if (cleanAnalyzed) {
    const parts = cleanAnalyzed.split(/\s+/);
    if (parts.length >= 2) {
      const normDate = normalizeIsoDate(parts[0]);
      const timePart = parts[1].slice(0, 5).padStart(5, '0');
      return `${normDate} ${timePart}`;
    }
    const normDate = normalizeIsoDate(cleanAnalyzed);
    return normDate;
  }

  // 3. Fallback ke batchDate
  return normalizeIsoDate(cleanDate) || '-';
}

/**
 * Format aman untuk memecah tanggal dan jam secara terpisah untuk tampilan tabel
 */
export function parsePointDateTimeParts(analyzedAt?: string | null, batchDate?: string | null): { dateStr: string; timeStr: string } {
  const combined = formatPointDisplayDate(analyzedAt, batchDate);
  if (combined === '-') return { dateStr: '-', timeStr: '' };

  const parts = combined.split(/\s+/);
  if (parts.length >= 2) {
    return { dateStr: parts[0], timeStr: parts.slice(1).join(' ') };
  }
  if (/^\d{1,2}:\d{2}/.test(parts[0])) {
    const normBatch = normalizeIsoDate(batchDate || '');
    return { dateStr: normBatch || '-', timeStr: parts[0].padStart(5, '0') };
  }
  return { dateStr: parts[0], timeStr: '' };
}

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
  onOpenFullscreen?: () => void;
  canTakeOutOffspec?: boolean;
  userRoleTitle?: string;
  // Off-spec isolation callbacks
  onToggleIsolatePoint?: (point: XrfPointData, element: string, limits: XrfChartLimitData) => void;
  onOpenOffspecModal?: () => void;
  onIsolateAllOffspecInCard?: (points: XrfPointData[], element: string, limits: XrfChartLimitData) => void;
  isPointIsolated?: (point: XrfPointData, element: string) => boolean;
  // Point Anomaly Annotations (Issue, Solution, PIC)
  annotations?: Record<number, XrfPointAnnotation>;
  onSaveAnnotation?: (pointIndex: number, annotation: XrfPointAnnotation) => void;
  onDeleteAnnotation?: (pointIndex: number) => void;
}

// Singleton in-memory cache for employee list (prevents N+1 requests from 50+ cards)
let sharedEmployeesCache: Array<{ nik: string; nama: string; jabatan?: string }> | null = null;
let sharedEmployeesPromise: Promise<Array<{ nik: string; nama: string; jabatan?: string }>> | null = null;

async function getSharedEmployees(): Promise<Array<{ nik: string; nama: string; jabatan?: string }>> {
  if (sharedEmployeesCache) return sharedEmployeesCache;
  if (!sharedEmployeesPromise) {
    sharedEmployeesPromise = fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.employees || []);
        const mapped = list.map((e: any) => ({
          nik: String(e.nik || ''),
          nama: String(e.nama || e.name || 'Personil'),
          jabatan: String(e.jabatan || e.position || '')
        }));
        sharedEmployeesCache = mapped;
        return mapped;
      })
      .catch(() => {
        sharedEmployeesPromise = null;
        return [];
      });
  }
  return sharedEmployeesPromise;
}

export const XrfQcChartCard: React.FC<XrfQcChartCardProps> = React.memo(({
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
  onOpenFullscreen,
  canTakeOutOffspec = true,
  userRoleTitle,
  onToggleIsolatePoint,
  onOpenOffspecModal,
  onIsolateAllOffspecInCard,
  isPointIsolated,
  annotations = {},
  onSaveAnnotation,
  onDeleteAnnotation,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<XrfPointData | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<XrfPointData | null>(null);
  const [showElementDropdown, setShowElementDropdown] = useState<boolean>(false);
  const [showIsolatedGhost, setShowIsolatedGhost] = useState<boolean>(false);
  
  // Annotation form state
  const [editingAnnotation, setEditingAnnotation] = useState<boolean>(false);
  const [formIssue, setFormIssue] = useState<string>('');
  const [formSolution, setFormSolution] = useState<string>('');
  const [formPicNik, setFormPicNik] = useState<string>('');
  const [formPicName, setFormPicName] = useState<string>('');
  const [picSearchQuery, setPicSearchQuery] = useState<string>('');
  const [showPicDropdown, setShowPicDropdown] = useState<boolean>(false);
  const [employeesList, setEmployeesList] = useState<Array<{ nik: string; nama: string; jabatan?: string }>>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch employees list ONLY when annotation form is actually open (lazy loaded & cached)
  useEffect(() => {
    if (editingAnnotation || showPicDropdown) {
      getSharedEmployees().then(setEmployeesList);
    }
  }, [editingAnnotation, showPicDropdown]);

  // Filter employees for auto-complete dropdown
  const filteredEmployees = useMemo(() => {
    if (!picSearchQuery || picSearchQuery.trim().length === 0) return employeesList.slice(0, 6);
    const q = picSearchQuery.toLowerCase();
    return employeesList.filter(e => 
      (e.nik && e.nik.toLowerCase().includes(q)) || 
      (e.nama && e.nama.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [picSearchQuery, employeesList]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowElementDropdown(false);
      }
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedPoint(null);
        setEditingAnnotation(false);
        setShowPicDropdown(false);
      }
    };
    if (showElementDropdown || selectedPoint) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showElementDropdown, selectedPoint]);

  // When selectedPoint changes, reset annotation form
  useEffect(() => {
    if (selectedPoint) {
      const ann = annotations[selectedPoint.index];
      if (ann) {
        setFormIssue(ann.issue || '');
        setFormSolution(ann.solution || '');
        setFormPicNik(ann.picNik || '');
        setFormPicName(ann.picName || '');
        setPicSearchQuery(ann.picNik ? `${ann.picNik} - ${ann.picName}` : '');
      } else {
        setFormIssue('');
        setFormSolution('');
        setFormPicNik('');
        setFormPicName('');
        setPicSearchQuery('');
      }
      setEditingAnnotation(false);
      setShowPicDropdown(false);
    }
  }, [selectedPoint, annotations]);

  // SVG Chart Dimensions
  const svgWidth = 540;
  const svgHeight = 290;
  const padding = { top: 28, right: 62, bottom: 38, left: 56 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // -----------------------------------------------------------------
  // DATA FILTERING: ACTIVE IN-CONTROL VS ISOLATED OFFSPEC POINTS
  // -----------------------------------------------------------------
  const validPoints = points.filter(p => typeof p.value === 'number' && !isNaN(p.value));
  const isolatedPointsInCard = validPoints.filter(p => isPointIsolated ? isPointIsolated(p, currentElement) : false);
  const activePoints = validPoints.filter(p => !isPointIsolated || !isPointIsolated(p, currentElement));

  // Y-Domain: Baseline uses ACTIVE points and control limits so outliers don't stretch the scale
  const activeRawValues = activePoints.map(p => p.value);
  const allValues = [
    limits.upperAction,
    limits.lowerAction,
    limits.nominalValue,
    ...(activeRawValues.length > 0 ? activeRawValues : [limits.nominalValue])
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

  // Generate 4-5 X-axis label indices without overlapping at the right edge
  const stepX = Math.max(1, Math.floor(numPoints / 5));
  const xIndices: number[] = [];
  for (let i = 1; i <= numPoints; i += stepX) {
    xIndices.push(i);
  }
  if (!xIndices.includes(numPoints)) {
    const lastIdx = xIndices[xIndices.length - 1];
    if (numPoints - lastIdx < stepX * 0.45 && xIndices.length > 1) {
      xIndices[xIndices.length - 1] = numPoints;
    } else {
      xIndices.push(numPoints);
    }
  }

  // Faint horizontal background grid lines (5 levels)
  const gridYTicks = [
    yDomainMin,
    yDomainMin + yRange * 0.25,
    yDomainMin + yRange * 0.5,
    yDomainMin + yRange * 0.75,
    yDomainMax,
  ];

  // Line Path connects ONLY active (non-isolated) points
  const pathD = activePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getXCoord(p.index).toFixed(1)} ${getYCoord(p.value).toFixed(1)}`)
    .join(' ');

  // Limits Y positions
  const yUpperAction = getYCoord(limits.upperAction);
  const yUpperWarning = getYCoord(limits.upperWarning);
  const yNominal = getYCoord(limits.nominalValue);
  const yLowerWarning = getYCoord(limits.lowerWarning);
  const yLowerAction = getYCoord(limits.lowerAction);

  // Status of the LATEST active point
  const lastActivePoint = activePoints.length > 0 ? activePoints[activePoints.length - 1] : null;
  const lastPointSigma = lastActivePoint && limits.stdevFixed > 0 
    ? Math.abs((lastActivePoint.value - limits.nominalValue) / limits.stdevFixed) 
    : 0;
  const isLatestNeedRecalibration = lastActivePoint && lastPointSigma > 3.0;
  const isLatestWarning = lastActivePoint && lastPointSigma > 2.0 && lastPointSigma <= 3.0;

  const formattedLastUpdate = useMemo(() => {
    if (!lastActivePoint) return null;
    const str = lastActivePoint.analyzedAt || lastActivePoint.date;
    if (!str) return null;
    try {
      const cleanStr = str.replace('T', ' ').trim();
      const [datePart, timePart] = cleanStr.split(' ');
      const delimiter = datePart.includes('-') ? '-' : (datePart.includes('/') ? '/' : null);
      if (delimiter) {
        const segments = datePart.split(delimiter);
        if (segments.length === 3) {
          let y = '', m = '', d = '';
          if (segments[0].length === 4) {
            [y, m, d] = segments;
          } else {
            [d, m, y] = segments;
          }
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          const mIdx = parseInt(m, 10) - 1;
          const mStr = monthNames[mIdx] || m;
          const timeClean = timePart ? timePart.slice(0, 5) : '';
          return timeClean ? `${d} ${mStr} ${timeClean}` : `${d} ${mStr}`;
        }
      }
      return cleanStr;
    } catch {
      return str;
    }
  }, [lastActivePoint]);

  // Recalculated dynamic KPI statistics based on active non-isolated points
  const displayedStats = useMemo(() => {
    if (isolatedPointsInCard.length === 0 || activePoints.length === 0) {
      return statistics;
    }
    const vals = activePoints.map(p => p.value);
    const count = vals.length;
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const sorted = [...vals].sort((a, b) => a - b);
    const median = count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
    const min = sorted[0];
    const max = sorted[count - 1];
    const variance = vals.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count > 1 ? count - 1 : 1);
    const actualStdev = Math.sqrt(variance);
    return { count, mean, median, min, max, actualStdev };
  }, [statistics, activePoints, isolatedPointsInCard.length]);

  const recoveryPct = limits.nominalValue > 0 
    ? ((displayedStats.mean / limits.nominalValue) * 100).toFixed(1) 
    : '100.0';

  // Points to render: if ghost mode is on, render both; otherwise, render only active points
  const pointsToRender = showIsolatedGhost ? validPoints : activePoints;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col font-sans transition-all hover:border-slate-300 dark:hover:border-slate-700">
      {/* ------------------------------------------------------------- */}
      {/* 1. ENTERPRISE HEADER BAR WITH ELEMENT DROPDOWN & STATUS       */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-2 flex-wrap">
        {/* Left: Sample Count Indicator & Isolated Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] font-mono font-medium px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 whitespace-nowrap shrink-0">
            N = {activePoints.length} Data
          </span>

          {/* Isolated Points Counter & Ghost View Toggle */}
          {isolatedPointsInCard.length > 0 && (
            <button
              onClick={() => setShowIsolatedGhost(!showIsolatedGhost)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                showIsolatedGhost
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
              title={showIsolatedGhost ? "Sembunyikan posisi titik terisolasi dari grafik" : "Tampilkan posisi titik terisolasi (Ghost)"}
            >
              <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />
              <span>{isolatedPointsInCard.length} Diisolasi</span>
              <span className="text-[9px] opacity-75">{showIsolatedGhost ? '(Ghost)' : '(Disembunyikan)'}</span>
            </button>
          )}
        </div>

        {/* Center / Right: ELEMENT DROPDOWN, COMPACT UPDATE DATE & FULLSCREEN */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Sleek Neutral Element Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowElementDropdown(!showElementDropdown)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Pilih Unsur Analisis (Semua grafik akan mengikuti unsur terpilih)"
            >
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Unsur:</span>
              <span className="text-xs font-black tracking-wide text-teal-600 dark:text-teal-400">{currentElement}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showElementDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Modal */}
            {showElementDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
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
                      className={`w-full px-3 py-1.5 text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-black'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{el}</span>
                      {isSelected && <span className="text-[10px] text-teal-600 dark:text-teal-400 font-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compact Latest Data Synchronization Indicator */}
          {activePoints.length === 0 ? (
            <span className="px-2 py-1 rounded-lg text-[10.5px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
              No Data
            </span>
          ) : (
            <span 
              className="px-2 py-1 rounded-lg text-[10.5px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
              title={`Data Sinkronisasi Terakhir: ${lastActivePoint?.analyzedAt || lastActivePoint?.date || '-'}`}
            >
              <RefreshCw className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{formattedLastUpdate}</span>
            </span>
          )}

          {/* Fullscreen Modal Trigger Button (Icon Only) */}
          {onOpenFullscreen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFullscreen();
              }}
              className="p-1 px-1.5 rounded-lg text-slate-600 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 transition-all cursor-pointer shadow-2xs flex items-center justify-center group/fs shrink-0"
              title="Perbesar Grafik Layar Penuh (Fullscreen)"
              aria-label="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover/fs:text-teal-600 transition-colors shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. ENTERPRISE SHEWHART QC CONTROL CHART CANVAS               */}
      {/* ------------------------------------------------------------- */}
      <div 
        onClick={() => {
          if (onOpenFullscreen) onOpenFullscreen();
        }}
        className={`p-3 relative bg-slate-50/40 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800 group/chart-canvas ${
          onOpenFullscreen ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors' : ''
        }`}
        title={onOpenFullscreen ? "Klik untuk melihat grafik dalam tampilan Full Screen dengan analisis detail" : undefined}
      >
        {onOpenFullscreen && (
          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover/chart-canvas:opacity-100 transition-opacity bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 pointer-events-none shadow-md backdrop-blur-xs">
            <Maximize2 className="w-3 h-3 text-teal-400" />
            <span>Klik untuk Layar Penuh</span>
          </div>
        )}
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

          {/* Faint Background Grid Lines (Horizontal) */}
          {gridYTicks.map((tickVal, i) => {
            const yPos = getYCoord(tickVal);
            return (
              <line
                key={`grid-line-${i}`}
                x1={padding.left}
                y1={yPos}
                x2={padding.left + plotWidth}
                y2={yPos}
                stroke="#E2E8F0"
                className="dark:stroke-slate-800"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* X-Axis Ticks & Run Indices (overlap prevented) */}
          {xIndices.map((idx) => {
            const xPos = getXCoord(idx);
            return (
              <g key={`xtick-${idx}`}>
                <line
                  x1={xPos}
                  y1={padding.top + plotHeight}
                  x2={xPos}
                  y2={padding.top + plotHeight + 4}
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
          {/* 5 SHEWHART LIMIT LINES WITH LABELS (LEFT: UL/WL/EV/LL, RIGHT: VALUE) */}
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
          {/* Left Label: UL */}
          <text
            x={padding.left - 8}
            y={yUpperAction + 4}
            textAnchor="end"
            className="fill-red-600 dark:fill-red-400 text-[11px] font-black font-sans"
          >
            UL
          </text>
          {/* Right Value */}
          <text
            x={padding.left + plotWidth + 6}
            y={yUpperAction + 3.5}
            className="fill-red-600 dark:fill-red-400 text-[9.5px] font-mono font-bold"
          >
            {limits.upperAction.toFixed(3)}
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
          {/* Left Label: WL */}
          <text
            x={padding.left - 8}
            y={yUpperWarning + 4}
            textAnchor="end"
            className="fill-amber-500 dark:fill-amber-400 text-[11px] font-black font-sans"
          >
            WL
          </text>
          {/* Right Value */}
          <text
            x={padding.left + plotWidth + 6}
            y={yUpperWarning + 3.5}
            className="fill-amber-600 dark:fill-amber-400 text-[9.5px] font-mono font-bold"
          >
            {limits.upperWarning.toFixed(3)}
          </text>

          {/* 3. Center Line (Expected Value) - Emerald Solid */}
          <line
            x1={padding.left}
            y1={yNominal}
            x2={padding.left + plotWidth}
            y2={yNominal}
            stroke="#10B981"
            strokeWidth="2.2"
          />
          {/* Left Label: EV */}
          <text
            x={padding.left - 8}
            y={yNominal + 4}
            textAnchor="end"
            className="fill-emerald-600 dark:fill-emerald-400 text-[11px] font-black font-sans"
          >
            EV
          </text>
          {/* Right Value */}
          <text
            x={padding.left + plotWidth + 6}
            y={yNominal + 3.5}
            className="fill-emerald-600 dark:fill-emerald-400 text-[9.5px] font-mono font-black"
          >
            {limits.nominalValue.toFixed(3)}
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
          {/* Left Label: WL */}
          <text
            x={padding.left - 8}
            y={yLowerWarning + 4}
            textAnchor="end"
            className="fill-amber-500 dark:fill-amber-400 text-[11px] font-black font-sans"
          >
            WL
          </text>
          {/* Right Value */}
          <text
            x={padding.left + plotWidth + 6}
            y={yLowerWarning + 3.5}
            className="fill-amber-600 dark:fill-amber-400 text-[9.5px] font-mono font-bold"
          >
            {limits.lowerWarning.toFixed(3)}
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
          {/* Left Label: LL */}
          <text
            x={padding.left - 8}
            y={yLowerAction + 4}
            textAnchor="end"
            className="fill-red-600 dark:fill-red-400 text-[11px] font-black font-sans"
          >
            LL
          </text>
          {/* Right Value */}
          <text
            x={padding.left + plotWidth + 6}
            y={yLowerAction + 3.5}
            className="fill-red-600 dark:fill-red-400 text-[9.5px] font-mono font-bold"
          >
            {limits.lowerAction.toFixed(3)}
          </text>

          {/* ------------------------------------------------------- */}
          {/* DATA CONNECTING LINE (CONNECTS ACTIVE POINTS ONLY)      */}
          {/* ------------------------------------------------------- */}
          {activePoints.length > 1 && (
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

          {/* ------------------------------------------------------- */}
          {/* DATA POINTS WITH PIN ANNOTATION & CLICK-TO-ISOLATE      */}
          {/* ------------------------------------------------------- */}
          {pointsToRender.map((p) => {
            const cx = getXCoord(p.index);
            const cy = getYCoord(p.value);
            const isHovered = hoveredPoint?.id === p.id || hoveredPoint?.index === p.index;
            const isSelected = selectedPoint?.id === p.id || (selectedPoint?.index === p.index && selectedPoint?.value === p.value);
            const isIsolated = isPointIsolated ? isPointIsolated(p, currentElement) : false;
            const hasAnnotation = Boolean(annotations && annotations[p.index]);

            const sigmaDist = limits.stdevFixed > 0 ? Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) : 0;
            const isAction = sigmaDist > 3.0;
            const isWarning = sigmaDist > 2.0 && sigmaDist <= 3.0;

            const pointColor = isAction ? '#EF4444' : isWarning ? '#F59E0B' : '#0F172A';
            const radius = isSelected ? 5.2 : isHovered ? 4.8 : 3.2;

            return (
              <g 
                key={`point-g-${p.index}-${p.id || ''}`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPoint(isSelected ? null : p);
                }}
              >
                {/* Visual Exclamation Bubble Indicator for points with Annotation */}
                {hasAnnotation && (
                  <g className="pointer-events-none">
                    <polygon
                      points={`${cx - 2.5},${cy - 7.5} ${cx + 2.5},${cy - 7.5} ${cx},${cy - 3}`}
                      fill="#F59E0B"
                    />
                    <circle
                      cx={cx}
                      cy={cy - 12}
                      r={6}
                      fill="#F59E0B"
                      stroke="#FFFFFF"
                      strokeWidth={1.2}
                    />
                    <rect
                      x={cx - 0.75}
                      y={cy - 14.8}
                      width={1.5}
                      height={3.2}
                      rx={0.75}
                      fill="#FFFFFF"
                    />
                    <circle
                      cx={cx}
                      cy={cy - 10}
                      r={0.85}
                      fill="#FFFFFF"
                    />
                  </g>
                )}

                {/* Selected Point Ring */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 4}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={2}
                  />
                )}

                {/* Ghost circle if isolated and ghost view is enabled */}
                {isIsolated ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 1}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={1.8}
                    strokeDasharray="2 2"
                    className="animate-pulse"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={isSelected ? '#2563EB' : isHovered ? '#3B82F6' : pointColor}
                    stroke="#FFFFFF"
                    strokeWidth={isHovered || isSelected ? 2 : 1.2}
                    className={`transition-transform duration-100 ${!isAction && !isWarning ? 'dark:fill-slate-100' : ''}`}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* ------------------------------------------------------- */}
        {/* INTERACTIVE POPOVER ON CLICK (OFF-SPEC & ANNOTATIONS)   */}
        {/* ------------------------------------------------------- */}
        {selectedPoint && (() => {
          const pointSigma = limits.stdevFixed > 0 
            ? ((selectedPoint.value - limits.nominalValue) / limits.stdevFixed) 
            : 0;
          const absSigma = Math.abs(pointSigma);
          const isPointAction = absSigma > 3.0;
          const isPointWarning = absSigma > 2.0 && absSigma <= 3.0;
          const diff = selectedPoint.value - limits.nominalValue;
          const sampleDate = formatPointDisplayDate(selectedPoint.analyzedAt, selectedPoint.date) || `Pengambilan #${selectedPoint.index}`;
          const isIsolated = isPointIsolated ? isPointIsolated(selectedPoint, currentElement) : false;
          const offspecCountInCard = validPoints.filter(p => limits.stdevFixed > 0 && Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) > 2.0).length;
          const pointAnnotation = annotations[selectedPoint.index];

          return (
            <div 
              ref={popoverRef}
              className="absolute top-3 right-4 sm:right-10 bg-white dark:bg-[#1e1e1e] text-slate-800 dark:text-neutral-100 text-xs p-3.5 rounded-xl shadow-2xl pointer-events-auto backdrop-blur-md border-2 border-teal-500/80 dark:border-teal-500/60 font-sans z-40 space-y-2.5 animate-in fade-in zoom-in-95 duration-100 min-w-[270px] max-w-[340px]"
            >
              {/* Header with Title and Close Button */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-700 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${isPointAction ? 'bg-rose-500' : isPointWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="text-[12px] font-bold text-slate-900 dark:text-white">
                    {sampleDate}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300">
                    Run #{selectedPoint.index}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedPoint(null);
                      setEditingAnnotation(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Tutup Popover"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Body: High contrast key-values */}
              <div className="space-y-1 text-[11px] font-mono bg-slate-50 dark:bg-neutral-900/60 p-2 rounded-lg border border-slate-100 dark:border-neutral-800">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400 font-sans">Hasil {currentElement}:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{selectedPoint.value.toFixed(3)} %</span>
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
                  <span className={`font-semibold ${absSigma > 3 ? 'text-rose-600 dark:text-rose-400' : absSigma > 2 ? 'text-amber-600 dark:text-amber-400' : 'text-sky-700 dark:text-sky-400'}`}>
                    {limits.stdevFixed > 0 ? (pointSigma.toFixed(2) + 'σ') : '-'}
                  </span>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-sans font-medium uppercase tracking-wider">Status QC:</span>
                {isPointAction ? (
                  <span className="px-2 py-0.5 rounded-md font-bold bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-950/70 dark:text-rose-200 border border-[#FCA5A5] dark:border-rose-800">
                    Need Re-calibration (&gt;3σ)
                  </span>
                ) : isPointWarning ? (
                  <span className="px-2 py-0.5 rounded-md font-bold bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/70 dark:text-amber-200 border border-[#FCD34D] dark:border-amber-800">
                    WARNING (2σ - 3σ)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md font-bold bg-[#DCFCE7] text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-200 border border-[#86EFAC] dark:border-emerald-800">
                    IN-CONTROL (≤2σ)
                  </span>
                )}
              </div>

              {/* --------------------------------------------------------- */}
              {/* ANOMALY ANNOTATION SECTION (ISSUE, SOLUTION, PIC)         */}
              {/* --------------------------------------------------------- */}
              {pointAnnotation && !editingAnnotation && (
                <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 pb-1">
                    <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300 text-[11px]">
                      <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Catatan Anomali & Tindakan</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingAnnotation(true);
                        setFormIssue(pointAnnotation.issue || '');
                        setFormSolution(pointAnnotation.solution || '');
                        setFormPicNik(pointAnnotation.picNik || '');
                        setFormPicName(pointAnnotation.picName || '');
                        setPicSearchQuery(pointAnnotation.picNik ? `${pointAnnotation.picNik} - ${pointAnnotation.picName}` : '');
                      }}
                      className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-[11px] space-y-1 pt-0.5">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Issue:</span>{' '}
                      <span className="text-slate-900 dark:text-white">{pointAnnotation.issue}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Solution:</span>{' '}
                      <span className="text-slate-900 dark:text-white">{pointAnnotation.solution}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 flex items-center gap-1 font-mono">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>PIC: [{pointAnnotation.picNik}] {pointAnnotation.picName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Editing or Adding Annotation Form */}
              {editingAnnotation && (
                <div className="bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl p-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white text-[11px]">
                    <div className="flex items-center gap-1">
                      <Edit3 className="w-3 h-3 text-teal-600" />
                      <span>Form Catatan Anomali</span>
                    </div>
                    <button
                      onClick={() => setEditingAnnotation(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        Issue / Anomali:
                      </label>
                      <input
                        type="text"
                        value={formIssue}
                        onChange={(e) => setFormIssue(e.target.value)}
                        placeholder="Contoh: Fluktuasi vakum, cup kotor..."
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        Solution / Tindakan:
                      </label>
                      <input
                        type="text"
                        value={formSolution}
                        onChange={(e) => setFormSolution(e.target.value)}
                        placeholder="Contoh: Re-cleaning cup, re-pellet..."
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>

                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        PIC (Cari dari NIK / Nama):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={picSearchQuery}
                          onChange={(e) => {
                            setPicSearchQuery(e.target.value);
                            setShowPicDropdown(true);
                          }}
                          onFocus={() => setShowPicDropdown(true)}
                          placeholder="Ketik NIK atau Nama..."
                          className="w-full pl-6 pr-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 outline-none font-mono"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-1.5 top-1.5" />
                      </div>

                      {/* Dropdown Employee List */}
                      {showPicDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-700">
                          {filteredEmployees.length === 0 ? (
                            <div className="p-2 text-[10px] text-slate-400 text-center">
                              Tidak ada karyawan yang cocok
                            </div>
                          ) : (
                            filteredEmployees.map((emp) => (
                              <button
                                key={`emp-pick-${emp.nik}`}
                                type="button"
                                onClick={() => {
                                  setFormPicNik(emp.nik);
                                  setFormPicName(emp.nama);
                                  setPicSearchQuery(`${emp.nik} - ${emp.nama}`);
                                  setShowPicDropdown(false);
                                }}
                                className="w-full p-1.5 text-left hover:bg-teal-50 dark:hover:bg-teal-950/40 text-xs flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-100">{emp.nama}</div>
                                  <div className="text-[10px] font-mono text-slate-400">NIK: {emp.nik} {emp.jabatan ? `• ${emp.jabatan}` : ''}</div>
                                </div>
                                {formPicNik === emp.nik && <Check className="w-3.5 h-3.5 text-teal-600" />}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        if (!formIssue.trim() && !formSolution.trim()) {
                          toast.error('Harap isi Issue atau Solution');
                          return;
                        }
                        if (onSaveAnnotation) {
                          onSaveAnnotation(selectedPoint.index, {
                            issue: formIssue,
                            solution: formSolution,
                            picNik: formPicNik,
                            picName: formPicName,
                          });
                        }
                        setEditingAnnotation(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Simpan Catatan</span>
                    </button>

                    {pointAnnotation && (
                      <button
                        onClick={() => {
                          if (onDeleteAnnotation) {
                            onDeleteAnnotation(selectedPoint.index);
                          }
                          setEditingAnnotation(false);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Hapus Catatan Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setEditingAnnotation(false)}
                      className="py-1 px-2 rounded-lg bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {!pointAnnotation && !editingAnnotation && (
                <button
                  onClick={() => {
                    setEditingAnnotation(true);
                    setFormIssue('');
                    setFormSolution('');
                    setFormPicNik('');
                    setFormPicName('');
                    setPicSearchQuery('');
                  }}
                  className="w-full py-1 px-2 rounded-lg text-[10.5px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Pin className="w-3 h-3" />
                  <span>+ Tambah Catatan Anomali (Issue, Solution, PIC)</span>
                </button>
              )}

              {/* Actions: Isolate Point, Open Offspec Modal, Isolate All in Card */}
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-700 space-y-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canTakeOutOffspec) {
                      toast.error("Akses Ditolak: Fitur Take Out data off-spec hanya diizinkan untuk SPV & SPT Lab, Developer, dan Manager.");
                      return;
                    }
                    if (onToggleIsolatePoint) {
                      onToggleIsolatePoint(selectedPoint, currentElement, limits);
                    }
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    !canTakeOutOffspec
                      ? 'bg-slate-100 dark:bg-neutral-800 text-slate-500 border border-slate-300 dark:border-neutral-700 opacity-80'
                      : isIsolated
                      ? 'bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-100 border border-slate-300 dark:border-neutral-600'
                      : 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-700'
                  }`}
                  title={!canTakeOutOffspec ? "Hanya SPV & SPT Lab, Developer, dan Manager yang memiliki izin Take Out data" : undefined}
                >
                  {!canTakeOutOffspec ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Take Out (Khusus SPV/SPT/Dev/Mgr)</span>
                    </>
                  ) : isIsolated ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kembalikan Titik ke Chart Utama</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Isolasi Titik Ini ke Chart Off-Spec</span>
                    </>
                  )}
                </button>

                {onOpenOffspecModal && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOffspecModal();
                    }}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-slate-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Chart Isolasi Off-Spec</span>
                  </button>
                )}

                {onIsolateAllOffspecInCard && offspecCountInCard > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canTakeOutOffspec) {
                        toast.error("Akses Ditolak: Fitur Take Out data off-spec hanya diizinkan untuk SPV & SPT Lab, Developer, dan Manager.");
                        return;
                      }
                      onIsolateAllOffspecInCard(validPoints, currentElement, limits);
                    }}
                    className="w-full py-1 px-2 rounded-lg text-[10.5px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Isolasi Semua Off-Spec di Standar Ini ({offspecCountInCard})</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ------------------------------------------------------- */}
        {/* NOTION-STYLE FLOATING POPUP / TOOLTIP (HOVER STATE)     */}
        {/* ------------------------------------------------------- */}
        {!selectedPoint && hoveredPoint && (() => {
          const pointSigma = limits.stdevFixed > 0 
            ? ((hoveredPoint.value - limits.nominalValue) / limits.stdevFixed) 
            : 0;
          const absSigma = Math.abs(pointSigma);
          const isPointAction = absSigma > 3.0;
          const isPointWarning = absSigma > 2.0 && absSigma <= 3.0;
          const diff = hoveredPoint.value - limits.nominalValue;
          const sampleDate = formatPointDisplayDate(hoveredPoint.analyzedAt, hoveredPoint.date) || `Pengambilan #${hoveredPoint.index}`;
          const pointAnn = annotations[hoveredPoint.index];

          return (
            <div className="absolute top-4 right-14 bg-white/95 dark:bg-[#222222]/95 text-slate-800 dark:text-neutral-100 text-xs p-3.5 rounded-xl shadow-xl pointer-events-none backdrop-blur-md border border-slate-200 dark:border-neutral-700 font-sans z-30 space-y-2 animate-in fade-in zoom-in-95 duration-100 min-w-[220px]">
              {/* Header: Date & Time as primary title */}
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

              {/* Status Pill */}
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

              {/* Tooltip Note indicator if exists */}
              {pointAnn && (
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[10px] space-y-0.5">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5" />
                    <span>Catatan Anomali:</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 truncate">
                    <span className="font-semibold">Issue:</span> {pointAnn.issue}
                  </div>
                  {pointAnn.picName && (
                    <div className="text-slate-500 font-mono text-[9px]">
                      PIC: [{pointAnn.picNik}] {pointAnn.picName}
                    </div>
                  )}
                </div>
              )}

              {/* Hint to click */}
              <div className="text-[9.5px] text-center text-slate-400 dark:text-neutral-500 pt-1 border-t border-slate-100 dark:border-neutral-700/60 font-sans">
                👆 Klik titik untuk opsi isolasi & catatan
              </div>
            </div>
          );
        })()}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. ENTERPRISE STATISTICAL SUMMARY KPI ROW (RECALCULATED)       */}
      {/* ------------------------------------------------------------- */}
      {showStats && (
        <div className={`p-3 text-xs bg-white dark:bg-slate-900 ${
          compactStats 
            ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]' 
            : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2'
        }`}>
          {/* KPI 1: Target Nominal */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target (CL)</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">
              {limits.nominalValue.toFixed(3)}
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">σ Acuan = {limits.stdevFixed.toFixed(3)}</div>
          </div>

          {/* KPI 2: Mean Rata-rata */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mean (x̄)</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">
              {displayedStats.mean.toFixed(3)}
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">Median = {displayedStats.median.toFixed(3)}</div>
          </div>

          {/* KPI 3: Actual Stdev */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actual Std (s)</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">
              {displayedStats.actualStdev.toFixed(3)}
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
              {displayedStats.actualStdev <= limits.stdevFixed ? "Presisi Optimal" : "Deviasi Tinggi"}
            </div>
          </div>

          {/* KPI 4: Min - Max */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rentang (Min-Max)</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-1">
              {displayedStats.min.toFixed(2)} - {displayedStats.max.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">Range = {(displayedStats.max - displayedStats.min).toFixed(2)}</div>
          </div>

          {/* KPI 5: Recovery / Bias */}
          {!compactStats && (
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovery %</div>
              <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {recoveryPct} %
              </div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">Bias: {(displayedStats.mean - limits.nominalValue).toFixed(3)}</div>
            </div>
          )}

          {/* KPI 6: Total Points & Capability */}
          {!compactStats && (
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Sampel Aktif</div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                {activePoints.length} Data
              </div>
              <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {isolatedPointsInCard.length > 0 ? `${isolatedPointsInCard.length} Titik Terisolasi` : '100% Data Lengkap'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

XrfQcChartCard.displayName = 'XrfQcChartCard';
