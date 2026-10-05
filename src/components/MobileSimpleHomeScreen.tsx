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
import { ModuleSearchBar } from './ModuleSearchBar';

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

  useEffect(() => {
    const handleSimChange = (e: any) => {
      setSimProfile(e.detail || null);
    };
    const handleOpenSimplified = (e: any) => {
      const tab = e?.detail?.tab || 'weekly';
      setInspectionDefaultTab(tab);
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
      className="w-full pb-28 px-3.5 sm:px-6 space-y-4 max-w-4xl mx-auto"
    >
      {/* ── TOP HERO PROFILE CARD (CLEAN & ELEGANT) ── */}
      <div 
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

        {/* Compact Daily Motivational Quote Ticker */}
        {activeCommunityQuote && (
          <div 
            onClick={() => {
              setQuotesModalTab('details');
              setShowQuotesPoolModal(true);
            }}
            className="mt-3.5 pt-2.5 border-t border-[var(--border-main)]/60 flex items-center justify-between gap-2 text-xs cursor-pointer group hover:bg-amber-500/5 -mx-1 px-1 rounded-lg transition-colors"
            title="Buka Detail & Kumpulan Quotes Komunitas"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-[11px] italic text-[var(--text-muted)] truncate group-hover:text-[var(--text-main)] transition-colors">
                "{activeCommunityQuote.quote}"
              </p>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0 flex items-center">
              Quote <ChevronRight className="w-3 h-3 inline" />
            </span>
          </div>
        )}
      </div>

      {/* ── OPERATIONAL ACTION CENTER DIGEST BAR ── */}
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

      {/* ── SECTION LOG BOOK ACCORDION (PIC TASKS & CHECKLIST) ── */}
      <SectionLogBookBar
        inspectorNik={effectiveNik}
        inspectorName={effectiveName}
        onNav={onNav}
      />

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

      {/* ── MODULE SEARCH BAR (WITH RECOMMENDATIONS ON FOCUS) ── */}
      <ModuleSearchBar
        inspectorNik={effectiveNik}
        inspectorName={effectiveName}
        inspectorRole={effectiveRole}
        inspectorSection={effectiveSection}
        onNav={onNav}
        onOpenKta={() => {
          setInspectionDefaultTab('kta_tta');
          setShowInspectionModal(true);
        }}
        onOpenP5m={() => setShowP5mModal(true)}
      />

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
    </motion.div>
  );
}
