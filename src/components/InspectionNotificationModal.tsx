import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Users
} from 'lucide-react';
import { Button } from './ui';

interface InspectionNotificationModalProps {
  inspectorNik?: string;
  inspectorName?: string;
  onNavigateToInspection?: (formId?: string, subArea?: string) => void;
}

function getISOWeekString(d: Date = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `W${weekNum}-${date.getFullYear()}`;
}

export function InspectionNotificationModal({ inspectorNik, inspectorName, onNavigateToInspection }: InspectionNotificationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [schedule, setSchedule] = useState<any | null>(null);

  useEffect(() => {
    if (!inspectorNik && !inspectorName) return;

    const checkSchedule = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (inspectorNik) queryParams.set('nik', inspectorNik);
        if (inspectorName) queryParams.set('name', inspectorName);

        const res = await fetch(`/api/inspection-schedule?${queryParams.toString()}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.found && data.schedule && !data.schedule.isCuti) {
          const item = data.schedule;
          const weekStr = getISOWeekString();
          const storageKey = `insp_sched_ack_${weekStr}_${item.name}_${item.inspeksi}`;
          const isAcknowledged = localStorage.getItem(storageKey);

          if (!isAcknowledged) {
            setSchedule(item);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Error checking inspection assignment:', err);
      }
    };

    // Open smoothly after page initialization (delay 1.8s so it doesn't clash with greeting)
    const timer = setTimeout(checkSchedule, 1800);
    return () => clearTimeout(timer);
  }, [inspectorNik, inspectorName]);

  const handleAcknowledge = (shouldNavigate = false) => {
    if (schedule) {
      const weekStr = getISOWeekString();
      const storageKey = `insp_sched_ack_${weekStr}_${schedule.name}_${schedule.inspeksi}`;
      localStorage.setItem(storageKey, new Date().toISOString());
    }
    setIsOpen(false);

    if (shouldNavigate && onNavigateToInspection) {
      const formId = schedule?.formInfo?.formId || '';
      const subArea = schedule?.formInfo?.subArea || '';
      onNavigateToInspection(formId, subArea);
    }
  };

  if (!schedule || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl shadow-2xl overflow-hidden relative text-[var(--text-main)]"
        >
          {/* Top decorative gradient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-gradient-to-b from-emerald-500/20 to-transparent blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="relative p-5 pb-4 flex items-start justify-between border-b border-[var(--border-main)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
                <ClipboardCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Jadwal Inspeksi Mingguan
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] mt-1 tracking-tight">
                  Penugasan Inspeksi Anda
                </h3>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--input-bg)] transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 space-y-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Halo <strong className="text-[var(--text-main)]">{schedule.name}</strong>, Anda telah dijadwalkan oleh admin untuk melaksanakan inspeksi keselamatan & fasilitas berikut untuk periode minggu ini:
            </p>

            {/* Inspection Card Highlight */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--input-bg)] to-emerald-500/5 border border-emerald-500/30 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                  {schedule.shift}
                </span>
                <span className="text-[11px] font-bold text-[var(--text-muted)]">
                  Peran: Inspektor {schedule.roleIndex} {schedule.roleIndex === 1 ? '(Utama)' : '(Pendamping)'}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-black text-[var(--text-main)] leading-snug">
                {schedule.inspeksi}
              </h4>

              <div className="pt-1.5 border-t border-[var(--border-main)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Jabatan: {schedule.jabatan}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Terdaftar di Sheet
                </span>
              </div>

              {schedule.partners && schedule.partners.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-main)] flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 rounded-lg text-[10px]">
                    <Users className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    {schedule.partners.length === 1 ? 'Pasangan Tugas:' : 'Rekan Tim:'}
                  </span>
                  {schedule.partners.map((p: any, idx: number) => (
                    <span key={idx} className="text-[var(--text-main)] font-semibold text-xs">
                      {p.name} <span className="text-[10px] text-[var(--text-muted)] font-normal">({p.roleIndex === 1 ? 'Inspektor 1 - Utama' : `Inspektor ${p.roleIndex} - Pendamping`} • {p.jabatan})</span>{idx < schedule.partners.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Mohon pastikan pemeriksaan lapangan telah dilakukan dan formulir diisi lengkap beserta dokumentasi foto proses & temuan.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={() => handleAcknowledge(true)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <span>Buka & Isi Formulir Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <button
                onClick={() => handleAcknowledge(false)}
                className="w-full py-2.5 text-xs text-[var(--text-muted)] font-bold hover:text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Saya Mengerti (Tutup Pengingat)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
