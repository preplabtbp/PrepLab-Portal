import React from 'react';
import { AlertTriangle, Trash2, X, Layers } from 'lucide-react';

interface NotionDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskName?: string;
  subtaskCount?: number;
  isBatch?: boolean;
  batchCount?: number;
  isSubItem?: boolean;
  isDeleting?: boolean;
  isNotionLight?: boolean;
  deleterName?: string;
  deleterJabatan?: string;
}

export const NotionDeleteConfirmationModal: React.FC<NotionDeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  taskName = 'Kegiatan',
  subtaskCount = 0,
  isBatch = false,
  batchCount = 0,
  isSubItem = false,
  isDeleting = false,
  isNotionLight = true,
  deleterName,
  deleterJabatan
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden transform transition-all select-none ${
          isNotionLight 
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-400/40' 
            : 'bg-[#1e1e1e] border-slate-700 text-slate-100 shadow-black/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-500/20 bg-rose-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {isBatch ? 'Konfirmasi Hapus Beberapa Kegiatan' : isSubItem ? 'Konfirmasi Hapus Sub-kegiatan' : 'Konfirmasi Hapus Kegiatan'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Data akan dipindahkan ke Recycle Bin (Dapat dipulihkan Developer)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-5 py-4 space-y-3.5 text-xs font-sans">
          {isBatch ? (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Jumlah Kegiatan:</span>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                {batchCount} kegiatan terpilih akan dihapus
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                {isSubItem ? 'Sub-kegiatan:' : 'Nama Kegiatan:'}
              </span>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 break-words line-clamp-3">
                "{taskName}"
              </p>
            </div>
          )}

          {/* Subtask Cascade Warning */}
          {subtaskCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <Layers className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold block">Peringatan Sub-kegiatan:</span>
                Kegiatan utama ini memiliki <strong className="text-amber-600 dark:text-amber-400 font-bold underline">{subtaskCount} sub-kegiatan</strong>. Menghapus baris ini akan otomatis memindahkan seluruh sub-kegiatan ke Recycle Bin secara bersamaan.
              </div>
            </div>
          )}

          {/* Deleter Info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1">
            <span>Dihapus oleh:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {deleterName || 'User'} {deleterJabatan ? `(${deleterJabatan})` : ''}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
