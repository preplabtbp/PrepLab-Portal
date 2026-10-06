import React from 'react';
import { Flame, Trophy, Award, Zap } from 'lucide-react';
import { WidgetSize } from './types';

interface GamificationStreakWidgetProps {
  size: WidgetSize;
}

export const GamificationStreakWidget: React.FC<GamificationStreakWidgetProps> = ({ size }) => {
  // Read streak data or fallback
  const streakDays = 7;
  const currentExp = 380;
  const maxExp = 500;
  const progressPercent = Math.round((currentExp / maxExp) * 100);

  return (
    <div className="relative h-full flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--border-main)]/60">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[var(--text-main)]">
            Streak & Keaktifan
          </span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20">
          Rank: Senior Analis
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-display font-black text-lg shadow-sm shadow-orange-500/20">
              🔥
            </div>
            <div>
              <div className="text-base font-black text-[var(--text-main)] font-display leading-tight">
                {streakDays} Hari Aktif
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                On-site portal streak
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-orange-600 dark:text-orange-400">
              {currentExp} / {maxExp} XP
            </div>
            <div className="text-[9.5px] text-[var(--text-muted)]">
              Level 4
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden border border-[var(--border-main)]/40">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-1">
            <span>+{maxExp - currentExp} XP ke Rank Master</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
