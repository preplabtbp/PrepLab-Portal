import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Award, Crown, Star, Sparkles, Shield, Flame, CheckCircle2, 
  Lock, ArrowLeft, Users, Filter, ChevronRight, Info, Zap, Gift, 
  Layers, MapPin, Search, Eye, AlertTriangle, HelpCircle, Check, Swords,
  Medal, Target, Activity, Compass, BookmarkCheck, Share2, X, Building2,
  BarChart3
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Button, Card } from './ui';
import { toast } from 'sonner';
import { ExpAuditModal } from './ExpAuditModal';
import { POINT_BLANK_RANKS, getRankByXp, PBRank } from '../lib/pointBlankRanks';
import { 
  TIERED_ACHIEVEMENTS, 
  AchievementBranch, 
  AchievementTier, 
  AVAILABLE_FRAMES, 
  calculateBranchProgress, 
  getFrameById,
  getAchievementTierStyle,
  TierVisualConfig
} from '../lib/gamificationEngine';
import { DynamicAvatarFrame } from './DynamicAvatarFrame';

export interface LeaderboardUser {
  rank: number;
  nik: string;
  name: string;
  section: string;
  pt: string;
  avatar?: string;
  title: string;
  frame: string;
  seasonXp: number;
  totalXp: number;
  currentRank: PBRank;
  badgesCount: number;
  inspectionCount: number;
  defectsCount?: number;
  ktaCount: number;
  woCreateCount?: number;
  woResolveCount?: number;
  csCount?: number;
  feedbackCount?: number;
  quotesCount?: number;
  themesCount?: number;
  bulletinCount?: number;
  p5mSpeakerCount?: number;
  quiz100Count?: number;
  loginStreak?: number;
  nightCount?: number;
  dawnCount?: number;
  weekendCount?: number;
  polymathCount?: number;
  p5mStreak: number;
  roleStartingXp?: number;
  achievementBonusXp?: number;
  baseActionsXp?: number;
  isDevUser?: boolean;
  publicRank?: any;
  sKtaCount?: number;
  sInspectionCount?: number;
  sDefectsCount?: number;
  sWoCreateCount?: number;
  sWoResolveCount?: number;
  sFeedbackCount?: number;
  sQuotesCount?: number;
  sThemesCount?: number;
  sBulletinCount?: number;
  sQuiz100Count?: number;
  sNightCount?: number;
  sDawnCount?: number;
  sWeekendCount?: number;
}


export const DISCIPLINE_OPTIONS = [
  { code: 'EXP', label: 'EXP Bulan Ini (Top Gun)', icon: '🏆', unit: 'EXP' },
  { code: 'BRANCH_KTA', label: 'Laporan KTA / Hazard', icon: '⚠️', unit: 'Laporan' },
  { code: 'BRANCH_INSPECTION', label: 'Inspeksi K3 & APD', icon: '🛡️', unit: 'Inspeksi' },
  { code: 'BRANCH_DEFECTS', label: 'Penuntasan Temuan K3', icon: '🎯', unit: 'Temuan Tuntas' },
  { code: 'BRANCH_WO_CREATE', label: 'Pembuat Work Order', icon: '📋', unit: 'Tiket WO' },
  { code: 'BRANCH_WO_RESOLVE', label: 'Penyelesai WO / Teknisi', icon: '⚙️', unit: 'WO Selesai' },
  { code: 'BRANCH_P5M_SPEAKER', label: 'Pemateri Briefing P5M', icon: '🎙️', unit: 'Sesi P5M' },
  { code: 'BRANCH_BULLETIN', label: 'Diskusi Papan Buletin', icon: '📰', unit: 'Komentar' },
  { code: 'BRANCH_FEEDBACK', label: 'Ide Inovasi & Saran', icon: '💡', unit: 'Ide/Saran' },
  { code: 'BRANCH_QUOTES', label: 'Quotes Motivasi', icon: '💬', unit: 'Quotes' },
  { code: 'BRANCH_QUIZ', label: 'Kuis SOP Sempurna (100%)', icon: '🎓', unit: 'Kuis 100%' },
  { code: 'BRANCH_LOGIN_STREAK', label: 'Kehadiran Login Streak', icon: '🔥', unit: 'Hari Beruntun' },
  { code: 'BRANCH_NIGHT', label: 'Shift Malam (Jam Hening)', icon: '🌙', unit: 'Shift Malam' },
  { code: 'BRANCH_DAWN', label: 'Shift Subuh (Patroli Fajar)', icon: '🌅', unit: 'Patroli Subuh' },
  { code: 'BRANCH_WEEKEND', label: 'Dedikasi Akhir Pekan', icon: '⚡', unit: 'Tugas Weekend' },
  { code: 'BRANCH_POLYMATH', label: 'Master Segala Lini (Polymath)', icon: '🌐', unit: 'Bidang Aktif' }
];

export function getUserDisciplineValue(u: LeaderboardUser, discCode: string): number {
  switch (discCode) {
    case 'EXP': return u.seasonXp || 0;
    case 'BRANCH_KTA': return u.ktaCount || 0;
    case 'BRANCH_INSPECTION': return u.inspectionCount || 0;
    case 'BRANCH_DEFECTS': return u.defectsCount || 0;
    case 'BRANCH_WO_CREATE': return u.woCreateCount || 0;
    case 'BRANCH_WO_RESOLVE': return u.woResolveCount || 0;
    case 'BRANCH_P5M_SPEAKER': return u.p5mSpeakerCount || 0;
    case 'BRANCH_BULLETIN': return u.bulletinCount || 0;
    case 'BRANCH_FEEDBACK': return u.feedbackCount || 0;
    case 'BRANCH_QUOTES': return u.quotesCount || 0;
    case 'BRANCH_QUIZ': return u.quiz100Count || 0;
    case 'BRANCH_LOGIN_STREAK': return u.loginStreak || 0;
    case 'BRANCH_NIGHT': return u.nightCount || 0;
    case 'BRANCH_DAWN': return u.dawnCount || 0;
    case 'BRANCH_WEEKEND': return u.weekendCount || 0;
    case 'BRANCH_POLYMATH': return u.polymathCount || 0;
    default: return u.seasonXp || 0;
  }
}

export interface SectionScore {
  name: string;
  totalPersonnel: number;
  avgXp: number;
  safetyCompliance: number;
  totalInspections: number;
  totalKta: number;
  color: string;
  rank?: number;
}

