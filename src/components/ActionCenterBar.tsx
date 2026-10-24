import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Calendar, 
  Users, 
  ClipboardCheck, 
  RefreshCw, 
  ChevronRight,
  ClipboardList,
  ThermometerSun,
  Camera,
  Car,
  Wrench,
  Check,
  Eye,
  Plus,
  X,
  Download,
  ExternalLink,
  ChevronLeft,
  GraduationCap,
  MapPin,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOpenFindingsForSupervisor, isPicTemuanRole } from '../utils/inspection-pic-matcher';
import { getKtaObligation } from './GroupReportScreen';
import { formatProofImageUrl } from './SimplifiedInspectionModal';
import { CompactFindingPreview } from './StructuredFindingList';
import type { TrainingAlert } from '../utils/training-import';

interface ActionCenterBarProps {
  inspectorNik?: string | null;
  inspectorName?: string | null;
  inspectorJabatan?: string | null;
  onNav?: (tab: string) => void;
  onOpenKta?: () => void;
  onOpenP5m?: () => void;
  className?: string;
  // Hanya tampilkan item Training (WARNING / EXPIRED) — dipakai di Home Crew; disembunyikan bila tidak ada
  trainingOnly?: boolean;
}

const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmtTrainingDate = (d: string) => `${d.slice(8, 10)} ${MONTHS_SHORT_ID[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

function getLocalISOWeekTag(d: Date = new Date()): string {
  const utc = d.getTime();
  const witDate = new Date(utc + (9 * 60 * 60 * 1000));
  const target = new Date(Date.UTC(witDate.getUTCFullYear(), witDate.getUTCMonth(), witDate.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return `W${weekNumber}`;
}


function parseLvTicket(ticket: any) {
  const desc = ticket.description || '';
  const unitMatch = desc.match(/(Unit\s+LV[^\s(:]+|LV\s*[\d]+-[\d]+|LV\s*[\d]+|Mobil\s+[^\s(:]+)/i);
  const unitName = ticket.equipmentName || (unitMatch ? unitMatch[1].trim() : 'Unit LV');

  let cleanDesc = desc;
  const colonIdx = desc.indexOf(':');
  if (colonIdx !== -1 && colonIdx < 60) {
    cleanDesc = desc.slice(colonIdx + 1).trim();
  }

  let formattedDate = '-';
  if (ticket.date) {
    try {
      const d = new Date(ticket.date);
      formattedDate = `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIT`;
    } catch {
      formattedDate = String(ticket.date).slice(0, 10);
    }
  }

  return {
    unitName,
    damageDetail: cleanDesc || desc,
    formattedDate
  };
}

export type FindingSectionKey = 'ALL' | 'lab' | 'prep' | 'gudang' | 'lainnya';

export const FINDINGS_SECTIONS_CONFIG: Record<'lab' | 'prep' | 'gudang' | 'lainnya', {
  id: 'lab' | 'prep' | 'gudang' | 'lainnya';
  label: string;
  shortLabel: string;
  icon: string;
  badgeBg: string;
  border: string;
  accentColor: string;
}> = {
  lab: {
    id: 'lab',
    label: 'Area Laboratorium',
    shortLabel: 'Lab',
    icon: '🧪',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    border: 'border-indigo-200 dark:border-indigo-800',
    accentColor: 'text-indigo-600 dark:text-indigo-400'
  },
  prep: {
    id: 'prep',
    label: 'Area Preparasi',
    shortLabel: 'Prep',
    icon: '🚜',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    border: 'border-amber-200 dark:border-amber-800',
    accentColor: 'text-amber-600 dark:text-amber-400'
  },
  gudang: {
    id: 'gudang',
    label: 'Gudang & Fasilitas Penunjang',
    shortLabel: 'Gudang',
    icon: '📦',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    border: 'border-teal-200 dark:border-teal-800',
    accentColor: 'text-teal-600 dark:text-teal-400'
  },
  lainnya: {
    id: 'lainnya',
    label: 'Umum & Area Lainnya',
    shortLabel: 'Umum',
    icon: '🏢',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    border: 'border-slate-200 dark:border-slate-700',
    accentColor: 'text-slate-600 dark:text-slate-400'
  }
};

export function getFindingSection(finding: any): 'lab' | 'prep' | 'gudang' | 'lainnya' {
  const combined = [
    finding.location,
    finding.category,
    finding.area,
    finding.workArea,
    finding.section,
    finding.unitName,
    finding.description,
  ].filter(Boolean).join(' ').toLowerCase();

  // 1. Gudang & Fasilitas Penunjang (kontainer, pantry, transit, storage, workshop, bengkel, arsip, genset)
  if (
    combined.includes('gudang') ||
    combined.includes('warehouse') ||
    combined.includes('kontainer') ||
    combined.includes('storage') ||
    combined.includes('workshop') ||
    combined.includes('bengkel') ||
    combined.includes('pantry') ||
    combined.includes('transit') ||
    combined.includes('limbah') ||
    combined.includes('tps') ||
    combined.includes('arsip') ||
    combined.includes('genset') ||
    combined.includes('penunjang')
  ) {
    return 'gudang';
  }

  // 2. Preparasi
  if (
    combined.includes('prep') ||
    combined.includes('preparasi') ||
    combined.includes('crush') ||
    combined.includes('pulveriz') ||
    combined.includes('jaw') ||
    combined.includes('splitter') ||
    combined.includes('ring mill') ||
    combined.includes('ringmill') ||
    combined.includes('ayakan') ||
    combined.includes('sieve') ||
    combined.includes('dryer')
  ) {
    return 'prep';
  }

  // 3. Laboratorium
  if (
    combined.includes('lab') ||
    combined.includes('laboratorium') ||
    combined.includes('fusion') ||
    combined.includes('timbang') ||
    combined.includes('scrubber') ||
    combined.includes('xrf') ||
    combined.includes('wet') ||
    combined.includes('instrumen') ||
    combined.includes('balance') ||
    combined.includes('neraca') ||
    combined.includes('chiller') ||
    combined.includes('spectro') ||
    combined.includes('aas') ||
    combined.includes('titrasi') ||
    combined.includes('lemari asam')
  ) {
    return 'lab';
  }

  // 4. Perkakas / Grinder
  if (combined.includes('grinder') || combined.includes('perkakas')) {
    return 'prep';
  }

  return 'lainnya';
}

export interface ClusteredFindingGroup {
  groupKey: string;
  title: string;
  icon: string;
  category: string;
  isMulti: boolean;
  findings: any[];
  locationsSummary: string;
}

export function clusterFindings(findings: any[]): ClusteredFindingGroup[] {
  const groupMap = new Map<string, ClusteredFindingGroup>();

  findings.forEach((finding, idx) => {
    const desc = String(finding.description || '').toLowerCase();
    const cat = String(finding.category || '').toLowerCase();

    let key = '';
    let title = '';
    let icon = '🔍';
    let groupCat = finding.category || 'Temuan K3';

    if (cat.includes('p3k') || desc.includes('kotak p3k') || desc.includes('aquades') || desc.includes('alkohol 70')) {
      key = 'cluster_p3k';
      title = 'Kekurangan Stok Item Kotak P3K';
      icon = '🩹';
      groupCat = 'Kotak P3K';
    } else if (cat.includes('perkakas') || desc.includes('grinder') || desc.includes('makita')) {
      key = 'cluster_grinder';
      title = 'Kerusakan Perkakas Grinder Cordless (Makita)';
      icon = '⚙️';
      groupCat = 'Perkakas Tangan';
    } else if (cat.includes('apd') || desc.includes('ketidakpatuhan apd') || desc.includes('kepatuhan apd')) {
      key = 'cluster_apd';
      title = 'Ketidakpatuhan APD Personil';
      icon = '🦺';
      groupCat = 'Kepatuhan APD';
    } else {
      const ticketCode = finding.ticketId || finding.ticket_id || finding.id || `single_${idx}`;
      key = `single_${ticketCode}`;
      title = finding.category || 'Temuan Terencana';
      icon = '🔍';
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        title,
        icon,
        category: groupCat,
        isMulti: false,
        findings: [finding],
        locationsSummary: finding.location || '-'
      });
    } else {
      const g = groupMap.get(key)!;
      g.findings.push(finding);
      g.isMulti = true;
      const locs = Array.from(new Set(g.findings.map(f => f.location).filter(Boolean)));
      g.locationsSummary = locs.join(', ') || '-';
    }
  });

  return Array.from(groupMap.values());
}

export function ActionCenterBar({
  inspectorNik,
  inspectorName,
  inspectorJabatan,
  onNav,
  onOpenKta,
  onOpenP5m,
  className = '',
  trainingOnly = false
}: ActionCenterBarProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('action_center_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const toggleExpanded = () => {
    setIsExpanded(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem('action_center_expanded', String(next));
      } catch {}
      return next;
    });
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentWeekTag = useMemo(() => getLocalISOWeekTag(new Date()), []);

  // SWR Instant Cache Reading
  const [inspectionSchedule, setInspectionSchedule] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_my_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed.isCompleted && !parsed.isCuti) return parsed;
      }
    } catch {}
    return null;
  });

  const [p5mAssignments, setP5mAssignments] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_p5m_assignments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [p5mAssignment, setP5mAssignment] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_p5m_assignment');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [dailyTasks, setDailyTasks] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_daily_tasks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [myKtaRecord, setMyKtaRecord] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_kta_record');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [isInspectionSchedulePublished, setIsInspectionSchedulePublished] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_inspection_published');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  const [showLvDamageModal, setShowLvDamageModal] = useState<boolean>(false);
  const [openFindings, setOpenFindings] = useState<any[]>([]);
  const [isFindingsExpanded, setIsFindingsExpanded] = useState<boolean>(false);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [findingsSectionFilter, setFindingsSectionFilter] = useState<FindingSectionKey>('ALL');
  const [expandedSectionKeys, setExpandedSectionKeys] = useState<Set<string>>(() => new Set(['prep', 'lab', 'gudang', 'lainnya']));
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  const toggleFindingSectionCollapse = (secKey: string) => {
    setExpandedSectionKeys(prev => {
      const next = new Set(prev);
      if (next.has(secKey)) next.delete(secKey);
      else next.add(secKey);
      return next;
    });
  };

  const { clusteredBySection, sectionCounts, totalClusteredCount } = useMemo(() => {
    const rawGroups: Record<'lab' | 'prep' | 'gudang' | 'lainnya', any[]> = {
      lab: [],
      prep: [],
      gudang: [],
      lainnya: []
    };
    const counts = { ALL: openFindings.length, lab: 0, prep: 0, gudang: 0, lainnya: 0 };

    openFindings.forEach(f => {
      const sec = getFindingSection(f);
      rawGroups[sec].push(f);
      counts[sec]++;
    });

    const clusteredGroups: Record<'lab' | 'prep' | 'gudang' | 'lainnya', ClusteredFindingGroup[]> = {
      lab: clusterFindings(rawGroups.lab),
      prep: clusterFindings(rawGroups.prep),
      gudang: clusterFindings(rawGroups.gudang),
      lainnya: clusterFindings(rawGroups.lainnya)
    };

    const totalGroups = 
      clusteredGroups.lab.length + 
      clusteredGroups.prep.length + 
      clusteredGroups.gudang.length + 
      clusteredGroups.lainnya.length;

    return {
      rawFindingsBySection: rawGroups,
      clusteredBySection: clusteredGroups,
      sectionCounts: counts,
      totalClusteredCount: totalGroups
    };
  }, [openFindings]);

  const [lvDamageTickets, setLvDamageTickets] = useState<any[]>([]);
  const [overdueLeaves, setOverdueLeaves] = useState<any[]>([]);
  const [maintenanceWorkOrders, setMaintenanceWorkOrders] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_maintenance_wos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  // Training SAP milik karyawan yang WARNING (≥ 1,5 th) / EXPIRED (≥ 2 th) dan belum diperbarui
  const [trainingAlerts, setTrainingAlerts] = useState<TrainingAlert[]>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_training_alerts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [completedInspectionInfo, setCompletedInspectionInfo] = useState<any | null>(null);
  const [userInspectionProof, setUserInspectionProof] = useState<any | null>(null);
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    images: Array<{ url: string; label?: string; description?: string }>;
    currentIndex: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(() => {
    return !localStorage.getItem('p2h_cached_my_schedule') && !localStorage.getItem('p2h_cached_daily_tasks');
  });

  const userProfile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
    } catch {
      return {};
    }
  }, []);

  const effectiveNik = useMemo(() => {
    if (inspectorNik) return inspectorNik;
    return userProfile.nik || localStorage.getItem('p2h_inspector_nik') || localStorage.getItem('user_nik') || '';
  }, [inspectorNik, userProfile]);

  const effectiveName = useMemo(() => {
    if (inspectorName) return inspectorName;
    return userProfile.name || userProfile.nama || localStorage.getItem('p2h_inspector_name') || localStorage.getItem('user_name') || '';
  }, [inspectorName, userProfile]);

  const effectiveJabatan = useMemo(() => {
    if (inspectorJabatan) return inspectorJabatan;
    return userProfile.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '';
  }, [inspectorJabatan, userProfile]);

  const effectiveSection = useMemo(() => {
    return userProfile.section || localStorage.getItem('p2h_inspector_section') || userProfile.department || localStorage.getItem('p2h_inspector_dept') || '';
  }, [userProfile]);

  const jLower = effectiveJabatan.toLowerCase();
  const sLower = effectiveSection.toLowerCase();

  // Section classifications:
  const isPrepSection = useMemo(() => {
    return sLower.includes('prep') || jLower.includes('prep');
  }, [sLower, jLower]);

  const isLabSection = useMemo(() => {
    return sLower.includes('lab') || sLower.includes('qa') || sLower.includes('quality') ||
           jLower.includes('lab') || jLower.includes('chemist') || jLower.includes('qa') ||
           jLower.includes('quality') || jLower.includes('assay') || jLower.includes('analyst');
  }, [sLower, jLower]);

  const isMaintSection = useMemo(() => {
    return sLower.includes('maint') || sLower.includes('workshop') ||
           jLower.includes('maint') || jLower.includes('workshop') ||
           jLower.includes('mekanik') || jLower.includes('electric') ||
           jLower.includes('welder') || jLower.includes('bubut');
  }, [sLower, jLower]);

  // Strict Role Isolations:
  // 1. SPV Maintenance ONLY
  const isSpvMaintenance = useMemo(() => {
    const isLead = jLower.includes('supervisor') || jLower.includes('spv') || jLower.includes('foreman') || jLower.includes('lead') || jLower.includes('specialist');
    return isMaintSection && isLead;
  }, [isMaintSection, jLower]);

  // 2. Supervisor / Leadership in general (Superintendent, Manager, SPV, Specialist, Lead, Foreman)
  const isSupervisorOrLead = useMemo(() => {
    return isPicTemuanRole(effectiveJabatan) ||
           jLower.includes('supervisor') ||
           jLower.includes('spv') ||
           jLower.includes('specialist') ||
           jLower.includes('superintendent') ||
           jLower.includes('manager') ||
           jLower.includes('lead') ||
           jLower.includes('foreman') ||
           sLower.includes('manager');
  }, [effectiveJabatan, jLower, sLower]);

  // 3. Lab / QA personnel (for Pemantauan Suhu & Gas)
  const isLabOrQA = useMemo(() => {
    return isLabSection;
  }, [isLabSection]);

  const fetchActionItems = async (manualRefresh = false) => {
    if (!effectiveNik && !effectiveName) {
      setLoading(false);
      return;
    }

    try {
      if (manualRefresh) setIsRefreshing(true);
      const queryParams = new URLSearchParams();
      if (effectiveNik) queryParams.set('nik', effectiveNik);
      if (effectiveName) queryParams.set('name', effectiveName);

      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      // 0. Training SAP WARNING / EXPIRED milik user yang login (NIK dari sesi login di server)
      const trainingPromise = safeFetch('/api/training-records/me');

      // Mode training saja (Home Crew): tidak perlu memuat item operasional lain
      if (trainingOnly) {
        const trainingData = await trainingPromise;
        const alerts: TrainingAlert[] = trainingData?.data?.alerts || [];
        setTrainingAlerts(alerts);
        try { localStorage.setItem('p2h_cached_training_alerts', JSON.stringify(alerts)); } catch {}
        return;
      }

      // 1. Fetch Weekly Inspection Schedule
      const schedPromise = safeFetch(`/api/inspection-schedule?${queryParams.toString()}`);

      // 2. Fetch P5M Assignment
      const p5mPromise = safeFetch(`/api/p5m/schedules/user-assignment?${queryParams.toString()}&includePast=true`);

      // 3. Fetch Daily Tasks Status (P2H & Pemantauan Lab)
      const dailyPromise = safeFetch(`/api/daily-tasks-status?${queryParams.toString()}`);

      // 4. Fetch KTA Rekap Status
      const ktaPromise = safeFetch(`/api/rekap-kta?week=${currentWeekTag}${manualRefresh ? '&refresh=true' : ''}`);

      // 5. Fetch Open Tickets ONLY IF user is a Supervisor or Leadership role
      const ticketsPromise = isSupervisorOrLead ? safeFetch('/api/tickets') : Promise.resolve([]);

      // 6. Fetch Inspection Proofs for Screenshot Confirmation
      const proofsPromise = safeFetch(`/api/inspection-proofs?week=${currentWeekTag}`);

      // 7. Fetch Work Orders IF user is Maintenance or Supervisor
      const woPromise = (isMaintSection || isSupervisorOrLead) ? safeFetch('/api/work-orders') : Promise.resolve([]);

      // 8. Fetch Employee Leaves to check for supervisor warnings (> 2 days overdue)
      const leavesPromise = safeFetch('/api/employee-leaves');

      const [schedData, p5mData, dailyData, ktaData, ticketsData, proofsData, woData, trainingData, leavesData] = await Promise.all([
        schedPromise,
        p5mPromise,
        dailyPromise,
        ktaPromise,
        ticketsPromise,
        proofsPromise,
        woPromise,
        trainingPromise,
        leavesPromise
      ]);

      // Process Training Alerts (null = gagal memuat → pertahankan cache)
      if (trainingData) {
        const alerts: TrainingAlert[] = trainingData?.data?.alerts || [];
        setTrainingAlerts(alerts);
        try { localStorage.setItem('p2h_cached_training_alerts', JSON.stringify(alerts)); } catch {}
      }

      // Process Overdue Leaves Warning for Supervisor (>= 1 hari belum Izin Selesai / Approval HR;
      // izin >= 5 hari ke belakang otomatis Approval HR kecuali Ditolak — sama dengan modul Rekapan Izin)
      if (leavesData && Array.isArray(leavesData.data)) {
        const todayWit = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jayapura' }).format(new Date());
        const myOverdue = leavesData.data.filter((l: any) => {
          const status = (l.acc || '').trim().toLowerCase();
          if (status === 'izin selesai' || status.includes('selesai')) return false;

          const pName = (l.pengawasMengetahui || '').trim().toLowerCase();
          const uName = (effectiveName || '').trim().toLowerCase();
          const uNik = (effectiveNik || '').trim().toUpperCase();

          const isMySubordinate = 
            (uName && pName && (pName.includes(uName) || uName.includes(pName))) ||
            (uNik && l.pengawasMengetahui && l.pengawasMengetahui.toUpperCase().includes(uNik));

          if (!isMySubordinate) return false;

          const dateStr = l.awalAbsensi || (l.createdAt ? String(l.createdAt).slice(0, 10) : '');
          if (!dateStr) return false;
          try {
            const dStart = new Date(dateStr);
            const dToday = new Date(todayWit);
            if (isNaN(dStart.getTime()) || isNaN(dToday.getTime())) return false;
            dStart.setHours(0, 0, 0, 0);
            dToday.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((dToday.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 5 && status !== 'ditolak') return false;
            return diffDays >= 1;
          } catch {
            return false;
          }
        });
        setOverdueLeaves(myOverdue);
      } else {
        setOverdueLeaves([]);
      }

      // Process Weekly Inspection Schedule
      if (schedData) {
        const isPub = Boolean(
          schedData.isPublished !== undefined
            ? schedData.isPublished
            : (schedData.found || (schedData.totalScheduled && schedData.totalScheduled > 0) || schedData.schedule)
        );
        setIsInspectionSchedulePublished(isPub);
        try { localStorage.setItem('p2h_cached_inspection_published', String(isPub)); } catch {}

        if (schedData.found && schedData.schedule) {
          setCompletedInspectionInfo(schedData.schedule);
          if (!schedData.schedule.isCompleted && !schedData.schedule.isCuti) {
            setInspectionSchedule(schedData.schedule);
            try { localStorage.setItem('p2h_cached_my_schedule', JSON.stringify(schedData.schedule)); } catch {}
          } else {
            setInspectionSchedule(null);
          }
        } else {
          setInspectionSchedule(null);
          setCompletedInspectionInfo(null);
        }
      } else {
        setInspectionSchedule(null);
        setCompletedInspectionInfo(null);
        setIsInspectionSchedulePublished(false);
      }

      // Process User Inspection Proof
      if (Array.isArray(proofsData)) {
        const cleanNik = (effectiveNik || '').trim().toLowerCase();
        const cleanName = (effectiveName || '').trim().toLowerCase();
        const matchedProof = proofsData.find((p: any) => {
          const pNik = (p.nik || '').trim().toLowerCase();
          const pName = (p.name || '').trim().toLowerCase();
          return (cleanNik && pNik === cleanNik) || (cleanName && (pName.includes(cleanName) || cleanName.includes(pName)));
        });
        setUserInspectionProof(matchedProof || null);
      }

      // Process P5M Assignment
      if (p5mData && p5mData.success && (p5mData.assignment || (Array.isArray(p5mData.assignments) && p5mData.assignments.length > 0))) {
        const list = Array.isArray(p5mData.assignments) && p5mData.assignments.length > 0
          ? p5mData.assignments
          : (p5mData.assignment ? [p5mData.assignment] : []);
        setP5mAssignments(list);
        const activeItem = p5mData.assignment || list[0] || null;
        setP5mAssignment(activeItem);
        try {
          if (activeItem) {
            localStorage.setItem('p2h_cached_p5m_assignment', JSON.stringify(activeItem));
            localStorage.setItem('p2h_cached_p5m_assignments', JSON.stringify(list));
          }
        } catch {}
      } else {
        setP5mAssignment(null);
        setP5mAssignments([]);
      }

      // Process Daily Tasks Status (P2H & Pemantauan)
      if (dailyData && dailyData.success) {
        setDailyTasks(dailyData);
        try { localStorage.setItem('p2h_cached_daily_tasks', JSON.stringify(dailyData)); } catch {}
      }

      // Process KTA Status
      if (ktaData && Array.isArray(ktaData.rekapList)) {
        const cleanNik = (effectiveNik || '').trim().toLowerCase();
        const cleanName = (effectiveName || '').trim().toLowerCase();
        const match = ktaData.rekapList.find((r: any) => {
          const rNik = (r.nik || '').trim().toLowerCase();
          const rName = (r.name || '').trim().toLowerCase();
          return (cleanNik && rNik === cleanNik) || (cleanName && (rName.includes(cleanName) || cleanName.includes(rName)));
        });
        const cutiMatch = (ktaData.cutiList || []).find((c: any) => {
          const cNik = (c.nik || '').trim().toLowerCase();
          const cName = (c.name || '').trim().toLowerCase();
          return (cleanNik && cNik === cleanNik) || (cleanName && (cName.includes(cleanName) || cleanName.includes(cName)));
        });

        const target = cutiMatch ? { ...cutiMatch, isCuti: true, status: 'CUTI' } : (match || null);
        setMyKtaRecord(target);
        try {
          if (target) localStorage.setItem('p2h_cached_kta_record', JSON.stringify(target));
        } catch {}
      }

      // Process Open Tickets: STRICT ROLE FILTERING
      if (isSupervisorOrLead && Array.isArray(ticketsData)) {
        // If user is SPV Maintenance: separate LV / Vehicle tickets
        if (isSpvMaintenance) {
          const lvList = ticketsData.filter((t: any) => {
            const st = (t.status || '').toUpperCase();
            if (st !== 'OPEN' && st !== 'PROGRESS') return false;
            const fullText = `${t.category || ''} ${t.location || ''} ${t.description || ''} ${t.equipmentName || ''}`.toLowerCase();
            return fullText.includes('lv') || fullText.includes('unit') || fullText.includes('mobil') || fullText.includes('kendaraan');
          });
          setLvDamageTickets(lvList);

          const matching = getOpenFindingsForSupervisor(effectiveJabatan, ticketsData);
          setOpenFindings(matching.openFindings || []);
        } else {
          // If NOT SPV Maintenance: NEVER show LV damage tickets
          setLvDamageTickets([]);

          // Filter regular section findings excluding any LV / vehicle issues
          const matching = getOpenFindingsForSupervisor(effectiveJabatan, ticketsData);
          const nonLvFindings = (matching.openFindings || []).filter((t: any) => {
            const fullText = `${t.category || ''} ${t.location || ''} ${t.description || ''}`.toLowerCase();
            return !fullText.includes('lv ') && !fullText.includes('unit lv') && !fullText.includes('kendaraan');
          });
          setOpenFindings(nonLvFindings);
        }
      } else {
        // Non-supervisor users: ZERO tickets / open findings!
        setOpenFindings([]);
        setLvDamageTickets([]);
      }

      // Process Maintenance Work Orders
      if (Array.isArray(woData)) {
        const activeWOs = woData.filter((w: any) => {
          const st = (w.status || '').toUpperCase();
          return st !== 'CLOSED' && st !== 'SELESAI' && st !== 'COMPLETED';
        });
        setMaintenanceWorkOrders(activeWOs);
        try {
          localStorage.setItem('p2h_cached_maintenance_wos', JSON.stringify(activeWOs));
        } catch {}
      } else {
        setMaintenanceWorkOrders([]);
      }

    } catch (err) {
      console.warn('ActionCenterBar: Failed to load action items', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActionItems();
  }, [effectiveNik, effectiveName, effectiveJabatan, effectiveSection]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchActionItems(true);
    };
    window.addEventListener('refresh-group-reports', handleRefresh);
    window.addEventListener('refresh-action-center', handleRefresh);
    return () => {
      window.removeEventListener('refresh-group-reports', handleRefresh);
      window.removeEventListener('refresh-action-center', handleRefresh);
    };
  }, [effectiveNik, effectiveName, effectiveJabatan]);

  // Operational status checks
  const isCutiToday = Boolean(dailyTasks?.rosterToday?.isCuti || myKtaRecord?.isCuti || inspectionSchedule?.isCuti);
  const isOnsite = Boolean(dailyTasks?.rosterToday?.isOnsite);

  // 1. P2H Pending Check
  const isP2hPending = useMemo(() => {
    if (!dailyTasks || isCutiToday || !isOnsite) return false;
    return !dailyTasks.p2h?.completedToday;
  }, [dailyTasks, isCutiToday, isOnsite]);

  // 2. Pemantauan Lab Pending Check (Only for Lab & QA)
  const isPemantauanPending = useMemo(() => {
    if (!dailyTasks || isCutiToday || !isOnsite) return false;
    return isLabOrQA && !dailyTasks.pemantauan?.completedToday;
  }, [dailyTasks, isCutiToday, isOnsite, isLabOrQA]);

  // 3. KTA / TTA Pending Check
  const ktaObligation = useMemo(() => {
    return getKtaObligation(effectiveNik, effectiveJabatan, effectiveSection);
  }, [effectiveNik, effectiveJabatan, effectiveSection]);

  const isKtaPending = useMemo(() => {
    if (isCutiToday) return false;
    const targetCount = ktaObligation.targetCount || 1;
    const totalReports = (myKtaRecord?.reports?.length) ?? (myKtaRecord?.count || 0);
    const isDone = Boolean(
      myKtaRecord?.status === 'SUDAH' || 
      myKtaRecord?.status === 'TERPENUHI' || 
      myKtaRecord?.hasSubmitted || 
      totalReports >= targetCount ||
      (targetCount === 1 && totalReports >= 1) ||
      (targetCount === 2 && (
        (myKtaRecord?.checkDetails?.check1Done && myKtaRecord?.checkDetails?.check2Done) ||
        totalReports >= 2
      ))
    );
    return !isDone;
  }, [myKtaRecord, isCutiToday, ktaObligation]);

  // Build the list of Operational Categories (Compact Category Cards)
  const categoriesList = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      count: number;
      isPending: boolean;
      icon: React.ReactNode;
      iconColor: string;
      bgColor: string;
      navKey: string;
      navParams?: any;
    }> = [];

    // 0. Training SAP WARNING / EXPIRED — muncul hanya bila ada training yang belum diperbarui
    if (trainingAlerts.length > 0) {
      const expiredCount = trainingAlerts.filter(a => a.state === 'expired').length;
      const warningCount = trainingAlerts.length - expiredCount;
      list.push({
        id: 'training',
        title: expiredCount > 0 ? 'Training Expired — Wajib Training Ulang' : 'Training Akan Expired',
        subtitle: [expiredCount > 0 && `${expiredCount} expired`, warningCount > 0 && `${warningCount} warning`].filter(Boolean).join(' · ')
          + ` — ${trainingAlerts.map(a => a.label).join(', ')}`,
        count: trainingAlerts.length,
        isPending: true,
        icon: <GraduationCap className="w-4 h-4" />,
        iconColor: expiredCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400',
        bgColor: expiredCount > 0 ? 'bg-red-500/10 border-red-500/25' : 'bg-yellow-400/15 border-yellow-500/30',
        navKey: 'training'
      });
    }
    if (trainingOnly) return list;

    // 1. Jadwal Inspeksi Mingguan
    list.push({
      id: 'inspection',
      title: 'Jadwal Inspeksi Mingguan',
      subtitle: inspectionSchedule 
        ? `${inspectionSchedule.week || currentWeekTag}: ${inspectionSchedule.inspeksi}` 
        : 'Inspeksi minggu ini telah selesai',
      count: inspectionSchedule ? 1 : 0,
      isPending: Boolean(inspectionSchedule),
      icon: <ClipboardCheck className="w-4 h-4" />,
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/25',
      navKey: 'inspection',
      navParams: { formId: inspectionSchedule?.inspeksi, subArea: inspectionSchedule?.area }
    });

    // 2. Laporan KTA / TTA — Hanya muncul jika Jadwal Inspeksi sudah terbit
    if (isInspectionSchedulePublished) {
      list.push({
        id: 'kta',
        title: 'Laporan Bahaya KTA / TTA',
        subtitle: isKtaPending 
          ? `Kewajiban: ${ktaObligation.label} (Belum Lapor Week Ini)` 
          : 'Target laporan minggu ini terpenuhi',
        count: isKtaPending ? (ktaObligation.targetCount || 1) : 0,
        isPending: isKtaPending,
        icon: <Camera className="w-4 h-4" />,
        iconColor: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-500/10 border-orange-500/25',
        navKey: 'kta'
      });
    }

    // 3. Penugasan Pemateri / Materi P5M Mingguan
    const pendingP5mList = p5mAssignments.filter((a: any) => !a.isCompleted && !a.isPast);
    const isP5mPending = pendingP5mList.length > 0 || Boolean(p5mAssignment && !p5mAssignment.isCompleted);
    const completedCount = p5mAssignments.filter((a: any) => a.isCompleted).length;
    let p5mSubtitle = 'Materi P5M Periode Ini • Tinjau topik & flyer briefing';
    let p5mTitle = 'Materi P5M Mingguan';

    if (p5mAssignments.length > 1) {
      p5mTitle = `Penugasan Pemateri P5M (${p5mAssignments.length} Sesi)`;
      if (completedCount === p5mAssignments.length) {
        p5mSubtitle = `Semua ${p5mAssignments.length} sesi P5M selesai dibawakan ✓ (+60 EXP)`;
      } else {
        const nextPending = p5mAssignments.find((a: any) => !a.isCompleted) || p5mAssignment;
        p5mSubtitle = `${p5mAssignments.length} Sesi (${p5mAssignments.map((a: any) => a.day).join(' & ')}) • ${nextPending?.day}: ${nextPending?.materi || 'Safety Talk'}`;
      }
    } else if (p5mAssignment) {
      p5mTitle = 'Penugasan Pemateri P5M';
      p5mSubtitle = p5mAssignment.isCompleted 
        ? 'Materi P5M sudah selesai dibawakan hari ini ✓ (+60 EXP)'
        : `${p5mAssignment.day || 'Hari Ini'}: ${p5mAssignment.materi || 'Safety Talk'}`;
    }

    list.push({
      id: 'p5m',
      title: p5mTitle,
      subtitle: p5mSubtitle,
      count: isP5mPending ? (pendingP5mList.length || 1) : 0,
      isPending: isP5mPending,
      icon: <Users className="w-4 h-4" />,
      iconColor: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/25',
      navKey: 'p5m'
    });

    // ==========================================
    // 4. KHUSUS PREPARASI:
    //    - P2H Khusus Preparasi
    // ==========================================
    if (isPrepSection && isOnsite && !isCutiToday) {
      list.push({
        id: 'p2h_prep',
        title: 'P2H Harian Preparasi',
        subtitle: isP2hPending 
          ? 'Checklist pra-operasi alat preparasi belum diisi hari ini' 
          : 'Checklist alat preparasi hari ini sudah tercatat',
        count: isP2hPending ? 1 : 0,
        isPending: isP2hPending,
        icon: <ClipboardList className="w-4 h-4" />,
        iconColor: 'text-teal-600 dark:text-teal-400',
        bgColor: 'bg-teal-500/10 border-teal-500/25',
        navKey: 'p2h',
        navParams: { category: 'Preparation' }
      });
    }

    // ==========================================
    // 5. KHUSUS LABORATORIUM:
    //    - P2H Khusus Laboratorium
    //    - Pemantauan Harian Lab (Suhu & Gas)
    // ==========================================
    if (isLabSection && isOnsite && !isCutiToday) {
      list.push({
        id: 'p2h_lab',
        title: 'P2H Harian Laboratorium',
        subtitle: isP2hPending 
          ? 'Checklist instrumen & alat lab belum diisi hari ini' 
          : 'Checklist alat lab hari ini sudah tercatat',
        count: isP2hPending ? 1 : 0,
        isPending: isP2hPending,
        icon: <ClipboardList className="w-4 h-4" />,
        iconColor: 'text-teal-600 dark:text-teal-400',
        bgColor: 'bg-teal-500/10 border-teal-500/25',
        navKey: 'p2h',
        navParams: { category: 'Laboratory' }
      });
    }

    if (isLabSection || dailyTasks?.pemantauan?.completedToday) {
      list.push({
        id: 'pemantauan',
        title: 'Pemantauan Harian Lab (Suhu & Gas)',
        subtitle: dailyTasks?.pemantauan?.completedToday 
          ? `Tercatat oleh ${dailyTasks.pemantauan.petugas} (${dailyTasks.pemantauan.jam || '-'} WIT)` 
          : 'Suhu ruangan & tabung gas shift ini belum dicatat',
        count: isPemantauanPending ? 1 : 0,
        isPending: isPemantauanPending,
        icon: <ThermometerSun className="w-4 h-4" />,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        bgColor: 'bg-indigo-500/10 border-indigo-500/25',
        navKey: 'pemantauan'
      });
    }

    // ==========================================
    // 6. KHUSUS MAINTENANCE:
    //    - Daftar Work Order Maintenance
    // ==========================================
    if (isMaintSection) {
      const activeWoCount = maintenanceWorkOrders.length;
      list.push({
        id: 'wo',
        title: 'Daftar Work Order Maintenance',
        subtitle: activeWoCount > 0 
          ? `${activeWoCount} work order aktif memerlukan perbaikan / tindak lanjut` 
          : 'Semua work order maintenance telah selesai',
        count: activeWoCount,
        isPending: activeWoCount > 0,
        icon: <Wrench className="w-4 h-4" />,
        iconColor: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/25',
        navKey: 'wo'
      });

      // Kerusakan Unit LV (Jika ada)
      if (isSpvMaintenance && lvDamageTickets.length > 0) {
        list.push({
          id: 'lv_damage',
          title: 'Kerusakan Unit LV (Maintenance)',
          subtitle: `${lvDamageTickets.length} laporan kerusakan unit/kendaraan aktif`,
          count: lvDamageTickets.length,
          isPending: true,
          icon: <Car className="w-4 h-4" />,
          iconColor: 'text-rose-600 dark:text-rose-400',
          bgColor: 'bg-rose-500/10 border-rose-500/25',
          navKey: 'lv_damage'
        });
      }
    }

    // ==========================================
    // 7. KHUSUS SPV / PIC:
    //    - Daftar Temuan Terbuka K3
    // ==========================================
    if (isSupervisorOrLead) {
      const hasOpen = openFindings.length > 0;
      list.push({
        id: 'findings',
        title: 'Daftar Temuan Terbuka K3',
        subtitle: hasOpen 
          ? `${openFindings.length} temuan inspeksi K3 di area Anda memerlukan tindak lanjut` 
          : 'Semua temuan inspeksi K3 di area Anda telah ditindaklanjuti ✓',
        count: openFindings.length,
        isPending: hasOpen,
        icon: <AlertTriangle className="w-4 h-4" />,
        iconColor: hasOpen ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
        bgColor: hasOpen ? 'bg-rose-500/10 border-rose-500/25' : 'bg-emerald-500/10 border-emerald-500/25',
        navKey: 'findings'
      });
    }

    // ==========================================
    // 8. PERINGATAN IZIN BELUM APPROVAL HR (Pengawas Mengetahui)
    // ==========================================
    if (overdueLeaves.length > 0) {
      list.push({
        id: 'leave_warning',
        title: 'Peringatan Izin Belum Approval HR',
        subtitle: `${overdueLeaves.length} izin bawahan belum Approval HR (>= 1 hari)`,
        count: overdueLeaves.length,
        isPending: true,
        icon: <AlertTriangle className="w-4 h-4" />,
        iconColor: 'text-rose-600 dark:text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/25',
        navKey: 'leave_warning'
      });
    }

    // ==========================================
    // 9. GENERAL FALLBACK (Crew Non-Prep/Lab/Maint):
    //    - P2H Standar
    // ==========================================
    if (!isPrepSection && !isLabSection && !isMaintSection && isOnsite && !isCutiToday) {
      list.push({
        id: 'p2h',
        title: 'Pemeriksaan Harian Peralatan (P2H)',
        subtitle: isP2hPending 
          ? 'Checklist pra-operasi unit/alat belum diisi hari ini' 
          : 'Checklist alat hari ini sudah tercatat',
        count: isP2hPending ? 1 : 0,
        isPending: isP2hPending,
        icon: <ClipboardList className="w-4 h-4" />,
        iconColor: 'text-teal-600 dark:text-teal-400',
        bgColor: 'bg-teal-500/10 border-teal-500/25',
        navKey: 'p2h'
      });
    }

    return list;
  }, [
    inspectionSchedule, 
    currentWeekTag, 
    isKtaPending, 
    ktaObligation, 
    p5mAssignment, 
    p5mAssignments,
    isPrepSection,
    isLabSection,
    isMaintSection,
    dailyTasks, 
    isPemantauanPending, 
    isOnsite, 
    isCutiToday, 
    isP2hPending, 
    maintenanceWorkOrders,
    isSpvMaintenance, 
    lvDamageTickets, 
    isSupervisorOrLead,
    openFindings,
    overdueLeaves,
    trainingAlerts,
    trainingOnly,
    isInspectionSchedulePublished
  ]);

  // Total count is sum of pending counts across all applicable categories
  const totalActionCount = useMemo(() => {
    return categoriesList.reduce((acc, cat) => acc + (cat.isPending ? cat.count : 0), 0);
  }, [categoriesList]);

  // Active pending categories (tasks that require attention)
  const pendingCategories = useMemo(() => {
    return categoriesList.filter(cat => cat.isPending);
  }, [categoriesList]);

  // Completed categories (tasks already done in this period)
  const completedCategories = useMemo(() => {
    return categoriesList.filter(cat => !cat.isPending);
  }, [categoriesList]);

  // Navigate helper
  const handleItemNav = (destination: string, stateParams?: any) => {
    // Keep action center open so when user returns from module, list is still readily available
    try {
      sessionStorage.setItem('action_center_expanded', 'true');
    } catch {}

    if (destination === 'inspection') {
      if (stateParams?.formId) sessionStorage.setItem('preselected_form_id', stateParams.formId);
      if (stateParams?.subArea) sessionStorage.setItem('preselected_sub_area', stateParams.subArea);
      if (onNav) onNav('weekly-inspection');
      else navigate('/weekly-inspection');
    } else if (destination === 'p5m') {
      if (onOpenP5m) {
        onOpenP5m();
        return;
      }
      window.dispatchEvent(new CustomEvent('open-simplified-p5m-modal'));
    } else if (destination === 'findings') {
      setIsFindingsExpanded(prev => !prev);
    } else if (destination === 'p2h') {
      if (stateParams?.category) {
        try {
          sessionStorage.setItem('p2h_selected_category', stateParams.category);
        } catch {}
      }
      if (onNav) onNav('inspect');
      else navigate('/inspect');
    } else if (destination === 'pemantauan') {
      if (onNav) onNav('pemantauan');
      else navigate('/pemantauan');
    } else if (destination === 'lv_damage') {
      setShowLvDamageModal(true);
    } else if (destination === 'wo') {
      if (onNav) onNav('wo-maintenance-dashboard');
      else navigate('/wo-maintenance-dashboard');
    } else if (destination === 'kta') {
      if (onOpenKta) {
        onOpenKta();
        return;
      }
      window.dispatchEvent(new CustomEvent('open-simplified-inspection', { detail: { tab: 'kta_tta' } }));
    } else if (destination === 'leave_warning') {
      if (onNav) onNav('employee-leaves');
      else navigate('/employee-leaves');
    }
  };

  const handleViewKtaProof = () => {
    const reports = myKtaRecord?.reports || [];
    const images: Array<{ url: string; label?: string; description?: string }> = [];
    if (reports.length > 0) {
      reports.forEach((r: any, idx: number) => {
        if (r.imageUrl) {
          images.push({
            url: r.imageUrl,
            label: `${r.reportType || 'KTA/TTA'} #${idx + 1}`,
            description: r.description || undefined
          });
        }
      });
    } else if (myKtaRecord?.imageUrl) {
      images.push({
        url: myKtaRecord.imageUrl,
        label: `${myKtaRecord.reportType || 'KTA/TTA'}`,
        description: myKtaRecord.description || undefined
      });
    }

    if (images.length > 0) {
      setLightboxData({
        isOpen: true,
        title: `Bukti Laporan KTA & TTA (${currentWeekTag})`,
        subtitle: `${effectiveName || 'Personil'} • ${images.length} Laporan Terkirim`,
        images,
        currentIndex: 0
      });
    } else {
      window.dispatchEvent(new CustomEvent('open-simplified-inspection', { detail: { tab: 'kta_tta' } }));
    }
  };

  const handleAddAdditionalKta = () => {
    window.dispatchEvent(new CustomEvent('open-simplified-inspection', { detail: { tab: 'kta_tta', openForm: true } }));
  };

  const handleViewInspectionProof = () => {
    const ssUrl = userInspectionProof?.imageUrl || completedInspectionInfo?.ssProofUrl;
    const pdfUrl = completedInspectionInfo?.completedPdfUrl || completedInspectionInfo?.pdfUrl;
    if (ssUrl) {
      setLightboxData({
        isOpen: true,
        title: 'Bukti Form Inspeksi Mingguan',
        subtitle: `${completedInspectionInfo?.inspeksi || 'Inspeksi Mingguan'} • ${completedInspectionInfo?.area || ''} (${currentWeekTag})`,
        images: [{ url: ssUrl, label: 'Bukti Screenshot Form Inspeksi' }],
        currentIndex: 0
      });
    } else if (pdfUrl && pdfUrl !== '#' && pdfUrl !== '-') {
      window.open(pdfUrl, '_blank');
    } else {
      window.dispatchEvent(new CustomEvent('open-simplified-inspection', { detail: { tab: 'weekly' } }));
    }
  };

  const handleAddAdditionalInspection = () => {
    window.dispatchEvent(new CustomEvent('open-simplified-inspection', { detail: { tab: 'weekly', openForm: true } }));
  };

  // Mode training saja: tidak tampil sama sekali bila tidak ada training WARNING / EXPIRED
  if (trainingOnly && trainingAlerts.length === 0) return null;

  return (
    <div className={`w-full transition-all duration-300 ${className}`}>
      <div 
        className={`w-full rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
          loading 
            ? 'bg-slate-500/5 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800'
            : totalActionCount > 0 
              ? 'bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-white dark:to-slate-900 border-rose-500/30' 
              : 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/25'
        }`}
      >
        {/* Top Accent Strip */}
        <div 
          className={`h-1 w-full transition-colors ${
            loading
              ? 'bg-slate-300 dark:bg-slate-700 animate-pulse'
              : totalActionCount > 0 
                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600' 
                : 'bg-emerald-500'
          }`} 
        />

        {/* 1. SINGLE-LINE COMPACT BAR (Always visible on homepage) */}
        <div 
          onClick={() => {
            if (!loading) {
              toggleExpanded();
            }
          }}
          className={`flex items-center justify-between p-3.5 sm:p-4 px-4 sm:px-5 transition-colors select-none ${
            !loading ? 'cursor-pointer hover:bg-slate-500/5' : 'cursor-default'
          }`}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
        >
          {/* Left: Icon & Headline */}
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div 
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                loading
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                  : totalActionCount > 0
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
              ) : totalActionCount > 0 ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold tracking-tight text-[var(--text-main,#0f172a)] flex items-center gap-1.5">
                  {trainingOnly ? 'Action Center' : 'Action Center Operasional'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--text-muted,#64748b)] truncate">
                {loading ? (
                  'Memeriksa status jadwal & operasional...'
                ) : totalActionCount > 0 ? (
                  <>
                    Terdapat <strong className="text-rose-600 dark:text-rose-400 font-bold">{totalActionCount} {trainingOnly ? 'training perlu diperbarui' : 'tugas operasional'}</strong> yang memerlukan perhatian Anda.
                  </>
                ) : (
                  'Semua tugas beres! Tidak ada pending inspeksi, KTA, pemantauan, atau P2H.'
                )}
              </p>
            </div>
          </div>

          {/* Right: Red Circle Counter & Toggle Chevron */}
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Memuat...</span>
              </span>
            ) : totalActionCount > 0 ? (
              <>
                {/* Single Pulsing Red Circular Badge with Number */}
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-30"></span>
                  <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-rose-500/30 animate-pulse">
                    {totalActionCount}
                  </div>
                </div>

                <button 
                  type="button"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  aria-label={isExpanded ? 'Tutup Rincian' : 'Buka Rincian'}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/25 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Nihil Pending</span>
                </span>
                <button 
                  type="button"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  aria-label={isExpanded ? 'Tutup Rincian' : 'Buka Rincian'}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2. COMPACT CATEGORY LIST ACCORDION (No Giant Cards - Sleek 1-Line Category Rows) */}
        <AnimatePresence>
          {isExpanded && !loading && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="border-t border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs p-3 sm:p-4 space-y-2"
            >
              <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Kategori Operasional & Item Tindak Lanjut {pendingCategories.length > 0 ? `(${pendingCategories.length})` : ''}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchActionItems(true);
                  }}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-teal-600 transition-colors cursor-pointer"
                  title="Segarkan data status tugas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Memperbarui...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Category Rows Container — Tugas yang selesai otomatis hilang dari Action Center */}
              <div className="space-y-1.5">
                {pendingCategories.length === 0 && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-200">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Semua Tugas Operasional Selesai ✓</p>
                      <p className="text-[10.5px] text-emerald-700/80 dark:text-emerald-300/80">
                        Tidak ada tugas yang memerlukan perhatian Anda saat ini. Tugas akan muncul kembali pada periode berikutnya.
                      </p>
                    </div>
                  </div>
                )}

                {(showCompleted ? categoriesList : pendingCategories).map((cat) => (
                  <React.Fragment key={cat.id}>
                  <div
                    onClick={() => handleItemNav(cat.navKey, cat.navParams)}
                    className={`flex items-center justify-between p-2.5 px-3 rounded-xl border transition-all cursor-pointer group shadow-2xs ${
                      cat.isPending
                        ? 'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700/80 hover:border-amber-500/50'
                        : 'bg-slate-50/60 dark:bg-slate-850/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 border-slate-150 dark:border-slate-800/60 opacity-85'
                    }`}
                  >
                    {/* Left: Icon & Category Name */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${cat.bgColor} ${cat.iconColor}`}>
                        {cat.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${
                            cat.isPending 
                              ? 'text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400' 
                              : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {cat.title}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-md">
                          {cat.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Right: Badge Number & Arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      {cat.id === 'lv_damage' ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <span>{cat.count}</span>
                            <span className="hidden sm:inline font-bold text-[9.5px]">Unit</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => setShowLvDamageModal(true)}
                            className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Tinjau laporan kerusakan unit LV"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Tinjau Laporan</span>
                          </button>
                        </div>
                      ) : cat.id === 'findings' ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black border flex items-center gap-1 ${
                            cat.isPending 
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                          }`}>
                            <span>{cat.count}</span>
                            <span className="hidden sm:inline font-bold text-[9.5px]">Pending</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => setIsFindingsExpanded(prev => !prev)}
                            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 border ${
                              isFindingsExpanded
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/25'
                            }`}
                            title="Buka / tutup rincian temuan K3"
                          >
                            <span>{isFindingsExpanded ? 'Tutup' : 'Lihat Rincian'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFindingsExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      ) : cat.id === 'leave_warning' ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                            <span>{cat.count}</span>
                            <span className="hidden sm:inline font-bold text-[9.5px]">Belum Approval HR</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              if (onNav) onNav('employee-leaves');
                              else navigate('/employee-leaves');
                            }}
                            className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Tinjau izin bawahan di modul Rekapan Izin"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Tinjau Izin</span>
                          </button>
                        </div>
                      ) : cat.isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <span>{cat.count}</span>
                          <span className="hidden sm:inline font-bold text-[9.5px]">Pending</span>
                        </span>
                      ) : cat.id === 'kta' ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Selesai</span>
                          </span>

                          <button
                            type="button"
                            onClick={handleViewKtaProof}
                            className="py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Lihat screenshot bukti formulir KTA/TTA yang telah terkirim"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Lihat Bukti</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleAddAdditionalKta}
                            className="py-1 px-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Buat laporan bahaya KTA / TTA tambahan minggu ini"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Lapor Tambahan</span>
                          </button>
                        </div>
                      ) : cat.id === 'inspection' ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Selesai</span>
                          </span>

                          <button
                            type="button"
                            onClick={handleViewInspectionProof}
                            className="py-1 px-2 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Lihat screenshot bukti konfirmasi formulir atau dokumen inspeksi"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Lihat Bukti</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleAddAdditionalInspection}
                            className="py-1 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Buat laporan inspeksi tambahan atau unggah screenshot bukti formulir"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Lapor Tambahan</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span className="hidden sm:inline">Selesai</span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Rincian Temuan Terbuka K3 */}
                  {cat.id === 'findings' && isFindingsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-2 sm:ml-6 mt-1 mb-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 border border-rose-200/80 dark:border-rose-900/40 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                            Daftar Temuan K3 Terbuka ({openFindings.length})
                          </h4>
                          <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {totalClusteredCount} Isu Dikelompokkan
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onNav) onNav('sap-dashboard');
                            else navigate('/sap-dashboard');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Buka seluruh temuan di SAP Dashboard"
                        >
                          <span>Buka Dashboard</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {openFindings.length === 0 ? (
                        <div className="py-4 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Seluruh temuan K3 di area Anda telah selesai ditindaklanjuti.</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* 1. Quick Section Filter Pills */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                            <button
                              type="button"
                              onClick={() => setFindingsSectionFilter('ALL')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                                findingsSectionFilter === 'ALL'
                                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-750'
                              }`}
                            >
                              Semua Seksi ({openFindings.length})
                            </button>

                            {(['lab', 'prep', 'gudang', 'lainnya'] as const).map(secKey => {
                              const secCfg = FINDINGS_SECTIONS_CONFIG[secKey];
                              const count = sectionCounts[secKey] || 0;
                              if (count === 0 && findingsSectionFilter !== secKey) return null;
                              const isActive = findingsSectionFilter === secKey;

                              return (
                                <button
                                  key={secKey}
                                  type="button"
                                  onClick={() => setFindingsSectionFilter(secKey)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                                    isActive
                                      ? `${secCfg.badgeBg} shadow-2xs ring-1 ring-offset-1`
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-750'
                                  }`}
                                >
                                  <span>{secCfg.icon}</span>
                                  <span>{secCfg.shortLabel}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    isActive ? 'bg-white/70 dark:bg-slate-900/60' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* 2. Grouped Sections / Findings List */}
                          <div className="space-y-3">
                            {(['lab', 'prep', 'gudang', 'lainnya'] as const).map(secKey => {
                              if (findingsSectionFilter !== 'ALL' && findingsSectionFilter !== secKey) return null;
                              const rawItems = clusteredBySection[secKey];
                              const rawCount = sectionCounts[secKey] || 0;
                              if (rawCount === 0) return null;

                              const secCfg = FINDINGS_SECTIONS_CONFIG[secKey];
                              const isSecExpanded = expandedSectionKeys.has(secKey);

                              return (
                                <div key={secKey} className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden shadow-2xs">
                                  {/* Section Header Accordion */}
                                  <div
                                    onClick={() => toggleFindingSectionCollapse(secKey)}
                                    className="flex items-center justify-between p-2.5 px-3 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer select-none transition-colors border-b border-slate-100 dark:border-slate-800"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm">{secCfg.icon}</span>
                                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide truncate">
                                        {secCfg.label}
                                      </span>
                                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${secCfg.badgeBg}`}>
                                        {rawCount} Temuan • {rawItems.length} Kelompok
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                                      <span className="text-[10px] font-medium hidden sm:inline">
                                        {isSecExpanded ? 'Sembunyikan' : 'Tampilkan'}
                                      </span>
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSecExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>

                                  {/* Section Content */}
                                  {isSecExpanded && (
                                    <div className="p-2 sm:p-2.5 space-y-1.5 animate-in fade-in duration-150">
                                      {rawItems.map((group, gIdx) => {
                                        // A. CONSOLIDATED GROUP (Multi-tickets merged)
                                        if (group.isMulti) {
                                          const isGroupOpen = expandedGroupKey === group.groupKey;
                                          return (
                                            <div
                                              key={group.groupKey}
                                              className={`rounded-xl border transition-all overflow-hidden ${
                                                isGroupOpen
                                                  ? 'bg-white dark:bg-slate-800 border-rose-300 dark:border-rose-800 ring-1 ring-rose-400/20'
                                                  : 'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700/80'
                                              }`}
                                            >
                                              {/* Group Header */}
                                              <div
                                                onClick={() => setExpandedGroupKey(prev => prev === group.groupKey ? null : group.groupKey)}
                                                className="flex items-center justify-between p-2.5 px-3 cursor-pointer select-none gap-2"
                                              >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                  <span className="text-sm shrink-0">{group.icon}</span>
                                                  <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                        {group.title}
                                                      </span>
                                                      <span className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                                        {group.findings.length} Tiket Digabung
                                                      </span>
                                                    </div>
                                                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                                                      Lokasi: {group.locationsSummary}
                                                    </p>
                                                  </div>
                                                </div>

                                                <div className="w-5 h-5 rounded-md flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 shrink-0">
                                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isGroupOpen ? 'rotate-180 text-rose-600' : ''}`} />
                                                </div>
                                              </div>

                                              {/* Group Expanded Tickets Sub-list */}
                                              {isGroupOpen && (
                                                <div className="p-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-850/60 space-y-2">
                                                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                                                    <Layers className="w-3.5 h-3.5 text-rose-500" />
                                                    <span>Rincian {group.findings.length} tiket dalam kelompok ini:</span>
                                                  </div>

                                                  <div className="space-y-1.5">
                                                    {group.findings.map((f: any, fIdx: number) => {
                                                      const tCode = f.ticketId || f.ticket_id || `#TIC-${fIdx + 1}`;
                                                      const photo = f.photoUrl || f.photo || f.evidencePhoto || null;
                                                      const isSubExpanded = expandedFindingId === `${group.groupKey}_${tCode}_${fIdx}`;

                                                      return (
                                                        <div
                                                          key={f.id || tCode || fIdx}
                                                          className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5"
                                                        >
                                                          <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                                                                {tCode}
                                                              </span>
                                                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                                                {f.status || 'OPEN'}
                                                              </span>
                                                              {f.location && (
                                                                <span className="flex items-center gap-0.5 text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded font-medium truncate max-w-[150px]">
                                                                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                                                  <span className="truncate">{f.location}</span>
                                                                </span>
                                                              )}
                                                            </div>

                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                              {photo && (
                                                                <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                    setLightboxData({
                                                                      isOpen: true,
                                                                      title: `Bukti Temuan ${tCode}`,
                                                                      subtitle: `${f.category || 'Temuan K3'} • ${f.location || ''}`,
                                                                      images: [{ url: photo, label: f.description || 'Foto Temuan' }],
                                                                      currentIndex: 0
                                                                    });
                                                                  }}
                                                                  className="text-[10.5px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                                >
                                                                  <Camera className="w-3 h-3" />
                                                                  <span>Foto</span>
                                                                </button>
                                                              )}
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  if (onNav) onNav('sap-dashboard');
                                                                  else navigate('/sap-dashboard');
                                                                }}
                                                                className="text-[10.5px] font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                              >
                                                                <span>Tindak Lanjut</span>
                                                                <ChevronRight className="w-3 h-3" />
                                                              </button>
                                                            </div>
                                                          </div>

                                                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                                                            {String(f.description || '').replace(/^1[\.\)]\s*/, '').trim() || 'Tidak ada deskripsi rinci.'}
                                                          </p>

                                                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                                            <span>Pelapor: <strong className="text-slate-600 dark:text-slate-300">{f.inspectorName || f.requestorName || '-'}</strong></span>
                                                            {f.date && <span>• {String(f.date).slice(0, 10)}</span>}
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

                                        // B. SINGLE FINDING CARD (Single non-clustered issue)
                                        const singleFinding = group.findings[0];
                                        const isHigh = (singleFinding.priority || '').toUpperCase() === 'HIGH' || 
                                                       (singleFinding.risk || '').toLowerCase().includes('tinggi') || 
                                                       (singleFinding.risk || '').toLowerCase().includes('fatality');
                                        const photoSrc = singleFinding.photoUrl || singleFinding.photo || singleFinding.evidencePhoto || null;
                                        const ticketCode = singleFinding.ticketId || singleFinding.ticket_id || `#TIC-${gIdx + 1}`;
                                        const isProgress = (singleFinding.status || '').toUpperCase() === 'PROGRESS';
                                        const itemKey = String(singleFinding.id || ticketCode || gIdx);
                                        const isItemExpanded = expandedFindingId === itemKey;
                                        const rawDesc = String(singleFinding.description || '').replace(/^1[\.\)]\s*/, '').replace(/[\r\n]+/g, ' ').trim();

                                        return (
                                          <div
                                            key={itemKey}
                                            className={`rounded-xl border transition-all shadow-2xs overflow-hidden ${
                                              isItemExpanded 
                                                ? 'bg-white dark:bg-slate-800 border-rose-300 dark:border-rose-800 ring-1 ring-rose-400/20' 
                                                : 'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700/80'
                                            }`}
                                          >
                                            {/* Single Accordion Header */}
                                            <div
                                              onClick={() => setExpandedFindingId(prev => prev === itemKey ? null : itemKey)}
                                              className="flex items-center justify-between p-2 sm:p-2.5 px-3 cursor-pointer select-none gap-2"
                                            >
                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0">
                                                  {ticketCode}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                                                  isProgress 
                                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25'
                                                }`}>
                                                  {singleFinding.status || 'OPEN'}
                                                </span>
                                                {isHigh && (
                                                  <span className="bg-rose-600 text-white text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0">
                                                    High
                                                  </span>
                                                )}
                                                {singleFinding.category && (
                                                  <span className="text-[9.5px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200/60 dark:border-teal-800/60 shrink-0 hidden sm:inline-block truncate max-w-[140px]">
                                                    {singleFinding.category}
                                                  </span>
                                                )}
                                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate min-w-0 hidden md:inline">
                                                  {rawDesc || 'Tidak ada deskripsi'}
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-2 shrink-0">
                                                {singleFinding.location && (
                                                  <span className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md font-medium truncate max-w-[120px] sm:max-w-none">
                                                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                                    <span className="truncate">{singleFinding.location}</span>
                                                  </span>
                                                )}
                                                <div className="w-5 h-5 rounded-md flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500">
                                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isItemExpanded ? 'rotate-180 text-rose-600' : ''}`} />
                                                </div>
                                              </div>
                                            </div>

                                            {/* Single Accordion Body */}
                                            {isItemExpanded && (
                                              <div className="p-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-850/60 space-y-2 animate-in fade-in duration-150">
                                                {singleFinding.category && (
                                                  <div className="sm:hidden text-[10px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200/60 dark:border-teal-800/60 inline-block">
                                                    {singleFinding.category}
                                                  </div>
                                                )}

                                                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                                                  <CompactFindingPreview description={singleFinding.description} maxItems={5} />
                                                </div>

                                                {singleFinding.recommendation && (
                                                  <p className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/30 p-2 rounded-lg border border-teal-100 dark:border-teal-900/40">
                                                    <strong className="font-semibold">Rekomendasi Tindakan:</strong> {singleFinding.recommendation}
                                                  </p>
                                                )}

                                                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                                                  <span className="truncate">
                                                    Pelapor: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{singleFinding.inspectorName || singleFinding.requestorName || '-'}</strong>
                                                    {singleFinding.date ? ` • ${String(singleFinding.date).slice(0, 10)}` : ''}
                                                  </span>

                                                  <div className="flex items-center gap-2 shrink-0">
                                                    {photoSrc && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setLightboxData({
                                                            isOpen: true,
                                                            title: `Bukti Temuan ${ticketCode}`,
                                                            subtitle: `${singleFinding.category || 'Temuan K3'} • ${singleFinding.location || ''}`,
                                                            images: [{ url: photoSrc, label: singleFinding.description || 'Foto Temuan' }],
                                                            currentIndex: 0
                                                          });
                                                        }}
                                                        className="inline-flex items-center gap-1 font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                                                      >
                                                        <Camera className="w-3 h-3" />
                                                        <span>Lihat Foto</span>
                                                      </button>
                                                    )}

                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        if (onNav) onNav('sap-dashboard');
                                                        else navigate('/sap-dashboard');
                                                      }}
                                                      className="inline-flex items-center gap-0.5 font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                                                    >
                                                      <span>Tindak Lanjut</span>
                                                      <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Rincian training WARNING / EXPIRED (tetap tampil sampai training diperbarui) */}
                  {cat.id === 'training' && (
                    <ul className="ml-4 sm:ml-10 space-y-1">
                      {trainingAlerts.map(a => (
                        <li
                          key={`${a.program}-${a.key}`}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">{a.desc}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Training {fmtTrainingDate(a.date)} · {a.state === 'expired' ? 'expired sejak' : 'berlaku s/d'} {fmtTrainingDate(a.expiryDate)}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                            a.state === 'expired'
                              ? 'bg-red-600 text-white border-red-700'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}>
                            {a.state === 'expired' ? 'EXPIRED' : 'WARNING'}
                          </span>
                        </li>
                      ))}
                      <li className="px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Hubungi Admin / Safety untuk jadwal training ulang. Item ini hilang otomatis setelah tanggal training diperbarui.
                      </li>
                    </ul>
                  )}
                  </React.Fragment>
                ))}

                {/* Tombol opsi membuka tugas yang telah selesai periode ini */}
                {completedCategories.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCompleted(prev => !prev)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{showCompleted ? 'Sembunyikan' : 'Lihat'} {completedCategories.length} Tugas Selesai Periode Ini</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCompleted ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox Modal for viewing proof screenshots */}
      
      {/* ── MODAL DAFTAR LAPORAN KERUSAKAN UNIT LV ── */}
      {showLvDamageModal && (
        <div 
          onClick={() => setShowLvDamageModal(false)}
          className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl sm:max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
          >
            {/* Top Accent Strip */}
            <div className="h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 shrink-0" />

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-2xs">
                  <Car className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Laporan Kerusakan Unit LV
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {lvDamageTickets.length} Laporan Aktif
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Daftar laporan kerusakan sarana unit LV yang memerlukan penanganan maintenance
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLvDamageModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - List of LV Damage Reports */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {lvDamageTickets.map((ticket: any, idx: number) => {
                const parsed = parseLvTicket(ticket);
                const isHigh = (ticket.priority || '').toUpperCase() === 'HIGH' || (ticket.risk || '').toLowerCase().includes('tinggi');
                const photoSrc = ticket.photoUrl || ticket.photo_url;
                const formattedImg = photoSrc ? formatProofImageUrl(photoSrc) : '';

                return (
                  <div
                    key={ticket.id || ticket.ticketId || ticket.ticket_id || idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/70 border border-slate-200 dark:border-slate-800 hover:border-rose-400/50 dark:hover:border-rose-500/50 transition-all shadow-xs space-y-3"
                  >
                    {/* Top Row: Ticket ID, Status, Priority & Date */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {ticket.ticketId || ticket.ticket_id || `LV-${idx + 1}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          {ticket.status || 'OPEN'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isHigh 
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/35' 
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35'
                        }`}>
                          Prioritas: {ticket.priority || 'Medium'}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium ml-auto">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{parsed.formattedDate}</span>
                      </span>
                    </div>

                    {/* Unit Info Box */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800/80 p-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                          Unit / Kendaraan
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                          {parsed.unitName}
                        </span>
                      </div>
                      {ticket.category && (
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[180px] hidden sm:inline-block">
                          {ticket.category}
                        </span>
                      )}
                    </div>

                    {/* Damage Description */}
                    <div className="p-3 rounded-xl bg-rose-500/5 dark:bg-rose-950/25 border border-rose-500/20 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-black uppercase text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Rincian Kerusakan</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                        {parsed.damageDetail}
                      </p>
                    </div>

                    {/* Reporter Info */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1.5 truncate">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Pelapor: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{ticket.requestorName || ticket.requestor_name || '-'}</strong></span>
                      </span>
                    </div>

                    {/* Photo Evidence if Available */}
                    {formattedImg && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-slate-400" />
                          <span>Foto Bukti Kerusakan (Klik untuk memperbesar):</span>
                        </span>
                        <div 
                          onClick={() => {
                            setLightboxData({
                              isOpen: true,
                              title: `Bukti Kerusakan: ${parsed.unitName}`,
                              subtitle: `${ticket.ticketId || ticket.ticket_id} • Pelapor: ${ticket.requestorName || ticket.requestor_name || '-'}`,
                              images: [{
                                url: photoSrc,
                                label: parsed.unitName,
                                description: parsed.damageDetail
                              }],
                              currentIndex: 0
                            });
                          }}
                          className="relative h-44 sm:h-52 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900/5 group cursor-pointer"
                        >
                          <img
                            src={formattedImg}
                            alt="Bukti Kerusakan"
                            onError={(e) => {
                              const raw = photoSrc;
                              const driveMatch = raw?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw?.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                              if (driveMatch) {
                                e.currentTarget.src = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                            <Eye className="w-4 h-4" />
                            <span>Perbesar Foto</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons for this card */}
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      {photoSrc && (
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxData({
                              isOpen: true,
                              title: `Bukti Kerusakan: ${parsed.unitName}`,
                              subtitle: `${ticket.ticketId || ticket.ticket_id} • Pelapor: ${ticket.requestorName || ticket.requestor_name || '-'}`,
                              images: [{
                                url: photoSrc,
                                label: parsed.unitName,
                                description: parsed.damageDetail
                              }],
                              currentIndex: 0
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Lihat Foto Penuh</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowLvDamageModal(false);
                          try {
                            sessionStorage.setItem('wo_selected_tool', parsed.unitName);
                            sessionStorage.setItem('wo_filter_search', parsed.unitName);
                          } catch {}
                          if (onNav) onNav('wo-maintenance-dashboard');
                          else navigate('/wo-maintenance-dashboard');
                        }}
                        className="ml-auto px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        title="Tindak lanjuti dengan membuka dashboard / membuat WO"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Tindak Lanjut / Buat WO</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                Total <strong className="text-rose-600 font-bold">{lvDamageTickets.length} laporan</strong> unit LV aktif
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowLvDamageModal(false);
                    if (onNav) onNav('wo-maintenance-dashboard');
                    else navigate('/wo-maintenance-dashboard');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>Buka Dashboard WO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLvDamageModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {lightboxData && lightboxData.isOpen && (
        <div 
          onClick={() => setLightboxData(null)}
          className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0 pr-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {lightboxData.title}
                </h4>
                {lightboxData.subtitle && (
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    {lightboxData.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxData(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image viewport */}
            <div className="flex-1 bg-black/95 p-2 flex items-center justify-center overflow-auto min-h-[260px] max-h-[68vh] relative">
              {lightboxData.images[lightboxData.currentIndex] && (
                <img
                  src={formatProofImageUrl(lightboxData.images[lightboxData.currentIndex].url)}
                  alt="Bukti Screenshot"
                  onError={(e) => {
                    const raw = lightboxData.images[lightboxData.currentIndex]?.url;
                    const driveMatch = raw?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw?.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                    if (driveMatch) {
                      e.currentTarget.src = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
                    }
                  }}
                  className="max-w-full max-h-[64vh] object-contain rounded-xl shadow-lg"
                />
              )}

              {/* Prev / Next controls if multiple images */}
              {lightboxData.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxData(prev => prev ? {
                        ...prev,
                        currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
                      } : null);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxData(prev => prev ? {
                        ...prev,
                        currentIndex: (prev.currentIndex + 1) % prev.images.length
                      } : null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer shadow-md"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Pagination / Thumbnails & Footer Actions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                {lightboxData.images.length > 1 && (
                  <span className="font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {lightboxData.currentIndex + 1} / {lightboxData.images.length}
                  </span>
                )}
                <span className="truncate max-w-[200px]">
                  {lightboxData.images[lightboxData.currentIndex]?.description || lightboxData.images[lightboxData.currentIndex]?.label || 'Screenshot Terlampir'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={lightboxData.images[lightboxData.currentIndex]?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Asli</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const imgUrl = lightboxData.images[lightboxData.currentIndex]?.url;
                    if (imgUrl) {
                      const a = document.createElement('a');
                      a.href = imgUrl;
                      a.download = `Bukti_${Date.now()}.jpg`;
                      a.click();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
