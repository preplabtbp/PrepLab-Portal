import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  LineChart, Sliders, RefreshCw, Calendar, ArrowLeftRight, 
  HelpCircle, Sparkles, Filter, Check, Eye, EyeOff, 
  LayoutGrid, Columns, Layers, CheckSquare, Square, Info, ShieldCheck,
  CheckCircle2, Database, ChevronDown, Activity, Building2, Cpu, ShieldAlert,
  Plus, X, Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { XrfQcChartCard, QC_ELEMENTS_LIST, XrfPointData, XrfChartLimitData, XrfPointAnnotation } from './XrfQcChartCard';
import { XrfOffspecIsolationModal, IsolatedOffspecPoint } from './XrfOffspecIsolationModal';
import { formatStandardDisplayName, isWdxrfInstrument } from '../../utils/xrfStandardDetector';

interface XrfControlChartsTabProps {
  instruments: Array<{ code: string; name: string }>;
  standards: Array<{ code: string; name: string }>;
  assignedSite?: 'GTS' | 'TBP';
  isDevOrManager?: boolean;
  onInstrumentsChanged?: () => Promise<void> | void;
}

// Urutan standar resmi sesuai urutan input data kalibrasi (Limonite & Saprolite)
export const OFFICIAL_INPUT_STANDARDS_ORDER = [
  // 1. Limonite Sequence (Gambar 4)
  'LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05',
  // 2. Saprolite Sequence (SOP Lab Aktual)
  'OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 'OREAS192',
  'OREAS193', 'SAP19', 'OREAS194', 'OREAS195',
];

// Urutan standar resmi skema WDXRF Supermini 200 (17 Standar GTS)
export const WDXRF_SUPERMINI_STANDARDS_ORDER = [
  'BLANK_A',
  'BLANK_B',
  'OREAS184',
  'LIM01',
  'LIM02',
  'LIM03',
  'OREAS187',
  'LIM04',
  'OREAS189',
  'LIM05',
  'OREAS190',
  'OREAS191',
  'OREAS192',
  'OREAS193',
  'SAP19',
  'OREAS194',
  'OREAS195',
];

// Urutan standar default skema WDXRF Zetium PANalytical (17 Standar TBP)
export const WDXRF_ZETIUM_DEFAULT_STANDARDS_ORDER = [
  'BLANK_A',
  'BLANK_B',
  'OREAS184',
  'LIM01',
  'LIM02',
  'LIM03',
  'OREAS187',
  'LIM04',
  'OREAS189',
  'LIM05',
  'OREAS190',
  'OREAS191',
  'OREAS192',
  'OREAS193',
  'SAP19',
  'OREAS194',
  'OREAS195',
];

export const STANDARD_DISPLAY_NAMES: Record<string, string> = {
  'BLANK_A': 'BLANK A',
  'BLANK_B': 'VER-BLANK B',
  'BLANK A': 'BLANK A',
  'BLANK B': 'VER-BLANK B',
  'VER-BLANK B': 'VER-BLANK B',
  'LIM01': 'LIM 01',
  'LIM02': 'LIM 02',
  'LIM03': 'LIM 03',
  'LIM04': 'LIM 04',
  'LIM05': 'LIM 05',
  'OREAS184': 'OREAS 184',
  'OREAS187': 'OREAS 187',
  'OREAS189': 'OREAS 189',
  'OREAS190': 'OREAS 190',
  'LIM': 'LIM',
  'SAP16': 'SAP 16',
  'OREAS191': 'OREAS 191',
  'OREAS192': 'OREAS 192',
  'OREAS193': 'OREAS 193',
  'SAP19': 'SAP 19',
  'OREAS194': 'OREAS 194',
  'SAP': 'SAP',
  'OREAS195': 'OREAS 195',
};

export interface InstrumentTheme {
  code: string;
  name: string;
  headerBg: string;
  headerBorder: string;
  pillActive: string;
  dotColor: string;
  badgeBg: string;
  textColor: string;
}