export function LeaderboardScreen({
  onBack,
  inspectorNik,
  inspectorName,
  userProfile
}: {
  onBack: () => void;
  inspectorNik: string | null;
  inspectorName: string | null;
  userProfile?: any;
}) {
  const [activeTab, setActiveTab] = useState<'individual' | 'ranks' | 'sections' | 'achievements' | 'customization'>('individual');
  const [selectedBranch, setSelectedBranch] = useState<AchievementBranch | null>(null);
  const [achievementFilter, setAchievementFilter] = useState<'ALL' | 'ROUTINE' | 'HIDDEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState<'ALL' | 'TBP_GPS' | 'GTS'>('ALL');
  const [rankSearchQuery, setRankSearchQuery] = useState('');
  const [rankTierGroupFilter, setRankTierGroupFilter] = useState('ALL');
  const [rankSortOrder, setRankSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('EXP');

  // User Equipped Customization (LocalStorage + Live Sync)
  const [userTitle, setUserTitle] = useState(() => {
    const saved = localStorage.getItem('preplab_equipped_title');
    return (saved && saved !== 'Frontline Scout') ? saved : 'Frontline Trainee';
  });
  const [userFrame, setUserFrame] = useState(() => localStorage.getItem('preplab_equipped_frame') || 'golden_halo');
  const [showCelebration, setShowCelebration] = useState(false);

  // Live Gamification Profile Data from Server with Instant LocalStorage Hydration
  const currentNik = inspectorNik || '02D25000055';
  const [userGamification, setUserGamification] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`preplab_gamification_${currentNik}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardUser[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('preplab_cached_leaderboard');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.leaderboard) && parsed.leaderboard.length > 0) {
            return parsed.leaderboard;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [sectionScores, setSectionScores] = useState<SectionScore[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('preplab_cached_leaderboard');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.sectionScores)) {
            return parsed.sectionScores;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [devPersonnel, setDevPersonnel] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('preplab_cached_leaderboard');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.devPersonnel)) {
            return parsed.devPersonnel;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => leaderboardList.length === 0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditTargetNik, setAuditTargetNik] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenAudit = (e: any) => {
      if (e.detail?.nik) {
        setAuditTargetNik(e.detail.nik);
      }
      setShowAuditModal(true);
    };
    window.addEventListener('open-exp-audit', handleOpenAudit);
    return () => window.removeEventListener('open-exp-audit', handleOpenAudit);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setRefreshTick(t => t + 1);
    };
    window.addEventListener('gamification_updated', handleUpdate);
    window.addEventListener('profile_updated', handleUpdate);
    return () => {
      window.removeEventListener('gamification_updated', handleUpdate);
      window.removeEventListener('profile_updated', handleUpdate);
    };
  }, []);

  // Load live user stats and leaderboard from server concurrently
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        // Concurrently fetch user-stats and leaderboard
        const [userRes, lbRes] = await Promise.all([
          fetch(`/api/gamification/user-stats/${encodeURIComponent(currentNik)}?name=${encodeURIComponent(inspectorName || '')}`),
          fetch('/api/gamification/leaderboard')
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          if (isMounted) {
            setUserGamification(userData);
            try {
              localStorage.setItem(`preplab_gamification_${currentNik}`, JSON.stringify(userData));
            } catch (e) {}
            if (!localStorage.getItem('preplab_equipped_title') && userData.defaultTitle) {
              setUserTitle(userData.defaultTitle);
            }
            if (!localStorage.getItem('preplab_equipped_frame') && userData.equippedFrame) {
              setUserFrame(userData.equippedFrame);
            }
          }
        }

        if (lbRes.ok) {
          const lbData = await lbRes.json();
          if (isMounted) {
            const list = lbData.leaderboard || [];
            const scores = lbData.sectionScores || [];
            const devs = lbData.devPersonnel || [];
            setLeaderboardList(list);
            setSectionScores(scores);
            setDevPersonnel(devs);
            try {
              localStorage.setItem('preplab_cached_leaderboard', JSON.stringify({
                leaderboard: list,
                devPersonnel: devs,
                sectionScores: scores,
                updatedAt: Date.now()
              }));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error("Failed to load gamification data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [inspectorNik, inspectorName, refreshTick]);

  // Derive current user rank info
  const userTotalXp = userGamification?.totalXp ?? 0;
  const userRankData = getRankByXp(userTotalXp);
  // For public display: show GM rank if user is a developer
  const isCurrentUserDev = userGamification?.isDevUser === true ||
    ['19980101', 'DEV001', 'ADMIN', 'SYSTEM'].includes(String(currentNik).trim().toUpperCase()) ||
    ['adryansyah', 'alvin', 'admin'].includes(String(inspectorName || userProfile?.name || '').trim().toLowerCase());
  const userPublicRank = isCurrentUserDev
    ? (userGamification?.publicRank || { id: 0, name: 'Game Master', icon: '/assets/ranks/rank_special_gm.svg', isGM: true })
    : userRankData.currentRank;

  // Active discipline config
  const activeDisciplineConfig = useMemo(() => {
    return DISCIPLINE_OPTIONS.find(d => d.code === selectedDiscipline) || DISCIPLINE_OPTIONS[0];
  }, [selectedDiscipline]);

  // Filtered leaderboard based on Entity (TBP & GPS vs GTS) & Selected Discipline
  const entityFilteredList = useMemo(() => {
    const list = leaderboardList.filter(u => {
      const userPt = (u.pt || 'TBP').trim().toUpperCase();
      if (entityFilter === 'TBP_GPS') return userPt === 'TBP' || userPt === 'GPS';
      if (entityFilter === 'GTS') return userPt === 'GTS';
      return true;
    });

    if (selectedDiscipline === 'EXP') {
      // Monthly EXP ranking (resets monthly via seasonXp), break ties with totalXp
      return [...list].sort((a, b) => (b.seasonXp - a.seasonXp) || (b.totalXp - a.totalXp));
    } else {
      // Specific discipline / achievement ranking
      return [...list].sort((a, b) => {
        const valA = getUserDisciplineValue(a, selectedDiscipline);
        const valB = getUserDisciplineValue(b, selectedDiscipline);
        return (valB - valA) || (b.seasonXp - a.seasonXp) || (b.totalXp - a.totalXp);
      });
    }
  }, [leaderboardList, entityFilter, selectedDiscipline]);

  // Top 3 Podium of the filtered entity
  const top3 = useMemo(() => entityFilteredList.slice(0, 3), [entityFilteredList]);

  // Filtered leaderboard table with search & section
  const filteredUsers = useMemo(() => {
    return entityFilteredList.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.nik.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSec = sectionFilter === 'ALL' || 
        (sectionFilter === 'Quality Assurance' && (u.section.toLowerCase().includes('quality') || u.section.toLowerCase() === 'qa')) ||
        (sectionFilter === 'Inventory Control' && u.section.toLowerCase().includes('inventory')) ||
        (sectionFilter === 'Administration' && u.section.toLowerCase().includes('admin')) ||
        u.section.toLowerCase().includes(sectionFilter.toLowerCase());
      return matchSearch && matchSec;
    });
  }, [entityFilteredList, searchQuery, sectionFilter]);

  // Display only Top 10 by default, or all matching if search query is active
  const displayedUsers = useMemo(() => {
    if (searchQuery.trim()) return filteredUsers;
    return filteredUsers.slice(0, 10);
  }, [filteredUsers, searchQuery]);

  // Current user rank & outside top 10 detection in current category/discipline
  const myUserInFilteredIndex = useMemo(() => {
    return filteredUsers.findIndex(u => 
      u.nik === currentNik || 
      (inspectorName && u.name.trim().toLowerCase() === inspectorName.trim().toLowerCase())
    );
  }, [filteredUsers, currentNik, inspectorName]);

  const isMyRankOutsideTop10 = (myUserInFilteredIndex >= 10) || (myUserInFilteredIndex === -1 && !searchQuery.trim());
  const myUserRankNumber = myUserInFilteredIndex !== -1 ? myUserInFilteredIndex + 1 : null;
  const myUserEntry = myUserInFilteredIndex !== -1 ? filteredUsers[myUserInFilteredIndex] : null;

  // Group personnel by rank ID
  const rankPersonnelMap = useMemo(() => {
    const map = new Map<number, LeaderboardUser[]>();
    for (const rank of POINT_BLANK_RANKS) {
      map.set(rank.id, []);
    }
    for (const user of entityFilteredList) {
      const rId = user.currentRank?.id || 1;
      const list = map.get(rId) || [];
      list.push(user);
      map.set(rId, list);
    }

    // Populate GM Rank (id: 0) with devPersonnel
    const gmList: any[] = [...(devPersonnel || [])];
    if (isCurrentUserDev && !gmList.some(u => u.nik === currentNik)) {
      gmList.push({
        nik: currentNik,
        name: inspectorName || userProfile?.name || 'Game Master',
        section: userProfile?.section || 'Preparation',
        pt: userProfile?.pt || 'TBP',
        position: 'Game Master / Developer',
        frame: userFrame || 'cyber_neon',
        title: userTitle || 'System Architect',
        avatar: userProfile?.avatar || null,
        isDevUser: true,
        totalXp: userTotalXp,
        seasonXp: userGamification?.seasonXp || 0
      });
    }
    map.set(0, gmList);

    return map;
  }, [entityFilteredList, devPersonnel, isCurrentUserDev, currentNik, inspectorName, userProfile, userFrame, userTitle, userTotalXp, userGamification]);

  // All distinct tier groups for filter buttons
  const allTierGroups = useMemo(() => {
    return ['ALL', ...Array.from(new Set(POINT_BLANK_RANKS.map(r => r.tierGroup)))];
  }, []);

  // Filter and sort ranks list
  const filteredRanks = useMemo(() => {
    let list = [...POINT_BLANK_RANKS];

    if (rankTierGroupFilter !== 'ALL') {
      list = list.filter(r => r.tierGroup === rankTierGroupFilter);
    }

    if (rankSearchQuery.trim()) {
      const q = rankSearchQuery.toLowerCase();
      list = list.filter(r => {
        const matchRankName = r.name.toLowerCase().includes(q) || String(r.id) === q;
        const usersInRank = rankPersonnelMap.get(r.id) || [];
        const matchUserName = usersInRank.some(u => u.name.toLowerCase().includes(q) || u.nik.toLowerCase().includes(q));
        return matchRankName || matchUserName;
      });
    }

    if (rankSortOrder === 'desc') {
      // Put GM (id: 0) at the very top in descending hierarchy
      list.sort((a, b) => {
        if (a.id === 0) return -1;
        if (b.id === 0) return 1;
        return b.id - a.id;
      });
    } else {
      list.sort((a, b) => {
        if (a.id === 0) return -1;
        if (b.id === 0) return 1;
        return a.id - b.id;
      });
    }

    return list;
  }, [rankTierGroupFilter, rankSearchQuery, rankSortOrder, rankPersonnelMap]);

  const handleEquipTitle = async (title: string) => {
    setUserTitle(title);
    localStorage.setItem('preplab_equipped_title', title);
    toast.success(`Gelar aktif berhasil diubah menjadi "${title}"!`);

    try {
      const currentNik = inspectorNik || '02D25000055';
      await fetch('/api/gamification/equip-customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik: currentNik, title })
      });
    } catch (e) {
      console.warn('Equip title backend sync notice:', e);
    }
  };

  const handleEquipFrame = async (frameId: string) => {
    setUserFrame(frameId);
    localStorage.setItem('preplab_equipped_frame', frameId);
    toast.success('Bingkai avatar aktif berhasil diperbarui! Seluruh pengguna dapat melihatnya.');

    try {
      const currentNik = inspectorNik || '02D25000055';
      await fetch('/api/gamification/equip-customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik: currentNik, frame: frameId })
      });
    } catch (e) {
      console.warn('Equip frame backend sync notice:', e);
    }
  };

  // Helper to determine if an achievement branch has been unlocked (Tier 1 completed)
  const isBranchUnlocked = (branchIdOrCode: string) => {
    if (!userGamification?.branchResults) return false;
    const br = userGamification.branchResults.find(
      (b: any) => b.branch?.id === branchIdOrCode || b.branch?.code === branchIdOrCode
    );
    return Boolean(br && br.unlockedTitles && br.unlockedTitles.length > 0);
  };

  const isFrameUnlocked = (frame: any) => {
    if (!frame.isExclusive || !frame.sourceAchId) return true;
    return isBranchUnlocked(frame.sourceAchId);
  };

  const getFrameTierLevel = (frame: any): number => {
    if (!frame || !frame.sourceAchId) return 4;
    const br = userGamification?.branchResults?.find(
      (b: any) => b.branch?.id === frame.sourceAchId || b.branch?.code === frame.sourceAchId
    );
    if (!br || !br.currentTier) return 1;
    return br.currentTier.tierLevel || 1;
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    toast.success('🎉 Gelar Kehormatan Baru Terbuka!');
    setTimeout(() => setShowCelebration(false), 3500);
  };

  return (
    <div className="min-h-screen pb-28 text-[var(--text-main)] transition-colors duration-200">
      {/* Toast celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="text-center p-8 bg-slate-900/90 border-2 border-amber-400 rounded-3xl shadow-2xl shadow-amber-500/50 scale-105 transform transition-transform">
            <Sparkles className="w-16 h-16 text-amber-400 mx-auto animate-bounce mb-3" />
            <h2 className="text-2xl font-black text-amber-300 font-display">PROMOSI PRESTASI!</h2>
            <p className="text-sm text-slate-200 mt-1">Dedikasi dan kontribusi nyata Anda telah diakui sistem PrepLab.</p>
          </div>
        </div>
      )}

      {/* Header with Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-muted)] cursor-pointer mb-3 shadow-2xs"
          style={{ borderColor: 'var(--border-main)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-xs">
                Hall of Fame · Season 1
              </span>
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-semibold">
                <Medal className="w-3.5 h-3.5 text-amber-500" />
                Jenjang Kehormatan Operasional PrepLab (25.000 EXP)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[var(--text-main)] mt-1">
              Klasemen &amp; Prestasi Kehormatan
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <button
              type="button"
              onClick={() => {
                setAuditTargetNik(inspectorNik);
                setShowAuditModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 transition-all cursor-pointer active:scale-95 shadow-2xs"
              title="Buka Tabel Rekapitulasi & Audit Perolehan EXP"
            >
              <BarChart3 className="w-4 h-4 text-teal-500 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-teal-600 dark:text-teal-400 block leading-tight">Audit Sistem</span>
                <span className="text-xs font-black block leading-tight">Rekap EXP</span>
              </div>
            </button>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <img 
                src={userPublicRank.icon} 
                alt={userPublicRank.name}
                className="w-7 h-7 object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
              />
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-amber-500 block leading-tight">
                  {isCurrentUserDev ? 'Status' : 'Pangkat Anda'}
                </span>
                <span className="text-xs font-black text-[var(--text-main)] block leading-tight truncate max-w-[140px]">
                  {userPublicRank.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Main Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'individual'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>Top Gun Individu</span>
          </button>

          <button
            onClick={() => setActiveTab('ranks')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'ranks'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-300" />
            <span>Daftar Pangkat &amp; Personil</span>
          </button>

          <button
            onClick={() => setActiveTab('sections')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'sections'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
            }`}
          >
            <Swords className="w-4 h-4 text-teal-300" />
            <span>Inter-Section Clash</span>
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'achievements'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
            }`}
          >
            <Award className="w-4 h-4 text-purple-300" />
            <span>Mastery Achievements (12 Cabang)</span>
          </button>

          <button
            onClick={() => setActiveTab('customization')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'customization'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/25'
                : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Studio Gelar &amp; Profil</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuditTargetNik(inspectorNik);
              setShowAuditModal(true);
            }}
            className="px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-2xs"
            title="Buka Tabel Rekapitulasi & Audit Perolehan EXP"
          >
            <BarChart3 className="w-4 h-4 text-teal-500 shrink-0" />
            <span>Rekap Perolehan EXP</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 space-y-6">

        {/* TAB 1: INDIVIDUAL TOP GUN LEADERBOARD */}
        {activeTab === 'individual' && (
          <div className="space-y-6">
            {/* Monthly Reset & Gamification Baseline Status Banner */}
            <div 
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--text-main)]">
                      Klasemen Performa Bulanan (Reset Otomatis Tiap Awal Bulan)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Reset Tiap Tgl 1
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Peringkat klasemen kompetisi dihitung eksklusif dari perolehan EXP pada bulan berjalan (direset setiap awal bulan). Jenjang Pangkat Kehormatan (Level 1–51) tetap permanen berdasarkan total karir.
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Periode Klasemen</span>
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">Bulan Berjalan</span>
              </div>
            </div>

            {/* Discipline / Achievement Category Selector (Tolak Ukur Keaktifan Personil di Tiap Bidang) */}
            <div className="space-y-2 p-3 rounded-3xl bg-[var(--input-bg)] border border-[var(--border-main)] shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
                <span className="text-xs font-black text-[var(--text-main)] flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Pilih Tolak Ukur Klasemen:</span>
                </span>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold">
                  {selectedDiscipline === 'EXP' 
                    ? '⚡ EXP Bulan Ini (Direset Setiap Awal Bulan)' 
                    : `🎖️ Klasemen Keaktifan Bidang: ${activeDisciplineConfig.label}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {DISCIPLINE_OPTIONS.map(disc => {
                  const isSelected = selectedDiscipline === disc.code;
                  return (
                    <button
                      key={disc.code}
                      type="button"
                      onClick={() => setSelectedDiscipline(disc.code)}
                      className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25 scale-102 font-black ring-1 ring-amber-400'
                          : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)] hover:border-amber-400/40'
                      }`}
                    >
                      <span>{disc.icon}</span>
                      <span>{disc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Entity Filter Segments (Pemisahan TBP & GPS dengan GTS) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-3xl bg-[var(--input-bg)] border border-[var(--border-main)] shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] pl-2">
                <Building2 className="w-4 h-4 text-teal-500 shrink-0" />
                <span>Filter Entitas Perusahaan:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setEntityFilter('ALL')}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    entityFilter === 'ALL'
                      ? 'bg-teal-600 text-white shadow-xs scale-102 font-black'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
                  }`}
                >
                  🌐 Semua ({leaderboardList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEntityFilter('TBP_GPS')}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    entityFilter === 'TBP_GPS'
                      ? 'bg-amber-500 text-slate-950 shadow-xs scale-102 font-black ring-1 ring-amber-400'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
                  }`}
                >
                  🏢 PT TBP &amp; GPS ({leaderboardList.filter(u => (u.pt || 'TBP').toUpperCase() === 'TBP' || (u.pt || 'TBP').toUpperCase() === 'GPS').length})
                </button>
                <button
                  type="button"
                  onClick={() => setEntityFilter('GTS')}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    entityFilter === 'GTS'
                      ? 'bg-sky-500 text-slate-950 shadow-xs scale-102 font-black ring-1 ring-sky-400'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
                  }`}
                >
                  🚢 PT GTS ({leaderboardList.filter(u => (u.pt || 'TBP').toUpperCase() === 'GTS').length})
                </button>
              </div>
            </div>

            {/* Top 3 Podium Cards */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* RANK 2 (Silver) */}
                <div className="order-2 md:order-1 flex flex-col justify-end">
                  <div 
                    className="relative rounded-3xl p-5 border shadow-md flex flex-col items-center text-center transition-transform hover:-translate-y-1"
                    style={{
                      backgroundColor: 'var(--card-bg, #FFFFFF)',
                      borderColor: 'var(--border-main, #E2E8F0)'
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-sm flex items-center justify-center -mt-9 shadow-md border-2 border-white dark:border-slate-800">
                      #2
                    </div>
                    {/* Avatar with Equipped Frame */}
                    <div className="my-3 flex items-center justify-center">
                      <DynamicAvatarFrame
                        frameId={top3[1].frame}
                        size={72}
                        isUnlocked={true}
                      >
                        {top3[1].avatar ? (
                          <img src={top3[1].avatar} alt={top3[1].name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-slate-200 to-slate-400 flex items-center justify-center text-2xl font-black text-slate-800">
                            {top3[1].name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </DynamicAvatarFrame>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <img 
                        src={top3[1].currentRank?.icon || '/assets/ranks/rank_01_trainee.svg'} 
                        alt="rank" 
                        className="w-6 h-6 object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                      />
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        {top3[1].currentRank?.name || 'Trainee'}
                      </span>
                    </div>
                    <h3 className="font-bold text-base font-display text-[var(--text-main)] truncate max-w-full">{top3[1].name}</h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-1 border border-teal-500/20">
                      [{top3[1].title}]
                    </span>
                    <span className="text-xs text-[var(--text-muted)] mt-1 font-semibold">{top3[1].section} ({top3[1].pt})</span>
                    <div className="mt-4 pt-3 border-t border-[var(--border-main)] w-full flex justify-around text-xs">
                      {selectedDiscipline === 'EXP' ? (
                        <>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Pangkat Kehormatan</span>
                            <span className="font-bold text-xs text-teal-600 dark:text-teal-400 block truncate max-w-[80px]">
                              {top3[1].currentRank?.name || 'Trainee'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500 block font-bold">EXP Bulan Ini</span>
                            <span className="font-black text-sm text-amber-500">{top3[1].seasonXp} XP</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Total EXP</span>
                            <span className="font-black text-sm text-[var(--text-main)]">{top3[1].totalXp} XP</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold truncate max-w-[100px]">
                              {activeDisciplineConfig.label}
                            </span>
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                              {getUserDisciplineValue(top3[1], selectedDiscipline)} <span className="text-[10px] font-normal">{activeDisciplineConfig.unit}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500 block font-bold">EXP Bulan Ini</span>
                            <span className="font-black text-xs text-amber-500">{top3[1].seasonXp} XP</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Total EXP</span>
                            <span className="font-black text-xs text-[var(--text-main)]">{top3[1].totalXp} XP</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* RANK 1 (Gold - Center & Elevated) */}
                <div className="order-1 md:order-2 flex flex-col justify-end">
                  <div 
                    className="relative rounded-3xl p-6 border-2 border-amber-400 shadow-xl flex flex-col items-center text-center bg-gradient-to-b from-amber-500/10 via-[var(--card-bg)] to-[var(--card-bg)] transition-transform hover:-translate-y-1.5"
                    style={{ backgroundColor: 'var(--card-bg, #FFFFFF)' }}
                  >
                    <div className="absolute -top-6 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 font-black text-base flex items-center justify-center shadow-lg shadow-amber-500/50 border-2 border-white dark:border-slate-800">
                        <Crown className="w-6 h-6 fill-slate-950" />
                      </div>
                    </div>
                    {/* Avatar with Equipped Frame */}
                    <div className="my-3 mt-4 flex items-center justify-center">
                      <DynamicAvatarFrame
                        frameId={top3[0].frame}
                        size={84}
                        isUnlocked={true}
                      >
                        {top3[0].avatar ? (
                          <img src={top3[0].avatar} alt={top3[0].name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-amber-300 via-orange-400 to-amber-500 flex items-center justify-center text-3xl font-black text-slate-950">
                            {top3[0].name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </DynamicAvatarFrame>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <img 
                        src={top3[0].currentRank?.icon || '/assets/ranks/rank_01_trainee.svg'} 
                        alt="rank" 
                        className="w-7 h-7 object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
                      />
                      <span className="text-xs font-black text-amber-500">
                        {top3[0].currentRank?.name || 'Trainee'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg font-display text-[var(--text-main)] truncate max-w-full">{top3[0].name}</h3>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-1 border border-amber-500/30 shadow-xs">
                      [{top3[0].title}]
                    </span>
                    <span className="text-xs text-[var(--text-muted)] mt-1 font-semibold">{top3[0].section} ({top3[0].pt})</span>
                    <div className="mt-4 pt-3 border-t border-[var(--border-main)] w-full flex justify-around text-xs">
                      {selectedDiscipline === 'EXP' ? (
                        <>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Pangkat Kehormatan</span>
                            <span className="font-black text-xs text-amber-500 block truncate max-w-[90px]">
                              {top3[0].currentRank?.name || 'Trainee'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500 block font-black">EXP Bulan Ini</span>
                            <span className="font-black text-base text-amber-500">{top3[0].seasonXp} XP</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Total EXP</span>
                            <span className="font-black text-base text-teal-600 dark:text-teal-400">{top3[0].totalXp} XP</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold truncate max-w-[110px]">
                              {activeDisciplineConfig.label}
                            </span>
                            <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
                              {getUserDisciplineValue(top3[0], selectedDiscipline)} <span className="text-[10px] font-normal">{activeDisciplineConfig.unit}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500 block font-bold">EXP Bulan Ini</span>
                            <span className="font-black text-sm text-amber-500">{top3[0].seasonXp} XP</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Total EXP</span>
                            <span className="font-black text-sm text-teal-600 dark:text-teal-400">{top3[0].totalXp} XP</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* RANK 3 (Bronze) */}
                <div className="order-3 flex flex-col justify-end">
                  <div 
                    className="relative rounded-3xl p-5 border shadow-md flex flex-col items-center text-center transition-transform hover:-translate-y-1"
                    style={{
                      backgroundColor: 'var(--card-bg, #FFFFFF)',
                      borderColor: 'var(--border-main, #E2E8F0)'
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-700 text-amber-100 font-black text-sm flex items-center justify-center -mt-9 shadow-md border-2 border-white dark:border-slate-800">
                      #3
                    </div>
                    {/* Avatar with Equipped Frame */}
                    <div className="my-3 flex items-center justify-center">
                      <DynamicAvatarFrame
                        frameId={top3[2].frame}
                        size={72}
                        isUnlocked={true}
                      >
                        {top3[2].avatar ? (
                          <img src={top3[2].avatar} alt={top3[2].name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-amber-600 to-amber-800 flex items-center justify-center text-2xl font-black text-amber-100">
                            {top3[2].name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </DynamicAvatarFrame>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <img 
                        src={top3[2].currentRank?.icon || '/assets/ranks/rank_01_trainee.svg'} 
                        alt="rank" 
                        className="w-6 h-6 object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                      />
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        {top3[2].currentRank?.name || 'Trainee'}
                      </span>
                    </div>
                    <h3 className="font-bold text-base font-display text-[var(--text-main)] truncate max-w-full">{top3[2].name}</h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-1 border border-teal-500/20">
                      [{top3[2].title}]
                    </span>
                    <span className="text-xs text-[var(--text-muted)] mt-1 font-semibold">{top3[2].section} ({top3[2].pt})</span>
                    <div className="mt-4 pt-3 border-t border-[var(--border-main)] w-full flex justify-around text-xs">
                      {selectedDiscipline === 'EXP' ? (
                        <>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Pangkat Kehormatan</span>
                            <span className="font-bold text-xs text-teal-600 dark:text-teal-400 block truncate max-w-[80px]">
                              {top3[2].currentRank?.name || 'Trainee'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500 block font-bold">EXP Bulan Ini</span>
                            <span className="font-black text-sm text-amber-500">{top3[2].seasonXp} XP</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Total EXP</span>
                            <span className="font-black text-sm text-[var(--text-main)]">{top3[2].totalXp} XP</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold truncate max-w-[100px]">
                              {activeDisciplineConfig.label}
                            </span>
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                              {getUserDisciplineValue(top3[2], selectedDiscipline)} <span className="text-[10px] font-normal">{activeDisciplineConfig.unit}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500 block font-bold">EXP Bulan Ini</span>
                            <span className="font-black text-xs text-amber-500">{top3[2].seasonXp} XP</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Total EXP</span>
                            <span className="font-black text-xs text-[var(--text-main)]">{top3[2].totalXp} XP</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input 
                  type="text"
                  placeholder="Cari nama atau NIK personil..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs bg-[var(--card-bg)] text-[var(--text-main)] focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  style={{ borderColor: 'var(--border-main)' }}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {['ALL', 'Laboratory', 'Preparation', 'Maintenance', 'Quality Assurance', 'Inventory Control', 'Administration'].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setSectionFilter(sec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      sectionFilter === sec
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {sec === 'ALL' ? 'Semua Section' : sec}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Leaderboard Table */}
            <div 
              className="rounded-3xl border overflow-hidden shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-850 text-[var(--text-muted)] font-bold text-[11px]" style={{ borderColor: 'var(--border-main)' }}>
                      <th className="py-3 px-4 w-14 text-center">Rank</th>
                      <th className="py-3 px-4">Pangkat &amp; Nama Personil</th>
                      <th className="py-3 px-4">Gelar Taktis</th>
                      <th className="py-3 px-4">Section &amp; PT</th>
                      {selectedDiscipline === 'EXP' ? (
                        <>
                          <th className="py-3 px-4 text-right">
                            <span className="text-amber-500 font-black">EXP Bulan Ini</span>
                            <span className="block text-[9px] font-normal text-[var(--text-muted)]">Reset Tiap Bulan</span>
                          </th>
                          <th className="py-3 px-4 text-right">
                            <span>Total EXP Karir</span>
                            <span className="block text-[9px] font-normal text-[var(--text-muted)]">Pangkat Kehormatan (Level 1–51)</span>
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-4 text-center">
                            <span className="text-emerald-600 dark:text-emerald-400 font-black">{activeDisciplineConfig.label}</span>
                            <span className="block text-[9px] font-normal text-[var(--text-muted)]">Total Kontribusi ({activeDisciplineConfig.unit})</span>
                          </th>
                          <th className="py-3 px-4 text-right">
                            <span className="text-amber-500 font-bold">EXP Bulan Ini</span>
                          </th>
                          <th className="py-3 px-4 text-right">
                            <span>Total EXP Karir</span>
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                    {displayedUsers.map((user, idx) => {
                      const isMe = user.nik === (inspectorNik || '02D25000055');
                      const rankData = user.currentRank || getRankByXp(user.totalXp).currentRank;
                      const displayRank = idx + 1;

                      return (
                        <tr 
                          key={user.nik}
                          className={`transition-colors hover:bg-slate-50/75 dark:hover:bg-slate-800/40 ${
                            isMe ? 'bg-teal-500/10 dark:bg-teal-500/15 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center font-black">
                            {displayRank === 1 ? '🥇' : displayRank === 2 ? '🥈' : displayRank === 3 ? '🥉' : `#${displayRank}`}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {/* Avatar with Equipped Dynamic Frame Ring */}
                              <DynamicAvatarFrame
                                frameId={user.frame}
                                size={34}
                                isUnlocked={true}
                              >
                                {user.avatar ? (
                                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-200">
                                    {user.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </DynamicAvatarFrame>
                              <img 
                                src={rankData.icon} 
                                alt={rankData.name}
                                className="w-6 h-6 object-contain shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                              />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAuditTargetNik(user.nik);
                                    setShowAuditModal(true);
                                  }}
                                  className="font-bold text-[var(--text-main)] hover:text-teal-600 dark:hover:text-teal-400 text-left block truncate max-w-[170px] sm:max-w-none cursor-pointer group/name transition-colors"
                                  title="Klik untuk buka audit rincian penambahan EXP personil ini"
                                >
                                  <span>{user.name}</span> {isMe && <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">(Anda)</span>}
                                  <BarChart3 className="w-3 h-3 inline-block ml-1 opacity-0 group-hover/name:opacity-100 text-teal-500 transition-opacity" />
                                </button>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono block truncate">
                                  {rankData.name} · {user.nik}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 whitespace-nowrap">
                              [{user.title}]
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-muted)]">
                            <span className="font-medium">{user.section}</span>{' '}
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-800 border border-[var(--border-main)]">
                              {user.pt}
                            </span>
                          </td>
                          {selectedDiscipline === 'EXP' ? (
                            <>
                              <td className="py-3.5 px-4 text-right font-black text-amber-500">
                                {user.seasonXp} XP
                              </td>
                              <td className="py-3.5 px-4 text-right font-black text-[var(--text-main)]">
                                {user.totalXp} XP
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs border border-emerald-500/20">
                                  <span>{getUserDisciplineValue(user, selectedDiscipline)}</span>
                                  <span className="text-[10px] font-medium opacity-80">{activeDisciplineConfig.unit}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-amber-500">
                                {user.seasonXp} XP
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-[var(--text-main)]">
                                {user.totalXp} XP
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}

                    {/* Visual Separator & Pinned Device Row when user is outside Top 10 */}
                    {isMyRankOutsideTop10 && !searchQuery.trim() && (
                      <>
                        <tr>
                          <td 
                            colSpan={selectedDiscipline === 'EXP' ? 6 : 5} 
                            className="py-2.5 px-4 text-center bg-slate-100/60 dark:bg-slate-850/60 text-[11px] text-[var(--text-muted)] italic font-semibold border-y border-dashed border-[var(--border-main)] select-none"
                          >
                            ••• {myUserRankNumber ? `Peringkat 11 s/d ${myUserRankNumber - 1} disembunyikan (Hanya 10 Besar yang Ditampilkan)` : 'Hanya 10 Besar Peringkat yang Ditampilkan'} •••
                          </td>
                        </tr>

                        {myUserEntry ? (
                          <tr className="bg-teal-500/15 dark:bg-teal-500/20 border-2 border-teal-500/50 font-bold shadow-xs">
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-block font-mono font-black text-xs px-2 py-0.5 rounded-md bg-teal-600 text-white shadow-xs">
                                #{myUserRankNumber}
                              </span>
                              <span className="block text-[9px] text-teal-600 dark:text-teal-400 font-bold mt-0.5">
                                (Perangkat Anda)
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <DynamicAvatarFrame
                                  frameId={myUserEntry.frame}
                                  size={34}
                                  isUnlocked={true}
                                >
                                  {myUserEntry.avatar ? (
                                    <img src={myUserEntry.avatar} alt={myUserEntry.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-200">
                                      {myUserEntry.name.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </DynamicAvatarFrame>
                                <img 
                                  src={myUserEntry.currentRank?.icon || userPublicRank?.icon || '/assets/ranks/rank_01_trainee.svg'} 
                                  alt="rank"
                                  className="w-6 h-6 object-contain shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                                />
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuditTargetNik(myUserEntry.nik);
                                      setShowAuditModal(true);
                                    }}
                                    className="font-bold text-[var(--text-main)] hover:text-teal-600 dark:hover:text-teal-400 text-left block truncate max-w-[170px] sm:max-w-none cursor-pointer group/name transition-colors"
                                    title="Klik untuk buka audit rincian penambahan EXP perangkat ini"
                                  >
                                    <span>{myUserEntry.name}</span> <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">(Perangkat Anda)</span>
                                    <BarChart3 className="w-3 h-3 inline-block ml-1 opacity-0 group-hover/name:opacity-100 text-teal-500 transition-opacity" />
                                  </button>
                                  <span className="text-[10px] text-[var(--text-muted)] font-mono block truncate">
                                    {myUserEntry.currentRank?.name || userPublicRank?.name} · {myUserEntry.nik}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 whitespace-nowrap">
                                [{myUserEntry.title}]
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[var(--text-muted)]">
                              <span className="font-bold text-[var(--text-main)]">{myUserEntry.section}</span>{' '}
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-teal-500/10 text-teal-600 border border-teal-500/20">
                                {myUserEntry.pt}
                              </span>
                            </td>
                            {selectedDiscipline === 'EXP' ? (
                              <>
                                <td className="py-3.5 px-4 text-right font-black text-amber-500">
                                  {myUserEntry.seasonXp} XP
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-teal-600 dark:text-teal-400">
                                  {myUserEntry.totalXp} XP
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-xs border border-emerald-500/30">
                                    <span>{getUserDisciplineValue(myUserEntry, selectedDiscipline)}</span>
                                    <span className="text-[10px] font-medium opacity-80">{activeDisciplineConfig.unit}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-amber-500">
                                  {myUserEntry.seasonXp} XP
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-teal-600 dark:text-teal-400">
                                  {myUserEntry.totalXp} XP
                                </td>
                              </>
                            )}
                          </tr>
                        ) : isCurrentUserDev ? (
                          /* Current User is Developer (Game Master) */
                          <tr className="bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-500/40 font-semibold shadow-inner">
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-block font-mono font-black text-xs px-2 py-0.5 rounded-md bg-black text-amber-300 border border-amber-400/60 shadow-xs">
                                GM
                              </span>
                              <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                (Developer)
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <DynamicAvatarFrame
                                  frameId={userFrame || 'cyber_neon'}
                                  size={34}
                                  isUnlocked={true}
                                >
                                  {userProfile?.avatar ? (
                                    <img src={userProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-black flex items-center justify-center text-[10px] font-black text-amber-300">
                                      GM
                                    </div>
                                  )}
                                </DynamicAvatarFrame>
                                <img 
                                  src="/assets/ranks/rank_special_gm.svg" 
                                  alt="Game Master" 
                                  className="w-6 h-6 object-contain shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                                />
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuditTargetNik(currentNik);
                                      setShowAuditModal(true);
                                    }}
                                    className="font-bold text-[var(--text-main)] hover:text-amber-500 text-left block truncate max-w-[170px] sm:max-w-none cursor-pointer group/name transition-colors"
                                    title="Klik untuk buka audit rincian penambahan EXP perangkat ini"
                                  >
                                    <span>{inspectorName || userProfile?.name || 'Game Master'}</span> <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">(Perangkat Anda)</span>
                                    <BarChart3 className="w-3 h-3 inline-block ml-1 opacity-0 group-hover/name:opacity-100 text-amber-500 transition-opacity" />
                                  </button>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block truncate">
                                    Game Master · {currentNik}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                [{userTitle || 'System Architect'}]
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[var(--text-muted)]">
                              <span className="font-bold text-[var(--text-main)]">{userProfile?.section || 'Preparation'}</span>{' '}
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                {userProfile?.pt || 'TBP'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-amber-500">
                              {userGamification?.seasonXp || 0} XP
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-[var(--text-main)]">
                              {userTotalXp} XP
                            </td>
                          </tr>
                        ) : null}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: DAFTAR PANGKAT & PERSONIL */}
        {activeTab === 'ranks' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-5 rounded-3xl border bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display">Hierarki 51 Jenjang Pangkat &amp; Distribusi Personil</h3>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                    Daftar seluruh tingkatan pangkat kehormatan operasional PrepLab Vanguard dan personil yang mendudukinya. Pangkat dengan lebih dari 10 personil hanya ditampilkan jumlah totalnya.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300">
                  {entityFilteredList.length} Personil ({entityFilter === 'ALL' ? 'Semua' : entityFilter === 'TBP_GPS' ? 'TBP & GPS' : 'GTS'})
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input 
                  type="text"
                  placeholder="Cari nama pangkat, nomor, atau nama personil..."
                  value={rankSearchQuery}
                  onChange={(e) => setRankSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs bg-[var(--card-bg)] text-[var(--text-main)] focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  style={{ borderColor: 'var(--border-main)' }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRankSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-3 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer bg-[var(--card-bg)] text-[var(--text-main)] hover:bg-slate-50 dark:hover:bg-slate-850 shrink-0"
                  style={{ borderColor: 'var(--border-main)' }}
                  title="Klik untuk membalik urutan peringkat"
                >
                  <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{rankSortOrder === 'desc' ? 'Pangkat Tertinggi (#51 → #1)' : 'Pangkat Terendah (#1 → #51)'}</span>
                </button>
              </div>
            </div>

            {/* Tier Group Filter Badges */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {allTierGroups.map(tg => (
                <button
                  key={tg}
                  onClick={() => setRankTierGroupFilter(tg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    rankTierGroupFilter === tg
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {tg === 'ALL' ? 'Semua Grup Tier' : tg}
                </button>
              ))}
            </div>

            {/* Ranks Cards List */}
            <div className="space-y-4">
              {filteredRanks.map(rank => {
                const personnelInRank = rankPersonnelMap.get(rank.id) || [];
                const count = personnelInRank.length;
                const isOverTen = count > 10;

                return (
                  <Card
                    key={rank.id}
                    className="p-5 rounded-3xl border shadow-xs space-y-4 transition-all"
                    style={{
                      backgroundColor: 'var(--card-bg, #FFFFFF)',
                      borderColor: 'var(--border-main, #E2E8F0)'
                    }}
                  >
                    {/* Rank Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--border-main)' }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl p-2 flex items-center justify-center border shrink-0 shadow-inner ${
                          rank.id === 0 
                            ? 'bg-gradient-to-b from-zinc-950 to-slate-900 border-amber-400/60 ring-1 ring-amber-400/30' 
                            : 'bg-slate-100 dark:bg-slate-800 border-[var(--border-main)]'
                        }`}>
                          <img
                            src={rank.icon}
                            alt={rank.name}
                            className="w-full h-full object-contain filter drop-shadow-sm"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-md border ${
                              rank.id === 0
                                ? 'bg-black text-amber-300 border-amber-400/60 shadow-xs'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}>
                              {rank.id === 0 ? 'GM' : `#${rank.id}`}
                            </span>
                            <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                              {rank.tierGroup}
                            </span>
                          </div>
                          <h3 className="font-bold text-base font-display text-[var(--text-main)] mt-0.5">
                            {rank.name}
                          </h3>
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">
                            {rank.id === 0
                              ? 'Hak Akses Penuh Pengembang & Game Master (Sistem PrepLab)'
                              : `Rentang EXP: ${rank.minXp.toLocaleString()} - ${rank.maxXp.toLocaleString()} EXP`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${
                          count > 0 
                            ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' 
                            : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] border-[var(--border-main)]'
                        }`}>
                          <Users className="w-3.5 h-3.5" />
                          <span>{count} Personil</span>
                        </span>
                      </div>
                    </div>

                    {/* Personnel in this rank */}
                    <div>
                      {/* CRITICAL USER REQUIREMENT: jika lebih dari 10 orang tidak perlu ditampilkan hanya sebutkan jumlahnya saja */}
                      {isOverTen ? (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                            <Users className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>
                              Terdapat <strong>{count} personil</strong> berada di jenjang pangkat ini.
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold italic">
                            (Jumlah &gt; 10 orang — daftar rincian disembunyikan)
                          </span>
                        </div>
                      ) : count > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {personnelInRank.map((u) => {
                            const isMe = u.nik === (inspectorNik || '02D25000055');
                            return (
                              <div
                                key={u.nik}
                                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                                  isMe 
                                    ? 'bg-teal-500/10 border-teal-500/30 font-semibold' 
                                    : 'bg-slate-50 dark:bg-slate-850/60 border-[var(--border-main)]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <DynamicAvatarFrame
                                    frameId={u.frame}
                                    size={34}
                                    isUnlocked={true}
                                  >
                                    {u.avatar ? (
                                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-200">
                                        {u.name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                  </DynamicAvatarFrame>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-[var(--text-main)] block truncate">
                                      {u.name} {isMe && <span className="text-[10px] text-teal-600 font-bold">(Anda)</span>}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)] block truncate">
                                      {u.section} ({u.pt}) · {u.nik}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 block border border-teal-500/20 mb-0.5">
                                    [{u.title}]
                                  </span>
                                  <span className="text-[10px] font-black text-amber-500 block">
                                    {u.totalXp >= 999999 ? 'Game Master' : `${(u.totalXp || 0).toLocaleString()} XP`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-2.5 text-center text-xs text-[var(--text-muted)] italic">
                          Belum ada personil di jenjang pangkat ini
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: INTER-SECTION CLASH */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="p-5 rounded-3xl border bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                  <Swords className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display">Inter-Section Clash (Divisi Lapangan)</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Penilaian rata-rata poin per personil dan tingkat kepatuhan K3. Adil bagi divisi dengan jumlah personil sedikit maupun banyak.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionScores.map(sec => (
                <Card 
                  key={sec.name}
                  className="p-5 rounded-3xl border shadow-xs space-y-4"
                  style={{
                    backgroundColor: 'var(--card-bg, #FFFFFF)',
                    borderColor: 'var(--border-main, #E2E8F0)'
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black flex items-center justify-center">
                        #{sec.rank}
                      </span>
                      <div>
                        <h4 className="font-bold text-base font-display text-[var(--text-main)]">{sec.name}</h4>
                        <span className="text-[11px] text-[var(--text-muted)] font-semibold">{sec.totalPersonnel} Personil Terdaftar</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-500 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      {sec.avgXp} XP / Orang
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] font-semibold">Tingkat Kepatuhan K3 (Safety Compliance)</span>
                      <span className="font-black text-emerald-600">{sec.safetyCompliance}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500" 
                        style={{ width: `${sec.safetyCompliance}%` }} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border" style={{ borderColor: 'var(--border-main)' }}>
                      <span className="text-[10px] text-[var(--text-muted)] block">Total Inspeksi Divisi</span>
                      <span className="font-black text-sm text-[var(--text-main)]">{sec.totalInspections} Formulir</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border" style={{ borderColor: 'var(--border-main)' }}>
                      <span className="text-[10px] text-[var(--text-muted)] block">Total KTA Dilaporkan</span>
                      <span className="font-black text-sm text-emerald-600">{sec.totalKta} Temuan</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: 12 PROGRESSIVE TIERED ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl border bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 text-white shadow-lg">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block mb-1">
                  Progressive Title & Frame Mastery
                </span>
                <h3 className="text-lg font-bold font-display">12 Cabang Achievement Kehormatan</h3>
                <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                  Achievement tugas rutin dapat dilihat kriteria cara mendapatkannya secara transparan. Selesaikan aktivitas harian di portal untuk menaikkan pangkat, meraih gelar kehormatan, dan membuka bingkai avatar eksklusif!
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3.5 py-2 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-xs font-bold text-teal-300">
                  100% Verifikasi Sistem Otomatis
                </div>
              </div>
            </div>

            {/* Filter Tabs: Semua, Tugas Rutin Portal, Pencapaian Rahasia */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-[var(--border-main)]/50 w-fit">
              <button
                type="button"
                onClick={() => setAchievementFilter('ALL')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  achievementFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Semua ({TIERED_ACHIEVEMENTS.length})
              </button>
              <button
                type="button"
                onClick={() => setAchievementFilter('ROUTINE')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  achievementFilter === 'ROUTINE'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-teal-600'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tugas Rutin Portal ({TIERED_ACHIEVEMENTS.filter(b => !b.isHidden).length})
              </button>
              <button
                type="button"
                onClick={() => setAchievementFilter('HIDDEN')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  achievementFilter === 'HIDDEN'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-amber-500'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Pencapaian Rahasia ({TIERED_ACHIEVEMENTS.filter(b => b.isHidden).length})
              </button>
            </div>

            {/* Grid Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TIERED_ACHIEVEMENTS.filter(b => {
                if (achievementFilter === 'ROUTINE') return !b.isHidden;
                if (achievementFilter === 'HIDDEN') return b.isHidden;
                return true;
              }).map(branch => {
                // Find live count from user gamification stats
                const countKeyMap: Record<string, number> = {
                  BRANCH_KTA: userGamification?.stats?.ktaCount || 0,
                  BRANCH_INSPECTION: userGamification?.stats?.inspectionCount || 0,
                  BRANCH_DEFECTS: userGamification?.stats?.defectsCount || 0,
                  BRANCH_WO_CREATE: userGamification?.stats?.woCreateCount || 0,
                  BRANCH_WO_RESOLVE: userGamification?.stats?.woResolveCount || 0,
                  BRANCH_CS: userGamification?.stats?.csCount || 0,
                  BRANCH_FEEDBACK: userGamification?.stats?.feedbackCount || 0,
                  BRANCH_QUOTES: userGamification?.stats?.quotesCount || 0,
                  BRANCH_THEMES: userGamification?.stats?.themesCount || 0,
                  BRANCH_BULLETIN: userGamification?.stats?.bulletinCount || 0,
                  BRANCH_P5M_SPEAKER: userGamification?.stats?.p5mSpeakerCount || 0,
                  BRANCH_QUIZ: userGamification?.stats?.quiz100Count || 0,
                  BRANCH_LOGIN_STREAK: userGamification?.stats?.loginStreak || 0,
                  BRANCH_NIGHT: userGamification?.stats?.nightCount || 0,
                  BRANCH_DAWN: userGamification?.stats?.dawnCount || 0,
                  BRANCH_WEEKEND: userGamification?.stats?.weekendCount || 0,
                  BRANCH_POLYMATH: userGamification?.stats?.polymathCount || 0,
                  BRANCH_EASTER_EGG: userGamification?.stats?.easterEggCount || 0,
                  BRANCH_SEASON: userGamification?.stats?.seasonChampionCount || 0
                };

                const currentCount = countKeyMap[branch.code] || 0;
                const progressInfo = calculateBranchProgress(branch, currentCount);
                const isBranchRevealed = progressInfo.unlockedTitles.length > 0;

                // Hidden achievement and completely locked: render as classified confidential vault
                if (branch.isHidden && !isBranchRevealed) {
                  return (
                    <Card
                      key={branch.id}
                      onClick={() => setSelectedBranch(branch)}
                      className="p-5 rounded-3xl border shadow-xs space-y-4 flex flex-col justify-between cursor-pointer hover:scale-[1.01] hover:shadow-lg transition-all relative overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-dashed border-amber-500/30 text-white"
                    >
                      <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-xl shadow-inner text-amber-400">
                            <Lock className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Pencapaian Rahasia
                          </span>
                        </div>

                        <h4 className="font-bold text-sm font-display text-amber-200 group-hover:text-amber-300 transition-colors">
                          🔒 [ Berkas Rahasia Komando ]
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {branch.hiddenHint || 'Parameter misi terenkripsi dan dirahasiakan oleh Markas Komando. Lakukan aktivitas operasional khusus untuk mengungkapnya.'}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-700/60">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold font-mono">
                            Status: ??? / ???
                          </span>
                          <span className="font-mono text-xs text-amber-400/80">
                            [ Terenkripsi ]
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                          <div className="h-full rounded-full bg-slate-700/60 w-1/4 animate-pulse" />
                        </div>

                        <div className="pt-1 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Gelar Rahasia:</span>
                          <span className="font-bold text-amber-400/70 font-mono">
                            [ ??? ]
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                }

                // Non-hidden achievement OR unlocked hidden achievement: render in full card
                const tierLevel = progressInfo.currentTier ? progressInfo.currentTier.tierLevel : 0;
                const tierStyle = getAchievementTierStyle(tierLevel > 0 ? tierLevel : 1);

                return (
                  <Card
                    key={branch.id}
                    onClick={() => setSelectedBranch(branch)}
                    className={`p-5 rounded-3xl ${tierLevel > 0 ? tierStyle.cardBorder : 'border-[var(--border-main)]'} ${tierLevel > 0 ? tierStyle.cardShadow : 'shadow-xs'} space-y-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group`}
                    style={{
                      backgroundColor: 'var(--card-bg, #FFFFFF)',
                    }}
                  >
                    {/* Ambient corner light aura for unlocked tiers */}
                    {tierLevel > 0 && (
                      <div className={`absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-bl ${tierStyle.cardGlowAura} rounded-full blur-2xl pointer-events-none`} />
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className={`w-13 h-13 rounded-2xl ${tierLevel > 0 ? tierStyle.iconRing : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500'} flex items-center justify-center text-2xl shadow-md transition-transform group-hover:scale-105 shrink-0`}>
                          {branch.icon}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {branch.isHidden ? (
                            <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Pencapaian Rahasia
                            </span>
                          ) : tierLevel > 0 ? (
                            <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full ${tierStyle.badgePill} flex items-center gap-1`}>
                              <span>{tierStyle.badgeEmoji}</span>
                              <span>{tierStyle.tierName}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                              Tugas Rutin
                            </span>
                          )}

                          <span className="text-[9px] font-mono font-semibold text-[var(--text-muted)] flex items-center gap-1">
                            {tierLevel > 0 ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Tier {tierLevel} · {tierStyle.metalLabel}
                              </>
                            ) : (
                              <>Target: Tier I ({branch.tiers[0].requiredCount} {branch.unit})</>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm font-display text-[var(--text-main)] group-hover:text-teal-600 transition-colors">
                          {branch.name}
                        </h4>
                        {tierLevel >= 3 && <span className="text-xs animate-bounce">{tierStyle.flairIcon}</span>}
                      </div>

                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                        {branch.description}
                      </p>

                      {/* Explicit How To Get Box for Routine Portal Tasks */}
                      {!branch.isHidden && branch.howToGet && (
                        <div className="mt-2.5 p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-start gap-2 text-left">
                          <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                              Cara Mendapatkan:
                            </span>
                            <p className="text-[11px] text-[var(--text-main)] leading-relaxed mt-0.5">
                              {branch.howToGet}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Note for Cuti Site (CS): Cosmetic only, 0 EXP */}
                      {branch.code === 'BRANCH_CS' && (
                        <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                          <span>⛺</span>
                          <span>Hadiah: Gelar & Bingkai Eksklusif (Tanpa EXP)</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2.5 border-t border-[var(--border-main)]/60 relative z-10">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-muted)] font-semibold">
                          Progres: <strong className="text-[var(--text-main)]">{currentCount}</strong> / {progressInfo.targetCount} {branch.unit}
                        </span>
                        <span className="font-black text-teal-600 dark:text-teal-400 font-mono">
                          {progressInfo.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden p-0.5 border border-[var(--border-main)]/50">
                        <div 
                          className={`h-full rounded-full ${tierLevel > 0 ? `bg-gradient-to-r ${tierStyle.progressBarGradient}` : 'bg-teal-500'} transition-all duration-500`} 
                          style={{ width: `${progressInfo.progressPercent}%` }} 
                        />
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-muted)] font-medium">Gelar Diperoleh:</span>
                        <span className="font-bold text-teal-700 dark:text-teal-300 truncate max-w-[170px] bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                          [{progressInfo.currentTier ? progressInfo.currentTier.titleReward : 'Belum Memenuhi'}]
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* MODAL DETAIL ACHIEVEMENT (selectedBranch) */}
            <AnimatePresence>
              {selectedBranch && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                  onClick={() => setSelectedBranch(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-lg rounded-3xl bg-[var(--card-bg)] border border-[var(--border-main)] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
                  >
                    {/* Header Modal */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-3xl shadow-inner shrink-0">
                          {selectedBranch.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] border border-[var(--border-main)]">
                              {selectedBranch.category}
                            </span>
                            {selectedBranch.isHidden && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                🔒 Rahasia
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-lg font-display text-[var(--text-main)] mt-1">
                            {selectedBranch.name}
                          </h3>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBranch(null)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-muted)] transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {selectedBranch.description}
                    </p>

                    {/* How to Get / Criteria */}
                    <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/25 space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Kriteria / Cara Mendapatkan di Portal
                      </span>
                      <p className="text-xs text-[var(--text-main)] leading-relaxed">
                        {selectedBranch.howToGet || selectedBranch.hiddenHint || selectedBranch.description}
                      </p>
                    </div>

                    {/* Tier Level Ladder */}
                    <div className="space-y-2.5">
                      <span className="text-xs font-bold text-[var(--text-main)] block">
                        Tingkatan Medali & Hadiah (4 Tier):
                      </span>
                      <div className="space-y-2">
                        {selectedBranch.tiers.map(tier => {
                          // Check if user has unlocked this tier
                          const countKeyMap: Record<string, number> = {
                            BRANCH_KTA: userGamification?.stats?.ktaCount || 0,
                            BRANCH_INSPECTION: userGamification?.stats?.inspectionCount || 0,
                            BRANCH_DEFECTS: userGamification?.stats?.defectsCount || 0,
                            BRANCH_WO_CREATE: userGamification?.stats?.woCreateCount || 0,
                            BRANCH_WO_RESOLVE: userGamification?.stats?.woResolveCount || 0,
                            BRANCH_CS: userGamification?.stats?.csCount || 0,
                            BRANCH_FEEDBACK: userGamification?.stats?.feedbackCount || 0,
                            BRANCH_QUOTES: userGamification?.stats?.quotesCount || 0,
                            BRANCH_THEMES: userGamification?.stats?.themesCount || 0,
                            BRANCH_BULLETIN: userGamification?.stats?.bulletinCount || 0,
                            BRANCH_P5M_SPEAKER: userGamification?.stats?.p5mSpeakerCount || 0,
                            BRANCH_QUIZ: userGamification?.stats?.quiz100Count || 0,
                            BRANCH_LOGIN_STREAK: userGamification?.stats?.loginStreak || 0,
                            BRANCH_NIGHT: userGamification?.stats?.nightCount || 0,
                            BRANCH_DAWN: userGamification?.stats?.dawnCount || 0,
                            BRANCH_WEEKEND: userGamification?.stats?.weekendCount || 0,
                            BRANCH_POLYMATH: userGamification?.stats?.polymathCount || 0,
                            BRANCH_EASTER_EGG: userGamification?.stats?.easterEggCount || 0,
                            BRANCH_SEASON: userGamification?.stats?.seasonChampionCount || 0
                          };
                          const userCount = countKeyMap[selectedBranch.code] || 0;
                          const isUnlocked = userCount >= tier.requiredCount;

                          return (
                            <div 
                              key={tier.tierLevel}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                isUnlocked 
                                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                                  : 'bg-slate-50 dark:bg-slate-850/50 border-[var(--border-main)] opacity-70'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                                  isUnlocked ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-750 text-slate-500'
                                }`}>
                                  T{tier.tierLevel}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[var(--text-main)]">
                                      {tier.tierName}
                                    </span>
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                      ({tier.requiredCount} {selectedBranch.unit})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                                      [{tier.titleReward}]
                                    </span>
                                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                                      {tier.xpReward > 0 ? `+${tier.xpReward} EXP` : '0 EXP (Eksklusif)'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                {isUnlocked ? (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Terbuka
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    {userCount}/{tier.requiredCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <Button
                      variant="outline"
                      onClick={() => setSelectedBranch(null)}
                      className="w-full py-2.5 rounded-2xl font-bold"
                    >
                      Tutup Berkas
                    </Button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TAB 4: STUDIO KUSTOMISASI PROFIL & GELAR */}
        {activeTab === 'customization' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Live Identity Preview Card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="sticky top-4">
                <Card 
                  className="p-6 rounded-3xl border shadow-xl space-y-5 relative overflow-hidden bg-gradient-to-b from-[var(--card-bg)] to-slate-50 dark:to-slate-850"
                  style={{ borderColor: 'var(--border-main)' }}
                >
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-2">
                      Pratinjau Identitas Lapangan
                    </span>

                    {/* Avatar with Equipped Frame */}
                    <div className="relative inline-block my-2">
                      <div className="flex items-center justify-center p-2">
                        <DynamicAvatarFrame
                          frameId={userFrame}
                          tierLevel={getFrameTierLevel(AVAILABLE_FRAMES.find(f => f.id === userFrame))}
                          size={92}
                          isUnlocked={true}
                        >
                          <div className="w-full h-full rounded-full bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center text-white text-2xl font-black">
                            {(inspectorName || 'AF').slice(0, 2).toUpperCase()}
                          </div>
                        </DynamicAvatarFrame>
                      </div>
                      {/* Vanguard Rank Badge floating at bottom right */}
                      <div className="absolute -bottom-1 -right-1 p-1 rounded-xl bg-[var(--card-bg)] border shadow-md z-30" style={{ borderColor: 'var(--border-main)' }}>
                        <img 
                          src={userPublicRank.icon} 
                          alt={userPublicRank.name}
                          className="w-7 h-7 object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                          title={userPublicRank.name}
                        />
                      </div>
                    </div>

                    <h3 className="font-bold text-lg font-display text-[var(--text-main)] mt-3">
                      {inspectorName || 'Personil PrepLab'}
                    </h3>

                    <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                        [{userTitle}]
                      </span>
                    </div>

                    <span className="text-xs text-[var(--text-muted)] font-semibold mt-1 block">
                      {isCurrentUserDev ? '🛡️ Game Master · Developer' : `${userPublicRank.name} · ${userTotalXp} Total EXP`}
                    </span>
                    {isCurrentUserDev && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Pangkat Asli: {userRankData.currentRank.name} · {userTotalXp} EXP
                      </span>
                    )}
                  </div>

                  {/* Progress to Next Rank */}
                  <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] font-semibold">
                        Menuju: {userRankData.nextRank ? userRankData.nextRank.name : 'Pangkat Tertinggi (Commander)'}
                      </span>
                      <span className="font-black text-amber-500">
                        {userRankData.progressPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" 
                        style={{ width: `${userRankData.progressPercent}%` }} 
                      />
                    </div>
                    {userRankData.nextRank && (
                      <span className="text-[10px] text-[var(--text-muted)] block text-center">
                        Kurang {userRankData.xpToNext} EXP lagi untuk naik pangkat
                      </span>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Right Column: Customization Selectors */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gelar Kehormatan Selector */}
              <Card 
                className="p-6 rounded-3xl border shadow-xs space-y-4"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main)' }}>
                  <div>
                    <h4 className="font-bold text-base font-display text-[var(--text-main)]">Gelar Kehormatan Taktis</h4>
                    <p className="text-xs text-[var(--text-muted)]">Pilih gelar yang telah terbuka dari 12 cabang pencapaian untuk dipasang di samping nama Anda.</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 font-bold">
                    {Array.from(new Set(['Frontline Trainee', ...(userGamification?.unlockedTitles || [])])).length} Gelar Terbuka
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Unlocked titles */}
                  {Array.from(new Set([
                    'Frontline Trainee',
                    ...(userGamification?.unlockedTitles || [])
                  ])).map(t => {
                    const isSelected = userTitle === t;
                    return (
                      <button
                        key={t}
                        onClick={() => handleEquipTitle(t)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/30' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-[var(--border-main)]'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-xs block">[{t}]</span>
                          <span className="text-[10px] text-[var(--text-muted)] block">Tersedia untuk dipasang</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Dynamic Avatar Frames */}
              <Card 
                className="p-6 rounded-3xl border shadow-xs space-y-4"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main)' }}>
                  <div>
                    <h4 className="font-bold text-base font-display text-[var(--text-main)]">Bingkai Avatar Dinamis (Chat &amp; Profil)</h4>
                    <p className="text-xs text-[var(--text-muted)]">Bingkai foto profil bercahaya yang muncul di kartu identitas, leaderboard, dan pada setiap pesan chat Anda.</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                    {AVAILABLE_FRAMES.filter(f => isFrameUnlocked(f)).length} / {AVAILABLE_FRAMES.length} Terbuka
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AVAILABLE_FRAMES.map(frame => {
                    const isSelected = userFrame === frame.id;
                    const unlocked = isFrameUnlocked(frame);
                    const tierLevel = getFrameTierLevel(frame);
                    const tierName = tierLevel === 1 ? 'Tier I (Bronze)' : tierLevel === 2 ? 'Tier II (Silver)' : tierLevel === 3 ? 'Tier III (Gold)' : 'Tier IV (Master)';

                    return (
                      <button
                        key={frame.id}
                        onClick={() => {
                          if (!unlocked) {
                            toast.error(`🔒 Bingkai Eksklusif Terkunci! Ungkap secret achievement "${frame.sourceAchName}" untuk membuka kustomisasi ini.`);
                            return;
                          }
                          handleEquipFrame(frame.id);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 relative overflow-hidden ${
                          !unlocked 
                            ? 'opacity-70 bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 cursor-not-allowed'
                            : isSelected 
                            ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/30 cursor-pointer' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-[var(--border-main)] cursor-pointer'
                        }`}
                      >
                        {/* Dynamic Avatar Frame Mini Preview */}
                        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                          <DynamicAvatarFrame
                            frameId={frame.id}
                            tierLevel={tierLevel}
                            size={36}
                            isUnlocked={unlocked}
                            showPreview={true}
                          >
                            <div className={`w-full h-full flex items-center justify-center ${unlocked ? 'bg-slate-900/70' : 'bg-slate-800/50'}`}>
                              {unlocked ? (
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          </DynamicAvatarFrame>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs truncate block">{frame.label}</span>
                            {frame.isExclusive && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                EKSKLUSIF
                              </span>
                            )}
                            {unlocked && frame.isExclusive && (
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                tierLevel === 4 
                                  ? 'bg-red-500/20 text-red-500 border border-red-500/40' 
                                  : tierLevel === 3 
                                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                                  : tierLevel === 2
                                  ? 'bg-slate-400/20 text-slate-400 border border-slate-400/40'
                                  : 'bg-amber-800/20 text-amber-700 dark:text-amber-300 border border-amber-700/40'
                              }`}>
                                {frame.id === 'frame_mythic_crown' 
                                  ? (tierLevel === 4 ? 'Api Membara' : tierLevel === 3 ? 'Api Menyala' : tierLevel === 2 ? 'Api Sedang' : 'Api Redup')
                                  : tierName}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] block truncate mt-0.5">
                            {unlocked 
                              ? `Efek visual aktif • ${frame.id === 'frame_mythic_crown' ? `Mahkota Berapi (${tierLevel === 4 ? 'Membara' : tierLevel === 3 ? 'Menyala' : tierLevel === 2 ? 'Sedang' : 'Redup'})` : tierName}`
                              : `🔒 Terkunci`}
                          </span>
                          <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            <Award className="w-3 h-3 shrink-0 text-amber-500" />
                            <span className="truncate">
                              {frame.sourceAchName ? `Diperoleh dari: ${frame.sourceAchName}` : 'Pencapaian Spesial'}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Secret Item Test Simulator */}
              <div className="p-4 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Gift className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-[var(--text-main)] block">Uji Coba Simulator Pesta Kemenangan</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">Simulasikan notifikasi perayaan kenaikan pangkat &amp; gelar baru.</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={triggerCelebration}
                  className="cursor-pointer text-xs font-bold"
                >
                  Uji Animasi
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Branch Detail Modal */}
      <AnimatePresence>
        {selectedBranch && (() => {
          const countKeyMap: Record<string, number> = {
            BRANCH_KTA: userGamification?.stats?.ktaCount || 0,
            BRANCH_INSPECTION: userGamification?.stats?.inspectionCount || 0,
            BRANCH_DEFECTS: userGamification?.stats?.defectsCount || 0,
            BRANCH_WO_CREATE: userGamification?.stats?.woCreateCount || 0,
            BRANCH_WO_RESOLVE: userGamification?.stats?.woResolveCount || 0,
            BRANCH_CS: userGamification?.stats?.csCount || 0,
            BRANCH_FEEDBACK: userGamification?.stats?.feedbackCount || 0,
            BRANCH_QUOTES: userGamification?.stats?.quotesCount || 0,
            BRANCH_THEMES: userGamification?.stats?.themesCount || 0,
            BRANCH_BULLETIN: userGamification?.stats?.bulletinCount || 0,
            BRANCH_P5M_SPEAKER: userGamification?.stats?.p5mSpeakerCount || 0,
            BRANCH_QUIZ: userGamification?.stats?.quiz100Count || 0,
            BRANCH_LOGIN_STREAK: userGamification?.stats?.loginStreak || 0,
            BRANCH_NIGHT: userGamification?.stats?.nightCount || 0,
            BRANCH_DAWN: userGamification?.stats?.dawnCount || 0,
            BRANCH_WEEKEND: userGamification?.stats?.weekendCount || 0,
            BRANCH_POLYMATH: userGamification?.stats?.polymathCount || 0,
            BRANCH_EASTER_EGG: userGamification?.stats?.easterEggCount || 0,
            BRANCH_SEASON: userGamification?.stats?.seasonChampionCount || 0
          };
          const userCount = countKeyMap[selectedBranch.code] || 0;
          const prog = calculateBranchProgress(selectedBranch, userCount);
          const isBranchRevealed = userCount >= selectedBranch.tiers[0].requiredCount;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border relative space-y-5 overflow-hidden"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)',
                  color: 'var(--text-main, #1E293B)'
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-3xl shadow-md border border-amber-500/30 shrink-0">
                      {isBranchRevealed ? selectedBranch.icon : '🔒'}
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isBranchRevealed 
                          ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' 
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}>
                        {isBranchRevealed ? selectedBranch.category.toUpperCase() : 'KLASIFIKASI: PENCAPAIAN RAHASIA OPERASIONAL'}
                      </span>
                      <h3 className="font-bold text-lg font-display text-[var(--text-main)] mt-1">
                        {isBranchRevealed ? selectedBranch.name : '🔒 [ Berkas Rahasia Komando ]'}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {isBranchRevealed 
                          ? selectedBranch.description 
                          : 'Parameter misi dan syarat pembukaan dienkripsi oleh Markas Komando. Terus berkontribusi pada operasi lapangan untuk memecahkan kode rahasia ini.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBranch(null)}
                    className="p-2 rounded-full border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    style={{ borderColor: 'var(--border-main)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Live Progress Bar */}
                <div className="p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[var(--text-muted)]">
                      {isBranchRevealed 
                        ? <>Pencapaian Anda: <span className="font-bold text-[var(--text-main)]">{userCount}</span> / {prog.targetCount} {selectedBranch.unit}</>
                        : <>Status Dokumen: <span className="font-mono font-bold text-amber-500">Terenkripsi (??? / ???)</span></>}
                    </span>
                    <span className="text-amber-500 font-bold font-mono">
                      {isBranchRevealed ? `${prog.progressPercent}%` : '???%'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isBranchRevealed ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : 'bg-slate-600 animate-pulse'}`}
                      style={{ width: isBranchRevealed ? `${prog.progressPercent}%` : '25%' }}
                    />
                  </div>
                </div>

                {/* Tiers List (Tier I to IV) */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Jenjang Gelar &amp; Milestone Reward
                  </span>
                  {selectedBranch.tiers.map(t => {
                    const isUnlocked = userCount >= t.requiredCount;
                    const tierStyle = getAchievementTierStyle(t.tierLevel);

                    return (
                      <div
                        key={t.tierLevel}
                        className={`p-3.5 rounded-2xl transition-all flex items-center justify-between gap-3 relative overflow-hidden ${
                          isUnlocked 
                            ? `${tierStyle.modalRowBorder} ${tierStyle.modalRowGlow}` 
                            : 'border-2 border-dashed border-slate-700/60 bg-slate-800/40 opacity-75'
                        }`}
                      >
                        {/* Ambient corner shimmer if unlocked */}
                        {isUnlocked && (
                          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${tierStyle.cardGlowAura} rounded-full blur-xl pointer-events-none`} />
                        )}

                        <div className="flex items-center gap-3 min-w-0 relative z-10">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-transform ${
                            isUnlocked ? `${tierStyle.iconRing} shadow-md` : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {isUnlocked ? tierStyle.badgeEmoji : <Lock className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[var(--text-main)] truncate font-display">
                                {isUnlocked 
                                  ? t.tierName 
                                  : `Tingkat ${t.tierLevel} - [ Misi Rahasia ${isBranchRevealed ? 'Lanjutan' : ''} ]`}
                              </span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${tierStyle.badgePill}`}>
                                {tierStyle.borderThicknessPx}px · {tierStyle.metalLabel}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                {isUnlocked ? `+${t.xpReward} XP` : '+??? XP'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-1 flex-wrap">
                              <span>Target: <strong className="text-[var(--text-main)]">{isUnlocked ? `${t.requiredCount} ${selectedBranch.unit}` : '???'}</strong></span>
                              <span>·</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                Gelar: {isUnlocked ? `[${t.titleReward}]` : '[ ??? ]'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 relative z-10">
                          {isUnlocked ? (
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${tierStyle.badgePill} border flex items-center gap-1`}>
                              <Check className="w-3 h-3 stroke-[3]" />
                              Terbuka
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Rahasia
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => setSelectedBranch(null)}
                    className="w-full py-2.5 font-bold cursor-pointer text-xs"
                  >
                    Tutup Detail
                  </Button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      </div>

      {/* EXP Audit & Breakdown Modal */}
      <ExpAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        currentNik={inspectorNik || '02D25000055'}
        currentName={inspectorName || ''}
        leaderboardList={leaderboardList}
        initialTargetNik={auditTargetNik}
        userGamification={userGamification}
      />
    </div>
  );
}
