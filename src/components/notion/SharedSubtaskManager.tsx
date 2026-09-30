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
  Edit2
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
  TaskItem 
} from './tasklist-utils';
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

  // 1. Toggle Checkbox
  const handleToggle = (itemIndex: number) => {
    if (isReadOnly) {
      toast.warning('Mode Read-Only. Perubahan checklist tidak dapat dilakukan.');
      return;
    }
    const todayStr = selectedDate || new Date().toISOString().split('T')[0];
    const updated = toggleTasklistItem(value || '', itemIndex, todayStr);
    onChange(updated);

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
    const updated = appendTasklistItem(value || '', cleanTitle);
    onChange(updated);
    setNewSubtaskInput('');
  };

  // 3. Remove Subtask
  const handleRemoveSubtask = (itemIndex: number) => {
    if (isReadOnly) return;
    const updated = removeTasklistItem(value || '', itemIndex);
    onChange(updated);
  };

  // 4. Update Subtask Title
  const handleCommitTitle = (itemIndex: number) => {
    if (isReadOnly || editingTitleIdx === null) return;
    const cleanTitle = editingTitleValue.trim();
    if (cleanTitle) {
      const updated = updateTasklistItemTitle(value || '', itemIndex, cleanTitle);
      onChange(updated);
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
    onChange(updated);
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
    onChange(updated);

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
    onChange(updated);

    const updatedProg = parseTasklist(updated);
    const updatedItem = updatedProg.items.find(i => i.index === activeNoteModal.itemIndex);
    setActiveNoteModal(prev => prev ? {
      ...prev,
      notes: updatedItem?.notes || []
    } : null);
    toast.success('Catatan berhasil dihapus');
  };

  // 7. Extra Notes / General Instructions Sync
  const handleExtraNotesChange = (text: string) => {
    setExtraNotes(text);
    const checklistLines = progress.items.map(item => {
      let line = `- [${item.checked ? 'x' : ' '}] ${item.text}`;
      if (item.checkedDate) line += ` <!--checkedDate:${item.checkedDate}-->`;
      if (item.notes && item.notes.length > 0) {
        line += ` <!--notes:${JSON.stringify(item.notes)}-->`;
      }
      return line;
    });
    const delimiter = /<br\s*\/?>/i.test(value || '') ? '<br/>' : '\n';
    let combined = '';
    if (text.trim() && checklistLines.length > 0) {
      combined = `${text.trim()}${delimiter}${delimiter}${checklistLines.join(delimiter)}`;
    } else if (checklistLines.length > 0) {
      combined = checklistLines.join(delimiter);
    } else {
      combined = text.trim();
    }
    onChange(combined);
  };

  // Determine progress color
  const isDone = progress.isAllCompleted && progress.total > 0;
  const isInProgress = progress.percentage > 0 && !isDone;
  const progressBgClass = isDone ? 'bg-emerald-500' : isInProgress ? 'bg-teal-500' : 'bg-slate-300';
  const progressBadgeClass = isDone 
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
    : isInProgress 
    ? 'bg-amber-100 text-amber-900 border-amber-300' 
    : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <div 
      className="space-y-3 p-3.5 sm:p-4 rounded-2xl border transition-all"
      style={{
        backgroundColor: 'var(--card-bg, #ffffff)',
        borderColor: 'var(--border-main, #cbd5e1)',
        color: 'var(--text-main, #0f172a)'
      }}
    >
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-extrabold text-xs sm:text-sm tracking-tight">{label}</span>
          {progress.hasTasklist && (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${progressBadgeClass}`}>
              {progress.completed}/{progress.total} Selesai ({progress.percentage}%)
            </span>
          )}
        </div>

        {/* Mode Switch Toggle (Checklist vs Freeform Text) */}
        {allowModeSwitch && (
          <div className="flex items-center gap-1 p-0.5 rounded-xl border bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMode('checklist')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'checklist'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>Checklist</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('text');
                setFreeformText(value || '');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'text'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Teks Bebas</span>
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar (If in checklist mode) */}
      {showProgressBar && mode === 'checklist' && progress.hasTasklist && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500">
            <span>Otomatisasi Status: {isDone ? 'Closed (100%)' : isInProgress ? 'On Progress' : 'Open (0%)'}</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
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
              <div className="p-4 rounded-xl border border-dashed text-center text-xs text-slate-400">
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
                    className={`flex items-start gap-2 p-2 rounded-xl border transition-all select-none ${
                      isDragging
                        ? 'opacity-40 border-2 border-dashed border-teal-500 bg-teal-50/50'
                        : item.checked
                        ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:shadow-2xs'
                    } ${isDragOver ? 'border-t-2 border-teal-600 bg-teal-50/40' : ''}`}
                  >
                    {/* Drag Handle */}
                    {!isReadOnly && (
                      <div 
                        className="cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-teal-600 transition-colors shrink-0 mt-0.5"
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
                        <CheckSquare className="w-4 h-4 text-teal-600 fill-teal-50 dark:fill-teal-950" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 hover:text-teal-600" />
                      )}
                    </button>

                    {/* Subtask Text / Inline Title Editor */}
                    <div className="flex-1 min-w-0">
                      {isEditingThisTitle ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitTitle(item.index);
                              if (e.key === 'Escape') setEditingTitleIdx(null);
                            }}
                            onBlur={() => handleCommitTitle(item.index)}
                            className="w-full text-xs font-bold px-2 py-1 rounded-lg border border-teal-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                                ? 'line-through text-slate-400 font-normal' 
                                : 'font-bold text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {item.text}
                          </span>

                          {/* Checked Date Badge */}
                          {item.checkedDate && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 inline-flex items-center gap-0.5 w-fit">
                              Diceklis: {item.checkedDate}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Note Popover (!) and Edit/Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Subtask Note (!) Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNoteModal(item);
                        }}
                        title={noteCount > 0 ? `${noteCount} Catatan Subtask (Klik untuk lihat)` : 'Tambah catatan subtask (!)'}
                        className={`relative p-1 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                          noteCount > 0
                            ? 'text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 shadow-2xs'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {noteCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs">
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
                          className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer"
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
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 text-xs rounded-xl border outline-none font-medium focus:border-teal-500 transition-all bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>
          )}

          {/* Extra Notes (Non-Checklist Part) */}
          <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
            <label className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
              Catatan Umum / Instruksi Khusus (Opsional)
            </label>
            <textarea
              rows={2}
              disabled={isReadOnly}
              value={extraNotes}
              onChange={(e) => handleExtraNotesChange(e.target.value)}
              placeholder="Instruksi tambahan, parameter khusus, atau keterangan ringkas..."
              className="w-full text-xs font-sans p-2 rounded-xl border outline-none resize-none focus:border-teal-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
            />
          </div>
        </div>
      ) : (
        /* Mode Freeform Text View */
        <div className="space-y-2">
          <textarea
            rows={5}
            disabled={isReadOnly}
            value={freeformText}
            onChange={(e) => {
              setFreeformText(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="Tuliskan keterangan naratif atau laporan detail..."
            className="w-full text-xs font-sans p-3 rounded-xl border outline-none resize-y focus:border-teal-500 leading-relaxed bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
          />
          <p className="text-[11px] text-slate-400">
            Tip: Anda dapat beralih ke Mode Checklist kapan saja untuk memformat rincian tugas menjadi to-do checklist terstruktur.
          </p>
        </div>
      )}

      {/* Subtask Note Modal (Identik dengan Log Book) */}
      {activeNoteModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setActiveNoteModal(null)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Catatan Khusus Subtask</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {activeNoteModal.itemText}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveNoteModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notes History List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px] max-h-[300px]">
              {activeNoteModal.notes.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  Belum ada catatan temuan/kendala untuk subtask ini.
                </div>
              ) : (
                activeNoteModal.notes.map((note) => (
                  <div 
                    key={note.id}
                    className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <div className="flex items-center gap-2">
                        {note.author && (
                          <span className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
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
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                          title="Hapus catatan ini"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Input */}
            {!isReadOnly && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
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
                  className="w-full text-xs font-sans p-2.5 rounded-xl border outline-none resize-none focus:border-teal-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Tekan Enter untuk menyimpan catatan</span>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
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
