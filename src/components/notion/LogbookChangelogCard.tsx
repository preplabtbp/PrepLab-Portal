import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  FileSpreadsheet,
  CornerDownRight,
  Check,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TableRowData, 
  buildLogbookChangelogData, 
  generateLogbookChangelogWhatsappText,
  formatToDDMMYYYY,
  getTodayDDMMYYYY,
  getYesterdayDDMMYYYY,
  getAvailableLogbookDates
} from './logbook-section-utils';

interface LogbookChangelogCardProps {
  sectionName: string;
  allRows: TableRowData[];
  generalNotes?: Record<string, string>;
  onCarryOverTask?: (rawRow: TableRowData) => void;
  onViewRawTable?: () => void;
  onSwitchToPlanning?: () => void;
  isNotionLight?: boolean;
  selectedDateStr?: string;
  onDateChange?: (dateStr: string) => void;
}

function ddmmToIso(str: string): string {
  const parts = str.split('-');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
}

function isoToDdmm(str: string): string {
  const parts = str.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }
  return str;
}

function shiftDay(currentDdmm: string, deltaDays: number): string {
  const parts = currentDdmm.split('-').map(Number);
  if (parts.length === 3) {
    const dt = new Date(parts[2], parts[1] - 1, parts[0]);
    dt.setDate(dt.getDate() + deltaDays);
    const d = String(dt.getDate()).padStart(2, '0');
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const y = dt.getFullYear();
    return `${d}-${m}-${y}`;
  }
  return currentDdmm;
}

function getDayNameIndo(ddmm: string): string {
  const parts = ddmm.split('-').map(Number);
  if (parts.length === 3) {
    const dt = new Date(parts[2], parts[1] - 1, parts[0]);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return dayNames[dt.getDay()];
  }
  return '';
}

