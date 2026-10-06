import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ClipboardList, ClipboardCheck, Camera, Users, Utensils, Shield, 
  FileText, MessageSquare, Trophy, Sparkles, ChevronRight, 
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Settings2,
  ThermometerSun, Heart, RefreshCw, Smartphone, Eye, ShieldAlert,
  Wrench, PlusCircle, BarChart3, BookOpen, GraduationCap, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { FoodReportModal } from './food-report-modal';
import { SimplifiedInspectionModal } from './SimplifiedInspectionModal';
import { SimplifiedP5mModal } from './SimplifiedP5mModal';
import QuotesPoolModal, { CommunityQuoteItem } from './QuotesPoolModal';
import { DevRoleplaySwitcher, getSimulatedProfile, SimulatedProfile } from './DevRoleplaySwitcher';
import { LeadershipDashboardModal } from './LeadershipDashboardModal';
import { getDailySkenaQuote, SkenaQuote } from '../utils/skena-quotes';
import { isPicTemuanRole, getOpenFindingsForSupervisor } from '../utils/inspection-pic-matcher';
import { ActionCenterBar } from './ActionCenterBar';
import { SectionLogBookBar } from './SectionLogBookBar';
import { HomeWidgetDashboard } from './home-widgets/HomeWidgetDashboard';
import { HomeWalkthroughTour } from './HomeWalkthroughTour';

interface MobileSimpleHomeScreenProps {
  inspectorName: string;
  inspectorNik: string;
  onNav: (tab: any) => void;
  userPt?: string;
  onSwitchToFullMode?: () => void;
}

