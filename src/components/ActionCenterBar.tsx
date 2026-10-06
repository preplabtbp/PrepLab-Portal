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
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOpenFindingsForSupervisor, isPicTemuanRole } from '../utils/inspection-pic-matcher';
import { getKtaObligation } from './GroupReportScreen';
import { formatProofImageUrl } from './SimplifiedInspectionModal';

interface ActionCenterBarProps {
  inspectorNik?: string | null;
  inspectorName?: string | null;
  inspectorJabatan?: string | null;
  onNav?: (tab: string) => void;
  onOpenKta?: () => void;
  onOpenP5m?: () => void;
  className?: string;
}

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

export function ActionCenterBar({
  inspectorNik,
  inspectorName,
  inspectorJabatan,
  onNav,
  onOpenKta,
  onOpenP5m,
  className = ''
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

  const [openFindings, setOpenFindings] = useState<any[]>([]);
  const [lvDamageTickets, setLvDamageTickets] = useState<any[]>([]);
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
    return userProfile.section || localStorage.getItem('p2h_inspector_section') || '';
  }, [userProfile]);

  const jLower = effectiveJabatan.toLowerCase();
  const sLower = effectiveSection.toLowerCase();

  // Strict Role Isolations:
  // 1. SPV Maintenance ONLY
  const isSpvMaintenance = useMemo(() => {
    const isMaint = jLower.includes('maintenance') || sLower.includes('maintenance') || jLower.includes('workshop');
    const isLead = jLower.includes('supervisor') || jLower.includes('spv') || jLower.includes('foreman') || jLower.includes('lead') || jLower.includes('specialist');
    return isMaint && isLead;
  }, [jLower, sLower]);

  // 2. Supervisor / Leadership in general (Superintendent, Manager, SPV)
  const isSupervisorOrLead = useMemo(() => {
    return isPicTemuanRole(effectiveJabatan);
  }, [effectiveJabatan]);

  // 3. Lab / QA personnel (for Pemantauan Suhu & Gas)
  const isLabOrQA = useMemo(() => {
    return jLower.includes('lab') || jLower.includes('chemist') || jLower.includes('qa') || jLower.includes('quality') || sLower.includes('lab') || sLower.includes('qa') || sLower.includes('quality');
  }, [jLower, sLower]);

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

      const [schedData, p5mData, dailyData, ktaData, ticketsData, proofsData] = await Promise.all([
        schedPromise,
        p5mPromise,
        dailyPromise,
        ktaPromise,
        ticketsPromise,
        proofsPromise
      ]);

      // Process Weekly Inspection Schedule
      if (schedData && schedData.found && schedData.schedule) {
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
      if (p5mData && p5mData.success && p5mData.assignment) {
        setP5mAssignment(p5mData.assignment);
        try { localStorage.setItem('p2h_cached_p5m_assignment', JSON.stringify(p5mData.assignment)); } catch {}
      } else {
        setP5mAssignment(null);
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

    } catch (err) {
      console.warn('ActionCenterBar: Failed to load action items', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActionItems();
  }, [effectiveNik, effectiveName, effectiveJabatan]);

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

    // 2. Laporan KTA / TTA
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

    // 3. Penugasan Pemateri P5M
    const isP5mPending = Boolean(p5mAssignment && !p5mAssignment.isCompleted);
    list.push({
      id: 'p5m',
      title: 'Penugasan Pemateri P5M',
      subtitle: p5mAssignment 
        ? (p5mAssignment.isCompleted 
            ? 'Materi P5M sudah selesai dibawakan hari ini ✓ (+60 EXP)'
            : `${p5mAssignment.day || 'Hari Ini'}: ${p5mAssignment.materi || 'Safety Talk'}`)
        : 'Tidak ada jadwal pemateri minggu ini',
      count: isP5mPending ? 1 : 0,
      isPending: isP5mPending,
      icon: <Users className="w-4 h-4" />,
      iconColor: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/25',
      navKey: 'p5m'
    });

    // 4. Pemantauan Suhu & Gas (Khusus Lab & QA)
    if (isLabOrQA || dailyTasks?.pemantauan) {
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

    // 5. Checklist P2H Peralatan
    if (isOnsite && !isCutiToday) {
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

    // 6. Kerusakan Unit LV (KHUSUS SPV MAINTENANCE SAJA)
    if (isSpvMaintenance) {
      list.push({
        id: 'lv_damage',
        title: 'Kerusakan Unit LV (Maintenance)',
        subtitle: lvDamageTickets.length > 0 
          ? `${lvDamageTickets.length} laporan kerusakan unit/kendaraan aktif` 
          : 'Tidak ada laporan kerusakan unit LV aktif',
        count: lvDamageTickets.length,
        isPending: lvDamageTickets.length > 0,
        icon: <Car className="w-4 h-4" />,
        iconColor: 'text-rose-600 dark:text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/25',
        navKey: 'wo'
      });
    }

    // 7. Temuan Inspeksi K3 Terbuka (Khusus SPV Section / Pimpinan selain LV)
    if (isSupervisorOrLead && openFindings.length > 0) {
      list.push({
        id: 'findings',
        title: 'Temuan Inspeksi Terbuka K3',
        subtitle: `${openFindings.length} temuan K3 di area Anda memerlukan tindak lanjut`,
        count: openFindings.length,
        isPending: openFindings.length > 0,
        icon: <AlertTriangle className="w-4 h-4" />,
        iconColor: 'text-rose-600 dark:text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/25',
        navKey: 'findings'
      });
    }

    return list;
  }, [
    inspectionSchedule, 
    currentWeekTag, 
    isKtaPending, 
    ktaObligation, 
    p5mAssignment, 
    isLabOrQA, 
    dailyTasks, 
    isPemantauanPending, 
    isOnsite, 
    isCutiToday, 
    isP2hPending, 
    isSpvMaintenance, 
    lvDamageTickets, 
    isSupervisorOrLead, 
    openFindings
  ]);

  // Total count is sum of pending counts across all applicable categories
  const totalActionCount = useMemo(() => {
    return categoriesList.reduce((acc, cat) => acc + (cat.isPending ? cat.count : 0), 0);
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
      if (onNav) onNav('sap-dashboard');
      else navigate('/sap-dashboard');
    } else if (destination === 'p2h') {
      if (onNav) onNav('inspect');
      else navigate('/inspect');
    } else if (destination === 'pemantauan') {
      if (onNav) onNav('pemantauan');
      else navigate('/pemantauan');
    } else if (destination === 'wo') {
      if (onNav) onNav('wo-maintenance-dashboard');
      else navigate('/wo-maintenance-dashboard');
    } else if (destination === 'kta') {
      if (onOpenKta) {
        onOpenKta();
        return;
      }
      window.dispatchEvent(new CustomEvent('open-simplified-inspection', { detail: { tab: 'kta_tta' } }));
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
                  Action Center Operasional
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--text-muted,#64748b)] truncate">
                {loading ? (
                  'Memeriksa status jadwal & operasional...'
                ) : totalActionCount > 0 ? (
                  <>
                    Terdapat <strong className="text-rose-600 dark:text-rose-400 font-bold">{totalActionCount} tugas operasional</strong> yang memerlukan perhatian Anda.
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
                  Kategori Operasional & Item Tindak Lanjut
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

              {/* Category Rows Container */}
              <div className="space-y-1.5">
                {categoriesList.map((cat) => (
                  <div
                    key={cat.id}
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
                      {cat.isPending ? (
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
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox Modal for viewing proof screenshots */}
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
