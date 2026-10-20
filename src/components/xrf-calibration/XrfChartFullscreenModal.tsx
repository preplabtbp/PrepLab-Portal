import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Maximize2, Minimize2, Download, Table, Activity, 
  AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, 
  ShieldAlert, RefreshCw, Layers, Sparkles, Filter, 
  Eye, EyeOff, Sliders, ChevronDown, Calendar, Search, 
  TrendingUp, FileSpreadsheet, Info, Check, ArrowUpDown,
  FileDown, ZoomIn, Lock, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  XrfChartLimitData, 
  XrfChartStatData, 
  XrfPointData, 
  XrfPointAnnotation, 
  QC_ELEMENTS_LIST 
} from './XrfQcChartCard';

export interface XrfChartFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  standardCode: string;
  instrumentName: string;
  instrumentCode: string;
  headerColorClass?: string;
  currentElement: string;
  onSelectElement?: (el: string) => void;
  limits: XrfChartLimitData;
  statistics: XrfChartStatData;
  points: XrfPointData[];
  canTakeOutOffspec?: boolean;
  userRoleTitle?: string;
  onToggleIsolatePoint?: (point: XrfPointData, element: string, limits: XrfChartLimitData) => void;
  isPointIsolated?: (point: XrfPointData, element: string) => boolean;
  annotations?: Record<number, XrfPointAnnotation>;
  onSaveAnnotation?: (pointIndex: number, annotation: XrfPointAnnotation) => void;
  onDeleteAnnotation?: (pointIndex: number) => void;
  availableStandards?: Array<{ code: string; name: string }>;
  onSelectStandard?: (code: string) => void;
}

