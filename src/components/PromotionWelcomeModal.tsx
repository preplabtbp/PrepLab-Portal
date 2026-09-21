import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, Award, Shield, CheckCircle2, ChevronRight, X, Flame, Star } from 'lucide-react';
import { getRankByXp, PBRank } from '../lib/pointBlankRanks';
import { DynamicAvatarFrame } from './DynamicAvatarFrame';
import { toast } from 'sonner';

export interface PromotionWelcomeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentUserNik?: string;
  currentUserName?: string;
  userAvatar?: string | null;
  forceShow?: boolean;
}

export const PromotionWelcomeModal: React.FC<PromotionWelcomeModalProps> = ({
  isOpen,
  onClose,
  currentUserNik,
  currentUserName,
  userAvatar,
  forceShow = false
}) => {
  const nik = currentUserNik || (typeof window !== 'undefined' ? localStorage.getItem('preplab_nik') : null) || '02D25000055';
  const storageKey = `preplab_main_release_rank_promoted_v1_${nik}`;

  const [open, setOpen] = useState(false);
  const [gamificationData, setGamificationData] = useState<any>(() => {
    if (typeof window !== 'undefined' && nik) {
      try {
        const cached = localStorage.getItem(`preplab_gamification_${nik}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  // Check if first-time promotion modal should be displayed automatically on launch
  useEffect(() => {
    if (forceShow || isOpen) {
      setOpen(true);
      fetchData();
      return;
    }

    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen && nik) {
      setOpen(true);
      fetchData();
    }
  }, [forceShow, isOpen, nik]);

  const fetchData = async () => {
    if (!nik) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gamification/user-stats/${encodeURIComponent(nik)}`);
      if (res.ok) {
        const data = await res.json();
        setGamificationData(data);
        try {
          localStorage.setItem(`preplab_gamification_${nik}`, JSON.stringify(data));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Error loading promotion data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = () => {
    localStorage.setItem(storageKey, 'true');
    setOpen(false);
    if (onClose) onClose();
    toast.success('🎖️ Pangkat Resmi Diterima! Selamat bertugas, Komandan.');
  };

  if (!open) return null;

  if (loading && !gamificationData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="p-8 rounded-3xl bg-slate-900 border border-amber-500/40 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-amber-300">Menghubungkan Data Komando &amp; Pangkat...</p>
        </div>
      </div>
    );
  }

  const totalXp = gamificationData?.totalXp || 0;
  const rankInfo = gamificationData?.rankInfo || getRankByXp(totalXp);
  const currentRank: PBRank = rankInfo.currentRank;
  const name = currentUserName || gamificationData?.name || 'Personil PrepLab';
  const unlockedTitles: string[] = gamificationData?.unlockedTitles || ['Frontline Trainee'];
  const stats = gamificationData?.stats || {};
  const equippedFrame = gamificationData?.equippedFrame || localStorage.getItem('preplab_equipped_frame') || 'default';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-amber-500/20 my-8 overflow-hidden"
        >
          {/* Subtle Golden Ray Accents */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleAcknowledge}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer z-20"
            title="Tutup Upacara"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Banner */}
          <div className="text-center relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>UPACARA PROMOSI RESMI KOMANDO PREPLAB</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
              SELAMAT, ANDA TELAH DIPROMOSIKAN!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
              Berdasarkan seluruh rekam jejak kontribusi historis dan dedikasi lapangan Anda yang telah terverifikasi, Anda resmi diangkat ke jenjang pangkat:
            </p>
          </div>

          {/* Hero Rank Display */}
          <div className="my-6 p-6 rounded-2xl bg-gradient-to-b from-amber-500/10 via-white/5 to-white/5 border border-amber-500/40 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-5">
              {/* Grand Rank Insignia Badge with Golden Glow */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-xl animate-pulse" />
                <div className="w-24 h-24 rounded-2xl p-2.5 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-amber-400/80 shadow-2xl flex items-center justify-center relative z-10">
                  <img
                    src={currentRank.icon}
                    alt={currentRank.name}
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                  />
                  <div className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] shadow-md">
                    #{currentRank.id}/51
                  </div>
                </div>
              </div>

              {/* Personnel & Rank Titles */}
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block font-bold">
                  PANGKAT KEHORMATAN PREPLAB VANGUARD
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-amber-300 font-display">
                  {currentRank.name}
                </h3>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                  <span className="text-xs font-bold text-slate-200">
                    {name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({nik})
                  </span>
                </div>
              </div>
            </div>

            {/* EXP Score & Status Badge */}
            <div className="text-center sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
              <span className="text-[10px] text-slate-400 uppercase block font-mono">Total Akumulasi EXP</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-display block">
                {totalXp.toLocaleString()} <span className="text-xs font-bold text-slate-300">EXP</span>
              </span>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-1">
                ✓ Pangkat Permanen Selamanya
              </span>
            </div>
          </div>

          {/* Historical Achievements & Contributions Breakdown */}
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold border-b border-white/10 pb-2">
              <span>Rekam Jejak Kontribusi Historis Terverifikasi</span>
              <span className="text-amber-400">100% Dihitung Penuh</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 block truncate">Inspeksi K3</span>
                <span className="text-base font-black text-white">{stats.inspectionCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 block truncate">Laporan KTA</span>
                <span className="text-base font-black text-emerald-400">{stats.ktaCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 block truncate">Tema Desain</span>
                <span className="text-base font-black text-fuchsia-400">{stats.themesCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 block truncate">Kuis Nilai 100</span>
                <span className="text-base font-black text-amber-400">{stats.quiz100Count || 0}</span>
              </div>
            </div>

            {/* Unlocked Gelar Kehormatan Badges */}
            {unlockedTitles.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Gelar Kehormatan yang Berhasil Anda Buka:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                  {unlockedTitles.map((title, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1"
                    >
                      <Award className="w-3 h-3 text-teal-400" />
                      [{title}]
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-7 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
            <p className="text-[11px] text-slate-400 text-center sm:text-left">
              Pangkat ini adalah identitas resmi Anda di portal, leaderboard, dan obrolan sistem.
            </p>
            <button
              onClick={handleAcknowledge}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Shield className="w-4 h-4 text-slate-950" />
              <span>TERIMA PANGKAT &amp; MULAI BERTUGAS</span>
              <ChevronRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
