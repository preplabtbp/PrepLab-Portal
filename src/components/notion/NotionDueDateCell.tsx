import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft,
  ChevronRight, 
  HelpCircle,
  X
} from 'lucide-react';
import { formatToDDMMYYYY } from './logbook-section-utils';

export type KpiDeliveryStatus = 'ON_TIME' | 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'ON_TRACK' | 'UNSET';

export interface TaskKpiCalculation {
  status: KpiDeliveryStatus;
  label: string;
  daysDiff: number; // positive = days remaining, negative = days late
  dueDateFormatted: string;
  completedDateFormatted?: string;
  isClosed: boolean;
  colorClass: {
    bgLight: string;
    bgDark: string;
    textLight: string;
    textDark: string;
    borderLight: string;
    borderDark: string;
    dotColor: string;
  };
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Normalizes any date string or Date object into midnight Date for accurate day-level difference calculation
 */
export function parseDateToMidnight(val: string | number | Date | null | undefined): Date | null {
  if (!val || val === '-' || !String(val).trim()) return null;
  const s = String(val).trim();

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  return null;
}

/**
 * Converts a Date object or valid date string into HTML5 date input format (YYYY-MM-DD)
 */
export function toHtmlDateInputValue(val: string | Date | null | undefined): string {
  const d = parseDateToMidnight(val);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format a Date to Notion standard readable string: e.g. "Oct 14, 2026"
 */
export function formatToNotionDate(d: Date): string {
  const m = SHORT_MONTHS[d.getMonth()];
  const day = d.getDate();
  const y = d.getFullYear();
  return `${m} ${day}, ${y}`;
}

/**
 * Calculates delivery and KPI status based on Due Date, Completed Date, and Status
 */
export function calculateTaskKpiStatus(
  dueDateStr?: string | null,
  completedDateStr?: string | null,
  statusStr?: string | null
): TaskKpiCalculation {
  const isClosed = Boolean(
    statusStr && (
      statusStr.toUpperCase().includes('CLOSE') ||
      statusStr.toUpperCase().includes('DONE') ||
      statusStr.toUpperCase().includes('SELESAI') ||
      statusStr.toUpperCase().includes('RESOLVED')
    )
  );

  const due = parseDateToMidnight(dueDateStr);
  const comp = parseDateToMidnight(completedDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDateFormatted = due ? formatToDDMMYYYY(due) : '-';
  const completedDateFormatted = comp ? formatToDDMMYYYY(comp) : undefined;

  // 1. Unset Due Date
  if (!due) {
    return {
      status: 'UNSET',
      label: 'Belum Diisi',
      daysDiff: 0,
      dueDateFormatted: '-',
      completedDateFormatted,
      isClosed,
      colorClass: {
        bgLight: 'bg-slate-100',
        bgDark: 'bg-slate-800/60',
        textLight: 'text-slate-600',
        textDark: 'text-slate-400',
        borderLight: 'border-slate-300 border-dashed',
        borderDark: 'border-slate-700 border-dashed',
        dotColor: 'bg-slate-400'
      }
    };
  }

  // 2. Closed / Completed Task
  if (isClosed) {
    if (comp) {
      const diffMs = due.getTime() - comp.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        return {
          status: 'ON_TIME',
          label: 'Tepat Waktu',
          daysDiff: diffDays,
          dueDateFormatted,
          completedDateFormatted,
          isClosed: true,
          colorClass: {
            bgLight: 'bg-emerald-50',
            bgDark: 'bg-emerald-950/60',
            textLight: 'text-emerald-700',
            textDark: 'text-emerald-300',
            borderLight: 'border-emerald-300',
            borderDark: 'border-emerald-700/60',
            dotColor: 'bg-emerald-500'
          }
        };
      } else {
        const daysLate = Math.abs(diffDays);
        return {
          status: 'OVERDUE',
          label: `Terlambat ${daysLate} hr`,
          daysDiff: diffDays,
          dueDateFormatted,
          completedDateFormatted,
          isClosed: true,
          colorClass: {
            bgLight: 'bg-rose-50',
            bgDark: 'bg-rose-950/60',
            textLight: 'text-rose-700',
            textDark: 'text-rose-300',
            borderLight: 'border-rose-300',
            borderDark: 'border-rose-700/70',
            dotColor: 'bg-rose-500'
          }
        };
      }
    }

    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      return {
        status: 'ON_TIME',
        label: 'Tepat Waktu',
        daysDiff: diffDays,
        dueDateFormatted,
        completedDateFormatted,
        isClosed: true,
        colorClass: {
          bgLight: 'bg-emerald-50',
          bgDark: 'bg-emerald-950/60',
          textLight: 'text-emerald-700',
          textDark: 'text-emerald-300',
          borderLight: 'border-emerald-300',
          borderDark: 'border-emerald-700/60',
          dotColor: 'bg-emerald-500'
        }
      };
    } else {
      return {
        status: 'ON_TIME',
        label: 'Selesai',
        daysDiff: diffDays,
        dueDateFormatted,
        completedDateFormatted,
        isClosed: true,
        colorClass: {
          bgLight: 'bg-teal-50',
          bgDark: 'bg-teal-950/60',
          textLight: 'text-teal-700',
          textDark: 'text-teal-300',
          borderLight: 'border-teal-300',
          borderDark: 'border-teal-700/60',
          dotColor: 'bg-teal-500'
        }
      };
    }
  }

  // 3. Active / Open / In Progress Task
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      status: 'OVERDUE',
      label: `Terlambat ${daysLate} hr`,
      daysDiff: diffDays,
      dueDateFormatted,
      completedDateFormatted,
      isClosed: false,
      colorClass: {
        bgLight: 'bg-rose-50',
        bgDark: 'bg-rose-950/60',
        textLight: 'text-rose-700',
        textDark: 'text-rose-300',
        borderLight: 'border-rose-300',
        borderDark: 'border-rose-700/70',
        dotColor: 'bg-rose-500'
      }
    };
  }

  if (diffDays === 0) {
    return {
      status: 'DUE_TODAY',
      label: 'Hari Ini (Due)',
      daysDiff: 0,
      dueDateFormatted,
      completedDateFormatted,
      isClosed: false,
      colorClass: {
        bgLight: 'bg-amber-50',
        bgDark: 'bg-amber-950/70',
        textLight: 'text-amber-800',
        textDark: 'text-amber-300',
        borderLight: 'border-amber-300',
        borderDark: 'border-amber-700/70',
        dotColor: 'bg-amber-500'
      }
    };
  }

  if (diffDays <= 2) {
    return {
      status: 'DUE_SOON',
      label: `H-${diffDays} Mendekati`,
      daysDiff: diffDays,
      dueDateFormatted,
      completedDateFormatted,
      isClosed: false,
      colorClass: {
        bgLight: 'bg-yellow-50',
        bgDark: 'bg-yellow-950/50',
        textLight: 'text-yellow-800',
        textDark: 'text-yellow-300',
        borderLight: 'border-yellow-300',
        borderDark: 'border-yellow-700/60',
        dotColor: 'bg-yellow-400'
      }
    };
  }

  return {
    status: 'ON_TRACK',
    label: `${diffDays} hari lagi`,
    daysDiff: diffDays,
    dueDateFormatted,
    completedDateFormatted,
    isClosed: false,
    colorClass: {
      bgLight: 'bg-blue-50/70',
      bgDark: 'bg-blue-950/40',
      textLight: 'text-blue-700',
      textDark: 'text-blue-300',
      borderLight: 'border-blue-200',
      borderDark: 'border-blue-800/50',
      dotColor: 'bg-blue-400'
    }
  };
}

