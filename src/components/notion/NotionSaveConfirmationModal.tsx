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

interface NotionSaveConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  onClose: () => void;
  dirtyRowCount: number;
  isSaving: boolean;
  tableName?: string;
  isNotionLight?: boolean;
}

export const NotionSaveConfirmationModal: React.FC<NotionSaveConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onDiscard,
  onClose,
  dirtyRowCount,
  isSaving,
  tableName,
  isNotionLight = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div 
        className="w-full max-w-md rounded-2xl border shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
          borderColor: isNotionLight ? '#e2e8f0' : '#334155',
          color: isNotionLight ? '#0f172a' : '#f8fafc'
        }}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${
            isNotionLight 
              ? 'bg-teal-50 border border-teal-200 text-teal-600' 
              : 'bg-teal-500/15 border border-teal-500/40 text-teal-400'
          }`}>
            <Save className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className={`text-base font-bold leading-snug ${
              isNotionLight ? 'text-slate-900' : 'text-slate-100'
            }`}>
              Apakah Anda ingin menyimpan perubahan?
            </h3>
            <p className={`text-xs mt-1.5 leading-relaxed ${
              isNotionLight ? 'text-slate-600' : 'text-slate-300'
            }`}>
              Terdapat <span className={`font-bold font-mono ${
                isNotionLight ? 'text-teal-700' : 'text-teal-400'
              }`}>{dirtyRowCount} baris data</span> pada tabel {tableName ? `"${tableName}"` : 'ini'} yang telah diubah secara langsung.
            </p>
            
            {/* Automatic save info card */}
            <div className={`mt-3 p-3 rounded-xl border text-[11px] space-y-1 ${
              isNotionLight
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-900/70 border-slate-800 text-slate-300'
            }`}>
              <div className={`flex items-center gap-1.5 font-semibold ${
                isNotionLight ? 'text-teal-700' : 'text-teal-300'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Penyimpanan Otomatis ke Dokumen Buletin</span>
              </div>
              <p className={`text-[10.5px] leading-relaxed ${
                isNotionLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Perubahan pada status kegiatan, rincian keterangan, dan progress checklist tasklist akan langsung diperbarui ke database.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className={`flex items-center justify-end gap-2.5 mt-6 pt-4 border-t ${
          isNotionLight ? 'border-slate-100' : 'border-slate-800'
        }`}>
          <button
            type="button"
            disabled={isSaving}
            onClick={onDiscard}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isNotionLight
                ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200'
                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border-rose-900/50'
            }`}
          >
            Buang Perubahan
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isNotionLight
                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-300'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800 border-slate-700'
            }`}
          >
            Nanti Dulu
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-900/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
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
