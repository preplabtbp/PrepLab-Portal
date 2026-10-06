import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  RotateCcw, Edit3, Check, Trash2, BookmarkCheck, Sparkles 
} from 'lucide-react';
import { WidgetSize } from './types';

interface CalendarWidgetProps {
  size: WidgetSize;
  isEditMode?: boolean;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ size }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('preplab_calendar_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [memoInput, setMemoInput] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper date key for notes (YYYY-MM-DD)
  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const selectedKey = getDateKey(selectedDate);

  // Sync memoInput when selectedDate changes
  useEffect(() => {
    setMemoInput(notes[selectedKey] || '');
    setIsEditingNote(false);
  }, [selectedKey, notes]);

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDayIndex }, (_, i) => daysInPrevMonth - firstDayIndex + i + 1);
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleSelectDay = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  const handleSaveNote = () => {
    const updated = { ...notes };
    if (memoInput.trim()) {
      updated[selectedKey] = memoInput.trim();
    } else {
      delete updated[selectedKey];
    }
    setNotes(updated);
    try {
      localStorage.setItem('preplab_calendar_notes', JSON.stringify(updated));
    } catch {}
    setIsEditingNote(false);
  };

  const handleDeleteNote = () => {
    const updated = { ...notes };
    delete updated[selectedKey];
    setNotes(updated);
    setMemoInput('');
    try {
      localStorage.setItem('preplab_calendar_notes', JSON.stringify(updated));
    } catch {}
    setIsEditingNote(false);
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  const hasNote = (day: number) => {
    const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return !!notes[k];
  };

  const selectedDayFormatted = `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  return (
    <div className="relative h-full flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[var(--border-main)]/60">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[var(--text-main)]">
            {monthNames[month]} {year}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
            title="Kembali ke Hari Ini"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Hari Ini</span>
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 ${size === '2x' ? 'grid grid-cols-1 sm:grid-cols-12 gap-3 items-start' : 'space-y-2'}`}>
        {/* Calendar Matrix */}
        <div className={`${size === '2x' ? 'sm:col-span-7' : 'w-full'}`}>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-[var(--text-muted)]">
            <span className="text-rose-500">Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Prev month days */}
            {prevMonthDays.map((d, i) => (
              <div
                key={`prev-${i}`}
                className="h-6 sm:h-7 flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-600 rounded-md"
              >
                {d}
              </div>
            ))}

            {/* Current month days */}
            {currentMonthDays.map((d) => {
              const todayFlag = isToday(d);
              const selectedFlag = isSelected(d);
              const noteFlag = hasNote(d);

              return (
                <button
                  key={`day-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`h-6 sm:h-7 relative flex items-center justify-center text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    selectedFlag
                      ? 'bg-indigo-600 text-white shadow-xs scale-105 z-10'
                      : todayFlag
                        ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40 font-black'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-main)]'
                  }`}
                >
                  <span>{d}</span>
                  {/* Dot indicator for note */}
                  {noteFlag && (
                    <span 
                      className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                        selectedFlag ? 'bg-amber-300' : 'bg-indigo-500'
                      }`} 
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side Memo Panel (Always visible in 2x, or bottom preview in 1x) */}
        {size === '2x' ? (
          <div className="sm:col-span-5 h-full flex flex-col justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-[var(--border-main)]/60 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[11px] text-[var(--text-main)] flex items-center gap-1">
                  <BookmarkCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{selectedDayFormatted}</span>
                </span>
                {notes[selectedKey] && !isEditingNote && (
                  <button
                    type="button"
                    onClick={handleDeleteNote}
                    className="text-rose-500 hover:text-rose-600 p-0.5 rounded"
                    title="Hapus Memo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isEditingNote ? (
                <div className="space-y-1.5">
                  <textarea
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    placeholder="Tulis agenda / catatan tanggal ini..."
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-[var(--border-main)] focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none text-[var(--text-main)]"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingNote(false)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-[var(--text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-2.5 h-2.5" />
                      <span>Simpan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingNote(true)}
                  className="min-h-[52px] p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-dashed border-[var(--border-main)] cursor-pointer hover:border-indigo-400 transition-all flex flex-col justify-center"
                >
                  {notes[selectedKey] ? (
                    <p className="text-[11px] text-[var(--text-main)] line-clamp-3 leading-relaxed">
                      {notes[selectedKey]}
                    </p>
                  ) : (
                    <div className="text-center text-[10px] text-[var(--text-muted)] flex items-center justify-center gap-1">
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      <span>Klik untuk tambah catatan</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 text-[9.5px] text-[var(--text-muted)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Titik biru menandakan tanggal beragenda</span>
            </div>
          </div>
        ) : (
          /* In 1x Size: Compact Bottom Memo Strip */
          <div className="pt-1.5 border-t border-[var(--border-main)]/50">
            {notes[selectedKey] ? (
              <div className="text-[10px] p-1.5 rounded-lg bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border border-indigo-500/20 truncate">
                <span className="font-bold">{selectedDate.getDate()} {monthNames[selectedDate.getMonth()].slice(0, 3)}:</span> {notes[selectedKey]}
              </div>
            ) : (
              <div 
                onClick={() => {
                  const memo = prompt(`Tambah catatan untuk tanggal ${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}:`, notes[selectedKey] || '');
                  if (memo !== null) {
                    const updated = { ...notes };
                    if (memo.trim()) updated[selectedKey] = memo.trim();
                    else delete updated[selectedKey];
                    setNotes(updated);
                    localStorage.setItem('preplab_calendar_notes', JSON.stringify(updated));
                  }
                }}
                className="text-[9.5px] text-center text-[var(--text-muted)] hover:text-indigo-500 cursor-pointer py-0.5 flex items-center justify-center gap-1"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>+ Catatan {selectedDate.getDate()} {monthNames[selectedDate.getMonth()].slice(0, 3)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
