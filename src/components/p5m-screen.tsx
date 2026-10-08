import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, Shuffle, Edit3, Download, Save, Plus, Trash2, 
  RotateCcw, Check, AlertCircle, AlertTriangle, ChevronDown, ChevronRight, 
  BookOpen, History, Users, Sparkles, Filter, Search, X, Layers,
  ChevronLeft, ArrowRight, ArrowLeft, Shield, ShieldAlert, Award, CheckCircle2, FileText,
  Briefcase, Loader2, Star, Eye, RefreshCw, Image as ImageIcon, ExternalLink,
  Building2, FileSpreadsheet, Tag, CheckSquare, Square,
  UploadCloud, Paperclip
} from 'lucide-react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { Card, Button, Input } from './ui';
import { toast } from 'sonner';
import { getFlyerInfo } from '../lib/p5m-flyer';
import { ExcelViewer } from './ExcelViewer';
import { triggerExpGain } from '../lib/gamificationEvents';

// Helper to clean file names into well-formatted material titles
export const cleanFilenameToTitle = (filename: string, stripNumbering = true): string => {
  if (!filename) return '';
  // 1. Remove file extension
  let name = filename.replace(/\.[^/.]+$/, '');
  // 2. Strip leading numbers or bullet markers like "01. ", "01 - ", "1_", "1. ", "• "
  if (stripNumbering) {
    name = name.replace(/^(\d+[\.\)\-:_]|\-|\*|•)\s*/, '');
  }
  // 3. Replace underscores and multiple spaces with a clean single space
  name = name.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return name;
};

// ============================================================
// KONSTANTA & STRUKTUR DEFAULT
// ============================================================
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const HARI_GABUNGAN = new Set(['Senin', 'Kamis', 'Jumat', 'Minggu']);

const DAY_COLORS: Record<string, string> = {
  Senin: '#3B82F6',   // Vibrant Sapphire Blue
  Selasa: '#06B6D4',  // Ocean Cyan
  Rabu: '#10B981',    // Fresh Emerald
  Kamis: '#F59E0B',   // Warm Amber Gold
  Jumat: '#6366F1',   // Electric Indigo
  Sabtu: '#8B5CF6',   // Royal Violet
  Minggu: '#F43F5E'   // Coral Rose
};

