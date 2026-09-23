import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ClipboardCheck, Clock, ShieldCheck, UserCheck, ChevronRight, 
  ExternalLink, Search, X, RefreshCw, Sparkles, CheckCircle2, AlertCircle, 
  Users, Camera, ShieldAlert, AlertTriangle, Image as ImageIcon, Send, Trash2, Check,
  ChevronDown, ChevronUp, Calendar, ClipboardList, ThermometerSun, ArrowRight, FileText,
  Download, Eye, Sun, Upload
} from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';
import { compressImage } from '../features/inspections/hooks/useInspection';
import { getKtaObligation, formatKtaImageUrl } from './GroupReportScreen';
import { triggerExpGain } from '../lib/gamificationEvents';

interface SchedulePartner {
  no?: number;
  name: string;
  jabatan: string;
  shift?: string;
  roleIndex: number;
  roleLabel?: string;
}

interface ScheduleItem {
  no: number;
  name: string;
  jabatan: string;
  shift: string;
  roleIndex: number;
  inspeksi: string;
  isCuti: boolean;
  isCompleted?: boolean;
  completedAt?: string;
  completedPdfUrl?: string;
  completedInspector?: string;
  completedFormTitle?: string;
  completedLocation?: string;
  hasSsProof?: boolean;
  ssProofUrl?: string | null;
  ssProofDate?: string | null;
  partners?: SchedulePartner[];
  formInfo?: {
    formId: string;
    tipe: string;
    formTitle: string;
    subArea?: string;
  } | null;
}

interface InspectionScheduleCardProps {
  inspectorName: string;
  inspectorNik?: string;
  isAdminOrDeveloper?: boolean;
  onNavigateToInspection?: (formId?: string, subArea?: string) => void;
  onNavigateToKta?: () => void;
  onNavigateToP5m?: () => void;
  onNavigateToP2h?: () => void;
  onNavigateToPemantauan?: () => void;
}

function getLocalISOWeekTag(d: Date = new Date(), advanceOnWeekend = true): string {
  const date = new Date(d.getTime());
  if (advanceOnWeekend && (date.getDay() === 0 || date.getDay() === 6)) {
    const daysToAdd = date.getDay() === 6 ? 2 : 1;
    date.setDate(date.getDate() + daysToAdd);
  }
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `W${weekNum}`;
}

const GENERAL_INSPECTION_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform';
const SAFETY_KTA_FORM_URL = 'https://docs.google.com/forms/d/1YMympG3aA-8l978aAlRJFSoi-SVQAKiS7KmJjNRfuBI/viewform?edit_requested=true';

