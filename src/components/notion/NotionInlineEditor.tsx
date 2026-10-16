import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Check, 
  X, 
  Plus, 
  Square, 
  CheckSquare, 
  ChevronDown, 
  Link as LinkIcon, 
  ListTodo, 
  Type,
  List,
  Highlighter
} from 'lucide-react';
import { 
  parseTasklist,
  stripColorTags,
  SubtaskNote,
  markdownToVisualHtml, 
  visualHtmlToMarkdown, 
  NOTION_COLORS,
  NOTION_HIGHLIGHT_COLORS,
  isCursorAtStartOfListItem,
  removeBulletFromLi
} from './tasklist-utils';
import { FloatingSelectionToolbar, FormatAction, formatSelectedText } from './FloatingSelectionToolbar';

export interface NotionInlineEditorProps {
  initialValue: string;
  fieldLabel: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  multiline?: boolean;
  isNotionLight?: boolean;
  allowTasklistMode?: boolean;
  showActionButtons?: boolean;
  disableOutsideClickSave?: boolean;
  minHeight?: string;
  placeholder?: string;
}

export const NotionInlineEditor: React.FC<NotionInlineEditorProps> = ({
  initialValue,
  fieldLabel,
  onSave,
  onCancel,
  multiline = true,
  isNotionLight = true,
  allowTasklistMode = true,
  showActionButtons = false,
  disableOutsideClickSave = false,
  minHeight,
  placeholder
}) => {
  // --- SINGLE LINE MODE (e.g. Judul Kegiatan, Completed Time) ---
  const [singleText, setSingleText] = useState(initialValue || '');
  const singleInputRef = useRef<HTMLInputElement>(null);
  const singleContainerRef = useRef<HTMLDivElement>(null);

  // Floating Selection Toolbar State for Single Line Input
  const [activeSelection, setActiveSelection] = useState<{
    start: number;
    end: number;
    selectedText: string;
  } | null>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleSelectText = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (end > start) {
      setActiveSelection({ start, end, selectedText: target.value.substring(start, end) });
      const rect = singleContainerRef.current?.getBoundingClientRect();
      if (rect) {
        setBubblePos({
          top: Math.max(10, rect.top - 50),
          left: Math.max(10, rect.left + 8)
        });
      }
    } else {
      if (!isColorMenuOpen) {
        setActiveSelection(null);
        setBubblePos(null);
      }
    }
  };

  const handleFormat = (action: FormatAction) => {
    if (!activeSelection) return;
    const res = formatSelectedText(singleText, activeSelection.start, activeSelection.end, action);
    setSingleText(res.newText);
    setActiveSelection({
      start: res.newStart,
      end: res.newEnd,
      selectedText: res.newText.substring(res.newStart, res.newEnd)
    });
  };

  // Capture Escape at window level with capture phase to prevent page navigation
  useEffect(() => {
    const onWindowKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onWindowKeyDownCapture, true);
    return () => {
      window.removeEventListener('keydown', onWindowKeyDownCapture, true);
    };
  }, [onCancel]);

  // Only set initial focus and end-selection ONCE on mount, NOT on every keystroke
  useEffect(() => {
    if (!multiline && singleInputRef.current) {
      singleInputRef.current.focus();
      const len = singleInputRef.current.value.length;
      singleInputRef.current.setSelectionRange(len, len);
    }
  }, [multiline]);

  // Outside click auto-save for single-line mode
  useEffect(() => {
    if (multiline) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isColorMenuOpen) return;
      if (
        singleContainerRef.current && !singleContainerRef.current.contains(target) &&
        (!bubbleRef.current || !bubbleRef.current.contains(target)) &&
        !(target instanceof Element && target.closest('[data-notion-bubble-toolbar="true"]'))
      ) {
        onSave(singleText);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [multiline, singleText, onSave, isColorMenuOpen]);

  if (!multiline) {
    const handleKeyDownSingle = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSave(singleText);
      }
    };

    return (
      <div
        ref={singleContainerRef}
        data-notion-inline-editor="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-lg border p-1.5 font-sans text-[13px] leading-normal transition-all shadow-xs relative"
        style={{
          backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
          color: isNotionLight ? '#0f172a' : '#f8fafc',
          borderColor: isNotionLight ? '#cbd5e1' : '#475569',
        }}
      >
        {bubblePos && activeSelection && (
          <FloatingNotionBubbleToolbar
            bubblePos={bubblePos}
            bubbleRef={bubbleRef}
            isColorMenuOpen={isColorMenuOpen}
            setIsColorMenuOpen={setIsColorMenuOpen}
            onApplyColor={(_hex, colorKey) => handleFormat({ color: colorKey })}
            onApplyHighlight={(_hex, highlightKey) => handleFormat({ highlight: highlightKey })}
            onExecCmd={(cmd) => {
              if (cmd === 'bold') handleFormat('bold');
              else if (cmd === 'italic') handleFormat('italic');
              else if (cmd === 'underline') handleFormat('underline');
              else if (cmd === 'strikeThrough') handleFormat('strike');
              else if (cmd === 'code') handleFormat('code');
            }}
            onClearFormat={() => handleFormat('clear')}
            onInsertLink={() => {
              const url = prompt('Masukkan tautan URL (contoh: https://...):');
              if (url) handleFormat({ link: url });
            }}
            isNotionLight={isNotionLight}
          />
        )}
        <input
          ref={singleInputRef}
          type="text"
          value={singleText}
          onChange={(e) => setSingleText(e.target.value)}
          onSelect={handleSelectText}
          onKeyUp={handleSelectText}
          onMouseUp={handleSelectText}
          onKeyDown={handleKeyDownSingle}
          onBlur={(e) => {
            const rel = e.relatedTarget as Node | null;
            if (isColorMenuOpen) return;
            if (rel && (bubbleRef.current?.contains(rel) || (rel instanceof Element && rel.closest('[data-notion-bubble-toolbar="true"]')))) {
              return;
            }
            if (!singleContainerRef.current?.contains(rel)) {
              onSave(singleText);
            }
          }}
          placeholder={`Tulis ${fieldLabel.toLowerCase()}...`}
          className="w-full text-xs font-normal px-1 py-0.5 rounded bg-transparent outline-none"
          style={{ 
            color: isNotionLight ? '#0f172a' : '#f8fafc',
            caretColor: isNotionLight ? '#0f172a' : '#38bdf8' 
          }}
        />
      </div>
    );
  }

  // --- MULTILINE NOTION INLINE EDITOR ---
  return (
    <NotionMultilineDispatcher
      initialValue={initialValue}
      fieldLabel={fieldLabel}
      onSave={onSave}
      onCancel={onCancel}
      isNotionLight={isNotionLight}
      allowTasklistMode={allowTasklistMode}
      showActionButtons={showActionButtons}
      disableOutsideClickSave={disableOutsideClickSave}
      minHeight={minHeight}
      placeholder={placeholder}
    />
  );
};

