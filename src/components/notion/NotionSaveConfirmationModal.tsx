import React from 'react';
import { 
  AlertCircle, 
  Check, 
  X, 
  Save, 
  Loader2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui';

interface NotionSaveConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  onClose: () => void;
  dirtyRowCount: number;
  isSaving: boolean;
  tableName?: string;
}

export const NotionSaveConfirmationModal: React.FC<NotionSaveConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onDiscard,
  onClose,
  dirtyRowCount,
  isSaving,
  tableName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div 
        className="w-full max-w-md rounded-2xl border shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--card-bg, #1e1e1e)',
          borderColor: 'var(--border-main, #334155)',
          color: 'var(--text-main, #f8fafc)'
        }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-teal-500/15 border border-teal-500/40 text-teal-400 shrink-0">
            <Save className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-100">
              Apakah Anda ingin menyimpan perubahan?
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Terdapat <span className="font-semibold text-teal-400 font-mono">{dirtyRowCount} baris data</span> pada tabel {tableName ? `"${tableName}"` : 'ini'} yang telah diubah secara langsung.
            </p>
            <div className="mt-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-teal-300 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Penyimpanan Otomatis ke Dokumen Buletin</span>
              </div>
              <p className="text-[10.5px] text-slate-400">
                Perubahan pada status kegiatan, rincian keterangan, dan progress checklist tasklist akan langsung diperbarui ke database.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            disabled={isSaving}
            onClick={onDiscard}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 transition-all cursor-pointer"
          >
            Buang Perubahan
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
          >
            Nanti Dulu
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Ya, Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
