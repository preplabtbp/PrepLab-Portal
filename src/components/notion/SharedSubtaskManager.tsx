import React, { useState, useRef, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  GripVertical, 
  Plus, 
  Trash2, 
  MessageSquare, 
  AlertCircle, 
  Calendar, 
  Clock, 
  User, 
  X, 
  ListTodo, 
  FileText,
  RotateCcw,
  CheckCircle2,
  Edit2,
  Palette,
  Eye,
  Sparkles,
  Check
} from 'lucide-react';
import { 
  parseTasklist, 
  toggleTasklistItem, 
  addSubtaskNote, 
  removeSubtaskNote, 
  reorderTasklistItems, 
  appendTasklistItem,
  removeTasklistItem,
  updateTasklistItemTitle,
  TasklistProgress, 
  SubtaskNote, 
  TaskItem,
  NOTION_COLORS,
  formatColorTagsToHtml,
  markdownToVisualHtml,
  stripColorTags,
  detectLineColor,
  applyColorToText
} from './tasklist-utils';
import { 
  FloatingSelectionToolbar, 
  formatSelectedText, 
  FormatAction 
} from './FloatingSelectionToolbar';
import { NotionInlineEditor } from './NotionInlineEditor';
import { toast } from 'sonner';

export interface SharedSubtaskManagerProps {
  value: string;
  onChange: (val: string) => void;
  currentUser?: { nik?: string; name: string };
  selectedDate?: string;
  isReadOnly?: boolean;
  label?: string;
  allowModeSwitch?: boolean;
  defaultMode?: 'checklist' | 'text';
  showProgressBar?: boolean;
  compact?: boolean;
  placeholder?: string;
  onSubtaskToggled?: (itemIndex: number, newChecked: boolean, newProgress: TasklistProgress) => void;
}

