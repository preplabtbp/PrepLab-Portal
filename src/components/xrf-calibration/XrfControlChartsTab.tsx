import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  LineChart, Sliders, RefreshCw, Calendar, ArrowLeftRight, 
  HelpCircle, Sparkles, Filter, Check, Eye, EyeOff, 
  LayoutGrid, Columns, Layers, CheckSquare, Square, Info, ShieldCheck,
  CheckCircle2, Database, ChevronDown, ChevronUp, RotateCcw, Activity, Building2, Cpu, ShieldAlert,
  Plus, X, Archive, Lock, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { XrfQcChartCard, QC_ELEMENTS_LIST, XrfPointData, XrfChartLimitData, XrfPointAnnotation } from './XrfQcChartCard';
import { XrfOffspecIsolationModal, IsolatedOffspecPoint } from './XrfOffspecIsolationModal';
import { formatStandardDisplayName, isWdxrfInstrument } from '../../utils/xrfStandardDetector';
import { XrfChartFullscreenModal } from './XrfChartFullscreenModal';
import { 
  getTakeoutUserAuth, 
  recordTakeoutAuditLogs, 
  XrfOffspecAuditLog 
} from '../../utils/xrfTakeoutAuth';
import { XrfTakeoutReasonModal } from './XrfTakeoutReasonModal';
import { XrfTakeoutAuditLogsModal } from './XrfTakeoutAuditLogsModal';

