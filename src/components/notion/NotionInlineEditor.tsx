import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, ChevronDown, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { 
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
}

export const NotionInlineEditor: React.FC<NotionInlineEditorProps> = ({
  initialValue,
  fieldLabel,
  onSave,
  onCancel,
  multiline = true
}) => {
  // --- SINGLE LINE MODE (e.g. Judul Kegiatan, Completed Time) ---
  const [singleText, setSingleText] = useState(initialValue || '');
  const singleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!multiline && singleInputRef.current) {
      singleInputRef.current.focus();
      singleInputRef.current.setSelectionRange(singleText.length, singleText.length);
    }
  }, [multiline]);

  if (!multiline) {
    const handleKeyDownSingle = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSave(singleText);
      }
    };

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full my-1 p-1.5 rounded-xl border-2 transition-all shadow-md font-sans text-xs select-text animate-in fade-in duration-150 flex items-center gap-1.5"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#0d9488',
          color: '#0f172a'
        }}
      >
        <input
          ref={singleInputRef}
          type="text"
          value={singleText}
          onChange={(e) => setSingleText(e.target.value)}
          onKeyDown={handleKeyDownSingle}
          placeholder={`Tulis ${fieldLabel.toLowerCase()}...`}
          className="flex-1 text-xs font-semibold p-1.5 rounded-lg border outline-none transition-colors"
          style={{
            backgroundColor: '#f8fafc',
            color: '#0f172a',
            borderColor: '#cbd5e1'
          }}
        />
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg border font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#cbd5e1',
            color: '#1e293b'
          }}
          title="Batal (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onSave(singleText)}
          className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all cursor-pointer shadow-xs"
          title="Simpan (Enter)"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // --- MULTILINE NOTION INLINE SELECTION BUBBLE EDITOR ---
  return (
    <NotionMultilineBubbleEditor
      initialValue={initialValue}
      fieldLabel={fieldLabel}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};

interface NotionMultilineBubbleEditorProps {
  initialValue: string;
  fieldLabel: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}