// Dispatcher between WYSIWYG Checklist Mode and Freeform Rich Text Mode
const NotionMultilineDispatcher: React.FC<{
  initialValue: string;
  fieldLabel: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  isNotionLight: boolean;
  allowTasklistMode?: boolean;
  showActionButtons?: boolean;
  disableOutsideClickSave?: boolean;
  minHeight?: string;
  placeholder?: string;
}> = ({ 
  initialValue, 
  fieldLabel, 
  onSave, 
  onCancel, 
  isNotionLight, 
  allowTasklistMode = true,
  showActionButtons = false,
  disableOutsideClickSave = false,
  minHeight,
  placeholder
}) => {
  const parsed = parseTasklist(initialValue);
  const [mode, setMode] = useState<'tasklist' | 'freeform'>(() => 
    (allowTasklistMode && parsed.hasTasklist) ? 'tasklist' : 'freeform'
  );
  const [currentVal, setCurrentVal] = useState(initialValue || '');

  if (allowTasklistMode && mode === 'tasklist') {
    return (
      <NotionTasklistInlineEditor
        initialValue={currentVal}
        onSave={onSave}
        onCancel={onCancel}
        onSwitchToFreeform={(text) => {
          setCurrentVal(text);
          setMode('freeform');
        }}
        isNotionLight={isNotionLight}
      />
    );
  }

  return (
    <NotionMultilineBubbleEditor
      initialValue={currentVal}
      fieldLabel={fieldLabel}
      onSave={onSave}
      onCancel={onCancel}
      allowTasklistMode={allowTasklistMode}
      showActionButtons={showActionButtons}
      disableOutsideClickSave={disableOutsideClickSave}
      minHeight={minHeight}
      placeholder={placeholder}
      onSwitchToTasklist={(text) => {
        if (!allowTasklistMode) return;
        setCurrentVal(text);
        setMode('tasklist');
      }}
      isNotionLight={isNotionLight}
    />
  );
};

// =========================================================================
// FLOATING NOTION SELECTION BUBBLE TOOLBAR (Shared Component)
// =========================================================================

interface FloatingNotionBubbleToolbarProps {
  bubblePos: { top: number; left: number } | null;
  bubbleRef: React.RefObject<HTMLDivElement>;
  isColorMenuOpen: boolean;
  setIsColorMenuOpen: (open: boolean) => void;
  onApplyColor: (hex: string, colorKey: string) => void;
  onApplyHighlight: (hex: string, highlightKey: string) => void;
  onExecCmd: (cmd: string, val?: string) => void;
  onClearFormat: () => void;
  onInsertLink: () => void;
  onToggleBullet?: () => void;
  isBulletActive?: boolean;
  isNotionLight?: boolean;
}