export function InspectionScheduleCard({ 
  inspectorName, 
  inspectorNik, 
  isAdminOrDeveloper, 
  onNavigateToInspection,
  onNavigateToKta,
  onNavigateToP5m,
  onNavigateToP2h,
  onNavigateToPemantauan
}: InspectionScheduleCardProps) {
  const [currentWeekTag, setCurrentWeekTag] = useState<string>(() => getLocalISOWeekTag(new Date(), true));

  // Instant SWR Hydration: Render immediately from cache if available (0ms load time)
  const [mySchedule, setMySchedule] = useState<ScheduleItem | null>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_my_schedule');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('p2h_cached_my_schedule');
    } catch {
      return true;
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [allSchedules, setAllSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_all_schedules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showFullScheduleModal, setShowFullScheduleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [selectedSheet, setSelectedSheet] = useState<string>('CurrentWeek');
  const [loadingSheet, setLoadingSheet] = useState<boolean>(false);

  // Status Bukti SS General Inspeksi (Cached)
  const [hasSsProof, setHasSsProof] = useState<boolean>(() => {
    try {
      return localStorage.getItem('p2h_cached_has_ss_proof') === 'true';
    } catch {
      return false;
    }
  });
  const [ssProofUrl, setSsProofUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('p2h_cached_ss_proof_url') || null;
    } catch {
      return null;
    }
  });

  // Status Rekap KTA / TTA (Cached)
  const [ktaLoading, setKtaLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('p2h_cached_kta_record');
    } catch {
      return true;
    }
  });
  const [myKtaRecord, setMyKtaRecord] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_kta_record');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Status P5M (Cached)
  const [p5mAssignment, setP5mAssignment] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_p5m_assignment');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [p5mLoading, setP5mLoading] = useState(false);

  // Status Tugas Harian (P2H & Pemantauan) dan Roster Hari Ini (Cached)
  const [dailyTasks, setDailyTasks] = useState<{
    rosterToday?: {
      date: string;
      shiftCode: string;
      isOnsite: boolean;
      isCuti: boolean;
      statusLabel: string;
      rawStatus: string;
    };
    p2h: { completedToday: boolean; myCountToday: number; deptCompletedToday: boolean; deptCountToday: number; lastRecord: any };
    pemantauan: { completedToday: boolean; suhuCompleted: boolean; gasCompleted: boolean; petugas: string | null; jam: string | null; shift: string | null; totalRecords: number };
  } | null>(() => {
    try {
      const saved = localStorage.getItem('p2h_cached_daily_tasks');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [dailyTasksLoading, setDailyTasksLoading] = useState(false);

  // Modal Upload Bukti SS State
  const [showSsModal, setShowSsModal] = useState(false);
  const [ssImageFile, setSsImageFile] = useState<File | null>(null);
  const [ssImagePreview, setSsImagePreview] = useState<string | null>(null);
  const [isSubmittingSs, setIsSubmittingSs] = useState(false);
  const isSubmittingSsRef = useRef(false);

  // Modal Upload Bukti KTA State
  const [showKtaModal, setShowKtaModal] = useState(false);
  const [selectedKtaChecklist, setSelectedKtaChecklist] = useState<string[]>([]);
  const [ktaImageFile, setKtaImageFile] = useState<File | null>(null);
  const [ktaImagePreview, setKtaImagePreview] = useState<string | null>(null);
  const [isSubmittingKta, setIsSubmittingKta] = useState(false);
  const isSubmittingKtaRef = useRef(false);

  // Minimize / Compact Mode States (Persisted in localStorage, default: ringkas / true)
  const [isScheduleMinimized, setIsScheduleMinimized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('p2h_schedule_card_minimized');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isKtaMinimized, setIsKtaMinimized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('p2h_kta_card_minimized');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleScheduleMinimize = () => {
    setIsScheduleMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem('p2h_schedule_card_minimized', String(next)); } catch {}
      return next;
    });
  };

  const toggleKtaMinimize = () => {
    setIsKtaMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem('p2h_kta_card_minimized', String(next)); } catch {}
      return next;
    });
  };

  // Lightbox Preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // User Obligation
  const userRole = useMemo(() => {
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      return p.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '';
    } catch {
      return '';
    }
  }, []);

  const userSection = useMemo(() => {
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      return p.section || '';
    } catch {
      return '';
    }
  }, []);

  const myObligation = useMemo(() => {
    return getKtaObligation(inspectorNik, userRole, userSection);
  }, [inspectorNik, userRole, userSection]);

  // Admin / Dev Access check
  const hasAdminAccess = useMemo(() => {
    if (typeof isAdminOrDeveloper === 'boolean') return isAdminOrDeveloper;
    try {
      const profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      const jab = (profile.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
      const sec = (profile.section || '').toLowerCase();
      const nik = (inspectorNik || '').toUpperCase();
      const isDev = nik === '02D25000055' || nik === '02D24000043' || nik === 'PREPLABADMIN' || nik === 'SPVDEMO';
      const isAdmin = jab.includes('admin') || jab.includes('manager') || jab.includes('superintendent') || sec.includes('admin') || sec.includes('administrasi');
      return isDev || isAdmin;
    } catch {
      return false;
    }
  }, [isAdminOrDeveloper, inspectorNik]);

  const isPrepOrLabOrCrew = useMemo(() => {
    const sec = userSection.toLowerCase();
    const jab = userRole.toLowerCase();
    return sec.includes('prep') || sec.includes('preparasi') || sec.includes('lab') || sec.includes('maint') || jab.includes('crew') || hasAdminAccess;
  }, [userSection, userRole, hasAdminAccess]);

  const isLabOrQA = useMemo(() => {
    const sec = userSection.toLowerCase();
    return sec.includes('lab') || sec.includes('qa') || sec.includes('quality assurance') || sec.includes('maint') || hasAdminAccess;
  }, [userSection, hasAdminAccess]);

  const rosterToday = dailyTasks?.rosterToday;

  // Real-time roster status today:
  // D, DS, N, NS, OFF, LS, S = Onsite
  const isRosterOnsiteToday = useMemo(() => {
    if (!rosterToday) return false;
    if (rosterToday.isOnsite) return true;
    const code = (rosterToday.shiftCode || '').trim().toUpperCase();
    return ['D', 'DS', 'N', 'NS', 'OFF', 'LS', 'S'].includes(code);
  }, [rosterToday]);

  // Genuine leave today based on daily roster:
  // CT, C, TRV, etc.
  const isRosterCutiToday = useMemo(() => {
    if (isRosterOnsiteToday) return false;
    if (rosterToday) return Boolean(rosterToday.isCuti);
    return false;
  }, [rosterToday, isRosterOnsiteToday]);

  // Weekly inspection sheet status (made for the whole week):
  // True ONLY IF the employee has a confirmed cuti status for the entire weekly inspection schedule
  const isWeeklyInspectionExempt = useMemo(() => {
    if (!mySchedule) return false;
    return Boolean(
      mySchedule.isCuti || 
      mySchedule.inspeksi?.toLowerCase().includes('cuti') ||
      mySchedule.shift?.toLowerCase().includes('cuti')
    );
  }, [mySchedule]);

  // isWeeklyCuti: True only if weekly duties are exempt
  const isWeeklyCuti = isWeeklyInspectionExempt;

  // Transition from cuti:
  // User is already Onsite today (e.g. started Tuesday), but is exempt from weekly inspection/KTA
  // because on Monday they were still on leave when the weekly schedule was planned.
  const isTransitionFromCuti = useMemo(() => {
    return isRosterOnsiteToday && isWeeklyCuti;
  }, [isRosterOnsiteToday, isWeeklyCuti]);

  // isUserCuti alias for weekly cards (Inspeksi & KTA)
  const isUserCuti = isWeeklyCuti;

  // Synchronize KTA cuti state only when weekly status is truly exempt
  useEffect(() => {
    if (isWeeklyCuti) {
      setMyKtaRecord(prev => {
        if (prev?.isCuti && prev?.status === 'CUTI') return prev;
        return prev ? { ...prev, isCuti: true, status: 'CUTI' } : { isCuti: true, status: 'CUTI' };
      });
    }
  }, [isWeeklyCuti]);

  const hasP5mAssignment = useMemo(() => {
    return Boolean(
      p5mAssignment && (
        p5mAssignment.isAssigned || 
        p5mAssignment.day || 
        p5mAssignment.dayName || 
        p5mAssignment.materi || 
        p5mAssignment.topicTitle
      )
    );
  }, [p5mAssignment]);

  const progressStats = useMemo(() => {
    let total = 3;
    let completed = 0;

    const inspectionDone = Boolean(mySchedule?.isCompleted || hasSsProof || isWeeklyInspectionExempt);
    if (inspectionDone) completed++;

    const ktaDone = Boolean(myKtaRecord?.hasSubmitted || (myKtaRecord?.count || 0) > 0 || myKtaRecord?.status === 'TERPENUHI' || myKtaRecord?.status === 'SUDAH' || isWeeklyInspectionExempt);
    if (ktaDone) completed++;

    const isP5mPassed = Boolean(
      p5mAssignment?.isPast || 
      (p5mAssignment?.assignmentDate && new Date().toISOString().split('T')[0] >= p5mAssignment.assignmentDate)
    );
    const p5mDone = hasP5mAssignment ? isP5mPassed : true;
    if (p5mDone) completed++;

    const weeklyTotal = 3;
    const weeklyCompleted = completed;

    let dailyTotal = 0;
    let dailyCompleted = 0;
    if (isPrepOrLabOrCrew) {
      total++;
      dailyTotal++;
      if (isRosterCutiToday || dailyTasks?.p2h?.completedToday || dailyTasks?.p2h?.deptCompletedToday) {
        completed++;
        dailyCompleted++;
      }
    }

    if (isLabOrQA) {
      total++;
      dailyTotal++;
      if (isRosterCutiToday || dailyTasks?.pemantauan?.completedToday) {
        completed++;
        dailyCompleted++;
      }
    }

    const percentage = Math.round((completed / total) * 100);

    return {
      total,
      completed,
      percentage,
      pct: percentage,
      weeklyTotal,
      weeklyCompleted,
      dailyTotal,
      dailyCompleted,
      inspectionDone,
      ktaDone,
      p5mDone,
      hasP5mAssignment,
      isRosterOnsiteToday,
      isRosterCutiToday,
      isTransitionFromCuti
    };
  }, [mySchedule, hasSsProof, myKtaRecord, p5mAssignment, hasP5mAssignment, dailyTasks, isPrepOrLabOrCrew, isLabOrQA, isRosterCutiToday, isWeeklyInspectionExempt, isRosterOnsiteToday, isTransitionFromCuti]);

  // Fetch SS Proof directly from /api/inspection-proofs
  const fetchSsProof = async () => {
    if (!inspectorNik && !inspectorName) return;
    try {
      const res = await fetch(`/api/inspection-proofs?week=${currentWeekTag}`);
      if (res.ok) {
        const proofs: any[] = await res.json();
        const cleanNik = (inspectorNik || '').trim().toLowerCase();
        const cleanName = (inspectorName || '').trim().toLowerCase();
        const found = proofs.find(p => {
          const pNik = (p.nik || '').trim().toLowerCase();
          const pName = (p.name || '').trim().toLowerCase();
          if (cleanNik && pNik === cleanNik) return true;
          if (cleanName && pName === cleanName) return true;
          if (cleanName && pName) {
            const selfParts = cleanName.split(/\s+/).filter(Boolean);
            const pParts = pName.split(/\s+/).filter(Boolean);
            if (selfParts.length >= 2 && pParts.length >= 2 && selfParts.every(part => pName.includes(part))) return true;
            if (selfParts.length >= 2 && pParts.length >= 2 && pParts.every(part => cleanName.includes(part))) return true;
          }
          return false;
        });

        if (found) {
          setHasSsProof(true);
          setSsProofUrl(found.imageUrl || null);
          try {
            localStorage.setItem('p2h_cached_has_ss_proof', 'true');
            if (found.imageUrl) localStorage.setItem('p2h_cached_ss_proof_url', found.imageUrl);
          } catch {}
        } else {
          setHasSsProof(false);
          setSsProofUrl(null);
          try {
            localStorage.setItem('p2h_cached_has_ss_proof', 'false');
            localStorage.removeItem('p2h_cached_ss_proof_url');
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Failed to fetch inspection proofs:', e);
    }
  };

  // Handler untuk membuka Bukti Screenshot di Lightbox secara instan
  const handleViewSsProof = async () => {
    if (ssProofUrl) {
      setLightboxUrl(ssProofUrl);
      return;
    }
    const cachedUrl = localStorage.getItem('p2h_cached_ss_proof_url');
    if (cachedUrl) {
      setSsProofUrl(cachedUrl);
      setLightboxUrl(cachedUrl);
      return;
    }
    try {
      const res = await fetch(`/api/inspection-proofs?week=${currentWeekTag}`);
      if (res.ok) {
        const proofs: any[] = await res.json();
        const cleanNik = (inspectorNik || '').trim().toLowerCase();
        const cleanName = (inspectorName || '').trim().toLowerCase();
        const found = proofs.find(p => {
          const pNik = (p.nik || '').trim().toLowerCase();
          const pName = (p.name || '').trim().toLowerCase();
          if (cleanNik && pNik === cleanNik) return true;
          if (cleanName && pName === cleanName) return true;
          if (cleanName && pName) {
            const selfParts = cleanName.split(/\s+/).filter(Boolean);
            const pParts = pName.split(/\s+/).filter(Boolean);
            if (selfParts.length >= 2 && pParts.length >= 2 && selfParts.every(part => pName.includes(part))) return true;
            if (selfParts.length >= 2 && pParts.length >= 2 && pParts.every(part => cleanName.includes(part))) return true;
          }
          return false;
        });

        if (found?.imageUrl) {
          setHasSsProof(true);
          setSsProofUrl(found.imageUrl);
          try {
            localStorage.setItem('p2h_cached_has_ss_proof', 'true');
            localStorage.setItem('p2h_cached_ss_proof_url', found.imageUrl);
          } catch {}
          setLightboxUrl(found.imageUrl);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to resolve screenshot image:', e);
    }
    setShowSsModal(true);
  };

  // Fetch KTA Status from /api/rekap-kta with silent background update
  const fetchKtaStatus = async (force = false) => {
    if (!myKtaRecord && !force) setKtaLoading(true);
    try {
      const res = await fetch(`/api/rekap-kta?week=${currentWeekTag}${force ? '&refresh=true' : ''}`);
      if (res.ok) {
        const json = await res.json();
        const cleanNik = (inspectorNik || '').trim().toLowerCase();
        const cleanName = (inspectorName || '').trim().toLowerCase();

        const match = (json.rekapList || []).find((r: any) => {
          const rNik = (r.nik || '').trim().toLowerCase();
          const rName = (r.name || '').trim().toLowerCase();
          return (cleanNik && rNik === cleanNik) || (cleanName && (rName.includes(cleanName) || cleanName.includes(rName)));
        });

        const cutiMatch = (json.cutiList || []).find((c: any) => {
          const cNik = (c.nik || '').trim().toLowerCase();
          const cName = (c.name || '').trim().toLowerCase();
          return (cleanNik && cNik === cleanNik) || (cleanName && (cName.includes(cleanName) || cleanName.includes(cName)));
        });

        const scheduleCuti = Boolean(
          mySchedule?.isCuti || 
          mySchedule?.inspeksi?.toLowerCase().includes('cuti') ||
          mySchedule?.shift?.toLowerCase().includes('cuti')
        );

        let targetRecord: any = null;
        if (scheduleCuti || cutiMatch) {
          targetRecord = { ...(cutiMatch || match || {}), isCuti: true, status: 'CUTI' };
        } else if (match) {
          targetRecord = match;
        } else if (cutiMatch && !scheduleCuti) {
          // Penyelarasan: Jika personil memiliki jadwal inspeksi aktif, mereka tetap AKTIF untuk KTA/TTA
          targetRecord = { ...cutiMatch, isCuti: false, status: cutiMatch.reports?.length ? 'SUDAH' : 'BELUM' };
        }

        setMyKtaRecord(targetRecord);
        try {
          if (targetRecord) {
            localStorage.setItem('p2h_cached_kta_record', JSON.stringify(targetRecord));
          } else {
            localStorage.removeItem('p2h_cached_kta_record');
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to fetch KTA status:', e);
    } finally {
      setKtaLoading(false);
    }
  };

  const fetchSchedule = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else if (!mySchedule) setLoading(true);

    try {
      const q = new URLSearchParams();
      if (inspectorName) q.append('name', inspectorName);
      if (inspectorNik) q.append('nik', inspectorNik);
      if (forceRefresh) q.append('refresh', 'true');

      // Fetch personal schedule
      const res = await fetch(`/api/inspection-schedule?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.week && json.week !== currentWeekTag) {
          setCurrentWeekTag(json.week);
        }
        if (json.found && json.schedule) {
          setMySchedule(json.schedule);
          try { localStorage.setItem('p2h_cached_my_schedule', JSON.stringify(json.schedule)); } catch {}

          if (json.rosterToday) {
            setDailyTasks((prev: any) => ({
              ...(prev || {
                p2h: { completedToday: false, myCountToday: 0, deptCompletedToday: false, deptCountToday: 0, lastRecord: null },
                pemantauan: { completedToday: false, suhuCompleted: false, gasCompleted: false, petugas: null, jam: null, shift: null, totalRecords: 0 }
              }),
              rosterToday: json.rosterToday
            }));
          }
          
          const isSchedCuti = Boolean(
            json.schedule.isCuti || 
            json.schedule.inspeksi?.toLowerCase().includes('cuti') ||
            json.schedule.shift?.toLowerCase().includes('cuti')
          );
          if (isSchedCuti) {
            setMyKtaRecord(prev => {
              if (prev?.isCuti && prev?.status === 'CUTI') return prev;
              return prev ? { ...prev, isCuti: true, status: 'CUTI' } : { isCuti: true, status: 'CUTI' };
            });
          }
          if (json.schedule.hasSsProof) {
            setHasSsProof(true);
            try { localStorage.setItem('p2h_cached_has_ss_proof', 'true'); } catch {}
            if (json.schedule.ssProofUrl) {
              setSsProofUrl(json.schedule.ssProofUrl);
              try { localStorage.setItem('p2h_cached_ss_proof_url', json.schedule.ssProofUrl); } catch {}
            }
          } else {
            setHasSsProof(false);
            setSsProofUrl(null);
            try {
              localStorage.setItem('p2h_cached_has_ss_proof', 'false');
              localStorage.removeItem('p2h_cached_ss_proof_url');
            } catch {}
          }
        } else {
          setMySchedule(null);
          try { localStorage.removeItem('p2h_cached_my_schedule'); } catch {}
        }
      }

      // Immediately unblock personal card UI
      setLoading(false);

      // Pre-fetch all schedules for modal viewer in background WITHOUT blocking UI
      if (hasAdminAccess) {
        fetch(`/api/inspection-schedule${forceRefresh ? '?refresh=true' : ''}`)
          .then(r => r.ok ? r.json() : null)
          .then(jsonAll => {
            if (jsonAll?.data) {
              setAllSchedules(jsonAll.data);
              try { localStorage.setItem('p2h_cached_all_schedules', JSON.stringify(jsonAll.data)); } catch {}
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error('Failed to fetch inspection schedule:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSwitchModalSheet = async (sheet: string) => {
    if (sheet === selectedSheet && !loadingSheet) return;
    setSelectedSheet(sheet);
    setLoadingSheet(true);
    try {
      const res = await fetch(`/api/inspection-schedule?sheet=${encodeURIComponent(sheet)}&refresh=true`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setAllSchedules(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to switch sheet:', err);
    } finally {
      setLoadingSheet(false);
    }
  };

  const fetchP5mAssignment = async () => {
    if (!inspectorNik && !inspectorName) return;
    try {
      setP5mLoading(true);
      const params = new URLSearchParams();
      if (inspectorNik) params.set('nik', inspectorNik);
      if (inspectorName) params.set('name', inspectorName);
      params.set('includePast', 'true');
      const res = await fetch(`/api/p5m/schedules/user-assignment?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setP5mAssignment(data.assignment || null);
          try {
            if (data.assignment) {
              localStorage.setItem('p2h_cached_p5m_assignment', JSON.stringify(data.assignment));
            } else {
              localStorage.removeItem('p2h_cached_p5m_assignment');
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Failed to fetch P5M assignment:', e);
    } finally {
      setP5mLoading(false);
    }
  };

  const fetchDailyTasks = async () => {
    try {
      setDailyTasksLoading(true);
      const params = new URLSearchParams();
      if (inspectorNik) params.set('nik', inspectorNik);
      if (inspectorName) params.set('name', inspectorName);
      const res = await fetch(`/api/daily-tasks-status?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDailyTasks(data);
          try {
            localStorage.setItem('p2h_cached_daily_tasks', JSON.stringify(data));
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Failed to fetch daily tasks status:', e);
    } finally {
      setDailyTasksLoading(false);
    }
  };

  const handleRefreshAll = () => {
    fetchSchedule(true);
    fetchSsProof();
    fetchKtaStatus(true);
    fetchP5mAssignment();
    fetchDailyTasks();
  };

  useEffect(() => {
    fetchSchedule();
    fetchSsProof();
    fetchKtaStatus();
    fetchP5mAssignment();
    fetchDailyTasks();
  }, [inspectorName, inspectorNik, currentWeekTag]);

  // Listen for global open team schedule modal (e.g. from right rail / admin quick button)
  useEffect(() => {
    const handleOpenTeamSchedule = () => {
      if (hasAdminAccess) {
        setShowFullScheduleModal(true);
      } else {
        toast.error('Akses Jadwal Tim hanya untuk Tim Administrasi dan Developer.');
      }
    };
    window.addEventListener('open-team-schedule-modal', handleOpenTeamSchedule);
    return () => window.removeEventListener('open-team-schedule-modal', handleOpenTeamSchedule);
  }, [hasAdminAccess]);

  // Handle global paste event when modals are open
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (showSsModal) {
              setSsImageFile(file);
              const reader = new FileReader();
              reader.onload = (ev) => setSsImagePreview(ev.target?.result as string);
              reader.readAsDataURL(file);
              toast.success('Screenshot General Inspeksi berhasil ditempel dari clipboard!');
            } else if (showKtaModal) {
              setKtaImageFile(file);
              const reader = new FileReader();
              reader.onload = (ev) => setKtaImagePreview(ev.target?.result as string);
              reader.readAsDataURL(file);
              toast.success('Screenshot KTA/TTA berhasil ditempel dari clipboard!');
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showSsModal, showKtaModal]);

  // Set default checklist when KTA modal opens
  const prevShowKtaModalRef = useRef(false);
  useEffect(() => {
    if (showKtaModal && !prevShowKtaModalRef.current) {
      if (myObligation.type === '1_KTA_OR_TTA') {
        setSelectedKtaChecklist(['KTA']);
      } else if (myObligation.type === '2_TTA') {
        const c1 = myKtaRecord?.checkDetails?.check1Done;
        const c2 = myKtaRecord?.checkDetails?.check2Done;
        if (!c1 && !c2) setSelectedKtaChecklist(['TTA_1', 'TTA_2']);
        else if (!c1) setSelectedKtaChecklist(['TTA_1']);
        else if (!c2) setSelectedKtaChecklist(['TTA_2']);
        else setSelectedKtaChecklist(['TTA_1', 'TTA_2']);
      } else {
        const hasK = myKtaRecord?.checkDetails?.check1Done;
        const hasT = myKtaRecord?.checkDetails?.check2Done;
        if (!hasK && !hasT) setSelectedKtaChecklist(['KTA', 'TTA']);
        else if (!hasK) setSelectedKtaChecklist(['KTA']);
        else if (!hasT) setSelectedKtaChecklist(['TTA']);
        else setSelectedKtaChecklist(['KTA', 'TTA']);
      }
    }
    prevShowKtaModalRef.current = showKtaModal;
  }, [showKtaModal, myObligation.type]);

  const handleStartInspection = () => {
    if (!mySchedule || mySchedule.isCuti) return;
    const formId = mySchedule.formInfo?.formId || '';
    const subArea = mySchedule.formInfo?.subArea || '';
    if (onNavigateToInspection) {
      onNavigateToInspection(formId, subArea);
    } else {
      window.location.href = `/weekly-inspection${formId ? `?formId=${encodeURIComponent(formId)}` : ''}`;
    }
  };

  // Submit Screenshot Form General Inspeksi
  const handleSubmitSsReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSsRef.current || isSubmittingSs) return;
    if (!ssImageFile && !ssImagePreview) {
      toast.error('Silakan pilih atau tempel (Ctrl+V) bukti screenshot form!');
      return;
    }

    try {
      isSubmittingSsRef.current = true;
      setIsSubmittingSs(true);
      toast.loading('Mengunggah screenshot bukti General Inspeksi...', { id: 'upload-ss' });

      let base64Data = ssImagePreview || '';
      if (ssImageFile) {
        base64Data = await compressImage(ssImageFile);
      }

      let uploadedUrl = base64Data;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: 'image/jpeg',
            filename: `SS_INSPEKSI_${inspectorNik || 'user'}_${currentWeekTag}_${Date.now()}.jpg`,
            folderName: 'Pelaporan SS General Inspeksi'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch (uErr) {
        console.warn('Fallback to direct base64 storage:', uErr);
      }

      const res = await fetch('/api/inspection-proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: inspectorNik || 'USER',
          name: inspectorName,
          section: userSection || 'Preparasi & Lab',
          date: new Date().toISOString().split('T')[0],
          week: currentWeekTag,
          imageUrl: uploadedUrl,
          description: 'Bukti Screenshot Form General Inspeksi'
        })
      });

      if (res.ok) {
        toast.success(`✅ Bukti screenshot Form General Inspeksi (${currentWeekTag}) berhasil diunggah!`, { id: 'upload-ss', duration: 5000 });
        setShowSsModal(false);
        setSsImageFile(null);
        setSsImagePreview(null);
        setHasSsProof(true);
        setSsProofUrl(uploadedUrl);
        // Refresh state
        fetchSchedule(true);
        fetchSsProof();
        window.dispatchEvent(new CustomEvent('refresh-group-reports'));
      } else {
        toast.error('Gagal menyimpan bukti SS Inspeksi', { id: 'upload-ss' });
      }
    } catch (err: any) {
      console.error('SS submit error:', err);
      const msg = err?.message || (typeof err === 'string' ? err : 'Gagal mengunggah bukti screenshot. Silakan coba lagi.');
      toast.error('Terjadi kesalahan: ' + msg, { id: 'upload-ss' });
    } finally {
      isSubmittingSsRef.current = false;
      setIsSubmittingSs(false);
    }
  };

  // Submit KTA / TTA Report
  const handleSubmitKtaReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingKtaRef.current || isSubmittingKta) return;
    if (!ktaImageFile && !ktaImagePreview) {
      toast.error('Silakan pilih atau tempel (Ctrl+V) tangkapan layar form KTA/TTA!');
      return;
    }
    if (selectedKtaChecklist.length === 0) {
      toast.error('Pilih minimal satu ceklis kewajiban!');
      return;
    }

    try {
      isSubmittingKtaRef.current = true;
      setIsSubmittingKta(true);
      toast.loading('Mengunggah bukti formulir KTA/TTA...', { id: 'upload-kta' });

      let base64Data = ktaImagePreview || '';
      if (ktaImageFile) {
        try {
          const compressed = await compressImage(ktaImageFile);
          if (compressed) base64Data = compressed;
        } catch (cErr) {
          console.warn('Compression failed, using preview:', cErr);
        }
      }

      let uploadedUrl = base64Data;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: 'image/jpeg',
            filename: `KTA_TTA_${inspectorNik || 'user'}_${currentWeekTag}_${Date.now()}.jpg`,
            folderName: 'Laporan KTA TTA Harita'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch (uErr) {
        console.warn('Fallback to direct base64 storage:', uErr);
      }

      // Submit reports for all selected checklist items
      for (const item of selectedKtaChecklist) {
        const reportType = item.startsWith('TTA') ? 'TTA' : 'KTA';
        const labelItem = item === 'TTA_1' ? 'TTA 1' : item === 'TTA_2' ? 'TTA 2' : reportType;

        await fetch('/api/kta-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nik: inspectorNik || 'USER',
            name: inspectorName,
            section: userSection || 'Preparasi & Lab',
            reportType,
            date: new Date().toISOString().split('T')[0],
            week: currentWeekTag,
            imageUrl: uploadedUrl,
            description: `Bukti Screenshot ${labelItem} (${currentWeekTag})`,
            location: '-'
          })
        });
      }

      toast.success(`✅ Bukti KTA/TTA (${currentWeekTag}) berhasil diunggah!`, { id: 'upload-kta', duration: 5000 });
      triggerExpGain(35, 'Laporan KTA/TTA Terkirim!', `Minggu: ${currentWeekTag}`);
      window.dispatchEvent(new Event('gamification_updated'));
      setShowKtaModal(false);
      setKtaImageFile(null);
      setKtaImagePreview(null);
      // Refresh status
      fetchKtaStatus();
      window.dispatchEvent(new CustomEvent('refresh-group-reports'));
    } catch (err: any) {
      console.error('KTA submit error:', err);
      const msg = err?.message || (typeof err === 'string' ? err : 'Gagal mengunggah bukti formulir. Silakan coba lagi.');
      toast.error('Terjadi kesalahan: ' + msg, { id: 'upload-kta' });
    } finally {
      isSubmittingKtaRef.current = false;
      setIsSubmittingKta(false);
    }
  };

  // Filtered list for full schedule modal
  const filteredAll = allSchedules.filter(item => {
    const matchSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inspeksi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jabatan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchShift = 
      filterShift === 'all' || 
      (filterShift === 'siang' && item.shift.toLowerCase().includes('siang')) ||
      (filterShift === 'malam' && item.shift.toLowerCase().includes('malam')) ||
      (filterShift === 'nonshift' && item.shift.toLowerCase().includes('nonshift')) ||
      (filterShift === 'cuti' && item.isCuti);
    return matchSearch && matchShift;
  });

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          AT-A-GLANCE TASK & OPERATIONAL ACTIVITY PROGRESS HUB
         ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4 w-full">

        {/* ── TOP EXECUTIVE SUMMARY & REAL-TIME PROGRESS BAR ── */}
        <div 
          className="relative overflow-hidden rounded-3xl border border-[var(--border-main)] p-4 sm:p-5 shadow-sm transition-all"
          style={{
            background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg) 60%, rgba(42, 157, 143, 0.06) 100%)'
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h2 className="text-sm sm:text-base font-black tracking-tight text-[var(--text-main)] font-display">
                  Hub Progress Tugas & Kepatuhan Operasional
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                  {currentWeekTag} • Harita Nickel
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Pantau seluruh status kewajiban mingguan dan aktivitas shift harian Anda secara real-time tanpa perlu klik manual.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <div className="text-right mr-1 hidden sm:block">
                <div className="text-xs font-bold text-[var(--text-main)]">
                  {isRosterOnsiteToday ? (
                    `Status Roster: ${rosterToday?.statusLabel || 'Onsite (Aktif Shift)'}`
                  ) : isRosterCutiToday ? (
                    `Status Roster: ${rosterToday?.statusLabel || 'Off-Site (Cuti)'}`
                  ) : (
                    `${progressStats.completed} dari ${progressStats.total} Aktivitas Selesai`
                  )}
                </div>
                <div className={`text-[11px] font-bold ${
                  isWeeklyCuti
                    ? (hasP5mAssignment 
                        ? (progressStats.p5mDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400')
                        : 'text-sky-600 dark:text-sky-400'
                      )
                    : isTransitionFromCuti
                    ? 'text-teal-600 dark:text-teal-400'
                    : hasP5mAssignment
                    ? (progressStats.p5mDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400')
                    : progressStats.pct === 100 ? 'text-emerald-600' : 'text-teal-600'
                }`}>
                  {isWeeklyCuti ? (
                    hasP5mAssignment 
                      ? (progressStats.p5mDone ? '✅ P5M Selesai • Roster Bebas' : `🎙️ Pemateri: ${p5mAssignment.day || 'Jadwal P5M'}`)
                      : '🏖️ Bebas Kewajiban Periode Ini'
                  ) : isTransitionFromCuti ? (
                    '✓ Bebas Penugasan (Transisi Cuti)'
                  ) : hasP5mAssignment ? (
                    progressStats.p5mDone ? `${progressStats.pct}% Kepatuhan Tercapai` : `🎙️ Pemateri: ${p5mAssignment.day || 'Jadwal P5M'} (${progressStats.pct}%)`
                  ) : (
                    `${progressStats.pct}% Kepatuhan Tercapai`
                  )}
                </div>
              </div>

              <button
                onClick={handleRefreshAll}
                disabled={refreshing || p5mLoading || dailyTasksLoading}
                className="p-2 rounded-xl border border-[var(--border-main)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs"
                title="Perbarui data progress"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing || p5mLoading || dailyTasksLoading ? 'animate-spin text-teal-600' : ''}`} />
                <span className="text-xs font-medium hidden sm:inline">Refresh</span>
              </button>

              {hasAdminAccess && (
                <button
                  onClick={() => setShowFullScheduleModal(true)}
                  className="px-3 py-2 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Jadwal Tim ({allSchedules.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Progress Meter */}
          <div className="mt-3.5 space-y-1.5">
            <div className="w-full bg-[var(--input-bg)] h-2.5 rounded-full overflow-hidden border border-[var(--border-main)]/50 p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out shadow-xs ${
                  isWeeklyCuti
                    ? (hasP5mAssignment && !progressStats.p5mDone
                        ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-teal-500'
                        : 'bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500')
                    : (hasP5mAssignment && !progressStats.p5mDone
                        ? 'bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-600'
                        : 'bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-600')
                }`}
                style={{ width: `${Math.max(6, Math.min(100, isWeeklyCuti && !hasP5mAssignment ? 100 : progressStats.pct))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
              <span>Tugas Mingguan: <strong className="text-[var(--text-main)]">{
                isWeeklyCuti
                  ? (hasP5mAssignment 
                      ? (progressStats.p5mDone ? '3/3 Selesai (P5M Selesai)' : '2/3 Bebas (Ada Tugas P5M)')
                      : '3/3 Bebas Kewajiban (Cuti)')
                  : isTransitionFromCuti
                  ? (hasP5mAssignment && !progressStats.p5mDone ? '2/3 Bebas (Ada Tugas P5M)' : '3/3 Selesai (Transisi Cuti)')
                  : `${progressStats.weeklyCompleted}/${progressStats.weeklyTotal} Selesai`
              }</strong></span>
              <span className="sm:hidden font-bold text-teal-600 dark:text-teal-400">
                {isWeeklyCuti ? 'Cuti (100%)' : isTransitionFromCuti ? 'Onsite (Transisi)' : `${progressStats.pct}%`}
              </span>
              {progressStats.dailyTotal > 0 && (
                <span>Aktivitas Shift: <strong className="text-[var(--text-main)]">{
                  isRosterCutiToday ? 'Bebas Tugas (Cuti)' : `${progressStats.dailyCompleted}/${progressStats.dailyTotal} Selesai`
                }</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* ── BAGIAN 1: TUGAS MINGGUAN TERJADWAL (3 AKTIVITAS) ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tugas Mingguan Terjadwal ({currentWeekTag})
              </h3>
            </div>
            <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              3 Modul Wajib
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. INSPEKSI RUTIN MINGGUAN */}
            <div 
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                isTransitionFromCuti
                  ? 'border-teal-500/30 bg-gradient-to-b from-teal-500/[0.08] via-[var(--card-bg)] to-[var(--card-bg)] hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-500/5'
                  : isUserCuti
                  ? 'border-sky-500/30 bg-gradient-to-b from-sky-500/[0.08] via-[var(--card-bg)] to-[var(--card-bg)] hover:border-sky-500/50 hover:shadow-md hover:shadow-sky-500/5'
                  : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:shadow-md hover:border-emerald-500/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                      isTransitionFromCuti
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25'
                        : isUserCuti
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}>
                      {isTransitionFromCuti ? <ShieldCheck className="w-4 h-4" /> : isUserCuti ? <Sun className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--text-main)] leading-tight">
                        Inspeksi Rutin Mingguan
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">Preparation & Laboratory</p>
                    </div>
                  </div>

                  {isTransitionFromCuti ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1 shadow-2xs">
                      <span>✓</span> Bebas Tugas (Transisi Cuti)
                    </span>
                  ) : isUserCuti ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1 shadow-2xs">
                      <span>🏖️</span> Bebas Tugas (Cuti)
                    </span>
                  ) : mySchedule?.isCompleted ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Selesai
                    </span>
                  ) : hasSsProof ? (
                    <button
                      type="button"
                      onClick={handleViewSsProof}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Klik untuk melihat bukti screenshot"
                    >
                      <Check className="w-3 h-3" /> Bukti SS
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      Belum Selesai
                    </span>
                  )}
                </div>

                {/* Body Details */}
                {isTransitionFromCuti ? (
                  <div className="space-y-2 my-3 p-3 rounded-2xl bg-gradient-to-br from-teal-500/[0.08] to-emerald-500/[0.03] border border-teal-500/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                        Status Penjadwalan
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-800 dark:text-teal-200">
                        ✓ Onsite Aktif
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                        <span className="text-sm">🛡️</span> Bebas Penugasan (Transisi Cuti)
                      </p>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        Anda telah aktif bekerja di site. Karena jadwal mingguan disusun saat Anda masih cuti di awal pekan (Senin), Anda dibebaskan dari penugasan inspeksi rutin minggu ini.
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-teal-500/20">
                      <span>Roster Hari Ini: <strong className="text-[var(--text-main)]">{rosterToday?.statusLabel || 'Onsite (Day Shift)'}</strong></span>
                      <span>Status Tugas: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Bebas Tugas</strong></span>
                    </div>
                  </div>
                ) : isUserCuti ? (
                  <div className="space-y-2 my-3 p-3 rounded-2xl bg-gradient-to-br from-sky-500/[0.08] to-teal-500/[0.03] border border-sky-500/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                        Status Penjadwalan
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-800 dark:text-sky-200">
                        Off-Site
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                        <span className="text-sm">🏖️</span> Sedang Cuti / Libur Roster
                      </p>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        Anda tidak memiliki jadwal inspeksi lapangan terencana pada periode minggu ini. Selamat menikmati waktu istirahat!
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-sky-500/20">
                      <span>Shift: <strong className="text-[var(--text-main)]">Cuti</strong></span>
                      <span>Kewajiban: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Bebas Tugas</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 my-3 p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Area / Lokasi Tugas:</span>
                      <p className="font-bold text-[var(--text-main)] text-xs line-clamp-1">
                        {mySchedule?.inspeksi || 'Menunggu Sinkronisasi Jadwal'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Rekan Inspeksi:</span>
                      <p className="text-[11px] text-[var(--text-main)] font-semibold line-clamp-1">
                        {mySchedule?.partners && mySchedule.partners.length > 0 
                          ? mySchedule.partners.map(p => p.name).join(', ')
                          : 'Sendiri / Belum Terdata'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-main)]/50">
                      <span>Shift: <strong className="text-[var(--text-main)]">{mySchedule?.shift || '-'}</strong></span>
                      <span>Peran: <strong className="text-[var(--text-main)]">{mySchedule?.roleIndex ? `Inspektor ${mySchedule.roleIndex}` : '-'}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-[var(--border-main)] flex items-center gap-2">
                {isTransitionFromCuti ? (
                  <>
                    {hasAdminAccess && (
                      <button
                        type="button"
                        onClick={() => setShowFullScheduleModal(true)}
                        className="flex-1 py-2 px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Lihat Jadwal Tim</span>
                      </button>
                    )}
                    {hasSsProof ? (
                      <button
                        type="button"
                        onClick={handleViewSsProof}
                        className={`py-2 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer flex items-center justify-center gap-1 ${!hasAdminAccess ? 'flex-1' : ''}`}
                        title="Lihat Bukti Screenshot"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lihat SS</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSsModal(true)}
                        className={`py-2 px-2.5 rounded-xl border border-teal-500/30 bg-[var(--card-bg)] text-teal-700 dark:text-teal-300 text-[11px] font-semibold hover:bg-teal-500/10 transition-colors cursor-pointer ${!hasAdminAccess ? 'flex-1' : ''}`}
                        title="Upload Bukti SS Sukarela"
                      >
                        + Bukti SS
                      </button>
                    )}
                  </>
                ) : isUserCuti ? (
                  <>
                    {hasAdminAccess && (
                      <button
                        type="button"
                        onClick={() => setShowFullScheduleModal(true)}
                        className="flex-1 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Lihat Jadwal Tim</span>
                      </button>
                    )}
                    {hasSsProof ? (
                      <button
                        type="button"
                        onClick={handleViewSsProof}
                        className={`py-2 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer flex items-center justify-center gap-1 ${!hasAdminAccess ? 'flex-1' : ''}`}
                        title="Lihat Bukti Screenshot"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lihat SS</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSsModal(true)}
                        className={`py-2 px-2.5 rounded-xl border border-sky-500/30 bg-[var(--card-bg)] text-sky-700 dark:text-sky-300 text-[11px] font-semibold hover:bg-sky-500/10 transition-colors cursor-pointer ${!hasAdminAccess ? 'flex-1' : ''}`}
                        title="Upload Bukti SS Sukarela"
                      >
                        + Bukti SS
                      </button>
                    )}
                  </>
                ) : mySchedule?.isCompleted || hasSsProof ? (
                  <>
                    {mySchedule?.completedPdfUrl && mySchedule.completedPdfUrl !== '#' && (
                      <button
                        type="button"
                        onClick={() => {
                          const rawUrl = mySchedule.completedPdfUrl!;
                          const fileIdMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                          const viewUrl = fileIdMatch && fileIdMatch[1]
                            ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
                            : rawUrl;
                          window.open(viewUrl, '_blank');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Unduh PDF
                      </button>
                    )}
                    {hasSsProof ? (
                      <button
                        type="button"
                        onClick={handleViewSsProof}
                        className="py-1.5 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer flex items-center gap-1"
                        title="Lihat Bukti Screenshot"
                      >
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>Lihat SS</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSsModal(true)}
                        className="py-1.5 px-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] text-[var(--text-main)] text-[11px] font-semibold hover:bg-[var(--input-bg)] transition-colors cursor-pointer flex items-center gap-1"
                        title="Upload Bukti Screenshot"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Bukti SS</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartInspection}
                      className="text-[10px] text-[var(--text-muted)] hover:text-emerald-600 underline py-1 px-1 cursor-pointer"
                    >
                      Isi Ulang
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleStartInspection}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <span>Mulai Inspeksi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSsModal(true)}
                      className="py-2 px-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] text-[var(--text-main)] text-[11px] font-semibold hover:bg-[var(--input-bg)] transition-colors cursor-pointer"
                      title="Upload Bukti SS General Inspeksi"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 2. LAPORAN OBSERVASI (KTA / TTA) */}
            <div 
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                isTransitionFromCuti
                  ? 'border-teal-500/30 bg-gradient-to-b from-teal-500/[0.08] via-[var(--card-bg)] to-[var(--card-bg)] hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-500/5'
                  : isUserCuti
                  ? 'border-sky-500/30 bg-gradient-to-b from-sky-500/[0.08] via-[var(--card-bg)] to-[var(--card-bg)] hover:border-sky-500/50 hover:shadow-md hover:shadow-sky-500/5'
                  : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:border-amber-500/40 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                      isTransitionFromCuti
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25'
                        : isUserCuti
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}>
                      {isTransitionFromCuti ? <ShieldCheck className="w-4 h-4" /> : isUserCuti ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--text-main)] leading-tight">
                        Laporan Observasi
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">Kondisi & Tindakan (KTA/TTA)</p>
                    </div>
                  </div>

                  {isTransitionFromCuti ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1 shadow-2xs">
                      <span>✓</span> Bebas Target (Transisi Cuti)
                    </span>
                  ) : isUserCuti ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1 shadow-2xs">
                      <span>🏖️</span> Bebas Target (Cuti)
                    </span>
                  ) : progressStats.ktaDone ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Terpenuhi
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      Belum Lengkap
                    </span>
                  )}
                </div>

                {/* Body Details */}
                {isTransitionFromCuti ? (
                  <div className="space-y-2 my-3 p-3 rounded-2xl bg-gradient-to-br from-teal-500/[0.08] to-emerald-500/[0.03] border border-teal-500/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                        Target Observasi K3L
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-800 dark:text-teal-200 font-bold">
                        ✓ Bebas Kewajiban
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                        <span className="text-sm">🛡️</span> Kuota Mingguan Dibebaskan
                      </p>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        Anda telah aktif di site. Karena status awal pekan Anda tercatat cuti saat kuota mingguan ditetapkan, Anda dibebaskan dari target wajib pelaporan KTA/TTA ({myObligation.label}) minggu ini.
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-teal-500/20">
                      <span>Target Normal: <strong className="text-[var(--text-main)]">{myObligation.label}</strong></span>
                      <span>Kepatuhan K3L: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Terpenuhi (Bebas Kuota)</strong></span>
                    </div>
                  </div>
                ) : isUserCuti ? (
                  <div className="space-y-2 my-3 p-3 rounded-2xl bg-gradient-to-br from-sky-500/[0.08] to-teal-500/[0.03] border border-sky-500/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                        Target Observasi K3L
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                        ✓ Bebas Kewajiban
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                        <span className="text-sm">🛡️</span> Kewajiban K3L Dinonaktifkan
                      </p>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        Selama status Cuti / Off-Site, Anda dibebaskan dari target mingguan pelaporan KTA/TTA ({myObligation.label}).
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-sky-500/20">
                      <span>Target Normal: <strong className="text-[var(--text-main)]">{myObligation.label}</strong></span>
                      <span>Status K3L: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Terpenuhi (Cuti)</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 my-3 p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Kewajiban Personal:</span>
                      <p className="font-bold text-[var(--text-main)] text-xs">
                        {myObligation.label}
                      </p>
                    </div>
                    <div className="pt-1 border-t border-[var(--border-main)]/50">
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Checklist Detail:</span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {myObligation.type === '1_KTA_OR_TTA' ? (
                          <span className={`text-[10.5px] font-bold flex items-center gap-1 ${
                            myKtaRecord?.checkDetails?.check1Done ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {myKtaRecord?.checkDetails?.check1Done ? '✓' : '○'} 1 KTA/TTA ({myKtaRecord?.checkDetails?.check1Done ? 'Lengkap' : 'Belum'})
                          </span>
                        ) : myObligation.type === '2_TTA' ? (
                          <>
                            <span className={`text-[10.5px] font-bold flex items-center gap-1 ${
                              myKtaRecord?.checkDetails?.check1Done ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {myKtaRecord?.checkDetails?.check1Done ? '✓' : '○'} TTA 1
                            </span>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span className={`text-[10.5px] font-bold flex items-center gap-1 ${
                              myKtaRecord?.checkDetails?.check2Done ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {myKtaRecord?.checkDetails?.check2Done ? '✓' : '○'} TTA 2
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={`text-[10.5px] font-bold flex items-center gap-1 ${
                              myKtaRecord?.checkDetails?.check1Done ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {myKtaRecord?.checkDetails?.check1Done ? '✓' : '○'} KTA
                            </span>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span className={`text-[10.5px] font-bold flex items-center gap-1 ${
                              myKtaRecord?.checkDetails?.check2Done ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {myKtaRecord?.checkDetails?.check2Done ? '✓' : '○'} TTA
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-[var(--border-main)] flex items-center gap-2">
                {isTransitionFromCuti ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowKtaModal(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>+ Lapor Sukarela</span>
                    </button>
                    <a
                      href={SAFETY_KTA_FORM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3 rounded-xl border border-teal-500/30 text-teal-700 dark:text-teal-300 text-[11px] font-bold hover:bg-teal-500/10 transition-colors flex items-center gap-1"
                    >
                      Form Safety ↗
                    </a>
                  </>
                ) : isUserCuti ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowKtaModal(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>+ Lapor Sukarela</span>
                    </button>
                    <a
                      href={SAFETY_KTA_FORM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3 rounded-xl border border-sky-500/30 text-sky-700 dark:text-sky-300 text-[11px] font-bold hover:bg-sky-500/10 transition-colors flex items-center gap-1"
                    >
                      Form Safety ↗
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowKtaModal(true)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Kirim Bukti SS
                    </button>
                    <a
                      href={SAFETY_KTA_FORM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-2.5 rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-500/10 transition-colors flex items-center gap-1"
                    >
                      Form Safety ↗
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* 3. JADWAL BRIEFING P5M */}
            <div 
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                hasP5mAssignment
                  ? 'border-purple-500/30 bg-gradient-to-b from-purple-500/[0.07] via-[var(--card-bg)] to-[var(--card-bg)] hover:border-purple-500/50 hover:shadow-md'
                  : isUserCuti
                  ? 'border-sky-500/30 bg-gradient-to-b from-sky-500/[0.08] via-[var(--card-bg)] to-[var(--card-bg)] hover:border-sky-500/50 hover:shadow-md hover:shadow-sky-500/5'
                  : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:border-indigo-500/40 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                      hasP5mAssignment
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
                        : isUserCuti
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25'
                        : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--text-main)] leading-tight">
                        Jadwal Briefing P5M
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">Pertemuan 5 Menit Keselamatan</p>
                    </div>
                  </div>

                  {hasP5mAssignment ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        🎙️ Pemateri
                      </span>
                      {isUserCuti && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Roster Cuti
                        </span>
                      )}
                      {isRosterOnsiteToday && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Aktif Onsite
                        </span>
                      )}
                    </div>
                  ) : isUserCuti ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1 shadow-2xs">
                      <span>🏖️</span> Bebas Hadir (Cuti)
                    </span>
                  ) : isTransitionFromCuti ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1 shadow-2xs">
                      👥 Peserta (Aktif Onsite)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 border border-indigo-500/30">
                      👥 Peserta
                    </span>
                  )}
                </div>

                {/* Body Details */}
                {hasP5mAssignment ? (
                  <div className="space-y-1.5 my-3 p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Jadwal Tugas Anda:</span>
                      <p className="font-bold text-[var(--text-main)] text-xs">
                        {p5mAssignment.day || p5mAssignment.dayName || '-'} ({p5mAssignment.shift || 'Shift Siang'})
                        {p5mAssignment.assignmentDate && (
                          <span className="text-[10px] font-normal text-[var(--text-muted)] ml-1.5">
                            • {p5mAssignment.assignmentDate}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Topik / Materi:</span>
                      <p className="text-[11px] text-[var(--text-main)] font-semibold line-clamp-1">
                        {p5mAssignment.materi || p5mAssignment.topicTitle || 'Materi P5M Mingguan'}
                      </p>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-main)]/50">
                      Zona: <strong className="text-[var(--text-main)]">{p5mAssignment.zone || p5mAssignment.zoneName || 'Zona Utama Prep/Lab'}</strong>
                    </div>
                    {isUserCuti ? (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1 border-t border-amber-500/20 leading-tight">
                        ℹ️ Jadwal briefing P5M tetap tercantum sesuai daftar penugasan. Koordinasikan dengan pengawas bila jadwal bertepatan dengan masa cuti Anda.
                      </div>
                    ) : isTransitionFromCuti ? (
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium pt-1 border-t border-teal-500/20 leading-tight">
                        ✓ Jadwal pemateri P5M aktif untuk shift operasional on-site Anda minggu ini.
                      </div>
                    ) : null}
                  </div>
                ) : isUserCuti ? (
                  <div className="space-y-2 my-3 p-3 rounded-2xl bg-gradient-to-br from-sky-500/[0.08] to-indigo-500/[0.03] border border-sky-500/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                        Kehadiran Briefing P5M
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-800 dark:text-sky-200">
                        Off-Site
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                        <span className="text-sm">👥</span> Bebas Penugasan Briefing
                      </p>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        Briefing keselamatan P5M dijalankan secara tatap muka oleh personil yang aktif bertugas di shift kerja on-site.
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-sky-500/20">
                      <span>Peran: <strong className="text-[var(--text-main)]">Off-Site (Cuti)</strong></span>
                      <span>Status: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Bebas Hadir</strong></span>
                    </div>
                  </div>
                ) : isTransitionFromCuti ? (
                  <div className="space-y-1.5 my-3 p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Status Penugasan:</span>
                      <p className="font-bold text-[var(--text-main)] text-xs">
                        Peserta Aktif Briefing Shift (Onsite)
                      </p>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                      Anda aktif bekerja on-site hari ini. Ikuti briefing keselamatan P5M bersama kru shift di awal jam kerja.
                    </p>
                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold pt-1 border-t border-[var(--border-main)]/50">
                      ✓ Hadir dalam briefing shift on-site
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 my-3 p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Status Penugasan:</span>
                      <p className="font-bold text-[var(--text-main)] text-xs">
                        Peserta Aktif Briefing Shift
                      </p>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                      Mengikuti jalannya briefing P5M di awal shift kerja sesuai materi yang dipaparkan pemateri.
                    </p>
                    <div className="text-[10px] text-indigo-600 font-semibold pt-1 border-t border-[var(--border-main)]/50">
                      ✓ Siap berpartisipasi dalam briefing shift
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-[var(--border-main)] flex items-center gap-2">
                {(p5mAssignment?.fileUrl || p5mAssignment?.flyerUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = p5mAssignment.fileUrl || p5mAssignment.flyerUrl;
                      if (url.match(/\.(jpeg|jpg|png|webp|gif)/i)) {
                        setLightboxUrl(url);
                      } else {
                        window.open(url, '_blank');
                      }
                    }}
                    className="py-2 px-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Flyer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToP5m) onNavigateToP5m();
                    else window.location.href = '/p5m';
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                    hasP5mAssignment
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : isUserCuti
                      ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <span>Buka Modul P5M</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── BAGIAN 2: AKTIVITAS SHIFT HARIAN (P2H & PEMANTAUAN LAB) ── */}
        {(isPrepOrLabOrCrew || isLabOrQA) && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Aktivitas Shift Harian (Hari Ini • WIT)
                </h3>
              </div>
              <span className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                Operasional Harian
              </span>
            </div>

            <div className={`grid grid-cols-1 ${isPrepOrLabOrCrew && isLabOrQA ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-3.5`}>
              {/* 4. INSPEKSI HARIAN (P2H) */}
              {isPrepOrLabOrCrew && (
                <div 
                  className={`relative overflow-hidden rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                    isUserCuti
                      ? 'border-sky-500/30 bg-gradient-to-b from-sky-500/[0.08] via-[var(--card-bg)] to-[var(--card-bg)] hover:border-sky-500/50 hover:shadow-md hover:shadow-sky-500/5'
                      : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:border-teal-500/40 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                          isUserCuti
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25'
                            : 'bg-teal-500/10 text-teal-600 border-teal-500/20'
                        }`}>
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-[var(--text-main)] leading-tight">
                            Inspeksi Harian (P2H)
                          </h4>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">Pemeriksaan Pra-Operasional Alat</p>
                        </div>
                      </div>

                      {isUserCuti ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1 shadow-2xs">
                          <span>🏖️</span> Bebas Tugas (Cuti)
                        </span>
                      ) : dailyTasks?.p2h?.completedToday ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Sudah Anda Periksa
                        </span>
                      ) : dailyTasks?.p2h?.deptCompletedToday ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 border border-teal-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Diperiksa Tim
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                          ⏳ Belum Checklist
                        </span>
                      )}
                    </div>

                    {/* Body Details */}
                    {isUserCuti ? (
                      <div className="space-y-2 my-3 p-3 rounded-2xl bg-gradient-to-br from-sky-500/[0.08] to-teal-500/[0.03] border border-sky-500/20 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                            P2H Shift Harian
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-800 dark:text-sky-200">
                            Off-Site
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                            <span className="text-sm">🚜</span> Bebas Checklist Pra-Operasi
                          </p>
                          <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                            Pemeriksaan alat dan kendaraan operasional dilakukan oleh kru shift aktif yang bertugas di lapangan.
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-sky-500/20">
                          <span>Status: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Tidak Wajib (Cuti)</strong></span>
                          <span>Shift Lapangan: <strong className="text-[var(--text-main)]">{dailyTasks?.p2h?.deptCountToday || 0} unit diperiksa</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 my-3 p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] text-[var(--text-muted)]">Pemeriksaan Pribadi Hari Ini:</span>
                          <strong className="text-xs text-[var(--text-main)]">{dailyTasks?.p2h?.myCountToday || 0} unit</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] text-[var(--text-muted)]">Total Shift Departemen Hari Ini:</span>
                          <strong className="text-xs text-[var(--text-main)]">{dailyTasks?.p2h?.deptCountToday || 0} unit</strong>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-main)]/50 truncate">
                          {dailyTasks?.p2h?.lastRecord 
                            ? `Terakhir: ${dailyTasks.p2h.lastRecord.equipmentName || 'Alat'} (${dailyTasks.p2h.lastRecord.inspectorName})`
                            : 'Wajib diisi sebelum peralatan digunakan beroperasi.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[var(--border-main)] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToP2h) onNavigateToP2h();
                        else if (onNavigateToInspection) onNavigateToInspection();
                        else window.location.href = '/inspections';
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                        isUserCuti
                          ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>{isUserCuti ? 'Lihat Log Form P2H' : dailyTasks?.p2h?.completedToday ? 'Lihat / Tambah Form P2H' : 'Isi Form P2H Sekarang'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 5. PEMANTAUAN HARIAN LAB */}
              {isLabOrQA && (
                <div 
                  className={`relative overflow-hidden rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                    isUserCuti
                      ? 'border-sky-500/30 bg-gradient-to-b from-sky-500/[0.08] via-[var(--card-bg)] to-[var(--card-bg)] hover:border-sky-500/50 hover:shadow-md hover:shadow-sky-500/5'
                      : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:border-sky-500/40 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                          isUserCuti
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25'
                            : 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                        }`}>
                          <ThermometerSun className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-[var(--text-main)] leading-tight">
                            Pemantauan Harian Lab
                          </h4>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">Suhu, Kelembaban & Gas Detector</p>
                        </div>
                      </div>

                      {isUserCuti ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1 shadow-2xs">
                          <span>🏖️</span> Bebas Tugas (Cuti)
                        </span>
                      ) : dailyTasks?.pemantauan?.completedToday ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Parameter Tercatat
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                          ⏳ Belum Tercatat
                        </span>
                      )}
                    </div>

                    {/* Body Details */}
                    {isUserCuti ? (
                      <div className="space-y-2 my-3 p-3 rounded-2xl bg-gradient-to-br from-sky-500/[0.08] to-teal-500/[0.03] border border-sky-500/20 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                            Parameter Lingkungan Lab
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-800 dark:text-sky-200">
                            Off-Site
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                            <span className="text-sm">🌡️</span> Bebas Input Parameter
                          </p>
                          <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                            Pencatatan suhu, kelembaban, dan gas detector dilakukan oleh analis/petugas lab yang aktif pada shift berjalan.
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-sky-500/20">
                          <span>Status: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Tidak Wajib (Cuti)</strong></span>
                          <span>Input Terakhir: <strong className="text-[var(--text-main)]">{dailyTasks?.pemantauan?.petugas ? `${dailyTasks.pemantauan.petugas} (${dailyTasks.pemantauan.jam || '-'} WIT)` : 'Shift Aktif'}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 my-3 p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] text-[var(--text-muted)]">Suhu & Kelembaban:</span>
                          <strong className={`text-xs ${dailyTasks?.pemantauan?.suhuCompleted ? 'text-emerald-600 font-bold' : 'text-amber-600'}`}>
                            {dailyTasks?.pemantauan?.suhuCompleted ? '✓ Sudah Tercatat' : 'Belum Terisi'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] text-[var(--text-muted)]">Gas Detector:</span>
                          <strong className={`text-xs ${dailyTasks?.pemantauan?.gasCompleted ? 'text-emerald-600 font-bold' : 'text-amber-600'}`}>
                            {dailyTasks?.pemantauan?.gasCompleted ? '✓ Sudah Tercatat' : 'Belum Terisi'}
                          </strong>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-main)]/50 truncate">
                          {dailyTasks?.pemantauan?.petugas 
                            ? `Input: ${dailyTasks.pemantauan.petugas} (${dailyTasks.pemantauan.jam || '-'} WIT)`
                            : 'Pemantauan parameter lab wajib diinput per-shift.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[var(--border-main)] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToPemantauan) onNavigateToPemantauan();
                        else window.location.href = '/pemantauan';
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                        isUserCuti
                          ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                          : 'bg-sky-600 hover:bg-sky-700 text-white'
                      }`}
                    >
                      <ThermometerSun className="w-3.5 h-3.5" />
                      <span>{isUserCuti ? 'Lihat Rekap Pemantauan Lab' : dailyTasks?.pemantauan?.completedToday ? 'Lihat / Update Pemantauan' : 'Input Pemantauan Sekarang'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: UPLOAD BUKTI SS GENERAL INSPEKSI
         ═══════════════════════════════════════════════════════════════ */}
      {showSsModal && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-gradient-to-r from-blue-600/15 via-blue-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[var(--text-main)]">
                    Upload Bukti Screenshot General Inspeksi
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                    Syarat Wajib Rekapan Inspeksi • <span className="font-bold text-blue-600">{currentWeekTag}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowSsModal(false); setSsImageFile(null); setSsImagePreview(null); }}
                className="w-8 h-8 rounded-full bg-[var(--input-bg)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitSsReport} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Info Box */}
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="text-[11px] leading-relaxed text-blue-600 min-w-0">
                  <p className="font-bold">Ketentuan Rekap Status Inspeksi:</p>
                  <p className="text-[10px] opacity-90 mt-0.5">
                    Screenshot bukti pengisian formulir general inspeksi wajib diunggah agar status rekapan Anda dinyatakan <strong>SUDAH</strong>.
                  </p>
                </div>
                <a
                  href={GENERAL_INSPECTION_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Form</span>
                </a>
              </div>

              {/* Data Pelapor */}
              <div className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Pelapor:</span>
                  <p className="font-bold text-[var(--text-main)] truncate">{inspectorName} ({inspectorNik || '-'})</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Periode:</span>
                  <span className="font-mono font-bold text-blue-600">{currentWeekTag}</span>
                </div>
              </div>

              {/* Dropzone / Paste Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-main)]">
                    Lampirkan Bukti Tangkapan Layar (Screenshot):
                  </label>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    💡 Bisa langsung Paste (Ctrl+V)
                  </span>
                </div>

                {ssImagePreview ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-blue-600 font-semibold">
                      <span>Screenshot Baru Dipilih:</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Klik simpan di bawah untuk memperbarui</span>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black/40 group aspect-video max-h-56 flex items-center justify-center shadow-md">
                      <img
                        src={ssImagePreview}
                        alt="Pratinjau Screenshot Form General Inspeksi"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => { setSsImageFile(null); setSsImagePreview(null); }}
                        className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold shadow-md hover:bg-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Batal / Ganti Lain
                      </button>
                    </div>
                  </div>
                ) : ssProofUrl ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-4 h-4 text-emerald-500" /> Screenshot Sudah Terunggah
                      </span>
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(ssProofUrl)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Layar Penuh
                      </button>
                    </div>

                    {/* Pratinjau Gambar Tersimpan */}
                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black/30 aspect-video max-h-52 flex items-center justify-center shadow-md group">
                      <img
                        src={ssProofUrl}
                        alt="Screenshot Aktif General Inspeksi"
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => setLightboxUrl(ssProofUrl)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(ssProofUrl)}
                          className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-800 text-xs font-bold flex items-center gap-1 shadow-md hover:bg-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> Lihat Layar Penuh
                        </button>
                      </div>
                    </div>

                    {/* Tombol / Area Ganti Screenshot */}
                    <label className="border border-dashed border-[var(--border-main)] hover:border-blue-500 bg-[var(--input-bg)] rounded-2xl p-3 flex items-center justify-center gap-2 text-center cursor-pointer transition-colors group">
                      <Upload className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[var(--text-main)] leading-tight">
                          Ganti dengan Screenshot Baru
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                          Klik untuk pilih berkas baru atau tekan Ctrl + V
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSsImageFile(file);
                            const reader = new FileReader();
                            reader.onload = (re) => setSsImagePreview(re.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[var(--border-main)] hover:border-blue-500 bg-[var(--input-bg)] rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Klik untuk pilih gambar atau tekan Ctrl + V
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1">
                      Mendukung tangkapan layar (PNG, JPG, WebP)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSsImageFile(file);
                          const reader = new FileReader();
                          reader.onload = (re) => setSsImagePreview(re.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSsModal(false); setSsImageFile(null); setSsImagePreview(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                >
                  {ssProofUrl && !ssImageFile ? 'Tutup' : 'Batal'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingSs || (!ssImageFile && !ssImagePreview)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingSs ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : ssImageFile ? (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Simpan Screenshot Baru</span>
                    </>
                  ) : ssProofUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Screenshot Sudah Tersimpan</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Simpan Bukti Screenshot</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: UPLOAD BUKTI FORMULIR KTA / TTA
         ═══════════════════════════════════════════════════════════════ */}
      {showKtaModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-sm sm:max-w-md flex flex-col overflow-hidden shadow-2xl relative max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between gap-2 shrink-0 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-amber-500/20 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)]">
                    Kirim Bukti KTA / TTA
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] truncate">
                    Pelapor: {inspectorName} • {currentWeekTag}
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setShowKtaModal(false); setKtaImageFile(null); setKtaImagePreview(null); }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors font-bold shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitKtaReport} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              
              {/* GOOGLE FORM HELPER BANNER */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] text-[var(--text-main)] font-medium truncate">
                    Belum isi formulir Safety?
                  </span>
                </div>

                <a
                  href={SAFETY_KTA_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>Buka Form</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* PILIHAN CEKLIS KEWAJIBAN */}
              <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Pilih Ceklis yang Dilaporkan:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 font-extrabold text-[11px] border border-amber-500/30">
                    🎯 {myObligation.label}
                  </span>
                </div>

                {myObligation.type === '1_KTA_AND_1_TTA' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div 
                      onClick={() => {
                        setSelectedKtaChecklist(prev => 
                          prev.includes('KTA') ? prev.filter(x => x !== 'KTA') : [...prev, 'KTA']
                        );
                      }}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedKtaChecklist.includes('KTA')
                          ? 'bg-amber-500/20 border-amber-500 text-amber-600 ring-2 ring-amber-500/30 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedKtaChecklist.includes('KTA') ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-400'
                        }`}>
                          {selectedKtaChecklist.includes('KTA') && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold text-xs">1 KTA</span>
                      </div>
                      {myKtaRecord?.checkDetails?.check1Done && <span className="text-[9px] text-emerald-600 font-bold">✓ Ada</span>}
                    </div>

                    <div 
                      onClick={() => {
                        setSelectedKtaChecklist(prev => 
                          prev.includes('TTA') ? prev.filter(x => x !== 'TTA') : [...prev, 'TTA']
                        );
                      }}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedKtaChecklist.includes('TTA')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedKtaChecklist.includes('TTA') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400'
                        }`}>
                          {selectedKtaChecklist.includes('TTA') && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold text-xs">1 TTA</span>
                      </div>
                      {myKtaRecord?.checkDetails?.check2Done && <span className="text-[9px] text-emerald-600 font-bold">✓ Ada</span>}
                    </div>
                  </div>
                )}

                {myObligation.type === '2_TTA' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div 
                      onClick={() => {
                        setSelectedKtaChecklist(prev => 
                          prev.includes('TTA_1') ? prev.filter(x => x !== 'TTA_1') : [...prev, 'TTA_1']
                        );
                      }}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedKtaChecklist.includes('TTA_1')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedKtaChecklist.includes('TTA_1') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400'
                        }`}>
                          {selectedKtaChecklist.includes('TTA_1') && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold text-xs">TTA 1</span>
                      </div>
                      {myKtaRecord?.checkDetails?.check1Done && <span className="text-[9px] text-emerald-600 font-bold">✓ Ada</span>}
                    </div>

                    <div 
                      onClick={() => {
                        setSelectedKtaChecklist(prev => 
                          prev.includes('TTA_2') ? prev.filter(x => x !== 'TTA_2') : [...prev, 'TTA_2']
                        );
                      }}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedKtaChecklist.includes('TTA_2')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedKtaChecklist.includes('TTA_2') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400'
                        }`}>
                          {selectedKtaChecklist.includes('TTA_2') && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold text-xs">TTA 2</span>
                      </div>
                      {myKtaRecord?.checkDetails?.check2Done && <span className="text-[9px] text-emerald-600 font-bold">✓ Ada</span>}
                    </div>
                  </div>
                )}

                {myObligation.type === '1_KTA_OR_TTA' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedKtaChecklist(['KTA'])}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedKtaChecklist.includes('KTA')
                          ? 'bg-amber-500/20 border-amber-500 text-amber-600 ring-2 ring-amber-500/40 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span>KTA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedKtaChecklist(['TTA'])}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedKtaChecklist.includes('TTA')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/40 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span>TTA</span>
                    </button>
                  </div>
                )}
              </div>

              {/* DROPZONE BUKTI SCREENSHOT */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-main)]">
                    Bukti Screenshot Form KTA/TTA:
                  </label>
                  <span className="text-[10px] text-[var(--primary)] font-semibold">
                    💡 Bisa Paste (Ctrl+V)
                  </span>
                </div>

                {ktaImagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black/40 group aspect-video max-h-52 flex items-center justify-center shadow-md">
                    <img
                      src={ktaImagePreview}
                      alt="Pratinjau Screenshot"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setKtaImageFile(null); setKtaImagePreview(null); }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold shadow-md hover:bg-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[var(--border-main)] hover:border-[var(--primary)] bg-[var(--input-bg)] rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Klik untuk pilih gambar atau tekan Ctrl + V
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setKtaImageFile(file);
                          const reader = new FileReader();
                          reader.onload = (re) => setKtaImagePreview(re.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowKtaModal(false); setKtaImageFile(null); setKtaImagePreview(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingKta || (!ktaImageFile && !ktaImagePreview) || selectedKtaChecklist.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingKta ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Bukti ({selectedKtaChecklist.length} Ceklis)</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: LIGHTBOX PREVIEW BUKTI SS
         ═══════════════════════════════════════════════════════════════ */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[92vh] w-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            {/* Header info in lightbox */}
            <div className="w-full flex items-center justify-between pb-2 text-white/90 text-xs px-1">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Bukti Screenshot General Inspeksi ({currentWeekTag})
              </span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <img
              src={lightboxUrl}
              alt="Bukti Screenshot General Inspeksi"
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20 bg-black/40"
            />

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => {
                  setLightboxUrl(null);
                  setShowSsModal(true);
                }}
                className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Ganti / Upload Ulang</span>
              </button>

              <a
                href={lightboxUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Tab Baru</span>
              </a>

              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white/90 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup Pratinjau</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 4: SELURUH JADWAL TIM (GOOGLE SHEET VIEWER) - ADMIN ONLY
         ═══════════════════════════════════════════════════════════════ */}
      {hasAdminAccess && showFullScheduleModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-main)] bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                  <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black leading-tight flex items-center gap-2">
                    Matriks Jadwal Inspeksi Terpadu
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-emerald-100">
                      Google Sheet Live
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-100/90 leading-tight">
                    Total {allSchedules.length} Personil Terdaftar • PT Harita Nickel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href="https://docs.google.com/spreadsheets/d/1hEcUnXhqvsKsIYxqfzZxIqiVaonshL-pSstEh2DdmIY/edit?gid=0#gid=0"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors text-xs font-bold flex items-center gap-1"
                  title="Buka Spreadsheet di Google Sheets"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Buka Sheet</span>
                </a>
                <button
                  onClick={() => setShowFullScheduleModal(false)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sheet & Filter Bar */}
            <div className="p-3 sm:p-4 border-b border-[var(--border-main)] bg-slate-50/80 dark:bg-slate-900/60 flex flex-col gap-2.5 shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama personil, jabatan, atau area inspeksi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                  />
                </div>

                {/* Tab Week / Sheet Selector */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleSwitchModalSheet('CurrentWeek')}
                    disabled={loadingSheet}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedSheet === 'CurrentWeek'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>⚡ CurrentWeek (W38 Aktif)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchModalSheet('Week 37')}
                    disabled={loadingSheet}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedSheet === 'Week 37'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>⏮️ Week 37 (Rekapan Lalu)</span>
                  </button>
                </div>
              </div>

              {/* Shift Tabs */}
              <div className="flex items-center gap-1.5 w-full overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'siang', label: 'Shift Siang' },
                  { id: 'malam', label: 'Shift Malam' },
                  { id: 'nonshift', label: 'Nonshift' },
                  { id: 'cuti', label: 'Cuti' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterShift(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      filterShift === tab.id
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-2 bg-slate-50/40 dark:bg-slate-950/20">
              {filteredAll.length === 0 ? (
                <div className="py-16 text-center text-xs sm:text-sm text-slate-400 flex flex-col items-center gap-2">
                  <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <span>Tidak ada jadwal personil yang cocok dengan pencarian "{searchQuery}"</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                  {filteredAll.map((item, idx) => {
                    const isCurrentUser = 
                      inspectorName && item.name.toLowerCase().includes(inspectorName.toLowerCase());

                    const shiftLower = (item.shift || '').toLowerCase();
                    let shiftBadgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
                    if (item.isCuti) {
                      shiftBadgeClass = 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800';
                    } else if (shiftLower.includes('malam') || shiftLower.includes('shift a') || shiftLower.includes('shift b')) {
                      shiftBadgeClass = 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
                    } else if (shiftLower.includes('siang') || shiftLower.includes('shift r')) {
                      shiftBadgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800';
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 sm:p-4 transition-all ${
                          isCurrentUser 
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600 dark:border-l-emerald-400' 
                            : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Left Details */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              {item.no}
                            </span>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <h5 className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                                  {item.name}
                                  {isCurrentUser && (
                                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                                      Anda
                                    </span>
                                  )}
                                  {item.isCompleted && (
                                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                      ✓ Selesai
                                    </span>
                                  )}
                                </h5>
                                {item.jabatan && (
                                  <span className="text-xs text-slate-600 font-medium">
                                    • {item.jabatan}
                                  </span>
                                )}
                              </div>

                              {item.isCuti ? (
                                <div className="inline-flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-300 font-semibold bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-200/60 dark:border-sky-800/50 mt-1">
                                  <span>🏖️</span>
                                  <span>Sedang Cuti / Bebas Tugas</span>
                                </div>
                              ) : (
                                <div className="space-y-1 mt-0.5">
                                  <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-snug">
                                    {item.inspeksi}
                                  </p>

                                  {item.partners && item.partners.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" />
                                        {item.partners.length === 1 ? 'Pasangan:' : 'Rekan Tim:'}
                                      </span>
                                      <span className="text-slate-600">
                                        {item.partners.map(p => `${p.name} (${p.roleIndex === 1 ? 'Inspektor 1' : `Inspektor ${p.roleIndex}`})`).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Badges */}
                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pl-10 sm:pl-0">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${shiftBadgeClass}`}>
                              {item.shift}
                            </span>

                            {!item.isCuti && (
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                                item.roleIndex === 1
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              }`}>
                                Peran {item.roleIndex}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-[var(--border-main)] bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <span className="font-medium">
                Menampilkan <strong className="text-slate-600">{filteredAll.length}</strong> dari <strong>{allSchedules.length}</strong> personil
              </span>
              <button
                onClick={() => setShowFullScheduleModal(false)}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-colors shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