export const SharedSubtaskManager: React.FC<SharedSubtaskManagerProps> = ({
  value,
  onChange,
  currentUser = { nik: '', name: 'Pengguna' },
  selectedDate,
  isReadOnly = false,
  label = 'Rincian Tugas & Checklist Subtask',
  allowModeSwitch = true,
  defaultMode,
  showProgressBar = true,
  compact = false,
  placeholder = 'Ketik butir langkah kerja baru lalu tekan Enter...',
  onSubtaskToggled
}) => {
  // Parse current value
  const progress: TasklistProgress = useMemo(() => parseTasklist(value || ''), [value]);

  // Determine mode
  const [mode, setMode] = useState<'checklist' | 'text'>(() => {
    if (defaultMode) return defaultMode;
    return progress.hasTasklist || !value?.trim() ? 'checklist' : 'text';
  });

  // Drag and Drop State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // New Subtask Input State
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Inline Title Editing State
  const [editingTitleIdx, setEditingTitleIdx] = useState<number | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // Subtask Note Modal State
  const [activeNoteModal, setActiveNoteModal] = useState<{
    itemIndex: number;
    itemText: string;
    notes: SubtaskNote[];
  } | null>(null);
  const [newNoteInput, setNewNoteInput] = useState('');

  // Freeform text state (when in 'text' mode)
  const [freeformText, setFreeformText] = useState(value || '');

  // Supplementary notes (clean text outside checklist)
  const [extraNotes, setExtraNotes] = useState(() => progress.cleanText || '');
  const [notesViewMode, setNotesViewMode] = useState<'visual' | 'edit'>('visual');
  const [freeformViewMode, setFreeformViewMode] = useState<'visual' | 'edit'>('visual');

  // Ref tracking initial values before editing for "Batal" (cancel)
  const initialNotesBeforeEditRef = useRef<string>('');
  const initialFreeformBeforeEditRef = useRef<string>('');

  // Ref tracking last value emitted by this component to prevent echo-back resets during active typing
  const lastEmittedValueRef = useRef<string | null>(null);

  const emitChange = (newVal: string) => {
    lastEmittedValueRef.current = newVal;
    onChange(newVal);
  };

  // Sync state if value prop changes from external sources
  React.useEffect(() => {
    if (lastEmittedValueRef.current !== null && value === lastEmittedValueRef.current) {
      return;
    }
    const freshProg = parseTasklist(value || '');
    if (notesViewMode !== 'edit') {
      setExtraNotes(freshProg.cleanText || '');
    }
    if (freeformViewMode !== 'edit') {
      setFreeformText(value || '');
    }
  }, [value, notesViewMode, freeformViewMode]);

  // Color Picker State
  const [selectedNewColor, setSelectedNewColor] = useState<string>('default');
  const [activeColorPickerIdx, setActiveColorPickerIdx] = useState<number | null>(null);

  // Floating Selection Toolbar State (muncul otomatis ketika teks diseleksi)
  const [activeSelection, setActiveSelection] = useState<{
    field: 'extraNotes' | 'freeformText' | 'newSubtask' | 'editTitle';
    itemIndex?: number;
    start: number;
    end: number;
    selectedText: string;
  } | null>(null);

  const handleSelectText = (
    e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>,
    field: 'extraNotes' | 'freeformText' | 'newSubtask' | 'editTitle',
    itemIndex?: number
  ) => {
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (end > start) {
      const selectedText = target.value.substring(start, end);
      setActiveSelection({ field, itemIndex, start, end, selectedText });
    } else {
      setActiveSelection(null);
    }
  };

  const handleApplyFormat = (action: FormatAction) => {
    if (!activeSelection) return;
    const { field, itemIndex, start, end } = activeSelection;

    if (field === 'extraNotes') {
      const res = formatSelectedText(extraNotes, start, end, action);
      setExtraNotes(res.newText);
      setActiveSelection({ ...activeSelection, start: res.newStart, end: res.newEnd, selectedText: res.newText.substring(res.newStart, res.newEnd) });
    } else if (field === 'freeformText') {
      const res = formatSelectedText(freeformText, start, end, action);
      setFreeformText(res.newText);
      setActiveSelection({ ...activeSelection, start: res.newStart, end: res.newEnd, selectedText: res.newText.substring(res.newStart, res.newEnd) });
    } else if (field === 'newSubtask') {
      const res = formatSelectedText(newSubtaskInput, start, end, action);
      setNewSubtaskInput(res.newText);
      setActiveSelection({ ...activeSelection, start: res.newStart, end: res.newEnd, selectedText: res.newText.substring(res.newStart, res.newEnd) });
    } else if (field === 'editTitle' && itemIndex !== undefined) {
      const res = formatSelectedText(editingTitleValue, start, end, action);
      setEditingTitleValue(res.newText);
      setActiveSelection({ ...activeSelection, start: res.newStart, end: res.newEnd, selectedText: res.newText.substring(res.newStart, res.newEnd) });
    }
  };

  // 1. Toggle Checkbox
  const handleToggle = (itemIndex: number) => {
    if (isReadOnly) {
      toast.warning('Mode Read-Only. Perubahan checklist tidak dapat dilakukan.');
      return;
    }
    const todayStr = selectedDate || new Date().toISOString().split('T')[0];
    const updated = toggleTasklistItem(value || '', itemIndex, todayStr);
    emitChange(updated);

    if (onSubtaskToggled) {
      const newProg = parseTasklist(updated);
      const targetItem = newProg.items.find(i => i.index === itemIndex);
      onSubtaskToggled(itemIndex, targetItem?.checked || false, newProg);
    }
  };

  // 2. Add New Subtask
  const handleAddSubtask = () => {
    if (isReadOnly) return;
    const cleanTitle = newSubtaskInput.trim();
    if (!cleanTitle) {
      toast.error('Judul subtask tidak boleh kosong');
      return;
    }
    const titleWithColor = selectedNewColor !== 'default' 
      ? applyColorToText(cleanTitle, selectedNewColor) 
      : cleanTitle;
    const updated = appendTasklistItem(value || '', titleWithColor);
    emitChange(updated);
    setNewSubtaskInput('');
  };

  // 2b. Change Item Color
  const handleChangeItemColor = (itemIndex: number, colorKey: string) => {
    if (isReadOnly) return;
    const item = progress.items.find(i => i.index === itemIndex);
    if (!item) return;
    const coloredTitle = applyColorToText(item.text, colorKey);
    const updated = updateTasklistItemTitle(value || '', itemIndex, coloredTitle);
    emitChange(updated);
    setActiveColorPickerIdx(null);
  };

  // 3. Remove Subtask
  const handleRemoveSubtask = (itemIndex: number) => {
    if (isReadOnly) return;
    const updated = removeTasklistItem(value || '', itemIndex);
    emitChange(updated);
  };

  // 4. Update Subtask Title
  const handleCommitTitle = (itemIndex: number) => {
    if (isReadOnly || editingTitleIdx === null) return;
    const cleanTitle = editingTitleValue.trim();
    if (cleanTitle) {
      const updated = updateTasklistItemTitle(value || '', itemIndex, cleanTitle);
      emitChange(updated);
    }
    setEditingTitleIdx(null);
    setEditingTitleValue('');
  };

  // 5. Drag and Drop Reordering
  const handleDrop = (targetIdx: number) => {
    if (isReadOnly || draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...progress.items];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const updated = reorderTasklistItems(value || '', reordered);
    emitChange(updated);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // 6. Subtask Notes Management
  const handleOpenNoteModal = (item: TaskItem) => {
    const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
      ? item.notes
      : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);

    const sortedNotes = [...rawNotes].sort((a, b) => {
      const dtA = `${a.date || ''} ${a.time || ''}`;
      const dtB = `${b.date || ''} ${b.time || ''}`;
      return dtB.localeCompare(dtA);
    });

    setActiveNoteModal({
      itemIndex: item.index,
      itemText: item.text,
      notes: sortedNotes
    });
    setNewNoteInput('');
  };

  const handleAddNote = () => {
    if (isReadOnly || !activeNoteModal) return;
    const noteText = newNoteInput.replace(/[\r\n]+/g, ' ').trim();
    if (!noteText) {
      toast.error('Catatan tidak boleh kosong');
      return;
    }
    const now = new Date();
    const actionDate = selectedDate || now.toISOString().split('T')[0];
    const actionTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const authorName = currentUser.name || 'PIC';

    const updated = addSubtaskNote(value || '', activeNoteModal.itemIndex, noteText, actionDate, actionTime, authorName);
    emitChange(updated);

    const updatedProg = parseTasklist(updated);
    const updatedItem = updatedProg.items.find(i => i.index === activeNoteModal.itemIndex);
    setActiveNoteModal(prev => prev ? {
      ...prev,
      notes: updatedItem?.notes || []
    } : null);
    setNewNoteInput('');
    toast.success('Catatan subtask berhasil ditambahkan');
  };

  const handleDeleteNote = (noteId: string) => {
    if (isReadOnly || !activeNoteModal) return;
    const updated = removeSubtaskNote(value || '', activeNoteModal.itemIndex, noteId);
    emitChange(updated);

    const updatedProg = parseTasklist(updated);
    const updatedItem = updatedProg.items.find(i => i.index === activeNoteModal.itemIndex);
    setActiveNoteModal(prev => prev ? {
      ...prev,
      notes: updatedItem?.notes || []
    } : null);
    toast.success('Catatan berhasil dihapus');
  };

  // 7. Extra Notes & Freeform Text Management (Manual Save - No autosave per keystroke to prevent modal flickering)
  const handleStartEditNotes = () => {
    if (isReadOnly) return;
    initialNotesBeforeEditRef.current = extraNotes;
    setNotesViewMode('edit');
  };

  const handleCancelExtraNotes = () => {
    setExtraNotes(initialNotesBeforeEditRef.current);
    setNotesViewMode('visual');
    setActiveSelection(null);
  };

  const handleSaveExtraNotes = (newNotesText?: string) => {
    const textToSave = newNotesText !== undefined ? newNotesText : extraNotes;
    setExtraNotes(textToSave);
    const freshProgress = parseTasklist(value || '');
    const checklistLines = freshProgress.items.map(item => {
      let line = `- [${item.checked ? 'x' : ' '}] ${item.text}`;
      if (item.checkedDate) line += ` <!--checkedDate:${item.checkedDate}-->`;
      if (item.notes && item.notes.length > 0) {
        line += ` <!--notes:${JSON.stringify(item.notes)}-->`;
      }
      return line;
    });
    const delimiter = /<br\s*\/?>/i.test(value || '') ? '<br/>' : '\n';
    let combined = '';
    const trimmedNotes = textToSave.trim();
    if (trimmedNotes && checklistLines.length > 0) {
      combined = `${trimmedNotes}${delimiter}${delimiter}${checklistLines.join(delimiter)}`;
    } else if (checklistLines.length > 0) {
      combined = checklistLines.join(delimiter);
    } else {
      combined = trimmedNotes;
    }
    emitChange(combined);
    setNotesViewMode('visual');
    setActiveSelection(null);
    toast.success('Catatan berhasil diperbarui');
  };

  const handleResetTagNotes = () => {
    const cleaned = stripColorTags(extraNotes).replace(/(\*\*|~~|\*|`)/g, '');
    setExtraNotes(cleaned);
    if (notesViewMode === 'visual') {
      const freshProgress = parseTasklist(value || '');
      const checklistLines = freshProgress.items.map(item => {
        let line = `- [${item.checked ? 'x' : ' '}] ${item.text}`;
        if (item.checkedDate) line += ` <!--checkedDate:${item.checkedDate}-->`;
        if (item.notes && item.notes.length > 0) {
          line += ` <!--notes:${JSON.stringify(item.notes)}-->`;
        }
        return line;
      });
      const delimiter = /<br\s*\/?>/i.test(value || '') ? '<br/>' : '\n';
      let combined = '';
      const trimmedNotes = cleaned.trim();
      if (trimmedNotes && checklistLines.length > 0) {
        combined = `${trimmedNotes}${delimiter}${delimiter}${checklistLines.join(delimiter)}`;
      } else if (checklistLines.length > 0) {
        combined = checklistLines.join(delimiter);
      } else {
        combined = trimmedNotes;
      }
      emitChange(combined);
    }
    toast.success('Format dan tag teks berhasil dibersihkan!');
  };

  const handleStartEditFreeform = () => {
    if (isReadOnly) return;
    initialFreeformBeforeEditRef.current = freeformText;
    setFreeformViewMode('edit');
  };

  const handleCancelFreeform = () => {
    setFreeformText(initialFreeformBeforeEditRef.current);
    setFreeformViewMode('visual');
    setActiveSelection(null);
  };

  const handleSaveFreeform = (newText?: string) => {
    const textToSave = newText !== undefined ? newText : freeformText;
    setFreeformText(textToSave);
    emitChange(textToSave);
    setFreeformViewMode('visual');
    setActiveSelection(null);
    toast.success('Keterangan berhasil diperbarui');
  };

  const handleResetTagFreeform = () => {
    const cleaned = stripColorTags(freeformText).replace(/(\*\*|~~|\*|`)/g, '');
    setFreeformText(cleaned);
    if (freeformViewMode === 'visual') {
      emitChange(cleaned);
    }
    toast.success('Format dan tag teks berhasil dibersihkan!');
  };

  // Determine progress color
  const isDone = progress.isAllCompleted && progress.total > 0;
  const isInProgress = progress.percentage > 0 && !isDone;
  const progressBgClass = isDone ? 'bg-emerald-500' : isInProgress ? 'bg-[#2383E2]' : 'bg-[#EDEDEC] dark:bg-[#2F2F2F]';
  const progressBadgeClass = isDone 
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' 
    : isInProgress 
    ? 'bg-[#2383E2]/10 text-[#2383E2] dark:text-[#479CFF] border-[#2383E2]/25' 
    : 'bg-[#F7F7F5] dark:bg-[#252525] text-[#787774] dark:text-[#9B9A97] border-[#EDEDEC] dark:border-[#2F2F2F]';

  return (
    <div 
      className="space-y-3.5 p-3.5 sm:p-4 rounded-xl border border-[#EDEDEC] dark:border-[#2F2F2F] bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-[#E6E6E5] shadow-xs transition-colors"
    >
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#EDEDEC] dark:border-[#2F2F2F]">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-[#787774] dark:text-[#9B9A97] shrink-0" />
          <span className="font-semibold text-xs sm:text-sm text-[#37352F] dark:text-[#E6E6E5]">{label}</span>
          {progress.hasTasklist && (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium border ${progressBadgeClass}`}>
              {progress.completed}/{progress.total} Selesai ({progress.percentage}%)
            </span>
          )}
        </div>

        {/* Mode Switch Toggle (Checklist vs Freeform Text) */}
        {allowModeSwitch && (
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#F7F7F5] dark:bg-[#252525] text-xs">
            <button
              type="button"
              onClick={() => setMode('checklist')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                mode === 'checklist'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-white shadow-xs border border-[#EDEDEC] dark:border-[#2F2F2F]'
                  : 'text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#2383E2]" />
              <span>Checklist</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('text');
                setFreeformText(value || '');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                mode === 'text'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-white shadow-xs border border-[#EDEDEC] dark:border-[#2F2F2F]'
                  : 'text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#787774] dark:text-[#9B9A97]" />
              <span>Teks Bebas</span>
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar (If in checklist mode) */}
      {showProgressBar && mode === 'checklist' && progress.hasTasklist && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#787774] dark:text-[#9B9A97]">
            <span>Otomatisasi Status: {isDone ? 'Closed (100%)' : isInProgress ? 'On Progress' : 'Open (0%)'}</span>
            <span className="font-mono">{progress.percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#EDEDEC] dark:bg-[#2F2F2F] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${progressBgClass}`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Mode Checklist View */}
      {mode === 'checklist' ? (
        <div className="space-y-2.5">
          {/* List of Subtasks */}
          <div className={`space-y-1.5 ${compact ? 'max-h-48' : 'max-h-80'} overflow-y-auto pr-1`}>
            {progress.items.length === 0 ? (
              <div className="p-3.5 rounded-lg border border-dashed border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#FAFAFA] dark:bg-[#181818] text-center text-xs text-[#787774] dark:text-[#9B9A97]">
                Belum ada butir checklist subtask. Silakan tambahkan butir di bawah.
              </div>
            ) : (
              progress.items.map((item, idx) => {
                const isDragging = draggedIdx === idx;
                const isDragOver = dragOverIdx === idx && draggedIdx !== idx;
                const isEditingThisTitle = editingTitleIdx === idx;
                const noteCount = (item.notes && item.notes.length > 0) ? item.notes.length : (item.note ? 1 : 0);

                return (
                  <div
                    key={item.index}
                    draggable={!isReadOnly && !isEditingThisTitle}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(idx));
                      setDraggedIdx(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIdx !== idx) setDragOverIdx(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIdx === idx) setDragOverIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(idx);
                    }}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    className={`group flex items-start gap-2 p-2 px-2.5 rounded-lg border transition-all select-none ${
                      isDragging
                        ? 'opacity-40 border-2 border-dashed border-[#2383E2] bg-[#2383E2]/5'
                        : item.checked
                        ? 'bg-[#F7F7F5] dark:bg-[#222222] border-[#EDEDEC] dark:border-[#2F2F2F]'
                        : 'bg-white dark:bg-[#1E1E1E] border-[#EDEDEC] dark:border-[#2F2F2F] hover:border-[#D0D0CE] dark:hover:border-[#3D3D3D]'
                    } ${isDragOver ? 'border-t-2 border-[#2383E2] bg-[#2383E2]/5' : ''}`}
                  >
                    {/* Drag Handle */}
                    {!isReadOnly && (
                      <div 
                        className="cursor-grab active:cursor-grabbing p-0.5 text-[#B4B4B0] group-hover:text-[#787774] dark:group-hover:text-[#9B9A97] transition-colors shrink-0 mt-0.5"
                        title="Geser untuk mengatur urutan (Drag & Drop)"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Checkbox */}
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => handleToggle(item.index)}
                      className={`mt-0.5 shrink-0 focus:outline-none ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      title={item.checked ? 'Tandai belum selesai' : 'Tandai selesai'}
                    >
                      {item.checked ? (
                        <CheckSquare className="w-4 h-4 text-[#2383E2] fill-[#2383E2]/15 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#787774] hover:text-[#2383E2] shrink-0" />
                      )}
                    </button>

                    {/* Subtask Text / Inline Title Editor */}
                    <div className="flex-1 min-w-0">
                      {isEditingThisTitle ? (
                        <div className="flex items-center gap-1.5 relative">
                          {activeSelection?.field === 'editTitle' && activeSelection?.itemIndex === item.index && (
                            <FloatingSelectionToolbar
                              onFormat={handleApplyFormat}
                              onClose={() => setActiveSelection(null)}
                            />
                          )}
                          <input
                            type="text"
                            autoFocus
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onSelect={(e) => handleSelectText(e, 'editTitle', item.index)}
                            onKeyUp={(e) => handleSelectText(e, 'editTitle', item.index)}
                            onMouseUp={(e) => handleSelectText(e, 'editTitle', item.index)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitTitle(item.index);
                              if (e.key === 'Escape') setEditingTitleIdx(null);
                            }}
                            onBlur={() => handleCommitTitle(item.index)}
                            className="w-full text-xs font-medium px-2 py-1 rounded-md border border-[#2383E2] outline-none bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-[#E6E6E5]"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <span 
                            onDoubleClick={() => {
                              if (!isReadOnly) {
                                setEditingTitleIdx(idx);
                                setEditingTitleValue(item.text);
                              }
                            }}
                            className={`text-xs sm:text-sm leading-snug break-words ${
                              item.checked 
                                ? 'line-through text-[#9B9A97] dark:text-[#787774]' 
                                : 'font-medium text-[#37352F] dark:text-[#E6E6E5]'
                            }`}
                            dangerouslySetInnerHTML={{ __html: formatColorTagsToHtml(item.text) }}
                          />

                          {/* Checked Date Badge */}
                          {item.checkedDate && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-normal bg-[#EDEDEC] dark:bg-[#2F2F2F] text-[#787774] dark:text-[#9B9A97] inline-flex items-center gap-0.5 w-fit">
                              Diceklis: {item.checkedDate}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Note Popover (!), Color Picker, and Edit/Delete */}
                    <div className="flex items-center gap-0.5 shrink-0 relative">
                      {/* Color Picker for Subtask */}
                      {!isReadOnly && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColorPickerIdx(activeColorPickerIdx === idx ? null : idx);
                            }}
                            className="p-1 rounded-md text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#F7F7F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                            title="Ubah warna teks subtask"
                          >
                            <Palette className="w-3.5 h-3.5" />
                          </button>
                          {activeColorPickerIdx === idx && (
                            <div 
                              className="absolute right-0 top-7 z-30 p-2 bg-white dark:bg-[#222222] rounded-lg shadow-xl border border-[#EDEDEC] dark:border-[#2F2F2F] flex items-center gap-1.5 animate-in fade-in duration-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {Object.entries(NOTION_COLORS).map(([cKey, cVal]) => (
                                <button
                                  key={cKey}
                                  type="button"
                                  onClick={() => handleChangeItemColor(item.index, cKey)}
                                  title={cVal.label}
                                  className="w-5 h-5 rounded-full border border-[#EDEDEC] dark:border-[#2F2F2F] transition-transform hover:scale-125 cursor-pointer flex items-center justify-center"
                                  style={{ backgroundColor: cVal.hex }}
                                >
                                  {cKey === 'default' && <span className="text-[8px] font-bold text-[#787774]">A</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Subtask Note (!) Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNoteModal(item);
                        }}
                        title={noteCount > 0 ? `${noteCount} Catatan Subtask (Klik untuk lihat)` : 'Tambah catatan subtask (!)'}
                        className={`relative p-1 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                          noteCount > 0
                            ? 'text-[#D9730D] bg-[#D9730D]/10 hover:bg-[#D9730D]/20 border border-[#D9730D]/30'
                            : 'text-[#9B9A97] hover:text-[#D9730D] hover:bg-[#F7F7F5] dark:hover:bg-[#252525]'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {noteCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#D9730D] text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
                            {noteCount}
                          </span>
                        )}
                      </button>

                      {/* Edit Title Button */}
                      {!isReadOnly && !isEditingThisTitle && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTitleIdx(idx);
                            setEditingTitleValue(item.text);
                          }}
                          className="p-1 rounded-md text-[#9B9A97] hover:text-[#2383E2] hover:bg-[#2383E2]/10 transition-colors cursor-pointer"
                          title="Ubah teks subtask"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}

                      {/* Delete Subtask Button */}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(item.index)}
                          className="p-1 rounded-md text-[#9B9A97] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Hapus butir subtask ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Subtask Input Form */}
          {!isReadOnly && (
            <div className="pt-1">
              <div className="flex items-center gap-2 relative">
                {activeSelection?.field === 'newSubtask' && (
                  <FloatingSelectionToolbar
                    onFormat={handleApplyFormat}
                    onClose={() => setActiveSelection(null)}
                  />
                )}
                <input
                  type="text"
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onSelect={(e) => handleSelectText(e, 'newSubtask')}
                  onKeyUp={(e) => handleSelectText(e, 'newSubtask')}
                  onMouseUp={(e) => handleSelectText(e, 'newSubtask')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] focus:border-[#2383E2] outline-none transition-colors bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-[#E6E6E5] placeholder-[#9B9A97]"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2383E2] hover:bg-[#1D70C2] transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          )}

          {/* Extra Notes (Non-Checklist Part) */}
          <div className="pt-2 border-t border-[#EDEDEC] dark:border-[#2F2F2F] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
                Catatan Umum / Instruksi Khusus (Opsional)
              </label>
              <div className="flex items-center gap-1.5">
                {notesViewMode === 'visual' ? (
                  !isReadOnly && (
                    <button
                      type="button"
                      onClick={handleStartEditNotes}
                      className="px-2.5 py-1 rounded-md text-[10px] font-medium border border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#F7F7F5] dark:bg-[#252525] hover:bg-[#EFEFED] dark:hover:bg-[#333333] text-[#37352F] dark:text-[#E6E6E5] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Buka editor teks untuk mengubah catatan"
                    >
                      <Edit2 className="w-2.5 h-2.5 text-[#787774] dark:text-[#9B9A97]" />
                      <span>Edit Teks</span>
                    </button>
                  )
                ) : (
                  <span className="text-[10px] font-medium text-[#2383E2] px-2 py-0.5 rounded-full bg-[#2383E2]/10 border border-[#2383E2]/20">
                    Mode Edit Aktif
                  </span>
                )}
                {extraNotes.trim() && (
                  <button
                    type="button"
                    onClick={handleResetTagNotes}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Hapus semua tag warna / format yang berantakan"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Reset Tag</span>
                  </button>
                )}
              </div>
            </div>

            {notesViewMode === 'visual' ? (
              extraNotes.trim() ? (
                <div 
                  onClick={handleStartEditNotes}
                  className="w-full text-xs p-3 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#FAFAFA] dark:bg-[#181818] text-[#37352F] dark:text-[#E6E6E5] leading-relaxed cursor-pointer hover:border-[#D0D0CE] dark:hover:border-[#3D3D3D] transition-colors group relative"
                  title="Klik untuk mengedit catatan ini"
                >
                  <div 
                    className="space-y-1"
                    dangerouslySetInnerHTML={{ __html: formatColorTagsToHtml(markdownToVisualHtml(extraNotes)) }}
                  />
                  <div className="mt-2 pt-1 border-t border-[#EDEDEC] dark:border-[#2F2F2F] flex items-center justify-between text-[10px] text-[#9B9A97]">
                    <span>💡 Tampilan visual rapi (Notion)</span>
                    <span className="text-[#2383E2] font-medium group-hover:underline flex items-center gap-1">
                      <Edit2 className="w-2.5 h-2.5" /> Klik untuk edit
                    </span>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={handleStartEditNotes}
                  className="w-full p-2.5 rounded-lg border border-dashed border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#FAFAFA] dark:bg-[#181818] hover:bg-[#F7F7F5] dark:hover:bg-[#252525] text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white text-xs font-normal cursor-pointer transition-colors flex items-center justify-between group"
                  title="Klik untuk menambahkan catatan umum"
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Plus className="w-3.5 h-3.5 text-[#787774] dark:text-[#9B9A97] group-hover:text-[#2383E2]" />
                    <span>Belum ada catatan umum. Klik di sini untuk menambahkan...</span>
                  </span>
                  <span className="text-[10px] font-medium text-[#2383E2] opacity-0 group-hover:opacity-100 transition-opacity">
                    + Tulis Catatan
                  </span>
                </div>
              )
            ) : (
              /* Mode Edit: Real WYSIWYG Editor with FloatingNotionBubbleToolbar (Identik dengan Table Mode) */
              <div className="w-full">
                <NotionInlineEditor
                  initialValue={extraNotes}
                  fieldLabel="Catatan Umum"
                  multiline={true}
                  isNotionLight={true}
                  allowTasklistMode={false}
                  showActionButtons={true}
                  disableOutsideClickSave={true}
                  minHeight="85px"
                  placeholder="Instruksi tambahan, parameter khusus, atau keterangan ringkas..."
                  onSave={(newVal) => handleSaveExtraNotes(newVal)}
                  onCancel={handleCancelExtraNotes}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mode Freeform Text View */
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97]">Laporan / Keterangan Bebas</span>
            <div className="flex items-center gap-1.5">
              {freeformViewMode === 'visual' ? (
                !isReadOnly && (
                  <button
                    type="button"
                    onClick={handleStartEditFreeform}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium border border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#F7F7F5] dark:bg-[#252525] hover:bg-[#EFEFED] dark:hover:bg-[#333333] text-[#37352F] dark:text-[#E6E6E5] transition-colors flex items-center gap-1 cursor-pointer"
                    title="Buka editor teks untuk mengubah keterangan"
                  >
                    <Edit2 className="w-2.5 h-2.5 text-[#787774] dark:text-[#9B9A97]" />
                    <span>Edit Teks</span>
                  </button>
                )
              ) : (
                <span className="text-[10px] font-medium text-[#2383E2] px-2 py-0.5 rounded-full bg-[#2383E2]/10 border border-[#2383E2]/20">
                  Mode Edit Aktif
                </span>
              )}
              {freeformText.trim() && (
                <button
                  type="button"
                  onClick={handleResetTagFreeform}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Reset Tag</span>
                </button>
              )}
            </div>
          </div>

          {freeformViewMode === 'visual' ? (
            freeformText.trim() ? (
              <div 
                onClick={handleStartEditFreeform}
                className="w-full text-xs p-3.5 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#FAFAFA] dark:bg-[#181818] text-[#37352F] dark:text-[#E6E6E5] leading-relaxed cursor-pointer hover:border-[#D0D0CE] dark:hover:border-[#3D3D3D] transition-colors group relative"
                title="Klik untuk mengedit keterangan ini"
              >
                <div 
                  className="space-y-1.5 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatColorTagsToHtml(markdownToVisualHtml(freeformText)) }}
                />
                <div className="mt-2 pt-1 border-t border-[#EDEDEC] dark:border-[#2F2F2F] flex items-center justify-between text-[10px] text-[#9B9A97]">
                  <span>💡 Tampilan visual rapi (Notion)</span>
                  <span className="text-[#2383E2] font-medium group-hover:underline flex items-center gap-1">
                    <Edit2 className="w-2.5 h-2.5" /> Klik untuk edit
                  </span>
                </div>
              </div>
            ) : (
              <div 
                onClick={handleStartEditFreeform}
                className="w-full p-3 rounded-lg border border-dashed border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#FAFAFA] dark:bg-[#181818] hover:bg-[#F7F7F5] dark:hover:bg-[#252525] text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white text-xs font-normal cursor-pointer transition-colors flex items-center justify-between group"
                title="Klik untuk menulis laporan atau keterangan"
              >
                <span className="flex items-center gap-1.5 text-xs">
                  <Plus className="w-4 h-4 text-[#787774] dark:text-[#9B9A97] group-hover:text-[#2383E2]" />
                  <span>Belum ada keterangan. Klik di sini untuk menulis laporan / keterangan...</span>
                </span>
                <span className="text-[11px] font-medium text-[#2383E2] opacity-0 group-hover:opacity-100 transition-opacity">
                  + Tulis Keterangan
                </span>
              </div>
            )
          ) : (
            /* Mode Edit: Real WYSIWYG Editor with FloatingNotionBubbleToolbar (Identik dengan Table Mode) */
            <div className="w-full">
              <NotionInlineEditor
                initialValue={freeformText}
                fieldLabel="Laporan / Keterangan Bebas"
                multiline={true}
                isNotionLight={true}
                allowTasklistMode={false}
                showActionButtons={true}
                disableOutsideClickSave={true}
                minHeight="120px"
                placeholder="Tuliskan keterangan naratif atau laporan detail..."
                onSave={(newVal) => handleSaveFreeform(newVal)}
                onCancel={handleCancelFreeform}
              />
            </div>
          )}
          <p className="text-[11px] text-[#9B9A97] dark:text-[#787774]">
            Tip: Sorot / seleksi teks apa saja untuk memunculkan toolbar editing melayang (Warna, Bold, Italic, Strikethrough, Code).
          </p>
        </div>
      )}

      {/* Subtask Note Modal (Identik dengan Log Book) */}
      {activeNoteModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setActiveNoteModal(null)}
        >
          <div 
            className="w-full max-w-lg rounded-xl border shadow-2xl p-4 sm:p-5 space-y-4 max-h-[90vh] flex flex-col bg-white dark:bg-[#1E1E1E] border-[#EDEDEC] dark:border-[#2F2F2F] text-[#37352F] dark:text-[#E6E6E5]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EDEDEC] dark:border-[#2F2F2F]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D9730D]">
                  <AlertCircle className="w-4 h-4 text-[#D9730D]" />
                  <span>Catatan Khusus Subtask</span>
                </div>
                <h4 className="text-sm font-semibold text-[#37352F] dark:text-[#E6E6E5] line-clamp-2">
                  {activeNoteModal.itemText}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveNoteModal(null)}
                className="p-1 rounded-md text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#F7F7F5] dark:hover:bg-[#252525] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notes History List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px] max-h-[300px]">
              {activeNoteModal.notes.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#FAFAFA] dark:bg-[#181818] text-center text-xs text-[#9B9A97]">
                  Belum ada catatan temuan/kendala untuk subtask ini.
                </div>
              ) : (
                activeNoteModal.notes.map((note) => (
                  <div 
                    key={note.id}
                    className="p-3 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#FAFAFA] dark:bg-[#181818] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#787774] dark:text-[#9B9A97]">
                      <div className="flex items-center gap-2">
                        {note.author && (
                          <span className="font-medium text-[#2383E2] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {note.author}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {note.date}
                        </span>
                        {note.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {note.time}
                          </span>
                        )}
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-[#9B9A97] hover:text-rose-500 p-0.5 rounded cursor-pointer transition-colors"
                          title="Hapus catatan ini"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#37352F] dark:text-[#E6E6E5] leading-relaxed whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Input */}
            {!isReadOnly && (
              <div className="pt-2 border-t border-[#EDEDEC] dark:border-[#2F2F2F] space-y-2">
                <textarea
                  rows={2}
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                  placeholder="Ketik catatan kendala, temuan, atau perkembangan subtask..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] focus:border-[#2383E2] outline-none resize-none bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-[#E6E6E5] placeholder-[#9B9A97] transition-colors"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9B9A97]">Tekan Enter untuk menyimpan catatan</span>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2383E2] hover:bg-[#1D70C2] text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Tambah Catatan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
