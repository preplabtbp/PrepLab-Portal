import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  RotateCcw, Edit3, Check, Trash2, BookmarkCheck, Sparkles, ArrowRight 
} from 'lucide-react';
import { WidgetSize } from './types';
import { getGlobalSocket } from '../../lib/socketClient';

interface CalendarWidgetProps {
  size: WidgetSize;
  isEditMode?: boolean;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
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

  // Sync calendar notes across devices & listen to socket events
  useEffect(() => {
    let isMounted = true;
    const fetchRemoteCalendarNotes = async () => {
      try {
        const res = await fetch('/api/widgets/calendar-notes');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && data.calendarNotes && Object.keys(data.calendarNotes).length > 0) {
          setNotes(data.calendarNotes);
          try {
            localStorage.setItem('preplab_calendar_notes', JSON.stringify(data.calendarNotes));
          } catch {}
        }
      } catch (err) {
        console.warn('Could not fetch calendar notes:', err);
      }
    };
    fetchRemoteCalendarNotes();

    const socket = getGlobalSocket();
    const handleRemoteCalendarUpdate = (remote: Record<string, string>) => {
      if (!isMounted) return;
      if (remote && typeof remote === 'object') {
        setNotes((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(remote)) return prev;
          try {
            localStorage.setItem('preplab_calendar_notes', JSON.stringify(remote));
          } catch {}
          return remote;
        });
      }
    };

    socket.on('widgets:calendar_notes_updated', handleRemoteCalendarUpdate);
    return () => {
      isMounted = false;
      socket.off('widgets:calendar_notes_updated', handleRemoteCalendarUpdate);
    };
  }, []);

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

  const saveCalendarNotes = (updated: Record<string, string>) => {
    setNotes(updated);
    try {
      localStorage.setItem('preplab_calendar_notes', JSON.stringify(updated));
    } catch {}
    fetch('/api/widgets/calendar-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendarNotes: updated })
    }).catch((err) => console.warn('Failed to sync calendar notes:', err));
  };

  const handleSaveNote = () => {
    const updated = { ...notes };
    if (memoInput.trim()) {
      updated[selectedKey] = memoInput.trim();
    } else {
      delete updated[selectedKey];
    }
    saveCalendarNotes(updated);
    setIsEditingNote(false);
  };

  const handleDeleteNote = () => {
    const updated = { ...notes };
    delete updated[selectedKey];
    saveCalendarNotes(updated);
    setMemoInput('');
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
          <span className="text-xs font-black text-black dark:text-black">
            {monthNames[month]} {year}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 hover:bg-indigo-200 text-black border border-indigo-300 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Kembali ke Hari Ini"
          >
            <RotateCcw className="w-2.5 h-2.5 text-indigo-700" />
            <span>Hari Ini</span>
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-slate-200 text-black transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-slate-200 text-black transition-colors cursor-pointer"
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
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-extrabold text-black dark:text-black">
            <span className="text-rose-600 font-black">Min</span>
            <span className="text-black dark:text-black font-extrabold">Sen</span>
            <span className="text-black dark:text-black font-extrabold">Sel</span>
            <span className="text-black dark:text-black font-extrabold">Rab</span>
            <span className="text-black dark:text-black font-extrabold">Kam</span>
            <span className="text-black dark:text-black font-extrabold">Jum</span>
            <span className="text-black dark:text-black font-extrabold">Sab</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Prev month days */}
            {prevMonthDays.map((d, i) => (
              <div
                key={`prev-${i}`}
                className="h-6 sm:h-7 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-medium rounded-md"
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
                  className={`h-6 sm:h-7 relative flex items-center justify-center text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                    selectedFlag
                      ? 'bg-indigo-600 text-white shadow-xs scale-105 z-10'
                      : todayFlag
                        ? 'bg-teal-500/20 text-teal-800 dark:text-teal-900 border border-teal-500/50 font-black'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-200 text-black dark:text-black'
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
          <div className="sm:col-span-5 h-full flex flex-col justify-between p-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs">
            <div className="space-y-2">
              {/* Tombol Menu Agenda Personal */}
              <button
                type="button"
                onClick={() => navigate('/agenda')}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition-all text-left cursor-pointer group active:scale-[0.98]"
                title="Buka Menu Agenda Personal (Jadwal & kegiatan)"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-[var(--text-main)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                    <span>Agenda Personal</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400" />
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    Jadwal &amp; kegiatan
                  </p>
                </div>
              </button>

              <div className="pt-0.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-[11px] text-black dark:text-black flex items-center gap-1">
                    <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{selectedDayFormatted}</span>
                  </span>
                  {notes[selectedKey] && !isEditingNote && (
                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      className="text-rose-600 hover:text-rose-700 p-0.5 rounded cursor-pointer"
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
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none text-black dark:text-white placeholder:text-slate-500 font-medium"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingNote(false)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>Simpan</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingNote(true)}
                    className="min-h-[46px] p-2 rounded-lg bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:border-indigo-500 transition-all flex flex-col justify-center"
                  >
                    {notes[selectedKey] ? (
                      <p className="text-[11px] text-black dark:text-slate-200 font-semibold line-clamp-2 leading-relaxed">
                        {notes[selectedKey]}
                      </p>
                    ) : (
                      <div className="text-center text-[10px] text-slate-800 dark:text-slate-300 font-bold flex items-center justify-center gap-1">
                        <Edit3 className="w-3 h-3 text-indigo-600" />
                        <span>Klik untuk tambah catatan</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 pt-1 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-[9.5px]">
              <span className="text-black dark:text-slate-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                Titik biru = tanggal beragenda
              </span>
              <button
                type="button"
                onClick={() => navigate('/agenda')}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Buka Agenda →
              </button>
            </div>
          </div>
        ) : (
          /* In 1x Size: Compact Bottom Memo Strip */
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
            <button
              type="button"
              onClick={() => navigate('/agenda')}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs font-bold transition-all cursor-pointer group shadow-2xs"
              title="Buka Menu Agenda Personal"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-[var(--text-main)] group-hover:text-indigo-600 transition-colors">Agenda Personal</div>
                  <div className="text-[9px] text-[var(--text-muted)] leading-none">Jadwal &amp; kegiatan</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {notes[selectedKey] ? (
              <div className="text-[10px] p-1.5 rounded-lg bg-indigo-50 text-black border border-indigo-200 truncate">
                <span className="font-extrabold text-black">{selectedDate.getDate()} {monthNames[selectedDate.getMonth()].slice(0, 3)}:</span> <span className="font-semibold text-black">{notes[selectedKey]}</span>
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
                className="text-[9.5px] text-center text-black font-bold hover:text-indigo-700 cursor-pointer py-0.5 flex items-center justify-center gap-1"
              >
                <Edit3 className="w-2.5 h-2.5 text-indigo-600" />
                <span>+ Catatan {selectedDate.getDate()} {monthNames[selectedDate.getMonth()].slice(0, 3)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
