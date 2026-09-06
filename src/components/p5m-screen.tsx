import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, Shuffle, Edit3, Download, Save, Plus, Trash2, 
  RotateCcw, Check, AlertCircle, AlertTriangle, ChevronDown, ChevronRight, 
  BookOpen, History, Users, Sparkles, Filter, Search, X, Layers,
  ChevronLeft, ArrowRight, ArrowLeft, Shield, ShieldAlert, Award, CheckCircle2, FileText,
  Briefcase, Loader2, Star, Eye, RefreshCw, Image as ImageIcon, ExternalLink,
  Building2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Card, Button, Input } from './ui';
import { toast } from 'sonner';
import { getFlyerInfo } from '../lib/p5m-flyer';

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
        slot('Preparation', 'SPV', 'Non-Teknis'),
        slot('Laboratory', 'SPV', 'Teknis'),
        slot('Administration', 'Admin', 'Teknis')
      ]
    },
    malam: {
      gabungan: [
        slot('Preparation', 'SPV', 'Non-Teknis'),
        slot('Laboratory', 'SPV', 'Teknis'),
        slot('All', 'Foreman/Officer', 'Teknis')
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
        slot('All', 'SPV', 'Non-Teknis'),
        slot('All', 'SPV', 'Teknis'),
        slot('All', 'All', 'Teknis')
      ]
    },
    malam: {
      gabungan: [
        slot('All', 'SPV', 'Non-Teknis'),
        slot('All', 'Foreman/Officer', 'Teknis'),
        slot('All', 'All', 'Teknis')
      ]
    }
  };

  // JUMAT (Gabungan)
  cfg['Jumat'] = {
    pagi: {
      gabungan: [
        slot('All', 'SPV', 'Senam'),
        slot('All', 'SPV', 'Teknis'),
        slot('All', 'All', 'Teknis')
      ]
    },
    malam: {
      gabungan: [
        slot('All', 'SPV', 'Teknis'),
        slot('All', 'SPV', 'Teknis'),
        slot('All', 'All', 'Teknis')
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
        slot('All', 'All', 'Teknis')
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

  // Week selection state
  const [targetDateStr, setTargetDateStr] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [datesMeta, setDatesMeta] = useState<Record<string, { iso: string; display: string }>>({});

  // Employee Pool State
  const [karyawanPool, setKaryawanPool] = useState<any[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);

  // Config State
  const [uiConfig, setUiConfig] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('p5m_ui_config_v4');
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

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

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
    if (currentNik === '02D25000055' || currentNik === '02D24000043' || currentNik === 'preplabadmin') return true;
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
            assignments.push({
              day,
              dateFormatted: datesMeta[day]?.display || day,
              shift: shift as 'pagi' | 'malam',
              shiftLabel: shift === 'pagi' ? 'Day Shift (Pagi)' : 'Night Shift (Malam)',
              location: locKey,
              locationLabel: locLabel,
              materi: slot.materi || 'Materi Briefing P5M',
              kategori: slot.kategori || 'Teknis',
              subKategori: slot.subKategori || 'General',
              fileUrl: slot.fileUrl || null,
              isSenam: Boolean(slot.isSenam),
              isLogbook: Boolean(slot.isLogbook)
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
  }, [scheduleData, currentNik, currentName, datesMeta]);

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
    fetchLatestSchedule();
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

  const fetchLatestSchedule = async () => {
    try {
      const res = await fetch('/api/p5m/schedules/latest');
      const data = await res.json();
      if (data.success && data.data) {
        setScheduleData(data.data.scheduleData || null);
        setActiveScheduleId(data.data.id || null);
        if (data.data.config) setUiConfig(data.data.config);
        if (data.data.dateStart) setTargetDateStr(data.data.dateStart);
      }
    } catch (err) {
      console.error('Failed to fetch latest schedule:', err);
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
        if (typeof materiItem === 'string') {
          targetArray[index].materi = materiItem;
          targetArray[index].isSenam = materiItem.toLowerCase().includes('senam');
          targetArray[index].isLogbook = materiItem.toLowerCase().includes('logbook');
        } else {
          targetArray[index].materi = materiItem.judul || '';
          targetArray[index].kategori = materiItem.kategori || 'Teknis';
          targetArray[index].subKategori = materiItem.subKategori || 'General';
          targetArray[index].fileUrl = materiItem.fileUrl || null;
          targetArray[index].materiId = materiItem.id || null;
          targetArray[index].isSenam = materiItem.kategori === 'Senam' || (materiItem.judul || '').toLowerCase().includes('senam');
          targetArray[index].isLogbook = (materiItem.judul || '').toLowerCase().includes('logbook');
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

  // Filtered materi list
  const filteredMateri = useMemo(() => {
    return materiList.filter(m => {
      const matchSearch = m.judul?.toLowerCase().includes(materiSearch.toLowerCase());
      const matchKat = materiFilterKat === 'All' || m.kategori === materiFilterKat;
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
                setTargetDateStr(e.target.value);
                fetchPoolAndDates(e.target.value, selectedPt);
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

            {isQATeam && (
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
            )}

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
                onClick={handleDownloadPNG}
                disabled={!scheduleData || isExporting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 flex-1 sm:flex-initial"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Download className="w-4 h-4 text-white" />
                )}
                <span>Unduh Keseluruhan Jadwal (PNG)</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowFullSchedulePreview(!showFullSchedulePreview)}
                className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 text-xs h-10 px-3.5 rounded-xl"
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

                    {/* Action button: Flyer / Materi download */}
                    <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <a
                        href={`/api/p5m/flyer?download=true&title=${encodeURIComponent(ass.materi)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Unduh Materi / Flyer Briefing</span>
                      </a>

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
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg)] border border-[var(--border-main)] p-3 rounded-2xl shadow-md text-[var(--text-main)]">
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  onClick={handleRandomize} 
                  disabled={isGenerating}
                  className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg"
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
                  className={`text-xs h-9 px-3.5 rounded-xl border transition-all ${
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
                  className={`text-xs h-9 px-3.5 rounded-xl border transition-all ${
                    showConfigDrawer 
                      ? 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/40 font-bold' 
                      : 'bg-[var(--input-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Layers className="w-4 h-4 mr-1.5 text-[var(--primary)]" />
                  <span>Konfigurasi Slot Hari</span>
                  <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showConfigDrawer ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleDownloadPNG}
                  disabled={!scheduleData || isExporting}
                  className="bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--bg-main)] text-xs h-9 px-3.5 rounded-xl shadow-sm"
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-emerald-600/20"
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
                    <div key={day} className="bg-slate-900/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
                      <div 
                        onClick={() => {
                          const next = new Set(openDays);
                          next.has(day) ? next.delete(day) : next.add(day);
                          setOpenDays(next);
                        }}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/80 transition-colors select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DAY_COLORS[day] }} />
                          <span className="font-bold text-xs text-slate-200">{day}</span>
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                            isG ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {isG ? 'Gabungan' : 'Split'}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </div>

                      {isOpen && (
                        <div className="p-3 border-t border-slate-700/60 bg-slate-950/40 space-y-3 text-xs">
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
                                  setUiConfig(prev => ({
                                    ...prev,
                                    [day]: { ...prev[day], pagi: { ...prev[day].pagi, gabungan: newSlots } }
                                  }));
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
                                      setUiConfig(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], pagi: { ...prev[day].pagi, preparasi: newSlots } }
                                      }));
                                    }}
                                  />
                                </div>
                                <div className="p-1.5 bg-teal-950/20 border border-teal-800/30 rounded-lg">
                                  <span className="text-[10px] text-teal-400 font-semibold block mb-1">Laboratorium (Lab, QA, Admin, IC):</span>
                                  <SlotListEditor 
                                    slots={dayCfg.pagi?.laboratorium || []} 
                                    allowedSections={LABORATORY_GROUP_OPTIONS}
                                    onChange={(newSlots) => {
                                      setUiConfig(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], pagi: { ...prev[day].pagi, laboratorium: newSlots } }
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Night Shift Slots (except Sunday) */}
                          {day !== 'Minggu' && (
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block mb-1.5">
                                🌙 Night Shift (Malam)
                              </span>
                              {isG ? (
                                <SlotListEditor 
                                  slots={dayCfg.malam?.gabungan || []} 
                                  allowedSections={DIVISI_OPTIONS}
                                  onChange={(newSlots) => {
                                    setUiConfig(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], malam: { ...prev[day].malam, gabungan: newSlots } }
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
                                          [day]: { ...prev[day], malam: { ...prev[day].malam, preparasi: newSlots } }
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
                                          [day]: { ...prev[day], malam: { ...prev[day].malam, laboratorium: newSlots } }
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
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Pemberitahuan Daur Ulang Materi Briefing</span>
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
                  className="w-full overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-700 rounded-2xl touch-pan-x cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: 'pan-x pan-y' }}
                >
                  <div 
                    className={`bg-[var(--card-bg)] text-[var(--text-main)] rounded-2xl overflow-hidden shadow-xl border border-[var(--border-main)] transition-all ${
                      selectedDayFilter === 'ALL' ? 'min-w-[1100px]' : 'w-full min-w-0'
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
                    <div id={`p5m-col-${day}`} key={day} className={`flex flex-col ${selectedDayFilter === 'ALL' ? 'min-w-[145px]' : 'w-full'}`}>
                      
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
            </div>
          </div>

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
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Judul Materi Briefing</th>
                      <th className="py-3 px-4 w-28">Kategori</th>
                      <th className="py-3 px-4 w-40">Sub-Kategori</th>
                      <th className="py-3 px-4 w-28 text-center">File / Flyer</th>
                      <th className="py-3 px-4 w-36">Terakhir Digunakan</th>
                      <th className="py-3 px-4 w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                    {filteredMateri.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[var(--input-bg)] transition-colors">
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
                            const isPdf = item.fileUrl.toLowerCase().includes('.pdf') || (item.judul && (item.judul.startsWith('IK ') || item.judul.startsWith('SOP ')));
                            return (
                              <button
                                onClick={() => setPreviewImage({ url: item.fileUrl, title: item.judul })}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto border transition-colors ${
                                  isPdf 
                                    ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' 
                                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {isPdf ? <FileText className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                <span>{isPdf ? 'Dokumen' : 'Flyer'}</span>
                              </button>
                            );
                          })() : (
                            <span className="text-[var(--text-muted)] font-mono text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-muted)] text-[11px]">
                          {item.lastUsed ? new Date(item.lastUsed).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '— Belum pernah'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
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
                              className="p-1.5 text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--input-bg)] rounded-lg transition-colors"
                              title="Edit Materi"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMateri(item.id)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--input-bg)] rounded-lg transition-colors"
                              title="Hapus Materi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
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
                          if (arch.dateStart) setTargetDateStr(arch.dateStart);
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
                <label className="block text-[var(--text-main)] font-semibold mb-1">Judul Materi / Topik Briefing *</label>
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

              {/* Upload Flyer / Poster */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[var(--text-main)] font-semibold">Upload Gambar / Flyer Materi (Google Drive &amp; Cloud Storage)</label>
                
                {formImagePreview || editingMateri?.fileUrl ? (
                  <div className="relative rounded-xl border border-emerald-500/40 bg-[var(--input-bg)] p-2 flex items-center gap-3">
                    <img 
                      src={formImagePreview || editingMateri?.fileUrl} 
                      alt="Flyer Preview" 
                      className="w-16 h-16 object-cover rounded-lg border border-[var(--border-main)] bg-[var(--card-bg)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[var(--text-main)] truncate">
                        {formImageFilename || 'Flyer Terlampir'}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        {formImagePreview ? 'File baru siap diunggah' : 'File tersimpan di Google Drive'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageBase64(null);
                        setFormImagePreview(null);
                        setFormImageFilename('');
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Hapus gambar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[var(--border-main)] hover:border-amber-500/60 bg-[var(--input-bg)] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <ImageIcon className="w-7 h-7 text-[var(--text-muted)] mb-1" />
                    <span className="text-xs text-[var(--text-main)] font-medium">Klik untuk memilih file flyer (PNG/JPG)</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Maksimal 10MB • Akan disimpan ke Google Drive</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('Ukuran file maksimal 10MB');
                            return;
                          }
                          setFormImageFilename(file.name);
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const res = evt.target?.result as string;
                            setFormImageBase64(res);
                            setFormImagePreview(res);
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

      {/* ── MODAL: PREVIEW FLYER / DOKUMEN IK & SOP ── */}
      {previewImage && (() => {
        const info = getFlyerInfo(previewImage.url, previewImage.title);
        const hasValidUrl = Boolean(previewImage.url && previewImage.url.trim() && previewImage.url !== '#' && previewImage.url !== 'undefined');

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">
                      {previewImage.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {info.isPdf ? '📄 Dokumen Prosedur Standar (IK / SOP / PDF)' : '🖼️ Flyer Briefing Keselamatan Kerja'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasValidUrl && (
                    <a
                      href={info.viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 font-semibold transition-colors"
                      title="Buka di Tab Baru"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Buka Tab Baru</span>
                    </a>
                  )}
                  {hasValidUrl && (
                    <a
                      href={info.downloadUrl}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs flex items-center gap-1.5 font-bold shadow-md shadow-emerald-950 transition-colors"
                      title="Unduh File"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Unduh</span>
                    </a>
                  )}
                  <button 
                    onClick={() => setPreviewImage(null)} 
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors font-bold"
                    title="Tutup Pratinjau"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Body */}
              <div className="flex-1 bg-slate-950 relative min-h-0 w-full flex flex-col items-center justify-center p-2">
                {hasValidUrl ? (
                  <iframe 
                    src={info.embedUrl} 
                    title={previewImage.title}
                    className="w-full h-full rounded-2xl border border-slate-800 shadow-inner bg-slate-900"
                    allow="autoplay; encrypted-media; fullscreen"
                  />
                ) : (
                  <div className="text-center p-8 max-w-md space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Dokumen Belum Dilampirkan</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Belum ada tautan PDF atau Flyer Google Drive untuk materi <b>"{previewImage.title}"</b>. Silakan perbarui materi pada menu <b>Kelola Materi P5M</b> atau hubungi tim QA.
                    </p>
                    <div className="pt-2">
                      <Button
                        onClick={() => setPreviewImage(null)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-4 rounded-xl shadow-md"
                      >
                        Tutup
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <span className="font-mono text-[11px]">
                  {hasValidUrl ? '💡 Tip: Gunakan tombol zoom dan navigasi di dalam viewer untuk melihat detail dokumen.' : 'Status: Link materi kosong'}
                </span>
                <Button
                  onClick={() => setPreviewImage(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs h-7 px-3 rounded-lg"
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

  const isSpecial = slot.isSenam || slot.isLogbook || slot.materi?.toLowerCase().includes('senam') || slot.materi?.toLowerCase().includes('logbook');

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

    return { eligibleCandidates: el, otherCandidates: ot };
  }, [karyawanPool, day, shift, nameSearch]);

  // Filtered materi list
  const filteredMateriList = useMemo(() => {
    return materiList.filter(m => {
      const matchSearch = !mSearch || m.judul?.toLowerCase().includes(mSearch.toLowerCase());
      if (!matchSearch) return false;

      if (mKatFilter === 'All') return true;
      if (mKatFilter === 'SOP / IK') {
        const j = (m.judul || '').toLowerCase();
        return j.startsWith('sop') || j.startsWith('ik ') || j.includes('sop') || j.includes('ik -') || j.includes('instruksi kerja');
      }
      if (mKatFilter === 'Senam') return m.kategori === 'Senam';
      if (mKatFilter === 'Non-Teknis') return m.kategori === 'Non-Teknis';
      if (mKatFilter === 'General') return m.subKategori === 'General';
      if (mKatFilter === 'Preparation') return m.subKategori === 'Preparation' || m.divisi === 'Preparation' || (m.judul || '').toLowerCase().includes('prep');
      if (mKatFilter === 'Laboratory') return m.subKategori === 'Laboratory' || m.divisi === 'Laboratory' || (m.judul || '').toLowerCase().includes('lab');

      return m.kategori === mKatFilter || m.subKategori === mKatFilter;
    });
  }, [materiList, mSearch, mKatFilter]);

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

  return (
    <div className={`p-2 rounded-xl transition-all text-xs flex flex-col justify-between gap-1 ${cardStyle}`}>
      {/* Presenter Name (Editable or Static) */}
      <div className="relative">
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
              <div className="absolute z-50 left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-2 space-y-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                <input
                  type="text"
                  placeholder="Cari personil / NIK..."
                  value={nameSearch}
                  onChange={e => setNameSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-amber-500 mb-1"
                  autoFocus
                />

                <div className="text-[10px] font-bold font-mono text-emerald-400 px-1 py-0.5 border-b border-slate-800 flex items-center justify-between">
                  <span>Shift Sesuai ({eligibleCandidates.length})</span>
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
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-slate-800 flex items-center justify-between transition-colors ${
                      slot.nik === c.nik ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-200'
                    }`}
                  >
                    <span className="font-semibold truncate pr-2">{c.nama}</span>
                    <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">{c.kelas || ''} ({c.pt})</span>
                  </button>
                ))}

                {otherCandidates.length > 0 && (
                  <>
                    <div className="text-[10px] font-bold font-mono text-slate-500 px-1 pt-1.5 border-t border-slate-800">
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
                        className="w-full text-left px-2 py-1 rounded text-[10px] text-slate-400 hover:bg-slate-800 flex items-center justify-between"
                      >
                        <span className="truncate pr-2">{c.nama}</span>
                        <span className="text-[9px] font-mono text-slate-500 flex-shrink-0">({c.jadwal?.[day] || 'Off'})</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span 
              className={`font-black text-xs truncate ${isEmptySDM ? 'text-rose-600 italic' : 'text-slate-900'}`}
              title={slot.nama}
            >
              {slot.nama || '— Tidak Ada SDM —'}
            </span>
            {isDouble && (
              <span className="px-1.5 py-0.2 bg-slate-900 text-white font-black text-[9px] rounded font-mono shadow-sm flex-shrink-0">
                2×
              </span>
            )}
          </div>
        )}
      </div>

      {/* Topic Title (Interactive Materi Picker or Direct Text) */}
      <div className="relative mt-0.5">
        {isEditMode ? (
          <div>
            {isCustomText ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={slot.materi || ''}
                  onChange={e => onSelectMateri(e.target.value)}
                  placeholder="Ketik judul materi..."
                  className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 outline-none focus:border-amber-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomText(false)}
                  className="px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-mono border"
                  title="Pilih dari database materi"
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
                  <div className="absolute z-50 left-0 top-full mt-1 w-72 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-2 space-y-1.5 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <input
                      type="text"
                      placeholder="Cari materi briefing..."
                      value={mSearch}
                      onChange={e => setMSearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-amber-500"
                      autoFocus
                    />

                    {/* Filter Category Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[9px] font-mono scrollbar-none">
                      {['All', 'SOP / IK', 'Preparation', 'Laboratory', 'General', 'Non-Teknis'].map(kat => (
                        <button
                          key={kat}
                          type="button"
                          onClick={() => setMKatFilter(kat)}
                          className={`px-1.5 py-0.5 rounded-md flex-shrink-0 transition-colors ${
                            mKatFilter === kat
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {kat === 'All' ? 'Semua' : kat}
                        </button>
                      ))}
                    </div>

                    {/* Standard Routine Actions */}
                    <div className="grid grid-cols-2 gap-1 border-b border-slate-800 pb-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMateri({ judul: 'Senam Bersama', kategori: 'Senam', subKategori: 'General' });
                          setSelectMateriOpen(false);
                        }}
                        className="px-2 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 rounded-lg text-[10px] font-bold text-center"
                      >
                        🤸 Senam Bersama
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMateri({ judul: 'Logbook & Evaluasi', kategori: 'Teknis', subKategori: 'General' });
                          setSelectMateriOpen(false);
                        }}
                        className="px-2 py-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-300 rounded-lg text-[10px] font-bold text-center"
                      >
                        📋 Logbook
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
                            className={`w-full text-left p-1.5 rounded-lg hover:bg-slate-800 flex flex-col gap-0.5 transition-colors border ${
                              slot.materi === item.judul
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                : 'border-transparent text-slate-200'
                            }`}
                          >
                            <span className="font-semibold text-[11px] leading-snug line-clamp-2">
                              {item.judul}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                              <span className={`px-1 rounded ${item.kategori === 'Teknis' ? 'bg-emerald-950 text-emerald-400' : 'bg-indigo-950 text-indigo-400'}`}>
                                {item.kategori}
                              </span>
                              {item.subKategori && item.subKategori !== 'General' && (
                                <span className="text-slate-400">
                                  • {item.subKategori}
                                </span>
                              )}
                              {item.fileUrl && (
                                <span className="text-amber-400 flex items-center gap-0.5 ml-auto">
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
        </div>

        {slot.fileUrl && (() => {
          const isPdf = slot.fileUrl.toLowerCase().includes('.pdf') || (slot.materi && (slot.materi.startsWith('IK ') || slot.materi.startsWith('SOP ')));
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
        <div key={i} className="bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 space-y-2 shadow-sm">
          {/* Top Bar: Slot label, Category selector & Delete */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <span className="text-[11px] font-bold text-slate-300">Slot {i + 1}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={sl.kategori || 'Teknis'}
                onChange={e => handleUpdate(i, 'kategori', e.target.value)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                  sl.kategori === 'Senam'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                    : sl.kategori === 'Non-Teknis'
                    ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                }`}
                title="Pilih Kategori Materi"
              >
                <option value="Teknis">Teknis</option>
                <option value="Non-Teknis">Non-Teknis</option>
                <option value="Senam">Senam</option>
              </select>

              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-slate-800 transition-colors"
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
              <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-1">
                Section
              </label>
              <select
                value={sl.divisi || 'All'}
                onChange={e => handleUpdate(i, 'divisi', e.target.value)}
                className="w-full bg-slate-800 text-amber-300 border border-slate-700 rounded-lg px-2 py-1.5 outline-none text-[11px] font-semibold truncate hover:border-slate-600 focus:border-amber-500"
                title="Pilih Target Section"
              >
                {sectionOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-1">
                Level Jabatan
              </label>
              <select
                value={sl.kelas || 'All'}
                onChange={e => handleUpdate(i, 'kelas', e.target.value)}
                className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1.5 outline-none text-[11px] font-medium truncate hover:border-slate-600 focus:border-amber-500"
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
        className="w-full text-center text-[11px] text-amber-400 hover:text-amber-300 py-1.5 border border-dashed border-slate-700 rounded-xl hover:bg-slate-900 transition-colors flex items-center justify-center gap-1.5 font-bold"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah Slot
      </button>
    </div>
  );
};


