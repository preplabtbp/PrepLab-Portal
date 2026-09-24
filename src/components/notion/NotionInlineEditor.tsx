import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  ListTodo, 
  List, 
  Check, 
  X, 
  Sparkles
} from 'lucide-react';

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
  const [text, setText] = useState(initialValue || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (multiline && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    } else if (!multiline && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(text.length, text.length);
    }
  }, []);

  // Helper to wrap or insert text formatting at selection
  const insertFormatting = (prefix: string, suffix: string, placeholder = 'teks') => {
    const el = textareaRef.current || inputRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selectedText = text.substring(start, end) || placeholder;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setText(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  // Helper to insert a new tasklist checkbox line
  const handleInsertTasklist = () => {
    const el = textareaRef.current || inputRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const isAtStartOrNewline = start === 0 || text[start - 1] === '\n';
    const prefix = isAtStartOrNewline ? '- [ ] ' : '\n- [ ] ';
    const placeholder = 'Rincian tugas';

    const newText = text.substring(0, start) + `${prefix}${placeholder}` + text.substring(start);
    setText(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
    }, 10);
  };

  // Helper to insert bullet point
  const handleInsertBullet = () => {
    const el = textareaRef.current || inputRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const isAtStartOrNewline = start === 0 || text[start - 1] === '\n';
    const prefix = isAtStartOrNewline ? '• ' : '\n• ';
    const placeholder = 'Poin catatan';

    const newText = text.substring(0, start) + `${prefix}${placeholder}` + text.substring(start);
    setText(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !multiline)) {
      e.preventDefault();
      onSave(text);
    } else if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      insertFormatting('**', '**', 'teks tebal');
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      insertFormatting('*', '*', 'teks miring');
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full my-1 p-2 rounded-xl border-2 transition-all shadow-md font-sans text-xs select-text animate-in fade-in duration-150"
      style={{
        backgroundColor: 'var(--input-bg, #1a1a1a)',
        borderColor: '#14b8a6',
        color: 'var(--text-main, #f1f5f9)'
      }}
    >
      {/* Integrated Enterprise Toolbar */}
      <div 
        className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b"
        style={{ borderColor: 'var(--border-main, #334155)' }}
      >
        <div className="flex items-center gap-1 flex-wrap">
          <span 
            className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/30 mr-1"
          >
            {fieldLabel}
          </span>
          <button
            type="button"
            onClick={() => insertFormatting('**', '**', 'teks tebal')}
            title="Bold (Ctrl+B)"
            className="p-1 rounded hover:bg-teal-500/15 text-slate-300 hover:text-teal-300 transition-colors cursor-pointer"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*', 'teks miring')}
            title="Italic (Ctrl+I)"
            className="p-1 rounded hover:bg-teal-500/15 text-slate-300 hover:text-teal-300 transition-colors cursor-pointer"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          {multiline && (
            <>
              <div className="w-[1px] h-3.5 bg-slate-700/60 mx-0.5" />
              <button
                type="button"
                onClick={handleInsertTasklist}
                title="Sisipkan Tasklist Checklist (- [ ])"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-semibold text-[10px] border border-teal-500/40 transition-all cursor-pointer"
              >
                <ListTodo className="w-3 h-3" />
                <span>+ Tasklist</span>
              </button>
              <button
                type="button"
                onClick={handleInsertBullet}
                title="Sisipkan Poin Bullet (•)"
                className="p-1 rounded hover:bg-teal-500/15 text-slate-300 hover:text-teal-300 transition-colors cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
          Ctrl+Enter Simpan
        </span>
      </div>

      {/* Editor Body */}
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Tulis keterangan atau gunakan tombol + Tasklist di atas..."
          className="w-full text-xs font-mono p-2 rounded-lg border outline-none resize-y transition-colors leading-relaxed"
          style={{
            backgroundColor: 'var(--card-bg, #222)',
            color: 'var(--text-main, #f1f5f9)',
            borderColor: 'var(--border-main, #334155)'
          }}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis judul kegiatan..."
          className="w-full text-xs font-semibold p-2 rounded-lg border outline-none transition-colors"
          style={{
            backgroundColor: 'var(--card-bg, #222)',
            color: 'var(--text-main, #f1f5f9)',
            borderColor: 'var(--border-main, #334155)'
          }}
        />
      )}

      {/* Action Footer */}
      <div 
        className="flex items-center justify-between gap-1.5 pt-1.5 mt-1 border-t"
        style={{ borderColor: 'var(--border-main, #334155)' }}
      >
        <span className="text-[10px] text-slate-400">
          Esc untuk batal
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 text-[11px] rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSave(text)}
            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] rounded-md bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-3 h-3" />
            <span>Terapkan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
