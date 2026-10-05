import React, { useState, useEffect } from 'react';
import { SunMedium, Droplets, Wind, Plus, Check, GlassWater } from 'lucide-react';
import { WidgetSize } from './types';

interface WeatherSiteWidgetProps {
  size: WidgetSize;
}

export const WeatherSiteWidget: React.FC<WeatherSiteWidgetProps> = ({ size }) => {
  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`preplab_water_intake_${todayKey}`);
      return saved ? parseInt(saved, 10) : 3;
    } catch {
      return 3;
    }
  });

  const handleAddWater = () => {
    const next = Math.min(waterGlasses + 1, 8);
    setWaterGlasses(next);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`preplab_water_intake_${todayKey}`, String(next));
  };

  const handleResetWater = () => {
    setWaterGlasses(0);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`preplab_water_intake_${todayKey}`, '0');
  };

  return (
    <div className="relative h-full flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--border-main)]/60">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <SunMedium className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[var(--text-main)]">
            Cuaca Site Obi
          </span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          Tropis Lembab
        </span>
      </div>

      {/* Main Weather Display */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-[var(--text-main)] font-display">
                31°
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)]">C</span>
            </div>
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Cerah Berawan
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              Pulau Obi, Halmahera Selatan
            </div>
          </div>

          <div className="flex flex-col gap-1 text-[10px] text-[var(--text-muted)] bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-[var(--border-main)]/50">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3 h-3 text-sky-500" />
              <span>78% Lembab</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="w-3 h-3 text-teal-500" />
              <span>12 km/j Angin</span>
            </div>
          </div>
        </div>

        {/* Hydration Tracker */}
        <div className="mt-3 pt-2 border-t border-[var(--border-main)]/50">
          <div className="flex items-center justify-between text-[10.5px] mb-1.5">
            <span className="font-bold text-[var(--text-main)] flex items-center gap-1">
              <GlassWater className="w-3 h-3 text-sky-500" />
              <span>Hidrasi Harian: {waterGlasses * 250}ml / 2000ml</span>
            </span>
            <button
              type="button"
              onClick={handleAddWater}
              className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25 transition-colors flex items-center gap-0.5 cursor-pointer"
              title="Tambah 1 Gelas Air (250ml)"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>+1 Gelas</span>
            </button>
          </div>

          {/* Glasses Pips */}
          <div className="flex items-center gap-1">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                onClick={() => setWaterGlasses(i + 1)}
                className={`flex-1 h-2 rounded-full cursor-pointer transition-all ${
                  i < waterGlasses
                    ? 'bg-sky-500 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title={`Gelas ke-${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
