import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Search, Shield, Award, Trophy, Zap, Copy, Check, Filter, 
  ChevronRight, Building2, Flame, RefreshCw, Calendar, CheckCircle2,
  SlidersHorizontal, UserCheck, Eye, Sparkles, HelpCircle, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  EXP_SOURCES_CONFIG, 
  ACTION_XP_WEIGHTS,
  ExpSourceDefinition
} from '../lib/gamificationEngine';
import { POINT_BLANK_RANKS, getRankByXp } from '../lib/pointBlankRanks';
import { DynamicAvatarFrame } from './DynamicAvatarFrame';
import { LeaderboardUser } from './LeaderboardScreen';

interface ExpAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNik: string | null;
  currentName: string | null;
  leaderboardList: LeaderboardUser[];
  initialTargetNik?: string | null;
  userGamification?: any;
}

export function ExpAuditModal({
  isOpen,
  onClose,
  currentNik,
  currentName,
  leaderboardList,
  initialTargetNik,
  userGamification
}: ExpAuditModalProps) {
  // Mode: 'self' (EXP Saya) or 'developer' (Cari & Audit Personil)
  const [activeMode, setActiveMode] = useState<'self' | 'developer'>('self');
  // Period: 'season' (Bulan Ini) or 'career' (Total Karir)
  const [period, setPeriod] = useState<'season' | 'career'>('season');
  
  // Developer Mode States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedTargetNik, setSelectedTargetNik] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Sync initial target NIK when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTargetNik && initialTargetNik !== currentNik) {
        setSelectedTargetNik(initialTargetNik);
        setActiveMode('developer');
      } else {
        setSelectedTargetNik(currentNik);
        setActiveMode('self');
      }
    }
  }, [isOpen, initialTargetNik, currentNik]);

  // Determine active audited target user
  const targetNikToAudit = activeMode === 'self' ? currentNik : (selectedTargetNik || currentNik);

  // Find user data from leaderboardList or userGamification
  const targetUser: LeaderboardUser | null = useMemo(() => {
    if (!targetNikToAudit) return null;
    const clean = targetNikToAudit.trim().toUpperCase();
    const found = leaderboardList.find(u => (u.nik || '').trim().toUpperCase() === clean);
    if (found) return found;

    // Fallback to userGamification if auditing self
    if (userGamification && (userGamification.nik || '').toUpperCase() === clean) {
      const g = userGamification;
      const rankData = getRankByXp(g.totalXp || 0);
      return {
        rank: 0,
        nik: g.nik,
        name: g.name,
        section: g.section || 'Preparation',
        pt: g.pt || 'TBP',
        avatar: g.avatar,
        title: g.equippedTitle || g.defaultTitle || 'Frontline Trainee',
        frame: g.equippedFrame || 'default',
        seasonXp: g.seasonXp || 0,
        totalXp: g.totalXp || 0,
        currentRank: rankData.currentRank,
        isDevUser: g.isDevUser === true,
        publicRank: g.publicRank || rankData.currentRank,
        badgesCount: g.badgesEarned || 0,
        inspectionCount: g.stats?.inspectionCount || 0,
        defectsCount: g.stats?.defectsCount || 0,
        sDefectsCount: g.seasonStats?.defectsCount || 0,
        ktaCount: g.stats?.ktaCount || 0,
        woCreateCount: g.stats?.woCreateCount || 0,
        woResolveCount: g.stats?.woResolveCount || 0,
        csCount: g.stats?.csCount || 0,
        feedbackCount: g.stats?.feedbackCount || 0,
        quotesCount: g.stats?.quotesCount || 0,
        themesCount: g.stats?.themesCount || 0,
        bulletinCount: g.stats?.bulletinCount || 0,
        p5mSpeakerCount: g.stats?.p5mSpeakerCount || 0,
        quiz100Count: g.stats?.quiz100Count || 0,
        loginStreak: g.stats?.loginStreak || 0,
        nightCount: g.stats?.nightCount || 0,
        dawnCount: g.stats?.dawnCount || 0,
        weekendCount: g.stats?.weekendCount || 0,
        polymathCount: g.stats?.polymathCount || 0,
        p5mStreak: 14,
        roleStartingXp: g.roleStartingXp || 0,
        achievementBonusXp: g.achievementBonusXp || 0,
        baseActionsXp: g.baseActionsXp || 0,
        sKtaCount: g.seasonStats?.ktaCount || 0,
        sInspectionCount: g.seasonStats?.inspectionCount || 0,
        sWoCreateCount: g.seasonStats?.woCreateCount || 0,
        sWoResolveCount: g.seasonStats?.woResolveCount || 0,
        sFeedbackCount: g.seasonStats?.feedbackCount || 0,
        sQuotesCount: g.seasonStats?.quotesCount || 0,
        sThemesCount: g.seasonStats?.themesCount || 0,
        sBulletinCount: g.seasonStats?.bulletinCount || 0,
        sQuiz100Count: g.seasonStats?.quiz100Count || 0,
        sNightCount: g.seasonStats?.nightCount || 0,
        sDawnCount: g.seasonStats?.dawnCount || 0,
        sWeekendCount: g.seasonStats?.weekendCount || 0
      };
    }

    return null;
  }, [targetNikToAudit, leaderboardList, userGamification]);

  // Filtered personnel list for developer search
  const filteredPersonnel = useMemo(() => {
    return leaderboardList.filter(u => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || (
        (u.name || '').toLowerCase().includes(q) || 
        (u.nik || '').toLowerCase().includes(q) ||
        (u.section || '').toLowerCase().includes(q)
      );

      const matchSec = selectedSection === 'ALL' || (
        (selectedSection === 'Laboratory' && u.section.toLowerCase().includes('lab')) ||
        (selectedSection === 'Preparation' && (u.section.toLowerCase().includes('prep') || u.section.toLowerCase().includes('wet') || u.section.toLowerCase().includes('dry'))) ||
        (selectedSection === 'Maintenance' && u.section.toLowerCase().includes('maint')) ||
        (selectedSection === 'Quality Assurance' && (u.section.toLowerCase().includes('quality') || u.section.toLowerCase() === 'qa')) ||
        (selectedSection === 'Inventory Control' && u.section.toLowerCase().includes('inventory')) ||
        (selectedSection === 'Administration' && u.section.toLowerCase().includes('admin')) ||
        u.section.toLowerCase().includes(selectedSection.toLowerCase())
      );

      return matchSearch && matchSec;
    });
  }, [leaderboardList, searchQuery, selectedSection]);

  // Compute breakdown line items for the target user
  const breakdownRows = useMemo(() => {
    if (!targetUser) return [];

    const isCareer = period === 'career';

    return EXP_SOURCES_CONFIG.map(src => {
      let count = 0;
      switch (src.key) {
        case 'KTA':
          count = isCareer ? (targetUser.ktaCount || 0) : (targetUser.sKtaCount ?? targetUser.ktaCount ?? 0);
          break;
        case 'INSPECTION':
          count = isCareer ? (targetUser.inspectionCount || 0) : (targetUser.sInspectionCount ?? targetUser.inspectionCount ?? 0);
          break;
        case 'DEFECTS':
          count = isCareer ? (targetUser.defectsCount || 0) : (targetUser.sDefectsCount ?? 0);
          break;
        case 'WO_CREATE':
          count = isCareer ? (targetUser.woCreateCount || 0) : (targetUser.sWoCreateCount ?? 0);
          break;
        case 'WO_RESOLVE':
          count = isCareer ? (targetUser.woResolveCount || 0) : (targetUser.sWoResolveCount ?? 0);
          break;
        case 'FEEDBACK':
          count = isCareer ? (targetUser.feedbackCount || 0) : (targetUser.sFeedbackCount ?? 0);
          break;
        case 'QUOTES':
          count = isCareer ? (targetUser.quotesCount || 0) : (targetUser.sQuotesCount ?? 0);
          break;
        case 'THEMES':
          count = isCareer ? (targetUser.themesCount || 0) : (targetUser.sThemesCount ?? 0);
          break;
        case 'BULLETIN':
          count = isCareer ? (targetUser.bulletinCount || 0) : (targetUser.sBulletinCount ?? 0);
          break;
        case 'P5M_SPEAKER':
          count = isCareer ? (targetUser.p5mSpeakerCount || 0) : 0;
          break;
        case 'QUIZ_100':
          count = isCareer ? (targetUser.quiz100Count || 0) : (targetUser.sQuiz100Count ?? 0);
          break;
        case 'NIGHT_SHIFT':
          count = isCareer ? (targetUser.nightCount || 0) : (targetUser.sNightCount ?? 0);
          break;
        case 'DAWN_SHIFT':
          count = isCareer ? (targetUser.dawnCount || 0) : (targetUser.sDawnCount ?? 0);
          break;
        case 'WEEKEND_SHIFT':
          count = isCareer ? (targetUser.weekendCount || 0) : (targetUser.sWeekendCount ?? 0);
          break;
        default:
          count = 0;
      }

      const subtotal = count * src.weight;
      return {
        ...src,
        count,
        subtotal
      };
    });
  }, [targetUser, period]);

  // Calculate totals
  const totalActionXp = useMemo(() => {
    return breakdownRows.reduce((acc, row) => acc + row.subtotal, 0);
  }, [breakdownRows]);

  const roleStartingXp = useMemo(() => {
    if (period === 'season') return 0; // Season starts strictly from 0 baseline
    return targetUser?.roleStartingXp || 0;
  }, [period, targetUser]);

  const achievementBonusXp = useMemo(() => {
    if (period === 'season') return 0; // Season counts purely activities
    return targetUser?.achievementBonusXp || 0;
  }, [period, targetUser]);

  const computedGrandTotal = useMemo(() => {
    return totalActionXp + roleStartingXp + achievementBonusXp;
  }, [totalActionXp, roleStartingXp, achievementBonusXp]);

  // Copy summary to clipboard
  const handleCopySummary = () => {
    if (!targetUser) return;
    const lines = [
      `📊 *REKAP PEROLEHAN EXP PREPLAB PORTAL*`,
      `👤 Nama: ${targetUser.name}`,
      `🆔 NIK: ${targetUser.nik}`,
      `🏢 Section / PT: ${targetUser.section} (${targetUser.pt})`,
      `🎖️ Pangkat: #${targetUser.currentRank?.id || 1} ${targetUser.currentRank?.name}`,
      `🗓️ Periode: ${period === 'season' ? '⚡ Bulan Berjalan (Season EXP)' : '🏆 Total Karir (Career EXP)'}`,
      `-----------------------------------------`,
      ...breakdownRows.filter(r => r.count > 0).map(r => `• ${r.icon} ${r.name}: ${r.count} ${r.unit} × ${r.weight} = +${r.subtotal.toLocaleString()} EXP`),
      ...(roleStartingXp > 0 ? [`• 🌟 Baseline Pangkat Jabatan: +${roleStartingXp.toLocaleString()} EXP`] : []),
      ...(achievementBonusXp > 0 ? [`• 🏅 Bonus Pencapaian Milestone: +${achievementBonusXp.toLocaleString()} EXP`] : []),
      `-----------------------------------------`,
      `⭐ *TOTAL AKUMULASI EXP: ${computedGrandTotal.toLocaleString()} EXP*`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    toast.success('Rincian rekap EXP berhasil disalin ke clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)',
          color: 'var(--text-main, #0F172A)'
        }}
      >
        {/* Header Modal */}
        <div 
          className="px-5 py-4 border-b flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-900/80"
          style={{ borderColor: 'var(--border-main)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/25 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black font-display tracking-tight leading-tight">
                  Tabel Rekapitulasi &amp; Audit EXP
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25">
                  Single Source of Truth
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Rincian transparan penambahan EXP dari setiap aktivitas operasional &amp; jenjang karir.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 rounded-xl border text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer flex items-center gap-1.5"
              style={{ borderColor: 'var(--border-main)' }}
              title="Salin Rincian ke Clipboard"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="hidden sm:inline text-emerald-500">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Salin Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              style={{ borderColor: 'var(--border-main)' }}
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation & Controls Bar */}
        <div 
          className="px-5 py-3 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--input-bg)]/40 shrink-0"
          style={{ borderColor: 'var(--border-main)' }}
        >
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--card-bg)] border shadow-2xs w-fit" style={{ borderColor: 'var(--border-main)' }}>
            <button
              type="button"
              onClick={() => {
                setActiveMode('self');
                setSelectedTargetNik(currentNik);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'self'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>EXP Saya</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('developer')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'developer'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Cari &amp; Audit Personil (Dev Mode)</span>
            </button>
          </div>

          {/* Period Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--card-bg)] border shadow-2xs w-fit self-start sm:self-auto" style={{ borderColor: 'var(--border-main)' }}>
            <button
              type="button"
              onClick={() => setPeriod('season')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                period === 'season'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black ring-1 ring-amber-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-900" />
              <span>⚡ Bulan Ini (Season EXP)</span>
            </button>

            <button
              type="button"
              onClick={() => setPeriod('career')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                period === 'career'
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>🏆 Total Karir (Career EXP)</span>
            </button>
          </div>
        </div>

        {/* Developer Search Bar & Section Filters (Only when activeMode === 'developer') */}
        {activeMode === 'developer' && (
          <div 
            className="px-5 py-3 border-b space-y-2.5 bg-amber-50/50 dark:bg-amber-950/15 shrink-0"
            style={{ borderColor: 'var(--border-main)' }}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Ketik nama atau NIK personil untuk mengaudit rincian EXP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border bg-[var(--card-bg)] text-[var(--text-main)] focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  style={{ borderColor: 'var(--border-main)' }}
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <span className="text-[11px] font-semibold text-[var(--text-muted)] whitespace-nowrap">
                Ditemukan: <strong className="text-[var(--text-main)]">{filteredPersonnel.length}</strong> personil
              </span>
            </div>

            {/* Quick Section Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {['ALL', 'Laboratory', 'Preparation', 'Maintenance', 'Quality Assurance', 'Inventory Control', 'Administration'].map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedSection === sec
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border hover:text-[var(--text-main)]'
                  }`}
                  style={{ borderColor: 'var(--border-main)' }}
                >
                  {sec === 'ALL' ? 'Semua Section' : sec}
                </button>
              ))}
            </div>

            {/* Horizontal Personnel Picker Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
              {filteredPersonnel.slice(0, 20).map(person => {
                const isSelected = (person.nik || '').toUpperCase() === (targetNikToAudit || '').toUpperCase();
                return (
                  <button
                    key={person.nik}
                    type="button"
                    onClick={() => setSelectedTargetNik(person.nik)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-left border transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 shadow-xs ring-1 ring-amber-400'
                        : 'bg-[var(--card-bg)] border-[var(--border-main)] hover:border-amber-400/50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {person.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block truncate max-w-[120px] text-[var(--text-main)]">
                        {person.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] block font-mono">
                        {person.nik} · {person.section}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {targetUser ? (
            <>
              {/* Personnel Summary Banner Card */}
              <div 
                className="p-4 rounded-3xl border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-main)'
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="shrink-0">
                    <DynamicAvatarFrame
                      frameId={targetUser.frame || 'default'}
                      tierLevel={4}
                      size={64}
                      isUnlocked={true}
                    >
                      {targetUser.avatar ? (
                        <img 
                          src={targetUser.avatar} 
                          alt={targetUser.name} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-lg">
                          {targetUser.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </DynamicAvatarFrame>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <img 
                        src={targetUser.isDevUser ? '/assets/ranks/rank_special_gm.svg' : (targetUser.currentRank?.icon || '/assets/ranks/rank_01_trainee.svg')} 
                        alt={targetUser.isDevUser ? 'Game Master' : (targetUser.currentRank?.name || 'Pangkat')}
                        className="w-5 h-5 object-contain inline-block filter drop-shadow-xs"
                      />
                      <h3 className="text-base font-bold font-display text-[var(--text-main)]">
                        {targetUser.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--input-bg)] border text-[var(--text-muted)]" style={{ borderColor: 'var(--border-main)' }}>
                        {targetUser.nik}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[var(--text-muted)]">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 text-[11px]">
                        [{targetUser.title || 'Frontline Trainee'}]
                      </span>
                      <span>•</span>
                      <span>{targetUser.section} · {targetUser.pt}</span>
                      <span>•</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {targetUser.isDevUser
                          ? '🛡️ Game Master (Developer)'
                          : `Pangkat: #${targetUser.currentRank?.id || 1} ${targetUser.currentRank?.name}`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Stats Badges */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0" style={{ borderColor: 'var(--border-main)' }}>
                  <div className="text-right px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                    <span className="text-[10px] font-bold text-amber-500 block uppercase">
                      ⚡ EXP Bulan Ini
                    </span>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                      {(targetUser.seasonXp || 0).toLocaleString()} XP
                    </span>
                  </div>

                  <div className="text-right px-3 py-1.5 rounded-2xl bg-teal-500/10 border border-teal-500/25">
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 block uppercase">
                      🏆 Total Karir EXP
                    </span>
                    <span className="text-sm font-black text-teal-600 dark:text-teal-400 font-mono">
                      {(targetUser.totalXp || 0).toLocaleString()} XP
                    </span>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div 
                className="rounded-3xl border overflow-hidden shadow-xs"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-main)'
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr 
                        className="border-b bg-slate-50 dark:bg-slate-850 text-[var(--text-muted)] font-bold text-[11px]"
                        style={{ borderColor: 'var(--border-main)' }}
                      >
                        <th className="py-3 px-4">Sumber Aktivitas / Modul</th>
                        <th className="py-3 px-4 text-center">Bobot Satuan</th>
                        <th className="py-3 px-4 text-center">
                          {period === 'season' ? 'Kontribusi Bulan Ini' : 'Total Kontribusi'}
                        </th>
                        <th className="py-3 px-4 text-right">Subtotal EXP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                      {/* 14 Operational Activities */}
                      {breakdownRows.map(row => {
                        const hasActivity = row.count > 0;
                        return (
                          <tr 
                            key={row.key}
                            className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${
                              hasActivity ? 'font-medium' : 'opacity-65'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg shrink-0">{row.icon}</span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[var(--text-main)]">
                                      {row.name}
                                    </span>
                                    {hasActivity && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[var(--text-muted)] block">
                                    {row.description}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-[var(--input-bg)] text-[var(--text-main)] border" style={{ borderColor: 'var(--border-main)' }}>
                                +{row.weight} XP
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`font-mono font-bold text-xs ${hasActivity ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                                {row.count.toLocaleString()} <span className="text-[10px] font-normal">{row.unit}</span>
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl ${
                                row.subtotal > 0 
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                                  : 'text-[var(--text-muted)]'
                              }`}>
                                +{row.subtotal.toLocaleString()} XP
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Special Rows: Only applicable on Career EXP */}
                      {period === 'career' && (
                        <>
                          {/* Role Starting Baseline */}
                          <tr className="bg-amber-500/5 dark:bg-amber-950/15">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg shrink-0">🌟</span>
                                <div>
                                  <span className="font-bold text-amber-700 dark:text-amber-300">
                                    Baseline Pangkat Jabatan Organisasi
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] block">
                                    Pangkat Bintang 5 Komandan (Manager: +24.501 XP) / Bintang 3 Jenderal (SPT: +22.601 XP)
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono text-xs text-[var(--text-muted)]">Atribut Jabatan</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono text-xs text-[var(--text-muted)]">
                                {roleStartingXp > 0 ? 'Aktif' : 'Non-Manajemen'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl ${
                                roleStartingXp > 0 
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40' 
                                  : 'text-[var(--text-muted)]'
                              }`}>
                                +{roleStartingXp.toLocaleString()} XP
                              </span>
                            </td>
                          </tr>

                          {/* Achievement Bonus XP */}
                          <tr className="bg-purple-500/5 dark:bg-purple-950/15">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg shrink-0">🏅</span>
                                <div>
                                  <span className="font-bold text-purple-700 dark:text-purple-300">
                                    Bonus Milestone Pencapaian (Achievements)
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] block">
                                    Akumulasi hadiah XP dari seluruh tingkatan tier achievement (Bronze, Silver, Gold, Master) yang telah terbuka
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono text-xs text-[var(--text-muted)]">Variatif per Tier</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono text-xs text-purple-600 dark:text-purple-400 font-bold">
                                {targetUser.badgesCount || 0} Tier Terbuka
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl ${
                                achievementBonusXp > 0 
                                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40' 
                                  : 'text-[var(--text-muted)]'
                              }`}>
                                +{achievementBonusXp.toLocaleString()} XP
                              </span>
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>

                    {/* Table Footer Grand Total */}
                    <tfoot>
                      <tr 
                        className="border-t bg-slate-100 dark:bg-slate-900 font-black text-sm"
                        style={{ borderColor: 'var(--border-main)' }}
                      >
                        <td colSpan={3} className="py-4 px-4 text-[var(--text-main)]">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span>
                              TOTAL PEROLEHAN {period === 'season' ? 'EXP BULAN INI (SEASON EXP)' : 'EXP TOTAL KARIR'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-base sm:text-lg font-mono font-black px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/25 to-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/40 shadow-xs">
                            {computedGrandTotal.toLocaleString()} EXP
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Informative Note Box */}
              <div 
                className="p-3.5 rounded-2xl bg-[var(--input-bg)] border text-xs text-[var(--text-muted)] flex items-start gap-2.5"
                style={{ borderColor: 'var(--border-main)' }}
              >
                <HelpCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    <strong>Transparansi Gamifikasi PrepLab:</strong> Seluruh perolehan EXP dihitung secara otomatis oleh sistem berdasarkan data formulir dan aksi nyata yang terekam di database.
                  </p>
                  <p>
                    Klasemen bulanan direset pada tanggal 1 setiap bulan, sedangkan <strong>Pangkat Kehormatan Vanguard (Level 1–51)</strong> bersifat permanen dan terus bertumbuh seumur karir.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-[var(--text-muted)]">
              <Search className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="text-sm font-bold">Data personil tidak ditemukan</p>
              <p className="text-xs">Silakan pilih nama personil pada pencarian developer di atas.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          className="px-5 py-3.5 border-t flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50"
          style={{ borderColor: 'var(--border-main)' }}
        >
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
            PrepLab Gamification Architecture &copy; 2026
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-main)] cursor-pointer flex items-center gap-1.5"
              style={{ borderColor: 'var(--border-main)' }}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Audit</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold transition-all bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 cursor-pointer shadow-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
