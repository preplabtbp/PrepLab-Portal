import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Palette, 
  RotateCcw, 
  X 
} from 'lucide-react';
import { NOTION_COLORS, stripColorTags } from './tasklist-utils';

export type FormatAction = 
  | 'bold' 
  | 'italic' 
  | 'strike' 
  | 'code' 
  | 'clear' 
  | { color: string };

/**
 * Pure function to format a substring within a text string based on start and end offsets.
 */
export function formatSelectedText(
  fullText: string,
  start: number,
  end: number,
  action: FormatAction
): { newText: string; newStart: number; newEnd: number } {
  const before = fullText.substring(0, start);
  const selected = fullText.substring(start, end);
  const after = fullText.substring(end);

  if (!selected) {
    return { newText: fullText, newStart: start, newEnd: end };
  }

  let formatted = selected;

  if (action === 'bold') {
    if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
      formatted = selected.slice(2, -2);
    } else {
      formatted = `**${selected}**`;
    }
  } else if (action === 'italic') {
    if (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**') && selected.length >= 2) {
      formatted = selected.slice(1, -1);
    } else {
      formatted = `*${selected}*`;
    }
  } else if (action === 'strike') {
    if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length >= 4) {
      formatted = selected.slice(2, -2);
    } else {
      formatted = `~~${selected}~~`;
    }
  } else if (action === 'code') {
    if (selected.startsWith('`') && selected.endsWith('`') && selected.length >= 2) {
      formatted = selected.slice(1, -1);
    } else {
      formatted = `\`${selected}\``;
    }
  } else if (action === 'clear') {
    formatted = selected
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`(.*?)`/g, '$1');
    formatted = stripColorTags(formatted);
  } else if (typeof action === 'object' && 'color' in action) {
    const cKey = action.color;
    const cleanSelected = stripColorTags(selected);
    if (!cKey || cKey === 'default') {
      formatted = cleanSelected;
    } else {
      formatted = `[${cKey}]${cleanSelected}[/${cKey}]`;
    }
  }

  const newText = before + formatted + after;
  const newEnd = start + formatted.length;
  return { newText, newStart: start, newEnd };
}

export interface FloatingSelectionToolbarProps {
  onFormat: (action: FormatAction) => void;
  onClose: () => void;
  className?: string;
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  onFormat,
  onClose,
  className = ''
}) => {
  const [showColorPalette, setShowColorPalette] = useState(false);

  return (
    <div 
      className={`absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1 bg-slate-900/95 dark:bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none ${className}`}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Bold */}
      <button
        type="button"
        onClick={() => onFormat('bold')}
        title="Tebal (Bold: **teks**)"
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
      >
        <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={() => onFormat('italic')}
        title="Miring (Italic: *teks*)"
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
      >
        <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        onClick={() => onFormat('strike')}
        title="Coret (Strikethrough: ~~teks~~)"
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
      >
        <Strikethrough className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Inline Code */}
      <button
        type="button"
        onClick={() => onFormat('code')}
        title="Kode (Inline Code: `teks`)"
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
      >
        <Code className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Separator */}
      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

      {/* Quick Color Swatches directly on bar (including Black) */}
      <div className="flex items-center gap-1 px-0.5">
        {[
          { key: 'default', label: 'Hitam', hex: '#37352f', border: '#475569' },
          { key: 'red', label: 'Merah', hex: '#e11d48', border: '#f43f5e' },
          { key: 'amber', label: 'Kuning', hex: '#d97706', border: '#f59e0b' },
          { key: 'green', label: 'Hijau', hex: '#16a34a', border: '#22c55e' },
          { key: 'blue', label: 'Biru', hex: '#2563eb', border: '#3b82f6' },
          { key: 'purple', label: 'Ungu', hex: '#9333ea', border: '#a855f7' }
        ].map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onFormat({ color: c.key })}
            title={`Beri Warna ${c.label}`}
            className="w-4 h-4 rounded-full border hover:scale-125 transition-transform cursor-pointer shadow-xs"
            style={{ backgroundColor: c.hex, borderColor: c.border }}
          />
        ))}
      </div>

      {/* Color Palette Button & Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowColorPalette(!showColorPalette)}
          title="Semua Pilihan Warna"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
            showColorPalette ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-200 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="text-[10px] font-bold">Lainnya</span>
        </button>

        {/* Color Swatches Popover */}
        {showColorPalette && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl flex items-center gap-1.5 z-60 animate-in fade-in zoom-in-95 duration-100"
          >
            {Object.entries(NOTION_COLORS).map(([cKey, cVal]) => (
              <button
                key={cKey}
                type="button"
                onClick={() => {
                  onFormat({ color: cKey });
                  setShowColorPalette(false);
                }}
                title={cVal.label}
                className="w-5 h-5 rounded-full border border-slate-600 hover:scale-125 transition-transform cursor-pointer relative shadow-xs"
                style={{ backgroundColor: cVal.hex }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

      {/* Clear Formatting */}
      <button
        type="button"
        onClick={() => onFormat('clear')}
        title="Hapus Format / Warna Teks"
        className="p-1.5 rounded-lg hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Close Floating Toolbar */}
      <button
        type="button"
        onClick={onClose}
        title="Tutup Toolbar"
        className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer ml-0.5"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Downward triangle arrow notch */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45" />
    </div>
  );
};
