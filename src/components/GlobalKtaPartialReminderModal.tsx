import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Camera, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert 
} from 'lucide-react';
import { getKtaObligation } from './GroupReportScreen';

interface GlobalKtaPartialReminderModalProps {
  inspectorNik?: string;
  inspectorName?: string;
  inspectorJabatan?: string;
  inspectorSection?: string;
  onOpenKtaUpload?: () => void;
}

function getCurrentISOWeekTag(d: Date = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `W${weekNum}`;
}

export function GlobalKtaPartialReminderModal({
  inspectorNik,
  inspectorName,
  inspectorJabatan,
  inspectorSection,
  onOpenKtaUpload
}: GlobalKtaPartialReminderModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<string>('W37');
  const [details, setDetails] = useState<{
    obligationLabel: string;
    doneLabel: string;
    missingLabel: string;
  }>({
    obligationLabel: '2 TTA',
    doneLabel: 'TTA 1',
    missingLabel: 'TTA 2'
  });

  useEffect(() => {
    if (!inspectorNik) return;

    const activeWeek = getCurrentISOWeekTag(new Date());
    setCurrentWeek(activeWeek);

    const obligation = getKtaObligation(inspectorNik, inspectorJabatan, inspectorSection);
    // Pengecualian mutlak: Manager dan Superintendent hanya diwajibkan 1x KTA/TTA
    if (obligation.type === '1_KTA_OR_TTA') {
      setIsOpen(false);
      return;
    }

    let isMounted = true;

    const checkKtaProgress = async () => {
      try {
        const res = await fetch(`/api/rekap-kta?week=${activeWeek}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !Array.isArray(data.rekapList)) return;

        const cleanNik = inspectorNik.trim().toLowerCase();
        const cleanName = (inspectorName || '').trim().toLowerCase();
        const userRec = data.rekapList.find(
          (r: any) =>
            (r.nik && r.nik.trim().toLowerCase() === cleanNik) ||
            (r.name && r.name.trim().toLowerCase() === cleanName)
        );

        if (!userRec) return;

        const check1 = userRec.checkDetails?.check1Done;
        const check2 = userRec.checkDetails?.check2Done;
        const isDone = userRec.status === 'SUDAH' || (check1 && check2);
        const isPartial = !isDone && (check1 || check2 || userRec.checkDetails?.summaryProgress === '1/2');

        if (isPartial) {
          const check1Name = userRec.checkDetails?.check1Label || (obligation.type === '2_TTA' ? 'TTA 1' : 'KTA');
          const check2Name = userRec.checkDetails?.check2Label || (obligation.type === '2_TTA' ? 'TTA 2' : 'TTA');
          
          const done = check1 ? check1Name : check2Name;
          const missing = !check1 ? check1Name : check2Name;

          setDetails({
            obligationLabel: obligation.label,
            doneLabel: done,
            missingLabel: missing
          });
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      } catch (err) {
        console.error('Error checking KTA partial status:', err);
      }
    };

    checkKtaProgress();

    return () => {
      isMounted = false;
    };
  }, [inspectorNik, inspectorName, inspectorJabatan, inspectorSection]);

  if (!isOpen) return null;

  const handleOpenUpload = () => {
    setIsOpen(false);
    if (onOpenKtaUpload) {
      onOpenKtaUpload();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl shadow-2xl overflow-hidden relative text-[var(--text-main)]"
        >
          {/* Top decorative gradient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-amber-500/20 to-transparent blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="relative p-5 pb-4 flex items-start justify-between border-b border-[var(--border-main)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Kepatuhan Hazard Safety
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] mt-1 tracking-tight">
                  Pengingat Laporan KTA / TTA
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
              Halo <strong className="text-[var(--text-main)]">{inspectorName}</strong>, Anda memiliki kewajiban pelaporan keselamatan kerja mingguan ({currentWeek}):
            </p>

            {/* Obligation Card Highlight */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--input-bg)] to-amber-500/5 border border-amber-500/30 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white shadow-xs">
                  🎯 Target: {details.obligationLabel}
                </span>
                <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                  ⚠️ Status 1/2 Terpenuhi
                </span>
              </div>

              <h4 className="text-sm font-bold text-[var(--text-main)] leading-snug">
                Anda baru mengunggah 1x laporan ({details.doneLabel}).
              </h4>

              <div className="pt-2 border-t border-[var(--border-main)] flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{details.doneLabel}: ✓ Ada</span>
                </span>
                <span className="flex items-center gap-1 font-bold text-rose-500 dark:text-rose-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{details.missingLabel}: Belum</span>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Mohon segera melengkapi <strong>1 bukti laporan lagi ({details.missingLabel})</strong> sebelum batas waktu minggu ini berakhir agar target kepatuhan Anda 100% lengkap.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleOpenUpload}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Upload Laporan ke-2 ({details.missingLabel})</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Mengerti / Nanti Saja</span>
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
