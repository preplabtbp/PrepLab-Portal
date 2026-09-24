import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { EnterpriseWysiwygEditor } from './EnterpriseWysiwygEditor';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!multiline && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(text.length, text.length);
    }
  }, [multiline]);

  if (multiline) {
    return (
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full my-1.5 animate-in fade-in zoom-in-95 duration-150"
      >
        <EnterpriseWysiwygEditor
          value={text}
          onChange={setText}
          onSave={onSave}
          onCancel={onCancel}
          label={fieldLabel}
          allowModeSwitch={true}
          placeholder="Tuliskan keterangan / rincian kegiatan..."
          rows={3}
        />
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSave(text);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full my-1 p-1.5 rounded-xl border-2 transition-all shadow-md font-sans text-xs select-text animate-in fade-in duration-150 flex items-center gap-1.5"
      style={{
        backgroundColor: 'var(--input-bg, #1a1a1a)',
        borderColor: '#14b8a6',
        color: 'var(--text-main, #f1f5f9)'
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Tulis ${fieldLabel.toLowerCase()}...`}
        className="flex-1 text-xs font-semibold p-1.5 rounded-lg border outline-none transition-colors"
        style={{
          backgroundColor: 'var(--card-bg, #222)',
          color: 'var(--text-main, #f1f5f9)',
          borderColor: 'var(--border-main, #334155)'
        }}
      />
      <button
        type="button"
        onClick={onCancel}
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        title="Batal (Esc)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onSave(text)}
        className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all cursor-pointer shadow-xs"
        title="Simpan (Enter)"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