export const INSTRUMENT_THEMES: Record<string, InstrumentTheme> = {
  EPSILON_A: {
    code: 'EPSILON_A',
    name: 'EPSILON A',
    headerBg: 'bg-cyan-500 text-slate-950 font-black',
    headerBorder: 'border-cyan-600',
    pillActive: 'bg-cyan-500 text-slate-950 border-cyan-600 shadow-sm font-black',
    dotColor: '#06B6D4',
    badgeBg: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800',
    textColor: 'text-cyan-700 dark:text-cyan-400',
  },
  EPSILON_B: {
    code: 'EPSILON_B',
    name: 'EPSILON B',
    headerBg: 'bg-purple-600 text-white font-black',
    headerBorder: 'border-purple-700',
    pillActive: 'bg-purple-600 text-white border-purple-700 shadow-sm font-black',
    dotColor: '#9333EA',
    badgeBg: 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border-purple-300 dark:border-purple-800',
    textColor: 'text-purple-700 dark:text-purple-400',
  },
  EPSILON_C: {
    code: 'EPSILON_C',
    name: 'EPSILON C',
    headerBg: 'bg-teal-500 text-slate-950 font-black',
    headerBorder: 'border-teal-600',
    pillActive: 'bg-teal-500 text-slate-950 border-teal-600 shadow-sm font-black',
    dotColor: '#14B8A6',
    badgeBg: 'bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-teal-200 border-teal-300 dark:border-teal-800',
    textColor: 'text-teal-700 dark:text-teal-400',
  },
  EPSILON_D: {
    code: 'EPSILON_D',
    name: 'EPSILON D',
    headerBg: 'bg-amber-400 text-slate-950 font-black',
    headerBorder: 'border-amber-500',
    pillActive: 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm font-black',
    dotColor: '#F59E0B',
    badgeBg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  EPSILON_E: {
    code: 'EPSILON_E',
    name: 'EPSILON E',
    headerBg: 'bg-orange-500 text-white font-black',
    headerBorder: 'border-orange-600',
    pillActive: 'bg-orange-500 text-white border-orange-600 shadow-sm font-black',
    dotColor: '#F97316',
    badgeBg: 'bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-200 border-orange-300 dark:border-orange-800',
    textColor: 'text-orange-700 dark:text-orange-400',
  },
  EPSILON_F: {
    code: 'EPSILON_F',
    name: 'EPSILON F',
    headerBg: 'bg-rose-500 text-white font-black',
    headerBorder: 'border-rose-600',
    pillActive: 'bg-rose-500 text-white border-rose-600 shadow-sm font-black',
    dotColor: '#F43F5E',
    badgeBg: 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-800',
    textColor: 'text-rose-700 dark:text-rose-400',
  },
  EPSILON_G: {
    code: 'EPSILON_G',
    name: 'EPSILON G',
    headerBg: 'bg-emerald-600 text-white font-black',
    headerBorder: 'border-emerald-700',
    pillActive: 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-black',
    dotColor: '#10B981',
    badgeBg: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-400',
  },
  EPSILON_H: {
    code: 'EPSILON_H',
    name: 'EPSILON H',
    headerBg: 'bg-indigo-600 text-white font-black',
    headerBorder: 'border-indigo-700',
    pillActive: 'bg-indigo-600 text-white border-indigo-700 shadow-sm font-black',
    dotColor: '#6366F1',
    badgeBg: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
    textColor: 'text-indigo-700 dark:text-indigo-400',
  },
  S2_PUMA: {
    code: 'S2_PUMA',
    name: 'S2 PUMA',
    headerBg: 'bg-violet-600 text-white font-black',
    headerBorder: 'border-violet-700',
    pillActive: 'bg-violet-600 text-white border-violet-700 shadow-sm font-black',
    dotColor: '#8B5CF6',
    badgeBg: 'bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-200 border-violet-300 dark:border-violet-800',
    textColor: 'text-violet-700 dark:text-violet-400',
  },
  SUPERMINI: {
    code: 'SUPERMINI',
    name: 'Supermini',
    headerBg: 'bg-blue-600 text-white font-black',
    headerBorder: 'border-blue-700',
    pillActive: 'bg-blue-600 text-white border-blue-700 shadow-sm font-black',
    dotColor: '#2563EB',
    badgeBg: 'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-200 border-blue-300 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  ZETIUM_A: {
    code: 'ZETIUM_A',
    name: 'Zetium A',
    headerBg: 'bg-fuchsia-600 text-white font-black',
    headerBorder: 'border-fuchsia-700',
    pillActive: 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-sm font-black',
    dotColor: '#D946EF',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/80 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-800',
    textColor: 'text-fuchsia-700 dark:text-fuchsia-400',
  },
  ZETIUM_B: {
    code: 'ZETIUM_B',
    name: 'Zetium B',
    headerBg: 'bg-pink-600 text-white font-black',
    headerBorder: 'border-pink-700',
    pillActive: 'bg-pink-600 text-white border-pink-700 shadow-sm font-black',
    dotColor: '#EC4899',
    badgeBg: 'bg-pink-100 text-pink-900 dark:bg-pink-950/80 dark:text-pink-200 border-pink-300 dark:border-pink-800',
    textColor: 'text-pink-700 dark:text-pink-400',
  },
};

function getInstrumentTheme(code: string, fallbackName?: string, index: number = 0): InstrumentTheme {
  if (INSTRUMENT_THEMES[code]) return INSTRUMENT_THEMES[code];
  const colorRotation = [
    { bg: 'bg-blue-600 text-white', border: 'border-blue-700', dot: '#2563EB', text: 'text-blue-700' },
    { bg: 'bg-emerald-600 text-white', border: 'border-emerald-700', dot: '#059669', text: 'text-emerald-700' },
    { bg: 'bg-fuchsia-600 text-white', border: 'border-fuchsia-700', dot: '#C026D3', text: 'text-fuchsia-700' },
    { bg: 'bg-indigo-600 text-white', border: 'border-indigo-700', dot: '#4F46E5', text: 'text-indigo-700' },
  ];
  const c = colorRotation[index % colorRotation.length];
  return {
    code,
    name: fallbackName || code.replace('_', ' '),
    headerBg: `${c.bg} font-black`,
    headerBorder: c.border,
    pillActive: `${c.bg} ${c.border} shadow-sm font-black`,
    dotColor: c.dot,
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    textColor: c.text,
  };
}

export const XrfControlChartsTab: React.FC<XrfControlChartsTabProps> = ({
  instruments: initialInstrumentsProp,
  standards,
  assignedSite = 'GTS',
  isDevOrManager = false,
  onInstrumentsChanged,
}) => {
  // -----------------------------------------------------------------
  // 1. SIMPLIFIED ENTERPRISE HIERARCHY (SITE -> METHOD -> MATRIX)
  // -----------------------------------------------------------------
  // A. Site / Organization: GTS vs TBP/GPS (Locked for non-dev / non-manager)
  const [selectedSite, setSelectedSite] = useState<'GTS' | 'TBP'>(() => assignedSite);

  useEffect(() => {
    if (assignedSite) {
      setSelectedSite(assignedSite);
    }
  }, [assignedSite]);

  // B. Method / Technology: EDXRF vs WDXRF
  const [selectedMethod, setSelectedMethod] = useState<'EDXRF' | 'WDXRF'>('EDXRF');

  // C. Primary Matrix Application: SAPROLITE vs LIMONITE
  const [selectedMatrix, setSelectedMatrix] = useState<'SAPROLITE' | 'LIMONITE'>('SAPROLITE');

  // D. Parameter / Element Analisis (Global & Synchronized across all charts)
  const [selectedElement, setSelectedElement] = useState<string>('Ni');

  // E. Filter Periode Waktu / Tahun (Default: Tahun Berjalan)
  const currentYearStr = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  const dateRange = useMemo(() => {
    if (selectedYear === 'ALL') {
      return { startDate: '', endDate: '' };
    }
    return {
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
    };
  }, [selectedYear]);

  // Modal State: Tambah Alat Baru Langsung dari UI
  const [showAddInstrumentModal, setShowAddInstrumentModal] = useState<boolean>(false);
  const [newInstName, setNewInstName] = useState<string>('');
  const [newInstCode, setNewInstCode] = useState<string>('');
  const [newInstBrand, setNewInstBrand] = useState<string>('PANalytical Epsilon 4');
  const [newInstSite, setNewInstSite] = useState<'GTS' | 'TBP'>(selectedSite);
  const [newInstMethod, setNewInstMethod] = useState<'EDXRF' | 'WDXRF'>(selectedMethod);
  const [newInstColorTag, setNewInstColorTag] = useState<string>('teal');
  const [isSubmittingInst, setIsSubmittingInst] = useState<boolean>(false);

  // -----------------------------------------------------------------
  // 2. INSTRUMENT AVAILABILITY (DIBACA LANGSUNG DARI DATABASE)
  // -----------------------------------------------------------------
  const [allMasterInstruments, setAllMasterInstruments] = useState<Array<any>>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(() => 
    assignedSite === 'TBP' ? ['EPSILON_C', 'EPSILON_E', 'EPSILON_F'] : ['EPSILON_A', 'EPSILON_B', 'EPSILON_D']
  );
  const [instrumentsInitialized, setInstrumentsInitialized] = useState<boolean>(false);

  // -----------------------------------------------------------------
  // 3. STANDARDS FILTER & AVAILABILITY
  // -----------------------------------------------------------------
  const [availableStandardsData, setAvailableStandardsData] = useState<Array<{ standardCode: string; count: number; lastAnalyzed?: string }>>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([
    'OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 'OREAS192', 
    'OREAS193', 'SAP19', 'OREAS194', 'OREAS195'
  ]);

  // -----------------------------------------------------------------
  // 4. DISPLAY OPTIONS & CACHE
  // -----------------------------------------------------------------
  const [viewMode, setViewMode] = useState<'side-by-side' | 'grid'>('side-by-side');
  const [columnCount, setColumnCount] = useState<'auto' | '2' | '3' | '4' | '6'>('auto');
  const [showStats, setShowStats] = useState<boolean>(true);
  const [compactStats, setCompactStats] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  // -----------------------------------------------------------------
  // 5. OFFSPEC DATA ISOLATION (CHART TERPISAH & REKAP PER INSTRUMEN)
  // -----------------------------------------------------------------
  const [isolatedPoints, setIsolatedPoints] = useState<IsolatedOffspecPoint[]>(() => {
    try {
      const saved = localStorage.getItem('xrf_isolated_offspec_points');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse isolated points from storage', e);
      return [];
    }
  });
  const [showOffspecModal, setShowOffspecModal] = useState<boolean>(false);

  // Anomaly point annotations: Issue, Solution, PIC (persistent in localStorage)
  const [pointAnnotations, setPointAnnotations] = useState<Record<string, XrfPointAnnotation>>(() => {
    try {
      const saved = localStorage.getItem('xrf_point_annotations');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('xrf_isolated_offspec_points', JSON.stringify(isolatedPoints));
    } catch (e) {
      console.error('Failed to save isolated points to storage', e);
    }
  }, [isolatedPoints]);

  useEffect(() => {
    try {
      localStorage.setItem('xrf_point_annotations', JSON.stringify(pointAnnotations));
    } catch (e) {
      console.error('Failed to save point annotations to storage', e);
    }
  }, [pointAnnotations]);

  const handleSaveAnnotation = useCallback((cardKey: string, pointIndex: number, annotation: XrfPointAnnotation) => {
    const fullKey = `${cardKey}-${pointIndex}`;
    setPointAnnotations(prev => ({
      ...prev,
      [fullKey]: { ...annotation, updatedAt: new Date().toISOString() }
    }));
    // Also sync to isolatedPoints if this point is currently isolated
    setIsolatedPoints(prev => prev.map(p => {
      if (p.id === fullKey) {
        return {
          ...p,
          issue: annotation.issue,
          solution: annotation.solution,
          picNik: annotation.picNik,
          picName: annotation.picName,
        };
      }
      return p;
    }));
    toast.success(`Catatan anomali untuk titik #${pointIndex} berhasil disimpan`);
  }, []);

  const handleDeleteAnnotation = useCallback((cardKey: string, pointIndex: number) => {
    const fullKey = `${cardKey}-${pointIndex}`;
    setPointAnnotations(prev => {
      const next = { ...prev };
      delete next[fullKey];
      return next;
    });
    setIsolatedPoints(prev => prev.map(p => {
      if (p.id === fullKey) {
        return {
          ...p,
          issue: undefined,
          solution: undefined,
          picNik: undefined,
          picName: undefined,
        };
      }
      return p;
    }));
    toast.info(`Catatan untuk titik #${pointIndex} telah dihapus`);
  }, []);

  const handleToggleIsolatePoint = useCallback((
    point: XrfPointData, 
    element: string, 
    limits: XrfChartLimitData, 
    instCode: string, 
    instName: string, 
    stdCode: string
  ) => {
    const pointId = `${instCode}-${stdCode}-${element}-${point.index}`;
    setIsolatedPoints(prev => {
      const exists = prev.some(p => p.id === pointId);
      if (exists) {
        toast.info(`Titik #${point.index} (${element}) dikeluarkan dari isolasi data off-spec`);
        return prev.filter(p => p.id !== pointId);
      } else {
        const pointSigma = limits.stdevFixed > 0 
          ? ((point.value - limits.nominalValue) / limits.stdevFixed) 
          : 0;
        const absSigma = Math.abs(pointSigma);
        const status = absSigma > 3.0 ? 'action' : absSigma > 2.0 ? 'warning' : 'normal';
        const statusLabel = status === 'action' ? 'Off-Spec Action (>3σ)' : status === 'warning' ? 'Off-Spec Warning (2-3σ)' : 'In-Control (≤2σ)';
        const ann = pointAnnotations[pointId];

        const newPoint: IsolatedOffspecPoint = {
          id: pointId,
          pointId: point.id,
          index: point.index,
          date: point.date || new Date().toISOString().split('T')[0],
          analyzedAt: point.analyzedAt,
          instrumentCode: instCode,
          instrumentName: instName,
          standardCode: stdCode,
          element,
          value: point.value,
          nominalValue: limits.nominalValue,
          stdevFixed: limits.stdevFixed,
          diff: point.value - limits.nominalValue,
          sigmaDist: pointSigma,
          status,
          statusLabel,
          isolatedAt: new Date().toISOString(),
          issue: ann?.issue,
          solution: ann?.solution,
          picNik: ann?.picNik,
          picName: ann?.picName,
        };
        toast.success(`Titik #${point.index} (${element}) berhasil diisolasi ke chart off-spec`);
        return [...prev, newPoint];
      }
    });
  }, [pointAnnotations]);

  const handleRemovePoint = useCallback((id: string) => {
    setIsolatedPoints(prev => prev.filter(p => p.id !== id));
    toast.info('Titik off-spec dihapus dari rekap isolasi');
  }, []);

  const handleClearAll = useCallback(() => {
    setIsolatedPoints([]);
    toast.info('Semua data isolasi off-spec telah dibersihkan');
  }, []);

  const isPointIsolated = useCallback((
    point: XrfPointData, 
    element: string, 
    instCode: string, 
    stdCode: string
  ) => {
    const pointId = `${instCode}-${stdCode}-${element}-${point.index}`;
    return isolatedPoints.some(p => p.id === pointId);
  }, [isolatedPoints]);

  const handleIsolateAllOffspecInCard = useCallback((
    cardPoints: XrfPointData[], 
    element: string, 
    limits: XrfChartLimitData, 
    instCode: string, 
    instName: string, 
    stdCode: string
  ) => {
    const offspecPoints = cardPoints.filter(p => {
      const dist = limits.stdevFixed > 0 ? Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) : 0;
      return dist > 2.0;
    });

    if (offspecPoints.length === 0) {
      toast.info('Tidak ada titik off-spec (>2σ) pada standar ini.');
      return;
    }

    setIsolatedPoints(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const newlyAdded: IsolatedOffspecPoint[] = [];

      offspecPoints.forEach(p => {
        const pointId = `${instCode}-${stdCode}-${element}-${p.index}`;
        if (!existingIds.has(pointId)) {
          const pointSigma = limits.stdevFixed > 0 ? ((p.value - limits.nominalValue) / limits.stdevFixed) : 0;
          const absSigma = Math.abs(pointSigma);
          const status = absSigma > 3.0 ? 'action' : 'warning';
          const statusLabel = status === 'action' ? 'Off-Spec Action (>3σ)' : 'Off-Spec Warning (2-3σ)';
          const ann = pointAnnotations[pointId];

          newlyAdded.push({
            id: pointId,
            pointId: p.id,
            index: p.index,
            date: p.date || new Date().toISOString().split('T')[0],
            analyzedAt: p.analyzedAt,
            instrumentCode: instCode,
            instrumentName: instName,
            standardCode: stdCode,
            element,
            value: p.value,
            nominalValue: limits.nominalValue,
            stdevFixed: limits.stdevFixed,
            diff: p.value - limits.nominalValue,
            sigmaDist: pointSigma,
            status,
            statusLabel,
            isolatedAt: new Date().toISOString(),
            issue: ann?.issue,
            solution: ann?.solution,
            picNik: ann?.picNik,
            picName: ann?.picName,
          });
        }
      });

      if (newlyAdded.length > 0) {
        toast.success(`${newlyAdded.length} titik off-spec di ${stdCode} (${element}) berhasil diisolasi!`);
      } else {
        toast.info(`Semua titik off-spec di ${stdCode} sudah terisolasi sebelumnya.`);
      }

      return [...prev, ...newlyAdded];
    });
  }, []);

  // Horizontal scroll synchronization for side-by-side mode
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef<boolean>(false);

  const handleScrollSync = useCallback((sourceEl: HTMLElement) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    const scrollLeft = sourceEl.scrollLeft;

    if (headerScrollRef.current && headerScrollRef.current !== sourceEl) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }

    const stripContainers = document.querySelectorAll<HTMLElement>('.xrf-strip-scroll');
    stripContainers.forEach((container) => {
      if (container !== sourceEl) {
        container.scrollLeft = scrollLeft;
      }
    });

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  // Cached Chart Data
  const [gridData, setGridData] = useState<Record<string, Record<string, any>>>({});
  const [allElementsData, setAllElementsData] = useState<Record<string, Record<string, Record<string, any>>>>({});

  // Fetch full instrument list from database with measurement counts
  const loadMasterInstruments = async () => {
    try {
      const res = await fetch('/api/xrf/instruments');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setAllMasterInstruments(json.data);
      }
    } catch (err) {
      console.warn("Gagal memuat daftar alat:", err);
    }
  };

  useEffect(() => {
    loadMasterInstruments();
  }, []);

  // Filtered available instruments for current Site and Method
  const currentCategoryInstruments = useMemo(() => {
    return allMasterInstruments.filter(inst => {
      const isKnownGts = ['EPSILON_A', 'EPSILON_B', 'EPSILON_D', 'SUPERMINI'].includes(inst.code);
      const isKnownTbp = ['EPSILON_C', 'EPSILON_E', 'EPSILON_F', 'EPSILON_G', 'EPSILON_H', 'S2_PUMA', 'ZETIUM_A', 'ZETIUM_B'].includes(inst.code);
      const instSite = isKnownGts ? 'GTS' : (isKnownTbp ? 'TBP' : (inst.site || 'TBP'));
      const isKnownWdxrf = ['SUPERMINI', 'ZETIUM_A', 'ZETIUM_B'].includes(inst.code);
      const instMethod = isKnownWdxrf ? 'WDXRF' : (inst.methodType || 'EDXRF');
      return instSite === selectedSite && instMethod === selectedMethod;
    });
  }, [allMasterInstruments, selectedSite, selectedMethod]);

  // Auto-Select available instruments when Site or Method changes
  useEffect(() => {
    if (currentCategoryInstruments.length === 0) return;
    
    // Prioritaskan alat yang memiliki data
    const withData = currentCategoryInstruments.filter(i => (i.measurementCount || 0) > 0).map(i => i.code);
    
    if (withData.length > 0) {
      setSelectedInstruments(withData.slice(0, 6));
    } else {
      // Jika belum ada data (misal WDXRF Supermini atau Zetium), pilih semua alat di kategori tsb (maks 6)
      setSelectedInstruments(currentCategoryInstruments.slice(0, 6).map(i => i.code));
    }
  }, [selectedSite, selectedMethod, currentCategoryInstruments]);


  const [latestBatchStandards, setLatestBatchStandards] = useState<string[]>([]);
  const [showHistoricalStandards, setShowHistoricalStandards] = useState(false);

  // Map of standardCode -> count for quick lookup
  const standardCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of availableStandardsData) {
      map[item.standardCode] = item.count;
    }
    return map;
  }, [availableStandardsData]);

  // Load available standards with measurement count for selected instruments
  const loadAvailableStandards = async () => {
    if (selectedInstruments.length === 0) return;
    try {
      const instParam = selectedInstruments.join(',');
      const params = new URLSearchParams();
      params.set('instrumentCode', instParam);
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);

      const res = await fetch(`/api/xrf/available-standards?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const parsed = json.data.map((d: any) => ({
          standardCode: d.standardCode,
          count: Number(d.count) || 0,
          lastAnalyzed: d.lastAnalyzed,
        }));
        setAvailableStandardsData(parsed);
      }
    } catch (err) {
      console.warn("Gagal memuat standar tersedia:", err);
    }
  };

  // Load baseline standards from the latest verification batch for selected instruments
  const loadLatestBatchStandards = async () => {
    if (selectedInstruments.length === 0) return;
    try {
      const instParam = selectedInstruments.join(',');
      const params = new URLSearchParams();
      params.set('instrumentCode', instParam);
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);

      const res = await fetch(`/api/xrf/latest-batch-standards?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.hasData && Array.isArray(json.standards) && json.standards.length > 0) {
        setLatestBatchStandards(json.standards);
      } else {
        setLatestBatchStandards([]);
      }
    } catch (err) {
      console.warn("Gagal memuat standar batch terakhir:", err);
    }
  };

  useEffect(() => {
    loadAvailableStandards();
    loadLatestBatchStandards();
  }, [selectedInstruments, dateRange]);

  // Auto-sync selected standards: selalu prioritaskan standar dari dataset batch terakhir yang diinput untuk tiap alatnya
  useEffect(() => {
    if (latestBatchStandards.length > 0) {
      setSelectedStandards(latestBatchStandards);
    } else if (selectedMethod === 'WDXRF') {
      const hasZetium = selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B');
      setSelectedStandards(hasZetium ? WDXRF_ZETIUM_DEFAULT_STANDARDS_ORDER : WDXRF_SUPERMINI_STANDARDS_ORDER);
    } else if (selectedMatrix === 'SAPROLITE') {
      const sapCodes = [
        'OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 
        'OREAS192', 'OREAS193', 'SAP19', 'OREAS194', 'OREAS195'
      ];
      setSelectedStandards(sapCodes);
    } else {
      const limCodes = ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05'];
      setSelectedStandards(limCodes);
    }
  }, [selectedMethod, selectedMatrix, latestBatchStandards, selectedInstruments]);

  // Fetch chart data from backend for all selected instruments
  const fetchChartData = async () => {
    if (selectedInstruments.length === 0) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('element', selectedElement);
      params.set('instruments', selectedInstruments.join(','));
      
      const standardsToQuery = selectedMethod === 'WDXRF'
        ? Array.from(new Set([...selectedStandards, 'BLANK A', 'BLANK B', 'VER-BLANK B'])).join(',')
        : (selectedStandards.length > 0 ? selectedStandards.join(',') : 'ALL');
      params.set('standards', standardsToQuery);

      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);

      const res = await fetch(`/api/xrf/qc-chart-data?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        if (json.allElementsData) {
          setAllElementsData(json.allElementsData);
        }
        if (json.gridData) {
          setGridData(json.gridData);
        }
      }
    } catch (err: any) {
      toast.error('Gagal mengambil data grafik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [selectedInstruments, selectedStandards, dateRange]);

  // Handle Synchronized Element Selection from ANY chart card dropdown
  const handleSelectElement = (el: string) => {
    setSelectedElement(el);
    if (allElementsData[el]) {
      setGridData(allElementsData[el]);
    }
    toast.success(`Parameter diubah ke ${el} untuk semua grafik.`);
  };

  // Active grid data for current selected element
  const currentGridData = allElementsData[selectedElement] || gridData;

  const handleAutoIsolateAllOffspec = useCallback(() => {
    setIsolatedPoints(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const newlyAdded: IsolatedOffspecPoint[] = [];

      Object.entries(currentGridData).forEach(([stdCode, instObj]) => {
        const stdName = STANDARD_DISPLAY_NAMES[stdCode] || stdCode;
        Object.entries(instObj as Record<string, any>).forEach(([instCode, data]) => {
          const limits = data.limits;
          const points = data.points || [];
          const theme = getInstrumentTheme(instCode);

          points.forEach((p: any) => {
            if (typeof p.value === 'number' && !isNaN(p.value) && limits && limits.stdevFixed > 0) {
              const sigmaDist = (p.value - limits.nominalValue) / limits.stdevFixed;
              const absSigma = Math.abs(sigmaDist);
              if (absSigma > 2.0) {
                const pointId = `${instCode}-${stdName}-${selectedElement}-${p.index}`;
                if (!existingIds.has(pointId)) {
                  const status = absSigma > 3.0 ? 'action' : 'warning';
                  const statusLabel = status === 'action' ? 'Off-Spec Action (>3σ)' : 'Off-Spec Warning (2-3σ)';
                  const ann = pointAnnotations[pointId];
                  newlyAdded.push({
                    id: pointId,
                    pointId: p.id,
                    index: p.index,
                    date: p.date || new Date().toISOString().split('T')[0],
                    analyzedAt: p.analyzedAt,
                    instrumentCode: instCode,
                    instrumentName: theme.name,
                    standardCode: stdName,
                    element: selectedElement,
                    value: p.value,
                    nominalValue: limits.nominalValue,
                    stdevFixed: limits.stdevFixed,
                    diff: p.value - limits.nominalValue,
                    sigmaDist,
                    status,
                    statusLabel,
                    isolatedAt: new Date().toISOString(),
                    issue: ann?.issue,
                    solution: ann?.solution,
                    picNik: ann?.picNik,
                    picName: ann?.picName,
                  });
                }
              }
            }
          });
        });
      });

      if (newlyAdded.length > 0) {
        toast.success(`${newlyAdded.length} titik off-spec di seluruh instrumen berhasil diisolasi!`);
      } else {
        toast.info('Semua titik off-spec yang aktif telah diisolasi.');
      }

      return [...prev, ...newlyAdded];
    });
  }, [currentGridData, selectedElement]);

  // Toggle instrument selection (up to 6 instruments side-by-side)
  const toggleInstrument = (code: string) => {
    if (selectedInstruments.includes(code)) {
      if (selectedInstruments.length <= 1) {
        toast.info("Minimal 1 alat harus dipilih.");
        return;
      }
      setSelectedInstruments(selectedInstruments.filter(c => c !== code));
    } else {
      if (selectedInstruments.length >= 6) {
        toast.warning("Maksimal 6 alat dapat ditampilkan berdampingan.");
        return;
      }
      setSelectedInstruments([...selectedInstruments, code]);
    }
  };

  // Visible standards list:
  // - Selalu prioritaskan urutan standar dari batch pengukuran terakhir yang diinput untuk alat terkait (EDXRF maupun WDXRF)
  // - Fallback ke urutan default matriks jika belum ada batch pengukuran
  const visibleStandards = useMemo(() => {
    let candidateCodes: string[] = [];
    let matrixType = 'SAPROLITE';

    if (latestBatchStandards.length > 0) {
      candidateCodes = [...latestBatchStandards];
      const hasZetium = selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B');
      const hasSupermini = selectedInstruments.some(c => c === 'SUPERMINI');
      matrixType = hasZetium ? 'ZETIUM' : hasSupermini ? 'SUPERMINI' : (selectedMatrix || 'SAPROLITE');
    } else if (selectedMethod === 'WDXRF') {
      const hasZetium = selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B');
      candidateCodes = hasZetium ? [...WDXRF_ZETIUM_DEFAULT_STANDARDS_ORDER] : [...WDXRF_SUPERMINI_STANDARDS_ORDER];
      matrixType = hasZetium ? 'ZETIUM' : 'SUPERMINI';
    } else {
      const isSaprolite = selectedMatrix === 'SAPROLITE';
      candidateCodes = isSaprolite
        ? ['OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 'OREAS192', 'OREAS193', 'SAP19', 'OREAS194', 'OREAS195']
        : ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05'];
      matrixType = isSaprolite ? 'SAPROLITE' : 'LIMONITE';
    }

    // Identifikasi standar historis yang memiliki data pengukuran tapi tidak ada di set batch terakhir
    const historicalCodes = availableStandardsData
      .filter(s => s.count > 0 && !candidateCodes.includes(s.standardCode) && !candidateCodes.includes(s.standardCode.replace(' ', '_')))
      .map(s => s.standardCode);

    if (showHistoricalStandards && historicalCodes.length > 0) {
      candidateCodes = [...candidateCodes, ...historicalCodes];
    }

    const list = candidateCodes.map(code => {
      const existing = standards.find(s => s.code === code || s.code === code.replace('_', ' ') || s.name === code);
      const isHist = historicalCodes.includes(code);
      const baseDisp = existing?.name || STANDARD_DISPLAY_NAMES[code] || formatStandardDisplayName(code);
      return {
        code,
        name: isHist ? `${baseDisp} (Arsip/Historis)` : baseDisp,
        matrix: matrixType,
        count: standardCountMap[code] || standardCountMap[code.replace('_', ' ')] || 0,
        isHistorical: isHist,
      };
    });

    return list;
  }, [standards, standardCountMap, selectedMatrix, selectedMethod, selectedInstruments, latestBatchStandards, availableStandardsData, showHistoricalStandards]);

  const historicalStandardsCount = useMemo(() => {
    let candidateCodes: string[] = [];
    if (latestBatchStandards.length > 0) {
      candidateCodes = latestBatchStandards;
    } else if (selectedMethod === 'WDXRF') {
      const hasZetium = selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B');
      candidateCodes = hasZetium ? WDXRF_ZETIUM_DEFAULT_STANDARDS_ORDER : WDXRF_SUPERMINI_STANDARDS_ORDER;
    } else {
      candidateCodes = selectedMatrix === 'SAPROLITE'
        ? ['OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 'OREAS192', 'OREAS193', 'SAP19', 'OREAS194', 'OREAS195']
        : ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05'];
    }

    return availableStandardsData.filter(s => 
      s.count > 0 && !candidateCodes.includes(s.standardCode) && !candidateCodes.includes(s.standardCode.replace(' ', '_'))
    ).length;
  }, [availableStandardsData, latestBatchStandards, selectedMethod, selectedMatrix, selectedInstruments]);

  // Standards rendered on the chart canvas:
  // Disesuaikan dengan data set terakhir untuk tiap alatnya & hilangkan chart yang kosong
  const renderedStandards = useMemo(() => {
    if (showHistoricalStandards) return visibleStandards;

    const listWithData = visibleStandards.filter(std => {
      const stdCode = std.code;
      const stdData = currentGridData[stdCode] || currentGridData[stdCode.replace('_', ' ')] || currentGridData[std.name] || {};
      const hasPoints = selectedInstruments.some(instCode => (stdData[instCode]?.points?.length || 0) > 0);
      const hasCount = (std.count || 0) > 0;
      return hasPoints || hasCount;
    });

    if (loading && listWithData.length === 0) return visibleStandards;
    return listWithData.length > 0 ? listWithData : visibleStandards;
  }, [visibleStandards, currentGridData, selectedInstruments, showHistoricalStandards, loading]);

  // Calculate Grid Columns Class for responsive layout
  const getGridColsClass = () => {
    const n = selectedInstruments.length;
    if (columnCount === '2' || n === 2) return 'grid-cols-1 md:grid-cols-2';
    if (columnCount === '3' || n === 3) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    if (columnCount === '4' || n === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    if (columnCount === '6' || n >= 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6';
    return 'grid-cols-1 max-w-2xl mx-auto';
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* ENTERPRISE STREAMLINED INSPECTION COMMAND BAR                 */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* ROW 1: CORE SELECTION HIERARCHY (SITE -> METHOD -> MATRIX) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. UNIVERSE ENTITY BADGE (STRICTLY DRIVEN BY PORTAL UNIVERSE) */}
            {isDevOrManager ? (
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setSelectedSite('TBP')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedSite === 'TBP'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  PT. TBP / GPS
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSite('GTS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedSite === 'GTS'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  PT. GTS
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-black shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{selectedSite === 'GTS' ? 'UNIVERSE: PT. GANE TAMBANG SENTOSA (GTS)' : 'UNIVERSE: PT. TRIMEGAH BANGUN PERSADA (TBP / GPS)'}</span>
              </div>
            )}

            {/* 2. METHOD SELECTOR (EDXRF vs WDXRF) */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/80">
              <button
                onClick={() => setSelectedMethod('EDXRF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'EDXRF'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                EDXRF
              </button>
              <button
                onClick={() => setSelectedMethod('WDXRF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'WDXRF'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                WDXRF
              </button>
            </div>

            {/* 3. PRIMARY MATRIX (SAPROLITE vs LIMONITE) - HANYA UNTUK EDXRF */}
            {selectedMethod === 'EDXRF' ? (
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/80">
                <button
                  onClick={() => {
                    setSelectedMatrix('SAPROLITE');
                    setSelectedStandards(['OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 'OREAS192', 'OREAS193', 'SAP19', 'OREAS194', 'OREAS195']);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedMatrix === 'SAPROLITE'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  SAPROLITE (10 CRM)
                </button>
                <button
                  onClick={() => {
                    setSelectedMatrix('LIMONITE');
                    setSelectedStandards(['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05']);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedMatrix === 'LIMONITE'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  LIMONITE (LIM 01-05)
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-black shadow-xs">
                <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>
                  {selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B')
                    ? `WDXRF ZETIUM TBP (${latestBatchStandards.length > 0 ? latestBatchStandards.length : 17} STANDAR BASELINE)`
                    : `WDXRF SUPERMINI GTS (${latestBatchStandards.length > 0 ? latestBatchStandards.length : 17} STANDAR BASELINE)`}
                </span>
              </div>
            )}

            {historicalStandardsCount > 0 && (
              <button
                onClick={() => setShowHistoricalStandards(!showHistoricalStandards)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  showHistoricalStandards
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/80 hover:text-slate-900'
                }`}
                title="Tampilkan data standar lama yang pernah diukur namun tidak masuk dalam batch verifikasi terakhir"
              >
                <Archive className="w-3.5 h-3.5 text-amber-500" />
                <span>{showHistoricalStandards ? 'Tutup' : 'Buka'} Standar Arsip ({historicalStandardsCount})</span>
              </button>
            )}
          </div>

          {/* Action & Layout Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Periode Tahun / All-Time */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs font-black text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value={currentYearStr}>{currentYearStr} (Tahun Berjalan)</option>
                <option value={String(Number(currentYearStr) - 1)}>{Number(currentYearStr) - 1}</option>
                <option value={String(Number(currentYearStr) - 2)}>{Number(currentYearStr) - 2}</option>
                <option value="ALL">Semua Waktu (All-Time)</option>
              </select>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  viewMode === 'side-by-side'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Tampilan Strip Horizontal Berdampingan"
              >
                Berdampingan
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Tampilan Grid Auto"
              >
                Grid
              </button>
            </div>

            <button
              onClick={() => setShowStats(!showStats)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                showStats
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {showStats ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              KPI Stats
            </button>

            {/* Dedicated Off-Spec Isolation Modal Launcher */}
            <button
              onClick={() => setShowOffspecModal(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isolatedPoints.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-500/20'
                  : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title="Buka Chart Isolasi Data Off-Spec & Rekap Per Instrumen"
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${isolatedPoints.length > 0 ? 'text-amber-200 animate-pulse' : 'text-rose-500'}`} />
              <span>Chart Isolasi Off-Spec</span>
              {isolatedPoints.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-rose-700 font-black">
                  {isolatedPoints.length}
                </span>
              )}
            </button>

            <button
              onClick={fetchChartData}
              disabled={loading}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Refresh Data Grafik"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ROW 2: REAL-TIME AVAILABILITY MESIN XRF (MEMBACA LANGSUNG DARI DB) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Availability Alat {selectedSite} • {selectedMethod}:
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-500">
                {selectedInstruments.length} Alat Terpilih
              </span>
              <button
                onClick={() => {
                  setNewInstSite(selectedSite);
                  setNewInstMethod(selectedMethod);
                  setShowAddInstrumentModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Daftarkan Alat XRF Baru Langsung ke Portal"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Alat</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {currentCategoryInstruments.map((inst, idx) => {
              const active = selectedInstruments.includes(inst.code);
              const theme = getInstrumentTheme(inst.code, inst.name, idx);
              const hasData = (inst.measurementCount || 0) > 0;

              return (
                <button
                  key={`inst-btn-${inst.code}`}
                  onClick={() => toggleInstrument(inst.code)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    active 
                      ? `${theme.pillActive} shadow-xs scale-[1.02]`
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: theme.dotColor }} 
                      />
                      <span className="text-xs font-black truncate">{inst.name}</span>
                    </div>
                    {active ? (
                      <CheckSquare className="w-3.5 h-3.5 flex-shrink-0 ml-1" />
                    ) : (
                      <Square className="w-3.5 h-3.5 flex-shrink-0 ml-1 opacity-40" />
                    )}
                  </div>

                  {/* Real-time Availability Badge */}
                  <div className="mt-2 pt-1 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[10px]">
                    <span className="truncate opacity-75">{inst.brandModel}</span>
                    {hasData ? (
                      <span className="font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[9.5px]">
                        {inst.measurementCount} Batch
                      </span>
                    ) : (
                      <span className="opacity-50 text-[9.5px]">No Data</span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Quick Add Tool Card in Grid */}
            <button
              onClick={() => {
                setNewInstSite(selectedSite);
                setNewInstMethod(selectedMethod);
                setShowAddInstrumentModal(true);
              }}
              className="p-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-500 dark:border-slate-700 dark:hover:border-teal-400 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[70px]"
              title="Daftarkan Alat Baru"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[11px] font-bold">+ Alat Baru</span>
            </button>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN COMPARISON STRIP HEADER (PINNED HEADER 1)             */}
      {/* ------------------------------------------------------------- */}
      <div className="sticky top-[57px] z-30 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {viewMode === 'side-by-side' ? (
          <div 
            ref={headerScrollRef}
            onScroll={(e) => handleScrollSync(e.currentTarget)}
            className="overflow-x-auto scrollbar-none"
          >
            <div className={`flex flex-nowrap gap-4 min-w-max ${selectedInstruments.length <= 3 ? 'min-w-full justify-center' : ''}`}>
              {selectedInstruments.map((instCode, idx) => {
                const theme = getInstrumentTheme(instCode, undefined, idx);
                return (
                  <div
                    key={`strip-hdr-${instCode}`}
                    className={`w-[380px] md:w-[440px] flex-shrink-0 text-center py-2 px-3 rounded-xl shadow-xs uppercase tracking-widest text-xs border-2 ${theme.headerBg} ${theme.headerBorder}`}
                  >
                    {theme.name}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`grid ${getGridColsClass()} gap-3 ${selectedInstruments.length === 3 ? 'max-w-7xl mx-auto' : ''}`}>
            {selectedInstruments.map((instCode, idx) => {
              const theme = getInstrumentTheme(instCode, undefined, idx);
              return (
                <div
                  key={`grid-hdr-${instCode}`}
                  className={`text-center py-2 px-3 rounded-xl shadow-xs uppercase tracking-widest text-xs border-2 ${theme.headerBg} ${theme.headerBorder}`}
                >
                  {theme.name}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. DYNAMIC CHARTS PER SELECTED CRM STANDARD                   */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-8">
        {renderedStandards.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Belum Ada Data untuk Kategori {selectedSite} • {selectedMethod} {selectedMethod === 'EDXRF' ? `• ${selectedMatrix}` : ''}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Instrumen pada kategori ini belum memiliki data pengukuran yang diimpor, atau standar terpilih belum memiliki data.
              </p>
            </div>
            {selectedMethod === 'EDXRF' ? (
              <button
                onClick={() => {
                  setSelectedMethod('EDXRF');
                  setSelectedMatrix('SAPROLITE');
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Reset ke Metode EDXRF (Saprolite)
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedMethod('EDXRF');
                  setSelectedMatrix('SAPROLITE');
                }}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Beralih ke Metode EDXRF
              </button>
            )}
          </div>
        ) : (
          renderedStandards.map(std => {
            const stdCode = std.code;
            const stdData = currentGridData[stdCode] || currentGridData[stdCode.replace('_', ' ')] || currentGridData[std.name] || {};
            const stdCount = std.count || standardCountMap[stdCode] || standardCountMap[stdCode.replace('_', ' ')] || 0;

            return (
              <div 
                key={`compare-row-${stdCode}`} 
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4"
              >
                {/* Standard CRM Section Banner (PINNED HEADER 2 - CENTERED) */}
                <div className="sticky top-[111px] z-20 -mx-4 -mt-4 px-4 py-2.5 rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-center text-center shadow-2xs">
                  <span className="px-3.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white dark:bg-white dark:text-slate-900 tracking-wider">
                    STANDAR: {std.name}
                  </span>
                </div>

                {/* Charts Rendering: Side-by-Side (Strip) vs Responsive Grid */}
                {viewMode === 'side-by-side' ? (
                  <div 
                    onScroll={(e) => handleScrollSync(e.currentTarget)}
                    className="xrf-strip-scroll overflow-x-auto pb-4 pt-1 scrollbar-thin"
                  >
                    <div className={`flex flex-nowrap gap-4 min-w-max ${selectedInstruments.length <= 3 ? 'min-w-full justify-center' : ''}`}>
                      {selectedInstruments.map((instCode, idx) => {
                        const theme = getInstrumentTheme(instCode, undefined, idx);
                        const instData = stdData[instCode] || {
                          limits: { nominalValue: 0, stdevFixed: 0.05, upperAction: 0, upperWarning: 0, lowerWarning: 0, lowerAction: 0 },
                          statistics: { count: 0, mean: 0, median: 0, min: 0, max: 0, actualStdev: 0 },
                          points: [],
                        };

                        const cardKey = `${instCode}-${std.name}-${selectedElement}`;
                        const cardAnnotations: Record<number, XrfPointAnnotation> = {};
                        Object.entries(pointAnnotations).forEach(([k, ann]) => {
                          if (k.startsWith(`${cardKey}-`)) {
                            const pIdx = parseInt(k.replace(`${cardKey}-`, ''), 10);
                            if (!isNaN(pIdx)) cardAnnotations[pIdx] = ann;
                          }
                        });

                        return (
                          <div 
                            key={`card-side-${stdCode}-${instCode}`} 
                            className="w-[380px] md:w-[440px] flex-shrink-0 transition-transform"
                          >
                            <XrfQcChartCard
                              standardCode={std.name}
                              instrumentName={theme.name}
                              instrumentCode={instCode}
                              headerColorClass={theme.headerBg}
                              currentElement={selectedElement}
                              onSelectElement={handleSelectElement}
                              limits={instData.limits}
                              statistics={instData.statistics}
                              points={instData.points}
                              showStats={showStats}
                              compactStats={compactStats}
                              onToggleIsolatePoint={(pt, el, lim) => handleToggleIsolatePoint(pt, el, lim, instCode, theme.name, std.name)}
                              onOpenOffspecModal={() => setShowOffspecModal(true)}
                              onIsolateAllOffspecInCard={(pts, el, lim) => handleIsolateAllOffspecInCard(pts, el, lim, instCode, theme.name, std.name)}
                              isPointIsolated={(pt, el) => isPointIsolated(pt, el, instCode, std.name)}
                              annotations={cardAnnotations}
                              onSaveAnnotation={(pIdx, ann) => handleSaveAnnotation(cardKey, pIdx, ann)}
                              onDeleteAnnotation={(pIdx) => handleDeleteAnnotation(cardKey, pIdx)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={`grid ${getGridColsClass()} gap-4 ${selectedInstruments.length === 3 ? 'max-w-7xl mx-auto' : ''}`}>
                    {selectedInstruments.map((instCode, idx) => {
                      const theme = getInstrumentTheme(instCode, undefined, idx);
                      const instData = stdData[instCode] || {
                        limits: { nominalValue: 0, stdevFixed: 0.05, upperAction: 0, upperWarning: 0, lowerWarning: 0, lowerAction: 0 },
                        statistics: { count: 0, mean: 0, median: 0, min: 0, max: 0, actualStdev: 0 },
                        points: [],
                      };

                      const cardKey = `${instCode}-${std.name}-${selectedElement}`;
                      const cardAnnotations: Record<number, XrfPointAnnotation> = {};
                      Object.entries(pointAnnotations).forEach(([k, ann]) => {
                        if (k.startsWith(`${cardKey}-`)) {
                          const pIdx = parseInt(k.replace(`${cardKey}-`, ''), 10);
                          if (!isNaN(pIdx)) cardAnnotations[pIdx] = ann;
                        }
                      });

                      return (
                        <div key={`card-grid-${stdCode}-${instCode}`}>
                          <XrfQcChartCard
                            standardCode={std.name}
                            instrumentName={theme.name}
                            instrumentCode={instCode}
                            headerColorClass={theme.headerBg}
                            currentElement={selectedElement}
                            onSelectElement={handleSelectElement}
                            limits={instData.limits}
                            statistics={instData.statistics}
                            points={instData.points}
                            showStats={showStats}
                            compactStats={compactStats}
                            onToggleIsolatePoint={(pt, el, lim) => handleToggleIsolatePoint(pt, el, lim, instCode, theme.name, std.name)}
                            onOpenOffspecModal={() => setShowOffspecModal(true)}
                            onIsolateAllOffspecInCard={(pts, el, lim) => handleIsolateAllOffspecInCard(pts, el, lim, instCode, theme.name, std.name)}
                            isPointIsolated={(pt, el) => isPointIsolated(pt, el, instCode, std.name)}
                            annotations={cardAnnotations}
                            onSaveAnnotation={(pIdx, ann) => handleSaveAnnotation(cardKey, pIdx, ann)}
                            onDeleteAnnotation={(pIdx) => handleDeleteAnnotation(cardKey, pIdx)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dedicated Off-Spec Data Isolation Modal & Per-Instrument Recap */}
      <XrfOffspecIsolationModal
        isOpen={showOffspecModal}
        onClose={() => setShowOffspecModal(false)}
        isolatedPoints={isolatedPoints}
        onRemovePoint={handleRemovePoint}
        onClearAll={handleClearAll}
        onAutoIsolateAllOffspec={handleAutoIsolateAllOffspec}
        instrumentThemes={INSTRUMENT_THEMES}
      />

      {/* Modal Tambah Alat XRF Baru Langsung di Portal */}
      {showAddInstrumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Tambah Instrumen XRF Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan alat analisa baru ke portal tanpa perlu ubah coding
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddInstrumentModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newInstName.trim()) {
                  toast.error("Nama alat wajib diisi.");
                  return;
                }
                const cleanCode = (newInstCode || newInstName).trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
                if (!cleanCode) {
                  toast.error("Kode alat tidak valid.");
                  return;
                }

                setIsSubmittingInst(true);
                try {
                  const res = await fetch('/api/xrf/instruments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: newInstName.trim(),
                      code: cleanCode,
                      brandModel: newInstBrand.trim() || (newInstMethod === 'WDXRF' ? 'Rigaku Supermini200' : 'PANalytical Epsilon 4'),
                      site: newInstSite,
                      methodType: newInstMethod,
                      colorTag: newInstColorTag,
                    })
                  });
                  const json = await res.json();
                  if (!json.success) {
                    toast.error(json.error || "Gagal menambahkan alat baru.");
                    return;
                  }

                  toast.success(json.message || "Alat baru berhasil ditambahkan!");
                  await loadMasterInstruments();
                  await onInstrumentsChanged?.();
                  
                  // Auto-select newly created instrument
                  setSelectedInstruments(prev => Array.from(new Set([...prev, cleanCode])).slice(0, 6));

                  // Reset & close modal
                  setNewInstName('');
                  setNewInstCode('');
                  setShowAddInstrumentModal(false);
                } catch (err: any) {
                  toast.error("Terjadi kesalahan jaringan saat menyimpan alat.");
                } finally {
                  setIsSubmittingInst(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Alat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: EPSILON G atau S2 PUMA 02"
                    value={newInstName}
                    onChange={(e) => {
                      setNewInstName(e.target.value);
                      setNewInstCode(e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_'));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Unik (ID Sistem) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: EPSILON_G"
                    value={newInstCode}
                    onChange={(e) => setNewInstCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-teal-600 dark:text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Site & Method Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Entitas / Site Lab
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewInstSite('TBP')}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        newInstSite === 'TBP'
                          ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      TBP / GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewInstSite('GTS')}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        newInstSite === 'GTS'
                          ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      GTS
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Spektrometri
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewInstMethod('EDXRF')}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        newInstMethod === 'EDXRF'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      EDXRF
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewInstMethod('WDXRF')}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        newInstMethod === 'WDXRF'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      WDXRF
                    </button>
                  </div>
                </div>
              </div>

              {/* Brand & Model */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Brand & Model Mesin
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'PANalytical Epsilon 4',
                    'Bruker S2 PUMA',
                    'Rigaku Supermini200',
                    'PANalytical Zetium',
                  ].map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setNewInstBrand(brand)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        newInstBrand === brand
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 border border-teal-300 dark:border-teal-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Ketik model custom..."
                  value={newInstBrand}
                  onChange={(e) => setNewInstBrand(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Color Tag Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tema Warna Pill & Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { tag: 'teal', color: '#14B8A6' },
                    { tag: 'cyan', color: '#06B6D4' },
                    { tag: 'blue', color: '#2563EB' },
                    { tag: 'indigo', color: '#6366F1' },
                    { tag: 'purple', color: '#9333EA' },
                    { tag: 'violet', color: '#8B5CF6' },
                    { tag: 'fuchsia', color: '#D946EF' },
                    { tag: 'rose', color: '#F43F5E' },
                    { tag: 'orange', color: '#F97316' },
                    { tag: 'amber', color: '#F59E0B' },
                    { tag: 'emerald', color: '#10B981' },
                  ].map((c) => (
                    <button
                      key={c.tag}
                      type="button"
                      onClick={() => setNewInstColorTag(c.tag)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        newInstColorTag === c.tag ? 'ring-3 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                    >
                      {newInstColorTag === c.tag && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddInstrumentModal(false)}
                  disabled={isSubmittingInst}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInst}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingInst ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Simpan & Daftarkan Alat</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
