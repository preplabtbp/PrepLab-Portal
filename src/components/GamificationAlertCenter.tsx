import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Trophy, Medal, Award, Crown, Sparkles, X, ChevronRight, Check, Shield
} from 'lucide-react';
import { 
  ExpGainEventDetail, 
  AchievementEventDetail, 
  RankUpEventDetail,
  triggerRankUp,
  triggerAchievementUnlocked
} from '../lib/gamificationEvents';
import { VANGUARD_RANKS, getRankByXp } from '../lib/pointBlankRanks';
import { TIERED_ACHIEVEMENTS } from '../lib/gamificationEngine';
import { DynamicAvatarFrame } from './DynamicAvatarFrame';
import { toast } from 'sonner';

interface MiniExpItem extends ExpGainEventDetail {
  id: string;
}

export function GamificationAlertCenter({
  currentNik,
  currentName,
  userAvatar
}: {
  currentNik?: string | null;
  currentName?: string | null;
  userAvatar?: string | null;
}) {
  // 1. Pop-up Kecil Queue
  const [expToasts, setExpToasts] = useState<MiniExpItem[]>([]);

  // 2. Pop-up Sedang: Achievement Tier Biasa
  const [achievementNormal, setAchievementNormal] = useState<AchievementEventDetail | null>(null);

  // 3. Pop-up Mewah: Achievement Tier Tertinggi (Master)
  const [achievementMaster, setAchievementMaster] = useState<AchievementEventDetail | null>(null);

  // 4. Pop-up Sedang: Naik Pangkat Biasa (Level 2 - 50)
  const [rankUpNormal, setRankUpNormal] = useState<RankUpEventDetail | null>(null);

  // 5. Pop-up Mewah: Naik Pangkat Tertinggi (Bintang 5 - Level 51)
  const [rankUpSupreme, setRankUpSupreme] = useState<RankUpEventDetail | null>(null);

  // Canvas ref for golden particle fireworks in Master / Supreme celebrations
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Listen to Pop-up Kecil (EXP gain)
  useEffect(() => {
    const handleExpGain = (e: any) => {
      const detail: ExpGainEventDetail = e.detail;
      if (!detail || !detail.amount) return;

      const newItem: MiniExpItem = {
        ...detail,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      };

      setExpToasts(prev => [newItem, ...prev.slice(0, 2)]);

      setTimeout(() => {
        setExpToasts(prev => prev.filter(item => item.id !== newItem.id));
      }, 3500);
    };

    window.addEventListener('gamification_exp_gain', handleExpGain);
    return () => window.removeEventListener('gamification_exp_gain', handleExpGain);
  }, []);

  // Listen to Achievement events
  useEffect(() => {
    const handleAchievement = (e: any) => {
      const detail: AchievementEventDetail = e.detail;
      if (!detail) return;
      if (detail.isMaster) {
        setAchievementMaster(detail);
      } else {
        setAchievementNormal(detail);
      }
    };

    window.addEventListener('gamification_achievement_unlocked', handleAchievement);
    return () => window.removeEventListener('gamification_achievement_unlocked', handleAchievement);
  }, []);

  // Listen to Rank Up events
  useEffect(() => {
    const handleRankUp = (e: any) => {
      const detail: RankUpEventDetail = e.detail;
      if (!detail) return;
      if (detail.isMaxRank || detail.newRankId === 51) {
        setRankUpSupreme(detail);
      } else {
        setRankUpNormal(detail);
      }
    };

    window.addEventListener('gamification_rank_up', handleRankUp);
    return () => window.removeEventListener('gamification_rank_up', handleRankUp);
  }, []);

  // 6. Auto-diff rank-ups & achievement unlocks from backend user-stats
  useEffect(() => {
    if (!currentNik) return;

    const diffStats = async () => {
      try {
        const res = await fetch(`/api/gamification/user-stats/${encodeURIComponent(currentNik)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        // Rank Diff
        const currentRankId = data.rankInfo?.currentRank?.id ?? data.rank?.id;
        if (typeof currentRankId === 'number' && currentRankId > 0) {
          const rankKey = `preplab_last_alert_rank_${currentNik}`;
          const savedRankIdStr = localStorage.getItem(rankKey);
          if (savedRankIdStr !== null) {
            const prevRankId = parseInt(savedRankIdStr, 10);
            if (!isNaN(prevRankId) && currentRankId > prevRankId) {
              const newRank = data.rankInfo?.currentRank || data.rank;
              const isMax = currentRankId === 51;
              triggerRankUp({
                oldRankId: prevRankId,
                newRankId: currentRankId,
                oldRankName: `Pangkat #${prevRankId}`,
                newRankName: newRank?.name || 'Komandan',
                newRankIcon: newRank?.icon || '/assets/ranks/rank_01_trainee.svg',
                totalXp: data.totalXp || 0,
                nextRankName: data.rankInfo?.nextRank?.name,
                isMaxRank: isMax
              });
            }
          }
          localStorage.setItem(rankKey, String(currentRankId));
        }

        // Achievement Tiers Diff
        const tiersKey = `preplab_last_alert_tiers_${currentNik}`;
        const savedTiersRaw = localStorage.getItem(tiersKey);
        const savedTiers: Record<string, number> = savedTiersRaw ? JSON.parse(savedTiersRaw) : {};
        const newTiers: Record<string, number> = {};

        const branches = data.branchResults || [];
        branches.forEach((b: any) => {
          const curTier = b.currentTier || 0;
          newTiers[b.code] = curTier;
          if (savedTiersRaw) {
            const prevTier = savedTiers[b.code] ?? curTier;
            if (curTier > prevTier && curTier > 0) {
              const isMaster = curTier >= 4;
              const tierInfo = b.tiers?.[curTier - 1] || {};
              triggerAchievementUnlocked({
                branchCode: b.code,
                branchName: b.title || 'Lencana Prestasi',
                tierLevel: curTier,
                tierName: b.tierName || (isMaster ? 'Master Tier' : `Tier ${curTier}`),
                titleReward: tierInfo.titleReward || b.titleReward || 'Vanguard Specialist',
                xpReward: tierInfo.xpReward || (isMaster ? 500 : 150),
                frameReward: tierInfo.frameReward || b.frameReward,
                isMaster
              });
            }
          }
        });
        localStorage.setItem(tiersKey, JSON.stringify(newTiers));
      } catch (e) {
        console.warn('Gamification Alert Center diff error:', e);
      }
    };

    diffStats();

    const handleUpdate = () => {
      diffStats();
    };

    window.addEventListener('gamification_updated', handleUpdate);
    return () => window.removeEventListener('gamification_updated', handleUpdate);
  }, [currentNik]);

  // Attach test helpers to window for easy verification
  useEffect(() => {
    (window as any).testExpGain = (amount = 50, title = 'Inspeksi Selesai') => {
      window.dispatchEvent(new CustomEvent('gamification_exp_gain', {
        detail: { amount, title, subtitle: 'Divisi Preparasi & Laboratorium' }
      }));
    };
    (window as any).testAchievementNormal = () => {
      window.dispatchEvent(new CustomEvent('gamification_achievement_unlocked', {
        detail: {
          branchCode: 'BRANCH_KTA',
          branchName: 'Pelopor Keselamatan',
          tierLevel: 2,
          tierName: 'Silver Vanguard',
          titleReward: 'Safety Pioneer',
          xpReward: 200,
          isMaster: false
        }
      }));
    };
    (window as any).testAchievementMaster = () => {
      window.dispatchEvent(new CustomEvent('gamification_achievement_unlocked', {
        detail: {
          branchCode: 'BRANCH_INSPECTION',
          branchName: 'Legenda Inspeksi Lapangan',
          tierLevel: 4,
          tierName: 'Supreme Master',
          titleReward: 'Grand Auditor',
          xpReward: 500,
          rewardFrame: 'cyber_gold',
          isMaster: true
        }
      }));
    };
    (window as any).testRankUpNormal = () => {
      window.dispatchEvent(new CustomEvent('gamification_rank_up', {
        detail: {
          oldRankId: 14,
          newRankId: 15,
          oldRankName: 'Sergeant 1st Class',
          newRankName: 'Staff Sergeant Grade 1',
          newRankIcon: '/assets/ranks/rank_15_v3_emas.svg',
          totalXp: 3200,
          nextRankName: 'Staff Sergeant Grade 2',
          isMaxRank: false
        }
      }));
    };
    (window as any).testRankUpSupreme = () => {
      window.dispatchEvent(new CustomEvent('gamification_rank_up', {
        detail: {
          oldRankId: 50,
          newRankId: 51,
          oldRankName: 'General of the Army',
          newRankName: 'Supreme Vanguard Commander',
          newRankIcon: '/assets/ranks/rank_51_bintang_5.svg',
          totalXp: 25000,
          isMaxRank: true
        }
      }));
    };
  }, []);

  // Golden particle canvas animation for Deluxe celebrations (Master / Supreme Commander)
  useEffect(() => {
    if (!achievementMaster && !rankUpSupreme) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
      decay: number;
    }

    const particles: Particle[] = [];
    const colors = ['#F59E0B', '#FBBF24', '#FCD34D', '#10B981', '#14B8A6', '#FFFFFF'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 150,
        y: canvas.height * 0.45 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 14,
        radius: Math.random() * 3.5 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.012 + 0.006
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      if (particles.some(p => p.alpha > 0)) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [achievementMaster, rankUpSupreme]);

  // Handle equip title helper
  const handleEquipTitle = (title: string) => {
    localStorage.setItem('preplab_equipped_title', title);
    toast.success(`🎖️ Gelar aktif berhasil dipasang: [${title}]!`);
    window.dispatchEvent(new Event('gamification_updated'));
    if (currentNik) {
      fetch('/api/gamification/equip-customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik: currentNik, title })
      }).catch(() => {});
    }
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. POP-UP KECIL: MINI EXP GAIN TOAST (Floating Header Pill)  */}
      {/* ============================================================ */}
      <div className="fixed top-4 right-4 sm:right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {expToasts.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -20, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 350 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-950/90 border border-amber-400/50 shadow-2xl backdrop-blur-md text-white select-none ring-1 ring-amber-400/20"
            >
              {/* Animated EXP Spark Badge */}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
                <Zap className="w-4 h-4 fill-slate-950" />
              </div>

              {/* Text Information */}
              <div className="flex flex-col pr-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black font-mono text-amber-400">
                    +{item.amount.toLocaleString()} EXP
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Kemahiran
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-[260px]">
                  {item.title}
                </span>
                {item.subtitle && (
                  <span className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[260px]">
                    {item.subtitle}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/* 2. POP-UP SEDANG: ACHIEVEMENT TIER BIASA (Bronze / Silver / Gold) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {achievementNormal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative w-full max-w-md rounded-3xl border border-teal-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 text-white shadow-2xl overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setAchievementNormal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center space-y-3 pt-2">
                {/* Metallic Tier Badge Icon */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/50 flex items-center justify-center shadow-lg">
                    <Medal className="w-8 h-8 text-teal-300" />
                  </div>
                  <span className="absolute -bottom-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500 text-slate-950 font-mono shadow-xs">
                    {achievementNormal.tierName}
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider block">
                    ACHIEVEMENT RESMI TERBUKA
                  </span>
                  <h3 className="text-xl font-bold font-display text-white">
                    {achievementNormal.branchName}
                  </h3>
                </div>

                {/* Reward Box */}
                <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Gelar Kehormatan:</span>
                    <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      [{achievementNormal.titleReward}]
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Bonus EXP Kemahiran:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{achievementNormal.xpReward} EXP
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 w-full pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleEquipTitle(achievementNormal.titleReward);
                      setAchievementNormal(null);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Pasang Gelar Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setAchievementNormal(null)}
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 3. POP-UP MEWAH: ACHIEVEMENT TIER TERTINGGI (MASTER TIER 4)  */}
      {/* ============================================================ */}
      <AnimatePresence>
        {achievementMaster && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="relative w-full max-w-lg rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-950 via-zinc-950 to-black p-6 sm:p-8 text-white shadow-2xl shadow-amber-500/30 overflow-hidden z-10 text-center"
            >
              {/* Radial Golden Burst Accent */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl pointer-events-none animate-pulse" />

              <button
                type="button"
                onClick={() => setAchievementMaster(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Master Medal Crown Insignia */}
              <div className="relative inline-flex items-center justify-center my-3">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-1 shadow-2xl shadow-amber-500/50">
                  <div className="w-full h-full rounded-[22px] bg-slate-950 flex flex-col items-center justify-center">
                    <Crown className="w-10 h-10 text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]" />
                  </div>
                </div>
                <span className="absolute -bottom-2.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 font-mono shadow-md">
                  MASTER TIER 4
                </span>
              </div>

              {/* Master Header */}
              <div className="space-y-1.5 mt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>PRESTASI MASTER TERTINGGI DIRAIH</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
                  {achievementMaster.branchName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
                  Selamat! Anda telah menuntaskan seluruh tantangan operasional hingga batas tertinggi dan membuka hak istimewa eksklusif.
                </p>
              </div>

              {/* Exclusive Unlocked Rewards Box */}
              <div className="my-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-amber-500/40 text-left space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-slate-300 font-medium">Gelar Master Legendaris:</span>
                  <span className="font-bold text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/40 text-xs shadow-xs">
                    [{achievementMaster.titleReward}]
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-slate-300 font-medium">Bingkai Avatar Eksklusif:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Terbuka di Lemari Kosmetik</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Bonus EXP Kemahiran:</span>
                  <span className="font-mono font-black text-sm text-amber-400">
                    +{achievementMaster.xpReward.toLocaleString()} EXP
                  </span>
                </div>
              </div>

              {/* Celebration Action Button */}
              <button
                type="button"
                onClick={() => {
                  handleEquipTitle(achievementMaster.titleReward);
                  setAchievementMaster(null);
                }}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-600 hover:to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/40 transition-all active:scale-95 cursor-pointer"
              >
                Terima &amp; Terapkan Gelar Master
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 4. POP-UP SEDANG: NAIK PANGKAT BIASA (Level 2 - 50)          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {rankUpNormal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 25 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative w-full max-w-md rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 text-white shadow-2xl overflow-hidden text-center"
            >
              <button
                type="button"
                onClick={() => setRankUpNormal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Insignia Transition Animation */}
              <div className="flex items-center justify-center gap-4 my-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 p-2 flex items-center justify-center">
                  <img
                    src={rankUpNormal.newRankIcon}
                    alt={rankUpNormal.newRankName}
                    className="w-full h-full object-contain filter drop-shadow-md animate-bounce"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                  PROMOSI PANGKAT KOMANDO
                </span>
                <h3 className="text-xl font-bold font-display text-white">
                  {rankUpNormal.newRankName}
                </h3>
                <span className="text-xs font-mono text-slate-400 block">
                  Pangkat Kehormatan #{rankUpNormal.newRankId} / 51
                </span>
              </div>

              <div className="my-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Personil:</span>
                  <span className="font-bold text-white">{currentName || 'Personil PrepLab'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Akumulasi EXP:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {rankUpNormal.totalXp.toLocaleString()} EXP
                  </span>
                </div>
                {rankUpNormal.nextRankName && (
                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <span className="text-slate-400 font-medium">Target Selanjutnya:</span>
                    <span className="text-teal-400 font-bold">{rankUpNormal.nextRankName}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setRankUpNormal(null)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Lanjutkan Tugas Komando
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 5. POP-UP MEWAH: NAIK PANGKAT BINTANG 5 (SUPREME COMMANDER)   */}
      {/* ============================================================ */}
      <AnimatePresence>
        {rankUpSupreme && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.75, y: 40 }}
              transition={{ type: 'spring', damping: 20, stiffness: 240 }}
              className="relative w-full max-w-xl rounded-3xl border-4 border-amber-400 bg-gradient-to-b from-black via-rose-950/70 to-black p-6 sm:p-10 text-white shadow-2xl shadow-amber-500/50 text-center overflow-hidden z-10"
            >
              {/* Grand Rotating Golden Rays in Background */}
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/25 blur-3xl pointer-events-none animate-pulse" />

              <button
                type="button"
                onClick={() => setRankUpSupreme(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Supreme 5-Star Badge */}
              <div className="relative inline-flex items-center justify-center my-3">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-3 bg-gradient-to-b from-amber-400 via-red-600 to-amber-600 border-2 border-amber-300 shadow-2xl shadow-amber-500/60 flex items-center justify-center">
                  <img
                    src="/assets/ranks/rank_51_bintang_5.svg"
                    alt="Supreme Vanguard Commander"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                  />
                </div>
                <div className="absolute -bottom-2.5 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg">
                  PANGKAT TERTINGGI #51
                </div>
              </div>

              <div className="space-y-2 mt-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-widest">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>UPACARA KENETRALAN &amp; KOMANDO TERTINGGI</span>
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <h1 className="text-2xl sm:text-4xl font-black font-display text-white tracking-tight">
                  SUPREME VANGUARD COMMANDER
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  Seluruh divisi operasional PrepLab (Preparation, Laboratory, Maintenance, Quality Assurance, Inventory Control, Administration) memberi hormat tertinggi kepada Komandan!
                </p>
              </div>

              {/* Prestige Privileges Box */}
              <div className="my-6 p-5 rounded-2xl bg-black/60 border border-amber-500/40 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Gelar Kehormatan Negara:</span>
                  <span className="font-black text-amber-300 text-xs">
                    [Supreme Commander]
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Hak Istimewa:</span>
                  <span className="font-bold text-emerald-400">
                    Aura Bintang 5 Emas &amp; Hall of Fame Abadi
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleEquipTitle('Supreme Commander');
                  setRankUpSupreme(null);
                }}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-2xl shadow-amber-500/50 transition-all active:scale-95 cursor-pointer"
              >
                Terima Komando Tertinggi PrepLab
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