const SubtaskBreakdownList: React.FC<{
  subtasks: Array<{ title: string; completed: boolean; completedDate?: string }>;
  isNotionLight: boolean;
}> = ({ subtasks }) => {
  if (!subtasks || subtasks.length === 0) return null;
  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
        <span>Rincian Subtask ({completedCount}/{subtasks.length} Selesai)</span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400">
          {Math.round((completedCount / subtasks.length) * 100)}%
        </span>
      </div>
      <div className="space-y-1">
        {subtasks.map((st, sIdx) => (
          <div 
            key={sIdx}
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded-md text-[11px] transition-colors ${
              st.completed 
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40' 
                : 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {st.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className={`truncate ${st.completed ? 'line-through opacity-85' : 'font-medium'}`}>
                {st.title}
              </span>
            </div>
            <span className="text-[10px] shrink-0 font-medium">
              {st.completed ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Selesai {st.completedDate ? `(${st.completedDate})` : ''}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  ⏳ In Progress
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LogbookChangelogCard: React.FC<LogbookChangelogCardProps> = ({
  sectionName,
  allRows,
  generalNotes = {},
  onCarryOverTask,
  onViewRawTable,
  onSwitchToPlanning,
  isNotionLight = true,
  selectedDateStr: externalDateStr,
  onDateChange
}) => {
  const todayStr = getTodayDDMMYYYY();
  const yesterdayStr = getYesterdayDDMMYYYY();

  // Available distinct dates from rows
  const availableDates = useMemo(() => {
    return getAvailableLogbookDates(allRows);
  }, [allRows]);

  // Initial date: fallback to external, then yesterday with data, then yesterday
  const defaultInitialDate = useMemo(() => {
    if (externalDateStr) return externalDateStr;
    const historicalDates = availableDates.filter(d => d !== todayStr);
    return historicalDates.length > 0 ? historicalDates[0] : yesterdayStr;
  }, [externalDateStr, availableDates, todayStr, yesterdayStr]);

  const [internalDateStr, setInternalDateStr] = useState<string>(defaultInitialDate);
  const activeDate = externalDateStr || internalDateStr;

  const handleSelectDate = (newDate: string) => {
    if (!newDate) return;
    setInternalDateStr(newDate);
    onDateChange?.(newDate);
  };

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Compute changelog data from selected date's rows
  const changelog = useMemo(() => {
    return buildLogbookChangelogData(allRows, activeDate);
  }, [allRows, activeDate]);

  // Detect if there are ongoing In-Progress tasks from today (e.g. when viewing tomorrow or empty dates)
  const ongoingTasksToday = useMemo(() => {
    return buildLogbookChangelogData(allRows, todayStr).inProgressTasks;
  }, [allRows, todayStr]);

  const currentGeneralNote = generalNotes[changelog.dateStr] || '';

  // Copy to WhatsApp handler
  const handleCopyWhatsapp = () => {
    try {
      const text = generateLogbookChangelogWhatsappText({
        sectionName,
        dateStr: changelog.dateStr,
        generalNote: currentGeneralNote,
        closedTasks: changelog.closedTasks,
        inProgressTasks: changelog.inProgressTasks,
        metrics: {
          total: changelog.totalTasks,
          closed: changelog.completedCount,
          inProgress: changelog.inProgressCount,
          percentage: changelog.completionRate
        }
      });

      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('📋 Teks ringkasan Changelog berhasil disalin ke clipboard siap dikirim ke WhatsApp!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin teks ke clipboard');
    }
  };

  const dayName = getDayNameIndo(activeDate);
  const isViewingToday = activeDate === todayStr;
  const isViewingYesterday = activeDate === yesterdayStr;

  return (
    <div 
      className="mb-5 rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs"
      style={{
        backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
        borderColor: isNotionLight ? '#e2e8f0' : '#2d3748'
      }}
    >
      {/* 1. Date Filter & Navigation Bar (Always Visible) */}
      <div 
        className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: isNotionLight ? '#f8fafc' : '#1b2230',
          borderColor: isNotionLight ? '#e2e8f0' : '#2d3748'
        }}
      >
        {/* Left: Day Shift Controls & Datepicker */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Filter Tanggal:</span>
          </span>

          <div className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSelectDate(shiftDay(activeDate, -1))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Mundur 1 hari"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(yesterdayStr)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                isViewingYesterday
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Kemarin
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(todayStr)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                isViewingToday
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Hari Ini
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(shiftDay(activeDate, 1))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Maju 1 hari"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* HTML5 Native Datepicker Input */}
          <div className="relative inline-flex items-center">
            <input
              type="date"
              value={ddmmToIso(activeDate)}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectDate(isoToDdmm(e.target.value));
                }
              }}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono shadow-2xs outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              title="Pilih tanggal spesifik dari kalender"
            />
          </div>

          {/* Active Date Label Pill */}
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 font-bold text-xs flex items-center gap-1 shadow-2xs">
            <span>{dayName ? `${dayName}, ` : ''}{activeDate}</span>
            {isViewingYesterday && <span className="text-[10px] opacity-75 font-normal">(Kemarin)</span>}
            {isViewingToday && <span className="text-[10px] opacity-75 font-normal">(Hari Ini)</span>}
          </span>
        </div>

        {/* Right: Quick Historical Date Pills */}
        {availableDates.length > 0 && (
          <div className="flex items-center gap-1 text-[11px] overflow-x-auto max-w-full">
            <span className="text-slate-400 dark:text-slate-500 font-medium hidden md:inline flex items-center gap-1">
              <History className="w-3 h-3" /> Ada data:
            </span>
            {availableDates.slice(0, 5).map(dt => (
              <button
                key={dt}
                type="button"
                onClick={() => handleSelectDate(dt)}
                className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] border transition-all cursor-pointer ${
                  activeDate === dt
                    ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400'
                }`}
                title={`Buka changelog tanggal ${dt}`}
              >
                {dt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Top Header Bar (Metrics & Quick Actions) */}
      <div 
        className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2"
        style={{
          backgroundColor: isNotionLight ? '#f8fafc' : '#252526',
          borderColor: isNotionLight ? '#e2e8f0' : '#2d3748'
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm tracking-tight" style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}>
                Changelog & Evaluasi Kinerja
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-200/60 dark:bg-slate-700/60 font-semibold" style={{ color: isNotionLight ? '#334155' : '#cbd5e1' }}>
                {activeDate}
              </span>
            </div>
            <p className="text-[11px]" style={{ color: isNotionLight ? '#64748b' : '#94a3b8' }}>
              Rekap eksekutif hasil pengerjaan tim seksi {sectionName} pada {dayName ? `${dayName}, ` : ''}{activeDate}
            </p>
          </div>
        </div>

        {/* Executive Metric Pills & Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Metrics Pill Group */}
          <div className="flex items-center gap-1 text-[11px] font-semibold mr-1">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {changelog.totalTasks} Rencana
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              ✓ {changelog.completedCount} Selesai
            </span>
            {changelog.inProgressCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-sky-100/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                ⏳ {changelog.inProgressCount} Berlanjut
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-mono">
              {changelog.completionRate}% Capaian
            </span>
          </div>

          {/* Action: Copy WhatsApp */}
          <button
            type="button"
            onClick={handleCopyWhatsapp}
            className="h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer active:scale-95"
            title="Salin teks laporan siap kirim ke grup WhatsApp manajemen"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin!' : 'Salin WA'}</span>
          </button>

          {/* Action: View Raw Table (Optional) */}
          {onViewRawTable && (
            <button
              type="button"
              onClick={onViewRawTable}
              className="h-7 px-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="Lihat tabel detail"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel Detail</span>
            </button>
          )}

          {/* Action: Switch to Planning Tab */}
          {onSwitchToPlanning && (
            <button
              type="button"
              onClick={onSwitchToPlanning}
              className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
              title="Buka Tab Planning Hari Ini"
            >
              <span>Planning Hari Ini</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Collapsible toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Tampilkan detail changelog' : 'Ciutkan changelog'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Main Body */}
      {!isCollapsed && (
        <div className="p-4 space-y-4 text-xs">
          {/* Empty state for the selected date */}
          {changelog.totalTasks === 0 && !currentGeneralNote && (
            <div className="space-y-3">
              <div 
                className="p-6 rounded-xl border border-dashed text-center flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: isNotionLight ? '#f8fafc' : '#1e293b',
                  borderColor: isNotionLight ? '#cbd5e1' : '#334155',
                  color: isNotionLight ? '#64748b' : '#94a3b8'
                }}
              >
                <AlertCircle className="w-6 h-6 text-amber-500 mb-1" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Tidak ada data rencana kegiatan tercatat pada tanggal {activeDate}.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md">
                  Silakan pilih tanggal lain yang memiliki riwayat di toolbar atas, atau kembali ke tanggal kemarin ({yesterdayStr}).
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectDate(yesterdayStr)}
                    className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Lihat Kemarin ({yesterdayStr})
                  </button>
                  {onSwitchToPlanning && (
                    <button
                      type="button"
                      onClick={onSwitchToPlanning}
                      className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Buka Planning Hari Ini
                    </button>
                  )}
                </div>
              </div>

              {/* Informative Preview: Ongoing active tasks from today with subtask resolution */}
              {ongoingTasksToday.length > 0 && activeDate !== todayStr && (
                <div className="p-4 rounded-xl border border-sky-300/70 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-sky-200 dark:border-sky-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-500" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-sky-800 dark:text-sky-300">
                        Aktivitas Sedang Berjalan Hari Ini ({todayStr})
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full">
                      {ongoingTasksToday.length} Kegiatan Ongoing
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Berikut adalah kegiatan yang sedang berlangsung hari ini beserta status penyelesaian subtask-nya. Anda dapat melanjutkannya ke tanggal {activeDate}:
                  </p>
                  <div className="space-y-2">
                    {ongoingTasksToday.map(task => (
                      <div 
                        key={task.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                              {task.title}
                              {task.pic && (
                                <span className="ml-2 font-normal text-[11px] text-slate-500">
                                  (PIC: <strong>{task.pic}</strong>)
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                              <span>Progres: <strong className="text-sky-600 dark:text-sky-400">{task.progressPercent}%</strong></span>
                              <span>•</span>
                              <span>Subtask: {task.completedSubtasks}/{task.totalSubtasks} Selesai</span>
                            </div>
                          </div>
                          {onCarryOverTask && (
                            <button
                              type="button"
                              onClick={() => {
                                onCarryOverTask(task.rawRow);
                                onSwitchToPlanning?.();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                              title={`Lanjutkan kegiatan ini ke tanggal ${activeDate}`}
                            >
                              <CornerDownRight className="w-3.5 h-3.5" />
                              <span>Lanjutkan ke Tanggal Ini</span>
                            </button>
                          )}
                        </div>
                        <SubtaskBreakdownList subtasks={task.subtasks} isNotionLight={isNotionLight} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* General Notes / Site Highlights if available */}
          {currentGeneralNote && currentGeneralNote.trim() && (
            <div 
              className="p-3 rounded-xl border flex items-start gap-2.5"
              style={{
                backgroundColor: isNotionLight ? '#f0fdf4' : 'rgba(6, 78, 59, 0.2)',
                borderColor: isNotionLight ? '#bbf7d0' : 'rgba(5, 150, 105, 0.4)'
              }}
            >
              <span className="text-base leading-none">📢</span>
              <div className="flex-1">
                <span className="font-bold text-[11px] uppercase tracking-wider block text-emerald-800 dark:text-emerald-300 mb-1">
                  Catatan Umum & Kejadian Khusus ({changelog.dateStr}):
                </span>
                <div 
                  className="whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-200"
                  style={{ color: isNotionLight ? '#1e293b' : '#e2e8f0' }}
                >
                  {currentGeneralNote}
                </div>
              </div>
            </div>
          )}

          {changelog.totalTasks > 0 && (
            <>
              {/* Category 1: CLOSED (SELESAI) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Closed (Selesai) — {changelog.completedCount} Kegiatan
                  </h4>
                </div>

                {changelog.closedTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic pl-3">
                    Tidak ada kegiatan yang berstatus Closed pada tanggal {activeDate}.
                  </p>
                ) : (
                  <div className="space-y-2 pl-1">
                    {changelog.closedTasks.map((task) => (
                      <div 
                        key={task.id}
                        className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300/80 transition-all bg-slate-50/50 dark:bg-slate-900/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-xs leading-snug" style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}>
                                {task.title}
                                {task.pic && (
                                  <span className="ml-2 font-normal text-[11px] text-slate-500 dark:text-slate-400">
                                    (PIC: <strong className="font-medium text-slate-700 dark:text-slate-300">{task.pic}</strong>)
                                  </span>
                                )}
                              </div>

                              {/* Subtasks detailed breakdown */}
                              <SubtaskBreakdownList subtasks={task.subtasks} isNotionLight={isNotionLight} />

                              {/* Task Notes / Descriptions (from Keterangan column) */}
                              {task.notes && task.notes.trim() && (
                                <div className="mt-1.5 pl-2.5 border-l-2 border-emerald-400/50 text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 mr-1">📝 Catatan:</span>
                                  {task.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0">
                            100% Selesai
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category 2: IN PROGRESS (SEDANG BERJALAN) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-sky-500/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block animate-pulse" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-sky-700 dark:text-sky-400">
                      In Progress (Sedang Berjalan) — {changelog.inProgressCount} Kegiatan
                    </h4>
                  </div>
                </div>

                {changelog.inProgressTasks.length === 0 ? (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pl-3">
                    🎉 Luar biasa! Seluruh target pada tanggal {activeDate} telah tuntas 100%.
                  </p>
                ) : (
                  <div className="space-y-2 pl-1">
                    {changelog.inProgressTasks.map((task) => (
                      <div 
                        key={task.id}
                        className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-sky-300/80 transition-all bg-slate-50/50 dark:bg-slate-900/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <Clock className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold text-xs leading-snug" style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}>
                                {task.title}
                                {task.pic && (
                                  <span className="ml-2 font-normal text-[11px] text-slate-500 dark:text-slate-400">
                                    (PIC: <strong className="font-medium text-slate-700 dark:text-slate-300">{task.pic}</strong>)
                                  </span>
                                )}
                              </div>

                              {/* Progress bar and Subtasks */}
                              <div className="mt-1.5 flex items-center gap-2 max-w-xs">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                  <div 
                                    className="h-full bg-sky-500 rounded-full transition-all"
                                    style={{ width: `${task.progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0">
                                  {task.progressPercent}%
                                </span>
                                {task.subtasks.length > 0 && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                                    ({task.completedSubtasks}/{task.totalSubtasks} subtask)
                                  </span>
                                )}
                              </div>

                              {/* Subtasks detailed breakdown */}
                              <SubtaskBreakdownList subtasks={task.subtasks} isNotionLight={isNotionLight} />

                              {/* Task Notes / Descriptions (from Keterangan column) */}
                              {task.notes && task.notes.trim() && (
                                <div className="mt-1.5 pl-2.5 border-l-2 border-sky-400/50 text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                  <span className="font-semibold text-sky-700 dark:text-sky-400 mr-1">📝 Catatan:</span>
                                  {task.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action: Carry Over to Today's Planning */}
                          {onCarryOverTask && (
                            <button
                              type="button"
                              onClick={() => {
                                onCarryOverTask(task.rawRow);
                                onSwitchToPlanning?.();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-600 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              title="Lanjutkan tugas ini ke Planning Hari Ini"
                            >
                              <CornerDownRight className="w-3.5 h-3.5" />
                              <span>Lanjut ke Hari Ini</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