interface XrfControlChartsTabProps {
  instruments: Array<{ code: string; name: string }>;
  standards: Array<{ code: string; name: string }>;
  assignedSite?: 'GTS' | 'TBP';
  isDevOrManager?: boolean;
  currentUserNik?: string;
  currentUserName?: string;
  currentUserJabatan?: string;
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

// Urutan standar default skema WDXRF Zetium PANalytical (22 Standar TBP Aktual)
export const WDXRF_ZETIUM_DEFAULT_STANDARDS_ORDER = [
  'OREAS70B',
  'BRK03',
  'OREAS182',
  'NILTRT11',
  'OREAS184',
  'LIM13',
  'OB',
  'OREAS187',
  'NILTRT45',
  'OREAS189',
  'OREAS190',
  'LIM',
  'OREAS191',
  'OREAS192',
  'SAP16',
  'OREAS193',
  'SAP19',
  'OREAS194',
  'SAP',
  'OREAS72B',
  'OREAS185',
  'ZBK411',
];

export const STANDARD_DISPLAY_NAMES: Record<string, string> = {
  'BLANK_A': 'BLANK A',
  'BLANK_B': 'VER-BLANK B',
  'BLANK A': 'BLANK A',
  'BLANK B': 'VER-BLANK B',
  'VER-BLANK B': 'VER-BLANK B',
  'OREAS70B': 'OREAS 70B',
  'OREAS 70B': 'OREAS 70B',
  'BRK03': 'BRK 03',
  'BRK 03': 'BRK 03',
  'BRK': 'BRK 03',
  'OREAS182': 'OREAS 182',
  'OREAS 182': 'OREAS 182',
  'NILTRT11': 'NILTRT 11',
  'NILTRT 11': 'NILTRT 11',
  'LIM01': 'LIM 01',
  'LIM02': 'LIM 02',
  'LIM03': 'LIM 03',
  'LIM04': 'LIM 04',
  'LIM05': 'LIM 05',
  'LIM13': 'LIM 13',
  'OB': 'OB',
  'NILTRT45': 'NILTRT 45',
  'NILTRT 45': 'NILTRT 45',
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
  'OREAS72B': 'OREAS 72B',
  'OREAS 72B': 'OREAS 72B',
  'OREAS185': 'OREAS 185',
  'OREAS 185': 'OREAS 185',
  'ZBK411': 'ZBK 411',
  'ZBK 411': 'ZBK 411',
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
    headerBg: 'bg-[#e7f3f8] dark:bg-sky-950/60 text-[#1e4e69] dark:text-sky-200 font-bold',
    headerBorder: 'border-[#bcdbec] dark:border-sky-800/70',
    pillActive: 'bg-[#e7f3f8] dark:bg-sky-950/70 text-[#1e4e69] dark:text-sky-200 border-[#bcdbec] dark:border-sky-800 shadow-2xs font-bold',
    dotColor: '#337ea9',
    badgeBg: 'bg-[#e7f3f8] text-[#1e4e69] dark:bg-sky-950/80 dark:text-sky-200 border-[#bcdbec] dark:border-sky-800',
    textColor: 'text-[#337ea9] dark:text-sky-400',
  },
  EPSILON_B: {
    code: 'EPSILON_B',
    name: 'EPSILON B',
    headerBg: 'bg-[#f4f0f7] dark:bg-purple-950/60 text-[#543b66] dark:text-purple-200 font-bold',
    headerBorder: 'border-[#dcd2e6] dark:border-purple-800/70',
    pillActive: 'bg-[#f4f0f7] dark:bg-purple-950/70 text-[#543b66] dark:text-purple-200 border-[#dcd2e6] dark:border-purple-800 shadow-2xs font-bold',
    dotColor: '#9065b0',
    badgeBg: 'bg-[#f4f0f7] text-[#543b66] dark:bg-purple-950/80 dark:text-purple-200 border-[#dcd2e6] dark:border-purple-800',
    textColor: 'text-[#9065b0] dark:text-purple-400',
  },
  EPSILON_C: {
    code: 'EPSILON_C',
    name: 'EPSILON C',
    headerBg: 'bg-[#e6f4f1] dark:bg-teal-950/60 text-[#1d5249] dark:text-teal-200 font-bold',
    headerBorder: 'border-[#bfe3dc] dark:border-teal-800/70',
    pillActive: 'bg-[#e6f4f1] dark:bg-teal-950/70 text-[#1d5249] dark:text-teal-200 border-[#bfe3dc] dark:border-teal-800 shadow-2xs font-bold',
    dotColor: '#2e8b7d',
    badgeBg: 'bg-[#e6f4f1] text-[#1d5249] dark:bg-teal-950/80 dark:text-teal-200 border-[#bfe3dc] dark:border-teal-800',
    textColor: 'text-[#2e8b7d] dark:text-teal-400',
  },
  EPSILON_D: {
    code: 'EPSILON_D',
    name: 'EPSILON D',
    headerBg: 'bg-[#fbf3db] dark:bg-amber-950/60 text-[#6e4e1f] dark:text-amber-200 font-bold',
    headerBorder: 'border-[#f2dfaa] dark:border-amber-800/70',
    pillActive: 'bg-[#fbf3db] dark:bg-amber-950/70 text-[#6e4e1f] dark:text-amber-200 border-[#f2dfaa] dark:border-amber-800 shadow-2xs font-bold',
    dotColor: '#cb912f',
    badgeBg: 'bg-[#fbf3db] text-[#6e4e1f] dark:bg-amber-950/80 dark:text-amber-200 border-[#f2dfaa] dark:border-amber-800',
    textColor: 'text-[#cb912f] dark:text-amber-400',
  },
  EPSILON_E: {
    code: 'EPSILON_E',
    name: 'EPSILON E',
    headerBg: 'bg-[#faebdd] dark:bg-orange-950/60 text-[#733d0e] dark:text-orange-200 font-bold',
    headerBorder: 'border-[#f4ccaa] dark:border-orange-800/70',
    pillActive: 'bg-[#faebdd] dark:bg-orange-950/70 text-[#733d0e] dark:text-orange-200 border-[#f4ccaa] dark:border-orange-800 shadow-2xs font-bold',
    dotColor: '#d9730d',
    badgeBg: 'bg-[#faebdd] text-[#733d0e] dark:bg-orange-950/80 dark:text-orange-200 border-[#f4ccaa] dark:border-orange-800',
    textColor: 'text-[#d9730d] dark:text-orange-400',
  },
  EPSILON_F: {
    code: 'EPSILON_F',
    name: 'EPSILON F',
    headerBg: 'bg-[#fdebec] dark:bg-rose-950/60 text-[#692429] dark:text-rose-200 font-bold',
    headerBorder: 'border-[#f7c8cc] dark:border-rose-800/70',
    pillActive: 'bg-[#fdebec] dark:bg-rose-950/70 text-[#692429] dark:text-rose-200 border-[#f7c8cc] dark:border-rose-800 shadow-2xs font-bold',
    dotColor: '#d44c47',
    badgeBg: 'bg-[#fdebec] text-[#692429] dark:bg-rose-950/80 dark:text-rose-200 border-[#f7c8cc] dark:border-rose-800',
    textColor: 'text-[#d44c47] dark:text-rose-400',
  },
  EPSILON_G: {
    code: 'EPSILON_G',
    name: 'EPSILON G',
    headerBg: 'bg-[#edf3ec] dark:bg-emerald-950/60 text-[#254d38] dark:text-emerald-200 font-bold',
    headerBorder: 'border-[#cce1cc] dark:border-emerald-800/70',
    pillActive: 'bg-[#edf3ec] dark:bg-emerald-950/70 text-[#254d38] dark:text-emerald-200 border-[#cce1cc] dark:border-emerald-800 shadow-2xs font-bold',
    dotColor: '#448361',
    badgeBg: 'bg-[#edf3ec] text-[#254d38] dark:bg-emerald-950/80 dark:text-emerald-200 border-[#cce1cc] dark:border-emerald-800',
    textColor: 'text-[#448361] dark:text-emerald-400',
  },
  EPSILON_H: {
    code: 'EPSILON_H',
    name: 'EPSILON H',
    headerBg: 'bg-[#eef0f8] dark:bg-indigo-950/60 text-[#2f3d6b] dark:text-indigo-200 font-bold',
    headerBorder: 'border-[#cdd4eb] dark:border-indigo-800/70',
    pillActive: 'bg-[#eef0f8] dark:bg-indigo-950/70 text-[#2f3d6b] dark:text-indigo-200 border-[#cdd4eb] dark:border-indigo-800 shadow-2xs font-bold',
    dotColor: '#5c6fb1',
    badgeBg: 'bg-[#eef0f8] text-[#2f3d6b] dark:bg-indigo-950/80 dark:text-indigo-200 border-[#cdd4eb] dark:border-indigo-800',
    textColor: 'text-[#5c6fb1] dark:text-indigo-400',
  },
  S2_PUMA: {
    code: 'S2_PUMA',
    name: 'S2 PUMA',
    headerBg: 'bg-[#f4f0f7] dark:bg-purple-950/60 text-[#543b66] dark:text-purple-200 font-bold',
    headerBorder: 'border-[#dcd2e6] dark:border-purple-800/70',
    pillActive: 'bg-[#f4f0f7] dark:bg-purple-950/70 text-[#543b66] dark:text-purple-200 border-[#dcd2e6] dark:border-purple-800 shadow-2xs font-bold',
    dotColor: '#8a62a6',
    badgeBg: 'bg-[#f4f0f7] text-[#543b66] dark:bg-purple-950/80 dark:text-purple-200 border-[#dcd2e6] dark:border-purple-800',
    textColor: 'text-[#8a62a6] dark:text-purple-400',
  },
  SUPERMINI: {
    code: 'SUPERMINI',
    name: 'Supermini',
    headerBg: 'bg-[#e7f3f8] dark:bg-sky-950/60 text-[#1e4e69] dark:text-sky-200 font-bold',
    headerBorder: 'border-[#bcdbec] dark:border-sky-800/70',
    pillActive: 'bg-[#e7f3f8] dark:bg-sky-950/70 text-[#1e4e69] dark:text-sky-200 border-[#bcdbec] dark:border-sky-800 shadow-2xs font-bold',
    dotColor: '#337ea9',
    badgeBg: 'bg-[#e7f3f8] text-[#1e4e69] dark:bg-sky-950/80 dark:text-sky-200 border-[#bcdbec] dark:border-sky-800',
    textColor: 'text-[#337ea9] dark:text-sky-400',
  },
  ZETIUM_A: {
    code: 'ZETIUM_A',
    name: 'Zetium A',
    headerBg: 'bg-[#faf1f5] dark:bg-pink-950/60 text-[#692945] dark:text-pink-200 font-bold',
    headerBorder: 'border-[#eed3e0] dark:border-pink-800/70',
    pillActive: 'bg-[#faf1f5] dark:bg-pink-950/70 text-[#692945] dark:text-pink-200 border-[#eed3e0] dark:border-pink-800 shadow-2xs font-bold',
    dotColor: '#c14c8a',
    badgeBg: 'bg-[#faf1f5] text-[#692945] dark:bg-pink-950/80 dark:text-pink-200 border-[#eed3e0] dark:border-pink-800',
    textColor: 'text-[#c14c8a] dark:text-pink-400',
  },
  ZETIUM_B: {
    code: 'ZETIUM_B',
    name: 'Zetium B',
    headerBg: 'bg-[#f4eeee] dark:bg-stone-900 text-[#5e4336] dark:text-stone-200 font-bold',
    headerBorder: 'border-[#dfd3ce] dark:border-stone-700',
    pillActive: 'bg-[#f4eeee] dark:bg-stone-900 text-[#5e4336] dark:text-stone-200 border-[#dfd3ce] dark:border-stone-700 shadow-2xs font-bold',
    dotColor: '#9f6b53',
    badgeBg: 'bg-[#f4eeee] text-[#5e4336] dark:bg-stone-900 dark:text-stone-200 border-[#dfd3ce] dark:border-stone-700',
    textColor: 'text-[#9f6b53] dark:text-stone-400',
  },
};

