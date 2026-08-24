import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Shield, RefreshCw, Sun, Moon, Sunset, 
  Quote, Edit2, Zap, Activity
} from 'lucide-react';
import { getDailySkenaQuote, SkenaQuote, SKENA_QUOTES } from '../utils/skena-quotes';

interface DailyGreetingHeroProps {
  inspectorName?: string | null;
  inspectorNik?: string | null;
  onOpenUsernameModal?: () => void;
}

export function DailyGreetingHero({
  inspectorName,
  inspectorNik,
  onOpenUsernameModal
}: DailyGreetingHeroProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quoteIndexOffset, setQuoteIndexOffset] = useState(0);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(0);

  // User Profile and Nickname state
  const [currentUsername, setCurrentUsername] = useState(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      return profile.username || localStorage.getItem('p2h_inspector_username') || '';
    } catch (e) {
      return '';
    }
  });

  const displayName = useMemo(() => {
    if (currentUsername) return currentUsername;
    if (inspectorName && inspectorName !== 'Guest' && inspectorName !== 'Inspector') {
      return inspectorName.split(' ')[0];
    }
    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.nama || p.name) return (p.nama || p.name).split(' ')[0];
      }
    } catch (e) {}
    return 'Rekan Kerja';
  }, [currentUsername, inspectorName]);

  const userSubtitle = useMemo(() => {
    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        return [p.jabatan, p.section || p.pt].filter(Boolean).join(' • ');
      }
    } catch (e) {}
    return 'Preparation & Laboratory Team';
  }, []);

  // Time of Day Greeting
  const greetingInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      return {
        greeting: 'Selamat Pagi',
        sub: 'Awali shift dengan energi positif & fokus tanpa batas',
        icon: Sun,
        themeGradient: 'from-amber-400 via-orange-400 to-yellow-300',
        badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
        glowColor: '#F59E0B'
      };
    } else if (hour >= 11 && hour < 15) {
      return {
        greeting: 'Selamat Siang',
        sub: 'Tetap jaga fokus, hidrasi, dan keselamatan operasional',
        icon: Sun,
        themeGradient: 'from-teal-300 via-emerald-300 to-cyan-300',
        badgeColor: 'text-teal-300 bg-teal-500/20 border-teal-500/40',
        glowColor: '#14B8A6'
      };
    } else if (hour >= 15 && hour < 18) {
      return {
        greeting: 'Selamat Sore',
        sub: 'Tuntaskan target harian dengan rapi dan selamat',
        icon: Sunset,
        themeGradient: 'from-orange-400 via-rose-400 to-amber-300',
        badgeColor: 'text-orange-300 bg-orange-500/20 border-orange-500/40',
        glowColor: '#F97316'
      };
    } else {
      return {
        greeting: 'Selamat Malam',
        sub: 'Patuhi SOP, selalu waspada, dan utamakan keselamatan kerja',
        icon: Moon,
        themeGradient: 'from-indigo-300 via-purple-300 to-pink-300',
        badgeColor: 'text-purple-300 bg-purple-500/20 border-purple-500/40',
        glowColor: '#8B5CF6'
      };
    }
  }, []);

  // Base deterministic Daily Skena Quote for today
  const baseDailyQuote = useMemo(() => {
    return getDailySkenaQuote(inspectorNik || currentUsername || inspectorName || 'user');
  }, [inspectorNik, currentUsername, inspectorName]);

  // Active Quote (supports cycling)
  const activeQuote: SkenaQuote = useMemo(() => {
    if (quoteIndexOffset === 0) return baseDailyQuote;
    const baseIndex = SKENA_QUOTES.findIndex(q => q.quote === baseDailyQuote.quote);
    const newIdx = (baseIndex + quoteIndexOffset + SKENA_QUOTES.length) % SKENA_QUOTES.length;
    return SKENA_QUOTES[newIdx] || baseDailyQuote;
  }, [baseDailyQuote, quoteIndexOffset]);

  // Check Daily Splash condition on mount (Only if username has been registered!)
  useEffect(() => {
    if (!currentUsername) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const nikKey = inspectorNik || localStorage.getItem('p2h_inspector_nik') || 'general';
    const storageKey = `preplab_daily_splash_${nikKey}`;
    const lastShown = localStorage.getItem(storageKey);

    if (lastShown !== todayStr) {
      startCinematicSplash();
    }
  }, [inspectorNik, currentUsername]);

  const startCinematicSplash = () => {
    setProgress(0);
    setStage(1);
    setIsExpanded(true);
  };

  // Global listener to replay splash
  useEffect(() => {
    const handleReplay = (e: any) => {
      if (e?.detail?.username) {
        setCurrentUsername(e.detail.username);
      } else {
        const saved = localStorage.getItem('p2h_inspector_username');
        if (saved) setCurrentUsername(saved);
      }
      startCinematicSplash();
    };
    window.addEventListener('preplab:show_daily_splash', handleReplay);
    return () => window.removeEventListener('preplab:show_daily_splash', handleReplay);
  }, []);

  // Multi-stage progression timing (Total 4.5s)
  useEffect(() => {
    if (!isExpanded) return;

    // Stage 1 -> Stage 2 after 0.8s
    const t1 = setTimeout(() => setStage(2), 800);
    // Stage 2 -> Stage 3 after 1.8s
    const t2 = setTimeout(() => setStage(3), 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isExpanded]);

  // Guaranteed Auto-morph transition timer (4.5s total duration)
  useEffect(() => {
    if (!isExpanded) return;

    const interval = 50;
    const totalDuration = 4500;
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev + step >= 100) {
          clearInterval(timer);
          handleCollapse();
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isExpanded]);

  const handleCollapse = () => {
    setIsExpanded(false);
    const todayStr = new Date().toISOString().split('T')[0];
    const nikKey = inspectorNik || localStorage.getItem('p2h_inspector_nik') || 'general';
    localStorage.setItem(`preplab_daily_splash_${nikKey}`, todayStr);
  };

  const handleCycleQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuoteIndexOffset(prev => prev + 1);
  };

  const GreetingIcon = greetingInfo.icon;
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. CINEMATIC FULLSCREEN VIDEO-LIKE CANVAS (STAGE 1 -> MORPHING)          */}
      {/* ========================================================================= */}
      <AnimatePresence mode="sync">
        {isExpanded && (
          <motion.div
            key="cinematic-splash-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
            }}
            onClick={handleCollapse}
            className="fixed inset-0 z-[200] w-screen h-screen select-none bg-[#070A12] overflow-hidden flex flex-col justify-between p-6 sm:p-12 cursor-pointer"
          >
            {/* Dynamic Aurora Beams */}
            <motion.div
              animate={{
                scale: [1, 1.35, 1.1, 1],
                opacity: [0.4, 0.65, 0.45, 0.4],
                x: [0, 80, -40, 0],
                y: [0, -60, 40, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none"
              style={{ backgroundColor: greetingInfo.glowColor }}
            />

            <motion.div
              animate={{
                scale: [1.2, 1, 1.3, 1.2],
                opacity: [0.3, 0.55, 0.35, 0.3],
                x: [0, -70, 50, 0],
                y: [0, 60, -30, 0],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-40 -right-40 w-[650px] h-[650px] rounded-full blur-[150px] pointer-events-none"
              style={{ backgroundColor: 'var(--primary, #0D9488)' }}
            />

            {/* Particle Cyber Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:32px_32px] opacity-40 pointer-events-none" />

            {/* Cinematic Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />

            {/* Top Branding */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 w-full flex items-center justify-between max-w-5xl mx-auto"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-lg border border-white/20 relative"
                  style={{ backgroundColor: 'var(--primary, #0D9488)' }}
                >
                  <Sparkles className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black tracking-widest uppercase text-white/90 font-mono flex items-center gap-2">
                    PREPLAB PORTAL
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/50">{todayFormatted}</p>
                </div>
              </div>

              <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                Klik layar untuk lewati
              </div>
            </motion.div>

            {/* Center Dramatic Presentation Stage */}
            <div className="relative z-10 w-full max-w-4xl mx-auto my-auto flex flex-col items-center text-center space-y-7">
              {/* Time Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-2 backdrop-blur-md shadow-lg ${greetingInfo.badgeColor}`}
              >
                <GreetingIcon className="w-4 h-4" />
                <span>{greetingInfo.greeting}</span>
              </motion.div>

              {/* Dramatic Name Typography */}
              <div className="space-y-2 max-w-3xl">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-white/60"
                >
                  {greetingInfo.sub}
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-none"
                >
                  Halo,{' '}
                  <span 
                    className={`bg-clip-text text-transparent bg-gradient-to-r ${greetingInfo.themeGradient} drop-shadow-[0_10px_30px_rgba(255,255,255,0.25)]`}
                  >
                    {displayName}
                  </span>
                  ! 👋
                </motion.h1>

                {userSubtitle && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs sm:text-sm text-white/50 font-mono tracking-wider pt-1"
                  >
                    {userSubtitle}
                  </motion.p>
                )}
              </div>

              {/* Skena Quotes Card with Spotlight Glow */}
              <motion.div
                layoutId="daily-skena-quote-card"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-2xl relative rounded-3xl p-6 sm:p-7 border shadow-2xl backdrop-blur-2xl text-left space-y-3"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Quote className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Quote Hari Ini • {activeQuote.vibe}
                    </span>
                  </div>
                  {activeQuote.tag && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 font-mono border border-white/10">
                      {activeQuote.tag}
                    </span>
                  )}
                </div>

                <p className="text-base sm:text-lg md:text-xl font-medium text-white/95 leading-relaxed italic">
                  "{activeQuote.quote}"
                </p>

                <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-teal-300 font-semibold">
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>Prioritaskan Keselamatan Kerja & Lengkapi APD Sebelum Mulai</span>
                </div>
              </motion.div>
            </div>

            {/* Bottom Streamline Progress Bar */}
            <div className="relative z-10 w-full max-w-4xl mx-auto space-y-2">
              <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
                <span>Mentransformasikan ke portal kerja...</span>
                <span>{Math.max(0, Math.ceil((100 - progress) / 22))}s</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: greetingInfo.glowColor,
                    boxShadow: `0 0 12px ${greetingInfo.glowColor}`
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. DOCKED HOMEPAGE HERO HEADER (TRANSFORMED / MORPHED DESTINATION)        */}
      {/* ========================================================================= */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 160, 
          damping: 22,
          duration: 0.8 
        }}
        className="relative overflow-hidden rounded-3xl p-5 sm:p-7 shadow-xl border flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all"
        style={{
          backgroundColor: 'var(--card-bg, #0F172A)',
          borderColor: 'var(--border-main, #334155)',
          color: 'var(--text-main, #F8FAFC)'
        }}
      >
        {/* Subtle Ambient Background Glows */}
        <div 
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-[80px] pointer-events-none opacity-25"
          style={{ backgroundColor: greetingInfo.glowColor }}
        />
        <div 
          className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-[80px] pointer-events-none opacity-20"
          style={{ backgroundColor: 'var(--primary, #0D9488)' }}
        />
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4">
          <Activity className="w-44 h-44 text-current" />
        </div>

        {/* Left Content Column */}
        <div className="relative z-10 flex-1 space-y-3">
          {/* Greeting & Name Title with Edit Nickname Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight flex items-center gap-1.5">
              <span>{greetingInfo.greeting},</span>
              <span 
                className={`bg-clip-text text-transparent bg-gradient-to-r ${greetingInfo.themeGradient} drop-shadow-xs`}
              >
                {displayName}
              </span>
              <span>!</span>
              <span className="text-2xl animate-bounce">👋</span>
            </h1>

            {onOpenUsernameModal && (
              <button
                type="button"
                onClick={onOpenUsernameModal}
                title="Ubah Username / Nama Panggilan Anda"
                className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-main)',
                  color: 'var(--primary)'
                }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{currentUsername ? 'Ubah Panggilan' : 'Setel Username'}</span>
              </button>
            )}
          </div>

          {/* Skena Motivational Quote Box */}
          <motion.div 
            layoutId="daily-skena-quote-card"
            className="rounded-2xl p-4 border relative group max-w-2xl shadow-inner transition-colors"
            style={{
              backgroundColor: 'var(--input-bg, rgba(0,0,0,0.2))',
              borderColor: 'var(--border-main, rgba(255,255,255,0.1))'
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                Quote Hari Ini • {activeQuote.vibe}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-60 font-mono">
                  {activeQuote.tag}
                </span>
                <button
                  type="button"
                  onClick={handleCycleQuote}
                  className="opacity-60 hover:opacity-100 p-0.5 rounded transition-opacity cursor-pointer"
                  title="Ganti quote acak lainnya"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm italic leading-relaxed font-medium" style={{ color: 'var(--text-main)' }}>
              "{activeQuote.quote}"
            </p>
          </motion.div>
        </div>

        {/* Right Status Badge Column */}
        <div className="relative z-10 shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-2xs backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color: '#10B981'
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black tracking-wider uppercase">Portal Active</span>
          </div>

          <button
            type="button"
            onClick={startCinematicSplash}
            className="text-[11px] font-semibold flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            title="Tampilkan Animasi Layar Penuh"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Putar Animasi Layar Penuh</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}
