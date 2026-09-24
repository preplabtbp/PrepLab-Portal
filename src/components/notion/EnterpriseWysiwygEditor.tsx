import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bold, 
  Italic, 
  Underline,
  Strikethrough, 
  Code,
  List, 
  ListOrdered,
  ListTodo, 
  Quote, 
  Sparkles, 
  Eye, 
  Edit3, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  CheckSquare, 
  Square,
  FileText,
  CornerDownLeft,
  Info
} from 'lucide-react';
import { parseTasklist, toggleTasklistItem } from './tasklist-utils';

export interface EnterpriseWysiwygEditorProps {
  value: string;
  onChange: (val: string) => void;
  onSave?: (val: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  allowModeSwitch?: boolean;
  defaultMode?: 'text' | 'checklist';
  label?: string;
  compact?: boolean;
  rows?: number;
}

interface SubtaskItem {
  id: string;
  text: string;
  checked: boolean;
}

export const EnterpriseWysiwygEditor: React.FC<EnterpriseWysiwygEditorProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = 'Tuliskan catatan, langkah kegiatan, atau checklist subtask...',
  allowModeSwitch = true,
  defaultMode,
  label = 'Keterangan & Rincian Kegiatan',
  compact = false,
  rows = 4
}) => {
  // Auto-detect if content contains markdown tasklist items
  const containsTasklist = useMemo(() => {
    return /- \[[ xX]\]/.test(value || '');
  }, [value]);

  const [mode, setMode] = useState<'text' | 'checklist'>(
    defaultMode || (containsTasklist ? 'checklist' : 'text')
  );

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subtask drafts for checklist mode
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>(() => {
    if (!value) return [{ id: '1', text: '', checked: false }];
    const normalized = value.replace(/<br\s*\/?>/gi, '\n');
    const lines = normalized.split('\n');
    const items: SubtaskItem[] = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^[\s\t]*- \[([ xX])\]\s*(.*)$/);
      if (match) {
        items.push({
          id: `item-${idx}-${Date.now()}`,
          checked: match[1].toLowerCase() === 'x',
          text: match[2].trim()
        });
      }
    });
    return items.length > 0 ? items : [{ id: '1', text: '', checked: false }];
  });

  // Notes draft (non-checklist part)
  const [notes, setNotes] = useState<string>(() => {
    if (!value) return '';
    const normalized = value.replace(/<br\s*\/?>/gi, '\n');
    const nonChecklistLines = normalized
      .split('\n')
      .filter(l => !/^[\s\t]*- \[([ xX])\]/.test(l))
      .join('\n')
      .trim();
    return nonChecklistLines;
  });

  // Keep internal text state in sync
  const [textContent, setTextContent] = useState<string>(() => (value || '').replace(/<br\s*\/?>/gi, '\n'));

  // Synchronize when value changes externally
  useEffect(() => {
    setTextContent((value || '').replace(/<br\s*\/?>/gi, '\n'));
  }, [value]);

  // Sync checklist state changes back to parent
  const emitChecklistChange = (newItems: SubtaskItem[], newNotesText: string) => {
    const validItems = newItems.filter(i => i.text.trim());
    const checklistMd = validItems
      .map(i => `- [${i.checked ? 'x' : ' '}] ${i.text.trim()}`)
      .join('\n');

    let combined = '';
    if (newNotesText.trim() && checklistMd) {
      combined = `${newNotesText.trim()}\n\n${checklistMd}`;
    } else if (checklistMd) {
      combined = checklistMd;
    } else {
      combined = newNotesText.trim();
    }

    setTextContent(combined);
    onChange(combined);
  };

  // Text Mode Formatting helper
  const insertFormatting = (prefix: string, suffix: string, placeholder = 'teks') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = textContent.substring(start, end) || placeholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const nextText = textContent.substring(0, start) + replacement + textContent.substring(end);

    setTextContent(nextText);
    onChange(nextText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 15);
  };

  const insertLinePrefix = (prefix: string, defaultText = 'Poin catatan') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const isAtStartOrNewline = start === 0 || textContent[start - 1] === '\n';
    const finalPrefix = isAtStartOrNewline ? prefix : `\n${prefix}`;
    const nextText = textContent.substring(0, start) + `${finalPrefix}${defaultText}` + textContent.substring(start);

    setTextContent(nextText);
    onChange(nextText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + finalPrefix.length, start + finalPrefix.length + defaultText.length);
    }, 15);
  };

  // Keyboard shortcut handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave?.(textContent);
    } else if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      insertFormatting('**', '**', 'teks tebal');
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      insertFormatting('*', '*', 'teks miring');
    } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      insertFormatting('<u>', '</u>', 'teks bergaris bawah');
    }
  };

  // Subtask Checklist interactions
  const handleToggleSubtask = (index: number) => {
    const updated = subtasks.map((item, i) => 
      i === index ? { ...item, checked: !item.checked } : item
    );
    setSubtasks(updated);
    emitChecklistChange(updated, notes);
  };

  const handleSubtaskTextChange = (index: number, newText: string) => {
    const updated = subtasks.map((item, i) => 
      i === index ? { ...item, text: newText } : item
    );
    setSubtasks(updated);
    emitChecklistChange(updated, notes);
  };

  const handleAddSubtask = (afterIndex?: number) => {
    const newItem: SubtaskItem = { id: `item-${Date.now()}`, text: '', checked: false };
    let updated: SubtaskItem[] = [];
    if (afterIndex !== undefined) {
      updated = [
        ...subtasks.slice(0, afterIndex + 1),
        newItem,
        ...subtasks.slice(afterIndex + 1)
      ];
    } else {
      updated = [...subtasks, newItem];
    }
    setSubtasks(updated);
    emitChecklistChange(updated, notes);
  };

  const handleDeleteSubtask = (index: number) => {
    if (subtasks.length <= 1) {
      const reset = [{ id: '1', text: '', checked: false }];
      setSubtasks(reset);
      emitChecklistChange(reset, notes);
      return;
    }
    const updated = subtasks.filter((_, i) => i !== index);
    setSubtasks(updated);
    emitChecklistChange(updated, notes);
  };

  const applyChecklistPreset = (presetItems: string[]) => {
    const newItems: SubtaskItem[] = presetItems.map((text, idx) => ({
      id: `preset-${idx}-${Date.now()}`,
      text,
      checked: false
    }));
    setSubtasks(newItems);
    emitChecklistChange(newItems, notes);
  };

  // Switch between Text mode and Checklist mode cleanly
  const handleSwitchMode = (targetMode: 'text' | 'checklist') => {
    setMode(targetMode);
    if (targetMode === 'checklist' && !containsTasklist && textContent.trim()) {
      // If user had existing text, keep it in notes
      setNotes(textContent);
      if (subtasks.length === 0 || (subtasks.length === 1 && !subtasks[0].text)) {
        setSubtasks([{ id: '1', text: '', checked: false }]);
      }
    } else if (targetMode === 'text' && containsTasklist) {
      // Switching to text: just view the raw markdown cleanly
      setTextContent(value);
    }
  };

  // Preview parsing
  const parsedPreview = useMemo(() => {
    return parseTasklist(textContent || '');
  }, [textContent]);

  const completedSubtasks = subtasks.filter(s => s.checked).length;
  const totalSubtasks = subtasks.filter(s => s.text.trim()).length;

  return (
    <div 
      className="w-full rounded-2xl border shadow-sm transition-all overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--card-bg, #ffffff)',
        borderColor: 'var(--border-main, #cbd5e1)',
        color: 'var(--text-main, #0f172a)'
      }}
    >
      {/* 1. TOP HEADER & ENTERPRISE MODE SWITCHER */}
      <div 
        className="px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs"
        style={{
          backgroundColor: 'var(--input-bg, #f8fafc)',
          borderColor: 'var(--border-main, #e2e8f0)'
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-teal-500" />
            <span>{label}</span>
          </span>

          {allowModeSwitch && (
            <div className="flex items-center p-0.5 rounded-lg border bg-slate-200/60 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSwitchMode('text')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  mode === 'text'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                📝 Mode Teks
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('checklist')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  mode === 'checklist'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ☑️ Checklist Subtask
              </button>
            </div>
          )}
        </div>

        {/* Tab Switcher: Editor vs Live Preview */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Pratinjau</span>
          </button>
        </div>
      </div>

      {/* 2. ENTERPRISE FORMATTING TOOLBAR (TEXT MODE ONLY) */}
      {mode === 'text' && activeTab === 'editor' && (
        <div 
          className="px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-1 text-slate-600 dark:text-slate-300 text-xs bg-slate-50/50 dark:bg-slate-900/30"
          style={{ borderColor: 'var(--border-main, #e2e8f0)' }}
        >
          <div className="flex items-center gap-0.5 flex-wrap">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**', 'teks tebal')}
              title="Tebal (Ctrl+B)"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*', 'teks miring')}
              title="Miring (Ctrl+I)"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<u>', '</u>', 'garis bawah')}
              title="Garis Bawah (Ctrl+U)"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('~~', '~~', 'coret')}
              title="Coret (Strikethrough)"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`', '`', 'kode')}
              title="Inline Code"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={() => insertLinePrefix('• ', 'Poin catatan')}
              title="Poin Bullet (•)"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('1. ', 'Langkah pertama')}
              title="Daftar Bernomor (1.)"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('> ', 'Catatan penting atau kutipan')}
              title="Kutipan / Blockquote (>)"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Quick Badge Helpers */}
            <button
              type="button"
              onClick={() => insertFormatting('**(Done)** ', '', '')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              + Done
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('**(OPEN)** ', '', '')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              + OPEN
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            Ctrl+Enter Simpan
          </span>
        </div>
      )}

      {/* 3. EDITOR BODY */}
      <div className="p-3 sm:p-4">
        {activeTab === 'preview' ? (
          /* Live Markdown & Tasklist Preview */
          <div className="min-h-[120px] max-h-[300px] overflow-y-auto space-y-2 p-3 rounded-xl border bg-slate-500/5 text-xs leading-relaxed" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
            {!textContent.trim() ? (
              <p className="text-slate-400 italic">Belum ada keterangan untuk ditampilkan.</p>
            ) : parsedPreview.hasTasklist ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                  <span className="font-bold text-slate-500">Progress Tasklist:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{parsedPreview.completed}/{parsedPreview.total} ({parsedPreview.percentage}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${parsedPreview.percentage}%` }} />
                </div>
                <div className="space-y-1.5 pt-1">
                  {parsedPreview.items.map(item => (
                    <div key={item.index} className="flex items-start gap-2">
                      <span className="mt-0.5 text-teal-500 font-mono font-bold">
                        {item.checked ? '☑' : '☐'}
                      </span>
                      <span className={item.checked ? 'line-through text-slate-400' : 'font-medium'}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
                {parsedPreview.cleanText && (
                  <div className="mt-3 pt-2 border-t text-slate-600 dark:text-slate-300 whitespace-pre-wrap" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                    {parsedPreview.cleanText}
                  </div>
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200">
                {textContent}
              </div>
            )}
          </div>
        ) : mode === 'text' ? (
          /* Text Mode: Enterprise Rich Text Area */
          <div className="space-y-1">
            <textarea
              ref={textareaRef}
              rows={rows}
              value={textContent}
              onChange={(e) => {
                setTextContent(e.target.value);
                onChange(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full text-xs font-sans p-3 rounded-xl border outline-none leading-relaxed resize-y focus:border-teal-500 transition-colors"
              style={{
                backgroundColor: 'var(--input-bg, #f8fafc)',
                borderColor: 'var(--border-main, #cbd5e1)',
                color: 'var(--text-main, #0f172a)'
              }}
            />
            <p className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>Mendukung format paragraf, poin bullet, dan penomoran standar.</span>
              <span className="font-mono">{textContent.length} karakter</span>
            </p>
          </div>
        ) : (
          /* Checklist Mode: Interactive Notion/Todoist Style Tasklist Builder */
          <div className="space-y-3">
            {/* Quick Templates Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Template Cepat:</span>
              </span>
              <button
                type="button"
                onClick={() => applyChecklistPreset([
                  'Pemeriksaan visual & kebersihan alat',
                  'Verifikasi sampel uji & standard reference material',
                  'Pencatatan data pengujian ke portal Prep & Lab',
                  'Pelaporan hasil ke Supervisor Seksi'
                ])}
                className="px-2 py-0.5 rounded-lg border text-[10px] font-medium hover:border-teal-500 hover:text-teal-600 transition-all cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
              >
                Pemeriksaan Standar
              </button>
              <button
                type="button"
                onClick={() => applyChecklistPreset([
                  'Kalibrasi timbangan analitik & spectrometer',
                  'Pembuatan reagen & standarisasi larutan',
                  'Validasi pembacaan blanko dan duplicate'
                ])}
                className="px-2 py-0.5 rounded-lg border text-[10px] font-medium hover:border-teal-500 hover:text-teal-600 transition-all cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
              >
                Kalibrasi & Uji
              </button>
              <button
                type="button"
                onClick={() => applyChecklistPreset([
                  'Housekeeping meja preparasi & ruang instrumen',
                  'Pemilahan limbah kimia & wadah sampel',
                  'Pengecekan stok APD personil shift'
                ])}
                className="px-2 py-0.5 rounded-lg border text-[10px] font-medium hover:border-teal-500 hover:text-teal-600 transition-all cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
              >
                Housekeeping & 5R
              </button>
            </div>

            {/* Subtask Interactive Rows */}
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {subtasks.map((item, index) => (
                <div 
                  key={item.id}
                  className="flex items-center gap-2 group/row p-1 rounded-xl hover:bg-slate-500/5 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(index)}
                    className="p-1 rounded text-teal-600 hover:bg-teal-500/10 cursor-pointer shrink-0 transition-colors"
                    title={item.checked ? "Tandai belum selesai" : "Tandai selesai"}
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-teal-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 group-hover/row:text-teal-500" />
                    )}
                  </button>

                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleSubtaskTextChange(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask(index);
                      } else if (e.key === 'Backspace' && !item.text && subtasks.length > 1) {
                        e.preventDefault();
                        handleDeleteSubtask(index);
                      }
                    }}
                    placeholder={`Item tugas #${index + 1}...`}
                    className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-all focus:border-teal-500 ${
                      item.checked ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100 font-medium'
                    }`}
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(index)}
                    className="p-1 rounded opacity-0 group-hover/row:opacity-100 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-opacity cursor-pointer shrink-0"
                    title="Hapus baris ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Item Button & Progress Counter */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleAddSubtask()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Tugas (Enter)</span>
              </button>

              <span className="text-[11px] font-mono text-slate-500">
                {completedSubtasks}/{totalSubtasks} Checklist Selesai
              </span>
            </div>

            {/* Supplementary Notes Section */}
            <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  emitChecklistChange(subtasks, e.target.value);
                }}
                placeholder="Instruksi khusus, lokasi alat, atau referensi SOP..."
                className="w-full text-xs font-sans p-2 rounded-xl border outline-none resize-none focus:border-teal-500"
                style={{
                  backgroundColor: 'var(--input-bg, #f8fafc)',
                  borderColor: 'var(--border-main, #cbd5e1)',
                  color: 'var(--text-main, #0f172a)'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. FOOTER ACTIONS (IF ONSAVE / ONCANCEL PROVIDED) */}
      {(onSave || onCancel) && (
        <div 
          className="px-3.5 py-2 border-t flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--input-bg, #f8fafc)',
            borderColor: 'var(--border-main, #e2e8f0)'
          }}
        >
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Tekan Esc untuk batal • Ctrl+Enter untuk simpan
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1 text-xs rounded-xl border font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
              >
                Batal
              </button>
            )}
            {onSave && (
              <button
                type="button"
                onClick={() => onSave(textContent)}
                className="inline-flex items-center gap-1.5 px-4 py-1 text-xs rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Keterangan</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
