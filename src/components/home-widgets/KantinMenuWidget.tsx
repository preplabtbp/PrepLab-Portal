import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Clock, CheckCircle2 } from 'lucide-react';
import { WidgetSize } from './types';

interface KantinMenuWidgetProps {
  size: WidgetSize;
}

interface MealSchedule {
  name: string;
  time: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  icon: string;
}

const SCHEDULE: MealSchedule[] = [
  { name: 'Sarapan Pagi', time: '05:30 - 07:30 WIT', startHour: 5.5, startMin: 30, endHour: 7.5, endMin: 30, icon: '🍳' },
  { name: 'Makan Siang', time: '11:30 - 13:30 WIT', startHour: 11.5, startMin: 30, endHour: 13.5, endMin: 30, icon: '🍛' },
  { name: 'Makan Malam', time: '17:30 - 19:30 WIT', startHour: 17.5, startMin: 30, endHour: 19.5, endMin: 30, icon: '🍲' },
  { name: 'Supper Malam', time: '23:30 - 01:00 WIT', startHour: 23.5, startMin: 30, endHour: 25.0, endMin: 0, icon: '☕' },
];

export const KantinMenuWidget: React.FC<KantinMenuWidgetProps> = ({ size }) => {
  const [currentWitHour, setCurrentWitHour] = useState<number>(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const wit = new Date(utc + 3600000 * 9);
    return wit.getHours() + wit.getMinutes() / 60;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wit = new Date(utc + 3600000 * 9);
      setCurrentWitHour(wit.getHours() + wit.getMinutes() / 60);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getActiveMeal = () => {
    for (const meal of SCHEDULE) {
      if (meal.endHour > 24) {
        if (currentWitHour >= meal.startHour || currentWitHour < (meal.endHour - 24)) {
          return meal.name;
        }
      } else {
        if (currentWitHour >= meal.startHour && currentWitHour <= meal.endHour) {
          return meal.name;
        }
      }
    }
    return null;
  };

  const activeMeal = getActiveMeal();

  return (
    <div className="relative h-full flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--border-main)]/60">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <UtensilsCrossed className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[var(--text-main)]">
            Jadwal Kantin &amp; Mess
          </span>
        </div>
        {activeMeal ? (
          <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 animate-pulse">
            ● Buka Sekarang
          </span>
        ) : (
          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)]">
            Tutup
          </span>
        )}
      </div>

      {/* Schedule List */}
      <div className="flex-1 flex flex-col justify-around gap-1.5 py-1">
        {SCHEDULE.map((item) => {
          const isCurrent = activeMeal === item.name;
          return (
            <div
              key={item.name}
              className={`flex items-center justify-between p-1.5 rounded-xl border text-[11px] transition-all ${
                isCurrent
                  ? 'bg-emerald-500/10 border-emerald-500/30 font-bold text-emerald-800 dark:text-emerald-200 shadow-2xs'
                  : 'bg-white dark:bg-slate-800/40 border-[var(--border-main)]/40 text-[var(--text-muted)]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{item.icon}</span>
                <span className={isCurrent ? 'text-[var(--text-main)]' : ''}>{item.name}</span>
              </div>
              <span className="text-[10px] font-mono">{item.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