interface CalendarDayCell {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
}

function getCalendarGrid(viewYear: number, viewMonth: number, selectedDate: Date | null): CalendarDayCell[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selMid = selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) : null;

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 for Sunday
  const daysInCurrent = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  const cells: CalendarDayCell[] = [];

  // 1. Previous month days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrev - i;
    const date = new Date(viewYear, viewMonth - 1, dayNumber);
    date.setHours(0, 0, 0, 0);
    const isSelected = selMid ? date.getTime() === selMid.getTime() : false;
    const isToday = date.getTime() === today.getTime();
    cells.push({ date, dayNumber, isCurrentMonth: false, isSelected, isToday });
  }

  // 2. Current month days
  for (let i = 1; i <= daysInCurrent; i++) {
    const date = new Date(viewYear, viewMonth, i);
    date.setHours(0, 0, 0, 0);
    const isSelected = selMid ? date.getTime() === selMid.getTime() : false;
    const isToday = date.getTime() === today.getTime();
    cells.push({ date, dayNumber: i, isCurrentMonth: true, isSelected, isToday });
  }

  // 3. Next month days to reach standard 42 cells (6 rows x 7 cols)
  const totalCells = 42;
  const nextDaysNeeded = totalCells - cells.length;
  for (let i = 1; i <= nextDaysNeeded; i++) {
    const date = new Date(viewYear, viewMonth + 1, i);
    date.setHours(0, 0, 0, 0);
    const isSelected = selMid ? date.getTime() === selMid.getTime() : false;
    const isToday = date.getTime() === today.getTime();
    cells.push({ date, dayNumber: i, isCurrentMonth: false, isSelected, isToday });
  }

  return cells;
}

