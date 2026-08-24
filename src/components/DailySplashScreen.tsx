import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Shield, RefreshCw, Sun, Moon, Sunset, Quote, Zap, X, FastForward } from 'lucide-react';
import { SKENA_QUOTES, SkenaQuote } from '../utils/skena-quotes';
import { AnimatedSunCondition } from './DailyGreetingHero';

interface DailySplashScreenProps {
  userName?: string;
  userNik?: string;
  userJabatan?: string;
  userSection?: string;
  onClose?: () => void;
  forceShow?: boolean;
}

export function DailySplashScreen({
  userName,
  userNik,
  userJabatan,
  userSection,
  onClose,
  forceShow = false
}: DailySplashScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Total Duration: 10 Detik
  const TOTAL_DURATION_MS = 10000;

  // Determine current time of day & greeting
  const greetingInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      return {
        type: 'morning' as const,
        greeting: 'Selamat Pagi',
        sub: 'Awali shift dengan energi positif & semangat tinggi!',
        icon: Sun,
        gradient: 'from-amber-400 to-orange-500',
        badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-500/30'
      };
    } else if (hour >= 11 && hour < 15) {
      return {
        type: 'noon' as const,
        greeting: 'Selamat Siang',
        sub: 'Tetap jaga fokus, hidrasi, dan keselamatan kerja!',
        icon: Sun,
        gradient: 'from-blue-400 to-teal-400',
        badgeColor: 'text-teal-300 bg-teal-500/20 border-teal-500/30'
      };
    } else if (hour >= 15 && hour < 18) {
      return {
        type: 'evening' as const,
        greeting: 'Selamat Sore',
        sub: 'Tuntaskan tugas harian dengan rapi & aman!',
        icon: Sunset,
        gradient: 'from-orange-400 to-rose-500',
        badgeColor: 'text-orange-300 bg-orange-500/20 border-orange-500/30'
      };
    } else {
      return {
        type: 'night' as const,
        greeting: 'Selamat Malam',
        sub: 'Patuhi SOP, waspada selalu, dan utamakan keselamatan!',
        icon: Moon,
        gradient: 'from-indigo-400 to-purple-500',
        badgeColor: 'text-purple-300 bg-purple-500/20 border-purple-500/30'
      };
    }
  }, []);

  // Resolve user display name
  const displayName = useMemo(() => {
    if (userName && userName !== 'Guest' && userName !== 'Inspector') return userName;
    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.nama || p.name) return p.nama || p.name;
      }
      const savedName = localStorage.getItem('p2h_inspector_name');
      if (savedName) return savedName;
    } catch (e) {}
    return 'Rekan Kerja PrepLab';
  }, [userName]);

  // Resolve user detail (Jabatan / Section)
  const userSubtitle = useMemo(() => {
    if (userJabatan || userSection) {
      return [userJabatan, userSection].filter(Boolean).join(' • ');
    }
    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        return [p.jabatan, p.section || p.pt].filter(Boolean).join(' • ');
      }
    } catch (e) {}
    return 'Preparation & Laboratory Team';
  }, [userJabatan, userSection]);

  // Pick deterministic daily quote based on date hash
  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    setQuoteIndex(dayOfYear % SKENA_QUOTES.length);
  }, []);

  // Daily check logic: Show once per day unless forceShow
  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nikKey = userNik || localStorage.getItem('p2h_inspector_nik') || 'general';
    const storageKey = `preplab_daily_splash_${nikKey}`;
    const lastShown = localStorage.getItem(storageKey);

    if (lastShown !== todayStr) {
      setIsVisible(true);
      localStorage.setItem(storageKey, todayStr);
    }
  }, [forceShow, userNik]);

  // Global trigger listener
  useEffect(() => {
    const handleReplay = () => {
      setProgress(0);
      setIsVisible(true);
    };
    window.addEventListener('preplab:show_daily_splash', handleReplay);
    return () => window.removeEventListener('preplab:show_daily_splash', handleReplay);
  }, []);

  // Keyboard shortcut: Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  // Auto-progress countdown timer (Smooth 10 Seconds)
  useEffect(() => {
    if (!isVisible || isPaused) return;

    const interval = 50; // ms
    const step = (interval / TOTAL_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          handleDismiss();
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible, isPaused, TOTAL_DURATION_MS]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleNextQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuoteIndex(prev => (prev + 1) % SKENA_QUOTES.length);
    setProgress(0); // Reset timer on interaction
  };

  const currentQuote: SkenaQuote = SKENA_QUOTES[quoteIndex] || SKENA_QUOTES[0];
  const GreetingIcon = greetingInfo.icon;
  const secondsLeft = Math.max(0, Math.ceil(((100 - progress) / 100) * (TOTAL_DURATION_MS / 1000)));

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
          style={{
            backgroundColor: 'rgba(7, 11, 20, 0.95)',
            backdropFilter: 'blur(28px)'
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* TOMBOL SKIP DI POJOK KANAN ATAS VIEWPORT */}
          <motion.button
            initial={{ opacity: 0, y: -15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDismiss}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[350] px-4 py-2 rounded-full bg-white/12 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-xl flex items-center gap-2 transition-all shadow-2xl cursor-pointer group"
            title="Lewati Animasi Pembuka (Esc)"
          >
            <span className="text-white/90 group-hover:text-white tracking-wide">Lewati</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-300 border border-teal-500/40 font-black">
              {secondsLeft}s
            </span>
            <X className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
          </motion.button>

          {/* Animated Ambient Background Glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.25, 0.45, 0.25],
                x: [0, 60, 0],
                y: [0, -40, 0]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-40 -left-40 w-[450px] h-[450px] rounded-full blur-[120px]"
              style={{ backgroundColor: 'var(--primary, #0D9488)' }}
            />
            <motion.div
              animate={{
                scale: [1.25, 1, 1.25],
                opacity: [0.2, 0.4, 0.2],
                x: [0, -50, 0],
                y: [0, 50, 0]
              }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="absolute -bottom-40 -right-40 w-[450px] h-[450px] rounded-full blur-[120px]"
              style={{ backgroundColor: 'var(--accent, #EAB308)' }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)]" />
          </div>

          {/* Main Card Container */}
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -20, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 flex flex-col justify-between gap-6 overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(28px)',
              boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.25)'
            }}
          >
            {/* Top Bar: Date & Portal Badge */}
            <div className="flex items-center justify-between">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="flex items-center gap-2.5"
              >
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md font-black text-white text-xs border border-white/20"
                  style={{ backgroundColor: 'var(--primary, #0D9488)' }}
                >
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-white/90 font-mono">
                    PREPLAB PORTAL
                  </h4>
                  <p className="text-[10px] text-white/50">{todayFormatted}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 backdrop-blur-md ${greetingInfo.badgeColor}`}
              >
                <GreetingIcon className="w-3.5 h-3.5" />
                <span>{greetingInfo.greeting}</span>
              </motion.div>
            </div>

            {/* Middle Section: Personalized Salutation & Smooth Animated Sun Condition */}
            <div className="space-y-2.5 text-center sm:text-left">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="text-xs font-semibold uppercase tracking-wider text-white/60"
              >
                {greetingInfo.sub}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="flex items-center justify-center sm:justify-start flex-wrap gap-2"
              >
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight flex items-center gap-1.5">
                  <span>Halo,{' '}</span>
                  <span 
                    className="bg-clip-text text-transparent bg-gradient-to-r from-teal-300 via-emerald-200 to-amber-300 drop-shadow-sm"
                  >
                    {displayName}
                  </span>
                  <span>!</span>
                </h1>
                <AnimatedSunCondition type={greetingInfo.type} size="lg" />
              </motion.div>

              {userSubtitle && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="text-xs text-white/50 font-medium"
                >
                  {userSubtitle}
                </motion.p>
              )}
            </div>

            {/* Motivational Skena Quote Card */}
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative p-5 rounded-2xl border space-y-3 shadow-inner"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Quote className="w-4 h-4 text-amber-400 opacity-90" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    {currentQuote.tag || 'Daily Motivation'}
                  </span>
                </div>
                {currentQuote.vibe && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-medium border border-white/10">
                    {currentQuote.vibe}
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base font-medium text-white/95 leading-relaxed italic">
                "{currentQuote.quote}"
              </p>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleNextQuote}
                  className="text-[10px] text-white/50 hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1 rounded-md hover:bg-white/10 cursor-pointer"
                  title="Ganti quote penyemangat lainnya"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Quotes Lainnya</span>
                </button>
              </div>
            </motion.div>

            {/* Safety & Ready Reminder */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-200 text-xs font-semibold"
            >
              <Shield className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="leading-tight">
                Pastikan APD lengkap, cek P2H, dan utamakan keselamatan kerja hari ini.
              </span>
            </motion.div>

            {/* Footer Action & 10s Progress Bar */}
            <div className="space-y-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDismiss}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer group text-sm relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--primary, #0D9488)',
                  boxShadow: '0 10px 30px -5px rgba(13, 148, 136, 0.5)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Zap className="w-4 h-4 fill-current text-amber-300" />
                <span>Mulai Aktivitas Hari Ini</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {/* Progress Countdown Bar (10 Seconds) */}
              <div className="flex items-center justify-between text-[11px] text-white/50 font-mono px-1">
                <span>Otomatis masuk dalam <strong>{secondsLeft}s</strong>...</span>
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-75 ease-linear"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: 'var(--accent, #EAB308)',
                      boxShadow: '0 0 8px rgba(234, 179, 8, 0.5)'
                    }}
                  />
                </div>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
