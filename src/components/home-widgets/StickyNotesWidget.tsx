import React, { useState, useEffect } from 'react';
import { StickyNote, Palette, Trash2, Check } from 'lucide-react';
import { StickyNotesSettings, WidgetSize } from './types';

interface StickyNotesWidgetProps {
  size: WidgetSize;
  settings?: StickyNotesSettings;
  onUpdateSettings?: (settings: StickyNotesSettings) => void;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  amber: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/40',
    text: 'text-amber-900 dark:text-amber-100',
    dot: 'bg-amber-400'
  },
  emerald: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    text: 'text-emerald-900 dark:text-emerald-100',
    dot: 'bg-emerald-400'
  },
  blue: {
    bg: 'bg-sky-50/70 dark:bg-sky-950/20',
    border: 'border-sky-200 dark:border-sky-800/40',
    text: 'text-sky-900 dark:text-sky-100',
    dot: 'bg-sky-400'
  },
  purple: {
    bg: 'bg-purple-50/70 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800/40',
    text: 'text-purple-900 dark:text-purple-100',
    dot: 'bg-purple-400'
  },
  rose: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/20',
    border: 'border-rose-200 dark:border-rose-800/40',
    text: 'text-rose-900 dark:text-rose-100',
    dot: 'bg-rose-400'
  }
};

export const StickyNotesWidget: React.FC<StickyNotesWidgetProps> = ({
  size,
  settings = { color: 'amber' },
  onUpdateSettings
}) => {
  const [content, setContent] = useState<string>(() => {
    try {
      return localStorage.getItem('preplab_home_sticky_note') || '📌 Catatan Pribadi:\n- Cek ketersediaan reagen lab\n- Konfirmasi handover shift';
    } catch {
      return '';
    }
  });

  const [savedStatus, setSavedStatus] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  const currentColor = settings.color || 'amber';
  const theme = COLOR_MAP[currentColor] || COLOR_MAP.amber;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    try {
      localStorage.setItem('preplab_home_sticky_note', val);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 1500);
    } catch {}
  };

  const handleSelectColor = (col: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose') => {
    onUpdateSettings?.({ color: col });
    setShowColorPicker(false);
  };

  return (
    <div className={`relative h-full flex flex-col justify-between p-1 rounded-2xl transition-colors`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--border-main)]/60">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <StickyNote className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[var(--text-main)]">
            Sticky Note Pribadi
          </span>
          {savedStatus && (
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 animate-in fade-in">
              <Check className="w-2.5 h-2.5" />
              <span>Tersimpan</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Ganti Warna Sticky Note"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Color Picker Dropdown */}
      {showColorPicker && (
        <div className="mb-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-[var(--border-main)] shadow-sm flex items-center gap-1.5 justify-around animate-in fade-in duration-100">
          {(['amber', 'emerald', 'blue', 'purple', 'rose'] as const).map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => handleSelectColor(col)}
              className={`w-5 h-5 rounded-full ${COLOR_MAP[col].dot} ${
                currentColor === col ? 'ring-2 ring-offset-2 ring-slate-400' : ''
              } transition-transform hover:scale-110`}
            />
          ))}
        </div>
      )}

      {/* Textarea Pad */}
      <div className={`flex-1 rounded-xl p-2.5 border ${theme.bg} ${theme.border} flex flex-col`}>
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Tulis catatan cepat, memo to-do, atau pengingat di sini..."
          className={`w-full flex-1 bg-transparent text-xs leading-relaxed resize-none focus:outline-hidden ${theme.text} placeholder:text-slate-400`}
          rows={size === '2x' ? 4 : 3}
        />
        <div className="text-[9.5px] text-right text-slate-400 dark:text-slate-500 pt-1">
          Otomatis tersimpan lokal
        </div>
      </div>
    </div>
  );
};