const NotionMultilineBubbleEditor: React.FC<NotionMultilineBubbleEditorProps> = ({
  initialValue,
  fieldLabel,
  onSave,
  onCancel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Bubble toolbar position
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const lastSavedRangeRef = useRef<Range | null>(null);

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
    const left = Math.max(12, Math.min(window.innerWidth - bubbleWidth - 12, rect.left));
    const top = rect.bottom + 8;

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

  // Outside click to save
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        bubbleRef.current && !bubbleRef.current.contains(target)
      ) {
        // Auto-save on outside click
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
    // Restore range if needed
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
      // Clear color
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, '#0f172a');
      document.execCommand('removeFormat');
    } else {
      // Create colored span with data-color for lossless Markdown roundtrip
      const span = document.createElement('span');
      span.style.color = hex;
      span.style.fontWeight = '600';
      span.setAttribute('data-color', colorKey);

      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      } catch (err) {
        // Fallback using execCommand
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
      onCancel();
      return;
    }

    // Ctrl+Enter or Cmd+Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave(getCleanMarkdown());
      return;
    }

    // Smart bullet point on regular Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const textBefore = sel.anchorNode.textContent || '';
        // If current line begins with bullet or dash, auto-insert next bullet
        if (textBefore.trim().startsWith('- ') || textBefore.trim().startsWith('• ')) {
          // Allow default Enter to break into new div or list item
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      className="w-full my-1.5 p-3 rounded-2xl border-2 border-teal-500 bg-white dark:bg-[#18181b] shadow-xl animate-in fade-in zoom-in-98 duration-100 font-sans relative"
      style={{
        minWidth: '320px',
        maxWidth: '100%'
      }}
    >
      {/* Editor Header Note */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800 text-[10.5px]">
        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500 inline-block animate-pulse" />
          Edit {fieldLabel} Langsung di Tabel
        </span>
        <span className="text-slate-500 font-medium">
          Blok / seleksi teks untuk mewarnai &amp; format
        </span>
      </div>

      {/* ContentEditable in-place editing body */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onMouseUp={updateBubblePosition}
        onKeyUp={updateBubblePosition}
        className="outline-none min-h-[90px] max-h-[320px] overflow-y-auto text-xs sm:text-[13px] leading-relaxed text-slate-950 dark:text-slate-100 whitespace-pre-wrap font-sans selection:bg-blue-200/90 dark:selection:bg-blue-900/80 p-1"
        style={{
          caretColor: '#0d9488',
          lineHeight: '1.65'
        }}
      />

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-mono">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[9px]">Ctrl+Enter</kbd>
          <span>Simpan</span>
          <span className="opacity-40">•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[9px]">Esc</kbd>
          <span>Batal</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSave(getCleanMarkdown())}
            className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* FLOATING NOTION SELECTION BUBBLE TOOLBAR (Portaled to body) */}
      {bubblePos && createPortal(
        <div
          ref={bubbleRef}
          onMouseDown={(e) => {
            // Prevent blur of contentEditable so selection isn't destroyed
            e.preventDefault();
          }}
          className="fixed z-[99999] flex items-center gap-0.5 p-1 rounded-xl bg-white dark:bg-[#222225] border border-slate-200 dark:border-slate-700 shadow-2xl text-slate-800 dark:text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100 select-none font-sans"
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
              className="px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white cursor-pointer"
              title="Pilih Warna Teks Notion"
            >
              <span className="underline decoration-teal-500 font-black text-sm">A</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Notion Color Swatches Menu */}
            {isColorMenuOpen && (
              <div 
                className="absolute top-full left-0 mt-1.5 p-2 rounded-xl bg-white dark:bg-[#1f1f23] border border-slate-200 dark:border-slate-700 shadow-2xl z-[100000] grid grid-cols-3 gap-1.5 min-w-[210px]"
                onMouseDown={(e) => e.preventDefault()}
              >
                {Object.entries(NOTION_COLORS).map(([key, conf]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyColor(conf.hex, key)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-300 dark:border-slate-600 shadow-2xs" 
                      style={{ backgroundColor: conf.hex }} 
                    />
                    <span className="truncate" style={{ color: conf.hex }}>{conf.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 my-auto mx-0.5" />

          {/* B (Bold) */}
          <button
            type="button"
            onClick={() => execCmd('bold')}
            className="px-2 py-1 rounded-lg font-black hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-900 dark:text-white"
            title="Tebal (Ctrl+B)"
          >
            B
          </button>

          {/* I (Italic) */}
          <button
            type="button"
            onClick={() => execCmd('italic')}
            className="px-2 py-1 rounded-lg italic font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-900 dark:text-white"
            title="Miring (Ctrl+I)"
          >
            I
          </button>

          {/* U (Underline) */}
          <button
            type="button"
            onClick={() => execCmd('underline')}
            className="px-2 py-1 rounded-lg underline font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-900 dark:text-white"
            title="Garis Bawah (Ctrl+U)"
          >
            U
          </button>

          {/* S (Strikethrough) */}
          <button
            type="button"
            onClick={() => execCmd('strikeThrough')}
            className="px-2 py-1 rounded-lg line-through font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-900 dark:text-white"
            title="Coret"
          >
            S
          </button>

          {/* Tx (Clear format) */}
          <button
            type="button"
            onClick={handleClearFormat}
            className="px-2 py-1 rounded-lg font-bold text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Hapus Warna & Format"
          >
            Tx
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 my-auto mx-0.5" />

          {/* Link */}
          <button
            type="button"
            onClick={handleInsertLink}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
            title="Tautan / Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          {/* Code */}
          <button
            type="button"
            onClick={() => execCmd('code')}
            className="px-1.5 py-1 rounded-lg font-mono text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
            title="Kode"
          >
            &lt;/&gt;
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
