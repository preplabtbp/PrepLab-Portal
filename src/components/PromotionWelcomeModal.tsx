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
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-8 rounded-3xl bg-white border border-amber-400 text-center space-y-3 shadow-xl">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-amber-800">Menghubungkan Data Komando &amp; Pangkat...</p>
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
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl rounded-3xl border-2 border-amber-300 bg-white p-6 sm:p-8 text-slate-800 shadow-2xl my-8 overflow-hidden"
        >
          {/* Subtle Golden Ray Accents */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-teal-200/20 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleAcknowledge}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer z-20"
            title="Tutup Upacara"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Banner */}
          <div className="text-center relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black tracking-widest uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>UPACARA PROMOSI RESMI KOMANDO PREPLAB</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight pt-1">
              SELAMAT, ANDA TELAH DIPROMOSIKAN!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Berdasarkan seluruh rekam jejak kontribusi historis dan dedikasi lapangan Anda yang telah terverifikasi, Anda resmi diangkat ke jenjang pangkat:
            </p>
          </div>

          {/* Hero Rank Display */}
          <div className="my-6 p-6 rounded-2xl bg-gradient-to-b from-amber-50 via-white to-amber-50/40 border border-amber-300 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-5">
              {/* Grand Rank Insignia Badge with Golden Glow */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-xl animate-pulse" />
                <div className="w-24 h-24 rounded-2xl p-2.5 bg-white border-2 border-amber-400 shadow-md flex items-center justify-center relative z-10">
                  <img
                    src={currentRank.icon}
                    alt={currentRank.name}
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                  />
                  <div className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] shadow-sm">
                    #{currentRank.id}/51
                  </div>
                </div>
              </div>

              {/* Personnel & Rank Titles */}
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] font-mono text-amber-700 uppercase tracking-wider block font-bold">
                  PANGKAT KEHORMATAN PREPLAB VANGUARD
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-amber-900 font-display">
                  {currentRank.name}
                </h3>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    {name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({nik})
                  </span>
                </div>
              </div>
            </div>

            {/* EXP Score & Status Badge */}
            <div className="text-center sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
              <span className="text-[10px] text-slate-500 uppercase block font-mono">Total Akumulasi EXP</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600 font-display block">
                {totalXp.toLocaleString()} <span className="text-xs font-bold text-slate-500">EXP</span>
              </span>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 mt-1">
                ✓ Pangkat Permanen Selamanya
              </span>
            </div>
          </div>

          {/* Historical Achievements & Contributions Breakdown */}
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold border-b border-slate-200 pb-2">
              <span>Rekam Jejak Kontribusi Historis Terverifikasi</span>
              <span className="text-amber-700">100% Dihitung Penuh</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block truncate">Inspeksi K3</span>
                <span className="text-base font-black text-slate-800">{stats.inspectionCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block truncate">Laporan KTA</span>
                <span className="text-base font-black text-emerald-700">{stats.ktaCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block truncate">Tema Desain</span>
                <span className="text-base font-black text-fuchsia-700">{stats.themesCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block truncate">Kuis Nilai 100</span>
                <span className="text-base font-black text-amber-700">{stats.quiz100Count || 0}</span>
              </div>
            </div>

            {/* Unlocked Gelar Kehormatan Badges */}
            {unlockedTitles.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Gelar Kehormatan yang Berhasil Anda Buka:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                  {unlockedTitles.map((title, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1"
                    >
                      <Award className="w-3 h-3 text-teal-600" />
                      [{title}]
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-7 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
            <p className="text-[11px] text-slate-500 text-center sm:text-left">
              Pangkat ini adalah identitas resmi Anda di portal, leaderboard, dan obrolan sistem.
            </p>
            <button
              onClick={handleAcknowledge}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm tracking-wide shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
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
