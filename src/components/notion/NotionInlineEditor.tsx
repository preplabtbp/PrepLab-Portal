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
  Type 
} from 'lucide-react';
import { 
  parseTasklist,
  stripColorTags,
  SubtaskNote,
  markdownToVisualHtml, 
  visualHtmlToMarkdown, 
  NOTION_COLORS 
} from './tasklist-utils';

interface NotionInlineEditorProps {
  initialValue: string;
  fieldLabel: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  multiline?: boolean;
  isNotionLight?: boolean;
}

export const NotionInlineEditor: React.FC<NotionInlineEditorProps> = ({
  initialValue,
  fieldLabel,
  onSave,
  onCancel,
  multiline = true,
  isNotionLight = true
}) => {
  // --- SINGLE LINE MODE (e.g. Judul Kegiatan, Completed Time) ---
  const [singleText, setSingleText] = useState(initialValue || '');
  const singleInputRef = useRef<HTMLInputElement>(null);
  const singleContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!multiline && singleInputRef.current) {
      singleInputRef.current.focus();
      singleInputRef.current.setSelectionRange(singleText.length, singleText.length);
    }
  }, [multiline, singleText.length]);

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
        className="w-full rounded border p-1 font-sans text-xs transition-all shadow-xs"
        style={{
          backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
          color: isNotionLight ? '#0f172a' : '#f8fafc',
          borderColor: isNotionLight ? '#cbd5e1' : '#475569',
        }}
      >
        <input
          ref={singleInputRef}
          type="text"
          value={singleText}
          onChange={(e) => setSingleText(e.target.value)}
          onKeyDown={handleKeyDownSingle}
          onBlur={() => onSave(singleText)}
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
}> = ({ initialValue, fieldLabel, onSave, onCancel, isNotionLight }) => {
  const parsed = parseTasklist(initialValue);
  const [mode, setMode] = useState<'tasklist' | 'freeform'>(() => 
    parsed.hasTasklist ? 'tasklist' : 'freeform'
  );
  const [currentVal, setCurrentVal] = useState(initialValue || '');

  if (mode === 'tasklist') {
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
      onSwitchToTasklist={(text) => {
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
  onExecCmd: (cmd: string, val?: string) => void;
  onClearFormat: () => void;
  onInsertLink: () => void;
}

export const FloatingNotionBubbleToolbar: React.FC<FloatingNotionBubbleToolbarProps> = ({
  bubblePos,
  bubbleRef,
  isColorMenuOpen,
  setIsColorMenuOpen,
  onApplyColor,
  onExecCmd,
  onClearFormat,
  onInsertLink
}) => {
  if (!bubblePos) return null;

  return createPortal(
    <div
      ref={bubbleRef}
      onMouseDown={(e) => {
        // Prevent blur of contentEditable so selection isn't destroyed
        e.preventDefault();
      }}
      className="fixed z-[99999] p-1 rounded-xl bg-white border border-slate-200 shadow-xl text-slate-700 text-xs animate-in fade-in zoom-in-95 duration-100 select-none font-sans flex items-center gap-0.5"
      style={{
        top: `${bubblePos.top}px`,
        left: `${bubblePos.left}px`
      }}
    >
      {/* A (Color Dropdown Picker) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
          className="px-1.5 py-1 rounded hover:bg-slate-100 transition-colors text-slate-800 cursor-pointer font-bold flex items-center gap-0.5"
          title="Pilih Warna Teks"
        >
          <span className="underline decoration-pink-500 font-bold text-xs">A</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {/* Notion Color Swatches Menu */}
        {isColorMenuOpen && (
          <div 
            className="absolute top-full left-0 mt-1 p-2 rounded-xl bg-white border border-slate-200 shadow-2xl z-[100000] grid grid-cols-3 gap-1 min-w-[200px]"
            onMouseDown={(e) => e.preventDefault()}
          >
            {Object.entries(NOTION_COLORS).map(([key, conf]) => (
              <button
                key={key}
                type="button"
                onClick={() => onApplyColor(conf.hex, key)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium hover:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <span 
                  className="w-3 h-3 rounded-full shrink-0 border border-slate-200 shadow-2xs" 
                  style={{ backgroundColor: conf.hex }} 
                />
                <span className="truncate" style={{ color: conf.hex }}>{conf.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-3.5 bg-slate-200 my-auto mx-0.5" />

      {/* B (Bold) */}
      <button
        type="button"
        onClick={() => onExecCmd('bold')}
        className="px-1.5 py-1 rounded hover:bg-slate-100 font-bold text-xs cursor-pointer text-slate-800"
        title="Tebal (Ctrl+B)"
      >
        B
      </button>

      {/* I (Italic) */}
      <button
        type="button"
        onClick={() => onExecCmd('italic')}
        className="px-1.5 py-1 rounded hover:bg-slate-100 italic font-serif text-xs cursor-pointer text-slate-800"
        title="Miring (Ctrl+I)"
      >
        I
      </button>

      {/* U (Underline) */}
      <button
        type="button"
        onClick={() => onExecCmd('underline')}
        className="px-1.5 py-1 rounded hover:bg-slate-100 underline text-xs cursor-pointer text-slate-800"
        title="Garis Bawah (Ctrl+U)"
      >
        U
      </button>

      {/* S (Strikethrough) */}
      <button
        type="button"
        onClick={() => onExecCmd('strikeThrough')}
        className="px-1.5 py-1 rounded hover:bg-slate-100 line-through text-xs cursor-pointer text-slate-800"
        title="Coret"
      >
        S
      </button>

      {/* Tx (Clear format) */}
      <button
        type="button"
        onClick={onClearFormat}
        className="px-1.5 py-1 rounded hover:bg-slate-100 font-medium text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
        title="Hapus Warna & Format"
      >
        Tx
      </button>

      <div className="w-[1px] h-3.5 bg-slate-200 my-auto mx-0.5" />

      {/* Link */}
      <button
        type="button"
        onClick={onInsertLink}
        className="p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-600"
        title="Tautan / Link"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>

      {/* Code */}
      <button
        type="button"
        onClick={() => onExecCmd('code')}
        className="px-1 py-0.5 rounded font-mono text-[10px] hover:bg-slate-100 cursor-pointer text-slate-600"
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
    const bubbleWidth = 260;
    const left = Math.max(12, Math.min(window.innerWidth - bubbleWidth - 12, rect.right - 60));
    const top = rect.bottom + 6;

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

    if (colorKey === 'default') {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, '#0f172a');
      document.execCommand('removeFormat');
    } else {
      const span = document.createElement('span');
      span.style.color = hex;
      span.style.fontWeight = '600';
      span.setAttribute('data-color', colorKey);

      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      } catch (err) {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, hex);
      }
    }

    setIsColorMenuOpen(false);
    setBubblePos(null);
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
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        bubbleRef.current && !bubbleRef.current.contains(target)
      ) {
        const md = serializeToMarkdown();
        onSave(md);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [serializeToMarkdown, onSave]);

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
              className={`flex-1 text-xs outline-none bg-transparent min-h-[20px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none ${
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
        onExecCmd={execCmd}
        onClearFormat={handleClearFormat}
        onInsertLink={handleInsertLink}
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
}

const NotionMultilineBubbleEditor: React.FC<NotionMultilineBubbleEditorProps> = ({
  initialValue,
  fieldLabel,
  onSave,
  onCancel,
  onSwitchToTasklist,
  isNotionLight
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
    const bubbleWidth = 260;
    const left = Math.max(12, Math.min(window.innerWidth - bubbleWidth - 12, rect.right - 60));
    const top = rect.bottom + 6;

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
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        bubbleRef.current && !bubbleRef.current.contains(target)
      ) {
        const finalMd = getCleanMarkdown();
        onSave(finalMd);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [getCleanMarkdown, onSave]);

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

  // Apply Notion Color Tag to selected text
  const handleApplyColor = (hex: string, colorKey: string) => {
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    } else if (lastSavedRangeRef.current) {
      range = lastSavedRangeRef.current;
    }

    if (!range) return;

    if (colorKey === 'default') {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, '#0f172a');
      document.execCommand('removeFormat');
    } else {
      const span = document.createElement('span');
      span.style.color = hex;
      span.style.fontWeight = '600';
      span.setAttribute('data-color', colorKey);

      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      } catch (err) {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, hex);
      }
    }

    setIsColorMenuOpen(false);
    setBubblePos(null);
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
        onKeyUp={updateBubblePosition}
        className="outline-none min-h-[44px] max-h-[360px] overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap font-sans selection:bg-[#cce2ff] p-1.5"
        style={{
          color: isNotionLight ? '#0f172a' : '#f8fafc',
          caretColor: isNotionLight ? '#0f172a' : '#38bdf8',
          lineHeight: '1.6'
        }}
      />

      {/* Mini Bottom Toolbar */}
      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] select-none px-1">
        <button
          type="button"
          onClick={handleConvertToTasklist}
          className="inline-flex items-center gap-1 font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-teal-50"
          title="Ubah teks ini menjadi daftar checklist"
        >
          <ListTodo className="w-3 h-3" />
          <span>Ubah ke Checklist</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer font-medium"
            title="Batal edit (Esc)"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => onSave(getCleanMarkdown())}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Simpan perubahan (Ctrl+Enter)"
          >
            <Check className="w-3 h-3" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Floating Notion Bubble Toolbar in Freeform Mode */}
      <FloatingNotionBubbleToolbar
        bubblePos={bubblePos}
        bubbleRef={bubbleRef}
        isColorMenuOpen={isColorMenuOpen}
        setIsColorMenuOpen={setIsColorMenuOpen}
        onApplyColor={handleApplyColor}
        onExecCmd={execCmd}
        onClearFormat={handleClearFormat}
        onInsertLink={handleInsertLink}
      />
    </div>
  );
};
