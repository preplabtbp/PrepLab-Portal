import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { Button } from './ui';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  userName?: string | null;
  userNik?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({
  isOpen,
  userName,
  userNik,
  onCancel,
  onConfirm
}: LogoutConfirmModalProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[var(--card-bg,white)] border border-[var(--border-main,#e2e8f0)] rounded-3xl shadow-2xl overflow-hidden relative text-[var(--text-main,#0f172a)]"
        >
          {/* Top glowing ambient accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-rose-500/20 via-rose-500/5 to-transparent blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-muted,#64748b)] hover:text-[var(--text-main,#0f172a)] hover:bg-[var(--input-bg,#f1f5f9)] transition-colors cursor-pointer z-10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header & Icon */}
          <div className="p-6 pt-7 text-center relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/30 ring-4 ring-rose-500/10">
              <LogOut className="w-8 h-8 translate-x-0.5" />
            </div>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Konfirmasi Keluar Sesi
            </span>

            <h3 className="text-lg sm:text-xl font-black text-[var(--text-main,#0f172a)] tracking-tight">
              Akhiri Sesi Kerja?
            </h3>

            <p className="text-xs sm:text-sm text-[var(--text-muted,#64748b)] mt-2 leading-relaxed px-2">
              Apakah Anda yakin ingin keluar dari sesi akun{' '}
              <span className="font-bold text-[var(--text-main,#0f172a)]">
                {userName || 'Karyawan'}
              </span>
              {userNik ? ` (${userNik})` : ''}?
            </p>

            {/* Info notice box */}
            <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                Seluruh data inspeksi dan laporan yang telah disubmit tersimpan aman di server. Anda perlu memasukkan NIK kembali untuk login berikutnya.
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-5 pt-2 pb-6 bg-[var(--input-bg,#f8fafc)]/50 border-t border-[var(--border-main,#e2e8f0)] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto h-11 px-5 rounded-2xl font-bold text-xs cursor-pointer border-[var(--border-main,#cbd5e1)] text-[var(--text-main,#334155)] hover:bg-[var(--card-bg,white)] transition-all"
            >
              Batal
            </Button>

            <Button
              type="button"
              onClick={onConfirm}
              className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Ya, Akhiri Sesi</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