const DIVISI_OPTIONS = [
  { value: 'All', label: 'Semua Section' },
  { value: 'Preparation', label: 'Preparation' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Quality Assurance', label: 'Quality Assurance (QA)' },
  { value: 'Administration', label: 'Administration' },
  { value: 'IC', label: 'Inventory Control (IC)' }
];

const PREPARATION_GROUP_OPTIONS = [
  { value: 'All', label: 'Semua (Prep & Maintenance)' },
  { value: 'Preparation', label: 'Preparation' },
  { value: 'Maintenance', label: 'Maintenance' }
];

const LABORATORY_GROUP_OPTIONS = [
  { value: 'All', label: 'Semua (Lab, QA, Admin, IC)' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Quality Assurance', label: 'Quality Assurance (QA)' },
  { value: 'Administration', label: 'Administration' },
  { value: 'IC', label: 'Inventory Control (IC)' }
];

const KELAS_OPTIONS = [
  { value: 'All', label: 'Semua Kelas' },
  { value: 'SPV', label: 'SPV / Specialist' },
  { value: 'Foreman/Officer', label: 'Foreman / Officer' },
  { value: 'Admin', label: 'Admin / Staff' }
];

const KATEGORI_OPTIONS = [
  { value: 'All', label: 'Semua Kategori' },
  { value: 'Teknis', label: 'Teknis' },
  { value: 'Non-Teknis', label: 'Non-Teknis' },
  { value: 'Senam', label: 'Senam' }
];

const SUB_KATEGORI_OPTIONS = [
  { value: 'All', label: 'Semua Sub-Kategori' },
  { value: 'General', label: 'Teknis General (Semua Section)' },
  { value: 'Laboratory', label: 'Teknis Laboratory (Lab & QA)' },
  { value: 'Preparation', label: 'Teknis Preparation' },
  { value: 'Maintenance', label: 'Teknis Maintenance' }
];

export function isTopicForbiddenForSection(title?: string, sec?: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  const s = (sec || '').toLowerCase();

  const isMaintTopic = t.includes('pengelasan') || t.includes('welding') || t.includes('las') ||
    t.includes('gerinda') || t.includes('cutting plasma') || t.includes('pengerutan kayu') ||
    t.includes('instalasi listrik') || t.includes('panel listrik') || t.includes('dust collector') ||
    t.includes('ducting') || t.includes('kompresor') || t.includes('kompressor') ||
    t.includes('kegagalan rem') || t.includes('alat berat') || t.includes('dashcam') ||
    t.includes('blind spot') || t.includes('manuver') || t.includes('lubrikasi');

  const isIcTopic = t.includes('inventory control') || t.includes('gudang') ||
    t.includes('warehouse') || t.includes('sparepart') || t.includes('spare part') ||
    t.includes('penyimpanan bahan kimia') || /\bic\b/.test(t);

  const isPrepTopic = t.includes('jaw crusher') || t.includes('pulverizer') ||
    t.includes('cup mill') || t.includes('sample basah') || t.includes('sampel basah') ||
    t.includes('sample kering') || t.includes('sampel kering') || t.includes('double roll') ||
    t.includes('sieve shaker') || t.includes('screen test') || t.includes('oven kontainer');

  const isLabTopic = t.includes('xrf') || t.includes('aas') || t.includes('fusion') ||
    t.includes('fused bead') || t.includes('titrasi') || t.includes('loi') ||
    t.includes('gravimetri') || t.includes('press powder') || t.includes('neraca') ||
    t.includes('timbangan digital') || t.includes('chiller') || t.includes('muffle furnace') ||
    t.includes('platinum ware') || t.includes('fume hood') || t.includes('scrubber');

  if (s.includes('lab')) {
    // Lab: TIDAK BOLEH dapat materi Maintenance, IC, atau Prep!
    if (isMaintTopic || isIcTopic || isPrepTopic) return true;
  } else if (s.includes('prep')) {
    // Prep: TIDAK BOLEH dapat materi Maintenance, IC, atau Lab!
    if (isMaintTopic || isIcTopic || isLabTopic) return true;
  } else if (s.includes('maint')) {
    // Maintenance: TIDAK BOLEH dapat materi Lab, Prep, atau IC!
    if (isLabTopic || isPrepTopic || isIcTopic) return true;
  } else if (s.includes('ic') || s.includes('inventory')) {
    // IC: TIDAK BOLEH dapat materi Maintenance, Lab, atau Prep!
    if (isMaintTopic || isLabTopic || isPrepTopic) return true;
  } else if (s.includes('admin')) {
    if (isMaintTopic || isIcTopic || isPrepTopic || isLabTopic) return true;
  }

  return false;
}

function buildDefaultConfig() {
  const slot = (divisi: string, kelas: string, kategori: string, extra?: any) => ({
    divisi,
    kelas,
    kategori,
    ...(extra || {})
  });

  const cfg: Record<string, any> = {};

  // SENIN (Gabungan)
  cfg['Senin'] = {
    pagi: {
      gabungan: [
        slot('Preparation', 'SPV', 'Teknis'),
        slot('Laboratory', 'SPV', 'Teknis'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    },
    malam: {
      gabungan: [
        slot('Preparation', 'SPV', 'Teknis'),
        slot('Laboratory', 'SPV', 'Teknis'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    }
  };

  // SELASA (Split)
  cfg['Selasa'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Maintenance', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('IC', 'Admin', 'Teknis')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Maintenance', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // RABU (Split)
  cfg['Rabu'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Preparation', 'All', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Administration', 'Admin', 'Teknis')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Preparation', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // KAMIS (Gabungan)
  cfg['Kamis'] = {
    pagi: {
      gabungan: [
        slot('Preparation', 'SPV', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    },
    malam: {
      gabungan: [
        slot('Preparation', 'SPV', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    }
  };

  // JUMAT (Gabungan)
  cfg['Jumat'] = {
    pagi: {
      gabungan: [
        slot('Preparation', 'SPV', 'Teknis'),
        slot('Laboratory', 'SPV', 'Teknis'),
        slot('All', 'Foreman/Officer', 'Teknis')
      ]
    },
    malam: {
      gabungan: [
        slot('All', 'Foreman/Officer', 'Teknis', { isLogbook: true, materiTetap: 'Briefing Evaluasi Logbook Shift & Operasional Mingguan' }),
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // SABTU (Split)
  cfg['Sabtu'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('All', 'All', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('All', 'All', 'Teknis')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Preparation', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // MINGGU (Gabungan)
  cfg['Minggu'] = {
    pagi: {
      gabungan: [
        slot('All', 'SPV', 'Teknis'),
        slot('All', 'SPV', 'Teknis'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    },
    malam: {
      gabungan: []
    }
  };

  return cfg;
}

interface P5MScreenProps {
  onBack?: () => void;
  userProfile?: any;
}

export const P5MScreen: React.FC<P5MScreenProps> = ({ onBack, userProfile }) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'schedule' | 'materi' | 'archive'>('schedule');

  // PT Filter (TBP/GPS vs GTS)
  const initialPt = useMemo(() => {
    const raw = (userProfile?.pt || 'TBP').toUpperCase();
    return raw === 'GTS' ? 'GTS' : 'TBP';
  }, [userProfile]);

  const [selectedPt, setSelectedPt] = useState<string>(initialPt);

  // Week selection state (defaults to Monday of current or upcoming week)
  const [targetDateStr, setTargetDateStr] = useState<string>(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = day === 0 ? 1 : 1 - day;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [datesMeta, setDatesMeta] = useState<Record<string, { iso: string; display: string }>>({});

  // Employee Pool State
  const [karyawanPool, setKaryawanPool] = useState<any[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);

  // Config State
  const [uiConfig, setUiConfig] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('p5m_ui_config_v5');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return buildDefaultConfig();
  });
  const [openDays, setOpenDays] = useState<Set<string>>(new Set(['Senin']));
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Schedule Generated State
  // Schedule Generated State
  const [scheduleData, setScheduleData] = useState<Record<string, any> | null>(null);
  const [activeScheduleId, setActiveScheduleId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [viewModeMobile, setViewModeMobile] = useState<'card' | 'table'>('card');
  const [activeDayMobile, setActiveDayMobile] = useState<string>('Kamis');

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!scrollContainerRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) return;

    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    const x = e.clientX;
    const walk = (startXRef.current - x) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current + walk;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleScrollTable = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const amount = direction === 'left' ? -420 : 420;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const scrollToDay = (dayName: string) => {
    if (dayName === 'ALL') {
      setSelectedDayFilter('ALL');
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    } else {
      setSelectedDayFilter(dayName);
      setActiveDayMobile(dayName);
      setTimeout(() => {
        const el = document.getElementById(`p5m-col-${dayName}`);
        if (el && scrollContainerRef.current) {
          const targetLeft = Math.max(0, el.offsetLeft - 8);
          scrollContainerRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  // Materi Database State
  const [materiList, setMateriList] = useState<any[]>([]);
  const [loadingMateri, setLoadingMateri] = useState(false);
  const [syncingNotion, setSyncingNotion] = useState(false);
  const [materiSearch, setMateriSearch] = useState('');
  const [materiFilterKat, setMateriFilterKat] = useState('All');
  const [materiFilterSubKat, setMateriFilterSubKat] = useState('All');
  const [materiFilterDiv, setMateriFilterDiv] = useState('All');
  const [materiModalOpen, setMateriModalOpen] = useState(false);
  const [editingMateri, setEditingMateri] = useState<any | null>(null);
  const [formJudul, setFormJudul] = useState('');
  const [formKategori, setFormKategori] = useState('Teknis');
  const [formSubKategori, setFormSubKategori] = useState('General');
  const [formDivisi, setFormDivisi] = useState('Preparation');
  const [formIsInternal, setFormIsInternal] = useState(false);
  const [formImageBase64, setFormImageBase64] = useState<string | null>(null);
  const [formImageFilename, setFormImageFilename] = useState<string>('');
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [isSavingMateri, setIsSavingMateri] = useState<boolean>(false);

  // Bulk Materi States
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'files' | 'text'>('files');
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkAttachedFiles, setBulkAttachedFiles] = useState<Array<{
    file: File;
    filename: string;
    rawTitle: string;
    base64Data: string;
    sizeFormatted: string;
    isImage: boolean;
    isExcel: boolean;
    isPdf: boolean;
  }>>([]);
  const [isReadingBulkFiles, setIsReadingBulkFiles] = useState(false);
  const [bulkDefaultKategori, setBulkDefaultKategori] = useState('auto');
  const [bulkDefaultSubKategori, setBulkDefaultSubKategori] = useState('General');
  const [bulkDefaultDivisi, setBulkDefaultDivisi] = useState('All');
  const [bulkIsInternal, setBulkIsInternal] = useState(false);
  const [bulkStripNumbering, setBulkStripNumbering] = useState(true);
  const [bulkSkipDuplicates, setBulkSkipDuplicates] = useState(true);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Batch Selection States
  const [selectedMateriIds, setSelectedMateriIds] = useState<number[]>([]);
  const [batchPrefixModalOpen, setBatchPrefixModalOpen] = useState(false);
  const [batchPrefixText, setBatchPrefixText] = useState('');
  const [isApplyingBatchPrefix, setIsApplyingBatchPrefix] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [pdfViewerMode, setPdfViewerMode] = useState<'drive' | 'stream'>('stream');

  // Archive History State
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Developer & QA Team Role Verification
  const [developerList, setDeveloperList] = useState<any[]>([]);
  const [showFullSchedulePreview, setShowFullSchedulePreview] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && Array.isArray(json.data)) {
          setDeveloperList(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const currentNik = userProfile?.nik || localStorage.getItem('p2h_inspector_nik') || '';
  const currentName = String(userProfile?.nama || userProfile?.name || localStorage.getItem('p2h_inspector_name') || '').trim();

  const isDeveloper = useMemo(() => {
    if (currentNik === '02D25000055' || currentNik === '02D24000043' || currentNik === 'M0403240177' || currentNik === 'preplabadmin') return true;
    return developerList.some(d => d.nik === currentNik);
  }, [currentNik, developerList]);

  const isQATeam = useMemo(() => {
    if (isDeveloper) return true;
    const section = String(userProfile?.section || '').toLowerCase();
    const dept = String(userProfile?.department || '').toLowerCase();
    const jabatan = String(userProfile?.jabatan || '').toLowerCase();
    const role = String(userProfile?.role || '').toLowerCase();
    
    return (
      section.includes('qa') ||
      section.includes('quality') ||
      dept.includes('qa') ||
      dept.includes('quality') ||
      jabatan.includes('qa') ||
      jabatan.includes('quality assurance') ||
      role.includes('qa')
    );
  }, [userProfile, isDeveloper]);

  // Compute Current User's Personal P5M Assignments for the selected schedule
  const myAssignments = useMemo(() => {
    if (!scheduleData) return [];
    const lowerName = currentName.toLowerCase();

    const assignments: Array<{
      day: string;
      dateFormatted?: string;
      shift: 'pagi' | 'malam';
      shiftLabel: string;
      location: string;
      locationLabel: string;
      materi: string;
      kategori: string;
      subKategori?: string;
      fileUrl?: string;
      isSenam?: boolean;
      isLogbook?: boolean;
      isCompleted?: boolean;
    }> = [];

    DAYS.forEach(day => {
      const dData = scheduleData[day];
      if (!dData) return;

      ['pagi', 'malam'].forEach(shift => {
        const sData = dData[shift];
        if (!sData) return;

        const checkAndAdd = (slot: any, locKey: string, locLabel: string) => {
          if (!slot || !slot.nama || slot.nama.includes('KOSONG')) return;
          const slotNik = String(slot.nik || '').trim();
          const slotName = String(slot.nama || '').trim().toLowerCase();

          const isMatch = (currentNik && slotNik === currentNik) ||
            (lowerName && (slotName === lowerName || slotName.includes(lowerName) || lowerName.includes(slotName)));

          if (isMatch) {
            const matchingMateri = materiList.find(m => 
              m.judul?.trim().toLowerCase() === String(slot.materi || '').trim().toLowerCase()
            );
            const resolvedFileUrl = slot.fileUrl || matchingMateri?.fileUrl || `/api/p5m/flyer?title=${encodeURIComponent(slot.materi || 'Materi Briefing P5M')}`;

            assignments.push({
              day,
              dateFormatted: datesMeta[day]?.display || day,
              shift: shift as 'pagi' | 'malam',
              shiftLabel: shift === 'pagi' ? 'Day Shift (Pagi)' : 'Night Shift (Malam)',
              location: locKey,
              locationLabel: locLabel,
              materi: slot.materi || 'Materi Briefing P5M',
              kategori: slot.kategori || matchingMateri?.kategori || 'Teknis',
              subKategori: slot.subKategori || matchingMateri?.subKategori || 'General',
              fileUrl: resolvedFileUrl,
              isSenam: Boolean(slot.isSenam),
              isLogbook: Boolean(slot.isLogbook),
              isCompleted: Boolean(slot.isCompleted)
            });
          }
        };

        if (dData.tipe === 'gabungan') {
          (sData.gabungan || []).forEach((slot: any) => {
            checkAndAdd(slot, 'gabungan', 'Ruang Gabungan');
          });
        } else {
          (sData.preparasi || []).forEach((slot: any) => {
            checkAndAdd(slot, 'preparasi', 'Preparasi (Prep & Maintenance)');
          });
          (sData.laboratorium || []).forEach((slot: any) => {
            checkAndAdd(slot, 'laboratorium', 'Laboratorium (Lab, QA, IC, Admin)');
          });
        }
      });
    });

    return assignments;
  }, [scheduleData, currentNik, currentName, datesMeta, materiList]);

  // Warnings / Notifications State
  const [materiWarnings, setMateriWarnings] = useState<string[]>([]);

  // Capture Reference for PNG export
  const captureRef = useRef<HTMLDivElement>(null);

  // Save config changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('p5m_ui_config_v4', JSON.stringify(uiConfig));
    } catch (e) {}
  }, [uiConfig]);

  // Load initial data
  useEffect(() => {
    fetchPoolAndDates(targetDateStr, selectedPt);
    fetchMateriList();
    fetchArchiveList();
    fetchScheduleForWeek(targetDateStr);
  }, [selectedPt]);

  const fetchPoolAndDates = async (weekDate?: string, pt?: string) => {
    setLoadingPool(true);
    try {
      const activePt = pt || selectedPt;
      const url = `/api/p5m/pool?weekDate=${weekDate || targetDateStr}&userPt=${activePt}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setKaryawanPool(data.pool || []);
        setDatesMeta(data.dates || {});
      }
    } catch (err) {
      console.error('Failed to fetch pool:', err);
    } finally {
      setLoadingPool(false);
    }
  };

  const fetchMateriList = async () => {
    setLoadingMateri(true);
    try {
      const res = await fetch('/api/p5m/materi');
      const data = await res.json();
      if (data.success) {
        setMateriList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch materi:', err);
    } finally {
      setLoadingMateri(false);
    }
  };

  const handleSyncNotion = async () => {
    setSyncingNotion(true);
    try {
      const res = await fetch('/api/p5m/materi/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMateriList(data.data || []);
        toast.success(`Berhasil menyinkronkan ${data.count} materi dari database Notion!`);
      } else {
        toast.error('Gagal sinkronisasi Notion: ' + data.message);
      }
    } catch (err: any) {
      toast.error('Gagal menghubungi server: ' + err.message);
    } finally {
      setSyncingNotion(false);
    }
  };

  const fetchArchiveList = async () => {
    setLoadingArchive(true);
    try {
      const res = await fetch('/api/p5m/schedules');
      const data = await res.json();
      if (data.success) {
        setArchiveList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch archive:', err);
    } finally {
      setLoadingArchive(false);
    }
  };

  const fetchScheduleForWeek = async (targetDate?: string) => {
    try {
      const activeDate = targetDate || targetDateStr;
      const res = await fetch(`/api/p5m/schedules/latest?weekDate=${activeDate}`);
      const data = await res.json();
      if (data.success && data.data) {
        setScheduleData(data.data.scheduleData || null);
        setActiveScheduleId(data.data.id || null);
        if (data.data.config) setUiConfig(data.data.config);
      } else {
        setScheduleData(null);
        setActiveScheduleId(null);
      }
    } catch (err) {
      console.error('Failed to fetch schedule for week:', err);
    }
  };

  // Generate / Randomize Schedule
  const handleRandomize = async () => {
    if (isEditMode) setIsEditMode(false);
    setActiveScheduleId(null);
    setIsGenerating(true);
    try {
      const res = await fetch('/api/p5m/randomize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uiConfig, 
          weekDate: targetDateStr,
          userPt: selectedPt,
          creatorPt: selectedPt 
        })
      });
      const data = await res.json();
      if (data.success) {
        setScheduleData(data.jadwal);
        if (data.dates) setDatesMeta(data.dates);
        if (data.warnings && data.warnings.length > 0) {
          setMateriWarnings(data.warnings);
          toast.warning('Pemberitahuan Daur Ulang Materi', {
            description: `${data.warnings.length} kategori materi didaur ulang dari siklus rotasi terlama.`
          });
        } else {
          setMateriWarnings([]);
          toast.success('Jadwal P5M berhasil diacak secara optimal!', {
            description: `Disusun berdasarkan ketersediaan ${data.poolCount || karyawanPool.length} personil aktif PT ${selectedPt}.`
          });
        }
      } else {
        toast.error('Gagal menyusun jadwal: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      toast.error('Gagal menghubungi server: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Compute stats from current scheduleData
  const scheduleStats = useMemo(() => {
    if (!scheduleData) return { totalSlots: 0, scheduledMap: {}, scheduledList: [], doubleList: [], noJadwalList: [] };

    const countMap: Record<string, number> = {};
    const list: string[] = [];

    DAYS.forEach(day => {
      const dData = scheduleData[day];
      if (!dData) return;

      ['pagi', 'malam'].forEach(shift => {
        const sData = dData[shift];
        if (!sData) return;

        const slots = dData.tipe === 'gabungan' 
          ? (sData.gabungan || [])
          : [...(sData.preparasi || []), ...(sData.laboratorium || [])];

        slots.forEach((s: any) => {
          if (s.nama && !s.nama.includes('KOSONG')) {
            countMap[s.nama] = (countMap[s.nama] || 0) + 1;
            if (!list.includes(s.nama)) list.push(s.nama);
          }
        });
      });
    });

    const scheduledList = list.sort();
    const doubleList = Object.keys(countMap).filter(k => countMap[k] >= 2).sort();
    const totalSlots = Object.values(countMap).reduce((a, b) => a + b, 0);

    // Karyawan pool yang belum dapat jadwal
    const noJadwalList = karyawanPool
      .filter(k => !scheduledList.includes(k.nama))
      .map(k => k.nama)
      .sort();

    return { totalSlots, scheduledMap: countMap, scheduledList, doubleList, noJadwalList };
  }, [scheduleData, karyawanPool]);

  // Update full person object in slot (nama, nik, karyawanId, kelas, pt)
  const handleUpdateSlotPerson = (day: string, shift: string, location: string, index: number, person: any) => {
    setScheduleData(prev => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[day] || !copy[day][shift]) return prev;

      const targetArray = copy[day].tipe === 'gabungan' 
        ? copy[day][shift].gabungan 
        : copy[day][shift][location];

      if (targetArray && targetArray[index]) {
        targetArray[index].nama = person.nama || '';
        targetArray[index].nik = person.nik || '';
        targetArray[index].karyawanId = person.karyawanId || person.id || '';
        targetArray[index].kelas = person.kelas || '';
        targetArray[index].pt = person.pt || '';
      }
      return copy;
    });
  };

  // Update full materi object in slot (materi, kategori, subKategori, fileUrl, materiId, isSenam, isLogbook)
  const handleUpdateSlotMateri = (day: string, shift: string, location: string, index: number, materiItem: any) => {
    setScheduleData(prev => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[day] || !copy[day][shift]) return prev;

      const targetArray = copy[day].tipe === 'gabungan' 
        ? copy[day][shift].gabungan 
        : copy[day][shift][location];

      if (targetArray && targetArray[index]) {
        let materiTitle = '';
        let kat = 'Teknis';
        let subKat = 'General';
        let fUrl: string | null = null;
        let mId: number | null = null;
        let isSenam = false;
        let isLogbook = false;

        if (typeof materiItem === 'string') {
          materiTitle = materiItem;
          isSenam = materiItem.toLowerCase().includes('senam');
          isLogbook = materiItem.toLowerCase().includes('logbook');
        } else {
          materiTitle = materiItem.judul || '';
          kat = materiItem.kategori || 'Teknis';
          subKat = materiItem.subKategori || 'General';
          fUrl = materiItem.fileUrl || null;
          mId = materiItem.id || null;
          isSenam = materiItem.kategori === 'Senam' || (materiItem.judul || '').toLowerCase().includes('senam');
          isLogbook = (materiItem.judul || '').toLowerCase().includes('logbook');
        }

        targetArray[index].materi = materiTitle;
        targetArray[index].kategori = kat;
        targetArray[index].subKategori = subKat;
        targetArray[index].fileUrl = fUrl;
        targetArray[index].materiId = mId;
        targetArray[index].isSenam = isSenam;
        targetArray[index].isLogbook = isLogbook;

        // Auto-sync pagi -> malam: Jika pengaturan materi di shift pagi diubah,
        // di shift malam juga otomatis berubah (Senin & Kamis slot 3 senam juga ikut sync),
        // dan KECUALI jika shift malam sudah diedit manual
        if (shift === 'pagi' && copy[day].malam) {
          const nightTargetArray = copy[day].tipe === 'gabungan'
            ? copy[day].malam.gabungan
            : copy[day].malam[location];

          if (nightTargetArray && nightTargetArray[index] && !nightTargetArray[index].isManualEdited) {
            if (isSenam || kat === 'Senam' || materiTitle.toLowerCase().includes('senam')) {
              // Jika hari Senin atau Kamis slot 3, sinkronkan Senam ke shift malam
              if (['Senin', 'Kamis'].includes(day) && index === 2) {
                nightTargetArray[index].materi = 'Senam';
                nightTargetArray[index].kategori = 'Senam';
                nightTargetArray[index].subKategori = 'General';
                nightTargetArray[index].fileUrl = null;
                nightTargetArray[index].materiId = null;
                nightTargetArray[index].isSenam = true;
                nightTargetArray[index].isLogbook = false;
              }
            } else {
              nightTargetArray[index].materi = materiTitle;
              nightTargetArray[index].kategori = kat;
              nightTargetArray[index].subKategori = subKat;
              nightTargetArray[index].fileUrl = fUrl;
              nightTargetArray[index].materiId = mId;
              nightTargetArray[index].isSenam = false;
              nightTargetArray[index].isLogbook = isLogbook;
            }
          }
        } else if (shift === 'malam') {
          // Tandai bahwa slot shift malam ini telah diedit secara manual
          targetArray[index].isManualEdited = true;
          targetArray[index].isSenam = isSenam;
        }
      }
      return copy;
    });
  };

  // Update single field in slot
  const handleUpdateSlot = (day: string, shift: string, location: string, index: number, field: string, value: any) => {
    setScheduleData(prev => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[day] || !copy[day][shift]) return prev;

      const targetArray = copy[day].tipe === 'gabungan' 
        ? copy[day][shift].gabungan 
        : copy[day][shift][location];

      if (targetArray && targetArray[index]) {
        targetArray[index][field] = value;

        if (field === 'materi') {
          if (shift === 'pagi' && copy[day].malam) {
            const nightTargetArray = copy[day].tipe === 'gabungan'
              ? copy[day].malam.gabungan
              : copy[day].malam[location];

            if (nightTargetArray && nightTargetArray[index] && !nightTargetArray[index].isManualEdited) {
              const valLower = String(value || '').toLowerCase();
              if (valLower.includes('senam')) {
                if (['Senin', 'Kamis'].includes(day) && index === 2) {
                  nightTargetArray[index].materi = value;
                  nightTargetArray[index].isSenam = true;
                }
              } else {
                nightTargetArray[index].materi = value;
                nightTargetArray[index].isSenam = false;
              }
            }
          } else if (shift === 'malam') {
            targetArray[index].isManualEdited = true;
          }
        }
      }
      return copy;
    });
  };

  // Commit / Save schedule to Database
  const handleSaveSchedule = async () => {
    if (!scheduleData) {
      toast.warning('Belum ada jadwal yang disusun untuk disimpan.');
      return;
    }

    setIsSaving(true);
    try {
      const materiItems: any[] = [];
      DAYS.forEach(day => {
        const dData = scheduleData[day];
        if (!dData) return;
        const isoDate = datesMeta[day]?.iso;

        ['pagi', 'malam'].forEach(shift => {
          const sData = dData[shift];
          if (!sData) return;

          const slots = dData.tipe === 'gabungan' 
            ? (sData.gabungan || [])
            : [...(sData.preparasi || []), ...(sData.laboratorium || [])];

          slots.forEach((s: any) => {
            if (s.materi && !s.isSenam && !s.isLogbook && !s.materi.toLowerCase().includes('senam') && !s.materi.toLowerCase().includes('logbook')) {
              materiItems.push({
                judul: s.materi,
                kategori: s.kategori || 'Teknis',
                subKategori: s.subKategori || 'General',
                isoDate
              });
            }
          });
        });
      });

      const dateStart = datesMeta['Senin']?.iso || '';
      const dateEnd = datesMeta['Minggu']?.iso || '';

      const res = await fetch('/api/p5m/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: activeScheduleId,
          dateStart,
          dateEnd,
          scheduleData,
          config: uiConfig,
          summary: {
            pt: selectedPt,
            totalSlots: scheduleStats.totalSlots,
            doubleCount: scheduleStats.doubleList.length,
            noJadwalCount: scheduleStats.noJadwalList.length
          },
          materiItems,
          createdBy: userProfile?.name || `Admin P5M (${selectedPt})`
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.data?.id) setActiveScheduleId(data.data.id);
        toast.success(data.isUpdate ? 'Jadwal & materi P5M berhasil diperbarui & disinkronkan!' : 'Jadwal P5M berhasil dipublikasikan & disimpan!', {
          description: data.isUpdate 
            ? 'Perubahan materi untuk hari yang belum berlangsung telah disinkronkan ke sistem dan notifikasi telah dikirimkan ke personil terkait.'
            : 'Histori tanggal materi di database telah diperbarui secara otomatis.'
        });
        setIsEditMode(false);
        fetchArchiveList();
        fetchMateriList();
      } else {
        toast.error('Gagal menyimpan: ' + data.message);
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan jadwal: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Download High-Res PNG
  const handleDownloadPNG = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);

    try {
      const wasEdit = isEditMode;
      if (wasEdit) setIsEditMode(false);

      await new Promise(r => setTimeout(r, 250));

      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        cacheBust: true
      });

      const link = document.createElement('a');
      const startStr = datesMeta['Senin']?.display || 'Week';
      link.download = `Jadwal_P5M_${selectedPt}_${startStr.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Gambar Jadwal P5M berhasil diunduh (High-Res PNG)!');

      if (wasEdit) setIsEditMode(true);
    } catch (err: any) {
      console.error('Export PNG error:', err);
      toast.error('Gagal mengunduh gambar: ' + (err?.message || 'Terjadi kesalahan saat rendering'));
    } finally {
      setIsExporting(false);
    }
  };

  // State & Handler: Export Excel (.xlsx) untuk rekapan admin
  const handleExportExcel = () => {
    if (!scheduleData) {
      toast.warning('Belum ada jadwal yang disusun untuk diekspor ke Excel.');
      return;
    }

    try {
      const rows: any[] = [];
      let no = 1;

      DAYS.forEach(day => {
        const dData = scheduleData[day];
        if (!dData) return;
        const dateDisplay = datesMeta[day]?.display || day;
        const isG = dData.tipe === 'gabungan';

        ['pagi', 'malam'].forEach(shift => {
          const shiftLabel = shift === 'pagi' ? 'Pagi (Day Shift)' : 'Malam (Night Shift)';
          const sData = dData[shift];
          if (!sData) return;

          if (isG) {
            const slots = sData.gabungan || [];
            slots.forEach((s: any) => {
              rows.push({
                'No': no++,
                'Hari': day,
                'Tanggal': dateDisplay,
                'Shift': shiftLabel,
                'Sesi / Kategori': 'Gabungan (All Team)',
                'Nama Pemateri': s.nama || 'KOSONG',
                'NIK': s.nik || '-',
                'Perusahaan': s.pt || selectedPt,
                'Divisi': s.divisi || '-',
                'Kelas Jabatan': s.kelas || '-',
                'Topik / Judul Materi P5M': s.materi || '-',
                'Kategori': s.kategori || '-',
                'Sub-Kategori': s.subKategori || '-',
                'Tipe Slot': s.isSenam ? 'Senam' : s.isLogbook ? 'Logbook' : s.isFallback ? 'Fallback' : 'Materi Rutin',
                'Tautan Flyer / Dokumen': s.fileUrl ? (s.fileUrl.startsWith('http') ? s.fileUrl : `${window.location.origin}${s.fileUrl}`) : '-'
              });
            });
          } else {
            // Preparasi
            const prepSlots = sData.preparasi || [];
            prepSlots.forEach((s: any) => {
              rows.push({
                'No': no++,
                'Hari': day,
                'Tanggal': dateDisplay,
                'Shift': shiftLabel,
                'Sesi / Kategori': 'Preparasi & Maintenance',
                'Nama Pemateri': s.nama || 'KOSONG',
                'NIK': s.nik || '-',
                'Perusahaan': s.pt || selectedPt,
                'Divisi': s.divisi || 'Preparation',
                'Kelas Jabatan': s.kelas || '-',
                'Topik / Judul Materi P5M': s.materi || '-',
                'Kategori': s.kategori || '-',
                'Sub-Kategori': s.subKategori || '-',
                'Tipe Slot': s.isSenam ? 'Senam' : s.isFallback ? 'Fallback' : 'Materi Rutin',
                'Tautan Flyer / Dokumen': s.fileUrl ? (s.fileUrl.startsWith('http') ? s.fileUrl : `${window.location.origin}${s.fileUrl}`) : '-'
              });
            });

            // Laboratorium
            const labSlots = sData.laboratorium || [];
            labSlots.forEach((s: any) => {
              rows.push({
                'No': no++,
                'Hari': day,
                'Tanggal': dateDisplay,
                'Shift': shiftLabel,
                'Sesi / Kategori': 'Laboratorium & QA',
                'Nama Pemateri': s.nama || 'KOSONG',
                'NIK': s.nik || '-',
                'Perusahaan': s.pt || selectedPt,
                'Divisi': s.divisi || 'Laboratory',
                'Kelas Jabatan': s.kelas || '-',
                'Topik / Judul Materi P5M': s.materi || '-',
                'Kategori': s.kategori || '-',
                'Sub-Kategori': s.subKategori || '-',
                'Tipe Slot': s.isSenam ? 'Senam' : s.isFallback ? 'Fallback' : 'Materi Rutin',
                'Tautan Flyer / Dokumen': s.fileUrl ? (s.fileUrl.startsWith('http') ? s.fileUrl : `${window.location.origin}${s.fileUrl}`) : '-'
              });
            });
          }
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set lebar kolom rapi & proporsional
      worksheet['!cols'] = [
        { wch: 5 },  // No
        { wch: 10 }, // Hari
        { wch: 16 }, // Tanggal
        { wch: 20 }, // Shift
        { wch: 25 }, // Sesi / Kategori
        { wch: 30 }, // Nama Pemateri
        { wch: 16 }, // NIK
        { wch: 12 }, // Perusahaan
        { wch: 18 }, // Divisi
        { wch: 16 }, // Kelas Jabatan
        { wch: 45 }, // Topik / Judul Materi P5M
        { wch: 14 }, // Kategori
        { wch: 16 }, // Sub-Kategori
        { wch: 16 }, // Tipe Slot
        { wch: 35 }, // Tautan Flyer / Dokumen
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Jadwal P5M');

      const startStr = (datesMeta['Senin']?.display || 'Mingguan').replace(/\s+/g, '_');
      const fileName = `Rekap_Jadwal_P5M_${selectedPt}_${startStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(`Tabel rekapan admin berhasil diekspor ke Excel (${fileName})!`);
    } catch (err: any) {
      console.error('Export Excel error:', err);
      toast.error('Gagal mengekspor Excel: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  const [isResettingSopIk, setIsResettingSopIk] = useState(false);

  // Reset riwayat pemakaian seluruh materi SOP & IK agar kembali diprioritaskan
  const handleResetSopIk = async () => {
    if (!window.confirm('Yakin ingin mereset status pemakaian seluruh materi SOP & IK? Materi SOP & IK akan kembali berstatus fresh dan diprioritaskan kembali oleh sistem saat acak jadwal.')) return;
    setIsResettingSopIk(true);
    try {
      const res = await fetch('/api/p5m/materi/reset-sop-ik', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Status pemakaian SOP & IK berhasil di-reset!');
        fetchMateriList();
      } else {
        toast.error(data.message || 'Gagal mereset status SOP & IK');
      }
    } catch (err: any) {
      toast.error('Gagal mereset SOP & IK: ' + err.message);
    } finally {
      setIsResettingSopIk(false);
    }
  };

  // Reset status pemakaian 1 materi tertentu
  const handleResetSingleMateri = async (id: number, judul: string) => {
    try {
      const res = await fetch(`/api/p5m/materi/${id}/reset-used`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status pemakaian "${judul}" berhasil di-reset!`);
        fetchMateriList();
      } else {
        toast.error(data.message || 'Gagal mereset materi');
      }
    } catch (err: any) {
      toast.error('Gagal mereset materi: ' + err.message);
    }
  };

  // Materi CRUD Handlers
  const handleSaveMateriModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim()) {
      toast.warning('Judul materi wajib diisi');
      return;
    }

    setIsSavingMateri(true);
    try {
      const payload = {
        judul: formJudul,
        kategori: formKategori,
        subKategori: formKategori === 'Non-Teknis' ? 'General' : formSubKategori,
        divisi: formDivisi,
        isInternal: formIsInternal,
        base64Data: formImageBase64,
        filename: formImageFilename
      };

      if (editingMateri) {
        const res = await fetch(`/api/p5m/materi/${editingMateri.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Materi berhasil diperbarui!');
          fetchMateriList();
          setMateriModalOpen(false);
          setEditingMateri(null);
          setFormIsInternal(false);
          setFormImageBase64(null);
          setFormImagePreview(null);
          setFormImageFilename('');
        } else {
          toast.error('Gagal menyimpan: ' + (data.message || 'Error'));
        }
      } else {
        const res = await fetch('/api/p5m/materi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Materi baru berhasil ditambahkan!');
          fetchMateriList();
          setMateriModalOpen(false);
          setEditingMateri(null);
          setFormIsInternal(false);
          setFormImageBase64(null);
          setFormImagePreview(null);
          setFormImageFilename('');
        } else {
          toast.error('Gagal menambah materi: ' + (data.message || 'Error'));
        }
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan materi: ' + err.message);
    } finally {
      setIsSavingMateri(false);
    }
  };

  const handleDeleteMateri = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus materi ini dari bank data?')) return;
    try {
      const res = await fetch(`/api/p5m/materi/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Materi telah dihapus');
        fetchMateriList();
      }
    } catch (err: any) {
      toast.error('Gagal menghapus materi: ' + err.message);
    }
  };

  // Multi-file selection handler for Bulk Materi Modal
  const handleBulkFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsReadingBulkFiles(true);
    try {
      const fileList = Array.from(files);
      const newItems: typeof bulkAttachedFiles = [];

      for (const file of fileList) {
        if (file.size > 30 * 1024 * 1024) {
          toast.warning(`File "${file.name}" dilewati karena lebih dari 30MB`);
          continue;
        }

        const isImg = file.type.startsWith('image/');
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isPdf = !isExcel && file.name.endsWith('.pdf');

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const sizeFormatted = file.size < 1024 * 1024 
          ? `${(file.size / 1024).toFixed(1)} KB` 
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        newItems.push({
          file,
          filename: file.name,
          rawTitle: cleanFilenameToTitle(file.name, bulkStripNumbering),
          base64Data,
          sizeFormatted,
          isImage: isImg,
          isExcel,
          isPdf
        });
      }

      setBulkAttachedFiles(prev => [...prev, ...newItems]);
      toast.success(`Berhasil membaca ${newItems.length} berkas. Nama file otomatis dijadikan judul materi.`);
    } catch (err: any) {
      toast.error('Gagal membaca berkas lampiran: ' + err.message);
    } finally {
      setIsReadingBulkFiles(false);
      e.target.value = '';
    }
  };

  const handleRemoveBulkFile = (idx: number) => {
    setBulkAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Live calculation of bulk parsed items (from attached files or text)
  const parsedBulkItems = useMemo(() => {
    const cleanPrefix = bulkPrefix.trim();
    const existingJudulSet = new Set(materiList.map(m => (m.judul || '').trim().toLowerCase()));
    const seenInBatch = new Set<string>();

    // 1. If in files mode (or files are attached)
    if (bulkMode === 'files') {
      if (bulkAttachedFiles.length === 0) return [];
      return bulkAttachedFiles.map((bf) => {
        let clean = cleanFilenameToTitle(bf.filename, bulkStripNumbering);
        let finalTitle = clean;
        if (cleanPrefix) {
          if (!clean.toLowerCase().startsWith(cleanPrefix.toLowerCase())) {
            finalTitle = `${cleanPrefix} ${clean}`.trim();
          }
        }
        const lower = finalTitle.toLowerCase();
        const isDuplicateInDb = existingJudulSet.has(lower);
        const isDuplicateInBatch = seenInBatch.has(lower);
        seenInBatch.add(lower);

        return {
          original: bf.filename,
          title: finalTitle,
          isDuplicate: isDuplicateInDb || isDuplicateInBatch,
          isExistingInDb: isDuplicateInDb,
          hasFile: true,
          fileInfo: bf
        };
      });
    }

    // 2. If in text mode
    if (!bulkRawText.trim()) return [];
    const lines = bulkRawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    return lines.map((raw) => {
      let clean = raw;
      if (bulkStripNumbering) {
        clean = clean.replace(/^(\d+[\.\)\-:]|\-|\*|•)\s*/, '').trim();
      }
      let finalTitle = clean;
      if (cleanPrefix) {
        if (!clean.toLowerCase().startsWith(cleanPrefix.toLowerCase())) {
          finalTitle = `${cleanPrefix} ${clean}`.trim();
        }
      }
      const lower = finalTitle.toLowerCase();
      const isDuplicateInDb = existingJudulSet.has(lower);
      const isDuplicateInBatch = seenInBatch.has(lower);
      seenInBatch.add(lower);

      return {
        original: raw,
        title: finalTitle,
        isDuplicate: isDuplicateInDb || isDuplicateInBatch,
        isExistingInDb: isDuplicateInDb,
        hasFile: false,
        fileInfo: null
      };
    });
  }, [bulkMode, bulkAttachedFiles, bulkRawText, bulkPrefix, bulkStripNumbering, materiList]);

  const handleSaveBulkMateri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkMode === 'files' && bulkAttachedFiles.length === 0) {
      toast.warning('Pilih minimal 1 berkas lampiran untuk mode baca nama file');
      return;
    }
    if (bulkMode === 'text' && !bulkRawText.trim()) {
      toast.warning('Daftar judul materi belum diisi');
      return;
    }

    if (parsedBulkItems.length === 0) {
      toast.warning('Tidak ada judul materi yang valid untuk disimpan');
      return;
    }

    setIsSavingBulk(true);
    try {
      let payload: any = {
        prefix: bulkPrefix,
        defaultKategori: bulkDefaultKategori,
        defaultSubKategori: bulkDefaultSubKategori,
        defaultDivisi: bulkDefaultDivisi,
        isInternal: bulkIsInternal,
        skipDuplicates: bulkSkipDuplicates,
        stripNumbering: bulkStripNumbering
      };

      if (bulkMode === 'files' && bulkAttachedFiles.length > 0) {
        payload.items = bulkAttachedFiles.map(bf => {
          let clean = cleanFilenameToTitle(bf.filename, bulkStripNumbering);
          let finalTitle = clean;
          if (bulkPrefix.trim()) {
            if (!clean.toLowerCase().startsWith(bulkPrefix.trim().toLowerCase())) {
              finalTitle = `${bulkPrefix.trim()} ${clean}`.trim();
            }
          }
          return {
            judul: finalTitle,
            filename: bf.filename,
            base64Data: bf.base64Data,
            kategori: bulkDefaultKategori,
            subKategori: bulkDefaultSubKategori,
            divisi: bulkDefaultDivisi,
            isInternal: bulkIsInternal
          };
        });
      } else {
        payload.rawText = bulkRawText;
      }

      const res = await fetch('/api/p5m/materi/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Berhasil menambahkan ${data.count} materi P5M`);
        fetchMateriList();
        setBulkModalOpen(false);
        setBulkRawText('');
        setBulkPrefix('');
        setBulkAttachedFiles([]);
      } else {
        toast.error('Gagal menambahkan materi: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      toast.error('Gagal memproses materi bulk: ' + err.message);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleApplyBatchPrefix = async () => {
    if (!batchPrefixText.trim()) {
      toast.warning('Awalan judul tidak boleh kosong');
      return;
    }
    if (selectedMateriIds.length === 0) {
      toast.warning('Pilih minimal 1 materi');
      return;
    }

    setIsApplyingBatchPrefix(true);
    try {
      const res = await fetch('/api/p5m/materi/bulk-prefix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedMateriIds,
          prefix: batchPrefixText
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Berhasil memperbarui awalan judul materi`);
        fetchMateriList();
        setBatchPrefixModalOpen(false);
        setBatchPrefixText('');
        setSelectedMateriIds([]);
      } else {
        toast.error('Gagal memperbarui awalan judul: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      toast.error('Gagal memproses awalan judul: ' + err.message);
    } finally {
      setIsApplyingBatchPrefix(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedMateriIds.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedMateriIds.length} materi yang dipilih dari database?`)) return;

    setIsDeletingBatch(true);
    try {
      const res = await fetch('/api/p5m/materi/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedMateriIds })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Berhasil menghapus ${selectedMateriIds.length} materi`);
        fetchMateriList();
        setSelectedMateriIds([]);
      } else {
        toast.error('Gagal menghapus materi: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      toast.error('Gagal menghapus materi: ' + err.message);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Filtered materi list
  const filteredMateri = useMemo(() => {
    return materiList.filter(m => {
      const matchSearch = m.judul?.toLowerCase().includes(materiSearch.toLowerCase());
      let matchKat = false;
      if (materiFilterKat === 'All') matchKat = true;
      else if (materiFilterKat === 'SOP / IK') {
        matchKat = /\b(sop|ik)\b|instruksi kerja/i.test(m.judul || '');
      } else {
        matchKat = m.kategori === materiFilterKat;
      }
      const matchSubKat = materiFilterSubKat === 'All' || m.subKategori === materiFilterSubKat;
      const matchDiv = materiFilterDiv === 'All' || m.divisi === materiFilterDiv;
      return matchSearch && matchKat && matchSubKat && matchDiv;
    });
  }, [materiList, materiSearch, materiFilterKat, materiFilterSubKat, materiFilterDiv]);

  // Date range formatted
  const weekRangeDisplay = useMemo(() => {
    const s = datesMeta['Senin']?.display;
    const m = datesMeta['Minggu']?.display;
    if (s && m) return `${s} – ${m}`;
    return 'Minggu Berjalan';
  }, [datesMeta]);

  // STRICT ACCESS CONTROL: Only QA Team and Developers can access P5M Menu
  if (!isQATeam && !isDeveloper) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/5">
          <ShieldAlert className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white mb-2 font-display">
          Akses Terbatas
        </h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Menu dan Builder <strong className="text-amber-300">P5M Schedule</strong> hanya dapat diakses oleh <strong className="text-white">Tim QA (Quality Assurance)</strong> dan <strong className="text-teal-400">Developer</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            if (onBack) onBack();
            else window.location.href = '/';
          }}
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pb-20 pt-4 px-3 sm:px-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 transition-colors">
      
      {/* ── TOP HEADER & CONTROLS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md text-[var(--text-main)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg flex-shrink-0 bg-[var(--primary)] text-white shadow-md">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-main)] font-display">
                {isQATeam ? 'P5M Schedule Builder' : 'Jadwal P5M PrepLab'}
              </h1>
              {isQATeam ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3" />
                  Tim QA (Builder)
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
                  <Users className="w-3 h-3" />
                  Mode Personil
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {isQATeam 
                ? 'Sistem Otomasi Briefing Awal Shift — Preparation & Laboratory Plant'
                : 'Jadwal Penugasan Saya & Materi Briefing P5M Mingguan'}
            </p>
          </div>
        </div>

        {/* PT Selector, Date Selector & Pool Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* PT Switcher (TBP/GPS vs GTS) */}
          <div className="flex items-center bg-[var(--input-bg)] border border-[var(--border-main)] p-0.5 rounded-xl">
            <button
              onClick={() => {
                setSelectedPt('TBP');
                fetchPoolAndDates(targetDateStr, 'TBP');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedPt === 'TBP' || selectedPt === 'GPS'
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              PT TBP / GPS
            </button>
            <button
              onClick={() => {
                setSelectedPt('GTS');
                fetchPoolAndDates(targetDateStr, 'GTS');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedPt === 'GTS'
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              PT GTS
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] shadow-inner">
            <Users className="w-3.5 h-3.5 text-teal-500" />
            <span className="font-semibold">{karyawanPool.length}</span>
            <span className="text-[var(--text-muted)] text-[11px]">Personil ({selectedPt === 'GTS' ? 'GTS' : 'TBP/GPS'})</span>
          </div>

          <div className="flex items-center gap-1 bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-2 py-1 shadow-inner">
            <input 
              type="date"
              value={targetDateStr}
              onChange={(e) => {
                const newDate = e.target.value;
                setTargetDateStr(newDate);
                fetchPoolAndDates(newDate, selectedPt);
                fetchScheduleForWeek(newDate);
              }}
              className="bg-transparent text-xs text-[var(--text-main)] outline-none cursor-pointer font-mono"
            />
          </div>

          {/* Navigation Tab Switcher */}
          <div className="flex items-center bg-[var(--input-bg)] border border-[var(--border-main)] p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'schedule'
                  ? 'bg-[var(--primary)] text-white shadow-md font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isQATeam ? 'Jadwal' : 'Jadwal Saya'}</span>
            </button>

            <button
              onClick={() => setActiveTab('materi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'materi'
                  ? 'bg-[var(--primary)] text-white shadow-md font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Bank Materi ({materiList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'archive'
                  ? 'bg-[var(--primary)] text-white shadow-md font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Arsip</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── NON-QA VIEW: JADWAL SAYA & DOWNLOAD KESELURUHAN JADWAL ── */}
      {!isQATeam && activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Action Toolbar for Non-QA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Jadwal P5M Minggu Ini • PT {selectedPt}
                </h3>
                <p className="text-xs text-slate-400">
                  Periode: <strong className="text-teal-300">{weekRangeDisplay}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleExportExcel}
                disabled={!scheduleData}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg shadow-teal-600/20 flex items-center gap-2 flex-1 sm:flex-initial"
                title="Ekspor Rekap Jadwal P5M Mingguan ke Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>

              <Button
                onClick={handleDownloadPNG}
                disabled={!scheduleData || isExporting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 flex-1 sm:flex-initial"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Download className="w-4 h-4 text-white" />
                )}
                <span>Unduh Gambar (PNG)</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowFullSchedulePreview(!showFullSchedulePreview)}
                className="w-auto bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 text-xs h-10 px-3.5 rounded-xl whitespace-nowrap cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-1.5 text-blue-400" />
                <span>{showFullSchedulePreview ? 'Sembunyikan Tabel Lengkap' : 'Lihat Tabel Lengkap'}</span>
              </Button>
            </div>
          </div>

          {/* Personal Assignments Card Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Penugasan P5M Saya
                <span className="text-xs font-mono font-normal opacity-70">({currentName || 'Rekan Kerja'})</span>
              </h2>
            </div>

            {myAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myAssignments.map((ass, idx) => (
                  <div
                    key={`my-ass-${idx}`}
                    className="p-5 sm:p-6 rounded-2xl border bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-teal-500/40 shadow-xl space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 font-mono shadow-xs">
                          {ass.day}, {ass.dateFormatted}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-700/80 text-slate-200 border border-slate-600">
                          {ass.shiftLabel}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold">
                        {ass.kategori}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-400" />
                        Lokasi: {ass.locationLabel}
                      </p>
                      <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                        "{ass.materi}"
                      </h3>
                    </div>

                    {/* Action button: Flyer / Materi preview & download */}
                    <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          onClick={() => setPreviewImage({ 
                            url: ass.fileUrl || `/api/p5m/flyer?title=${encodeURIComponent(ass.materi)}`, 
                            title: ass.materi 
                          })}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Buka / Lihat Materi</span>
                        </Button>

                        <a
                          href={`/api/p5m/flyer?download=true&title=${encodeURIComponent(ass.materi)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh File</span>
                        </a>

                        {/* Tombol Sudah Dilakukan */}
                        {ass.isCompleted ? (
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Sudah Dilakukan ✓</span>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/p5m/schedules/mark-completed', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    scheduleId: activeScheduleId,
                                    day: ass.day,
                                    shift: ass.shift,
                                    zone: ass.location,
                                    nik: currentNik,
                                    name: currentName,
                                    completed: true
                                  })
                                });
                                if (res.ok) {
                                  toast.success('✅ Materi P5M berhasil ditandai sudah dilakukan! (+60 EXP)');
                                  triggerExpGain(60, 'Materi P5M Selesai Dibawakan!', 'Briefing Keselamatan Kerja');
                                  window.dispatchEvent(new Event('gamification_updated'));
                                  window.dispatchEvent(new CustomEvent('refresh-action-center'));
                                  window.dispatchEvent(new CustomEvent('p5m-status-updated'));
                                  fetchScheduleForWeek();
                                }
                              } catch {
                                toast.error('Gagal menandai materi P5M');
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Sudah Dilakukan (+60 EXP)</span>
                          </Button>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 italic text-center sm:text-right">
                        Durasi Presentasi: 5–7 Menit
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 sm:p-10 rounded-2xl border border-slate-700/70 bg-slate-800/40 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-200">
                  Tidak Ada Jadwal Bertugas Minggu Ini
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Halo <strong>{currentName || 'Rekan Kerja'}</strong>, Anda tidak memiliki penugasan untuk membawakan materi P5M pada minggu periode <strong>{weekRangeDisplay}</strong> (PT {selectedPt}).
                  <br />
                  Silakan tetap hadir dan mendengarkan materi dari rekan presenter yang bertugas!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 1: QA SCHEDULE BUILDER & TIM TABLE ── */}
      {activeTab === 'schedule' && (isQATeam || showFullSchedulePreview) && (
        <div className="space-y-6">
          
          {/* Action Toolbar for QA Builder */}
          {isQATeam && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg)] border border-[var(--border-main)] p-2.5 sm:p-3 rounded-2xl shadow-sm text-[var(--text-main)]">
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  onClick={handleRandomize} 
                  disabled={isGenerating}
                  className="w-auto bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md cursor-pointer whitespace-nowrap"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      <span>Mengacak Jadwal...</span>
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-4 h-4 mr-1.5" />
                      <span>Acak Otomatis (PT {selectedPt})</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setIsEditMode(!isEditMode)}
                  disabled={!scheduleData}
                  className={`w-auto text-xs h-9 px-3.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                    isEditMode 
                      ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300 border-blue-500/50 shadow-md ring-1 ring-blue-500/30' 
                      : 'bg-[var(--input-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Edit3 className="w-4 h-4 mr-1.5 text-blue-500" />
                  <span>{isEditMode ? 'Selesai Edit Manual' : 'Edit Manual'}</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                  className={`w-auto text-xs h-9 px-3.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                    showConfigDrawer 
                      ? 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/40 font-bold' 
                      : 'bg-[var(--input-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Layers className="w-4 h-4 mr-1.5 text-[var(--primary)]" />
                  <span>Konfigurasi Slot Hari</span>
                  <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showConfigDrawer ? 'rotate-180' : ''}`} />
                </Button>

                {isQATeam && (
                  <Button
                    variant="secondary"
                    onClick={handleResetSopIk}
                    disabled={isResettingSopIk}
                    className="w-auto bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30 text-xs h-9 px-3 rounded-xl shadow-xs font-semibold cursor-pointer whitespace-nowrap"
                    title="Reset riwayat pemakaian seluruh materi SOP & IK agar dapat langsung digunakan kembali"
                  >
                    {isResettingSopIk ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-orange-500" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-1.5 text-orange-500" />
                    )}
                    <span>Reset SOP &amp; IK</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  onClick={handleExportExcel}
                  disabled={!scheduleData}
                  className="w-auto bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs h-9 px-3.5 rounded-xl shadow-xs font-semibold cursor-pointer whitespace-nowrap"
                  title="Ekspor Jadwal P5M ke Format Excel (.xlsx) untuk Rekapan Admin"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Ekspor Excel (.xlsx)</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleDownloadPNG}
                  disabled={!scheduleData || isExporting}
                  className="w-auto bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--bg-main)] text-xs h-9 px-3.5 rounded-xl shadow-xs cursor-pointer whitespace-nowrap"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-amber-500" />
                  ) : (
                    <Download className="w-4 h-4 mr-1.5 text-emerald-500" />
                  )}
                  <span>Unduh Gambar PNG</span>
                </Button>

                <Button
                  onClick={handleSaveSchedule}
                  disabled={!scheduleData || isSaving}
                  className="w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer whitespace-nowrap"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
                      <span>{activeScheduleId ? 'Simpan Perubahan Jadwal' : 'Simpan & Publikasikan'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── DRAWER: SLOT CONFIGURATION ── */}
          {showConfigDrawer && (
            <Card className="bg-slate-800 border-slate-700 p-4 sm:p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-200 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Pengaturan Slot &amp; Target Kategori Per Hari
                  </h3>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => setUiConfig(buildDefaultConfig())}
                  className="text-xs text-slate-400 hover:text-rose-400 h-7 px-2"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset Default
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {DAYS.map(day => {
                  const isG = HARI_GABUNGAN.has(day);
                  const isOpen = openDays.has(day);
                  const dayCfg = uiConfig[day] || { pagi: {}, malam: {} };

                  return (
                    <div key={day} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div 
                        onClick={() => {
                          const next = new Set(openDays);
                          next.has(day) ? next.delete(day) : next.add(day);
                          setOpenDays(next);
                        }}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DAY_COLORS[day] }} />
                          <span className="font-bold text-xs text-slate-800">{day}</span>
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                            isG ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isG ? 'Gabungan' : 'Split'}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </div>

                      {isOpen && (
                        <div className="p-3 border-t border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                          {/* Day Shift Slots */}
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1.5">
                              ☀️ Day Shift (Pagi)
                            </span>
                            {isG ? (
                              <SlotListEditor 
                                slots={dayCfg.pagi?.gabungan || []} 
                                allowedSections={DIVISI_OPTIONS}
                                onChange={(newSlots) => {
                                  setUiConfig(prev => {
                                    const curDay = prev[day] || {};
                                    const isManual = curDay.isManualNight;
                                    return {
                                      ...prev,
                                      [day]: {
                                        ...curDay,
                                        pagi: { ...curDay.pagi, gabungan: newSlots },
                                        malam: (!isManual && day !== 'Minggu')
                                          ? { ...curDay.malam, gabungan: JSON.parse(JSON.stringify(newSlots)) }
                                          : curDay.malam
                                      }
                                    };
                                  });
                                }}
                              />
                            ) : (
                              <div className="space-y-2">
                                <div className="p-1.5 bg-amber-950/20 border border-amber-800/30 rounded-lg">
                                  <span className="text-[10px] text-amber-500 font-semibold block mb-1">Preparasi (Prep &amp; Maint):</span>
                                  <SlotListEditor 
                                    slots={dayCfg.pagi?.preparasi || []} 
                                    allowedSections={PREPARATION_GROUP_OPTIONS}
                                    onChange={(newSlots) => {
                                      setUiConfig(prev => {
                                        const curDay = prev[day] || {};
                                        const isManual = curDay.isManualNight;
                                        return {
                                          ...prev,
                                          [day]: {
                                            ...curDay,
                                            pagi: { ...curDay.pagi, preparasi: newSlots },
                                            malam: (!isManual && day !== 'Minggu')
                                              ? { ...curDay.malam, preparasi: JSON.parse(JSON.stringify(newSlots)) }
                                              : curDay.malam
                                          }
                                        };
                                      });
                                    }}
                                  />
                                </div>
                                <div className="p-1.5 bg-teal-950/20 border border-teal-800/30 rounded-lg">
                                  <span className="text-[10px] text-teal-400 font-semibold block mb-1">Laboratorium (Lab, QA, Admin, IC):</span>
                                  <SlotListEditor 
                                    slots={dayCfg.pagi?.laboratorium || []} 
                                    allowedSections={LABORATORY_GROUP_OPTIONS}
                                    onChange={(newSlots) => {
                                      setUiConfig(prev => {
                                        const curDay = prev[day] || {};
                                        const isManual = curDay.isManualNight;
                                        return {
                                          ...prev,
                                          [day]: {
                                            ...curDay,
                                            pagi: { ...curDay.pagi, laboratorium: newSlots },
                                            malam: (!isManual && day !== 'Minggu')
                                              ? { ...curDay.malam, laboratorium: JSON.parse(JSON.stringify(newSlots)) }
                                              : curDay.malam
                                          }
                                        };
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Night Shift Slots (except Sunday) */}
                          {day !== 'Minggu' && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                                  🌙 Night Shift (Malam)
                                </span>
                                {dayCfg.isManualNight ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold" title="Slot malam telah dikustom manual">
                                      ✏️ Kustom Manual
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUiConfig(prev => {
                                          const curDay = prev[day] || {};
                                          return {
                                            ...prev,
                                            [day]: {
                                              ...curDay,
                                              isManualNight: false,
                                              malam: JSON.parse(JSON.stringify(curDay.pagi || {}))
                                            }
                                          };
                                        });
                                        toast.info(`Slot malam ${day} disinkronkan kembali mengikuti shift pagi`);
                                      }}
                                      className="text-[9px] text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-0.5"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" /> Sinkron Pagi
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1" title="Konfigurasi slot malam otomatis mengikuti slot shift pagi">
                                    🔗 Otomatis sama dgn Pagi
                                  </span>
                                )}
                              </div>
                              {isG ? (
                                <SlotListEditor 
                                  slots={dayCfg.malam?.gabungan || []} 
                                  allowedSections={DIVISI_OPTIONS}
                                  onChange={(newSlots) => {
                                    setUiConfig(prev => ({
                                      ...prev,
                                      [day]: {
                                        ...prev[day],
                                        isManualNight: true,
                                        malam: { ...prev[day]?.malam, gabungan: newSlots }
                                      }
                                    }));
                                  }}
                                />
                              ) : (
                                <div className="space-y-2">
                                  <div className="p-1.5 bg-amber-950/20 border border-amber-800/30 rounded-lg">
                                    <span className="text-[10px] text-amber-500 font-semibold block mb-1">Preparasi (Prep &amp; Maint):</span>
                                    <SlotListEditor 
                                      slots={dayCfg.malam?.preparasi || []} 
                                      allowedSections={PREPARATION_GROUP_OPTIONS}
                                      onChange={(newSlots) => {
                                        setUiConfig(prev => ({
                                          ...prev,
                                          [day]: {
                                            ...prev[day],
                                            isManualNight: true,
                                            malam: { ...prev[day]?.malam, preparasi: newSlots }
                                          }
                                        }));
                                      }}
                                    />
                                  </div>
                                  <div className="p-1.5 bg-teal-950/20 border border-teal-800/30 rounded-lg">
                                    <span className="text-[10px] text-teal-400 font-semibold block mb-1">Laboratorium (Lab, QA, Admin, IC):</span>
                                    <SlotListEditor 
                                      slots={dayCfg.malam?.laboratorium || []} 
                                      allowedSections={LABORATORY_GROUP_OPTIONS}
                                      onChange={(newSlots) => {
                                        setUiConfig(prev => ({
                                          ...prev,
                                          [day]: {
                                            ...prev[day],
                                            isManualNight: true,
                                            malam: { ...prev[day]?.malam, laboratorium: newSlots }
                                          }
                                        }));
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── EDIT MODE GUIDANCE BANNER (QA ONLY) ── */}
          {isQATeam && isEditMode && scheduleData && (
            <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-400/40 text-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in">
              <div className="flex items-start sm:items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="font-bold text-white text-xs">
                    Mode Edit Manual Aktif
                  </p>
                  <p className="text-[11px] text-blue-200/90 leading-relaxed">
                    Anda dapat mengubah materi / presenter untuk hari esok atau hari berikutnya. Setelah selesai, klik tombol <strong>"Simpan Perubahan Jadwal"</strong> di atas. Perubahan akan disinkronkan ke seluruh sistem dan memicu notifikasi pembaruan ke personil terkait.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditMode(false)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shrink-0 self-start sm:self-auto transition-colors shadow-xs"
              >
                Selesai Edit
              </button>
            </div>
          )}

          {/* ── NOTIFICATION: MATERI RECYCLE WARNINGS (QA ONLY) ── */}
          {isQATeam && materiWarnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Pemberitahuan Daur Ulang Materi Briefing</span>
                </div>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await handleResetSopIk();
                    setMateriWarnings([]);
                  }}
                  disabled={isResettingSopIk}
                  className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-600 dark:text-orange-300 border border-orange-500/40 text-[11px] h-7 px-3 rounded-lg font-bold shadow-xs self-start sm:self-auto"
                >
                  {isResettingSopIk ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-orange-500" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-orange-500" />}
                  <span>Reset &amp; Aktifkan Semua SOP &amp; IK</span>
                </Button>
              </div>
              <div className="space-y-1 pl-6">
                {materiWarnings.map((warn, i) => (
                  <p key={i} className="text-xs text-amber-200/90 leading-relaxed">
                    • {warn}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* ── SUMMARY BANNER (QA ONLY) ── */}
          {isQATeam && scheduleData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Total Sesi Briefing</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[var(--text-main)]">{scheduleStats.totalSlots}</span>
                  <span className="text-xs text-[var(--text-muted)]">Slot Presentasi (PT {selectedPt})</span>
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-amber-500 mb-1.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" /> Personil Dapat 2× Jadwal ({scheduleStats.doubleList.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                  {scheduleStats.doubleList.length === 0 ? (
                    <span className="text-[11px] text-[var(--text-muted)] italic">Tidak ada penugasan ganda</span>
                  ) : (
                    scheduleStats.doubleList.map(name => (
                      <span key={name} className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 rounded text-[10px] font-medium">
                        {name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-xl p-3.5 sm:col-span-2 lg:col-span-1 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-500" /> Belum Terjadwal ({scheduleStats.noJadwalList.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                  {scheduleStats.noJadwalList.length === 0 ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Semua personil staff/foreman terjadwal</span>
                  ) : (
                    scheduleStats.noJadwalList.map(name => (
                      <span key={name} className="px-2 py-0.5 bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded text-[10px]">
                        {name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SCHEDULE TABLE (EXPORTABLE / INTERACTIVE) ── */}
          {!scheduleData ? (
            <Card className="bg-slate-800/40 border-slate-700/60 p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-600 animate-pulse" />
              <h3 className="text-base font-bold text-slate-200">
                {isQATeam ? 'Jadwal P5M Belum Dibuat' : 'Jadwal P5M Belum Tersedia'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                {isQATeam ? (
                  <>
                    Klik tombol <strong>Acak Otomatis (PT {selectedPt})</strong> di atas untuk menyusun jadwal mingguan cerdas berbasis algoritma constraint &amp; database materi Notion.
                  </>
                ) : (
                  <>
                    Jadwal P5M untuk periode minggu ini (PT {selectedPt}) belum dipublikasikan oleh Koordinator QA. Silakan hubungi tim QA atau cek kembali beberapa saat lagi.
                  </>
                )}
              </p>
              {isQATeam && (
                <Button 
                  onClick={handleRandomize} 
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs mt-2 rounded-xl shadow-lg"
                >
                  <Shuffle className="w-3.5 h-3.5 mr-1.5" /> Susun Jadwal Sekarang
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Day Filter & Scroll Control Bar for Mobile */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[var(--card-bg)] border border-[var(--border-main)] p-2.5 sm:p-3 rounded-2xl shadow-md backdrop-blur-md">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 scroll-smooth">
                  <button
                    onClick={() => scrollToDay('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedDayFilter === 'ALL'
                        ? 'bg-[var(--primary)] text-white shadow-md'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--bg-main)]'
                    }`}
                  >
                    🗓️ Semua (Tabel 7 Hari)
                  </button>
                  {DAYS.map(day => (
                    <button
                      key={`filter-${day}`}
                      onClick={() => scrollToDay(day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedDayFilter === day
                          ? 'bg-[var(--primary)] text-white shadow-md'
                          : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--bg-main)]'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* P5M Schedule Board Container */}
              <div className="relative">

                <div 
                  ref={scrollContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`w-full overflow-x-auto ${isEditMode ? 'pb-16' : 'pb-3'} scrollbar-thin scrollbar-thumb-slate-700 rounded-2xl touch-pan-x cursor-grab active:cursor-grabbing select-none`}
                  style={{ touchAction: 'pan-x pan-y' }}
                >
                  <div 
                    className={`bg-[var(--card-bg)] text-[var(--text-main)] rounded-2xl ${isEditMode ? 'overflow-visible' : 'overflow-hidden'} shadow-xl border border-[var(--border-main)] transition-all ${
                      selectedDayFilter === 'ALL' ? 'min-w-[1180px]' : 'w-full min-w-0'
                    }`} 
                    ref={captureRef}
                  >
              
              {/* Header Title Bar */}
              <div className="bg-[var(--card-bg)] text-[var(--text-main)] px-5 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-[var(--primary)] gap-3 shadow-xs">
                <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                    P5M
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h2 className="font-black text-xs sm:text-sm tracking-wide uppercase font-mono text-[var(--primary)] leading-snug">
                      Jadwal P5M (Pembicaraan 5 Menit) — Preparation &amp; Laboratory
                    </h2>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono leading-normal">
                      Plant: PT {selectedPt === 'GTS' ? 'GTS' : 'TBP / GPS'} • Periode: {weekRangeDisplay}
                    </p>
                  </div>
                </div>

                {/* Proportional Legend Badge Card */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-[var(--input-bg)]/90 border border-[var(--border-main)] px-3.5 py-1.5 rounded-2xl shadow-2xs shrink-0 self-stretch md:self-auto">
                  {/* Shift Categories */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider mr-0.5">Shift:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/25 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-2xs"></span> Day
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/25 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block shadow-2xs"></span> Night
                    </span>
                  </div>

                  <div className="hidden sm:block w-px h-4 bg-[var(--border-main)]"></div>

                  {/* Section Categories */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider mr-0.5">Section:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-700 dark:text-orange-300 font-bold border border-orange-500/25 text-[10px]">
                      <span className="w-2 h-2 rounded bg-orange-500 inline-block shadow-2xs"></span> Preparasi
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/25 text-[10px]">
                      <span className="w-2 h-2 rounded bg-emerald-500 inline-block shadow-2xs"></span> Laboratorium
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/25 text-[10px]">
                      <span className="w-2 h-2 rounded bg-amber-500 inline-block shadow-2xs"></span> Gabungan
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Columns (1 column if single day filter selected, 7 columns if ALL selected) */}
              <div className={`grid divide-x divide-[var(--border-main)] border-b border-[var(--border-main)] text-xs ${
                selectedDayFilter === 'ALL' ? 'grid-cols-7' : 'grid-cols-1 w-full'
              }`}>
                {(selectedDayFilter === 'ALL' ? DAYS : [selectedDayFilter]).map(day => {
                  const isG = HARI_GABUNGAN.has(day);
                  const dateInfo = datesMeta[day];

                  return (
                    <div id={`p5m-col-${day}`} key={day} className={`flex flex-col ${selectedDayFilter === 'ALL' ? 'min-w-[160px]' : 'w-full'}`}>
                      
                      {/* Column Header */}
                      <div className="bg-[var(--input-bg)] p-2.5 text-center border-b border-[var(--border-main)]" style={{ borderTop: `4px solid ${DAY_COLORS[day]}` }}>
                        <div className="font-black text-[var(--text-main)] text-sm">{day}</div>
                        <div className="text-[11px] font-mono text-[var(--text-muted)] font-semibold">{dateInfo?.display || '-'}</div>
                        <span className={`inline-block text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded-full mt-1 ${
                          isG ? 'bg-amber-400 text-slate-950 border border-amber-500 shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                        }`}>
                          {isG ? 'GABUNGAN' : 'SPLIT'}
                        </span>
                      </div>

                      {/* ☀️ Day Shift Section */}
                      <div className="bg-[var(--card-bg)] p-1.5 border-b-2 border-[var(--border-main)] flex-1 space-y-1.5 min-h-[160px]">
                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1 pt-0.5 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm"></span>
                          <span>☀️ Day Shift</span>
                        </div>

                        {isG ? (
                          <div className="bg-amber-50/40 rounded-xl p-1.5 border-2 border-amber-300 space-y-1.5 shadow-sm">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase font-mono text-amber-900 px-1 mb-1">
                              <span className="w-2 h-2 rounded bg-amber-500 inline-block shadow-sm"></span>
                              Gabungan (All Team)
                            </div>
                            {(scheduleData[day]?.pagi?.gabungan || []).map((slot: any, sIdx: number) => (
                              <PresenterCard 
                                key={sIdx}
                                slot={slot}
                                isEditMode={isEditMode}
                                karyawanPool={karyawanPool}
                                day={day}
                                shift="pagi"
                                zone="gabungan"
                                isDouble={scheduleStats.scheduledMap[slot.nama] >= 2}
                                materiList={materiList}
                                onPreviewImage={(url, title) => setPreviewImage({ url, title })}
                                onUpdatePerson={(person) => handleUpdateSlotPerson(day, 'pagi', 'gabungan', sIdx, person)}
                                onSelectMateri={(materiItem) => handleUpdateSlotMateri(day, 'pagi', 'gabungan', sIdx, materiItem)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Prep */}
                            <div className="bg-orange-50/40 rounded-xl p-1.5 border-2 border-orange-300 space-y-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase font-mono text-orange-900 px-1 mb-1">
                                <span className="w-2 h-2 rounded bg-orange-500 inline-block shadow-sm"></span>
                                Preparasi
                              </div>
                              {(scheduleData[day]?.pagi?.preparasi || []).map((slot: any, sIdx: number) => (
                                <PresenterCard 
                                  key={`prep-${sIdx}`}
                                  slot={slot}
                                  isEditMode={isEditMode}
                                  karyawanPool={karyawanPool}
                                  day={day}
                                  shift="pagi"
                                  zone="prep"
                                  isDouble={scheduleStats.scheduledMap[slot.nama] >= 2}
                                  materiList={materiList}
                                  onPreviewImage={(url, title) => setPreviewImage({ url, title })}
                                  onUpdatePerson={(person) => handleUpdateSlotPerson(day, 'pagi', 'preparasi', sIdx, person)}
                                  onSelectMateri={(materiItem) => handleUpdateSlotMateri(day, 'pagi', 'preparasi', sIdx, materiItem)}
                                />
                              ))}
                            </div>

                            {/* Lab */}
                            <div className="bg-emerald-50/40 rounded-xl p-1.5 border-2 border-emerald-300 space-y-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase font-mono text-emerald-900 px-1 mb-1">
                                <span className="w-2 h-2 rounded bg-emerald-600 inline-block shadow-sm"></span>
                                Laboratorium
                              </div>
                              {(scheduleData[day]?.pagi?.laboratorium || []).map((slot: any, sIdx: number) => (
                                <PresenterCard 
                                  key={`lab-${sIdx}`}
                                  slot={slot}
                                  isEditMode={isEditMode}
                                  karyawanPool={karyawanPool}
                                  day={day}
                                  shift="pagi"
                                  zone="lab"
                                  isDouble={scheduleStats.scheduledMap[slot.nama] >= 2}
                                  materiList={materiList}
                                  onPreviewImage={(url, title) => setPreviewImage({ url, title })}
                                  onUpdatePerson={(person) => handleUpdateSlotPerson(day, 'pagi', 'laboratorium', sIdx, person)}
                                  onSelectMateri={(materiItem) => handleUpdateSlotMateri(day, 'pagi', 'laboratorium', sIdx, materiItem)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Special HSE safety talk on Friday day */}
                        {day === 'Jumat' && (
                          <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-2 text-center shadow-sm">
                            <span className="text-[9px] font-bold uppercase font-mono text-emerald-800 block">HSE Dept</span>
                            <span className="text-[11px] font-bold text-slate-800 block">Safety Talk Mingguan</span>
                          </div>
                        )}
                      </div>

                      {/* 🌙 Night Shift Section */}
                      <div className="bg-[var(--bg-main)]/40 p-1.5 flex-1 space-y-1.5 min-h-[160px]">
                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-1 pt-0.5 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block shadow-sm"></span>
                          <span>🌙 Night Shift</span>
                        </div>

                        {day === 'Minggu' ? (
                          <div className="p-3 text-center text-[10px] text-[var(--text-muted)] font-mono italic">
                            — Libur Night Shift —
                          </div>
                        ) : isG ? (
                          <div className="bg-amber-50/40 rounded-xl p-1.5 border-2 border-amber-300 space-y-1.5 shadow-sm">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase font-mono text-amber-900 px-1 mb-1">
                              <span className="w-2 h-2 rounded bg-amber-500 inline-block shadow-sm"></span>
                              Gabungan (All Team)
                            </div>
                            {(scheduleData[day]?.malam?.gabungan || []).map((slot: any, sIdx: number) => (
                              <PresenterCard 
                                key={sIdx}
                                slot={slot}
                                isEditMode={isEditMode}
                                karyawanPool={karyawanPool}
                                day={day}
                                shift="malam"
                                zone="gabungan"
                                isDouble={scheduleStats.scheduledMap[slot.nama] >= 2}
                                materiList={materiList}
                                onPreviewImage={(url, title) => setPreviewImage({ url, title })}
                                onUpdatePerson={(person) => handleUpdateSlotPerson(day, 'malam', 'gabungan', sIdx, person)}
                                onSelectMateri={(materiItem) => handleUpdateSlotMateri(day, 'malam', 'gabungan', sIdx, materiItem)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Prep */}
                            <div className="bg-orange-50/40 rounded-xl p-1.5 border-2 border-orange-300 space-y-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase font-mono text-orange-900 px-1 mb-1">
                                <span className="w-2 h-2 rounded bg-orange-500 inline-block shadow-sm"></span>
                                Preparasi
                              </div>
                              {(scheduleData[day]?.malam?.preparasi || []).map((slot: any, sIdx: number) => (
                                <PresenterCard 
                                  key={`prep-n-${sIdx}`}
                                  slot={slot}
                                  isEditMode={isEditMode}
                                  karyawanPool={karyawanPool}
                                  day={day}
                                  shift="malam"
                                  zone="prep"
                                  isDouble={scheduleStats.scheduledMap[slot.nama] >= 2}
                                  materiList={materiList}
                                  onPreviewImage={(url, title) => setPreviewImage({ url, title })}
                                  onUpdatePerson={(person) => handleUpdateSlotPerson(day, 'malam', 'preparasi', sIdx, person)}
                                  onSelectMateri={(materiItem) => handleUpdateSlotMateri(day, 'malam', 'preparasi', sIdx, materiItem)}
                                />
                              ))}
                            </div>

                            {/* Lab */}
                            <div className="bg-emerald-50/40 rounded-xl p-1.5 border-2 border-emerald-300 space-y-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase font-mono text-emerald-900 px-1 mb-1">
                                <span className="w-2 h-2 rounded bg-emerald-600 inline-block shadow-sm"></span>
                                Laboratorium
                              </div>
                              {(scheduleData[day]?.malam?.laboratorium || []).map((slot: any, sIdx: number) => (
                                <PresenterCard 
                                  key={`lab-n-${sIdx}`}
                                  slot={slot}
                                  isEditMode={isEditMode}
                                  karyawanPool={karyawanPool}
                                  day={day}
                                  shift="malam"
                                  zone="lab"
                                  isDouble={scheduleStats.scheduledMap[slot.nama] >= 2}
                                  materiList={materiList}
                                  onPreviewImage={(url, title) => setPreviewImage({ url, title })}
                                  onUpdatePerson={(person) => handleUpdateSlotPerson(day, 'malam', 'laboratorium', sIdx, person)}
                                  onSelectMateri={(materiItem) => handleUpdateSlotMateri(day, 'malam', 'laboratorium', sIdx, materiItem)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Bottom Footer Stamp */}
              <div className="bg-[var(--input-bg)] px-6 py-2.5 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono border-t border-[var(--border-main)]">
                <span>Dokumen Resmi Sistem Portal Prep &amp; Lab Harita Nickel</span>
                <span>Diperbarui pada: {new Date().toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}

      {/* ── TAB 2: BANK MATERI P5M ── */}
      {activeTab === 'materi' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--card-bg)] border border-[var(--border-main)] p-4 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                Bank Data Materi P5M &amp; Safety Talk
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Koleksi materi teknis &amp; non-teknis dengan flyer yang tersimpan di Cloud SQL &amp; Google Drive.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={fetchMateriList}
                disabled={loadingMateri}
                className="bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--card-bg)] text-xs h-9 px-3 rounded-xl shadow-xs"
              >
                {loadingMateri ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                <span>Segarkan Data</span>
              </Button>

              {isQATeam && (
                <>
                  <Button
                    variant="secondary"
                    onClick={handleResetSopIk}
                    disabled={isResettingSopIk}
                    className="bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 dark:text-orange-300 border border-orange-500/40 text-xs h-9 px-3 rounded-xl shadow-xs font-semibold"
                    title="Reset status pemakaian seluruh materi SOP & IK agar kembali diprioritaskan saat pengacakan jadwal otomatis"
                  >
                    {isResettingSopIk ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-1.5 text-orange-500" />
                    )}
                    <span>Reset Pemakaian SOP &amp; IK</span>
                  </Button>

                  <Button
                    onClick={() => {
                      setBulkModalOpen(true);
                    }}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                    title="Tambah banyak materi P5M sekaligus dengan awalan judul seragam"
                  >
                    <Layers className="w-4 h-4 mr-1" />
                    <span>Tambah Materi Bulk</span>
                  </Button>

                  <Button
                    onClick={() => {
                      setEditingMateri(null);
                      setFormJudul('');
                      setFormKategori('Teknis');
                      setFormSubKategori('General');
                      setFormDivisi('Preparation');
                      setFormIsInternal(false);
                      setFormImageBase64(null);
                      setFormImagePreview(null);
                      setFormImageFilename('');
                      setMateriModalOpen(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 px-3.5 rounded-xl shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Tambah Materi Baru
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Batch Action Bar if items selected */}
          {isQATeam && selectedMateriIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-300">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>{selectedMateriIds.length} materi dipilih</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setBatchPrefixText('');
                    setBatchPrefixModalOpen(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Tambah Awalan Judul</span>
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleBatchDelete}
                  disabled={isDeletingBatch}
                  className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeletingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Hapus Terpilih</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedMateriIds([])}
                  className="text-xs h-8 px-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Batal Pilihan
                </Button>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-[var(--card-bg)] border border-[var(--border-main)] p-3 rounded-xl shadow-xs">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Cari judul materi briefing..."
                value={materiSearch}
                onChange={e => setMateriSearch(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--text-main)] outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <select
              value={materiFilterKat}
              onChange={e => setMateriFilterKat(e.target.value)}
              className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] outline-none cursor-pointer"
            >
              <option value="All">Semua Kategori</option>
              <option value="SOP / IK">📘 Dokumen SOP &amp; IK</option>
              <option value="Teknis">Teknis</option>
              <option value="Non-Teknis">Non-Teknis</option>
            </select>

            <select
              value={materiFilterSubKat}
              onChange={e => setMateriFilterSubKat(e.target.value)}
              className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] outline-none cursor-pointer"
            >
              <option value="All">Semua Sub-Kategori</option>
              <option value="General">General (Semua Section)</option>
              <option value="Laboratory">Laboratory &amp; QA</option>
              <option value="Preparation">Preparation</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          {/* Table List */}
          <Card className="border-[var(--border-main)] overflow-hidden rounded-2xl shadow-sm p-0">
            {loadingMateri ? (
              <div className="py-16 text-center text-[var(--text-muted)] flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-xs">Memuat database materi...</p>
              </div>
            ) : filteredMateri.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-muted)] space-y-2">
                <BookOpen className="w-10 h-10 text-[var(--text-muted)] opacity-40 mx-auto" />
                <p className="text-sm font-semibold text-[var(--text-main)]">Tidak ada materi yang cocok</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[var(--text-main)]">
                  <thead className="bg-[var(--input-bg)] text-[var(--text-muted)] uppercase font-mono text-[10px] border-b border-[var(--border-main)]">
                    <tr>
                      {isQATeam && (
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredMateri.length > 0 && selectedMateriIds.length === filteredMateri.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMateriIds(filteredMateri.map(m => m.id));
                              } else {
                                setSelectedMateriIds([]);
                              }
                            }}
                            className="rounded border-[var(--border-main)] text-teal-600 focus:ring-teal-500 cursor-pointer"
                            title="Pilih Semua"
                          />
                        </th>
                      )}
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Judul Materi Briefing</th>
                      <th className="py-3 px-4 w-28">Kategori</th>
                      <th className="py-3 px-4 w-40">Sub-Kategori</th>
                      <th className="py-3 px-4 w-28 text-center">File / Flyer</th>
                      <th className="py-3 px-4 w-36">Terakhir Digunakan</th>
                      {isQATeam && <th className="py-3 px-4 w-24 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                    {filteredMateri.map((item, idx) => (
                      <tr key={item.id} className={`hover:bg-[var(--input-bg)] transition-colors ${selectedMateriIds.includes(item.id) ? 'bg-teal-500/5' : ''}`}>
                        {isQATeam && (
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedMateriIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMateriIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedMateriIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded border-[var(--border-main)] text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3 px-4 text-center font-mono text-[var(--text-muted)]">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-main)]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[var(--text-main)] font-semibold">{item.judul}</span>
                            {item.isInternal && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                ⭐ Internal (Sabtu)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            item.kategori === 'Teknis' 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                              : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                          }`}>
                            {item.kategori}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-main)] text-[10px]">
                            {item.subKategori === 'General' 
                              ? 'General' 
                              : item.subKategori === 'Laboratory'
                              ? 'Teknis Lab & QA'
                              : item.subKategori === 'Preparation'
                              ? 'Teknis Prep'
                              : 'Teknis Maint'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.fileUrl ? (() => {
                            const urlLower = item.fileUrl.toLowerCase();
                            const isExcel = urlLower.includes('.xlsx') || urlLower.includes('.xls') || (item.judul && (item.judul.toLowerCase().includes('.xlsx') || item.judul.toLowerCase().includes('.xls')));
                            const isPdf = !isExcel && (urlLower.includes('.pdf') || (item.judul && (/\b(sop|ik)\b|instruksi kerja/i.test(item.judul) || item.judul.startsWith('IK ') || item.judul.startsWith('SOP '))));
                            return (
                              <button
                                onClick={() => setPreviewImage({ url: item.fileUrl, title: item.judul })}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto border transition-colors cursor-pointer ${
                                  isExcel
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : isPdf 
                                    ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' 
                                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {isExcel ? <FileSpreadsheet className="w-3 h-3" /> : isPdf ? <FileText className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                <span>{isExcel ? 'Excel' : isPdf ? 'Dokumen' : 'Flyer'}</span>
                              </button>
                            );
                          })() : (
                            <span className="text-[var(--text-muted)] font-mono text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-muted)] text-[11px]">
                          {item.lastUsed ? new Date(item.lastUsed).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '— Belum pernah'}
                        </td>
                        {isQATeam && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.lastUsed && (
                                <button
                                  onClick={() => handleResetSingleMateri(item.id, item.judul)}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-emerald-500 hover:bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer"
                                  title="Reset Status Pemakaian (Jadikan Belum Pernah)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingMateri(item);
                                  setFormJudul(item.judul);
                                  setFormKategori(item.kategori || 'Teknis');
                                  setFormSubKategori(item.subKategori || 'General');
                                  setFormDivisi(item.divisi || 'Preparation');
                                  setFormIsInternal(Boolean(item.isInternal));
                                  setMateriModalOpen(true);
                                }}
                                className="p-1.5 text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer"
                                title="Edit Materi"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMateri(item.id)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer"
                                title="Hapus Materi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 3: ARSIP JADWAL ── */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] p-4 rounded-2xl shadow-xs">
            <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              Arsip Jadwal P5M Tersimpan
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Daftar seluruh jadwal mingguan yang telah disimpan dan dipublikasikan sebelumnya.
            </p>
          </div>

          <Card className="border-[var(--border-main)] p-4 rounded-2xl shadow-xs">
            {loadingArchive ? (
              <div className="py-16 text-center text-[var(--text-muted)] flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-xs">Memuat arsip jadwal...</p>
              </div>
            ) : archiveList.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-muted)] space-y-2">
                <History className="w-10 h-10 text-[var(--text-muted)] opacity-40 mx-auto" />
                <p className="text-sm font-semibold text-[var(--text-main)]">Belum ada riwayat jadwal tersimpan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {archiveList.map(arch => (
                  <div key={arch.id} className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-4 space-y-3 hover:border-amber-500/50 transition-all shadow-xs">
                    <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
                      <span className="font-bold text-sm text-[var(--text-main)] font-mono">
                        {arch.dateStart} – {arch.dateEnd}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        {arch.summary?.pt ? `PT ${arch.summary.pt}` : 'Saved'}
                      </span>
                    </div>

                    <div className="text-xs text-[var(--text-muted)] space-y-1 font-mono">
                      <div>Dibuat oleh: <strong className="text-[var(--text-main)]">{arch.createdBy || 'Admin'}</strong></div>
                      <div>Waktu simpan: <span className="text-[var(--text-muted)]">{new Date(arch.createdAt).toLocaleString('id-ID')}</span></div>
                      <div>Total Sesi: <span className="text-amber-500 font-bold">{arch.summary?.totalSlots || '-'} Sesi</span></div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setScheduleData(arch.scheduleData);
                          setActiveScheduleId(arch.id);
                          if (arch.config) setUiConfig(arch.config);
                          if (arch.dateStart) {
                            setTargetDateStr(arch.dateStart);
                            fetchPoolAndDates(arch.dateStart, selectedPt);
                          }
                          setActiveTab('schedule');
                          toast.success('Jadwal berhasil dimuat ke editor untuk ditinjau / diedit!');
                        }}
                        className="w-full bg-[var(--card-bg)] hover:bg-amber-500 hover:text-slate-950 text-[var(--text-main)] text-xs h-8 rounded-lg font-bold border border-[var(--border-main)] transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Buka Jadwal Ini
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MODAL: TAMBAH / EDIT MATERI ── */}
      {materiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-[var(--card-bg)] border border-[var(--border-main)] w-full max-w-lg p-5 rounded-2xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                {editingMateri ? 'Edit Materi P5M' : 'Tambah Materi Baru'}
              </h3>
              <button 
                onClick={() => {
                  setMateriModalOpen(false);
                  setFormImageBase64(null);
                  setFormImagePreview(null);
                  setFormImageFilename('');
                }} 
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMateriModal} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[var(--text-main)] font-semibold">Judul Materi / Topik Briefing *</label>
                  {formImageFilename && (
                    <button
                      type="button"
                      onClick={() => {
                        const auto = cleanFilenameToTitle(formImageFilename, true);
                        setFormJudul(auto);
                        toast.success(`Judul diset dari nama file: "${auto}"`);
                      }}
                      className="text-[10px] text-teal-600 dark:text-teal-400 hover:text-teal-500 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Gunakan nama file lampiran sebagai judul materi"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gunakan nama file sebagai judul</span>
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={2}
                  value={formJudul}
                  onChange={e => setFormJudul(e.target.value)}
                  placeholder="Contoh: Prosedur Pengoperasian Jaw Crusher & Pencegahan Debu"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] outline-none focus:border-amber-500 resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">Kategori Utama</label>
                  <select
                    value={formKategori}
                    onChange={e => setFormKategori(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-2 text-xs text-[var(--text-main)] outline-none cursor-pointer"
                  >
                    <option value="Teknis">Teknis</option>
                    <option value="Non-Teknis">Non-Teknis</option>
                    <option value="Senam">Senam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">Target Section / Divisi</label>
                  <select
                    value={formDivisi}
                    onChange={e => setFormDivisi(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-2 text-xs text-[var(--text-main)] outline-none cursor-pointer"
                  >
                    <option value="All">Semua Section (All)</option>
                    <option value="Preparation">Preparation</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Quality Assurance">Quality Assurance (QA)</option>
                    <option value="IC">Inventory Control (IC)</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
              </div>

              {formKategori === 'Teknis' && (
                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">Sub-Kategori Teknis</label>
                  <select
                    value={formSubKategori}
                    onChange={e => setFormSubKategori(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-2 text-xs text-[var(--text-main)] outline-none cursor-pointer"
                  >
                    <option value="General">Teknis General (Semua Section)</option>
                    <option value="Preparation">Teknis Preparation</option>
                    <option value="Laboratory">Teknis Laboratory (Lab &amp; QA)</option>
                    <option value="Maintenance">Teknis Maintenance</option>
                  </select>
                </div>
              )}

              {/* Checkbox Materi Internal (Sabtu) */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsInternal}
                    onChange={e => setFormIsInternal(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-[var(--border-main)] bg-[var(--input-bg)] cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span>⭐ Materi Internal (Jadwalkan di Hari Sabtu Periode Selanjutnya)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      Materi ini akan secara otomatis diprioritaskan dan dijadwalkan pada <strong>hari Sabtu</strong> periode penjadwalan P5M berikutnya sesuai kelompoknya (Teknis / Non-Teknis).
                    </p>
                  </div>
                </label>
              </div>

              {/* Upload Flyer / Poster / Excel / PDF */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[var(--text-main)] font-semibold">
                  Upload Berkas Materi (Flyer / Dokumen PDF / Spreadsheet Excel)
                </label>
                
                {formImageBase64 || editingMateri?.fileUrl ? (() => {
                  const checkName = (formImageFilename || editingMateri?.fileUrl || '').toLowerCase();
                  const isExcelUpload = checkName.includes('.xlsx') || checkName.includes('.xls');
                  const isPdfUpload = !isExcelUpload && checkName.includes('.pdf');

                  return (
                    <div className="relative rounded-xl border border-emerald-500/40 bg-[var(--input-bg)] p-2.5 flex items-center gap-3">
                      {isExcelUpload ? (
                        <div className="w-14 h-14 rounded-lg border border-emerald-500/40 bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
                        </div>
                      ) : isPdfUpload ? (
                        <div className="w-14 h-14 rounded-lg border border-rose-500/40 bg-rose-500/15 flex items-center justify-center shrink-0">
                          <FileText className="w-7 h-7 text-rose-500" />
                        </div>
                      ) : (
                        <img 
                          src={formImagePreview || editingMateri?.fileUrl} 
                          alt="Preview Materi" 
                          className="w-14 h-14 object-cover rounded-lg border border-[var(--border-main)] bg-[var(--card-bg)] shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[var(--text-main)] truncate">
                          {formImageFilename || (isExcelUpload ? 'Spreadsheet Excel Terlampir' : isPdfUpload ? 'Dokumen PDF Terlampir' : 'Flyer Terlampir')}
                        </div>
                        {formImageFilename && formJudul !== cleanFilenameToTitle(formImageFilename, true) && (
                          <button
                            type="button"
                            onClick={() => {
                              const auto = cleanFilenameToTitle(formImageFilename, true);
                              setFormJudul(auto);
                              toast.success(`Judul diset dari nama file: "${auto}"`);
                            }}
                            className="mt-1 text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-500 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Jadikan nama file sebagai judul: "{cleanFilenameToTitle(formImageFilename, true)}"</span>
                          </button>
                        )}
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>
                            {formImageBase64 ? 'Berkas baru siap disimpan' : 'Berkas tersimpan di sistem'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                          {isExcelUpload ? 'Format: Spreadsheet Excel (.xlsx / .xls)' : isPdfUpload ? 'Format: Dokumen PDF' : 'Format: Gambar / Flyer'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFormImageBase64(null);
                          setFormImagePreview(null);
                          setFormImageFilename('');
                        }}
                        className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0"
                        title="Hapus berkas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })() : (
                  <label className="border-2 border-dashed border-[var(--border-main)] hover:border-emerald-500/60 bg-[var(--input-bg)] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <div className="flex items-center gap-2 mb-1 text-[var(--text-muted)]">
                      <ImageIcon className="w-6 h-6" />
                      <FileText className="w-6 h-6" />
                      <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                    </div>
                    <span className="text-xs text-[var(--text-main)] font-semibold">
                      Klik untuk memilih berkas flyer, PDF, atau spreadsheet Excel
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                      Maksimal 30MB • Mendukung Gambar (PNG/JPG), PDF, dan Excel (.xlsx / .xls)
                    </span>
                    <input 
                      type="file" 
                      accept="image/*,.pdf,.xlsx,.xls" 
                      className="hidden" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 30 * 1024 * 1024) {
                            toast.error(`Ukuran file maksimal 30MB (File Anda: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
                            return;
                          }
                          setFormImageFilename(file.name);
                          const autoTitle = cleanFilenameToTitle(file.name, true);
                          if (!formJudul.trim()) {
                            setFormJudul(autoTitle);
                            toast.info(`Judul materi otomatis diisi dari nama file: "${autoTitle}"`);
                          }
                          const isImg = file.type.startsWith('image/');
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const res = evt.target?.result as string;
                            setFormImageBase64(res);
                            setFormImagePreview(isImg ? res : null);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border-main)]">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => {
                    setMateriModalOpen(false);
                    setFormImageBase64(null);
                    setFormImagePreview(null);
                    setFormImageFilename('');
                  }} 
                  className="text-xs h-8 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSavingMateri}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-4 rounded-xl shadow-md"
                >
                  {isSavingMateri ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Menyimpan &amp; Upload...</span>
                    </>
                  ) : (
                    <span>Simpan Materi</span>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── MODAL: TAMBAH MATERI P5M SECARA BULK ── */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <Card className="bg-[var(--card-bg)] border border-[var(--border-main)] w-full max-w-2xl p-5 sm:p-6 rounded-2xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--border-main)] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)]">
                    Tambah Materi P5M Secara Bulk
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Input banyak judul materi sekaligus dan sematkan awalan judul secara seragam
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--input-bg)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkMateri} className="space-y-4 text-xs">
              {/* Awalan Judul (Prefix) Input & Quick Chips */}
              <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-2.5">
                <div>
                  <label className="block text-[var(--text-main)] font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Tag className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Awalan Judul (Bulk Prefix)</span>
                    <span className="text-[10px] font-normal text-[var(--text-muted)]">(Opsional)</span>
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] mb-2">
                    Teks ini akan otomatis disematkan di bagian depan setiap judul materi di bawah.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={bulkPrefix}
                      onChange={e => setBulkPrefix(e.target.value)}
                      placeholder="Contoh: P5M -  atau  Safety Talk:  atau  [K3]  atau  IK-LAB-"
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-teal-500 font-mono transition-colors"
                    />
                    {bulkPrefix && (
                      <button
                        type="button"
                        onClick={() => setBulkPrefix('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-rose-500"
                        title="Hapus Awalan"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Preset Chips */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Pilihan Cepat Awalan:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'P5M - ',
                      '[P5M] ',
                      'Safety Talk: ',
                      'SOP - ',
                      'IK - ',
                      'K3: ',
                      '5R - ',
                      'Kesehatan: '
                    ].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBulkPrefix(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer border ${
                          bulkPrefix === preset 
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs' 
                            : 'bg-[var(--card-bg)] hover:bg-teal-500/15 text-[var(--text-main)] border-[var(--border-main)]'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    {bulkPrefix && (
                      <button
                        type="button"
                        onClick={() => setBulkPrefix('')}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                      >
                        Tanpa Awalan
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Pemilihan Mode: Lampirkan Berkas vs Tempel Teks */}
              <div className="flex items-center gap-1.5 p-1 bg-[var(--input-bg)] rounded-xl border border-[var(--border-main)]">
                <button
                  type="button"
                  onClick={() => setBulkMode('files')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    bulkMode === 'files'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Lampirkan Berkas ({bulkAttachedFiles.length})</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                    bulkMode === 'files' ? 'bg-teal-700 text-teal-100' : 'bg-[var(--card-bg)] text-[var(--text-muted)]'
                  }`}>
                    Baca Nama File
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('text')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    bulkMode === 'text'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tempel Teks ({bulkRawText.split('\n').filter(l => l.trim().length > 0).length})</span>
                </button>
              </div>

              {/* Mode 1: Lampirkan Banyak File (Otomatis Baca Nama File) */}
              {bulkMode === 'files' && (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-teal-500/40 hover:border-teal-500 bg-teal-500/5 hover:bg-teal-500/10 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-2 group-hover:scale-105 transition-transform">
                      {isReadingBulkFiles ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-[var(--text-main)] text-center">
                      Klik untuk memilih banyak berkas sekaligus (atau seret berkas ke sini)
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] text-center mt-1 max-w-md">
                      Sistem akan <strong>otomatis membaca nama setiap berkas</strong> menjadi judul materi P5M serta mengunggah dokumennya.
                    </p>
                    <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 mt-2 bg-teal-500/15 px-2.5 py-1 rounded-full border border-teal-500/30">
                      Mendukung Gambar (PNG/JPG), Dokumen PDF, &amp; Spreadsheet Excel (.xlsx / .xls)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.xlsx,.xls"
                      className="hidden"
                      disabled={isReadingBulkFiles}
                      onChange={handleBulkFilesSelect}
                    />
                  </label>

                  {/* List of Attached Files */}
                  {bulkAttachedFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                          <span>Berkas Terlampir ({bulkAttachedFiles.length} file)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const lines = bulkAttachedFiles.map(f => cleanFilenameToTitle(f.filename, bulkStripNumbering));
                              setBulkRawText(lines.join('\n'));
                              setBulkMode('text');
                              toast.info('Judul file berhasil disalin ke mode teks');
                            }}
                            className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                          >
                            Salin ke Mode Teks
                          </button>
                          <span className="text-[var(--text-muted)]">•</span>
                          <button
                            type="button"
                            onClick={() => setBulkAttachedFiles([])}
                            className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
                          >
                            Hapus Semua
                          </button>
                        </div>
                      </div>

                      <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)]/80 divide-y divide-[var(--border-main)] p-1 text-xs">
                        {bulkAttachedFiles.map((bf, idx) => {
                          const clean = cleanFilenameToTitle(bf.filename, bulkStripNumbering);
                          const cleanP = bulkPrefix.trim();
                          return (
                            <div key={idx} className="p-2 flex items-center justify-between gap-2.5 rounded-lg hover:bg-[var(--card-bg)] transition-colors">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-[var(--border-main)] bg-[var(--card-bg)]">
                                {bf.isExcel ? (
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                ) : bf.isPdf ? (
                                  <FileText className="w-4 h-4 text-rose-500" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-sky-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-[var(--text-main)] truncate flex items-center gap-1">
                                  {cleanP && (
                                    <span className="text-teal-600 dark:text-teal-400 bg-teal-500/15 px-1 py-0.2 rounded text-[10px] font-mono">
                                      {cleanP}
                                    </span>
                                  )}
                                  <span>{clean}</span>
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-2 mt-0.5 truncate">
                                  <span>{bf.filename}</span>
                                  <span>•</span>
                                  <span>{bf.sizeFormatted}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveBulkFile(idx)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Hapus file ini"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Tempel Teks Judul */}
              {bulkMode === 'text' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[var(--text-main)] font-bold text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>Daftar Judul Materi (Satu Baris per Materi) *</span>
                    </label>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {parsedBulkItems.length} materi terdeteksi
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={bulkRawText}
                    onChange={e => setBulkRawText(e.target.value)}
                    placeholder={`Tempel daftar materi di sini (satu baris per judul). Contoh:\n1. Penggunaan Alat Pelindung Diri (APD) di Ruang Prep\n2. Prosedur Tanggap Darurat Tumpahan Bahan Kimia\n3. Ergonomi Kerja dan Manual Handling\n4. Inspeksi Kelayakan Dust Collector`}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-3 text-xs text-[var(--text-main)] outline-none focus:border-teal-500 font-mono transition-colors resize-y leading-relaxed"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>💡 Tips: Beralih ke tab "Lampirkan Berkas" untuk otomatis membaca nama file PDF / Excel / Flyer.</span>
                  </div>
                </div>
              )}

              {/* Smart Options Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkStripNumbering}
                    onChange={e => setBulkStripNumbering(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-[var(--border-main)] cursor-pointer"
                  />
                  <span className="text-[var(--text-main)]">
                    Bersihkan otomatis nomor urut (misal: <code>01. </code>, <code>1) </code>, <code>- </code>, <code>• </code>)
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkSkipDuplicates}
                    onChange={e => setBulkSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-[var(--border-main)] cursor-pointer"
                  />
                  <span className="text-[var(--text-main)]">
                    Lewati jika materi sudah ada di database (Cegah Duplikat)
                  </span>
                </label>
              </div>

              {/* Default Categories & Divisi Setup */}
              <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)]/50 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <Filter className="w-3 h-3" />
                  <span>Pengaturan Kategori &amp; Divisi Default</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[var(--text-muted)] font-semibold text-[11px] mb-1">Kategori</label>
                    <select
                      value={bulkDefaultKategori}
                      onChange={e => setBulkDefaultKategori(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg p-2 text-xs text-[var(--text-main)] outline-none cursor-pointer"
                    >
                      <option value="auto">✨ Otomatis (Deteksi Kata Kunci)</option>
                      <option value="Teknis">Teknis</option>
                      <option value="Non-Teknis">Non-Teknis</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] font-semibold text-[11px] mb-1">Sub-Kategori</label>
                    <select
                      value={bulkDefaultSubKategori}
                      onChange={e => setBulkDefaultSubKategori(e.target.value)}
                      disabled={bulkDefaultKategori === 'auto'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg p-2 text-xs text-[var(--text-main)] outline-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="General">General (Semua Section)</option>
                      <option value="Preparation">Preparation</option>
                      <option value="Laboratory">Laboratory &amp; QA</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] font-semibold text-[11px] mb-1">Target Divisi / Section</label>
                    <select
                      value={bulkDefaultDivisi}
                      onChange={e => setBulkDefaultDivisi(e.target.value)}
                      disabled={bulkDefaultKategori === 'auto'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg p-2 text-xs text-[var(--text-main)] outline-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="All">Semua Section (All)</option>
                      <option value="Preparation">Preparation</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkIsInternal}
                    onChange={e => setBulkIsInternal(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-[var(--border-main)] cursor-pointer"
                  />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    ⭐ Tandai seluruh materi ini sebagai Materi Khusus Internal (Jadwalkan Hari Sabtu)
                  </span>
                </label>
              </div>

              {/* Live Preview of parsed items */}
              {parsedBulkItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-teal-600" />
                      <span>Pratinjau Hasil Judul ({parsedBulkItems.length})</span>
                    </span>
                    {bulkSkipDuplicates && parsedBulkItems.some(i => i.isDuplicate) && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ {parsedBulkItems.filter(i => i.isDuplicate).length} duplikat akan dilewati
                      </span>
                    )}
                  </div>

                  <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)]/80 divide-y divide-[var(--border-main)] p-1 text-xs">
                    {parsedBulkItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 flex items-center justify-between gap-2 rounded-lg ${
                          item.isDuplicate && bulkSkipDuplicates 
                            ? 'opacity-50 bg-rose-500/5' 
                            : 'hover:bg-[var(--card-bg)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono text-[10px] text-[var(--text-muted)] w-6 shrink-0">
                            #{idx + 1}
                          </span>
                          {item.hasFile && item.fileInfo && (
                            <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                              {item.fileInfo.isExcel ? 'Excel' : item.fileInfo.isPdf ? 'PDF' : 'Flyer'}
                            </span>
                          )}
                          <span className="truncate font-semibold text-[var(--text-main)]">
                            {bulkPrefix && item.title.startsWith(bulkPrefix.trim()) ? (
                              <>
                                <span className="text-teal-600 dark:text-teal-400 font-bold bg-teal-500/15 px-1 py-0.5 rounded mr-1">
                                  {bulkPrefix.trim()}
                                </span>
                                <span>{item.title.substring(bulkPrefix.trim().length).trim()}</span>
                              </>
                            ) : (
                              item.title
                            )}
                          </span>
                        </div>
                        {item.isDuplicate && (
                          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
                            Duplikat
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border-main)]">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setBulkModalOpen(false)}
                  className="text-xs h-9 px-3 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSavingBulk || isReadingBulkFiles || parsedBulkItems.length === 0}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingBulk ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Menyimpan {parsedBulkItems.length} Materi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      <span>
                        Simpan {parsedBulkItems.filter(i => !bulkSkipDuplicates || !i.isDuplicate).length} Materi {bulkMode === 'files' && bulkAttachedFiles.length > 0 ? 'Beserta Berkas' : 'Sekaligus'}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── MODAL: TAMBAH AWALAN JUDUL PADA MATERI TERPILIH (BATCH PREFIX) ── */}
      {batchPrefixModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <Card className="bg-[var(--card-bg)] border border-[var(--border-main)] w-full max-w-lg p-5 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-[var(--text-main)]">
                  Tambah Awalan Judul ({selectedMateriIds.length} Materi Terpilih)
                </h3>
              </div>
              <button 
                onClick={() => setBatchPrefixModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--text-main)] font-semibold mb-1">
                  Masukkan Awalan Judul yang Ingin Ditambahkan
                </label>
                <input
                  type="text"
                  value={batchPrefixText}
                  onChange={e => setBatchPrefixText(e.target.value)}
                  placeholder="Contoh: P5M -  atau  SOP -  atau  [Briefing]"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-teal-500 font-mono transition-colors"
                />
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Pilihan Cepat:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['P5M - ', '[P5M] ', 'Safety Talk: ', 'SOP - ', 'IK - ', 'K3: '].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBatchPrefixText(p)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[var(--input-bg)] border border-[var(--border-main)] hover:border-teal-500 text-[var(--text-main)] cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                Awalan di atas akan disematkan di depan judul seluruh <strong>{selectedMateriIds.length}</strong> materi yang telah Anda centang di tabel. Judul yang sudah memiliki awalan tersebut tidak akan digandakan.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-main)]">
                <Button 
                  variant="ghost" 
                  onClick={() => setBatchPrefixModalOpen(false)}
                  className="text-xs h-8 text-[var(--text-muted)]"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleApplyBatchPrefix}
                  disabled={isApplyingBatchPrefix || !batchPrefixText.trim()}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-md cursor-pointer"
                >
                  {isApplyingBatchPrefix ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  )}
                  <span>Terapkan Awalan Judul</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL: PREVIEW FLYER / DOKUMEN IK & SOP ── */}
      {previewImage && (() => {
        const info = getFlyerInfo(previewImage.url, previewImage.title);
        const hasValidUrl = Boolean(previewImage.url && previewImage.url.trim() && previewImage.url !== '#' && previewImage.url !== 'undefined');

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs ${
                    info.isExcel 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : info.isPdf 
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {info.isExcel ? (
                      <FileSpreadsheet className="w-5 h-5" />
                    ) : info.isPdf ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">
                      {previewImage.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {info.isExcel 
                        ? '📊 Dokumen Spreadsheet Excel (.xlsx / .xls)' 
                        : info.isPdf 
                        ? '📄 Dokumen Prosedur Standar (IK / SOP / PDF)' 
                        : '🖼️ Flyer Briefing Keselamatan Kerja'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasValidUrl && info.isPdf && (
                    <button
                      onClick={() => setPdfViewerMode(prev => prev === 'drive' ? 'stream' : 'drive')}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs flex items-center gap-1.5 border border-indigo-200 font-semibold transition-colors"
                      title="Ganti Mode Viewer (Server Stream / Google Drive)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {pdfViewerMode === 'drive' ? 'Mode Stream Server' : 'Mode Google Drive'}
                      </span>
                    </button>
                  )}
                  {hasValidUrl && (
                    <a
                      href={info.viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 font-semibold transition-colors cursor-pointer"
                      title="Buka Stream di Tab Baru"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Buka Tab Baru</span>
                    </a>
                  )}
                  {hasValidUrl && info.driveViewUrl && (
                    <a
                      href={info.driveViewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                      title="Buka Dokumen Asli di Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Drive Asli</span>
                    </a>
                  )}
                  {hasValidUrl && (
                    <a
                      href={info.downloadUrl}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs flex items-center gap-1.5 font-bold shadow-xs transition-colors cursor-pointer"
                      title="Unduh File"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Unduh</span>
                    </a>
                  )}
                  <button 
                    onClick={() => setPreviewImage(null)} 
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-colors font-bold cursor-pointer border border-slate-200"
                    title="Tutup Pratinjau"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Body */}
              <div className="flex-1 bg-slate-100 relative min-h-0 w-full flex flex-col items-center justify-center p-2">
                {hasValidUrl ? (
                  info.isExcel ? (
                    <ExcelViewer 
                      url={info.streamUrl || info.viewUrl} 
                      downloadUrl={info.downloadUrl}
                      title={previewImage.title} 
                    />
                  ) : info.isPdf ? (
                    <iframe 
                      src={pdfViewerMode === 'drive' ? (info.drivePreviewUrl || info.embedUrl) : info.streamUrl} 
                      title={previewImage.title}
                      className="w-full h-full rounded-2xl border border-slate-200 shadow-inner bg-white"
                      allow="autoplay; encrypted-media; fullscreen"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 overflow-auto">
                      <img
                        src={info.imageUrl}
                        alt={previewImage.title}
                        onError={(e) => {
                          if (e.currentTarget.src !== info.streamUrl) {
                            e.currentTarget.src = info.streamUrl;
                          }
                        }}
                        className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center p-8 max-w-md space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Dokumen Belum Dilampirkan</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Belum ada tautan PDF, Excel, atau Flyer Google Drive untuk materi <b>"{previewImage.title}"</b>. Silakan perbarui materi pada menu <b>Bank Materi</b> atau hubungi tim QA.
                    </p>
                    <div className="pt-2">
                      <Button
                        onClick={() => setPreviewImage(null)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs"
                      >
                        Tutup
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 shrink-0">
                <span className="font-mono text-[11px]">
                  {hasValidUrl 
                    ? (info.isExcel
                        ? '📊 Spreadsheet Interactive Viewer: Jelajahi sheet, cari cell, atau unduh file asli via tombol Unduh.'
                        : `💡 Mode: ${pdfViewerMode === 'stream' ? 'Server Stream Langsung (Bebas Hambatan Akses)' : 'Google Drive Embed'}. Jika ada kendala tampilan, gunakan tombol ganti mode di atas.`)
                    : 'Status: Link materi kosong'}
                </span>
                <Button
                  onClick={() => setPreviewImage(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs h-7 px-3 rounded-lg"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

// ============================================================
// HELPER COMPONENT: PRESENTER CARD IN SCHEDULE GRID
// ============================================================
interface PresenterCardProps {
  slot: any;
  isEditMode: boolean;
  karyawanPool: any[];
  day: string;
  shift: string;
  zone: 'day' | 'night' | 'prep' | 'lab' | 'gabungan';
  isDouble: boolean;
  materiList: any[];
  onPreviewImage: (url: string, title: string) => void;
  onUpdatePerson: (person: any) => void;
  onSelectMateri: (materiItem: any) => void;
}

const PresenterCard: React.FC<PresenterCardProps> = ({
  slot,
  isEditMode,
  karyawanPool,
  day,
  shift,
  zone,
  isDouble,
  materiList,
  onPreviewImage,
  onUpdatePerson,
  onSelectMateri
}) => {
  const [selectNameOpen, setSelectNameOpen] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [selectMateriOpen, setSelectMateriOpen] = useState(false);
  const [mSearch, setMSearch] = useState('');
  const [mKatFilter, setMKatFilter] = useState('All');
  const [isCustomText, setIsCustomText] = useState(false);

  // ESC key listener to cancel/close manual edit modals immediately
  useEffect(() => {
    if (!selectNameOpen && !selectMateriOpen && !isCustomText) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        setSelectNameOpen(false);
        setSelectMateriOpen(false);
        setIsCustomText(false);
        setNameSearch('');
        setMSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectNameOpen, selectMateriOpen, isCustomText]);

  const isSpecial = slot.isSenam || slot.isLogbook || slot.materi?.toLowerCase().includes('senam') || slot.materi?.toLowerCase().includes('logbook');

  // Senam slot detection (Pagi atau Malam)
  const isSenamSlot = Boolean(slot.isSenam || slot.kategori === 'Senam' || (slot.materi || '').toLowerCase().includes('senam'));

  // Candidate grouping for this specific day & shift
  const { eligibleCandidates, otherCandidates } = useMemo(() => {
    const el: any[] = [];
    const ot: any[] = [];

    karyawanPool.forEach(k => {
      const jdwl = (k.jadwal?.[day] || '').toUpperCase();
      let shiftMatch = false;
      if (shift === 'pagi' && (['D', 'LS', 'S', 'NONSHIFT'].includes(jdwl) || jdwl.startsWith('D'))) shiftMatch = true;
      if (shift === 'malam' && (jdwl === 'N' || jdwl.startsWith('N'))) shiftMatch = true;

      const matchSearch = !nameSearch || k.nama?.toLowerCase().includes(nameSearch.toLowerCase()) || (k.nik || '').toLowerCase().includes(nameSearch.toLowerCase());

      if (matchSearch) {
        if (shiftMatch) el.push(k);
        else ot.push(k);
      }
    });

    // Khusus slot Senam, prioritaskan personil yang belum pernah senam (0x) paling atas
    if (isSenamSlot) {
      el.sort((a, b) => (a.senamCount || 0) - (b.senamCount || 0));
    }

    return { eligibleCandidates: el, otherCandidates: ot };
  }, [karyawanPool, day, shift, nameSearch, isSenamSlot]);

  const isGabungan = zone === 'gabungan' || HARI_GABUNGAN.has(day);

  // Cari data karyawan presenter jika ada
  const matchedPerson = useMemo(() => {
    if (!slot.nik && !slot.nama) return null;
    return karyawanPool.find(k => (slot.nik && k.nik === slot.nik) || (slot.nama && k.nama === slot.nama));
  }, [karyawanPool, slot.nik, slot.nama]);

  const personDivisi = useMemo(() => {
    const raw = (
      matchedPerson?.divisi || 
      matchedPerson?.departemen || 
      (slot.divisi && slot.divisi !== 'All' ? slot.divisi : (zone === 'prep' ? 'Preparation' : zone === 'lab' ? 'Laboratory' : 'All'))
    ).toLowerCase();
    return raw;
  }, [matchedPerson, slot.divisi, zone]);

  // Tab filter kategori yang relevan untuk sesi & section ini (mencegah tab cross-division)
  const availableTabs = useMemo(() => {
    if (isGabungan) {
      return [
        { key: 'All', label: 'Semua' },
        { key: 'General', label: 'Teknis General' },
        { key: 'Non-Teknis', label: 'Non-Teknis' },
        { key: 'SOP / IK', label: 'SOP & IK' }
      ];
    }
    if (personDivisi.includes('lab')) {
      return [
        { key: 'All', label: 'Semua' },
        { key: 'Laboratory', label: 'Teknis Lab' },
        { key: 'General', label: 'Teknis General' },
        { key: 'Non-Teknis', label: 'Non-Teknis' },
        { key: 'SOP / IK', label: 'SOP & IK' }
      ];
    }
    if (personDivisi.includes('prep')) {
      return [
        { key: 'All', label: 'Semua' },
        { key: 'Preparation', label: 'Teknis Prep' },
        { key: 'General', label: 'Teknis General' },
        { key: 'Non-Teknis', label: 'Non-Teknis' },
        { key: 'SOP / IK', label: 'SOP & IK' }
      ];
    }
    if (personDivisi.includes('maint')) {
      return [
        { key: 'All', label: 'Semua' },
        { key: 'Maintenance', label: 'Teknis Maint' },
        { key: 'General', label: 'Teknis General' },
        { key: 'Non-Teknis', label: 'Non-Teknis' },
        { key: 'SOP / IK', label: 'SOP & IK' }
      ];
    }
    if (personDivisi.includes('ic') || personDivisi.includes('inventory')) {
      return [
        { key: 'All', label: 'Semua' },
        { key: 'IC', label: 'Teknis IC' },
        { key: 'General', label: 'Teknis General' },
        { key: 'Non-Teknis', label: 'Non-Teknis' },
        { key: 'SOP / IK', label: 'SOP & IK' }
      ];
    }
    return [
      { key: 'All', label: 'Semua' },
      { key: 'General', label: 'General' },
      { key: 'Non-Teknis', label: 'Non-Teknis' },
      { key: 'SOP / IK', label: 'SOP & IK' }
    ];
  }, [isGabungan, personDivisi]);

  // Filtered materi list
  const filteredMateriList = useMemo(() => {
    return materiList.filter(m => {
      const judul = m.judul || '';
      const matchSearch = !mSearch || judul.toLowerCase().includes(mSearch.toLowerCase());
      if (!matchSearch) return false;

      // 1. ATURAN HARI GABUNGAN:
      // "ketika materi teknis dipilih di briefing gabungan maka akan otomatis yang terpilih harus teknis general"
      if (isGabungan) {
        if (m.kategori === 'Senam') {
          if (mKatFilter !== 'All' && mKatFilter !== 'Senam') return false;
          return true;
        }
        if (m.kategori === 'Non-Teknis') {
          if (mKatFilter !== 'All' && mKatFilter !== 'Non-Teknis') return false;
          return true;
        }

        // Untuk materi Teknis / SOP: HANYA izinkan General universal
        const isGeneral = (m.subKategori === 'General' || !m.subKategori) && (m.divisi === 'All' || !m.divisi || m.divisi === 'General');
        if (!isGeneral) return false;

        // Blokir topik spesifik section agar tidak bocor ke briefing gabungan
        if (isTopicForbiddenForSection(judul, 'lab') || isTopicForbiddenForSection(judul, 'prep')) return false;

        if (mKatFilter === 'Non-Teknis') return false;
        if (mKatFilter === 'Senam') return false;
        if (mKatFilter === 'SOP / IK') {
          const j = judul.toLowerCase();
          return /\b(sop|ik)\b|instruksi kerja/i.test(j) || j.startsWith('sop') || j.startsWith('ik ');
        }
        return true;
      }

      // 2. ATURAN SESI SPLIT:
      // "jangan biarkan juga ada pemilihan materi yang cross division contoh personil lab mendapatkan materi pengelasan yang khusus maintenance atau mendapatkan JSA inventory control dimana itu khusus section inventory"
      if (isTopicForbiddenForSection(judul, personDivisi)) return false;

      // Filter sub-kategori/divisi materi agar tidak cross-division
      const sub = (m.subKategori || '').toLowerCase();
      const mDiv = (m.divisi || '').toLowerCase();

      if (personDivisi.includes('lab')) {
        if (sub === 'preparation' || sub === 'maintenance' || sub === 'ic' ||
            mDiv === 'preparation' || mDiv === 'maintenance' || mDiv === 'ic') {
          return false;
        }
      } else if (personDivisi.includes('prep')) {
        if (sub === 'laboratory' || sub === 'maintenance' || sub === 'ic' ||
            mDiv === 'laboratory' || mDiv === 'maintenance' || mDiv === 'ic') {
          return false;
        }
      } else if (personDivisi.includes('maint')) {
        if (sub === 'laboratory' || sub === 'preparation' || sub === 'ic' ||
            mDiv === 'laboratory' || mDiv === 'preparation' || mDiv === 'ic') {
          return false;
        }
      } else if (personDivisi.includes('ic') || personDivisi.includes('inventory')) {
        if (sub === 'laboratory' || sub === 'preparation' || sub === 'maintenance' ||
            mDiv === 'laboratory' || mDiv === 'preparation' || mDiv === 'maintenance') {
          return false;
        }
      }

      if (mKatFilter === 'All') return true;
      if (mKatFilter === 'SOP / IK') {
        const j = judul.toLowerCase();
        return /\b(sop|ik)\b|instruksi kerja/i.test(j) || j.startsWith('sop') || j.startsWith('ik ') || j.includes('sop') || j.includes('ik -');
      }
      if (mKatFilter === 'Senam') return m.kategori === 'Senam';
      if (mKatFilter === 'Non-Teknis') return m.kategori === 'Non-Teknis';
      if (mKatFilter === 'General') return m.subKategori === 'General';
      if (mKatFilter === 'Preparation') return m.subKategori === 'Preparation' || m.divisi === 'Preparation';
      if (mKatFilter === 'Laboratory') return m.subKategori === 'Laboratory' || m.divisi === 'Laboratory';
      if (mKatFilter === 'Maintenance') return m.subKategori === 'Maintenance' || m.divisi === 'Maintenance';
      if (mKatFilter === 'IC') return m.subKategori === 'IC' || m.divisi === 'IC';

      return m.kategori === mKatFilter || m.subKategori === mKatFilter;
    });
  }, [materiList, mSearch, mKatFilter, isGabungan, personDivisi]);

  const isEmptySDM = !slot.nama || slot.nama.includes('KOSONG');

  // Determine card base theme based on session / zone
  let cardStyle = 'bg-white text-slate-900 shadow-xs transition-all';
  if (isEmptySDM) {
    cardStyle += ' bg-rose-50 border-2 border-rose-300 text-rose-800';
  } else {
    if (zone === 'prep') {
      cardStyle += ' border-2 border-orange-300 hover:border-orange-500 hover:ring-2 hover:ring-orange-200/80 bg-white';
    } else if (zone === 'lab') {
      cardStyle += ' border-2 border-emerald-300 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-200/80 bg-white';
    } else if (zone === 'gabungan' || zone === 'day') {
      cardStyle += ' border-2 border-amber-300 hover:border-amber-500 hover:ring-2 hover:ring-amber-200/80 bg-white';
    } else {
      cardStyle += ' border-2 border-indigo-300 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-200/80 bg-white';
    }
  }

  const isNight = shift === 'malam';
  const isRightEdge = day === 'Sabtu' || day === 'Minggu' || day === 'Jumat';
  const popupPlacementClass = `${isNight ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${isRightEdge ? 'right-0' : 'left-0'}`;

  return (
    <div className={`p-2 rounded-xl transition-all text-xs flex flex-col justify-between gap-1 ${cardStyle} ${selectNameOpen || selectMateriOpen ? 'z-40 relative' : ''}`}>
      {/* Backdrop for click outside */}
      {(selectNameOpen || selectMateriOpen) && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[0.5px] cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            setSelectNameOpen(false);
            setSelectMateriOpen(false);
            setNameSearch('');
            setMSearch('');
          }} 
        />
      )}

      {/* Presenter Name (Editable or Static) */}
      <div className={`relative ${selectNameOpen ? 'z-50' : ''}`}>
        {isEditMode ? (
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectNameOpen(!selectNameOpen);
                setSelectMateriOpen(false);
              }}
              className="w-full text-left font-bold text-xs flex items-center justify-between bg-white border border-slate-300 rounded px-1.5 py-0.5 hover:border-amber-500 shadow-xs"
            >
              <span className="truncate">{slot.nama || '— Pilih SDM —'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0 ml-1" />
            </button>

            {selectNameOpen && (
              <div className={`absolute z-50 ${popupPlacementClass} w-64 bg-white border border-slate-200 text-slate-800 rounded-xl shadow-2xl p-2 space-y-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100`}>
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-1 font-bold text-[11px] text-slate-800">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pilih Personil</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectNameOpen(false);
                      setNameSearch('');
                    }}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                    title="Batal / Tutup (Esc)"
                  >
                    <X className="w-3 h-3" />
                    <span>Batal (Esc)</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Cari personil / NIK... (Esc utk batal)"
                  value={nameSearch}
                  onChange={e => setNameSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-amber-500 mb-1"
                  autoFocus
                />

                <div className="text-[10px] font-bold font-mono text-emerald-700 px-1 py-0.5 border-b border-slate-100 flex items-center justify-between">
                  <span>{isSenamSlot ? `Kandidat Senam ${shift === 'malam' ? 'Malam' : 'Pagi'}` : 'Shift Sesuai'} ({eligibleCandidates.length})</span>
                  {isSenamSlot && (
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                      Prioritas 0×
                    </span>
                  )}
                </div>
                {eligibleCandidates.map(c => (
                  <button
                    key={c.nik || c.nama}
                    type="button"
                    onClick={() => {
                      onUpdatePerson(c);
                      setSelectNameOpen(false);
                      setNameSearch('');
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-slate-100 flex items-center justify-between transition-colors ${
                      slot.nik === c.nik ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-semibold truncate">{c.nama}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{c.kelas || ''} • {c.divisi || ''}</span>
                    </div>
                    {isSenamSlot ? (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        (c.senamCount || 0) === 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {(c.senamCount || 0) === 0 ? '0× (Belum)' : `${c.senamCount}×`}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">{c.kelas || ''} ({c.pt})</span>
                    )}
                  </button>
                ))}

                {otherCandidates.length > 0 && (
                  <>
                    <div className="text-[10px] font-bold font-mono text-slate-500 px-1 pt-1.5 border-t border-slate-200">
                      Personil Shift Lain / Off ({otherCandidates.length})
                    </div>
                    {otherCandidates.slice(0, 15).map(c => (
                      <button
                        key={c.nik || c.nama}
                        type="button"
                        onClick={() => {
                          onUpdatePerson(c);
                          setSelectNameOpen(false);
                          setNameSearch('');
                        }}
                        className="w-full text-left px-2 py-1 rounded text-[10px] text-slate-600 hover:bg-slate-100 flex items-center justify-between"
                      >
                        <span className="truncate pr-2">{c.nama}</span>
                        <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">({c.jadwal?.[day] || 'Off'})</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-1 min-w-0">
            <span 
              className={`font-bold text-[11px] leading-snug break-words ${isEmptySDM ? 'text-rose-600 italic' : 'text-slate-900'}`}
              title={slot.nama}
            >
              {slot.nama || '— Tidak Ada SDM —'}
            </span>
            {isDouble && (
              <span className="px-1.5 py-0.2 bg-teal-50 text-teal-800 border border-teal-200 font-black text-[9px] rounded font-mono shadow-xs shrink-0 mt-0.5">
                2×
              </span>
            )}
          </div>
        )}
      </div>

      {/* Topic Title (Interactive Materi Picker or Direct Text) */}
      <div className={`relative mt-0.5 ${selectMateriOpen ? 'z-50' : ''}`}>
        {isEditMode ? (
          <div>
            {isCustomText ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={slot.materi || ''}
                  onChange={e => onSelectMateri(e.target.value)}
                  placeholder="Ketik judul materi... (Esc utk batal)"
                  className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 outline-none focus:border-amber-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomText(false)}
                  className="px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-mono border"
                  title="Pilih dari database materi (Esc)"
                >
                  List
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectMateriOpen(!selectMateriOpen);
                    setSelectNameOpen(false);
                  }}
                  className="w-full text-left bg-white border border-slate-300 hover:border-amber-500 rounded px-1.5 py-0.5 text-[11px] text-slate-800 font-medium flex items-center justify-between gap-1 shadow-xs"
                >
                  <span className="truncate">{slot.materi || '— Pilih Topik Materi —'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </button>

                {selectMateriOpen && (
                  <div className={`absolute z-50 ${popupPlacementClass} w-72 sm:w-80 bg-white border border-slate-200 text-slate-800 rounded-xl shadow-2xl p-2 space-y-1.5 max-h-64 sm:max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100`}>
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <div className="flex items-center gap-1 font-bold text-[11px] text-slate-800">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pilih Materi Briefing</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectMateriOpen(false);
                          setMSearch('');
                        }}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                        title="Batal / Tutup (Esc)"
                      >
                        <X className="w-3 h-3" />
                        <span>Batal (Esc)</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Cari materi briefing... (Esc utk batal)"
                      value={mSearch}
                      onChange={e => setMSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-amber-500"
                      autoFocus
                    />

                    {/* Filter Category Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[9px] font-mono scrollbar-none">
                      {availableTabs.map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setMKatFilter(tab.key)}
                          className={`px-1.5 py-0.5 rounded-md flex-shrink-0 transition-colors ${
                            mKatFilter === tab.key
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Standard Routine Actions */}
                    <div className={`grid ${shift === 'pagi' ? 'grid-cols-2' : 'grid-cols-1'} gap-1 border-b border-slate-100 pb-1.5`}>
                      {shift === 'pagi' && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMateri({ judul: 'Senam Bersama', kategori: 'Senam', subKategori: 'General' });
                            setSelectMateriOpen(false);
                          }}
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-[10px] font-bold text-center"
                        >
                          🤸 Senam Bersama
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMateri({ judul: 'Logbook & Evaluasi', kategori: 'Teknis', subKategori: 'General' });
                          setSelectMateriOpen(false);
                        }}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold text-center"
                      >
                        📋 Logbook & Evaluasi
                      </button>
                    </div>

                    {/* List Items from Database */}
                    <div className="space-y-1">
                      {filteredMateriList.length === 0 ? (
                        <div className="text-[10px] text-slate-500 py-3 text-center">
                          Tidak ada materi yang sesuai
                        </div>
                      ) : (
                        filteredMateriList.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectMateri(item);
                              setSelectMateriOpen(false);
                              setMSearch('');
                            }}
                            className={`w-full text-left p-1.5 rounded-lg hover:bg-slate-50 flex flex-col gap-0.5 transition-colors border ${
                              slot.materi === item.judul
                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                : 'border-transparent text-slate-700'
                            }`}
                          >
                            <span className="font-semibold text-[11px] leading-snug line-clamp-2">
                              {item.judul}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
                              <span className={`px-1 rounded ${item.kategori === 'Teknis' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                                {item.kategori}
                              </span>
                              {item.subKategori && item.subKategori !== 'General' && (
                                <span className="text-slate-500">
                                  • {item.subKategori}
                                </span>
                              )}
                              {item.fileUrl && (
                                <span className="text-amber-600 flex items-center gap-0.5 ml-auto font-semibold">
                                  <ImageIcon className="w-2.5 h-2.5" /> Flyer
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Switch to custom text */}
                    <div className="border-t border-slate-800 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomText(true);
                          setSelectMateriOpen(false);
                        }}
                        className="w-full text-center py-1 text-[10px] font-semibold text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        ✍️ Ketik Judul Bebas / Manual
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-0.5">
            <p className="text-[10.5px] text-slate-800 leading-snug font-medium break-words">
              {slot.materi || '— Materi Standar —'}
            </p>
          </div>
        )}
      </div>

      {/* Badges / Tags */}
      <div className="flex items-center justify-between gap-1 flex-wrap mt-0.5">
        <div className="flex items-center gap-1 flex-wrap">
          {slot.kategori && slot.kategori !== 'All' && (
            <span className={`text-[8px] font-bold font-mono px-1.5 py-0.2 rounded uppercase ${
              slot.kategori === 'Teknis' 
                ? 'bg-slate-100 text-slate-700 border border-slate-300/80' 
                : slot.kategori === 'Senam'
                ? 'bg-purple-100 text-purple-800 border border-purple-300/60'
                : 'bg-blue-100 text-blue-800 border border-blue-300/60'
            }`}>
              {slot.kategori}
            </span>
          )}
          {slot.subKategori && slot.subKategori !== 'General' && (
            <span className={`text-[8px] font-bold font-mono px-1.5 py-0.2 rounded ${
              slot.subKategori === 'Preparation'
                ? 'bg-orange-100 text-orange-800 border border-orange-300 font-bold'
                : slot.subKategori === 'Laboratory'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                : slot.subKategori === 'Maintenance'
                ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                : 'bg-slate-100 text-slate-800 border border-slate-300 font-bold'
            }`}>
              {slot.subKategori}
            </span>
          )}
          {slot.isFallback && (
            <span className="text-[8px] font-bold font-mono px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded">
              Fallback
            </span>
          )}
          {isSpecial && slot.kategori !== 'Senam' && (
            <span className="text-[8px] font-bold font-mono px-1.5 py-0.2 bg-purple-100 text-purple-800 border border-purple-300/60 rounded uppercase">
              {slot.isLogbook ? 'Logbook' : 'Senam'}
            </span>
          )}
          {shift === 'malam' && slot.isManualEdited && (
            <span className="text-[8px] font-bold font-mono px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded" title="Materi diedit manual di shift malam">
              Manual Malam
            </span>
          )}
          {shift === 'malam' && !slot.isManualEdited && slot.materi && (
            <span className="text-[8px] font-medium font-mono px-1 py-0.2 text-emerald-700 bg-emerald-50 rounded border border-emerald-200" title="Materi otomatis disinkronkan dari shift pagi">
              🔗 Sync Pagi
            </span>
          )}
        </div>

        {slot.fileUrl && (() => {
          const isPdf = slot.fileUrl.toLowerCase().includes('.pdf') || (slot.materi && (/\b(sop|ik)\b|instruksi kerja/i.test(slot.materi) || slot.materi.startsWith('IK ') || slot.materi.startsWith('SOP ')));
          return (
            <button
              type="button"
              onClick={() => onPreviewImage(slot.fileUrl, slot.materi)}
              className={`text-[9px] font-bold flex items-center gap-0.5 ml-auto flex-shrink-0 ${
                isPdf ? 'text-orange-700 hover:text-orange-900' : 'text-amber-700 hover:text-amber-900'
              }`}
              title={isPdf ? "Lihat Dokumen IK / SOP" : "Lihat Flyer Materi"}
            >
              {isPdf ? <FileText className="w-3 h-3 text-orange-600" /> : <ImageIcon className="w-3 h-3 text-amber-600" />}
            </button>
          );
        })()}
      </div>
    </div>
  );
};

// ============================================================
// HELPER COMPONENT: SLOT LIST EDITOR INSIDE DRAWER
interface SlotListEditorProps {
  slots: any[];
  onChange: (newSlots: any[]) => void;
  allowedSections?: { value: string; label: string }[];
}

const SlotListEditor: React.FC<SlotListEditorProps> = ({ slots, onChange, allowedSections }) => {
  const handleAdd = () => {
    onChange([...slots, { divisi: 'All', kelas: 'All', kategori: 'Teknis' }]);
  };

  const handleRemove = (idx: number) => {
    if (slots.length <= 1) return;
    onChange(slots.filter((_, i) => i !== idx));
  };

  const handleUpdate = (idx: number, field: string, val: any) => {
    const copy = [...slots];
    copy[idx] = { ...copy[idx], [field]: val };
    onChange(copy);
  };

  const sectionOptions = allowedSections || DIVISI_OPTIONS;

  return (
    <div className="space-y-2">
      {slots.map((sl, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2 shadow-xs">
          {/* Top Bar: Slot label, Category selector & Delete */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <span className="text-[11px] font-bold text-slate-800">Slot {i + 1}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={sl.kategori || 'Teknis'}
                onChange={e => handleUpdate(i, 'kategori', e.target.value)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                  sl.kategori === 'Senam'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : sl.kategori === 'SOP / IK'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : sl.kategori === 'Non-Teknis'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
                title="Pilih Kategori Materi"
              >
                <option value="Teknis">Teknis</option>
                <option value="SOP / IK">SOP &amp; IK</option>
                <option value="Non-Teknis">Non-Teknis</option>
                <option value="Senam">Senam</option>
              </select>

              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                  title="Hapus slot ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Grid: Section & Level Selector */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase font-mono font-bold text-slate-500 block mb-1">
                Section
              </label>
              <select
                value={sl.divisi || 'All'}
                onChange={e => handleUpdate(i, 'divisi', e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2 py-1.5 outline-none text-[11px] font-semibold truncate hover:border-slate-400 focus:border-amber-500"
                title="Pilih Target Section"
              >
                {sectionOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] uppercase font-mono font-bold text-slate-500 block mb-1">
                Level Jabatan
              </label>
              <select
                value={sl.kelas || 'All'}
                onChange={e => handleUpdate(i, 'kelas', e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2 py-1.5 outline-none text-[11px] font-medium truncate hover:border-slate-400 focus:border-amber-500"
                title="Pilih Target Level Jabatan"
              >
                {KELAS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full text-center text-[11px] text-amber-700 hover:text-amber-800 py-1.5 border border-dashed border-amber-300 rounded-xl bg-amber-50/50 hover:bg-amber-100/60 transition-colors flex items-center justify-center gap-1.5 font-bold"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah Slot
      </button>
    </div>
  );
};


