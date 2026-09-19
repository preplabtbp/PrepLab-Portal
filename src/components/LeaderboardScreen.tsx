import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Award, Crown, Star, Sparkles, Shield, Flame, CheckCircle2, 
  Lock, ArrowLeft, Users, Filter, ChevronRight, Info, Zap, Gift, 
  Layers, MapPin, Search, Eye, AlertTriangle, HelpCircle, Check, Swords,
  Medal, Target, Activity, Compass, BookmarkCheck, Share2, X, Building2
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Button, Card } from './ui';
import { toast } from 'sonner';
import { POINT_BLANK_RANKS, getRankByXp, PBRank } from '../lib/pointBlankRanks';
import { TIERED_ACHIEVEMENTS, AchievementBranch, AchievementTier, AVAILABLE_FRAMES, calculateBranchProgress, getFrameById } from '../lib/gamificationEngine';

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
  ktaCount: number;
  p5mStreak: number;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState<'ALL' | 'TBP_GPS' | 'GTS'>('ALL');
  const [rankSearchQuery, setRankSearchQuery] = useState('');
  const [rankTierGroupFilter, setRankTierGroupFilter] = useState('ALL');
  const [rankSortOrder, setRankSortOrder] = useState<'desc' | 'asc'>('desc');

  // User Equipped Customization (LocalStorage + Live Sync)
  const [userTitle, setUserTitle] = useState(() => {
    const saved = localStorage.getItem('preplab_equipped_title');
    return (saved && saved !== 'Frontline Scout') ? saved : 'Frontline Trainee';
  });
  const [userFrame, setUserFrame] = useState(() => localStorage.getItem('preplab_equipped_frame') || 'golden_halo');
  const [showCelebration, setShowCelebration] = useState(false);

  // Live Gamification Profile Data from Server
  const [userGamification, setUserGamification] = useState<any>(null);
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardUser[]>([]);
  const [sectionScores, setSectionScores] = useState<SectionScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load live user stats and leaderboard from server
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        const currentNik = inspectorNik || '02D25000055';
        
        // 1. Fetch user specific stats
        const userRes = await fetch(`/api/gamification/user-stats/${encodeURIComponent(currentNik)}?name=${encodeURIComponent(inspectorName || '')}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          if (isMounted) {
            setUserGamification(userData);
            if (!localStorage.getItem('preplab_equipped_title') && userData.defaultTitle) {
              setUserTitle(userData.defaultTitle);
            }
            if (!localStorage.getItem('preplab_equipped_frame') && userData.equippedFrame) {
              setUserFrame(userData.equippedFrame);
            }
          }
        }

        // 2. Fetch general leaderboard & section scores
        const lbRes = await fetch('/api/gamification/leaderboard');
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          if (isMounted) {
            setLeaderboardList(lbData.leaderboard || []);
            setSectionScores(lbData.sectionScores || []);
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
  }, [inspectorNik, inspectorName]);

  // Derive current user rank info
  const userTotalXp = userGamification?.totalXp ?? 0;
  const userRankData = getRankByXp(userTotalXp);

  // Filtered leaderboard based on Entity (TBP & GPS vs GTS)
  const entityFilteredList = useMemo(() => {
    return leaderboardList.filter(u => {
      const userPt = (u.pt || 'TBP').trim().toUpperCase();
      if (entityFilter === 'TBP_GPS') return userPt === 'TBP' || userPt === 'GPS';
      if (entityFilter === 'GTS') return userPt === 'GTS';
      return true;
    });
  }, [leaderboardList, entityFilter]);

  // Top 3 Podium of the filtered entity
  const top3 = useMemo(() => entityFilteredList.slice(0, 3), [entityFilteredList]);

  // Filtered leaderboard table with search & section
  const filteredUsers = useMemo(() => {
    return entityFilteredList.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.nik.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSec = sectionFilter === 'ALL' || 
        (sectionFilter === 'Quality Assurance' && (u.section.toLowerCase().includes('quality') || u.section.toLowerCase() === 'qa')) ||
        u.section.toLowerCase().includes(sectionFilter.toLowerCase());
      return matchSearch && matchSec;
    });
  }, [entityFilteredList, searchQuery, sectionFilter]);

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
    return map;
  }, [entityFilteredList]);

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
      list.sort((a, b) => b.id - a.id);
    } else {
      list.sort((a, b) => a.id - b.id);
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

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <img 
                src={userRankData.currentRank.icon} 
                alt={userRankData.currentRank.name}
                className="w-7 h-7 object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
              />
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-amber-500 block leading-tight">Pangkat Anda</span>
                <span className="text-xs font-black text-[var(--text-main)] block leading-tight truncate max-w-[140px]">
                  {userRankData.currentRank.name}
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 space-y-6">

        {/* TAB 1: INDIVIDUAL TOP GUN LEADERBOARD */}
        {activeTab === 'individual' && (
          <div className="space-y-6">
            {/* Season 1 Clean Baseline Status Banner */}
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
                      Season 1 Rilis Resmi · Clean Zero-Baseline
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Aktif Dimulai dari 0
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Seluruh 268 personil memulai serentak dari 0 EXP dan pangkat Trainee. Kumpulkan poin dari inspeksi alat, pelaporan KTA, P5M, dan kuis SOP!
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Status Musim</span>
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">Dimulai Fresh</span>
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
                    <div className={`w-18 h-18 rounded-full my-3 p-1 border-4 shadow-md bg-gradient-to-tr from-slate-200 to-slate-400 flex items-center justify-center text-2xl font-black text-slate-800 overflow-hidden ${getFrameById(top3[1].frame).ringColor} ${getFrameById(top3[1].frame).effect}`}>
                      {top3[1].avatar ? (
                        <img src={top3[1].avatar} alt={top3[1].name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        top3[1].name.slice(0, 2).toUpperCase()
                      )}
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
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Season XP</span>
                        <span className="font-black text-sm text-[var(--text-main)]">{top3[1].seasonXp}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">KTA</span>
                        <span className="font-black text-sm text-emerald-600">{top3[1].ktaCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Total XP</span>
                        <span className="font-black text-sm text-amber-500">{top3[1].totalXp}</span>
                      </div>
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
                    <div className={`w-22 h-22 rounded-full my-3 mt-4 p-1.5 border-4 shadow-lg shadow-amber-500/30 bg-gradient-to-tr from-amber-300 via-orange-400 to-amber-500 flex items-center justify-center text-3xl font-black text-slate-950 overflow-hidden ${getFrameById(top3[0].frame).ringColor} ${getFrameById(top3[0].frame).effect}`}>
                      {top3[0].avatar ? (
                        <img src={top3[0].avatar} alt={top3[0].name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        top3[0].name.slice(0, 2).toUpperCase()
                      )}
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
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Season XP</span>
                        <span className="font-black text-base text-amber-500">{top3[0].seasonXp}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">KTA</span>
                        <span className="font-black text-base text-emerald-600">{top3[0].ktaCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Total XP</span>
                        <span className="font-black text-base text-teal-600 dark:text-teal-400">{top3[0].totalXp}</span>
                      </div>
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
                    <div className={`w-18 h-18 rounded-full my-3 p-1 border-4 shadow-md bg-gradient-to-tr from-amber-600 to-amber-800 flex items-center justify-center text-2xl font-black text-amber-100 overflow-hidden ${getFrameById(top3[2].frame).ringColor} ${getFrameById(top3[2].frame).effect}`}>
                      {top3[2].avatar ? (
                        <img src={top3[2].avatar} alt={top3[2].name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        top3[2].name.slice(0, 2).toUpperCase()
                      )}
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
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Season XP</span>
                        <span className="font-black text-sm text-[var(--text-main)]">{top3[2].seasonXp}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">KTA</span>
                        <span className="font-black text-sm text-emerald-600">{top3[2].ktaCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Total XP</span>
                        <span className="font-black text-sm text-amber-500">{top3[2].totalXp}</span>
                      </div>
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
                {['ALL', 'Laboratory', 'Preparation', 'Maintenance', 'Quality Assurance'].map(sec => (
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
                      <th className="py-3 px-4 text-center">KTA</th>
                      <th className="py-3 px-4 text-center">Inspeksi</th>
                      <th className="py-3 px-4 text-right">Season XP</th>
                      <th className="py-3 px-4 text-right">Total XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                    {filteredUsers.map((user, idx) => {
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
                              <div className={`w-8 h-8 rounded-full border-2 overflow-hidden flex items-center justify-center text-[10px] font-black shrink-0 ${getFrameById(user.frame).ringColor} ${getFrameById(user.frame).effect}`}>
                                {user.avatar ? (
                                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  user.name.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <img 
                                src={rankData.icon} 
                                alt={rankData.name}
                                className="w-6 h-6 object-contain shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-[var(--text-main)] block truncate max-w-[170px] sm:max-w-none">
                                  {user.name} {isMe && <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">(Anda)</span>}
                                </span>
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
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                            {user.ktaCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-teal-600 dark:text-teal-400">
                            {user.inspectionCount}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-amber-500">
                            {user.seasonXp} XP
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-[var(--text-main)]">
                            {user.totalXp} XP
                          </td>
                        </tr>
                      );
                    })}
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
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 p-2 flex items-center justify-center border border-[var(--border-main)] shrink-0 shadow-inner">
                          <img
                            src={rank.icon}
                            alt={rank.name}
                            className="w-full h-full object-contain filter drop-shadow-sm"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              #{rank.id}
                            </span>
                            <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                              {rank.tierGroup}
                            </span>
                          </div>
                          <h3 className="font-bold text-base font-display text-[var(--text-main)] mt-0.5">
                            {rank.name}
                          </h3>
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">
                            Rentang EXP: {rank.minXp.toLocaleString()} - {rank.maxXp.toLocaleString()} EXP
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
                                  <div className={`w-8 h-8 rounded-full border-2 overflow-hidden flex items-center justify-center text-[10px] font-black shrink-0 ${getFrameById(u.frame).ringColor} ${getFrameById(u.frame).effect}`}>
                                    {u.avatar ? (
                                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                      u.name.slice(0, 2).toUpperCase()
                                    )}
                                  </div>
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
                                    {u.totalXp} XP
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
                  Progressive Title Mastery
                </span>
                <h3 className="text-lg font-bold font-display">12 Cabang Achievement Kehormatan</h3>
                <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                  Setiap pekerjaan memiliki 4 tingkatan (Tier I s/d Tier IV Master). Gelar militer Anda akan otomatis naik tingkat saat konsisten mengulang kontribusi yang sama!
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-xs font-bold text-teal-300 shrink-0">
                100% Verifikasi Sistem Otomatis
              </div>
            </div>

            {/* Grid 12 Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TIERED_ACHIEVEMENTS.map(branch => {
                // Find live count from user gamification stats
                const countKeyMap: Record<string, number> = {
                  BRANCH_KTA: userGamification?.stats?.ktaCount || 0,
                  BRANCH_INSPECTION: userGamification?.stats?.inspectionCount || 0,
                  BRANCH_CS: userGamification?.stats?.csCount || 0,
                  BRANCH_FEEDBACK: userGamification?.stats?.feedbackCount || 0,
                  BRANCH_QUOTES: userGamification?.stats?.quotesCount || 0,
                  BRANCH_THEMES: userGamification?.stats?.themesCount || 0,
                  BRANCH_BULLETIN: userGamification?.stats?.bulletinCount || 0,
                  BRANCH_P5M_SPEAKER: userGamification?.stats?.p5mSpeakerCount || 0,
                  BRANCH_DEFECTS: userGamification?.stats?.defectCount || 0,
                  BRANCH_QUIZ: userGamification?.stats?.quiz100Count || 0,
                  BRANCH_NIGHT: userGamification?.stats?.nightCount || 0,
                  BRANCH_SEASON: userGamification?.stats?.seasonChampionCount || 0
                };

                const currentCount = countKeyMap[branch.code] || 0;
                const progressInfo = calculateBranchProgress(branch, currentCount);
                const isBranchRevealed = progressInfo.unlockedTitles.length > 0;

                // If branch is completely locked, render as classified confidential vault
                if (!isBranchRevealed) {
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
                            Berkas Rahasia
                          </span>
                        </div>

                        <h4 className="font-bold text-sm font-display text-amber-200 group-hover:text-amber-300 transition-colors">
                          🔒 [ Berkas Rahasia Komando ]
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          Parameter misi terenkripsi dan dirahasiakan oleh Markas Komando. Lakukan aktivitas operasional harian untuk mengungkap kode achievement ini.
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

                // Branch is revealed (Tier 1 or higher earned)
                return (
                  <Card
                    key={branch.id}
                    onClick={() => setSelectedBranch(branch)}
                    className="p-5 rounded-3xl border shadow-xs space-y-4 flex flex-col justify-between cursor-pointer hover:scale-[1.01] hover:shadow-lg transition-all"
                    style={{
                      backgroundColor: 'var(--card-bg, #FFFFFF)',
                      borderColor: 'var(--border-main, #E2E8F0)'
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                          {branch.icon}
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/10">
                          {progressInfo.currentTier ? progressInfo.currentTier.tierName : 'Belum Terbuka'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm font-display text-[var(--text-main)]">
                        {branch.name}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                        {branch.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-muted)] font-semibold">
                          Progres: {currentCount} / {progressInfo.targetCount} {branch.unit}
                        </span>
                        <span className="font-black text-amber-500">
                          {progressInfo.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" 
                          style={{ width: `${progressInfo.progressPercent}%` }} 
                        />
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-muted)]">Gelar Aktif:</span>
                        <span className="font-bold text-teal-600 dark:text-teal-400 truncate max-w-[150px]">
                          [{progressInfo.currentTier ? progressInfo.currentTier.titleReward : 'Terkunci'}]
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
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
                      <div className={`w-24 h-24 rounded-full p-1 border-4 transition-all duration-300 ${
                        AVAILABLE_FRAMES.find(f => f.id === userFrame)?.ringColor || 'border-slate-300'
                      }`}>
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center text-white text-2xl font-black">
                          {(inspectorName || 'AF').slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      {/* Vanguard Rank Badge floating at bottom right */}
                      <div className="absolute -bottom-2 -right-1 p-1 rounded-xl bg-[var(--card-bg)] border shadow-md" style={{ borderColor: 'var(--border-main)' }}>
                        <img 
                          src={userRankData.currentRank.icon} 
                          alt={userRankData.currentRank.name}
                          className="w-7 h-7 object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                          title={userRankData.currentRank.name}
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
                      {userRankData.currentRank.name} · {userTotalXp} Total EXP
                    </span>
                  </div>

                  {/* Progress to Next PB Rank */}
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
              {/* Gelar Militer Selector */}
              <Card 
                className="p-6 rounded-3xl border shadow-xs space-y-4"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main)' }}>
                  <div>
                    <h4 className="font-bold text-base font-display text-[var(--text-main)]">Gelar Militer Kehormatan</h4>
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
                            ? 'opacity-60 bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 cursor-not-allowed'
                            : isSelected 
                            ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/30 cursor-pointer' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-[var(--border-main)] cursor-pointer'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full border-2 shrink-0 ${unlocked ? frame.ringColor : 'border-slate-400'} flex items-center justify-center`}>
                          {unlocked ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate block">{frame.label}</span>
                            {frame.isExclusive && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                EKSKLUSIF
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] block truncate">
                            {unlocked 
                              ? 'Efek visual aktif' 
                              : `🔒 Terkunci (Ungkap: ${frame.sourceAchName})`}
                          </span>
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
            BRANCH_CS: userGamification?.stats?.csCount || 0,
            BRANCH_FEEDBACK: userGamification?.stats?.feedbackCount || 0,
            BRANCH_QUOTES: userGamification?.stats?.quotesCount || 0,
            BRANCH_THEMES: userGamification?.stats?.themesCount || 0,
            BRANCH_BULLETIN: userGamification?.stats?.bulletinCount || 0,
            BRANCH_P5M_SPEAKER: userGamification?.stats?.p5mSpeakerCount || 0,
            BRANCH_DEFECTS: userGamification?.stats?.defectCount || 0,
            BRANCH_QUIZ: userGamification?.stats?.quiz100Count || 0,
            BRANCH_NIGHT: userGamification?.stats?.nightCount || 0,
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
                        {isBranchRevealed ? selectedBranch.category.toUpperCase() : 'KLASIFIKASI: DOKUMEN RAHASIA MILITER'}
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

                    return (
                      <div
                        key={t.tierLevel}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isUnlocked 
                            ? 'bg-teal-500/10 border-teal-500/30' 
                            : 'bg-slate-50 dark:bg-slate-800/40 border-[var(--border-main)] opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isUnlocked ? 'bg-teal-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {isUnlocked ? <Check className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--text-main)] truncate font-display">
                                {isUnlocked 
                                  ? t.tierName 
                                  : `Tingkat ${t.tierLevel} - [ Misi Rahasia ${isBranchRevealed ? 'Lanjutan' : ''} ]`}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                                {isUnlocked ? `+${t.xpReward} XP` : '+??? XP'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                              <span>Target: {isUnlocked ? `${t.requiredCount} ${selectedBranch.unit}` : '???'}</span>
                              <span>·</span>
                              <span className="font-bold text-teal-600 dark:text-teal-400">
                                Gelar: {isUnlocked ? `[${t.titleReward}]` : '[ ??? ]'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isUnlocked ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shrink-0">
                            Terbuka
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Rahasia
                          </span>
                        )}
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
    </div>
  );
}
