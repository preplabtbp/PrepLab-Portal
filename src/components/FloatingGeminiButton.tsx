import React, { useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface FloatingGeminiButtonProps {
  isCrewRole?: boolean;
  isBulletin?: boolean;
  isBulletinFocusMode?: boolean;
  currentPath?: string;
}

export function GeminiLogoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="gemini-main-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1BA1E3" />
          <stop offset="28%" stopColor="#545CEB" />
          <stop offset="55%" stopColor="#9B51E0" />
          <stop offset="80%" stopColor="#E040FB" />
          <stop offset="100%" stopColor="#FF6584" />
        </linearGradient>
        <linearGradient id="gemini-sub-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FFD200" />
        </linearGradient>
      </defs>
      {/* Authentic 4-pointed Google Gemini concave star */}
      <path
        d="M14 28C14 20.268 7.732 14 0 14C7.732 14 14 7.732 14 0C14 7.732 20.268 14 28 14C20.268 14 14 20.268 14 28Z"
        fill="url(#gemini-main-grad)"
      />
      {/* Accent sparkle star */}
      <path
        d="M23 7C23 5.343 21.657 4 20 4C21.657 4 23 2.657 23 1C23 2.657 24.343 4 26 4C24.343 4 23 5.343 23 7Z"
        fill="url(#gemini-sub-grad)"
      />
    </svg>
  );
}

export function FloatingGeminiButton({
  isCrewRole = false,
  isBulletin = false,
  isBulletinFocusMode = false,
  currentPath = '',
}: FloatingGeminiButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Hide on inspection form or distraction-free reader mode
  if (currentPath.startsWith('/inspect') || currentPath.startsWith('/weekly-inspection') || (isBulletin && isBulletinFocusMode)) {
    return null;
  }

  const hasMobileBottomNav = !isCrewRole && !(isBulletin && isBulletinFocusMode);

  const handleClick = () => {
    toast.info('Membuka Google Gemini AI di tab baru... ✨', {
      description: 'Gunakan akun Google Anda untuk login.',
      duration: 3000,
    });
  };

  return (
    <aside
      aria-label="Google Gemini AI Assistant"
      className={`fixed z-40 transition-all duration-300 pointer-events-auto ${
        hasMobileBottomNav 
          ? 'bottom-[8.25rem] right-3.5 sm:right-4' 
          : 'bottom-16 right-3.5 sm:right-4'
      } md:bottom-6 md:right-6`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative group">
        {/* Hover Tooltip - Desktop & Tablet */}
        {showTooltip && (
          <div className="hidden sm:flex absolute bottom-full right-0 mb-2.5 flex-col items-end pointer-events-none animate-in fade-in zoom-in-95 duration-150 z-50">
            <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-2xl border border-slate-700/80 text-right space-y-0.5 whitespace-nowrap">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-bold text-xs text-white flex items-center gap-1">
                  Google Gemini AI
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-300">
                Buka tab baru (Gunakan akun Google masing-masing)
              </p>
              <div className="text-[10px] font-mono text-purple-400 font-semibold pt-0.5 flex items-center justify-end gap-1">
                <span>gemini.google.com</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </div>
            </div>
            {/* Tooltip Arrow */}
            <div className="w-2.5 h-2.5 bg-slate-900/95 dark:bg-slate-950/95 border-r border-b border-slate-700/80 rotate-45 mr-5 -mt-1.5" />
          </div>
        )}

        {/* Floating Anchor Link Button */}
        <a
          href="https://gemini.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="group relative flex items-center gap-2.5 p-2 sm:px-4 sm:py-2.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/90 shadow-xl shadow-purple-500/10 hover:shadow-2xl hover:shadow-purple-500/25 hover:border-purple-400 dark:hover:border-purple-400 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer select-none ring-1 ring-black/5 dark:ring-white/5"
          title="Buka Google Gemini AI di tab baru (Gunakan akun masing-masing untuk login)"
        >
          {/* Subtle cosmic aura glow behind */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-xs group-hover:opacity-40 transition-opacity animate-pulse" />

          {/* Gemini Sparkle Logo */}
          <div className="relative flex items-center justify-center shrink-0">
            <GeminiLogoIcon className="w-5 h-5 sm:w-5 sm:h-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 drop-shadow-xs" />
          </div>

          {/* Text Labels: Visible on sm+ devices */}
          <div className="relative hidden sm:flex items-center gap-1.5 leading-none">
            <span className="text-xs font-black tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-300 dark:to-pink-400 bg-clip-text text-transparent">
              Gemini
            </span>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </a>
      </div>
    </aside>
  );
}

export default FloatingGeminiButton;