function getInstrumentTheme(code: string, fallbackName?: string, index: number = 0): InstrumentTheme {
  if (INSTRUMENT_THEMES[code]) return INSTRUMENT_THEMES[code];
  const colorRotation = [
    { bg: 'bg-[#e7f3f8] dark:bg-sky-950/60 text-[#1e4e69] dark:text-sky-200', border: 'border-[#bcdbec] dark:border-sky-800/70', dot: '#337ea9', text: 'text-[#337ea9]' },
    { bg: 'bg-[#edf3ec] dark:bg-emerald-950/60 text-[#254d38] dark:text-emerald-200', border: 'border-[#cce1cc] dark:border-emerald-800/70', dot: '#448361', text: 'text-[#448361]' },
    { bg: 'bg-[#faebdd] dark:bg-orange-950/60 text-[#733d0e] dark:text-orange-200', border: 'border-[#f4ccaa] dark:border-orange-800/70', dot: '#d9730d', text: 'text-[#d9730d]' },
    { bg: 'bg-[#f4f0f7] dark:bg-purple-950/60 text-[#543b66] dark:text-purple-200', border: 'border-[#dcd2e6] dark:border-purple-800/70', dot: '#9065b0', text: 'text-[#9065b0]' },
    { bg: 'bg-[#fdebec] dark:bg-rose-950/60 text-[#692429] dark:text-rose-200', border: 'border-[#f7c8cc] dark:border-rose-800/70', dot: '#d44c47', text: 'text-[#d44c47]' },
    { bg: 'bg-[#e6f4f1] dark:bg-teal-950/60 text-[#1d5249] dark:text-teal-200', border: 'border-[#bfe3dc] dark:border-teal-800/70', dot: '#2e8b7d', text: 'text-[#2e8b7d]' },
  ];
  const c = colorRotation[index % colorRotation.length];
  return {
    code,
    name: fallbackName || code.replace('_', ' '),
    headerBg: `${c.bg} font-bold`,
    headerBorder: c.border,
    pillActive: `${c.bg} ${c.border} shadow-2xs font-bold`,
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
  currentUserNik,
  currentUserName,
  currentUserJabatan,
  onInstrumentsChanged,
}) => {
  // Otorisasi Take Out Data Off-Spec (Hanya SPV, SPT Lab, Dev, dan Manager)
  const auth = useMemo(() => {
    return getTakeoutUserAuth({
      nik: currentUserNik,
      name: currentUserName,
      jabatan: currentUserJabatan,
    });
  }, [currentUserNik, currentUserName, currentUserJabatan]);

  const checkTakeoutPermissionOrWarn = useCallback(() => {
    if (!auth.allowed) {
      toast.error("Akses Ditolak: Fitur Take Out data off-spec hanya diizinkan untuk SPV & SPT Lab, Developer, dan Manager.", {
        duration: 5000,
      });
      return false;
    }
    return true;
  }, [auth.allowed]);

  // Modal State: Konfirmasi Take Out dengan Alasan
  const [takeoutPendingPoint, setTakeoutPendingPoint] = useState<{
    point: XrfPointData;
    element: string;
    limits: XrfChartLimitData;
    instrumentCode: string;
    instrumentName: string;
    standardCode: string;
  } | null>(null);

  // Modal State: Riwayat Audit Trail Log Take Out
  const [showTakeoutAuditModal, setShowTakeoutAuditModal] = useState<boolean>(false);

  // -----------------------------------------------------------------
  // 1. SIMPLIFIED ENTERPRISE HIERARCHY (SITE -> METHOD -> MATRIX)
  // -----------------------------------------------------------------
  // A. Site / Organization: Terikat secara universal ke profile/assignedSite user
  const [selectedSite, setSelectedSite] = useState<'GTS' | 'TBP'>(() => assignedSite || 'TBP');

  useEffect(() => {
    if (assignedSite) {
      setSelectedSite(assignedSite);
    }
  }, [assignedSite]);

  // Accordion drawer state for secondary settings (Instruments & Layout)
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('xrf_header_accordion_open') === 'true';
    } catch {
      return false;
    }
  });

  const toggleAccordion = () => {
    setIsAccordionOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('xrf_header_accordion_open', String(next));
      } catch {}
      return next;
    });
  };

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
  const [fullscreenModalState, setFullscreenModalState] = useState<{
    isOpen: boolean;
    standardCode: string;
    standardRawCode?: string;
    instrumentName: string;
    instrumentCode: string;
    headerColorClass?: string;
  } | null>(null);

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
    if (!checkTakeoutPermissionOrWarn()) return;
    const pointId = `${instCode}-${stdCode}-${element}-${point.index}`;
    const exists = isolatedPoints.some(p => p.id === pointId);

    if (exists) {
      // Pulihkan kembali ke grafik kontrol utama
      setIsolatedPoints(prev => prev.filter(p => p.id !== pointId));
      recordTakeoutAuditLogs({
        action: 'RESTORE',
        userNik: auth.userInfo.nik,
        userName: auth.userInfo.name,
        userJabatan: auth.userInfo.jabatan,
        userRole: auth.userInfo.role,
        instrumentCode: instCode,
        instrumentName: instName,
        standardCode: stdCode,
        element,
        pointIndex: point.index,
        measuredValue: point.value,
        nominalValue: limits.nominalValue,
        sigmaDist: limits.stdevFixed > 0 ? ((point.value - limits.nominalValue) / limits.stdevFixed) : 0,
        diff: point.value - limits.nominalValue,
        sampleDate: point.date,
        reason: 'Titik dipulihkan kembali ke grafik kendali utama',
      });
      toast.info(`Titik #${point.index} (${element}) dikeluarkan dari isolasi data off-spec`);
    } else {
      // Buka modal konfirmasi dengan alasan/justifikasi teknis yang wajib
      setTakeoutPendingPoint({
        point,
        element,
        limits,
        instrumentCode: instCode,
        instrumentName: instName,
        standardCode: stdCode,
      });
    }
  }, [isolatedPoints, checkTakeoutPermissionOrWarn, auth.userInfo]);

  const handleConfirmTakeout = useCallback((reason: string) => {
    if (!takeoutPendingPoint) return;
    const { point, element, limits, instrumentCode: instCode, instrumentName: instName, standardCode: stdCode } = takeoutPendingPoint;
    const pointId = `${instCode}-${stdCode}-${element}-${point.index}`;
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
      note: reason,
      issue: ann?.issue || reason,
      solution: ann?.solution,
      picNik: ann?.picNik || auth.userInfo.nik,
      picName: ann?.picName || auth.userInfo.name,
    };

    setIsolatedPoints(prev => [...prev.filter(p => p.id !== pointId), newPoint]);

    recordTakeoutAuditLogs({
      action: 'ISOLATE',
      userNik: auth.userInfo.nik,
      userName: auth.userInfo.name,
      userJabatan: auth.userInfo.jabatan,
      userRole: auth.userInfo.role,
      instrumentCode: instCode,
      instrumentName: instName,
      standardCode: stdCode,
      element,
      pointIndex: point.index,
      measuredValue: point.value,
      nominalValue: limits.nominalValue,
      sigmaDist: pointSigma,
      diff: point.value - limits.nominalValue,
      statusLabel,
      reason,
      sampleDate: point.date,
    });

    toast.success(`Titik #${point.index} (${element}) berhasil di-take out & dicatat dalam audit trail.`);
    setTakeoutPendingPoint(null);
  }, [takeoutPendingPoint, pointAnnotations, auth.userInfo]);

  const handleRemovePoint = useCallback((id: string) => {
    if (!checkTakeoutPermissionOrWarn()) return;
    const target = isolatedPoints.find(p => p.id === id);
    setIsolatedPoints(prev => prev.filter(p => p.id !== id));
    if (target) {
      recordTakeoutAuditLogs({
        action: 'RESTORE',
        userNik: auth.userInfo.nik,
        userName: auth.userInfo.name,
        userJabatan: auth.userInfo.jabatan,
        userRole: auth.userInfo.role,
        instrumentCode: target.instrumentCode,
        instrumentName: target.instrumentName,
        standardCode: target.standardCode,
        element: target.element,
        pointIndex: target.index,
        measuredValue: target.value,
        nominalValue: target.nominalValue,
        sigmaDist: target.sigmaDist,
        diff: target.diff,
        sampleDate: target.date,
        reason: 'Titik dipulihkan kembali ke grafik kontrol utama',
      });
    }
    toast.info('Titik off-spec dihapus dari rekap isolasi');
  }, [isolatedPoints, checkTakeoutPermissionOrWarn, auth.userInfo]);

  const handleClearAll = useCallback(() => {
    if (!checkTakeoutPermissionOrWarn()) return;
    const count = isolatedPoints.length;
    setIsolatedPoints([]);
    recordTakeoutAuditLogs({
      action: 'CLEAR_ALL',
      userNik: auth.userInfo.nik,
      userName: auth.userInfo.name,
      userJabatan: auth.userInfo.jabatan,
      userRole: auth.userInfo.role,
      reason: `Reset seluruh data isolasi off-spec (${count} titik dipulihkan)`,
    });
    toast.info('Semua data isolasi off-spec telah dibersihkan');
  }, [isolatedPoints.length, checkTakeoutPermissionOrWarn, auth.userInfo]);

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
    if (!checkTakeoutPermissionOrWarn()) return;
    const offspecPoints = cardPoints.filter(p => {
      const dist = limits.stdevFixed > 0 ? Math.abs((p.value - limits.nominalValue) / limits.stdevFixed) : 0;
      return dist > 2.0;
    });

    if (offspecPoints.length === 0) {
      toast.info('Tidak ada titik off-spec (>2σ) pada standar ini.');
      return;
    }

    const logsToRecord: XrfOffspecAuditLog[] = [];
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
            note: 'Bulk take-out titik off-spec pada standar ini',
            issue: ann?.issue,
            solution: ann?.solution,
            picNik: ann?.picNik || auth.userInfo.nik,
            picName: ann?.picName || auth.userInfo.name,
          });

          logsToRecord.push({
            action: 'BULK_ISOLATE',
            userNik: auth.userInfo.nik,
            userName: auth.userInfo.name,
            userJabatan: auth.userInfo.jabatan,
            userRole: auth.userInfo.role,
            instrumentCode: instCode,
            instrumentName: instName,
            standardCode: stdCode,
            element,
            pointIndex: p.index,
            measuredValue: p.value,
            nominalValue: limits.nominalValue,
            sigmaDist: pointSigma,
            diff: p.value - limits.nominalValue,
            statusLabel,
            reason: 'Bulk take-out titik off-spec (>2σ) pada standar ini',
            sampleDate: p.date,
          });
        }
      });

      if (newlyAdded.length > 0) {
        toast.success(`${newlyAdded.length} titik off-spec di ${stdCode} (${element}) berhasil di-take out & direkam!`);
        recordTakeoutAuditLogs(logsToRecord);
      } else {
        toast.info(`Semua titik off-spec di ${stdCode} sudah terisolasi sebelumnya.`);
      }

      return [...prev, ...newlyAdded];
    });
  }, [pointAnnotations, checkTakeoutPermissionOrWarn, auth.userInfo]);

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

  const handleSelectAllInstruments = () => {
    setSelectedInstruments(currentCategoryInstruments.map(i => i.code));
    toast.success(`Semua alat ${selectedMethod} (${currentCategoryInstruments.length} alat) dipilih`);
  };

  const handleResetDefaultInstruments = () => {
    const withData = currentCategoryInstruments.filter(i => (i.measurementCount || 0) > 0).map(i => i.code);
    if (withData.length > 0) {
      setSelectedInstruments(withData.slice(0, 6));
    } else {
      setSelectedInstruments(currentCategoryInstruments.slice(0, 6).map(i => i.code));
    }
    toast.info("Pilihan alat dikembalikan ke default");
  };


  const [latestBatchStandards, setLatestBatchStandards] = useState<string[]>([]);
  const [showHistoricalStandards, setShowHistoricalStandards] = useState(false);

  // Map of standardCode -> count for quick lookup with aliases
  const standardCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of availableStandardsData) {
      const c = item.standardCode;
      const cnt = item.count;
      map[c] = (map[c] || 0) + cnt;
      const clean = c.toUpperCase().replace(/[\s_-]+/g, '');
      const space = c.replace(/_/g, ' ');
      const under = c.replace(/\s+/g, '_');
      map[clean] = (map[clean] || 0) + cnt;
      map[space] = (map[space] || 0) + cnt;
      map[under] = (map[under] || 0) + cnt;
      if (clean === 'BRK03' || clean === 'BRK') {
        map['BRK'] = (map['BRK'] || 0) + cnt;
        map['BRK03'] = (map['BRK03'] || 0) + cnt;
        map['BRK 03'] = (map['BRK 03'] || 0) + cnt;
      }
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

  // Auto-sync selected standards: selalu hormati matriks yang dipilih (SAPROLITE vs LIMONITE untuk EDXRF, atau WDXRF)
  useEffect(() => {
    if (selectedMethod === 'WDXRF') {
      const hasZetium = selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B');
      if (latestBatchStandards.length > 0) {
        setSelectedStandards(latestBatchStandards);
      } else {
        setSelectedStandards(hasZetium ? WDXRF_ZETIUM_DEFAULT_STANDARDS_ORDER : WDXRF_SUPERMINI_STANDARDS_ORDER);
      }
    } else if (selectedMatrix === 'LIMONITE') {
      const limFromBatch = latestBatchStandards.filter(s => s.toUpperCase().startsWith('LIM'));
      const defaultLimCodes = ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05'];
      setSelectedStandards(limFromBatch.length > 0 ? limFromBatch : defaultLimCodes);
    } else {
      // SAPROLITE
      const sapFromBatch = latestBatchStandards.filter(s => !s.toUpperCase().startsWith('LIM'));
      const defaultSapCodes = [
        'OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 
        'OREAS192', 'OREAS193', 'SAP19', 'OREAS194', 'OREAS195'
      ];
      setSelectedStandards(sapFromBatch.length > 0 ? sapFromBatch : defaultSapCodes);
    }
  }, [selectedMethod, selectedMatrix, latestBatchStandards, selectedInstruments]);

  const chartAbortControllerRef = useRef<AbortController | null>(null);

  // Fetch chart data from backend for all selected instruments
  const fetchChartData = async () => {
    if (selectedInstruments.length === 0) return;

    // Abort previous in-flight chart data request
    if (chartAbortControllerRef.current) {
      chartAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    chartAbortControllerRef.current = controller;

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

      const res = await fetch(`/api/xrf/qc-chart-data?${params.toString()}`, {
        signal: controller.signal
      });
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
      if (err.name === 'AbortError') return;
      toast.error('Gagal mengambil data grafik: ' + err.message);
    } finally {
      if (chartAbortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChartData();
    }, 70);
    return () => clearTimeout(timer);
  }, [selectedInstruments, selectedStandards, dateRange, selectedElement]);

  // Handle Synchronized Element Selection from ANY chart card dropdown
  const handleSelectElement = (el: string) => {
    setSelectedElement(el);
    if (allElementsData[el]) {
      setGridData(allElementsData[el]);
    } else {
      setTimeout(() => fetchChartData(), 10);
    }
    toast.success(`Parameter diubah ke ${el} untuk semua grafik.`);
  };

  // Active grid data for current selected element
  const currentGridData = allElementsData[selectedElement] || gridData;

  const handleAutoIsolateAllOffspec = useCallback(() => {
    if (!checkTakeoutPermissionOrWarn()) return;

    setIsolatedPoints(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const newlyAdded: IsolatedOffspecPoint[] = [];
      const logsToRecord: XrfOffspecAuditLog[] = [];

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
                    note: 'Auto-deteksi take-out titik off-spec lintas instrumen',
                    issue: ann?.issue,
                    solution: ann?.solution,
                    picNik: ann?.picNik || auth.userInfo.nik,
                    picName: ann?.picName || auth.userInfo.name,
                  });

                  logsToRecord.push({
                    action: 'BULK_ISOLATE',
                    userNik: auth.userInfo.nik,
                    userName: auth.userInfo.name,
                    userJabatan: auth.userInfo.jabatan,
                    userRole: auth.userInfo.role,
                    instrumentCode: instCode,
                    instrumentName: theme.name,
                    standardCode: stdName,
                    element: selectedElement,
                    pointIndex: p.index,
                    measuredValue: p.value,
                    nominalValue: limits.nominalValue,
                    sigmaDist,
                    diff: p.value - limits.nominalValue,
                    statusLabel,
                    reason: `Auto-deteksi take out titik off-spec (${absSigma.toFixed(2)}σ) pada unsur ${selectedElement}`,
                    sampleDate: p.date,
                  });
                }
              }
            }
          });
        });
      });

      if (newlyAdded.length > 0) {
        toast.success(`${newlyAdded.length} titik off-spec di seluruh instrumen berhasil di-take out & direkam!`);
        recordTakeoutAuditLogs(logsToRecord);
      } else {
        toast.info('Semua titik off-spec yang aktif telah diisolasi.');
      }

      return [...prev, ...newlyAdded];
    });
  }, [currentGridData, selectedElement, checkTakeoutPermissionOrWarn, auth.userInfo, pointAnnotations]);

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
  // - Menghormati matriks yang aktif (SAPROLITE vs LIMONITE untuk EDXRF, atau WDXRF)
  // - Menjaga konsistensi data saat berpindah matriks
  const visibleStandards = useMemo(() => {
    let candidateCodes: string[] = [];
    let matrixType = 'SAPROLITE';

    if (selectedMethod === 'WDXRF') {
      const hasZetium = selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B');
      candidateCodes = latestBatchStandards.length > 0
        ? [...latestBatchStandards]
        : (hasZetium ? [...WDXRF_ZETIUM_DEFAULT_STANDARDS_ORDER] : [...WDXRF_SUPERMINI_STANDARDS_ORDER]);
      matrixType = hasZetium ? 'ZETIUM' : 'SUPERMINI';
    } else if (selectedMatrix === 'LIMONITE') {
      const limFromBatch = latestBatchStandards.filter(s => s.toUpperCase().startsWith('LIM'));
      candidateCodes = limFromBatch.length > 0
        ? [...limFromBatch]
        : ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05'];
      matrixType = 'LIMONITE';
    } else {
      const sapFromBatch = latestBatchStandards.filter(s => !s.toUpperCase().startsWith('LIM'));
      const defaultSapCodes = [
        'OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 
        'OREAS192', 'OREAS193', 'SAP19', 'OREAS194', 'OREAS195'
      ];
      candidateCodes = sapFromBatch.length > 0 ? [...sapFromBatch] : defaultSapCodes;
      matrixType = 'SAPROLITE';
    }

    const isCodeMatch = (code1: string, code2: string) => {
      if (code1 === code2) return true;
      const c1 = code1.toUpperCase().replace(/[\s_-]+/g, '');
      const c2 = code2.toUpperCase().replace(/[\s_-]+/g, '');
      if (c1 === c2) return true;
      if ((c1 === 'BRK' || c1 === 'BRK03') && (c2 === 'BRK' || c2 === 'BRK03')) return true;
      return false;
    };

    // Identifikasi standar historis yang memiliki data pengukuran tapi tidak ada di set aktif
    // Filter sesuai matriks yang aktif agar arsip limonite tidak muncul di saprolite dan sebaliknya
    const historicalCodes = availableStandardsData
      .filter(s => {
        if (s.count <= 0) return false;
        if (candidateCodes.some(c => isCodeMatch(c, s.standardCode))) return false;
        const isLim = s.standardCode.toUpperCase().startsWith('LIM');
        if (selectedMatrix === 'LIMONITE') return isLim;
        if (selectedMatrix === 'SAPROLITE' && selectedMethod === 'EDXRF') return !isLim;
        return true;
      })
      .map(s => s.standardCode);

    if (showHistoricalStandards && historicalCodes.length > 0) {
      candidateCodes = [...candidateCodes, ...historicalCodes];
    }

    const list = candidateCodes.map(code => {
      const existing = standards.find(s => s.code === code || s.code === code.replace('_', ' ') || s.name === code);
      const isHist = historicalCodes.includes(code);
      const baseDisp = existing?.name || STANDARD_DISPLAY_NAMES[code] || formatStandardDisplayName(code);
      const clean = code.toUpperCase().replace(/[\s_-]+/g, '');
      return {
        code,
        name: isHist ? `${baseDisp} (Arsip/Historis)` : baseDisp,
        matrix: matrixType,
        count: standardCountMap[code] || standardCountMap[clean] || standardCountMap[code.replace('_', ' ')] || 0,
        isHistorical: isHist,
      };
    });

    return list;
  }, [standards, standardCountMap, selectedMatrix, selectedMethod, selectedInstruments, latestBatchStandards, availableStandardsData, showHistoricalStandards]);

  const historicalStandardsCount = useMemo(() => {
    let candidateCodes: string[] = [];
    if (selectedMethod === 'WDXRF') {
      const hasZetium = selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B');
      candidateCodes = latestBatchStandards.length > 0
        ? latestBatchStandards
        : (hasZetium ? WDXRF_ZETIUM_DEFAULT_STANDARDS_ORDER : WDXRF_SUPERMINI_STANDARDS_ORDER);
    } else if (selectedMatrix === 'LIMONITE') {
      const limFromBatch = latestBatchStandards.filter(s => s.toUpperCase().startsWith('LIM'));
      candidateCodes = limFromBatch.length > 0 ? limFromBatch : ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05'];
    } else {
      const sapFromBatch = latestBatchStandards.filter(s => !s.toUpperCase().startsWith('LIM'));
      const defaultSapCodes = [
        'OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 
        'OREAS192', 'OREAS193', 'SAP19', 'OREAS194', 'OREAS195'
      ];
      candidateCodes = sapFromBatch.length > 0 ? sapFromBatch : defaultSapCodes;
    }

    const isCodeMatch = (code1: string, code2: string) => {
      if (code1 === code2) return true;
      const c1 = code1.toUpperCase().replace(/[\s_-]+/g, '');
      const c2 = code2.toUpperCase().replace(/[\s_-]+/g, '');
      if (c1 === c2) return true;
      if ((c1 === 'BRK' || c1 === 'BRK03') && (c2 === 'BRK' || c2 === 'BRK03')) return true;
      return false;
    };

    return availableStandardsData.filter(s => {
      if (s.count <= 0) return false;
      if (candidateCodes.some(c => isCodeMatch(c, s.standardCode))) return false;
      const isLim = s.standardCode.toUpperCase().startsWith('LIM');
      if (selectedMatrix === 'LIMONITE') return isLim;
      if (selectedMatrix === 'SAPROLITE' && selectedMethod === 'EDXRF') return !isLim;
      return true;
    }).length;
  }, [availableStandardsData, latestBatchStandards, selectedMethod, selectedMatrix, selectedInstruments]);

  // Standards rendered on the chart canvas:
  // Disesuaikan dengan data set terakhir untuk tiap alatnya & hilangkan chart yang kosong
  const renderedStandards = useMemo(() => {
    if (showHistoricalStandards) return visibleStandards;

    const listWithData = visibleStandards.filter(std => {
      const stdCode = std.code;
      const clean = stdCode.toUpperCase().replace(/[\s_-]+/g, '');
      const stdData = currentGridData[stdCode] 
        || currentGridData[clean] 
        || currentGridData[stdCode.replace('_', ' ')] 
        || currentGridData[stdCode.replace(' ', '_')] 
        || currentGridData[std.name] 
        || (clean === 'BRK03' || clean === 'BRK' ? (currentGridData['BRK03'] || currentGridData['BRK 03'] || currentGridData['BRK']) : null)
        || {};
      const hasPoints = selectedInstruments.some(instCode => (stdData[instCode]?.points?.length || 0) > 0);
      const hasCount = (std.count || 0) > 0 || (standardCountMap[stdCode] || 0) > 0 || (standardCountMap[clean] || 0) > 0;
      return hasPoints || hasCount;
    });

    if (loading && listWithData.length === 0) return [];
    return listWithData.length > 0 ? listWithData : visibleStandards;
  }, [visibleStandards, currentGridData, selectedInstruments, showHistoricalStandards, loading, standardCountMap]);

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
      {/* ENTERPRISE STREAMLINED COMMAND BAR                            */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        
        {/* ROW 1: PRIMARY ESSENTIAL COMMANDS (CLEAN & UNCLUTTERED) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* LEFT: METHOD & MATRIX HIERARCHY */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Method Selector: EDXRF vs WDXRF */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200 dark:border-slate-700/80">
              <button
                onClick={() => setSelectedMethod('EDXRF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'EDXRF'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                EDXRF
              </button>
              <button
                onClick={() => setSelectedMethod('WDXRF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'WDXRF'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                WDXRF
              </button>
            </div>

            {/* 2. Primary Matrix: SAPROLITE vs LIMONITE (Hanya untuk EDXRF) */}
            {selectedMethod === 'EDXRF' ? (
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200 dark:border-slate-700/80">
                <button
                  onClick={() => {
                    setSelectedMatrix('SAPROLITE');
                    const sapFromBatch = latestBatchStandards.filter(s => !s.toUpperCase().startsWith('LIM'));
                    setSelectedStandards(sapFromBatch.length > 0 ? sapFromBatch : ['OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'OREAS191', 'OREAS192', 'OREAS193', 'SAP19', 'OREAS194', 'OREAS195']);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedMatrix === 'SAPROLITE'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Saprolite</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">10 CRM</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedMatrix('LIMONITE');
                    const limFromBatch = latestBatchStandards.filter(s => s.toUpperCase().startsWith('LIM'));
                    setSelectedStandards(limFromBatch.length > 0 ? limFromBatch : ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05']);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedMatrix === 'LIMONITE'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Limonite</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">LIM 01–05</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>
                  {selectedInstruments.some(c => c === 'ZETIUM_A' || c === 'ZETIUM_B')
                    ? `WDXRF Zetium (${latestBatchStandards.length > 0 ? latestBatchStandards.length : 17} Standar)`
                    : `WDXRF Supermini (${latestBatchStandards.length > 0 ? latestBatchStandards.length : 17} Standar)`}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: CONTROLS, ACTIONS, & ACCORDION DRAWER TOGGLE */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Periode Tahun */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value={currentYearStr}>{currentYearStr} (Tahun Berjalan)</option>
                <option value={String(Number(currentYearStr) - 1)}>{Number(currentYearStr) - 1}</option>
                <option value={String(Number(currentYearStr) - 2)}>{Number(currentYearStr) - 2}</option>
                <option value="ALL">Semua Waktu</option>
              </select>
            </div>

            {/* Dedicated Off-Spec Isolation Modal Launcher */}
            <button
              onClick={() => setShowOffspecModal(true)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                isolatedPoints.length > 0
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Buka Chart Isolasi Data Off-Spec & Rekap Per Instrumen"
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${isolatedPoints.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Isolasi Off-Spec</span>
              {isolatedPoints.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-black">
                  {isolatedPoints.length}
                </span>
              )}
            </button>

            {/* Dedicated Audit Trail Take Out Logs Button */}
            <button
              onClick={() => setShowTakeoutAuditModal(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              title="Buka Log Riwayat Take Out Data Off-Spec (ISO 17025 Audit Trail)"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Audit Log</span>
            </button>

            {/* ACCORDION DRAWER TOGGLE (PENGATURAN ALAT & TAMPILAN) */}
            <button
              onClick={toggleAccordion}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                isAccordionOpen
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700 ring-1 ring-teal-400/30'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title="Buka/Tutup Pengaturan Alat XRF & Tampilan"
            >
              <Sliders className={`w-3.5 h-3.5 ${isAccordionOpen ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'}`} />
              <span>Opsi & Alat ({selectedInstruments.length})</span>
              {isAccordionOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchChartData}
              disabled={loading}
              className="p-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs border border-slate-200 dark:border-slate-700"
              title="Refresh Data Grafik"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* COLLAPSIBLE ACCORDION PANEL: TAMPILAN, STATS, & KARTU AVAILABILITY ALAT */}
        {isAccordionOpen && (
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-4 animate-in fade-in-50 duration-200">
            
            {/* SUB-ROW 1: DISPLAY LAYOUT OPTIONS, KPI STATS, & ARSIP */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tampilan Grafik:</span>
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900 text-xs">
                  <button
                    onClick={() => setViewMode('side-by-side')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      viewMode === 'side-by-side'
                        ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Tampilan Strip Horizontal Berdampingan"
                  >
                    Berdampingan
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Tampilan Grid Responsif"
                  >
                    Grid
                  </button>
                </div>

                {viewMode === 'grid' && (
                  <div className="flex items-center gap-1 ml-2 text-xs">
                    <span className="text-[11px] text-slate-500">Kolom:</span>
                    {(['auto', '2', '3', '4', '6'] as const).map(col => (
                      <button
                        key={`col-${col}`}
                        onClick={() => setColumnCount(col)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer border ${
                          columnCount === col
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {col === 'auto' ? 'Auto' : `${col} Kol`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* KPI Stats Toggle */}
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    showStats
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-transparent font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {showStats ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>KPI Stats</span>
                </button>

                {/* Standar Arsip Toggle */}
                {historicalStandardsCount > 0 && (
                  <button
                    onClick={() => setShowHistoricalStandards(!showHistoricalStandards)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      showHistoricalStandards
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                    }`}
                    title="Tampilkan data standar lama yang pernah diukur namun tidak masuk dalam batch verifikasi aktif"
                  >
                    <Archive className="w-3.5 h-3.5 text-amber-500" />
                    <span>{showHistoricalStandards ? 'Tutup' : 'Buka'} Arsip ({historicalStandardsCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* SUB-ROW 2: INSTRUMENT SELECTION & AVAILABILITY GRID */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Instrumen XRF {selectedSite} • {selectedMethod} ({selectedInstruments.length} dari {currentCategoryInstruments.length} Aktif):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllInstruments}
                    className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <button
                    onClick={handleResetDefaultInstruments}
                    className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      setNewInstSite(selectedSite);
                      setNewInstMethod(selectedMethod);
                      setShowAddInstrumentModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer ml-1"
                    title="Daftarkan Alat XRF Baru Langsung ke Portal"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Alat</span>
                  </button>
                </div>
              </div>

              {/* Real-time Instrument Cards Grid */}
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
                          ? `${theme.pillActive} shadow-xs scale-[1.01]`
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400 opacity-60'
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
        )}

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
                    className={`w-[380px] md:w-[440px] flex-shrink-0 text-center py-2 px-3 rounded-xl shadow-xs uppercase tracking-widest text-xs border ${theme.headerBg} ${theme.headerBorder}`}
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
                  className={`text-center py-2 px-3 rounded-xl shadow-xs uppercase tracking-widest text-xs border ${theme.headerBg} ${theme.headerBorder}`}
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
        {loading && renderedStandards.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Menyiapkan Grafik Kontrol Mutu ({selectedSite} • {selectedMethod})...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Memuat titik data pengukuran dan batas kendali statistik.
              </p>
            </div>
          </div>
        ) : renderedStandards.length === 0 ? (
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
            const cleanCode = stdCode.toUpperCase().replace(/[\s_-]+/g, '');
            const stdData = currentGridData[stdCode] 
              || currentGridData[cleanCode] 
              || currentGridData[stdCode.replace('_', ' ')] 
              || currentGridData[stdCode.replace(' ', '_')] 
              || currentGridData[std.name] 
              || (cleanCode === 'BRK03' || cleanCode === 'BRK' ? (currentGridData['BRK03'] || currentGridData['BRK 03'] || currentGridData['BRK']) : null)
              || {};
            const stdCount = std.count || standardCountMap[stdCode] || standardCountMap[cleanCode] || standardCountMap[stdCode.replace('_', ' ')] || 0;

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
                              canTakeOutOffspec={auth.allowed}
                              userRoleTitle={auth.userInfo.role}
                              onOpenFullscreen={() => setFullscreenModalState({
                                isOpen: true,
                                standardCode: std.name,
                                standardRawCode: std.code,
                                instrumentName: theme.name,
                                instrumentCode: instCode,
                                headerColorClass: theme.headerBg
                              })}
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
                            canTakeOutOffspec={auth.allowed}
                            userRoleTitle={auth.userInfo.role}
                            onOpenFullscreen={() => setFullscreenModalState({
                              isOpen: true,
                              standardCode: std.name,
                              standardRawCode: std.code,
                              instrumentName: theme.name,
                              instrumentCode: instCode,
                              headerColorClass: theme.headerBg
                            })}
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
        canTakeOutOffspec={auth.allowed}
        userRoleTitle={auth.userInfo.role}
        onOpenAuditLogs={() => setShowTakeoutAuditModal(true)}
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

      {/* Fullscreen Shewhart QC Control Chart Modal */}
      {fullscreenModalState && fullscreenModalState.isOpen && (() => {
        const fsStdCode = fullscreenModalState.standardCode;
        const fsRawCode = fullscreenModalState.standardRawCode;

        // Cari data standar di currentGridData dengan berbagai variasi (OREAS 184, OREAS184, OREAS_184, case-insensitive)
        const findStdData = () => {
          if (fsRawCode && currentGridData[fsRawCode]) return currentGridData[fsRawCode];
          if (currentGridData[fsStdCode]) return currentGridData[fsStdCode];
          if (currentGridData[fsStdCode.replace('_', ' ')]) return currentGridData[fsStdCode.replace('_', ' ')];
          if (currentGridData[fsStdCode.replace(' ', '_')]) return currentGridData[fsStdCode.replace(' ', '_')];
          const noSpace = fsStdCode.replace(/[\s_-]+/g, '');
          if (currentGridData[noSpace]) return currentGridData[noSpace];

          const normTarget = fsStdCode.toLowerCase().replace(/[\s_-]+/g, '');
          const foundKey = Object.keys(currentGridData).find(
            k => k.toLowerCase().replace(/[\s_-]+/g, '') === normTarget
          );
          if (foundKey && currentGridData[foundKey]) return currentGridData[foundKey];

          if (fsRawCode) {
            const normRaw = fsRawCode.toLowerCase().replace(/[\s_-]+/g, '');
            const foundRawKey = Object.keys(currentGridData).find(
              k => k.toLowerCase().replace(/[\s_-]+/g, '') === normRaw
            );
            if (foundRawKey && currentGridData[foundRawKey]) return currentGridData[foundRawKey];
          }

          return {};
        };

        const fsStdData = findStdData();

        // Cari data instrumen dengan toleransi nama/kode (EPSILON_F, EPSILON F, case-insensitive)
        const findInstData = () => {
          const targetInst = fullscreenModalState.instrumentCode;
          if (fsStdData[targetInst]) return fsStdData[targetInst];
          if (fsStdData[targetInst.replace('_', ' ')]) return fsStdData[targetInst.replace('_', ' ')];
          if (fsStdData[targetInst.replace(' ', '_')]) return fsStdData[targetInst.replace(' ', '_')];

          const normInst = targetInst.toLowerCase().replace(/[\s_-]+/g, '');
          const foundInstKey = Object.keys(fsStdData).find(
            k => k.toLowerCase().replace(/[\s_-]+/g, '') === normInst
          );
          if (foundInstKey && fsStdData[foundInstKey]) return fsStdData[foundInstKey];

          return {
            limits: { nominalValue: 0, stdevFixed: 0.05, upperAction: 0, upperWarning: 0, lowerWarning: 0, lowerAction: 0 },
            statistics: { count: 0, mean: 0, median: 0, min: 0, max: 0, actualStdev: 0 },
            points: [],
          };
        };

        const fsInstData = findInstData();

        const fsCardKey = `${fullscreenModalState.instrumentCode}-${fsStdCode}-${selectedElement}`;
        const fsCardAnnotations: Record<number, XrfPointAnnotation> = {};
        Object.entries(pointAnnotations).forEach(([k, ann]) => {
          if (k.startsWith(`${fsCardKey}-`)) {
            const pIdx = parseInt(k.replace(`${fsCardKey}-`, ''), 10);
            if (!isNaN(pIdx)) fsCardAnnotations[pIdx] = ann;
          }
        });

        return (
          <XrfChartFullscreenModal
            isOpen={fullscreenModalState.isOpen}
            onClose={() => setFullscreenModalState(null)}
            standardCode={fsStdCode}
            instrumentName={fullscreenModalState.instrumentName}
            instrumentCode={fullscreenModalState.instrumentCode}
            headerColorClass={fullscreenModalState.headerColorClass}
            currentElement={selectedElement}
            onSelectElement={handleSelectElement}
            limits={fsInstData.limits}
            statistics={fsInstData.statistics}
            points={fsInstData.points}
            canTakeOutOffspec={auth.allowed}
            userRoleTitle={auth.userInfo.role}
            onToggleIsolatePoint={(pt, el, lim) => handleToggleIsolatePoint(pt, el, lim, fullscreenModalState.instrumentCode, fullscreenModalState.instrumentName, fsStdCode)}
            isPointIsolated={(pt, el) => isPointIsolated(pt, el, fullscreenModalState.instrumentCode, fsStdCode)}
            annotations={fsCardAnnotations}
            onSaveAnnotation={(pIdx, ann) => handleSaveAnnotation(fsCardKey, pIdx, ann)}
            onDeleteAnnotation={(pIdx) => handleDeleteAnnotation(fsCardKey, pIdx)}
          />
        );
      })()}

      {/* Modal Konfirmasi Take Out dengan Justifikasi/Alasan Wajib */}
      {takeoutPendingPoint && (
        <XrfTakeoutReasonModal
          isOpen={Boolean(takeoutPendingPoint)}
          onClose={() => setTakeoutPendingPoint(null)}
          userInfo={auth.userInfo}
          targetPoint={takeoutPendingPoint}
          onConfirm={handleConfirmTakeout}
        />
      )}

      {/* Modal Riwayat Audit Trail Log Take Out Data Off-Spec */}
      <XrfTakeoutAuditLogsModal
        isOpen={showTakeoutAuditModal}
        onClose={() => setShowTakeoutAuditModal(false)}
      />
    </div>
  );
};