export const FloatingNotionBubbleToolbar: React.FC<FloatingNotionBubbleToolbarProps> = ({
  bubblePos,
  bubbleRef,
  isColorMenuOpen,
  setIsColorMenuOpen,
  onApplyColor,
  onApplyHighlight,
  onExecCmd,
  onClearFormat,
  onInsertLink,
  onToggleBullet,
  isBulletActive = false,
  isNotionLight = false
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<'text' | 'highlight' | null>(null);
  const [customTextColor, setCustomTextColor] = useState<string>('#2563eb');
  const [customHighlightColor, setCustomHighlightColor] = useState<string>('#fde047');

  if (!bubblePos) return null;

  const toggleSubmenu = (type: 'text' | 'highlight') => {
    if (activeSubmenu === type) {
      setActiveSubmenu(null);
      setIsColorMenuOpen(false);
    } else {
      setActiveSubmenu(type);
      setIsColorMenuOpen(true);
    }
  };

  const closeSubmenu = () => {
    setActiveSubmenu(null);
    setIsColorMenuOpen(false);
  };

  return createPortal(
    <div
      ref={bubbleRef}
      data-notion-bubble-toolbar="true"
      onMouseDown={(e) => {
        // Prevent blur of contentEditable so selection isn't destroyed
        e.preventDefault();
      }}
      className="fixed z-[99999] px-2.5 py-1 rounded-full backdrop-blur-md border shadow-2xl text-xs animate-in fade-in zoom-in-95 duration-100 select-none font-sans flex items-center gap-1 whitespace-nowrap"
      style={{
        top: `${bubblePos.top}px`,
        left: `${bubblePos.left}px`,
        backgroundColor: isNotionLight ? '#ffffff' : '#1e293b',
        color: isNotionLight ? '#0f172a' : '#f8fafc',
        borderColor: isNotionLight ? '#cbd5e1' : '#475569'
      }}
    >
      {/* 1. Warna Teks Dropdown */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleSubmenu('text')}
          className={`px-2 py-1 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1 ${
            activeSubmenu === 'text' 
              ? (isNotionLight ? 'bg-teal-50 text-teal-700' : 'bg-teal-950/40 text-teal-300') 
              : 'hover:opacity-80'
          }`}
          style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
          title="Pilih Warna Teks"
        >
          <span className="font-extrabold text-xs underline decoration-2 decoration-teal-500">A</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {/* Text Color Popover (No text labels, authentic Notion palette + 1 custom color selector) */}
        {activeSubmenu === 'text' && (
          <div 
            className="absolute top-full left-0 mt-2 p-2 rounded-2xl border shadow-2xl z-[100000] animate-in fade-in zoom-in-95 duration-100"
            style={{
              backgroundColor: isNotionLight ? '#ffffff' : '#1e293b',
              borderColor: isNotionLight ? '#cbd5e1' : '#475569',
              color: isNotionLight ? '#0f172a' : '#f8fafc'
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="grid grid-cols-6 gap-2">
              {/* Default (Hitam) */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onApplyColor(NOTION_COLORS.default.hex, 'default');
                  closeSubmenu();
                }}
                className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition-transform cursor-pointer shadow-2xs flex items-center justify-center bg-[#37352f]"
                title="Default (Hitam)"
              />

              {/* 9 Notion Text Colors */}
              {(['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'] as const).map((key) => {
                const conf = NOTION_COLORS[key];
                if (!conf) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onApplyColor(conf.hex, key);
                      closeSubmenu();
                    }}
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition-transform cursor-pointer shadow-2xs flex items-center justify-center"
                    style={{ backgroundColor: conf.hex }}
                    title={conf.label}
                  />
                );
              })}

              {/* +1 Selector Warna Custom */}
              <label
                className="relative w-6 h-6 rounded-full p-[1.5px] hover:scale-125 transition-transform cursor-pointer shadow-2xs flex items-center justify-center bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 to-indigo-500"
                title="Pilih Warna Kustom..."
                onMouseDown={(e) => e.preventDefault()}
              >
                <span 
                  className="w-full h-full rounded-full border border-white/60 dark:border-slate-900/60 flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
                  style={{ backgroundColor: customTextColor }}
                >
                  +
                </span>
                <input
                  type="color"
                  value={customTextColor}
                  onChange={(e) => {
                    const newCol = e.target.value;
                    setCustomTextColor(newCol);
                    onApplyColor(newCol, newCol);
                    closeSubmenu();
                  }}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 2. Highlight Text Dropdown */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleSubmenu('highlight')}
          className={`px-2 py-1 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1 ${
            activeSubmenu === 'highlight' 
              ? (isNotionLight ? 'bg-amber-50 text-amber-700' : 'bg-amber-950/40 text-amber-300') 
              : 'hover:opacity-80'
          }`}
          style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
          title="Highlight Teks"
        >
          <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {/* Highlight Popover (No text labels, authentic Notion pastel palette + 1 custom highlight selector) */}
        {activeSubmenu === 'highlight' && (
          <div 
            className="absolute top-full left-0 mt-2 p-2 rounded-2xl border shadow-2xl z-[100000] animate-in fade-in zoom-in-95 duration-100"
            style={{
              backgroundColor: isNotionLight ? '#ffffff' : '#1e293b',
              borderColor: isNotionLight ? '#cbd5e1' : '#475569',
              color: isNotionLight ? '#0f172a' : '#f8fafc'
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="grid grid-cols-6 gap-2">
              {/* Tanpa Highlight */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onApplyHighlight('transparent', 'default');
                  closeSubmenu();
                }}
                className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition-transform cursor-pointer shadow-2xs flex items-center justify-center bg-transparent relative overflow-hidden"
                title="Tanpa Highlight"
              >
                <span className="w-full h-[1.5px] bg-rose-500 rotate-45 transform" />
              </button>

              {/* 9 Notion Highlight Pastel Colors */}
              {(['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'] as const).map((key) => {
                const conf = NOTION_HIGHLIGHT_COLORS[key];
                if (!conf) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onApplyHighlight(conf.hex, key);
                      closeSubmenu();
                    }}
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition-transform cursor-pointer shadow-2xs flex items-center justify-center"
                    style={{ backgroundColor: conf.hex }}
                    title={conf.label}
                  />
                );
              })}

              {/* +1 Selector Warna Highlight Custom */}
              <label
                className="relative w-6 h-6 rounded-full p-[1.5px] hover:scale-125 transition-transform cursor-pointer shadow-2xs flex items-center justify-center bg-gradient-to-tr from-amber-400 via-rose-400 to-teal-400"
                title="Highlight Kustom..."
                onMouseDown={(e) => e.preventDefault()}
              >
                <span 
                  className="w-full h-full rounded-full border border-white/60 dark:border-slate-900/60 flex items-center justify-center text-[10px] font-bold text-slate-800 shadow-inner"
                  style={{ backgroundColor: customHighlightColor }}
                >
                  +
                </span>
                <input
                  type="color"
                  value={customHighlightColor}
                  onChange={(e) => {
                    const newCol = e.target.value;
                    setCustomHighlightColor(newCol);
                    onApplyHighlight(newCol, newCol);
                    closeSubmenu();
                  }}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <div 
        className="w-[1px] h-4 my-auto mx-0.5" 
        style={{ backgroundColor: isNotionLight ? '#e2e8f0' : '#475569' }} 
      />

      {/* B (Bold) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onExecCmd('bold')}
        className="px-2 py-1 rounded-lg font-extrabold text-xs cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
        title="Tebal (Ctrl+B)"
      >
        B
      </button>

      {/* I (Italic) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onExecCmd('italic')}
        className="px-2 py-1 rounded-lg italic font-serif text-xs cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
        title="Miring (Ctrl+I)"
      >
        I
      </button>

      {/* U (Underline) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onExecCmd('underline')}
        className="px-2 py-1 rounded-lg underline text-xs cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
        title="Garis Bawah (Ctrl+U)"
      >
        U
      </button>

      {/* S (Strikethrough) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onExecCmd('strikeThrough')}
        className="px-2 py-1 rounded-lg line-through text-xs cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
        title="Coret"
      >
        S
      </button>

      {/* Tx (Clear format) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClearFormat}
        className="px-2 py-1 rounded-lg font-bold text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: isNotionLight ? '#64748b' : '#94a3b8' }}
        title="Hapus Warna & Format"
      >
        Tx
      </button>

      <div 
        className="w-[1px] h-4 my-auto mx-0.5" 
        style={{ backgroundColor: isNotionLight ? '#e2e8f0' : '#475569' }} 
      />

      {/* Link */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onInsertLink}
        className="p-1 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
        title="Tautan / Link"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>

      {/* Bullet List (Only for multiline / rich containers) */}
      {onToggleBullet && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleBullet}
          className={`p-1 rounded-lg cursor-pointer transition-all ${
            isBulletActive 
              ? 'bg-teal-500 text-white shadow-xs' 
              : 'hover:opacity-80'
          }`}
          style={{ color: isBulletActive ? '#ffffff' : (isNotionLight ? '#0f172a' : '#f8fafc') }}
          title={isBulletActive ? "Hapus Bullet (Jadikan Baris Biasa)" : "Daftar Bullet (Poin •)"}
        >
          <List className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Code */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onExecCmd('code')}
        className="px-1.5 py-0.5 rounded-lg font-mono text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-600 dark:text-slate-300 font-semibold"
        title="Kode"
      >
        &lt;/&gt;
      </button>
    </div>,
    document.body
  );
};

