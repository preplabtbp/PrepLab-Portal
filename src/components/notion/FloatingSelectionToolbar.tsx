import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Palette, 
  RotateCcw, 
  X,
  List
} from 'lucide-react';
import { NOTION_COLORS, stripColorTags } from './tasklist-utils';

export type FormatAction = 
  | 'bold' 
  | 'italic' 
  | 'underline'
  | 'strike' 
  | 'code' 
  | 'bullet'
  | 'clear' 
  | { color: string }
  | { highlight: string }
  | { link: string };

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
  } else if (action === 'underline') {
    if (selected.startsWith('<u>') && selected.endsWith('</u>') && selected.length >= 7) {
      formatted = selected.slice(3, -4);
    } else {
      formatted = `<u>${selected}</u>`;
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
  } else if (action === 'bullet') {
    const lines = selected.split('\n');
    const allHaveBullet = lines.every(l => !l.trim() || /^\s*[•\-\*]\s+/.test(l));
    if (allHaveBullet) {
      formatted = lines.map(l => l.replace(/^(\s*)[•\-\*]\s+/, '$1')).join('\n');
    } else {
      formatted = lines.map(l => {
        if (!l.trim()) return l;
        if (/^\s*[•\-\*]\s+/.test(l)) return l;
        return `• ${l}`;
      }).join('\n');
    }
  } else if (action === 'clear') {
    formatted = selected
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/<u>(.*?)<\/u>/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`(.*?)`/g, '$1');
    formatted = stripColorTags(formatted);
  } else if (typeof action === 'object' && 'link' in action) {
    formatted = `[${selected}](${action.link})`;
  }

  let beforeText = before;
  let afterText = after;

  if (typeof action === 'object' && 'highlight' in action) {
    const bgOpenMatch = beforeText.match(/\[(?:bg|highlight):[^\]]+\]\s*$/i);
    const bgCloseMatch = afterText.match(/^\s*\[\/(?:bg|highlight)\]/i);
    if (bgOpenMatch && bgCloseMatch) {
      beforeText = beforeText.slice(0, beforeText.length - bgOpenMatch[0].length);
      afterText = afterText.slice(bgCloseMatch[0].length);
    }
    const hKey = action.highlight;
    const cleanSelected = stripColorTags(selected);
    if (!hKey || hKey === 'default') {
      formatted = cleanSelected;
    } else {
      formatted = `[bg:${hKey}]${cleanSelected}[/bg]`;
    }
  } else if (typeof action === 'object' && 'color' in action) {
    const colorOpenMatch = beforeText.match(/\[(?:color:)?([#a-zA-Z0-9_-]+)\]\s*$/i);
    if (colorOpenMatch) {
      const rawTag = colorOpenMatch[1].toLowerCase();
      const closeRegex = new RegExp(`^\\s*\\[\\/(?:color:)?${rawTag}\\]`, 'i');
      const colorCloseMatch = afterText.match(closeRegex);
      if (colorCloseMatch) {
        beforeText = beforeText.slice(0, beforeText.length - colorOpenMatch[0].length);
        afterText = afterText.slice(colorCloseMatch[0].length);
      }
    }
    const cKey = action.color;
    const cleanSelected = stripColorTags(selected);
    if (!cKey || cKey === 'default') {
      formatted = cleanSelected;
    } else {
      formatted = `[${cKey}]${cleanSelected}[/${cKey}]`;
    }
  }

  const newText = beforeText + formatted + afterText;
  const newEnd = beforeText.length + formatted.length;
  return { newText, newStart: beforeText.length, newEnd };
}

export interface FloatingSelectionToolbarProps {
  onFormat: (action: FormatAction) => void;
  onClose: () => void;
  className?: string;
  isNotionLight?: boolean;
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  onFormat,
  onClose,
  className = '',
  isNotionLight = false
}) => {
  const [showColorPalette, setShowColorPalette] = useState(false);

  return (
    <div 
      className={`absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2.5 py-1 rounded-full shadow-2xl border backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none ${
        isNotionLight 
          ? 'bg-white/95 text-slate-800 border-slate-300 shadow-slate-300/60' 
          : 'bg-[#1e293b]/95 text-slate-100 border-slate-600 shadow-black/80'
      } ${className}`}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* A (Color Dropdown Picker) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowColorPalette(!showColorPalette)}
          title="Pilih Warna Teks Notion"
          className={`px-2 py-1 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1 ${
            showColorPalette 
              ? 'bg-teal-600 text-white' 
              : isNotionLight 
              ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900' 
              : 'hover:bg-slate-700 text-slate-200 hover:text-white'
          }`}
        >
          <span className="underline decoration-teal-500 font-extrabold text-xs">A</span>
          <Palette className="w-3 h-3 opacity-70" />
        </button>

        {/* Notion Color Swatches Popover */}
        {showColorPalette && (
          <div 
            className={`absolute top-full left-0 mt-2 p-2 rounded-2xl border shadow-2xl z-60 grid grid-cols-3 gap-1.5 min-w-[230px] animate-in fade-in zoom-in-95 duration-100 ${
              isNotionLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div 
              className={`col-span-3 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider border-b mb-1 ${
                isNotionLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-700'
              }`}
            >
              Warna Teks Notion
            </div>
            {Object.entries(NOTION_COLORS).map(([cKey, cVal]) => (
              <button
                key={cKey}
                type="button"
                onClick={() => {
                  onFormat({ color: cKey });
                  setShowColorPalette(false);
                }}
                title={cVal.label}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-semibold transition-colors text-left cursor-pointer active:scale-95 hover:opacity-85"
                style={{ color: cVal.hex }}
              >
                <span 
                  className="w-3.5 h-3.5 rounded-full shrink-0 border shadow-2xs" 
                  style={{ backgroundColor: cVal.hex, borderColor: isNotionLight ? '#cbd5e1' : '#64748b' }} 
                />
                <span className="truncate text-xs">{cVal.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`w-[1px] h-4 mx-0.5 ${isNotionLight ? 'bg-slate-200' : 'bg-slate-700'}`} />

      {/* Quick Color Swatches directly on bar */}
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

      <div className={`w-[1px] h-4 mx-0.5 ${isNotionLight ? 'bg-slate-200' : 'bg-slate-700'}`} />

      {/* Bold */}
      <button
        type="button"
        onClick={() => onFormat('bold')}
        title="Tebal (Bold: **teks**)"
        className={`px-2 py-1 rounded-lg font-extrabold text-xs cursor-pointer hover:opacity-80 transition-opacity ${
          isNotionLight ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-100 hover:bg-slate-700'
        }`}
      >
        B
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={() => onFormat('italic')}
        title="Miring (Italic: *teks*)"
        className={`px-2 py-1 rounded-lg italic font-serif text-xs cursor-pointer hover:opacity-80 transition-opacity ${
          isNotionLight ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-100 hover:bg-slate-700'
        }`}
      >
        I
      </button>

      {/* Underline */}
      <button
        type="button"
        onClick={() => onFormat('underline')}
        title="Garis Bawah (Underline: <u>teks</u>)"
        className={`px-2 py-1 rounded-lg underline text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${
          isNotionLight ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-100 hover:bg-slate-700'
        }`}
      >
        U
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        onClick={() => onFormat('strike')}
        title="Coret (Strikethrough: ~~teks~~)"
        className={`px-2 py-1 rounded-lg line-through text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
          isNotionLight ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-100 hover:bg-slate-700'
        }`}
      >
        S
      </button>

      {/* Inline Code */}
      <button
        type="button"
        onClick={() => onFormat('code')}
        title="Kode (Inline Code: `teks`)"
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          isNotionLight ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900' : 'hover:bg-slate-700 text-slate-200 hover:text-white'
        }`}
      >
        <Code className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Bullet List */}
      <button
        type="button"
        onClick={() => onFormat('bullet')}
        title="Daftar Bullet (• Teks)"
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          isNotionLight ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900' : 'hover:bg-slate-700 text-slate-200 hover:text-white'
        }`}
      >
        <List className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <div className={`w-[1px] h-4 mx-0.5 ${isNotionLight ? 'bg-slate-200' : 'bg-slate-700'}`} />

      {/* Clear Formatting (Tx / RotateCcw) */}
      <button
        type="button"
        onClick={() => onFormat('clear')}
        title="Hapus Warna & Format Teks"
        className={`px-1.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer hover:opacity-80 transition-opacity ${
          isNotionLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-700'
        }`}
      >
        Tx
      </button>

      {/* Close Floating Toolbar */}
      <button
        type="button"
        onClick={onClose}
        title="Tutup Toolbar"
        className={`p-1 rounded-md transition-colors cursor-pointer ml-0.5 ${
          isNotionLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-700 text-slate-400 hover:text-white'
        }`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