export function MobileSimpleHomeScreen({
  inspectorName,
  inspectorNik,
  onNav,
  userPt,
  onSwitchToFullMode
}: MobileSimpleHomeScreenProps) {
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showP5mModal, setShowP5mModal] = useState(false);
  const [inspectionDefaultTab, setInspectionDefaultTab] = useState<'weekly' | 'kta_tta' | 'findings' | 'p2h'>('weekly');
  const [openFindingsCount, setOpenFindingsCount] = useState<number>(0);
  const [profile, setProfile] = useState<any>(null);
  const [dailyTasks, setDailyTasks] = useState<any>(null);
  const [mySchedule, setMySchedule] = useState<any>(null);
  const [p5mAssignment, setP5mAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dev Roleplay & Leadership state
  const [simProfile, setSimProfile] = useState<SimulatedProfile | null>(() => getSimulatedProfile());
  const [showLeadershipModal, setShowLeadershipModal] = useState(false);
  const [leadershipTargetRole, setLeadershipTargetRole] = useState<'spt_prep' | 'spt_lab' | 'manager'>('manager');

  const [inspectionOpenForm, setInspectionOpenForm] = useState(false);

  useEffect(() => {
    const handleSimChange = (e: any) => {
      setSimProfile(e.detail || null);
    };
    const handleOpenSimplified = (e: any) => {
      const tab = e?.detail?.tab || 'weekly';
      const openForm = Boolean(e?.detail?.openForm);
      setInspectionDefaultTab(tab);
      setInspectionOpenForm(openForm);
      setShowInspectionModal(true);
    };
    const handleOpenP5m = () => {
      setShowP5mModal(true);
    };
    window.addEventListener('dev-roleplay-changed', handleSimChange);
    window.addEventListener('open-simplified-inspection', handleOpenSimplified);
    window.addEventListener('open-simplified-p5m-modal', handleOpenP5m);
    return () => {
      window.removeEventListener('dev-roleplay-changed', handleSimChange);
      window.removeEventListener('open-simplified-inspection', handleOpenSimplified);
      window.removeEventListener('open-simplified-p5m-modal', handleOpenP5m);
    };
  }, []);

  // Quotes Pool & Modal State
  const [showQuotesPoolModal, setShowQuotesPoolModal] = useState(false);
  const [quotesModalTab, setQuotesModalTab] = useState<'details' | 'explore' | 'create'>('details');
  const [communityQuotesList, setCommunityQuotesList] = useState<CommunityQuoteItem[]>([]);
  const [selectedPoolQuote, setSelectedPoolQuote] = useState<CommunityQuoteItem | null>(null);

  // Quote of the day base fallback
  const [activeQuote, setActiveQuote] = useState<SkenaQuote>(() => {
    return getDailySkenaQuote(inspectorNik || inspectorName || 'user');
  });

  // Fetch Community Quotes
  useEffect(() => {
    fetch('/api/quotes')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          setCommunityQuotesList(json.data);
        }
      })
      .catch(() => {});
  }, []);

  // Compute active community quote item
  const activeCommunityQuote: CommunityQuoteItem = useMemo(() => {
    if (selectedPoolQuote) return selectedPoolQuote;

    if (communityQuotesList.length > 0) {
      const matched = communityQuotesList.find(q => q.quote === activeQuote.quote);
      if (matched) return matched;

      const dateStr = new Date().toISOString().split('T')[0];
      const seed = `${(inspectorNik || inspectorName || 'user').trim().toLowerCase()}_daily_quote_${dateStr}`;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % communityQuotesList.length;
      return communityQuotesList[idx];
    }

    return {
      id: 1,
      quote: activeQuote.quote,
      authorNik: '00000000000',
      authorName: 'Generated by AI',
      authorRole: 'AI Assistant',
      authorSection: 'Lab & Prep',
      category: activeQuote.tag || 'Motivasi & Skena',
      likesCount: 0,
      likedBy: [],
      likedByUsers: []
    };
  }, [selectedPoolQuote, communityQuotesList, activeQuote, inspectorNik, inspectorName]);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      setProfile(p);
    } catch {
      // ignore
    }

    // Try reading cached daily tasks and schedules first
    try {
      const cachedDaily = localStorage.getItem('p2h_cached_daily_tasks');
      if (cachedDaily) setDailyTasks(JSON.parse(cachedDaily));

      const cachedSchedule = localStorage.getItem('p2h_cached_my_schedule');
      if (cachedSchedule) setMySchedule(JSON.parse(cachedSchedule));

      const cachedP5m = localStorage.getItem('p2h_cached_p5m_assignment');
      if (cachedP5m) setP5mAssignment(JSON.parse(cachedP5m));
    } catch {
      // ignore
    }

    // Safe JSON parser helper to prevent <!doctype HTML parse errors
    const safeJson = async (res: Response) => {
      try {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    // Fetch live summary data with correct backend endpoints
    const fetchSummary = async () => {
      if (!inspectorNik && !inspectorName) {
        setLoading(false);
        return;
      }
      try {
        const queryParams = new URLSearchParams();
        if (inspectorNik) queryParams.set('nik', inspectorNik);
        if (inspectorName) queryParams.set('name', inspectorName);

        const [dailyRes, schedRes, p5mRes] = await Promise.allSettled([
          fetch(`/api/daily-tasks-status?${queryParams.toString()}`),
          fetch(`/api/inspection-schedule?${queryParams.toString()}`),
          fetch(`/api/p5m/schedules/user-assignment?${queryParams.toString()}&includePast=true`)
        ]);

        if (dailyRes.status === 'fulfilled') {
          const dJson = await safeJson(dailyRes.value);
          if (dJson && dJson.success) {
            setDailyTasks(dJson);
            try { localStorage.setItem('p2h_cached_daily_tasks', JSON.stringify(dJson)); } catch {}
          }
        }

        if (schedRes.status === 'fulfilled') {
          const sJson = await safeJson(schedRes.value);
          if (sJson && sJson.found && sJson.schedule) {
            setMySchedule(sJson.schedule);
            try { localStorage.setItem('p2h_cached_my_schedule', JSON.stringify(sJson.schedule)); } catch {}
          }
        }

        if (p5mRes.status === 'fulfilled') {
          const pJson = await safeJson(p5mRes.value);
          if (pJson && pJson.success && pJson.assignment) {
            setP5mAssignment(pJson.assignment);
            try { localStorage.setItem('p2h_cached_p5m_assignment', JSON.stringify(pJson.assignment)); } catch {}
          }
        }

        // Jika user adalah PIC (SPV / Specialist), hitung temuan terbuka di areanya
        const currentRole = profile?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '';
        if (isPicTemuanRole(currentRole)) {
          try {
            const tickRes = await fetch('/api/tickets');
            if (tickRes.ok) {
              const tickData = await safeJson(tickRes);
              if (Array.isArray(tickData)) {
                const matched = getOpenFindingsForSupervisor(currentRole, tickData);
                setOpenFindingsCount(matched.openFindings?.length || 0);
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Error fetching simple mode data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [inspectorNik, inspectorName]);

  // Greeting calculation
  const hour = new Date().getHours();
  const greetingText = 
    hour >= 4 && hour < 11 ? 'Selamat Pagi' :
    hour >= 11 && hour < 15 ? 'Selamat Siang' :
    hour >= 15 && hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  // Effective roleplay values
  const effectiveName = simProfile?.name || inspectorName || 'Personil PrepLab';
  const effectiveRole = simProfile?.role || profile?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || 'Crew Operasional';
  const effectiveSection = simProfile?.section || profile?.section || 'Preparasi & Lab';
  const effectiveNik = simProfile?.nik || inspectorNik;

  const secLower = effectiveSection.toLowerCase();
  const roleLower = effectiveRole.toLowerCase();

  const isSuperAdmin = 
    inspectorNik === '02D25000055' || 
    inspectorNik === '02D24000043' || 
    inspectorNik === '04D21001047' || 
    inspectorNik === '04D24000042' ||
    inspectorNik === 'M0403240177' ||
    inspectorNik === 'preplabadmin';

  const isDeveloper = isSuperAdmin || localStorage.getItem('p2h_is_developer') === 'true';

  // Section & Role flags
  const isManager = roleLower.includes('manager') || roleLower.includes('head') || roleLower.includes('ktt');
  const isSpt = roleLower.includes('superintendent') || roleLower.includes('spt');
  const isSptPrep = isSpt && secLower.includes('prep');
  const isSptLab = isSpt && secLower.includes('lab');
  const hasLeadershipDashboard = isManager || isSptPrep || isSptLab;

  const isAdministrasi = secLower.includes('admin') || secLower.includes('administrasi') || secLower.includes('hr');
  const isMaintenance = secLower.includes('maint') || secLower.includes('pemeliharaan');
  const isInventoryControl = secLower.includes('inventory') || secLower.includes('inv') || roleLower.includes('inventory');
  const isLaboratory = secLower.includes('lab') && !isInventoryControl;
  const isPreparation = secLower.includes('prep') || secLower.includes('preparasi');
  const isPic = isPicTemuanRole(effectiveRole);

  // Crew checks (including simulated crew in dev roleplay)
  const isSimulatedCrew = Boolean(
    simProfile && (
      simProfile.id === 'crew' || 
      simProfile.role.toLowerCase().includes('crew') || 
      simProfile.role.toLowerCase().includes('operator') || 
      simProfile.role.toLowerCase().includes('helper') ||
      simProfile.role.toLowerCase().includes('teknisi')
    )
  );

  const isCrew = isSimulatedCrew || (
    (roleLower.includes('crew') || roleLower.includes('operator') || roleLower.includes('helper') || roleLower.includes('teknisi')) &&
    !roleLower.includes('spv') && !roleLower.includes('supervisor') && !roleLower.includes('foreman') && !roleLower.includes('officer') &&
    !roleLower.includes('analyst') && !roleLower.includes('superintendent') && !roleLower.includes('manager') && !roleLower.includes('admin') &&
    !isDeveloper && !isSuperAdmin
  );

  const isCrewMaintenance = isCrew && (
    secLower.includes('maint') || 
    secLower.includes('pemeliharaan') || 
    roleLower.includes('maint') || 
    roleLower.includes('mekanik') || 
    roleLower.includes('listrik') || 
    roleLower.includes('electric') || 
    roleLower.includes('welder') ||
    roleLower.includes('teknisi')
  );

  // Status checks
  const p2hDone = !!(dailyTasks?.p2h?.completedToday);
  const pemantauanDone = !!(dailyTasks?.pemantauan?.completedToday);
  const weeklyInspectionDone = !!(mySchedule?.isCompleted);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="w-full pb-28 px-3.5 sm:px-6 lg:px-8 xl:px-10 space-y-6 max-w-[1560px] mx-auto"
    >
      {/* ── TOP SECTION: ENTERPRISE 2-COLUMN ON DESKTOP, FLUID ON MOBILE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* Left Column (Desktop 5 cols: Profile & Search) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          {/* ── TOP HERO PROFILE CARD (CLEAN & ELEGANT) ── */}
          <div 
            id="home-profile-card"
            className="relative overflow-hidden rounded-3xl p-4 sm:p-5 border shadow-sm"
            style={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)'
            }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Avatar Profile */}
              <div 
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-display font-black text-xl shadow-inner border border-teal-500/20 shrink-0 text-white"
                style={{
                  background: 'linear-gradient(135deg, var(--primary, #0D9488) 0%, #059669 100%)'
                }}
              >
                {profile?.avatar ? (
                  <img src={profile.avatar} alt={inspectorName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{inspectorName ? inspectorName.charAt(0).toUpperCase() : 'P'}</span>
                )}
              </div>

              {/* Name & Role (Elegantly Wrapped Without Cutoffs) */}
              <div className="min-w-0 flex-1">
                <span className="text-[11px] sm:text-xs font-bold text-[var(--text-muted)] block leading-none mb-1">
                  {greetingText},
                </span>
                <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] font-display leading-snug break-words">
                  {effectiveName}
                </h2>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                    {effectiveRole}
                  </span>
                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shrink-0">
                    {effectiveSection}
                  </span>
                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                    ● Onsite
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Motivational Quote Ticker (Adaptive Card Height, No Cutoff) */}
            {activeCommunityQuote && (
              <div 
                onClick={() => {
                  setQuotesModalTab('details');
                  setShowQuotesPoolModal(true);
                }}
                className="mt-3.5 pt-2.5 border-t border-[var(--border-main)]/60 flex items-start justify-between gap-2.5 text-xs cursor-pointer group hover:bg-amber-500/5 -mx-1 px-1.5 py-1 rounded-xl transition-all"
                title="Buka Detail & Kumpulan Quotes Komunitas"
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] sm:text-xs italic text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors break-words leading-relaxed whitespace-normal">
                    "{activeCommunityQuote.quote}"
                  </p>
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0 flex items-center gap-0.5 mt-0.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                  <span>Quote</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Desktop 7 cols: Action Center & Log Book) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* ── CONDITIONAL BODY: CREW DEDICATED MENU vs REGULAR/SUPERVISOR DASHBOARD ── */}
          {isCrew ? (
        <div className="space-y-4 pt-1">
          {/* Header Banner */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--text-main)] font-display">
                Menu Crew Operasional
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/25">
              {isCrewMaintenance ? '5 Menu Utama' : '4 Menu Utama'}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* 1. Pengisian Quiz */}
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNav('quiz')}
              className="w-full text-left p-4 sm:p-5 rounded-3xl border shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-indigo-500/15 via-purple-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    Edukasi
                  </span>
                </div>
                <h4 className="font-bold text-sm sm:text-base text-[var(--text-main)] group-hover:text-indigo-600 transition-colors">
                  Pengisian Quiz
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Ikuti evaluasi berkala dan uji pemahaman prosedur keselamatan &amp; teknis kerja harian.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-main)]/60 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span>Mulai Kerjakan Quiz</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            {/* 2. Pelaporan Klinik */}
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNav('clinic')}
              className="w-full text-left p-4 sm:p-5 rounded-3xl border shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-rose-500/15 via-red-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
                    <Heart className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25">
                    Kesehatan
                  </span>
                </div>
                <h4 className="font-bold text-sm sm:text-base text-[var(--text-main)] group-hover:text-rose-600 transition-colors">
                  Pelaporan Klinik
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Pencatatan kunjungan periksa klinik, keluhan fisik atau sakit, dan surat istirahat.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-main)]/60 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
                <span>Buka Formulir Klinik</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            {/* 3. Pelaporan Makanan */}
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFoodModal(true)}
              className="w-full text-left p-4 sm:p-5 rounded-3xl border shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-500/15 via-orange-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                    Catering &amp; Mess
                  </span>
                </div>
                <h4 className="font-bold text-sm sm:text-base text-[var(--text-main)] group-hover:text-amber-600 transition-colors">
                  Pelaporan Makanan
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Lapor ulasan menu makanan: rasa masakan, porsi, kebersihan, serta foto kondisi makanan.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-main)]/60 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                <span>Isi Laporan Makanan</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            {/* 4. Profile Karyawan */}
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onNav('profile');
                window.dispatchEvent(new CustomEvent('open-profile-screen'));
              }}
              className="w-full text-left p-4 sm:p-5 rounded-3xl border shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-teal-500/15 via-emerald-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/25">
                    Data Akun
                  </span>
                </div>
                <h4 className="font-bold text-sm sm:text-base text-[var(--text-main)] group-hover:text-teal-600 transition-colors">
                  Profile Karyawan
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Lihat data kepegawaian, avatar profil, sertifikasi, status roster cuti, dan keamanan akun.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-main)]/60 flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400">
                <span>Buka Profile Karyawan</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            {/* 5. Khusus Crew Maintenance: Penyelesaian Work Order */}
            {isCrewMaintenance && (
              <motion.button
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNav('wo-list')}
                className="w-full text-left p-4 sm:p-5 rounded-3xl border shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between sm:col-span-2"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'rgba(37, 99, 235, 0.4)'
                }}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-blue-500/15 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                      Khusus Tim Maintenance
                    </span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-[var(--text-main)] group-hover:text-blue-600 transition-colors">
                    Penyelesaian Work Order (WO)
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    Update status perbaikan alat yang sedang dikerjakan, input pemakaian suku cadang / sparepart, serta dokumentasi foto penyelesaian.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border-main)]/60 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Buka Modul Penyelesaian WO</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ── OPERATIONAL ACTION CENTER DIGEST BAR ── */}
          <div id="home-action-center-bar">
            <ActionCenterBar
              inspectorNik={effectiveNik}
              inspectorName={effectiveName}
              inspectorJabatan={effectiveRole}
              onNav={onNav}
              onOpenKta={() => {
                setInspectionDefaultTab('kta_tta');
                setShowInspectionModal(true);
              }}
              onOpenP5m={() => setShowP5mModal(true)}
            />
          </div>

          {/* ── SECTION LOG BOOK ACCORDION (PIC TASKS & CHECKLIST) ── */}
          <div id="home-logbook-bar">
            <SectionLogBookBar
              inspectorNik={effectiveNik}
              inspectorName={effectiveName}
              onNav={onNav}
            />
          </div>

          {/* ── EXECUTIVE / LEADERSHIP DASHBOARD TRIGGER CARD (SPT UP) ── */}
          {hasLeadershipDashboard && (
            <button
              type="button"
              onClick={() => {
                if (isManager) setLeadershipTargetRole('manager');
                else if (isSptPrep) setLeadershipTargetRole('spt_prep');
                else setLeadershipTargetRole('spt_lab');
                setShowLeadershipModal(true);
              }}
              className="w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 shadow-xs hover:shadow-md active:scale-98 transition-all cursor-pointer overflow-hidden relative group"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: isManager ? 'rgba(245, 158, 11, 0.4)' : isSptPrep ? 'rgba(16, 185, 129, 0.4)' : 'rgba(168, 85, 247, 0.4)'
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                  isManager 
                    ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' 
                    : isSptPrep 
                      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' 
                      : 'bg-purple-500/15 text-purple-600 border-purple-500/30'
                }`}>
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md border ${
                      isManager 
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25' 
                        : isSptPrep 
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' 
                          : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25'
                    }`}>
                      Executive Panel
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">● Realtime Sync</span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-[var(--text-main)] group-hover:text-amber-600 transition-colors leading-tight mt-0.5 truncate">
                    {isManager ? 'Executive Dashboard PrepLab' : isSptPrep ? 'Dashboard SPT Preparation' : 'Dashboard SPT Laboratory'}
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    {isManager ? 'Tinjauan keselamatan, kesiapan alat, & manpower' : isSptPrep ? 'Kesiapan armada alat berat & kepatuhan P2H kru' : 'Integritas suhu/gas, instrumen lab, & analis'}
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
              </div>
            </button>
          )}

        </>
      )}
        </div>
      </div>

      {/* ── CUSTOMIZABLE WIDGET DASHBOARD (FULL WIDTH) ── */}
      <HomeWidgetDashboard userNik={effectiveNik} />

      {/* Food Report Modal */}
      <FoodReportModal 
        isOpen={showFoodModal}
        onClose={() => setShowFoodModal(false)}
        userNik={inspectorNik}
        userName={inspectorName}
        userDept="ALL"
      />

      {/* Simplified Inspection & KTA/TTA Modal */}
      <SimplifiedInspectionModal
        isOpen={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        inspectorNik={effectiveNik}
        inspectorName={effectiveName}
        userSection={effectiveSection}
        userJabatan={effectiveRole}
        schedule={mySchedule}
        defaultTab={inspectionDefaultTab}
        initialOpenForm={inspectionOpenForm}
        onNav={onNav}
        onSuccess={() => {
          // Refresh findings
          if (isPic) {
            fetch('/api/tickets')
              .then(r => r.ok ? r.json() : [])
              .then(tickets => {
                const matched = getOpenFindingsForSupervisor(effectiveRole, tickets);
                setOpenFindingsCount(matched.openFindings?.length || 0);
              })
              .catch(() => {});
          }
        }}
      />

      {/* Simplified P5M Schedule & Material Modal */}
      <SimplifiedP5mModal
        isOpen={showP5mModal}
        onClose={() => setShowP5mModal(false)}
        inspectorNik={inspectorNik}
        inspectorName={inspectorName}
        p5mAssignment={p5mAssignment}
        onNav={onNav}
      />

      {/* Community Quotes Pool Dialog Modal */}
      <QuotesPoolModal
        show={showQuotesPoolModal}
        onClose={() => setShowQuotesPoolModal(false)}
        selectedQuote={activeCommunityQuote}
        initialTab={quotesModalTab}
        onSelectAsDailyQuote={(q) => {
          setSelectedPoolQuote(q);
        }}
        inspectorNik={effectiveNik}
        inspectorName={effectiveName}
      />

      {/* Leadership Dashboard Modal (SPT Up) */}
      <LeadershipDashboardModal
        isOpen={showLeadershipModal}
        onClose={() => setShowLeadershipModal(false)}
        targetRole={leadershipTargetRole}
        inspectorName={effectiveName}
        inspectorNik={effectiveNik}
        onNav={onNav}
      />

      {/* Interactive Onboarding Walkthrough Tour */}
      <HomeWalkthroughTour
        userNik={effectiveNik}
        userName={effectiveName}
        userRole={effectiveRole}
        userSection={effectiveSection}
      />
    </motion.div>
  );
}