// =========================================================================
// 1. WYSIWYG NOTION CHECKLIST INLINE EDITOR (Real interactive checkboxes with Rich Bubble Tools)
// =========================================================================

interface EditableTaskItem {
  id: string;
  checked: boolean;
  html: string;
  note?: string;
  checkedDate?: string;
  notes?: SubtaskNote[];
}

const NotionTasklistInlineEditor: React.FC<{
  initialValue: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  onSwitchToFreeform: (text: string) => void;
  isNotionLight: boolean;
}> = ({ initialValue, onSave, onCancel, onSwitchToFreeform, isNotionLight }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const parsed = parseTasklist(initialValue);

  const [cleanHeader, setCleanHeader] = useState(stripColorTags(parsed.cleanText || ''));
  const headerDivRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<EditableTaskItem[]>(() => {
    if (parsed.items.length > 0) {
      return parsed.items.map((it, idx) => ({
        id: `item-${idx}-${Date.now()}`,
        checked: it.checked,
        html: markdownToVisualHtml(it.text),
        note: it.note,
        checkedDate: it.checkedDate,
        notes: it.notes
      }));
    }
    return [{ id: `item-0-${Date.now()}`, checked: false, html: '' }];
  });

  const itemDivRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Floating bubble toolbar state
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const lastSavedRangeRef = useRef<Range | null>(null);

  // Capture Escape at window level with capture phase to prevent page navigation
  useEffect(() => {
    const onWindowKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onWindowKeyDownCapture, true);
    return () => {
      window.removeEventListener('keydown', onWindowKeyDownCapture, true);
    };
  }, [onCancel]);

  // Floating Bubble selection listener
  const updateBubblePosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      if (!isColorMenuOpen) {
        setBubblePos(null);
      }
      return;
    }

    const range = sel.getRangeAt(0);
    // Ensure selection is inside this editor container
    if (!containerRef.current || !containerRef.current.contains(range.commonAncestorContainer)) {
      setBubblePos(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setBubblePos(null);
      return;
    }

    // Save range reference so clicking popover menu won't lose target range
    lastSavedRangeRef.current = range.cloneRange();

    const rect = range.getBoundingClientRect();
    const bubbleWidth = 320;
    const bubbleHeight = 40;
    const left = Math.max(16, Math.min(window.innerWidth - bubbleWidth - 16, rect.left + rect.width / 2 - bubbleWidth / 2));
    const top = rect.top >= bubbleHeight + 14 
      ? rect.top - bubbleHeight - 8 
      : rect.bottom + 8;

    setBubblePos({ top, left });
  }, [isColorMenuOpen]);

  useEffect(() => {
    const onSelectionChange = () => {
      updateBubblePosition();
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [updateBubblePosition]);

  // Apply rich text formatting
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    const sel = window.getSelection();
    if (lastSavedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(lastSavedRangeRef.current);
    }

    document.execCommand(cmd, false, val);
    updateBubblePosition();
  };

  const handleApplyColor = (hex: string, colorKey: string) => {
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    } else if (lastSavedRangeRef.current) {
      range = lastSavedRangeRef.current;
    }

    if (!range) return;

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    let colorAncestor: HTMLElement | null = null;
    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== containerRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'SPAN' && (el.hasAttribute('data-color') || el.style.color)) {
          colorAncestor = el;
          break;
        }
      }
      node = node.parentNode;
    }

    if (colorKey === 'default') {
      if (colorAncestor && colorAncestor.textContent?.trim() === range.toString().trim()) {
        colorAncestor.removeAttribute('data-color');
        colorAncestor.style.color = '';
        if (!colorAncestor.getAttribute('style')?.trim() && !colorAncestor.getAttribute('data-bg')) {
          const parent = colorAncestor.parentNode;
          while (colorAncestor.firstChild) {
            parent?.insertBefore(colorAncestor.firstChild, colorAncestor);
          }
          parent?.removeChild(colorAncestor);
        }
      } else {
        try {
          const contents = range.extractContents();
          contents.querySelectorAll?.('span[data-color], span[style*="color"]').forEach((el) => {
            (el as HTMLElement).removeAttribute('data-color');
            (el as HTMLElement).style.color = '';
          });
          range.insertNode(contents);
        } catch (e) {
          document.execCommand('removeFormat');
        }
      }
    } else {
      if (colorAncestor && colorAncestor.textContent?.trim() === range.toString().trim()) {
        colorAncestor.style.color = hex;
        colorAncestor.setAttribute('data-color', colorKey);
        if (sel) {
          const newRange = document.createRange();
          newRange.selectNodeContents(colorAncestor);
          sel.removeAllRanges();
          sel.addRange(newRange);
          lastSavedRangeRef.current = newRange.cloneRange();
        }
      } else {
        const span = document.createElement('span');
        span.style.color = hex;
        span.setAttribute('data-color', colorKey);

        try {
          const contents = range.extractContents();
          if (contents.querySelectorAll) {
            contents.querySelectorAll('span[data-color], span[style*="color"]').forEach((el) => {
              (el as HTMLElement).removeAttribute('data-color');
              (el as HTMLElement).style.color = '';
              if (!el.getAttribute('style')?.trim() && !el.getAttribute('data-bg')) {
                const parent = el.parentNode;
                while (el.firstChild) {
                  parent?.insertBefore(el.firstChild, el);
                }
                parent?.removeChild(el);
              }
            });
          }
          span.appendChild(contents);
          range.insertNode(span);

          if (sel) {
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(newRange);
            lastSavedRangeRef.current = newRange.cloneRange();
          }
        } catch (err) {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('foreColor', false, hex);
        }
      }
    }

    setIsColorMenuOpen(false);
  };

  const handleApplyHighlight = (hex: string, highlightKey: string) => {
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    } else if (lastSavedRangeRef.current) {
      range = lastSavedRangeRef.current;
    }

    if (!range) return;

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    let bgAncestor: HTMLElement | null = null;
    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== containerRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'SPAN' && (el.hasAttribute('data-bg') || el.style.backgroundColor)) {
          bgAncestor = el;
          break;
        }
      }
      node = node.parentNode;
    }

    if (highlightKey === 'default' || hex === 'transparent') {
      if (bgAncestor && bgAncestor.textContent?.trim() === range.toString().trim()) {
        bgAncestor.removeAttribute('data-bg');
        bgAncestor.style.backgroundColor = '';
        bgAncestor.style.padding = '';
        bgAncestor.style.borderRadius = '';
        if (!bgAncestor.getAttribute('style')?.trim() && !bgAncestor.getAttribute('data-color')) {
          const parent = bgAncestor.parentNode;
          while (bgAncestor.firstChild) {
            parent?.insertBefore(bgAncestor.firstChild, bgAncestor);
          }
          parent?.removeChild(bgAncestor);
        }
      } else {
        try {
          const contents = range.extractContents();
          contents.querySelectorAll?.('span[data-bg], span[style*="background"]').forEach((el) => {
            (el as HTMLElement).removeAttribute('data-bg');
            (el as HTMLElement).style.backgroundColor = '';
            (el as HTMLElement).style.padding = '';
            (el as HTMLElement).style.borderRadius = '';
          });
          range.insertNode(contents);
        } catch (e) {}
      }
    } else {
      if (bgAncestor && bgAncestor.textContent?.trim() === range.toString().trim()) {
        bgAncestor.style.backgroundColor = hex;
        bgAncestor.style.padding = '1px 3px';
        bgAncestor.style.borderRadius = '3px';
        bgAncestor.setAttribute('data-bg', highlightKey);
        if (sel) {
          const newRange = document.createRange();
          newRange.selectNodeContents(bgAncestor);
          sel.removeAllRanges();
          sel.addRange(newRange);
          lastSavedRangeRef.current = newRange.cloneRange();
        }
      } else {
        const span = document.createElement('span');
        span.style.backgroundColor = hex;
        span.style.padding = '1px 3px';
        span.style.borderRadius = '3px';
        span.setAttribute('data-bg', highlightKey);

        try {
          const contents = range.extractContents();
          if (contents.querySelectorAll) {
            contents.querySelectorAll('span[data-bg], span[style*="background"]').forEach((el) => {
              (el as HTMLElement).removeAttribute('data-bg');
              (el as HTMLElement).style.backgroundColor = '';
              (el as HTMLElement).style.padding = '';
              (el as HTMLElement).style.borderRadius = '';
              if (!el.getAttribute('style')?.trim() && !el.getAttribute('data-color')) {
                const parent = el.parentNode;
                while (el.firstChild) {
                  parent?.insertBefore(el.firstChild, el);
                }
                parent?.removeChild(el);
              }
            });
          }
          span.appendChild(contents);
          range.insertNode(span);

          if (sel) {
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(newRange);
            lastSavedRangeRef.current = newRange.cloneRange();
          }
        } catch (err) {}
      }
    }

    setIsColorMenuOpen(false);
  };

  const handleClearFormat = () => {
    execCmd('removeFormat');
    setIsColorMenuOpen(false);
    setBubblePos(null);
  };

  const handleInsertLink = () => {
    const url = prompt('Masukkan tautan URL (contoh: https://...):');
    if (url) {
      execCmd('createLink', url);
    }
  };

  // Convert current items state to markdown
  const serializeToMarkdown = useCallback((): string => {
    const lines: string[] = [];
    const headerHtml = headerDivRef.current ? headerDivRef.current.innerHTML : cleanHeader;
    const headerMd = visualHtmlToMarkdown(headerHtml).trim();
    if (headerMd) {
      lines.push(headerMd);
    }

    items.forEach((it, idx) => {
      const el = itemDivRefs.current[idx];
      const html = el ? el.innerHTML : it.html;
      const textMd = visualHtmlToMarkdown(html).trim();
      if (!textMd) return;

      let line = `- [${it.checked ? 'x' : ' '}] ${textMd}`;
      if (it.checkedDate) line += ` <!--checkedDate:${it.checkedDate}-->`;
      if (it.notes && it.notes.length > 0) {
        line += ` <!--notes:${JSON.stringify(it.notes)}-->`;
      } else if (it.note) {
        line += ` <!--note:${it.note}-->`;
      }
      lines.push(line);
    });

    return lines.join('\n');
  }, [cleanHeader, items]);

  // Outside click auto-save
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isColorMenuOpen) return;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!bubbleRef.current || !bubbleRef.current.contains(target)) &&
        !(target instanceof Element && target.closest('[data-notion-bubble-toolbar="true"]'))
      ) {
        const md = serializeToMarkdown();
        onSave(md);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [serializeToMarkdown, onSave, isColorMenuOpen]);

  const toggleCheck = (idx: number) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[idx];
      const newChecked = !current.checked;
      const el = itemDivRefs.current[idx];
      next[idx] = {
        ...current,
        html: el ? el.innerHTML : current.html,
        checked: newChecked,
        checkedDate: newChecked ? (current.checkedDate || new Date().toISOString().slice(0, 10)) : undefined
      };
      return next;
    });
  };

  const addItemAfter = (idx: number) => {
    const curEl = itemDivRefs.current[idx];
    const curHtml = curEl ? curEl.innerHTML : items[idx]?.html || '';

    const newItem: EditableTaskItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      checked: false,
      html: ''
    };
    setItems((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], html: curHtml };
      }
      next.splice(idx + 1, 0, newItem);
      return next;
    });

    setTimeout(() => {
      const nextEl = itemDivRefs.current[idx + 1];
      if (nextEl) {
        nextEl.focus();
      }
    }, 20);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) {
      const el = itemDivRefs.current[0];
      if (el) el.innerHTML = '';
      setItems([{ id: `item-0-${Date.now()}`, checked: false, html: '' }]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
    const targetIdx = Math.max(0, idx - 1);
    setTimeout(() => {
      const prevEl = itemDivRefs.current[targetIdx];
      if (prevEl) {
        prevEl.focus();
      }
    }, 20);
  };

  const handleItemKeyDown = (idx: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation();
      onCancel();
      return;
    }

    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onSave(serializeToMarkdown());
        return;
      }
      e.preventDefault();
      addItemAfter(idx);
      return;
    }

    if (e.key === 'Backspace') {
      const el = itemDivRefs.current[idx];
      if (el && (!el.textContent || el.textContent.trim() === '')) {
        e.preventDefault();
        removeItem(idx);
        return;
      }
    }

    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      itemDivRefs.current[idx - 1]?.focus();
      return;
    }

    if (e.key === 'ArrowDown' && idx < items.length - 1) {
      e.preventDefault();
      itemDivRefs.current[idx + 1]?.focus();
      return;
    }
  };

  const completedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  return (
    <div
      ref={containerRef}
      data-notion-inline-editor="true"
      onClick={(e) => e.stopPropagation()}
      className="w-full rounded-lg border p-2 font-sans relative transition-all shadow-sm"
      style={{
        backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
        color: isNotionLight ? '#0f172a' : '#f8fafc',
        borderColor: isNotionLight ? '#cbd5e1' : '#475569',
      }}
    >
      {/* Optional Clean Header (Intro Note) */}
      {cleanHeader && (
        <div className="mb-2 pb-1 border-b border-slate-100">
          <input
            type="text"
            value={cleanHeader}
            onChange={(e) => setCleanHeader(stripColorTags(e.target.value))}
            placeholder="Catatan / keterangan..."
            className="w-full text-xs font-semibold outline-none bg-transparent"
            style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
          />
        </div>
      )}

      {/* WYSIWYG Checklist Items (Real Interactive Checkboxes & Rich Formattable Content) */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-0.5">
        {items.map((item, idx) => (
          <div 
            key={item.id} 
            className="flex items-center gap-1.5 group/item py-0.5 px-1 rounded hover:bg-slate-50 transition-colors"
          >
            {/* Clickable Notion Checkbox Square */}
            <button
              type="button"
              onClick={() => toggleCheck(idx)}
              className="shrink-0 p-0.5 rounded cursor-pointer transition-colors focus:outline-none"
              title={item.checked ? "Tandai belum selesai" : "Tandai selesai"}
            >
              {item.checked ? (
                <CheckSquare className="w-3.5 h-3.5 text-teal-600 hover:text-teal-700" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              )}
            </button>

            {/* Editable Formattable Task Title */}
            <div
              ref={(el) => {
                if (el) {
                  itemDivRefs.current[idx] = el;
                  if (!el.hasAttribute('data-initialized')) {
                    el.innerHTML = item.html;
                    el.setAttribute('data-initialized', 'true');
                  }
                }
              }}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => handleItemKeyDown(idx, e)}
              onMouseUp={updateBubblePosition}
              onKeyUp={updateBubblePosition}
              data-placeholder="Tulis kegiatan to-do..."
              className={`flex-1 text-[13px] leading-relaxed outline-none bg-transparent min-h-[22px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none ${
                item.checked
                  ? 'line-through text-slate-400 font-normal'
                  : isNotionLight ? 'text-slate-900 font-medium' : 'text-slate-100 font-medium'
              }`}
              style={{
                caretColor: isNotionLight ? '#0f172a' : '#38bdf8',
              }}
            />

            {/* Delete button on hover */}
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer shrink-0"
              title="Hapus baris tugas ini"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Mini Bottom Toolbar */}
      <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-[11px] select-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Add Item Button */}
          <button
            type="button"
            onClick={() => addItemAfter(items.length - 1)}
            className="inline-flex items-center gap-1 font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-teal-50 shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span className="whitespace-nowrap">Tambah To-do</span>
          </button>

          {totalCount > 0 && (
            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
              {completedCount}/{totalCount} selesai
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {/* Switch to Freeform Text Mode */}
          <button
            type="button"
            onClick={() => onSwitchToFreeform(serializeToMarkdown())}
            className="text-[10px] text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            title="Ubah ke mode teks paragraf bebas"
          >
            Mode Teks
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer font-medium whitespace-nowrap"
            title="Batal edit (Esc)"
          >
            Batal
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={() => onSave(serializeToMarkdown())}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
            title="Simpan perubahan (Ctrl+Enter)"
          >
            <Check className="w-3 h-3" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Floating Notion Bubble Toolbar in Checklist Mode */}
      <FloatingNotionBubbleToolbar
        bubblePos={bubblePos}
        bubbleRef={bubbleRef}
        isColorMenuOpen={isColorMenuOpen}
        setIsColorMenuOpen={setIsColorMenuOpen}
        onApplyColor={handleApplyColor}
        onApplyHighlight={handleApplyHighlight}
        onExecCmd={execCmd}
        onClearFormat={handleClearFormat}
        onInsertLink={handleInsertLink}
        isNotionLight={isNotionLight}
      />
    </div>
  );
};

// =========================================================================
// 2. MULTILINE NOTION INLINE SELECTION BUBBLE EDITOR (Free-form Rich Text)
// =========================================================================

interface NotionMultilineBubbleEditorProps {
  initialValue: string;
  fieldLabel: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  onSwitchToTasklist: (text: string) => void;
  isNotionLight: boolean;
  allowTasklistMode?: boolean;
  showActionButtons?: boolean;
  disableOutsideClickSave?: boolean;
  minHeight?: string;
  placeholder?: string;
}

const NotionMultilineBubbleEditor: React.FC<NotionMultilineBubbleEditorProps> = ({
  initialValue,
  fieldLabel,
  onSave,
  onCancel,
  onSwitchToTasklist,
  isNotionLight,
  allowTasklistMode = true,
  showActionButtons = false,
  disableOutsideClickSave = false,
  minHeight,
  placeholder
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Bubble toolbar position
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const lastSavedRangeRef = useRef<Range | null>(null);

  // Capture Escape at window level with capture phase to prevent page navigation
  useEffect(() => {
    const onWindowKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onWindowKeyDownCapture, true);
    return () => {
      window.removeEventListener('keydown', onWindowKeyDownCapture, true);
    };
  }, [onCancel]);

  // Initialize content on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToVisualHtml(initialValue || '');
      // Auto focus at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  // Sync back to markdown
  const getCleanMarkdown = useCallback((): string => {
    if (!editorRef.current) return '';
    return visualHtmlToMarkdown(editorRef.current.innerHTML);
  }, []);

  // Selection change listener for Notion Floating Bubble
  const updateBubblePosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      if (!isColorMenuOpen) {
        setBubblePos(null);
      }
      return;
    }

    const range = sel.getRangeAt(0);
    // Ensure selection is inside this editor
    if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) {
      setBubblePos(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setBubblePos(null);
      return;
    }

    // Save range reference so clicking popover menu won't lose target range
    lastSavedRangeRef.current = range.cloneRange();

    const rect = range.getBoundingClientRect();
    const bubbleWidth = 320;
    const bubbleHeight = 40;
    const left = Math.max(16, Math.min(window.innerWidth - bubbleWidth - 16, rect.left + rect.width / 2 - bubbleWidth / 2));
    const top = rect.top >= bubbleHeight + 14 
      ? rect.top - bubbleHeight - 8 
      : rect.bottom + 8;

    setBubblePos({ top, left });
  }, [isColorMenuOpen]);

  useEffect(() => {
    const onSelectionChange = () => {
      updateBubblePosition();
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [updateBubblePosition]);

  // Outside click to save (Pure Notion in-place auto save)
  useEffect(() => {
    if (disableOutsideClickSave) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isColorMenuOpen) return;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!bubbleRef.current || !bubbleRef.current.contains(target)) &&
        !(target instanceof Element && target.closest('[data-notion-bubble-toolbar="true"]'))
      ) {
        const finalMd = getCleanMarkdown();
        onSave(finalMd);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [getCleanMarkdown, onSave, isColorMenuOpen, disableOutsideClickSave]);

  // Apply rich text formatting
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    const sel = window.getSelection();
    if (lastSavedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(lastSavedRangeRef.current);
    }

    document.execCommand(cmd, false, val);
    updateBubblePosition();
  };

  // Apply Notion Color Tag to selected text (Non-nesting)
  const handleApplyColor = (hex: string, colorKey: string) => {
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    } else if (lastSavedRangeRef.current) {
      range = lastSavedRangeRef.current;
    }

    if (!range) return;

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    let colorAncestor: HTMLElement | null = null;
    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'SPAN' && (el.hasAttribute('data-color') || el.style.color)) {
          colorAncestor = el;
          break;
        }
      }
      node = node.parentNode;
    }

    if (colorKey === 'default') {
      if (colorAncestor && colorAncestor.textContent?.trim() === range.toString().trim()) {
        colorAncestor.removeAttribute('data-color');
        colorAncestor.style.color = '';
        if (!colorAncestor.getAttribute('style')?.trim() && !colorAncestor.getAttribute('data-bg')) {
          const parent = colorAncestor.parentNode;
          while (colorAncestor.firstChild) {
            parent?.insertBefore(colorAncestor.firstChild, colorAncestor);
          }
          parent?.removeChild(colorAncestor);
        }
      } else {
        try {
          const contents = range.extractContents();
          contents.querySelectorAll?.('span[data-color], span[style*="color"]').forEach((el) => {
            (el as HTMLElement).removeAttribute('data-color');
            (el as HTMLElement).style.color = '';
          });
          range.insertNode(contents);
        } catch (e) {
          document.execCommand('removeFormat');
        }
      }
    } else {
      if (colorAncestor && colorAncestor.textContent?.trim() === range.toString().trim()) {
        colorAncestor.style.color = hex;
        colorAncestor.setAttribute('data-color', colorKey);
        if (sel) {
          const newRange = document.createRange();
          newRange.selectNodeContents(colorAncestor);
          sel.removeAllRanges();
          sel.addRange(newRange);
          lastSavedRangeRef.current = newRange.cloneRange();
        }
      } else {
        const span = document.createElement('span');
        span.style.color = hex;
        span.setAttribute('data-color', colorKey);

        try {
          const contents = range.extractContents();
          if (contents.querySelectorAll) {
            contents.querySelectorAll('span[data-color], span[style*="color"]').forEach((el) => {
              (el as HTMLElement).removeAttribute('data-color');
              (el as HTMLElement).style.color = '';
              if (!el.getAttribute('style')?.trim() && !el.getAttribute('data-bg')) {
                const parent = el.parentNode;
                while (el.firstChild) {
                  parent?.insertBefore(el.firstChild, el);
                }
                parent?.removeChild(el);
              }
            });
          }
          span.appendChild(contents);
          range.insertNode(span);

          if (sel) {
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(newRange);
            lastSavedRangeRef.current = newRange.cloneRange();
          }
        } catch (err) {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('foreColor', false, hex);
        }
      }
    }

    setIsColorMenuOpen(false);
  };

  // Apply Notion Highlight Tag to selected text (Non-nesting)
  const handleApplyHighlight = (hex: string, highlightKey: string) => {
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    } else if (lastSavedRangeRef.current) {
      range = lastSavedRangeRef.current;
    }

    if (!range) return;

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    let bgAncestor: HTMLElement | null = null;
    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'SPAN' && (el.hasAttribute('data-bg') || el.style.backgroundColor)) {
          bgAncestor = el;
          break;
        }
      }
      node = node.parentNode;
    }

    if (highlightKey === 'default' || hex === 'transparent') {
      if (bgAncestor && bgAncestor.textContent?.trim() === range.toString().trim()) {
        bgAncestor.removeAttribute('data-bg');
        bgAncestor.style.backgroundColor = '';
        bgAncestor.style.padding = '';
        bgAncestor.style.borderRadius = '';
        if (!bgAncestor.getAttribute('style')?.trim() && !bgAncestor.getAttribute('data-color')) {
          const parent = bgAncestor.parentNode;
          while (bgAncestor.firstChild) {
            parent?.insertBefore(bgAncestor.firstChild, bgAncestor);
          }
          parent?.removeChild(bgAncestor);
        }
      } else {
        try {
          const contents = range.extractContents();
          contents.querySelectorAll?.('span[data-bg], span[style*="background"]').forEach((el) => {
            (el as HTMLElement).removeAttribute('data-bg');
            (el as HTMLElement).style.backgroundColor = '';
            (el as HTMLElement).style.padding = '';
            (el as HTMLElement).style.borderRadius = '';
          });
          range.insertNode(contents);
        } catch (e) {}
      }
    } else {
      if (bgAncestor && bgAncestor.textContent?.trim() === range.toString().trim()) {
        bgAncestor.style.backgroundColor = hex;
        bgAncestor.style.padding = '1px 3px';
        bgAncestor.style.borderRadius = '3px';
        bgAncestor.setAttribute('data-bg', highlightKey);
        if (sel) {
          const newRange = document.createRange();
          newRange.selectNodeContents(bgAncestor);
          sel.removeAllRanges();
          sel.addRange(newRange);
          lastSavedRangeRef.current = newRange.cloneRange();
        }
      } else {
        const span = document.createElement('span');
        span.style.backgroundColor = hex;
        span.style.padding = '1px 3px';
        span.style.borderRadius = '3px';
        span.setAttribute('data-bg', highlightKey);

        try {
          const contents = range.extractContents();
          if (contents.querySelectorAll) {
            contents.querySelectorAll('span[data-bg], span[style*="background"]').forEach((el) => {
              (el as HTMLElement).removeAttribute('data-bg');
              (el as HTMLElement).style.backgroundColor = '';
              (el as HTMLElement).style.padding = '';
              (el as HTMLElement).style.borderRadius = '';
              if (!el.getAttribute('style')?.trim() && !el.getAttribute('data-color')) {
                const parent = el.parentNode;
                while (el.firstChild) {
                  parent?.insertBefore(el.firstChild, el);
                }
                parent?.removeChild(el);
              }
            });
          }
          span.appendChild(contents);
          range.insertNode(span);

          if (sel) {
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(newRange);
            lastSavedRangeRef.current = newRange.cloneRange();
          }
        } catch (err) {}
      }
    }

    setIsColorMenuOpen(false);
  };

  // Clear format
  const handleClearFormat = () => {
    execCmd('removeFormat');
    setIsColorMenuOpen(false);
    setBubblePos(null);
  };

  // Link prompt
  const handleInsertLink = () => {
    const url = prompt('Masukkan tautan URL (contoh: https://...):');
    if (url) {
      execCmd('createLink', url);
    }
  };

  // Bullet toggle function
  const handleToggleBullet = () => {
    execCmd('insertUnorderedList');
  };

  const isBulletActive = Boolean(
    typeof document !== 'undefined' && document.queryCommandState && document.queryCommandState('insertUnorderedList')
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation();
      onCancel();
      return;
    }

    // Ctrl+Enter or Cmd+Enter to save immediately
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave(getCleanMarkdown());
      return;
    }

    // Shift + Enter: otomatis ke baris 2 secara normal (tanpa bullet)
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      return;
    }

    // Enter pada baris bullet / teks biasa
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      let insideLi: HTMLElement | null = null;
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let node: Node | null = sel.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'LI') {
            insideLi = node as HTMLElement;
            break;
          }
          node = node.parentNode;
        }
      }

      const isAlreadyList = Boolean(insideLi) || document.queryCommandState('insertUnorderedList');

      if (isAlreadyList) {
        const currentText = (insideLi?.textContent || sel?.anchorNode?.textContent || '').replace(/^(\s*[•\-])+\s*/, '').trim();
        if (!currentText) {
          // Bullet saat ini kosong -> tekan enter untuk keluar dari mode bullet jadi baris biasa
          e.preventDefault();
          document.execCommand('insertUnorderedList');
          return;
        }
        // Jika ada teks di bullet, biarkan browser native Enter membuat bullet berikutnya secara otomatis
        return;
      }
      // Jika bukan dalam bullet list: biarkan Enter biasa membuat baris baru biasa (jangan dipaksa jadi bullet!)
    }

    // Backspace pada bullet: jika kosong atau kursor berada di paling awal bullet, ubah jadi baris biasa
    if (e.key === 'Backspace' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      let insideLi: HTMLElement | null = null;
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let node: Node | null = sel.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'LI') {
            insideLi = node as HTMLElement;
            break;
          }
          node = node.parentNode;
        }
      }

      if (insideLi) {
        const currentText = (insideLi.textContent || '').replace(/^(\s*[•\-])+\s*/, '').trim();
        if (!currentText || isCursorAtStartOfListItem(insideLi)) {
          e.preventDefault();
          removeBulletFromLi(insideLi, editorRef.current || undefined);
          return;
        }
      }
    }
  };

  // Convert current freeform text to checklist format
  const handleConvertToTasklist = () => {
    const currentMd = getCleanMarkdown();
    const lines = currentMd.split('\n').filter(Boolean);
    const tasklistMd = lines
      .map((l) => (l.startsWith('- [ ]') || l.startsWith('- [x]') ? l : `- [ ] ${l.replace(/^[-*•]\s*/, '')}`))
      .join('\n');
    onSwitchToTasklist(tasklistMd);
  };

  return (
    <div
      ref={containerRef}
      data-notion-inline-editor="true"
      onClick={(e) => e.stopPropagation()}
      className="w-full rounded-lg border p-1 font-sans relative transition-all shadow-xs"
      style={{
        backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
        color: isNotionLight ? '#0f172a' : '#f8fafc',
        borderColor: isNotionLight ? '#cbd5e1' : '#475569',
      }}
    >
      {/* ContentEditable in-place editing body */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onMouseUp={updateBubblePosition}
        data-placeholder={placeholder || 'Tulis catatan atau rincian keterangan...'}
        className="outline-none max-h-[380px] overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap font-sans selection:bg-[#cce2ff] p-2 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        style={{
          minHeight: minHeight || '50px',
          color: isNotionLight ? '#0f172a' : '#f8fafc',
          caretColor: isNotionLight ? '#0f172a' : '#38bdf8',
          lineHeight: '1.6'
        }}
      />

      {/* Bottom Action Bar */}
      {showActionButtons && (
        <div className="flex items-center justify-between pt-2 px-2 pb-1 border-t border-slate-200 dark:border-slate-700/60 mt-1">
          <p className="text-[10px] text-slate-500 font-medium">
            💡 Sorot teks untuk memberi format warna/tebal. Klik <strong className="text-teal-700 dark:text-teal-400">Selesai Edit</strong> untuk menyimpan.
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => onSave(getCleanMarkdown())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Selesai Edit</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Notion Bubble Toolbar in Freeform Mode */}
      <FloatingNotionBubbleToolbar
        bubblePos={bubblePos}
        bubbleRef={bubbleRef}
        isColorMenuOpen={isColorMenuOpen}
        setIsColorMenuOpen={setIsColorMenuOpen}
        onApplyColor={handleApplyColor}
        onApplyHighlight={handleApplyHighlight}
        onExecCmd={execCmd}
        onClearFormat={handleClearFormat}
        onInsertLink={handleInsertLink}
        onToggleBullet={handleToggleBullet}
        isBulletActive={isBulletActive}
        isNotionLight={isNotionLight}
      />
    </div>
  );
};