interface NotionDueDateCellProps {
  value: string;
  completedDate?: string;
  status?: string;
  isSubItem?: boolean;
  compact?: boolean;
  isNotionLight?: boolean;
  onChange: (newDateStr: string) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const NotionDueDateCell: React.FC<NotionDueDateCellProps> = ({
  value,
  completedDate,
  status,
  isSubItem = false,
  compact = false,
  isNotionLight = true,
  onChange,
  onDoubleClick,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; openUpwards?: boolean } | null>(null);

  // Calendar view states
  const parsedCurrent = parseDateToMidnight(value);
  const initialDate = parsedCurrent || new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  // Notion options toggles
  const [isEndDate, setIsEndDate] = useState(false);
  const [isIncludeTime, setIsIncludeTime] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const kpi = calculateTaskKpiStatus(value, completedDate, status);
  const hasDueDate = Boolean(value && value !== '-' && value.trim().length > 0 && parsedCurrent);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverHeight = 390;
    const popoverWidth = 260;
    const openUpwards = (rect.bottom + popoverHeight > window.innerHeight) && (rect.top > popoverHeight);

    const left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, rect.left));
    const top = openUpwards ? Math.max(10, rect.top - popoverHeight - 4) : (rect.bottom + 4);

    setPosition({ top, left, openUpwards });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!isOpen) {
      updatePosition();
      const current = parseDateToMidnight(value) || new Date();
      setViewYear(current.getFullYear());
      setViewMonth(current.getMonth());
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onChange(formatToDDMMYYYY(today));
  };

  const handleSelectDay = (cell: CalendarDayCell, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(formatToDDMMYYYY(cell.date));
    if (!cell.isCurrentMonth) {
      setViewYear(cell.date.getFullYear());
      setViewMonth(cell.date.getMonth());
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('-');
    setIsOpen(false);
  };

  const calendarCells = getCalendarGrid(viewYear, viewMonth, parsedCurrent);
  const displayInputText = parsedCurrent ? formatToNotionDate(parsedCurrent) : formatToNotionDate(new Date(viewYear, viewMonth, 1));

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onDoubleClick) {
      onDoubleClick(e);
    }
  };

  return (
    <div className="relative w-full h-full" onDoubleClick={handleDoubleClick}>
      {hasDueDate ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          onDoubleClick={handleDoubleClick}
          title={`Target Selesai: ${kpi.dueDateFormatted} • Status: ${kpi.label} (Klik untuk buka kalender, klik 2x untuk edit teks)`}
          className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer select-none font-sans"
        >
          {kpi.status === 'OVERDUE' && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Terlambat" />
          )}
          <span>{kpi.dueDateFormatted}</span>
        </button>
      ) : (
        /* Jika belum ada due date: cell kosong total, tapi bisa diklik untuk membuka modal Notion atau klik 2x untuk edit langsung */
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          onDoubleClick={handleDoubleClick}
          className="w-full h-full min-h-[26px] block text-left bg-transparent border-0 cursor-pointer focus:outline-none p-0 select-none"
          title="Klik untuk memilih tanggal (atau klik 2x untuk edit langsung)"
        />
      )}

      {/* Notion Calendar Popover Modal */}
      {isOpen && position && createPortal(
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className={`fixed rounded-xl border p-3 font-sans shadow-2xl z-[99999] w-[260px] select-none animate-in fade-in zoom-in-95 duration-100 ${
            isNotionLight
              ? 'bg-white border-[#e9e9e7] text-slate-800 shadow-slate-300/80'
              : 'bg-[#202020] border-[#373737] text-slate-100 shadow-black/90'
          }`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          {/* Top Date Display Box */}
          <div className="mb-2.5">
            <input
              type="text"
              readOnly
              value={displayInputText}
              className={`w-full px-2.5 py-1 text-xs rounded-md border outline-none font-sans ${
                isNotionLight
                  ? 'border-[#e9e9e7] bg-[#fbfbfa] text-slate-800'
                  : 'border-[#373737] bg-[#191919] text-slate-200'
              }`}
            />
          </div>

          {/* Month Navigation Row */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {SHORT_MONTHS[viewMonth]} {viewYear}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToday}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center mb-1 text-[11px] text-slate-400 dark:text-slate-500 font-normal">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-0.5">{wd}</div>
            ))}
          </div>

          {/* Days Grid (42 cells: 6 rows x 7 cols) */}
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs font-sans mb-2.5">
            {calendarCells.map((c, idx) => {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleSelectDay(c, e)}
                  className={`w-7 h-7 mx-auto flex items-center justify-center rounded-md cursor-pointer transition-colors text-[11px] ${
                    c.isSelected
                      ? 'bg-[#2383e2] text-white font-semibold shadow-xs hover:bg-[#1f75cb]'
                      : c.isToday
                      ? 'text-[#2383e2] font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      : c.isCurrentMonth
                      ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {c.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Options Rows */}
          <div className="border-t border-[#f0f0ee] dark:border-[#2e2e2e] pt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300 font-sans">
            {/* End date */}
            <div className="flex items-center justify-between py-0.5 px-1">
              <span>End date</span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEndDate(!isEndDate);
                }}
                className={`w-7 h-4 rounded-full p-0.5 cursor-pointer transition-colors relative flex items-center ${
                  isEndDate ? 'bg-[#2383e2]' : 'bg-[#e9e9e7] dark:bg-[#3d3d3d]'
                }`}
              >
                <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                  isEndDate ? 'translate-x-3' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* Date format */}
            <div className="flex items-center justify-between py-0.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded cursor-pointer">
              <span>Date format</span>
              <span className="text-slate-400 text-[11px] flex items-center gap-0.5">
                Full date <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            {/* Include time */}
            <div className="flex items-center justify-between py-0.5 px-1">
              <span>Include time</span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsIncludeTime(!isIncludeTime);
                }}
                className={`w-7 h-4 rounded-full p-0.5 cursor-pointer transition-colors relative flex items-center ${
                  isIncludeTime ? 'bg-[#2383e2]' : 'bg-[#e9e9e7] dark:bg-[#3d3d3d]'
                }`}
              >
                <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                  isIncludeTime ? 'translate-x-3' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* Remind */}
            <div className="flex items-center justify-between py-0.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded cursor-pointer">
              <span>Remind</span>
              <span className="text-slate-400 text-[11px] flex items-center gap-0.5">
                None <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Action: Clear */}
          <div className="border-t border-[#f0f0ee] dark:border-[#2e2e2e] pt-1.5 mt-1.5">
            <button
              type="button"
              onClick={handleClear}
              className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 py-0.5 px-1 rounded cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              Clear
            </button>
          </div>

          {/* Footer Note */}
          <div className="border-t border-[#f0f0ee] dark:border-[#2e2e2e] pt-1.5 mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer px-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Learn about reminders</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export interface NotionCompletionDateCellProps {
  value: string;
  isNotionLight?: boolean;
  onChange: (newDateStr: string) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const NotionCompletionDateCell: React.FC<NotionCompletionDateCellProps> = ({
  value,
  isNotionLight = true,
  onChange,
  onDoubleClick,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; openUpwards?: boolean } | null>(null);

  const parsedCurrent = parseDateToMidnight(value);
  const initialDate = parsedCurrent || new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const hasDate = Boolean(value && value !== '-' && value.trim().length > 0 && parsedCurrent);
  const formattedVal = hasDate ? formatToDDMMYYYY(value) : '-';

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverHeight = 350;
    const popoverWidth = 260;
    const openUpwards = (rect.bottom + popoverHeight > window.innerHeight) && (rect.top > popoverHeight);

    const left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, rect.left));
    const top = openUpwards ? Math.max(10, rect.top - popoverHeight - 4) : (rect.bottom + 4);

    setPosition({ top, left, openUpwards });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!isOpen) {
      updatePosition();
      const current = parseDateToMidnight(value) || new Date();
      setViewYear(current.getFullYear());
      setViewMonth(current.getMonth());
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onChange(formatToDDMMYYYY(today));
    setIsOpen(false);
  };

  const handleSelectDay = (cell: CalendarDayCell, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(formatToDDMMYYYY(cell.date));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('-');
    setIsOpen(false);
  };

  const calendarCells = getCalendarGrid(viewYear, viewMonth, parsedCurrent);
  const displayInputText = parsedCurrent ? formatToNotionDate(parsedCurrent) : formatToNotionDate(new Date(viewYear, viewMonth, 1));

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onDoubleClick) {
      onDoubleClick(e);
    }
  };

  return (
    <div className="relative w-full h-full" onDoubleClick={handleDoubleClick}>
      {hasDate ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          onDoubleClick={handleDoubleClick}
          title={`Tanggal Selesai: ${formattedVal} (Klik untuk pilih kalender, klik 2x untuk edit teks)`}
          className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer select-none font-sans font-medium"
        >
          <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
          <span>{formattedVal}</span>
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          onDoubleClick={handleDoubleClick}
          className="w-full h-full min-h-[26px] flex items-center bg-transparent border-0 cursor-pointer focus:outline-none p-0 select-none group/date"
          title="Klik untuk memilih tanggal selesai (atau klik 2x untuk edit langsung)"
        >
          <span className="text-slate-400 font-mono text-xs group-hover/date:text-slate-600 dark:group-hover/date:text-slate-300">-</span>
        </button>
      )}

      {/* Notion Calendar Popover Modal */}
      {isOpen && position && createPortal(
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className={`fixed rounded-xl border p-3 font-sans shadow-2xl z-[99999] w-[260px] select-none animate-in fade-in zoom-in-95 duration-100 ${
            isNotionLight
              ? 'bg-white border-[#e9e9e7] text-slate-800 shadow-slate-300/80'
              : 'bg-[#202020] border-[#373737] text-slate-100 shadow-black/90'
          }`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          {/* Top Date Display Box */}
          <div className="mb-2.5">
            <input
              type="text"
              readOnly
              value={displayInputText}
              className={`w-full px-2.5 py-1 text-xs rounded-md border outline-none font-sans ${
                isNotionLight
                  ? 'border-[#e9e9e7] bg-[#fbfbfa] text-slate-800'
                  : 'border-[#373737] bg-[#191919] text-slate-200'
              }`}
            />
          </div>

          {/* Month Navigation Row */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {SHORT_MONTHS[viewMonth]} {viewYear}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToday}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center mb-1 text-[11px] text-slate-400 dark:text-slate-500 font-normal">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-0.5">{wd}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs font-sans mb-2.5">
            {calendarCells.map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleSelectDay(c, e)}
                className={`w-7 h-7 mx-auto flex items-center justify-center rounded-md cursor-pointer transition-colors text-[11px] ${
                  c.isSelected
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs hover:bg-emerald-700'
                    : c.isToday
                    ? 'text-emerald-600 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    : c.isCurrentMonth
                    ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {c.dayNumber}
              </button>
            ))}
          </div>

          {/* Action: Clear */}
          <div className="border-t border-[#f0f0ee] dark:border-[#2e2e2e] pt-1.5 mt-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-left text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 py-0.5 px-1 rounded cursor-pointer transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium"
            >
              Hapus Tanggal
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-0.5 px-2 rounded cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