export function XrfChartFullscreenModal({
  isOpen,
  onClose,
  standardCode,
  instrumentName,
  instrumentCode,
  headerColorClass = 'bg-teal-600 text-white',
  currentElement,
  onSelectElement,
  limits,
  statistics,
  points,
  canTakeOutOffspec = true,
  userRoleTitle,
  onToggleIsolatePoint,
  isPointIsolated,
  annotations = {},
  onSaveAnnotation,
  onDeleteAnnotation,
  availableStandards,
  onSelectStandard
}: XrfChartFullscreenModalProps) {
  // Chart View Controls
  const [showWarningLimits, setShowWarningLimits] = useState<boolean>(true);
  const [showActionLimits, setShowActionLimits] = useState<boolean>(true);
  const [showNominalLine, setShowNominalLine] = useState<boolean>(true);
  const [showTrendLine, setShowTrendLine] = useState<boolean>(true);
  const [showDataLabels, setShowDataLabels] = useState<boolean>(false);
  const [showIsolatedGhost, setShowIsolatedGhost] = useState<boolean>(true);
  const [sliceCount, setSliceCount] = useState<'all' | '10' | '20' | '30' | '50'>('all');
  
  // Active Tab below chart
  const [activeBottomTab, setActiveBottomTab] = useState<'stats' | 'table' | 'spc-rules' | 'notes'>('stats');

  // Selected Point for Detailed Inspector
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'all' | 'normal' | 'warning' | 'action' | 'isolated'>('all');
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  // Hovered Point for Floating Tooltip / Catatan Inspector
  const [hoveredPointData, setHoveredPointData] = useState<{
    point: XrfPointData;
    xCoord: number;
    yCoord: number;
    annotation?: XrfPointAnnotation;
  } | null>(null);

  // Note form state
  const [noteIssue, setNoteIssue] = useState<string>('');
  const [noteSolution, setNoteSolution] = useState<string>('');
  const [notePicName, setNotePicName] = useState<string>('');

  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Synchronize note form when selected point changes
  useEffect(() => {
    if (selectedPointIndex !== null && annotations[selectedPointIndex]) {
      const ann = annotations[selectedPointIndex];
      setNoteIssue(ann.issue || '');
      setNoteSolution(ann.solution || '');
      setNotePicName(ann.picName || '');
    } else {
      setNoteIssue('');
      setNoteSolution('');
      setNotePicName('');
    }
  }, [selectedPointIndex, annotations]);

  // -------------------------------------------------------------
  // DATA FILTERING & SLICING
  // -------------------------------------------------------------
  const validPoints = useMemo(() => {
    return points.filter(p => typeof p.value === 'number' && !isNaN(p.value));
  }, [points]);

  const slicedPoints = useMemo(() => {
    if (sliceCount === 'all') return validPoints;
    const n = parseInt(sliceCount, 10);
    return validPoints.slice(-n);
  }, [validPoints, sliceCount]);

  const activePoints = useMemo(() => {
    return slicedPoints.filter(p => !isPointIsolated || !isPointIsolated(p, currentElement));
  }, [slicedPoints, isPointIsolated, currentElement]);

  const isolatedPointsInView = useMemo(() => {
    return slicedPoints.filter(p => isPointIsolated ? isPointIsolated(p, currentElement) : false);
  }, [slicedPoints, isPointIsolated, currentElement]);

  // Dynamic Statistics
  const dynamicStats = useMemo(() => {
    if (activePoints.length === 0) return statistics;
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
  }, [activePoints, statistics]);

  const recoveryPct = limits.nominalValue > 0 
    ? ((dynamicStats.mean / limits.nominalValue) * 100).toFixed(2) 
    : '100.00';

  const rsdPct = dynamicStats.mean > 0 
    ? ((dynamicStats.actualStdev / dynamicStats.mean) * 100).toFixed(2) 
    : '0.00';

  const precisionRatio = limits.stdevFixed > 0
    ? (dynamicStats.actualStdev / limits.stdevFixed).toFixed(2)
    : '1.00';

  // Latest Point status
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
      const cleanStr = str.replace('T', ' ');
      const [datePart, timePart] = cleanStr.split(' ');
      const dateSegments = datePart.split('-');
      if (dateSegments.length === 3) {
        const [y, m, d] = dateSegments;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const mIdx = parseInt(m, 10) - 1;
        const mStr = monthNames[mIdx] || m;
        const timeClean = timePart ? timePart.slice(0, 5) : '';
        return timeClean ? `${d} ${mStr} ${y} ${timeClean}` : `${d} ${mStr} ${y}`;
      }
      return str;
    } catch {
      return str;
    }
  }, [lastActivePoint]);

  // Western Electric Rules Evaluation
  const spcDiagnostics = useMemo(() => {
    const issues: string[] = [];
    const passedRules: string[] = [];

    // Rule 1: Point outside 3-sigma
    const outOf3s = activePoints.filter(p => limits.stdevFixed > 0 && Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) > 3.0);
    if (outOf3s.length > 0) {
      issues.push(`Aturan 1 (Kritis): Terdeteksi ${outOf3s.length} titik pengukuran berada di luar batas kendali 3-sigma.`);
    } else {
      passedRules.push('Aturan 1 (Batas 3-sigma): Seluruh titik berada dalam batas kendali kritis.');
    }

    // Rule 2: 2 of 3 consecutive points beyond 2-sigma
    let r2Triggered = false;
    for (let i = 0; i <= activePoints.length - 3; i++) {
      const window = activePoints.slice(i, i + 3);
      const beyond2s = window.filter(p => limits.stdevFixed > 0 && Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) > 2.0);
      if (beyond2s.length >= 2) {
        r2Triggered = true;
        break;
      }
    }
    if (r2Triggered) {
      issues.push('Aturan 2 (Peringatan): 2 dari 3 titik berurutan berada di zona warning (> 2-sigma). Indikasi potensi pergeseran kalibrasi.');
    } else {
      passedRules.push('Aturan 2: Tidak ada rentetan titik di zona peringatan 2-sigma.');
    }

    // Rule 3: Run of 7+ points on one side of center line (Drift / Bias)
    let maxRun = 0;
    let currentRun = 0;
    let currentSign = 0;
    activePoints.forEach(p => {
      const diff = p.value - limits.nominalValue;
      const sign = diff >= 0 ? 1 : -1;
      if (sign === currentSign) {
        currentRun++;
      } else {
        currentSign = sign;
        currentRun = 1;
      }
      if (currentRun > maxRun) maxRun = currentRun;
    });

    if (maxRun >= 7) {
      issues.push(`Aturan 3 (Bias / Drift): Terdeteksi run ${maxRun} titik berturut-turut pada sisi garis tengah yang sama. Terindikasi bias sistematik.`);
    } else {
      passedRules.push(`Aturan 3 (Stabilitas Sentral): Maksimum rentetan searah ${maxRun} titik (< 7 titik, stabil).`);
    }

    return { issues, passedRules, maxRun, outOf3sCount: outOf3s.length };
  }, [activePoints, limits]);

  // -------------------------------------------------------------
  // HIGH-RESOLUTION SVG CHART GEOMETRY
  // -------------------------------------------------------------
  const svgWidth = 1100;
  const svgHeight = 480;
  const padding = { top: 35, right: 110, bottom: 50, left: 75 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

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
  const yDomainMin = Number((yMinData - marginY).toFixed(4));
  const yDomainMax = Number((yMaxData + marginY).toFixed(4));
  const yRange = yDomainMax - yDomainMin || 1;

  const getYCoord = (val: number) => {
    const clamped = Math.max(yDomainMin, Math.min(yDomainMax, val));
    const ratio = (clamped - yDomainMin) / yRange;
    return padding.top + plotHeight - ratio * plotHeight;
  };

  const numPoints = Math.max(slicedPoints.length, 10);
  const getXCoord = (indexInSlice: number) => {
    if (numPoints <= 1) return padding.left + plotWidth / 2;
    return padding.left + ((indexInSlice - 1) / (numPoints - 1)) * plotWidth;
  };

  const gridYTicks = [
    yDomainMin,
    yDomainMin + yRange * 0.25,
    yDomainMin + yRange * 0.5,
    yDomainMin + yRange * 0.75,
    yDomainMax,
  ];

  const yUpperAction = getYCoord(limits.upperAction);
  const yUpperWarning = getYCoord(limits.upperWarning);
  const yNominal = getYCoord(limits.nominalValue);
  const yLowerWarning = getYCoord(limits.lowerWarning);
  const yLowerAction = getYCoord(limits.lowerAction);

  // SVG Path for Active Points
  const pathD = activePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getXCoord(i + 1).toFixed(1)} ${getYCoord(p.value).toFixed(1)}`)
    .join(' ');

  // 3-Point Moving Average Line Path
  const movingAvgPathD = useMemo(() => {
    if (activePoints.length < 3 || !showTrendLine) return '';
    const avgPts: Array<{ x: number; y: number }> = [];
    for (let i = 1; i < activePoints.length - 1; i++) {
      const avg = (activePoints[i - 1].value + activePoints[i].value + activePoints[i + 1].value) / 3;
      avgPts.push({ x: getXCoord(i + 1), y: getYCoord(avg) });
    }
    return avgPts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [activePoints, showTrendLine]);

  // Points to render:
  const pointsToRender = showIsolatedGhost ? slicedPoints : activePoints;

  // Selected Point Object
  const selectedPointObj = useMemo(() => {
    if (selectedPointIndex === null) return null;
    return validPoints.find(p => p.index === selectedPointIndex) || null;
  }, [selectedPointIndex, validPoints]);

  // -------------------------------------------------------------
  // EXPORT HANDLERS
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    try {
      const headers = ['No', 'Tanggal', 'Waktu Analisis', 'Unsur', 'Nilai Terukur (%)', 'Target CRM (%)', 'Selisih', 'Jarak Sigma (Z)', 'Status', 'Catatan'];
      const rows = validPoints.map(p => {
        const isIso = isPointIsolated ? isPointIsolated(p, currentElement) : false;
        const diff = p.value - limits.nominalValue;
        const z = limits.stdevFixed > 0 ? (diff / limits.stdevFixed).toFixed(2) : '0';
        let st = 'In-Control';
        if (isIso) st = 'Diisolasi';
        else if (Math.abs(Number(z)) > 3.0) st = 'Action (>3s)';
        else if (Math.abs(Number(z)) > 2.0) st = 'Warning (2-3s)';
        
        const ann = annotations[p.index];
        const note = ann ? `[${ann.picName || '-'}] ${ann.issue || ''}: ${ann.solution || ''}` : '-';

        return [
          p.index,
          p.date || '-',
          p.analyzedAt ? new Date(p.analyzedAt).toLocaleString('id-ID') : '-',
          currentElement,
          p.value.toFixed(4),
          limits.nominalValue.toFixed(4),
          diff.toFixed(4),
          z,
          st,
          `"${note.replace(/"/g, '""')}"`
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `QC_CHART_${instrumentCode}_${standardCode}_${currentElement}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('File data CSV berhasil diunduh!');
    } catch {
      toast.error('Gagal mengekspor data CSV');
    }
  };

  const handleExportPNG = async () => {
    if (!chartContainerRef.current) return;
    setIsExportingImage(true);
    const toastId = toast.loading('Mengambil tangkapan gambar grafik kualitas tinggi...');

    try {
      // Dynamic import to prevent SSR/bundle issues
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(chartContainerRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#0f172a'
      });
      const link = document.createElement('a');
      link.download = `GRAFIK_KONTROL_${instrumentCode}_${standardCode}_${currentElement}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Gambar grafik berhasil diunduh (.png)!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil tangkapan gambar grafik', { id: toastId });
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleSaveCurrentNote = () => {
    if (selectedPointIndex === null || !onSaveAnnotation) return;
    onSaveAnnotation(selectedPointIndex, {
      issue: noteIssue.trim(),
      solution: noteSolution.trim(),
      picNik: '',
      picName: notePicName.trim() || 'Analis Lab',
      updatedAt: new Date().toISOString()
    });
    toast.success(`Catatan anomali untuk titik #${selectedPointIndex} berhasil disimpan!`);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full max-w-7xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* ========================================================= */}
        {/* 1. ENTERPRISE FULLSCREEN HEADER BAR                       */}
        {/* ========================================================= */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Instrument & Standard Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs ${headerColorClass}`}>
              {instrumentName}
            </div>

            <div className="px-3 py-1 rounded-xl text-xs font-black bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 tracking-wider shadow-xs">
              STANDAR: {standardCode}
            </div>

            {/* Last Data Update Pill */}
            {activePoints.length === 0 ? (
              <span className="px-2.5 py-0.8 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Belum Ada Data
              </span>
            ) : (
              <span 
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
                title={`Data Sinkronisasi Terakhir: ${lastActivePoint?.analyzedAt || lastActivePoint?.date || '-'}`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formattedLastUpdate}</span>
              </span>
            )}
          </div>

          {/* Right: Export & Close Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPNG}
              disabled={isExportingImage}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-500 dark:hover:border-teal-400 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Unduh Gambar Grafik PNG Berkualitas Tinggi"
            >
              <FileDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Unduh PNG</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Ekspor Data Pengukuran ke Spreadsheet CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Tampilan Layar Penuh (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. ELEMENT PILL BAR & VIEW CONFIGURATION BAR              */}
        {/* ========================================================= */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex items-center justify-between gap-4 flex-wrap">
          {/* Element Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Unsur:
            </span>
            {QC_ELEMENTS_LIST.map((el) => {
              const isSelected = currentElement === el;
              return (
                <button
                  key={`fs-el-${el}`}
                  onClick={() => onSelectElement && onSelectElement(el)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs scale-105 ring-2 ring-teal-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {el}
                </button>
              );
            })}
          </div>

          {/* Quick Slice & View Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Slice Count */}
            <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold px-1.5">Rentang:</span>
              {(['all', '10', '20', '30', '50'] as const).map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => setSliceCount(cnt)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sliceCount === cnt
                      ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {cnt === 'all' ? 'Semua' : `${cnt} Terakhir`}
                </button>
              ))}
            </div>

            {/* Toggle Action & Warning Limits */}
            <button
              onClick={() => setShowActionLimits(!showActionLimits)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showActionLimits
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span>±3σ Action</span>
            </button>

            <button
              onClick={() => setShowWarningLimits(!showWarningLimits)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showWarningLimits
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>±2σ Warning</span>
            </button>

            <button
              onClick={() => setShowTrendLine(!showTrendLine)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showTrendLine
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-indigo-500" />
              <span>Trendline</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. MAIN SCROLLABLE CONTENT (LARGE CHART + TABS)            */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* HIGH-RES SVG CHART CARD */}
          <div 
            ref={chartContainerRef}
            className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden"
          >
            {/* Top Chart Overlay Info */}
            <div className="flex items-center justify-between pb-3 text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800 mb-2">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide">
                  {instrumentName} • {standardCode} • Unsur {currentElement}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                  Target CRM: <strong className="text-emerald-600 dark:text-emerald-400">{limits.nominalValue.toFixed(4)}%</strong> (±{limits.stdevFixed.toFixed(4)})
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span>Rata-rata: <strong className="text-cyan-600 dark:text-cyan-400">{dynamicStats.mean.toFixed(4)}%</strong></span>
                <span>Recovery: <strong className="text-teal-600 dark:text-teal-400">{recoveryPct}%</strong></span>
                <span>Titik: <strong className="text-slate-900 dark:text-white">{activePoints.length}</strong> / {slicedPoints.length}</span>
              </div>
            </div>

            {/* SVG Visualizer Wrapper */}
            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto select-none overflow-visible max-h-[500px]"
              >
                <defs>
                  <filter id="bubbleShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.3" floodColor="#000000" />
                  </filter>
                  <linearGradient id="exclamationGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>
              {/* Background Canvas Card */}
              <rect
                x={padding.left}
                y={padding.top}
                width={plotWidth}
                height={plotHeight}
                fill="#FFFFFF"
                stroke="#CBD5E1"
                className="dark:fill-slate-950 dark:stroke-slate-800"
                strokeWidth="1.2"
                rx="6"
              />

              {/* Safe Green Band (-2s to +2s) */}
              {showWarningLimits && yUpperWarning < yLowerWarning && (
                <rect
                  x={padding.left}
                  y={yUpperWarning}
                  width={plotWidth}
                  height={Math.max(0, yLowerWarning - yUpperWarning)}
                  fill="#10b981"
                  fillOpacity="0.08"
                />
              )}

              {/* Warning Upper Band (+2s to +3s) */}
              {showWarningLimits && showActionLimits && yUpperAction < yUpperWarning && (
                <rect
                  x={padding.left}
                  y={yUpperAction}
                  width={plotWidth}
                  height={Math.max(0, yUpperWarning - yUpperAction)}
                  fill="#f59e0b"
                  fillOpacity="0.06"
                />
              )}

              {/* Warning Lower Band (-3s to -2s) */}
              {showWarningLimits && showActionLimits && yLowerWarning < yLowerAction && (
                <rect
                  x={padding.left}
                  y={yLowerWarning}
                  width={plotWidth}
                  height={Math.max(0, yLowerAction - yLowerWarning)}
                  fill="#f59e0b"
                  fillOpacity="0.06"
                />
              )}

              {/* Horizontal Grid Ticks */}
              {gridYTicks.map((tickVal, i) => {
                const yPos = getYCoord(tickVal);
                return (
                  <g key={`grid-y-${i}`}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={padding.left + plotWidth}
                      y2={yPos}
                      stroke="#E2E8F0"
                      className="dark:stroke-slate-800/80"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 10}
                      y={yPos + 4}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {tickVal.toFixed(3)}
                    </text>
                  </g>
                );
              })}

              {/* Control Limit Reference Lines */}
              {/* +3 Sigma Action (Red Dashed) */}
              {showActionLimits && (
                <g>
                  <line
                    x1={padding.left}
                    y1={yUpperAction}
                    x2={padding.left + plotWidth}
                    y2={yUpperAction}
                    stroke="#ef4444"
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                  />
                  <text
                    x={padding.left + plotWidth + 8}
                    y={yUpperAction + 4}
                    fill="#f87171"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    +3σ ({limits.upperAction.toFixed(3)})
                  </text>
                </g>
              )}

              {/* +2 Sigma Warning (Amber Dotted) */}
              {showWarningLimits && (
                <g>
                  <line
                    x1={padding.left}
                    y1={yUpperWarning}
                    x2={padding.left + plotWidth}
                    y2={yUpperWarning}
                    stroke="#f59e0b"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left + plotWidth + 8}
                    y={yUpperWarning + 4}
                    fill="#fbbf24"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    +2σ ({limits.upperWarning.toFixed(3)})
                  </text>
                </g>
              )}

              {/* Nominal / Target Line (Solid Cyan/Green) */}
              {showNominalLine && (
                <g>
                  <line
                    x1={padding.left}
                    y1={yNominal}
                    x2={padding.left + plotWidth}
                    y2={yNominal}
                    stroke="#06b6d4"
                    strokeWidth="2.2"
                  />
                  <text
                    x={padding.left + plotWidth + 8}
                    y={yNominal + 4}
                    fill="#22d3ee"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="black"
                  >
                    TARGET ({limits.nominalValue.toFixed(3)})
                  </text>
                </g>
              )}

              {/* -2 Sigma Warning (Amber Dotted) */}
              {showWarningLimits && (
                <g>
                  <line
                    x1={padding.left}
                    y1={yLowerWarning}
                    x2={padding.left + plotWidth}
                    y2={yLowerWarning}
                    stroke="#f59e0b"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left + plotWidth + 8}
                    y={yLowerWarning + 4}
                    fill="#fbbf24"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    -2σ ({limits.lowerWarning.toFixed(3)})
                  </text>
                </g>
              )}

              {/* -3 Sigma Action (Red Dashed) */}
              {showActionLimits && (
                <g>
                  <line
                    x1={padding.left}
                    y1={yLowerAction}
                    x2={padding.left + plotWidth}
                    y2={yLowerAction}
                    stroke="#ef4444"
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                  />
                  <text
                    x={padding.left + plotWidth + 8}
                    y={yLowerAction + 4}
                    fill="#f87171"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    -3σ ({limits.lowerAction.toFixed(3)})
                  </text>
                </g>
              )}

              {/* Moving Average Trendline (Purple/Indigo) */}
              {movingAvgPathD && (
                <path
                  d={movingAvgPathD}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
              )}

              {/* Active Points Connection Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  className="transition-all"
                />
              )}

              {/* Data Points */}
              {pointsToRender.map((p, i) => {
                const isIso = isPointIsolated ? isPointIsolated(p, currentElement) : false;
                const xCoord = getXCoord(i + 1);
                const yCoord = getYCoord(p.value);
                const diff = p.value - limits.nominalValue;
                const sigmaDist = limits.stdevFixed > 0 ? Math.abs(diff / limits.stdevFixed) : 0;
                const isAction = sigmaDist > 3.0;
                const isWarn = sigmaDist > 2.0 && sigmaDist <= 3.0;

                const fillColor = isIso 
                  ? '#64748b' 
                  : isAction 
                  ? '#ef4444' 
                  : isWarn 
                  ? '#f59e0b' 
                  : '#10b981';

                const isSelected = selectedPointIndex === p.index;
                const pointAnn = (annotations && annotations[p.index]) || (p as any).annotation;
                const hasAnnotation = Boolean(
                  pointAnn && (
                    pointAnn.issue ||
                    pointAnn.solution ||
                    pointAnn.picName ||
                    (pointAnn as any).note ||
                    (pointAnn as any).catatan ||
                    Object.keys(pointAnn).length > 0
                  )
                );

                const isNearTop = yCoord - 24 < padding.top;
                const bubbleY = isNearTop ? yCoord + 20 : yCoord - 20;

                return (
                  <g 
                    key={`point-${p.index}-${i}`}
                    className="cursor-pointer group/dot"
                    onClick={() => {
                      setSelectedPointIndex(p.index);
                      setActiveBottomTab('notes');
                    }}
                    onMouseEnter={() => {
                      setHoveredPointData({
                        point: p,
                        xCoord,
                        yCoord,
                        annotation: pointAnn
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredPointData(null);
                    }}
                  >
                    {/* Outer Glow / Ring on hover or selection */}
                    <circle
                      cx={xCoord}
                      cy={yCoord}
                      r={isSelected ? 10 : 8}
                      fill={fillColor}
                      fillOpacity={isSelected ? 0.35 : 0}
                      className="group-hover/dot:fill-opacity-30 transition-all"
                    />

                    {/* Point Circle */}
                    <circle
                      cx={xCoord}
                      cy={yCoord}
                      r={isSelected ? 6 : 4.5}
                      fill={fillColor}
                      stroke={isSelected ? '#ffffff' : '#0f172a'}
                      strokeWidth={isSelected ? 2 : 1.5}
                      strokeDasharray={isIso ? '2 2' : 'none'}
                      className="transition-all"
                    />

                    {/* BUBBLE TANDA SERU JIKA MEMILIKI CATATAN */}
                    {hasAnnotation && (
                      <g className="cursor-pointer transition-transform duration-200 hover:scale-125 origin-center">
                        {/* Triangle pointer connecting bubble to data point */}
                        <polygon
                          points={
                            isNearTop
                              ? `${xCoord - 3.5},${bubbleY - 7} ${xCoord + 3.5},${bubbleY - 7} ${xCoord},${yCoord + 5}`
                              : `${xCoord - 3.5},${bubbleY + 7} ${xCoord + 3.5},${bubbleY + 7} ${xCoord},${yCoord - 5}`
                          }
                          fill="#F59E0B"
                          stroke="#FFFFFF"
                          strokeWidth="0.8"
                        />

                        {/* Subtle Animated Pulsing Ring */}
                        <circle
                          cx={xCoord}
                          cy={bubbleY}
                          r="9.5"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="1.2"
                          className="animate-ping opacity-40"
                        />

                        {/* Main Bubble Circle */}
                        <circle
                          cx={xCoord}
                          cy={bubbleY}
                          r="9"
                          fill="url(#exclamationGrad)"
                          stroke="#FFFFFF"
                          strokeWidth="1.6"
                          filter="url(#bubbleShadow)"
                        />

                        {/* Exclamation mark '!' (Vertical rounded bar + dot) */}
                        <rect
                          x={xCoord - 1.1}
                          y={bubbleY - 5}
                          width="2.2"
                          height="5"
                          rx="1.1"
                          fill="#FFFFFF"
                        />
                        <circle
                          cx={xCoord}
                          cy={bubbleY + 2.7}
                          r="1.25"
                          fill="#FFFFFF"
                        />
                      </g>
                    )}

                    {/* X-Axis Tick Label */}
                    <text
                      x={xCoord}
                      y={padding.top + plotHeight + 18}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      #{p.index}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* FLOATING DETAIL CATATAN & POINT INSPECTOR TOOLTIP */}
            {hoveredPointData && (() => {
              const { point, xCoord, yCoord, annotation } = hoveredPointData;
              const leftPct = (xCoord / svgWidth) * 100;
              const topPct = (yCoord / svgHeight) * 100;

              const diff = point.value - limits.nominalValue;
              const sigmaDist = limits.stdevFixed > 0 ? Math.abs(diff / limits.stdevFixed) : 0;
              const hasAnn = Boolean(
                annotation && (
                  annotation.issue ||
                  annotation.solution ||
                  annotation.picName ||
                  (annotation as any).note ||
                  (annotation as any).catatan ||
                  Object.keys(annotation).length > 0
                )
              );

              // Horizontal smart clamping
              const isRightSide = xCoord > 750;
              const isLeftSide = xCoord < 350;
              const horizontalTransform = isRightSide
                ? '-translate-x-[calc(100%+12px)]'
                : isLeftSide
                ? 'translate-x-3'
                : '-translate-x-1/2';

              // Vertical smart clamping
              const isNearTopEdge = yCoord < 190;
              const verticalTransform = isNearTopEdge ? 'translate-y-5' : '-translate-y-[calc(100%+22px)]';

              return (
                <div
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                  }}
                  className={`absolute z-40 pointer-events-none transition-all duration-75 ${horizontalTransform} ${verticalTransform}`}
                >
                  {hasAnn ? (
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/80 dark:border-amber-500/80 rounded-2xl shadow-2xl p-4 text-xs font-sans max-w-sm w-80 text-slate-900 dark:text-slate-100 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      {/* Header with Exclamation Bubble Badge & Titik Info */}
                      <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                            !
                          </span>
                          <div>
                            <div className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">
                              Catatan Anomali
                            </div>
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                              Pengukuran Titik #{point.index}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                          {point.value.toFixed(4)}%
                        </span>
                      </div>

                      {/* Measurement Quick Info */}
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-xl">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[9.5px] font-sans">Tanggal / Waktu</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                            {point.analyzedAt ? new Date(point.analyzedAt).toLocaleString('id-ID') : (point.date || '-')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[9.5px] font-sans">Deviasi / Sigma</span>
                          <span className={`font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {diff >= 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4)} ({sigmaDist.toFixed(2)}σ)
                          </span>
                        </div>
                      </div>

                      {/* Issue / Masalah Section */}
                      {annotation?.issue && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Masalah / Temuan:</span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 pl-5 leading-relaxed font-medium">
                            {annotation.issue}
                          </p>
                        </div>
                      )}

                      {/* Solution / Tindakan Perbaikan Section */}
                      {annotation?.solution && (
                        <div className="p-2.5 rounded-xl bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 space-y-1">
                          <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span>Tindakan / Solusi:</span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 pl-5 leading-relaxed font-medium">
                            {annotation.solution}
                          </p>
                        </div>
                      )}

                      {/* Footer: PIC & Timestamp */}
                      <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1 font-medium">
                          <span>👤 PIC:</span>
                          <strong className="text-slate-700 dark:text-slate-300">{annotation?.picName || 'Analis Lab'}</strong>
                        </span>
                        {annotation?.updatedAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(annotation.updatedAt).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>

                      {/* Helpful Action Hint */}
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 text-center font-semibold bg-teal-500/10 py-1 px-2 rounded-lg">
                        👆 Klik titik ini untuk mengedit catatan di form bawah
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 text-xs font-sans max-w-xs w-64 text-slate-900 dark:text-slate-100 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                      {/* Standard tooltip for point without note */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className="font-extrabold text-xs">Titik #{point.index}</span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {point.analyzedAt ? new Date(point.analyzedAt).toLocaleDateString('id-ID') : (point.date || '-')}
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Hasil {currentElement}:</span>
                          <span className="font-bold">{point.value.toFixed(4)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Target CRM:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{limits.nominalValue.toFixed(4)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Deviasi / Sigma:</span>
                          <span className={`font-semibold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {diff >= 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4)} ({sigmaDist.toFixed(2)}σ)
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
                        Klik untuk melihat detail & tambah catatan
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

            {/* Bottom Chart Legend */}
            <div className="flex items-center justify-between pt-3 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>In-Control (≤2σ)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Warning (2σ - 3σ)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Action / Need Re-cal (&gt;3σ)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center shadow-2xs">
                    !
                  </span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Ada Catatan (Arahkan kursor)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span>Diisolasi (Ghost)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-indigo-400 border-dashed" />
                  <span>Moving Average 3-titik</span>
                </span>
              </div>
              <span className="italic text-slate-500">
                💡 Klik titik data pada grafik untuk melihat rincian & mencatat tindakan korektif
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. DETAIL TABS (STATISTIK, TABEL DATA, SPC DIAGNOSTIK)     */}
          {/* ========================================================= */}
          <div className="space-y-4">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveBottomTab('stats')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeBottomTab === 'stats'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Statistik & Ringkasan Mutu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('table')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeBottomTab === 'table'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Tabel Data Pengukuran ({validPoints.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('spc-rules')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeBottomTab === 'spc-rules'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Evaluasi SPC (Western Electric)</span>
                {spcDiagnostics.issues.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('notes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeBottomTab === 'notes'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Inspektur Titik {selectedPointIndex ? `#${selectedPointIndex}` : ''}</span>
              </button>
            </div>

            {/* TAB 1: DETAILED STATISTICAL CARDS */}
            {activeBottomTab === 'stats' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
                {/* Card 1: Target CRM */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold uppercase tracking-wider">Acuan Baku CRM</span>
                    <span className="font-mono">{currentElement}</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {limits.nominalValue.toFixed(4)}%
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <p className="flex justify-between">
                      <span>Stdev Tetap (σ):</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">±{limits.stdevFixed.toFixed(4)}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Batas ±2σ (Warning):</span>
                      <strong className="font-mono text-amber-600 dark:text-amber-400">
                        {limits.lowerWarning.toFixed(3)} - {limits.upperWarning.toFixed(3)}
                      </strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Batas ±3σ (Action):</span>
                      <strong className="font-mono text-rose-600 dark:text-rose-400">
                        {limits.lowerAction.toFixed(3)} - {limits.upperAction.toFixed(3)}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Card 2: Pengukuran Aktual */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold uppercase tracking-wider">Rata-rata Aktual</span>
                    <span className="font-mono">Recovery {recoveryPct}%</span>
                  </div>
                  <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                    {dynamicStats.mean.toFixed(4)}%
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <p className="flex justify-between">
                      <span>Median:</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">{dynamicStats.median.toFixed(4)}%</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Nilai Min:</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">{dynamicStats.min.toFixed(4)}%</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Nilai Max:</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">{dynamicStats.max.toFixed(4)}%</strong>
                    </p>
                  </div>
                </div>

                {/* Card 3: Presisi & RSD */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold uppercase tracking-wider">Presisi / %RSD</span>
                    <span className="font-mono">Rasio {precisionRatio}x</span>
                  </div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {rsdPct}%
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <p className="flex justify-between">
                      <span>Stdev Aktual (S):</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">±{dynamicStats.actualStdev.toFixed(4)}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Rentang (Spread):</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">{(dynamicStats.max - dynamicStats.min).toFixed(4)}%</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Status Presisi:</span>
                      <strong className={Number(precisionRatio) <= 1.0 ? 'text-emerald-600' : 'text-amber-600'}>
                        {Number(precisionRatio) <= 1.0 ? 'Sangat Baik (≤1.0)' : 'Dapat Diterima'}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Card 4: Kepatuhan Kendali Mutu */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold uppercase tracking-wider">Kepatuhan QC</span>
                    <span className="font-mono">N = {activePoints.length}</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {activePoints.length > 0 
                      ? (((activePoints.length - spcDiagnostics.outOf3sCount) / activePoints.length) * 100).toFixed(1)
                      : '100'}%
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <p className="flex justify-between">
                      <span>Titik Normal (≤2σ):</span>
                      <strong className="font-mono text-emerald-600">
                        {activePoints.filter(p => limits.stdevFixed > 0 && Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) <= 2.0).length}
                      </strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Titik Warning (2-3σ):</span>
                      <strong className="font-mono text-amber-600">
                        {activePoints.filter(p => limits.stdevFixed > 0 && Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) > 2.0 && Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) <= 3.0).length}
                      </strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Titik Kritis (&gt;3σ):</span>
                      <strong className="font-mono text-rose-600">
                        {spcDiagnostics.outOf3sCount}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COMPLETE DATA TABLE */}
            {activeBottomTab === 'table' && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 animate-in fade-in duration-150">
                {/* Search & Filter Controls */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari berdasarkan tanggal / indeks..."
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    {(['all', 'normal', 'warning', 'action', 'isolated'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setTableStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer capitalize ${
                          tableStatusFilter === st
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-80 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Tanggal & Waktu</th>
                        <th className="py-2.5 px-3">Nilai Hasil (%)</th>
                        <th className="py-2.5 px-3">Target CRM</th>
                        <th className="py-2.5 px-3">Selisih (Δ)</th>
                        <th className="py-2.5 px-3">Jarak Sigma (Z)</th>
                        <th className="py-2.5 px-3">Status Mutu</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {validPoints
                        .filter(p => {
                          const q = tableSearchQuery.toLowerCase();
                          if (q && !(p.date || '').toLowerCase().includes(q) && !String(p.index).includes(q)) return false;
                          const isIso = isPointIsolated ? isPointIsolated(p, currentElement) : false;
                          const diff = p.value - limits.nominalValue;
                          const z = limits.stdevFixed > 0 ? Math.abs(diff / limits.stdevFixed) : 0;
                          if (tableStatusFilter === 'isolated') return isIso;
                          if (tableStatusFilter === 'action') return !isIso && z > 3.0;
                          if (tableStatusFilter === 'warning') return !isIso && z > 2.0 && z <= 3.0;
                          if (tableStatusFilter === 'normal') return !isIso && z <= 2.0;
                          return true;
                        })
                        .map((p) => {
                          const isIso = isPointIsolated ? isPointIsolated(p, currentElement) : false;
                          const diff = p.value - limits.nominalValue;
                          const z = limits.stdevFixed > 0 ? (diff / limits.stdevFixed).toFixed(2) : '0';
                          const absZ = Math.abs(Number(z));
                          const isAction = absZ > 3.0;
                          const isWarn = absZ > 2.0 && absZ <= 3.0;

                          return (
                            <tr 
                              key={p.index} 
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                selectedPointIndex === p.index ? 'bg-teal-500/10' : ''
                              }`}
                            >
                              <td className="py-2 px-3 font-mono font-bold text-slate-500">#{p.index}</td>
                              <td className="py-2 px-3">
                                <div>{p.date || '-'}</div>
                                {p.analyzedAt && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {new Date(p.analyzedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono font-black text-slate-900 dark:text-slate-100">
                                {p.value.toFixed(4)}%
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-400">
                                {limits.nominalValue.toFixed(4)}%
                              </td>
                              <td className={`py-2 px-3 font-mono ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {diff >= 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4)}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold">
                                {Number(z) >= 0 ? `+${z}σ` : `${z}σ`}
                              </td>
                              <td className="py-2 px-3">
                                {isIso ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    Diisolasi
                                  </span>
                                ) : isAction ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                    Kritis (&gt;3σ)
                                  </span>
                                ) : isWarn ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    Warning (2-3σ)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    Normal
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPointIndex(p.index);
                                      setActiveBottomTab('notes');
                                    }}
                                    className="px-2 py-1 rounded text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-500/10 hover:text-teal-600 transition-colors cursor-pointer"
                                    title="Periksa titik ini"
                                  >
                                    Detail
                                  </button>

                                  {onToggleIsolatePoint && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!canTakeOutOffspec) {
                                          toast.error("Akses Ditolak: Fitur Take Out data off-spec hanya diizinkan untuk SPV & SPT Lab, Developer, dan Manager.");
                                          return;
                                        }
                                        onToggleIsolatePoint(p, currentElement, limits);
                                      }}
                                      className={`px-2 py-1 rounded text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                        !canTakeOutOffspec
                                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                          : isIso 
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      }`}
                                      title={!canTakeOutOffspec ? 'Hanya SPV & SPT Lab, Developer, dan Manager yang memiliki izin Take Out data' : isIso ? 'Pulihkan titik ini ke grafik' : 'Isolasi titik ini dari perhitungan grafik'}
                                    >
                                      {!canTakeOutOffspec && <Lock className="w-3 h-3 text-amber-500" />}
                                      <span>{isIso ? 'Pulihkan' : 'Isolasi'}</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: SPC RULES (WESTERN ELECTRIC DIAGNOSTICS) */}
            {activeBottomTab === 'spc-rules' && (
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Evaluasi Kendali Mutu Statistik (SPC Western Electric Diagnostics)
                  </h4>
                </div>

                {spcDiagnostics.issues.length > 0 && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
                    <div className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Perhatian Mutu Khusus: Terdeteksi Anomali Statistik</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-400">
                      {spcDiagnostics.issues.map((iss, idx) => (
                        <li key={idx}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    Aturan Evaluasi yang Lolos / Normal:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {spcDiagnostics.passedRules.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: POINT INSPECTOR & ANOMALY NOTES */}
            {activeBottomTab === 'notes' && (
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-teal-600" />
                    <span>Inspektur Titik Pengukuran</span>
                    {selectedPointIndex ? (
                      <span className="font-mono text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-md">
                        Titik #{selectedPointIndex}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-normal">
                        (Silakan klik salah satu titik pada grafik di atas)
                      </span>
                    )}
                  </h4>

                  {selectedPointObj && onToggleIsolatePoint && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canTakeOutOffspec) {
                          toast.error("Akses Ditolak: Fitur Take Out data off-spec hanya diizinkan untuk SPV & SPT Lab, Developer, dan Manager.");
                          return;
                        }
                        onToggleIsolatePoint(selectedPointObj, currentElement, limits);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        !canTakeOutOffspec
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                          : isPointIsolated && isPointIsolated(selectedPointObj, currentElement)
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                      title={!canTakeOutOffspec ? "Hanya SPV & SPT Lab, Developer, dan Manager yang memiliki izin Take Out data" : undefined}
                    >
                      {!canTakeOutOffspec ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Take Out (Khusus SPV/SPT/Dev/Mgr)</span>
                        </>
                      ) : isPointIsolated && isPointIsolated(selectedPointObj, currentElement) ? (
                        <span>✓ Pulihkan Titik ke Grafik</span>
                      ) : (
                        <span>🚫 Isolasi Titik Anomali</span>
                      )}
                    </button>
                  )}
                </div>

                {selectedPointObj ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Detail Nilai */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <p className="flex justify-between">
                        <span className="text-slate-500">Tanggal Pengukuran:</span>
                        <strong className="font-mono">{selectedPointObj.date || '-'}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Waktu Analisis:</span>
                        <strong className="font-mono">
                          {selectedPointObj.analyzedAt ? new Date(selectedPointObj.analyzedAt).toLocaleString('id-ID') : '-'}
                        </strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Nilai Terukur:</span>
                        <strong className="font-mono text-base text-cyan-600 dark:text-cyan-400 font-black">
                          {selectedPointObj.value.toFixed(4)}%
                        </strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Target Sertifikat:</span>
                        <strong className="font-mono">{limits.nominalValue.toFixed(4)}%</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Selisih Deviasi (Δ):</span>
                        <strong className={`font-mono ${(selectedPointObj.value - limits.nominalValue) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {(selectedPointObj.value - limits.nominalValue) >= 0 ? `+${(selectedPointObj.value - limits.nominalValue).toFixed(4)}` : (selectedPointObj.value - limits.nominalValue).toFixed(4)}
                        </strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Jarak Sigma (Z):</span>
                        <strong className="font-mono">
                          {limits.stdevFixed > 0 ? ((selectedPointObj.value - limits.nominalValue) / limits.stdevFixed).toFixed(2) : '0'}σ
                        </strong>
                      </p>
                    </div>

                    {/* Form Catatan / Tindakan Perbaikan */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        Catatan Anomali & Tindakan Korektif Titik Ini
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">
                          Identifikasi Masalah / Issue
                        </label>
                        <input
                          type="text"
                          value={noteIssue}
                          onChange={(e) => setNoteIssue(e.target.value)}
                          placeholder="Contoh: Tabung X-Ray drift, sample cup kotor, fluktuasi vakum..."
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">
                          Tindakan Perbaikan / Solution
                        </label>
                        <input
                          type="text"
                          value={noteSolution}
                          onChange={(e) => setNoteSolution(e.target.value)}
                          placeholder="Contoh: Rekalibrasi ulang drift, pembersihan jalur detektor..."
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <input
                          type="text"
                          value={notePicName}
                          onChange={(e) => setNotePicName(e.target.value)}
                          placeholder="Nama Analis / PIC"
                          className="text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex-1"
                        />

                        <div className="flex items-center gap-1.5">
                          {selectedPointIndex !== null && annotations[selectedPointIndex] && onDeleteAnnotation && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteAnnotation(selectedPointIndex);
                                setNoteIssue('');
                                setNoteSolution('');
                                setNotePicName('');
                                toast.info(`Catatan anomali titik #${selectedPointIndex} telah dihapus.`);
                              }}
                              className="px-3 py-2 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center gap-1"
                              title="Hapus Catatan Titik Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}

                          {onSaveAnnotation && (
                            <button
                              type="button"
                              onClick={handleSaveCurrentNote}
                              className="px-3 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
                            >
                              Simpan Catatan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 space-y-1">
                    <ZoomIn className="w-8 h-8 mx-auto text-slate-500" />
                    <p className="text-xs font-semibold">Belum Ada Titik yang Dipilih</p>
                    <p className="text-[11px]">Silakan klik salah satu lingkaran titik pada grafik Shewhart di atas untuk memeriksa dan mencatat tindakan perbaikan.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
