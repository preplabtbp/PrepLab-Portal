import React, { useState, useEffect } from 'react';
import { Megaphone, Edit3, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface LogbookDailyNotesCardProps {
  dateStr: string;
  notes: string;
  onSaveNotes: (newNotes: string) => void;
  isNotionLight?: boolean;
}

export const LogbookDailyNotesCard: React.FC<LogbookDailyNotesCardProps> = ({
  dateStr,
  notes,
  onSaveNotes,
  isNotionLight = true
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftText, setDraftText] = useState<string>(notes || '');

  useEffect(() => {
    setDraftText(notes || '');
  }, [notes]);

  const handleSave = () => {
    const trimmed = draftText.trim();
    onSaveNotes(trimmed);
    setIsEditing(false);
    toast.success('Catatan umum hari ini berhasil disimpan!');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div 
      className="mb-4 rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs"
      style={{
        backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
        borderColor: isNotionLight ? '#e2e8f0' : '#2d3748'
      }}
    >
      <div 
        className="px-4 py-2.5 border-b flex items-center justify-between"
        style={{
          backgroundColor: isNotionLight ? '#f8fafc' : '#252526',
          borderColor: isNotionLight ? '#e2e8f0' : '#2d3748'
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Megaphone className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-xs" style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}>
              Catatan Umum & Kejadian Khusus Hari Ini
            </h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700/60 font-semibold" style={{ color: isNotionLight ? '#334155' : '#cbd5e1' }}>
            {dateStr}
          </span>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="h-6 px-2.5 rounded-md text-[11px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            style={{ color: isNotionLight ? '#475569' : '#cbd5e1' }}
          >
            {notes ? (
              <>
                <Edit3 className="w-3 h-3" />
                <span>Edit Catatan</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>+ Tambah Catatan</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="h-6 px-2.5 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            >
              <Check className="w-3 h-3" />
              <span>Simpan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftText(notes || '');
                setIsEditing(false);
              }}
              className="h-6 px-2 rounded-md text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="p-3.5 text-xs">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Tuliskan kejadian penting hari ini (misal: 10.15 - 12.00: Pemadaman listrik PLN operasional dialihkan ke genset, 14.00: Audit mendadak dari HO, kendala cuaca hujan lebat, dll.). Tekan Ctrl+Enter untuk simpan."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/50 leading-relaxed font-sans resize-y"
              style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
              autoFocus
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>* Catatan ini otomatis masuk ke bagian atas Changelog Kemarin besok pagi.</span>
              <span className="font-mono text-[10px]">Ctrl+Enter untuk simpan</span>
            </div>
          </div>
        ) : notes && notes.trim() ? (
          <div 
            onClick={() => setIsEditing(true)}
            className="p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-200 cursor-pointer hover:border-amber-300 transition-colors"
          >
            {notes}
          </div>
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 cursor-pointer transition-colors text-center"
          >
            Belum ada catatan khusus hari ini. Klik untuk menambahkan (misal: pemadaman listrik, audit mendadak, kendala utilitas).
          </div>
        )}
      </div>
    </div>
  );
};
